# TypeScript/JavaScript Accessor Function Patterns for Encapsulating Global State

**Research Date:** 2025-01-25
**Status:** Complete
**Purpose:** Research best practices for accessor functions that return default values when state is uninitialized

---

## Executive Summary

This report documents best practices for TypeScript/JavaScript accessor function patterns that encapsulate global state with sensible defaults. Based on codebase analysis and established patterns, it covers implementation strategies, TypeScript typing, testing approaches, and module scoping best practices.

### Key Findings

1. **Module-private variables with accessor functions** provide true privacy in ESM
2. **Nullish coalescing (`??`)** is the preferred pattern for default values
3. **NonNullable return types** enable "never returns null" guarantees
4. **Reset functions** are essential for testing global state
5. **ESM singleton semantics** make module-level variables naturally shared

---

## Table of Contents

1. [Accessor Function Patterns](#1-accessor-function-patterns)
2. [TypeScript Typing Strategies](#2-typescript-typing-strategies)
3. [Testing Patterns](#3-testing-patterns)
4. [Module Scoping Best Practices](#4-module-scoping-best-practices)
5. [Real-World Examples](#5-real-world-examples)
6. [Best Practice References](#6-best-practice-references)

---

## 1. Accessor Function Patterns

### 1.1 Basic Accessor with Default Value (Recommended)

The simplest and most effective pattern for global state with defaults:

```typescript
// config.ts
import type { GlobalProviderConfig, ProviderId } from './types.js';

/**
 * Default configuration when none is set
 * @internal
 */
const DEFAULT_CONFIG: GlobalProviderConfig = {
  defaultProvider: 'anthropic',
  providerDefaults: {}
};

/**
 * Module-private global configuration storage
 * NOT exported - truly private at runtime
 */
let globalConfig: GlobalProviderConfig | null = null;

/**
 * Get the current global configuration
 * @returns Current config (never null, returns DEFAULT_CONFIG if uninitialized)
 */
export function getGlobalConfig(): GlobalProviderConfig {
  return globalConfig ?? DEFAULT_CONFIG;
}

/**
 * Configure global provider settings
 */
export function configureProviders(config: GlobalProviderConfig): void {
  globalConfig = config;
}
```

**Advantages:**
- True runtime privacy (variable not exported)
- Simple and maintainable
- Type-safe with TypeScript
- Never returns null/undefined
- Works naturally with ESM singleton semantics

**File:** `/home/dustin/projects/groundswell/src/utils/provider-config.ts`

### 1.2 Accessor with Validation and Defaults

Pattern with validation and structured defaults:

```typescript
// config.ts
let globalConfig: GlobalProviderConfig | null = null;

const DEFAULT_CONFIG: GlobalProviderConfig = {
  defaultProvider: 'anthropic',
  providerDefaults: {}
};

/**
 * Get global config with validation
 * @throws {Error} If configuration is invalid
 */
export function getGlobalConfig(): GlobalProviderConfig {
  if (globalConfig === null) {
    return DEFAULT_CONFIG;
  }

  // Validate before returning
  if (!isValidConfig(globalConfig)) {
    throw new Error('Invalid global configuration detected');
  }

  return globalConfig;
}

function isValidConfig(config: GlobalProviderConfig): boolean {
  return config.defaultProvider === 'anthropic' ||
         config.defaultProvider === 'opencode';
}
```

### 1.3 Lazy Initialization Accessor

Pattern for expensive default values:

```typescript
// cache.ts
let expensiveCache: Map<string, any> | null = null;

/**
 * Get or lazily initialize the cache
 */
export function getCache(): Map<string, any> {
  if (expensiveCache === null) {
    expensiveCache = new Map();
    initializeCache(expensiveCache);
  }
  return expensiveCache;
}

function initializeCache(cache: Map<string, any>): void {
  // Expensive initialization
  cache.set('default', createDefaultValue());
}
```

### 1.4 Immutable Return Accessor

Pattern preventing mutation of internal state:

```typescript
// config.ts
let internalConfig: GlobalProviderConfig | null = null;

/**
 * Get a readonly copy of configuration
 * Prevents accidental mutation of internal state
 */
export function getConfig(): Readonly<GlobalProviderConfig> {
  const config = internalConfig ?? DEFAULT_CONFIG;

  // Return frozen object for true immutability
  return Object.freeze({ ...config });
}
```

---

## 2. TypeScript Typing Strategies

### 2.1 NonNullable Return Type Pattern

Guarantee that accessor functions never return null:

```typescript
// Pattern 1: Nullish coalescing in implementation
let config: GlobalProviderConfig | null = null;

export function getConfig(): GlobalProviderConfig {
  // TypeScript understands this never returns null
  return config ?? DEFAULT_CONFIG;
}

// Pattern 2: Type assertion with validation
export function getConfig(): GlobalProviderConfig {
  if (config === null) {
    return DEFAULT_CONFIG;
  }
  return config;
}

// Pattern 3: Explicit NonNullable type
export function getConfig(): NonNullable<GlobalProviderConfig> {
  return config ?? DEFAULT_CONFIG;
}
```

### 2.2 Discriminated Union for State

Pattern tracking initialization state:

```typescript
// State tracking
type ConfigState =
  | { status: 'uninitialized' }
  | { status: 'initialized'; config: GlobalProviderConfig };

let state: ConfigState = { status: 'uninitialized' };

/**
 * Get config with explicit state tracking
 */
export function getConfig(): GlobalProviderConfig {
  if (state.status === 'uninitialized') {
    return DEFAULT_CONFIG;
  }
  return state.config;
}

/**
 * Check if configuration is initialized
 */
export function isConfigured(): boolean {
  return state.status === 'initialized';
}
```

### 2.3 Generic Accessor Pattern

Reusable accessor for any type with defaults:

```typescript
// Generic accessor factory
function createAccessor<T>(
  defaultValue: T
): {
  get: () => T;
  set: (value: T) => void;
  reset: () => void;
} {
  let value: T | null = null;

  return {
    get: (): T => value ?? defaultValue,
    set: (newValue: T) => { value = newValue; },
    reset: () => { value = null; }
  };
}

// Usage
const configAccessor = createAccessor<GlobalProviderConfig>(DEFAULT_CONFIG);

export const getConfig = configAccessor.get;
export const setConfig = configAccessor.set;
export const resetConfig = configAccessor.reset;
```

### 2.4 Readonly Interface Pattern

Prevent mutation through type system:

```typescript
// Interface with readonly properties
export interface ReadonlyGlobalProviderConfig {
  readonly defaultProvider: ProviderId;
  readonly providerDefaults: Partial<Record<ProviderId, ProviderOptions>>;
}

// Internal mutable type
type MutableConfig = {
  -readonly ReadonlyGlobalProviderConfig;
};

let internalConfig: MutableConfig | null = null;

/**
 * Get readonly configuration
 */
export function getConfig(): ReadonlyGlobalProviderConfig {
  return internalConfig ?? DEFAULT_CONFIG;
}

// TypeScript error: Cannot assign to readonly property
// const config = getConfig();
// config.defaultProvider = 'opencode'; // ERROR
```

---

## 3. Testing Patterns

### 3.1 Reset Function Pattern (Essential)

Provide reset function for test isolation:

```typescript
// config.ts
let globalConfig: GlobalProviderConfig | null = null;

export function getConfig(): GlobalProviderConfig {
  return globalConfig ?? DEFAULT_CONFIG;
}

export function setConfig(config: GlobalProviderConfig): void {
  globalConfig = config;
}

/**
 * Reset global configuration
 * @internal Used for testing
 */
export function resetConfig(): void {
  globalConfig = null;
}
```

**Test Usage:**

```typescript
// config.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { getConfig, setConfig, resetConfig } from './config.js';

describe('Configuration Accessor', () => {
  // CRITICAL: Reset after each test
  afterEach(() => {
    resetConfig();
  });

  it('should return default when uninitialized', () => {
    const config = getConfig();
    expect(config.defaultProvider).toBe('anthropic');
  });

  it('should return configured value', () => {
    setConfig({ defaultProvider: 'opencode', providerDefaults: {} });
    const config = getConfig();
    expect(config.defaultProvider).toBe('opencode');
  });

  it('should return default after reset', () => {
    setConfig({ defaultProvider: 'opencode', providerDefaults: {} });
    resetConfig();
    const config = getConfig();
    expect(config.defaultProvider).toBe('anthropic');
  });
});
```

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/provider-config.test.ts`

### 3.2 Test Fixture Pattern

For complex state setup:

```typescript
// fixtures.ts
import { setConfig, resetConfig } from './config.js';

export function withTestConfig<T>(
  config: GlobalProviderConfig,
  testFn: () => T
): T {
  try {
    setConfig(config);
    return testFn();
  } finally {
    resetConfig();
  }
}

// Usage in tests
it('should use test config', () => {
  withTestConfig(
    { defaultProvider: 'opencode', providerDefaults: {} },
    () => {
      const config = getConfig();
      expect(config.defaultProvider).toBe('opencode');
    }
  );
});
```

### 3.3 BeforeEach/AfterEach Pattern

Vitest standard pattern for global state:

```typescript
describe('Global State Tests', () => {
  beforeEach(() => {
    // Optionally set up known state
    resetConfig();
  });

  afterEach(() => {
    // Always reset to prevent test leakage
    resetConfig();
  });

  it('test 1', () => {
    // Guaranteed clean state
  });

  it('test 2', () => {
    // Guaranteed clean state
  });
});
```

### 3.4 Testing Default Value Handling

Comprehensive tests for default behavior:

```typescript
describe('Default Value Behavior', () => {
  describe('when uninitialized', () => {
    it('should return default config', () => {
      const config = getConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should not mutate default config', () => {
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).toBe(config2); // Same reference (good for defaults)
    });
  });

  describe('when initialized', () => {
    it('should return configured value', () => {
      setConfig({ defaultProvider: 'opencode', providerDefaults: {} });
      const config = getConfig();
      expect(config.defaultProvider).toBe('opencode');
    });

    it('should not return default after configuration', () => {
      setConfig({ defaultProvider: 'opencode', providerDefaults: {} });
      const config = getConfig();
      expect(config.defaultProvider).not.toBe(DEFAULT_CONFIG.defaultProvider);
    });
  });

  describe('after reset', () => {
    it('should return default again', () => {
      setConfig({ defaultProvider: 'opencode', providerDefaults: {} });
      resetConfig();
      const config = getConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });
});
```

### 3.5 Type-Level Testing

Ensure type safety guarantees:

```typescript
// Type-level tests (compile-time)
import { expectTypeOf } from 'vitest';

describe('Type Safety', () => {
  it('should return non-nullable type', () => {
    const config = getConfig();
    expectTypeOf(config).toEqualTypeOf<GlobalProviderConfig>();
    // TypeScript should error if we try to check for null
    // expect(config).not.toBe(null); // Type error!
  });

  it('should not accept null assignment', () => {
    expectTypeOf(getConfig()).returns.toEqualTypeOf<GlobalProviderConfig>();
    // TypeScript ensures we can't assign null to result
    // const result: GlobalProviderConfig | null = getConfig(); // Type error!
  });
});
```

---

## 4. Module Scoping Best Practices

### 4.1 ESM Module Privacy Pattern

ES modules provide true privacy for module-scoped variables:

```typescript
// provider-config.ts
import type { GlobalProviderConfig } from './types.js';

// ✅ GOOD: Module-private variable (not exported)
let globalConfig: GlobalProviderConfig | null = null;

// ✅ GOOD: Exported accessor functions
export function getConfig(): GlobalProviderConfig {
  return globalConfig ?? DEFAULT_CONFIG;
}

export function setConfig(config: GlobalProviderConfig): void {
  globalConfig = config;
}

// ❌ BAD: Exporting the variable directly breaks encapsulation
export let globalConfig: GlobalProviderConfig | null = null;
```

**Key Points:**
- ES modules are evaluated once per process (singleton semantics)
- Unexported variables are truly private at runtime
- Exported functions control access to private state
- Changes to private state are visible to all importers (live bindings)

### 4.2 Closure Pattern for Enhanced Privacy

For additional encapsulation:

```typescript
// config.ts
function createConfigManager() {
  let config: GlobalProviderConfig | null = null;

  return {
    get(): GlobalProviderConfig {
      return config ?? DEFAULT_CONFIG;
    },

    set(value: GlobalProviderConfig): void {
      config = value;
    },

    reset(): void {
      config = null;
    },

    isInitialized(): boolean {
      return config !== null;
    }
  };
}

// Module-private instance
const manager = createConfigManager();

// Export only public interface
export const getConfig = manager.get;
export const setConfig = manager.set;
export const resetConfig = manager.reset;
export const isConfigured = manager.isInitialized;
```

**Advantages:**
- Complete encapsulation of state
- Internal logic hidden from consumers
- Easy to extend with additional functionality
- Clear separation of public/private API

### 4.3 Avoiding Common Pitfalls

#### Pitfall 1: Accidental Global Pollution

```typescript
// ❌ BAD: Creates global variable
declare global {
  var globalConfig: GlobalProviderConfig;
}

// ❌ BAD: Modifies global object
(globalThis as any).globalConfig = config;

// ✅ GOOD: Module-scoped variable
let globalConfig: GlobalProviderConfig | null = null;
```

#### Pitfall 2: Mutable Exports

```typescript
// ❌ BAD: Exporting mutable object directly
let config: GlobalProviderConfig = { defaultProvider: 'anthropic' };
export { config }; // Importers can mutate this!

// ✅ GOOD: Export functions that control access
let config: GlobalProviderConfig = { defaultProvider: 'anthropic' };
export function getConfig() {
  return { ...config }; // Return copy
}
```

#### Pitfall 3: Initialization Race Conditions

```typescript
// ❌ BAD: Async initialization can cause race conditions
let config: GlobalProviderConfig | null = null;

export async function initialize() {
  config = await loadConfig(); // Multiple calls could race
}

// ✅ GOOD: Cache initialization promise
let initPromise: Promise<void> | null = null;

export async function initialize() {
  if (!initPromise) {
    initPromise = loadConfig().then(c => { config = c; });
  }
  return initPromise;
}
```

### 4.4 Module-Scoped Constants

Default values should be module-scoped constants:

```typescript
// ✅ GOOD: Module-scoped constant
const DEFAULT_CONFIG: GlobalProviderConfig = {
  defaultProvider: 'anthropic',
  providerDefaults: {}
} as const; // as const for maximum type precision

// ✅ GOOD: Helper functions
function getSupportedProvidersList(): string {
  return '"anthropic", "opencode"';
}

// ❌ BAD: Inline defaults (harder to test/maintain)
export function getConfig(): GlobalProviderConfig {
  return globalConfig ?? { defaultProvider: 'anthropic', providerDefaults: {} };
}
```

---

## 5. Real-World Examples

### 5.1 Groundswell Provider Configuration

**File:** `/home/dustin/projects/groundswell/src/utils/provider-config.ts`

```typescript
/**
 * Global provider configuration storage
 *
 * ## Module-Private Variable Pattern
 *
 * This module uses ES module scoping to create a truly private singleton
 * configuration storage. The `globalConfig` variable is not exported,
 * preventing direct external modification. Access is provided through
 * exported functions.
 */

import type { GlobalProviderConfig, ProviderId } from '../types/providers.js';

/**
 * Global provider configuration storage
 *
 * **Module-private variable** - not exported to prevent external modification.
 */
let globalConfig: GlobalProviderConfig | null = null;

/**
 * Configure global provider settings
 *
 * Validates the configuration and stores it in the module-private
 * globalConfig variable.
 */
export function configureProviders(config: GlobalProviderConfig): void {
  // Validation logic
  if (!isValidProviderId(config.defaultProvider)) {
    throw new Error(
      `Invalid default provider: "${config.defaultProvider}". ` +
      `Supported providers: ${getSupportedProvidersList()}`
    );
  }

  globalConfig = config;
}

// Note: getGlobalProviderConfig() to be implemented in P1.M2.T1.S3
```

### 5.2 Configuration Cascade Pattern

From the Groundswell implementation patterns:

```typescript
/**
 * Configuration cascade (PRD 7.7)
 *
 * Priority: Prompt > Agent > Global > Default
 */
function resolveConfig<T>(
  global: T | undefined,
  agent: T | undefined,
  prompt: T | undefined,
  fallback: T
): T {
  return prompt ?? agent ?? global ?? fallback;
}

// Usage
const effectiveModel = resolveConfig(
  globalConfig.model,
  agentConfig.model,
  promptOptions.model,
  'claude-sonnet-4-20250514' // fallback
);
```

**File:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md`

### 5.3 Default Value with Nullish Coalescing

```typescript
// ✅ GOOD: ?? only treats null/undefined as missing
const timeout = options.timeout ?? 30000;

// ❌ BAD: || treats 0, '', false as missing
const timeout = options.timeout || 30000; // Wrong if timeout is 0
```

---

## 6. Best Practice References

### 6.1 Official Documentation

#### TypeScript Handbook
- **Modules:** https://www.typescriptlang.org/docs/handbook/modules.html
  - Section: "In TypeScript, any file containing a top-level import or export is considered a module"
  - Covers module scoping and privacy

- **Variable Declarations:** https://www.typescriptlang.org/docs/handbook/variable-declarations.html
  - Section: "let and const have block scope"
  - Covers module-level declarations

- **Type Guards:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
  - Pattern for validation functions

#### ECMAScript Specification
- **ES Modules:** https://tc39.es/ecma262/#sec-modules
  - Module evaluation semantics (singleton behavior)

- **Nullish Coalescing:** https://tc39.es/ecma262/#sec-nullish-coalescing-operator
  - `??` operator specification

### 6.2 Community Best Practices

#### Design Patterns
- **Module Pattern:** https://addyosmani.com/resources/essentialjsdesignpatterns/book/#modulepatternjavascript
  - Encapsulation with closures

- **Singleton Pattern:** https://refactoring.guru/design-patterns/singleton
  - ESM natural singleton behavior

#### Testing Resources
- **Vitest Test Isolation:** https://vitest.dev/guide/configure.html#test-isolation
  - Testing global state patterns

- **Testing Global State:** https://stackoverflow.com/questions/52632774/testing-global-variables-with-jest
  - Reset function patterns

### 6.3 Code Examples from Groundswell

#### Implementation Patterns Document
**File:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md`

Key patterns documented:
- Configuration cascade with nullish coalescing
- Default value patterns
- Immutable configuration
- Module-level private variables

#### TypeScript Module Patterns Research
**File:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/typescript-module-patterns.md`

Comprehensive research covering:
- Module-level private variable patterns
- ESM vs CommonJS considerations
- Type safety with module-private variables
- Testing strategies
- Performance considerations

#### Provider Config Tests
**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/provider-config.test.ts`

Example test patterns:
```typescript
describe('configureProviders', () => {
  describe('valid configuration', () => {
    it('should accept anthropic as default provider', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'anthropic' });
      }).not.toThrow();
    });
  });

  describe('invalid defaultProvider', () => {
    it('should throw on invalid provider string', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'invalid' });
      }).toThrow(/Invalid default provider/i);
    });
  });
});
```

---

## Summary and Recommendations

### Recommended Pattern for Groundswell

Based on research and existing codebase patterns:

```typescript
// Module-private variable with accessor functions
let globalConfig: GlobalProviderConfig | null = null;

const DEFAULT_CONFIG: GlobalProviderConfig = {
  defaultProvider: 'anthropic',
  providerDefaults: {}
};

/**
 * Get global config (never returns null)
 */
export function getGlobalConfig(): GlobalProviderConfig {
  return globalConfig ?? DEFAULT_CONFIG;
}

/**
 * Set global config
 */
export function setGlobalConfig(config: GlobalProviderConfig): void {
  globalConfig = config;
}

/**
 * Reset global config (for testing)
 * @internal
 */
export function resetGlobalConfig(): void {
  globalConfig = null;
}
```

### Key Best Practices

1. **Use `??` for defaults** - Only treats null/undefined as missing
2. **Return non-nullable types** - `GlobalProviderConfig` not `GlobalProviderConfig | null`
3. **Provide reset functions** - Essential for test isolation
4. **Don't export private state** - Export accessor functions, not variables
5. **Document with JSDoc** - Examples and `@internal` tags
6. **Validate in setters** - Throw errors for invalid input
7. **Return copies or frozen objects** - Prevent mutation of internal state
8. **Use module-scoped constants** - For default values
9. **Test default behavior** - Uninitialized, initialized, and reset states
10. **Leverage ESM semantics** - Modules are natural singletons

### Testing Checklist

- [ ] Test uninitialized state returns defaults
- [ ] Test initialized state returns configured values
- [ ] Test reset returns to defaults
- [ ] Reset in `afterEach` hook
- [ ] Test validation throws errors
- [ ] Test type safety with expectTypeOf
- [ ] Test immutability of returned values
- [ ] Test multiple callers see same state (ESM live bindings)

---

**Document Status:** Research Complete
**Date:** 2025-01-25
**Based On:** Groundswell codebase analysis and established TypeScript/ESM patterns
