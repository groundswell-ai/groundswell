# Product Requirement Prompt (PRP): Implement ProviderRegistry Singleton Class Structure

---

## Goal

**Feature Goal**: Implement a singleton `ProviderRegistry` class that manages provider instances with registration, lookup, and existence checking capabilities.

**Deliverable**: A `ProviderRegistry` class in `/home/dustin/projects/groundswell/src/providers/provider-registry.ts` with singleton pattern, Map-based storage, and core registry methods (register, get, has).

**Success Definition**:
- Class follows singleton pattern with private constructor and `getInstance()` method
- Stores providers in `Map<ProviderId, Provider>` for O(1) lookups
- Implements `register(provider)`, `get(id)`, and `has(id)` methods
- Throws error on duplicate provider registration
- Returns `undefined` from `get()` for non-existent providers (not throwing)
- Includes `_resetForTesting()` method for test isolation
- All existing tests pass + new comprehensive tests pass

---

## User Persona

**Target User**: Groundswell framework developers who need to:
- Register provider instances at application startup (P1.M3.T1.S2)
- Retrieve provider instances by ID throughout the application
- Check provider existence before operations
- Maintain singleton registry across the application lifecycle

**Use Case**: After creating provider instances (AnthropicProvider, OpenCodeProvider), the application needs a central registry to manage these instances, ensuring single shared instances across all agents.

**User Journey**:
1. Application creates provider instances (e.g., `new AnthropicProvider()`)
2. Application registers providers with `ProviderRegistry.getInstance().register(anthropicProvider)`
3. Agents and services retrieve providers with `ProviderRegistry.getInstance().get('anthropic')`
4. Registry maintains single instance of each provider for shared use

**Pain Points Addressed**:
- **Duplicate Instances**: Prevents multiple provider instances from being created
- **Centralized Management**: Single point for provider lifecycle management
- **Type Safety**: Ensures only valid `ProviderId` values are used for lookups
- **Consistency**: All agents access the same provider instance with shared state

---

## Why

- **Foundation for Provider System**: This registry is the core of the multi-provider architecture (PRD 7.2-7.3)
- **Resource Efficiency**: Shared provider instances reduce memory footprint and connection overhead
- **Configuration Management**: Centralized registry enables consistent provider initialization (P1.M3.T1.S2)
- **Testing Support**: Singleton pattern with reset utilities enables proper test isolation
- **Decision 7 Compliance**: Implements the singleton registry pattern decided in architecture decisions

---

## What

Implement a singleton registry class for managing provider instances with registration, retrieval, and existence checking.

### Contract Definition (from tasks.json P1.M3.T1.S1)

1. **INPUT**: `Provider` interface from P1.M1.T1.S3
2. **LOGIC**: Create class `ProviderRegistry` with private static instance: `ProviderRegistry`. Private constructor. Static `getInstance()` method that creates instance if null, then returns it. Private `providers: Map<ProviderId, Provider>`. Implement `register(provider: Provider)`, `get(id: ProviderId)`, `has(id: ProviderId): boolean`.
3. **OUTPUT**: `ProviderRegistry` class for managing provider lifecycle

### Success Criteria

- [ ] Class `ProviderRegistry` exists in `src/providers/provider-registry.ts`
- [ ] Private static instance variable: `private static instance: ProviderRegistry`
- [ ] Private constructor: `private constructor()`
- [ ] Static `getInstance()` method with lazy initialization
- [ ] Private `providers: Map<ProviderId, Provider>` storage
- [ ] `register(provider: Provider): void` method
- [ ] `get(id: ProviderId): Provider | undefined` method
- [ ] `has(id: ProviderId): boolean` method
- [ ] Throws error on duplicate provider registration
- [ ] Includes `_resetForTesting(): void` method for test isolation
- [ ] Includes JSDoc documentation for all public methods
- [ ] All existing tests pass
- [ ] New comprehensive tests cover all scenarios

---

## All Needed Context

### Context Completeness Check

✅ **PASS**: If someone knew nothing about this codebase, they would have everything needed to implement this successfully from this PRP.

### Documentation & References

```yaml
# MUST READ - Decision 7: Singleton Registry Pattern
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/decisions.md
  why: Defines the singleton registry pattern decision with implementation blueprint
  section: "Decision 7: Provider Lifecycle Management"
  critical: Shows exact class structure expected: private static instance, private constructor, getInstance(), Map storage
  gotcha: initializeAll() shown in decision is for P1.M3.T1.S2, NOT this subtask

# MUST READ - Provider Interface Definition
- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Defines Provider interface that ProviderRegistry will store
  section: Lines 442-600 - Provider interface definition
  critical: Provider has readonly id: ProviderId used as map key
  pattern: readonly properties, 6 core methods (initialize, terminate, execute, registerMCPs, loadSkills, normalizeModel)

# MUST READ - ProviderId Type
- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Defines the key type for Map storage
  section: Lines 8-10
  critical: export type ProviderId = 'anthropic' | 'opencode'

# MUST READ - Registry Pattern Example (MCPHandler)
- file: /home/dustin/projects/groundswell/src/core/mcp-handler.ts
  why: Shows existing registry pattern to follow for Map-based operations
  section: Lines 40-70 (Map storage, registerServer method)
  pattern: private servers: Map<string, MCPServer>, throw on duplicate, has() method, get() returns undefined
  gotcha: MCPHandler is NOT a singleton - ProviderRegistry will be the FIRST true singleton class

# MUST READ - Testing Patterns for Global State
- file: /home/dustin/projects/groundswell/src/__tests__/unit/utils/provider-config.test.ts
  why: Shows how to test singleton/global state with reset patterns
  section: Lines 10-12 (afterEach reset), entire file for structure
  pattern: afterEach(() => resetGlobalConfig()), test both default and configured states
  critical: Must include _resetForTesting() method for test isolation

# MUST READ - Provider Interface Testing Pattern
- file: /home/dustin/projects/groundswell/src/__tests__/unit/provider-interface.test.ts
  why: Shows how to create mock Provider implementations for testing
  section: Entire file for mock implementation pattern
  pattern: class MockProvider implements Provider with vi.fn() mocks for methods

# MUST READ - Module Exports
- file: /home/dustin/projects/groundswell/src/types/index.ts
  why: Shows which types are exported from providers module
  section: Lines 27-44
  critical: Need to import Provider, ProviderId from '../types/providers.js'

# MUST READ - System Context
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/system_context.md
  why: Provides overview of provider system architecture and implementation status
  section: "Provider System Architecture" section
  critical: Understand where ProviderRegistry fits in overall architecture

# EXTERNAL RESEARCH - TypeScript Singleton Pattern
- url: https://refactoring.guru/design-patterns/singleton/typescript/example
  why: Standard TypeScript singleton implementation pattern
  section: "Implementation" section shows private static instance + getInstance()
  critical: Lazy initialization pattern with null check

# EXTERNAL RESEARCH - TypeScript Map
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  why: Map API reference for set(), get(), has(), delete() methods
  section: "Methods" section
  critical: has() returns boolean, get() returns undefined if not found (not throwing)

# EXTERNAL RESEARCH - Testing Singletons
- url: https://jestjs.io/docs/setup-teardown
  why: Jest/Vitest setup and teardown patterns for singleton testing
  section: "afterEach" and "beforeEach" sections
  critical: Reset singleton state between tests to prevent test pollution
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── providers/                       # NEW DIRECTORY - CREATE THIS
│   └── provider-registry.ts         # NEW FILE - IMPLEMENT HERE
├── types/
│   ├── providers.ts                 # EXISTING - Provider interface, ProviderId type (lines 8-10, 442-600)
│   └── index.ts                     # EXISTING - Type exports (lines 27-44)
├── core/
│   └── mcp-handler.ts               # EXISTING - Registry pattern reference (lines 40-154)
└── __tests__/
    └── unit/
        └── providers/               # NEW DIRECTORY - CREATE THIS
            └── provider-registry.test.ts  # NEW FILE - TEST HERE
```

### Desired Codebase Tree (after implementation)

```bash
src/
├── providers/
│   ├── provider-registry.ts         # NEW - ProviderRegistry class
│   │   ├── private static instance: ProviderRegistry
│   │   ├── private constructor()
│   │   ├── private providers: Map<ProviderId, Provider>
│   │   ├── static getInstance(): ProviderRegistry
│   │   ├── register(provider: Provider): void
│   │   ├── get(id: ProviderId): Provider | undefined
│   │   ├── has(id: ProviderId): boolean
│   │   └── static _resetForTesting(): void
│   └── index.ts                     # NEW - Export ProviderRegistry
├── types/
│   ├── providers.ts                 # UNCHANGED
│   └── index.ts                     # UNCHANGED
├── core/
│   └── mcp-handler.ts               # UNCHANGED (reference only)
└── __tests__/
    └── unit/
        └── providers/
            └── provider-registry.test.ts  # NEW - Comprehensive tests
```

### Known Gotchas of Groundswell Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript ESM requires .js extensions in imports
// When importing from other modules, use .js extension:
import type { Provider, ProviderId } from '../types/providers.js';

// CRITICAL: This is the FIRST traditional singleton class in the codebase
// Other patterns use module-level singletons (let/var at module scope)
// This class uses private static instance + getInstance() pattern

// CRITICAL: Provider.id is readonly - use as map key directly
// Provider interface defines: readonly id: ProviderId
// Do NOT try to modify provider.id after registration

// CRITICAL: get() returns undefined for missing providers (NOT throwing)
// Follow MCPHandler pattern: get(id) returns undefined if not found
// Use has() method to check existence if needed

// CRITICAL: Throw on duplicate registration
// Follow MCPHandler pattern: throw Error with descriptive message
// if (this.providers.has(provider.id)) {
//   throw new Error(`Provider '${provider.id}' is already registered`);
// }

// CRITICAL: Must include _resetForTesting() method
// Testing singletons requires state reset between tests
// Mark with underscore prefix to indicate internal/testing use
// static _resetForTesting(): void { this.instance = null as any; }

// CRITICAL: ProviderId is a union type, not string
// export type ProviderId = 'anthropic' | 'opencode'
// Map key type is ProviderId, not string

// CRITICAL: Lazy initialization in getInstance()
// Check if instance is null/undefined before creating
// if (!ProviderRegistry.instance) { ProviderRegistry.instance = new ProviderRegistry(); }

// CRITICAL: Private constructor prevents direct instantiation
// private constructor() {} // No parameters needed for S1
// Future subtasks may need constructor parameters

// CRITICAL: Use Map, not object, for provider storage
// private providers: Map<ProviderId, Provider> = new Map();
// Provides O(1) lookups, preserves insertion order, proper type safety
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed - using existing types from `src/types/providers.ts`:

```typescript
// Provider interface (lines 442-600 in providers.ts)
export interface Provider {
  readonly id: ProviderId;           // Used as map key
  readonly capabilities: ProviderCapabilities;
  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;
  execute<T>(/* ... */): Promise<AgentResponse<T>>;
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}

// ProviderId type (lines 8-10 in providers.ts)
export type ProviderId = 'anthropic' | 'opencode';
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/providers/ directory
  - CREATE: New directory src/providers/
  - REASON: Organize provider-related classes in dedicated directory
  - PLACEMENT: Alongside src/core/, src/utils/, src/types/

Task 2: CREATE provider-registry.ts file structure
  - CREATE: src/providers/provider-registry.ts
  - IMPORTS: Import type { Provider, ProviderId } from '../types/providers.js'
  - CLASS: export class ProviderRegistry { }
  - PLACEMENT: src/providers/provider-registry.ts (new file)
  - NAMING: PascalCase class name: ProviderRegistry

Task 3: IMPLEMENT private static instance and constructor
  - DECLARE: private static instance: ProviderRegistry
  - DECLARE: private providers: Map<ProviderId, Provider> = new Map()
  - IMPLEMENT: private constructor() { } // Empty constructor for S1
  - PATTERN: Follow singleton pattern with private static instance
  - PLACEMENT: At top of class, before any methods
  - NAMING: instance (lowercase), providers (lowercase)

Task 4: IMPLEMENT getInstance() static method
  - IMPLEMENT: static getInstance(): ProviderRegistry
  - LOGIC:
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  - RETURN TYPE: ProviderRegistry (non-null)
  - PATTERN: Lazy initialization with null check
  - PLACEMENT: First public method in class
  - NAMING: getInstance (camelCase)

Task 5: IMPLEMENT register() method
  - IMPLEMENT: register(provider: Provider): void
  - LOGIC:
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider '${provider.id}' is already registered`);
    }
    this.providers.set(provider.id, provider);
  - PATTERN: Follow MCPHandler.registerServer() error handling (lines 52-70)
  - THROW: Error with descriptive message on duplicate
  - PLACEMENT: After getInstance()
  - NAMING: register (camelCase)

Task 6: IMPLEMENT get() method
  - IMPLEMENT: get(id: ProviderId): Provider | undefined
  - LOGIC: return this.providers.get(id);
  - PATTERN: Follow MCPHandler pattern - returns undefined if not found
  - NO THROW: Do not throw for missing providers
  - PLACEMENT: After register()
  - NAMING: get (camelCase)

Task 7: IMPLEMENT has() method
  - IMPLEMENT: has(id: ProviderId): boolean
  - LOGIC: return this.providers.has(id);
  - PATTERN: Follow MCPHandler.hasTool() pattern (lines 152-154)
  - RETURN: boolean (true if registered, false otherwise)
  - PLACEMENT: After get()
  - NAMING: has (camelCase)

Task 8: IMPLEMENT _resetForTesting() method
  - IMPLEMENT: static _resetForTesting(): void
  - LOGIC: ProviderRegistry.instance = null as any;
  - DOCUMENT: Mark with @internal or @testing JSDoc tag
  - PATTERN: Follow resetGlobalConfig() pattern from provider-config.ts
  - PLACEMENT: After has(), at end of class
  - NAMING: _resetForTesting (underscore prefix = internal/testing)

Task 9: ADD JSDoc documentation
  - DOCUMENT: Class-level JSDoc explaining purpose and singleton pattern
  - DOCUMENT: All public methods (getInstance, register, get, has)
  - PATTERN: Follow existing JSDoc style from provider-config.ts
  - INCLUDE: @example tags showing usage
  - INCLUDE: @throws documentation for register() duplicate case

Task 10: CREATE src/providers/index.ts
  - CREATE: src/providers/index.ts
  - EXPORT: export { ProviderRegistry } from './provider-registry.js'
  - REASON: Provide clean module imports for consumers
  - PLACEMENT: src/providers/index.ts (new file)

Task 11: WRITE comprehensive unit tests
  - CREATE: src/__tests__/unit/providers/provider-registry.test.ts
  - DIRECTORY: Create src/__tests__/unit/providers/ if not exists
  - TEST SCENARIOS:
    - getInstance() returns same instance on multiple calls
    - register() successfully registers provider
    - register() throws on duplicate provider id
    - get() returns registered provider
    - get() returns undefined for unregistered provider
    - has() returns true for registered provider
    - has() returns false for unregistered provider
    - _resetForTesting() clears singleton state
    - registry maintains state across getInstance() calls
  - MOCKING: Create mock Provider using vi.fn() for methods
  - CLEANUP: Use afterEach(() => ProviderRegistry._resetForTesting())
  - PATTERN: Follow provider-config.test.ts structure
  - PLACEMENT: src/__tests__/unit/providers/provider-registry.test.ts

Task 12: VERIFY TypeScript compilation
  - RUN: npx tsc --noEmit
  - CHECK: No type errors
  - VERIFY: ProviderRegistry is properly exported
  - VERIFY: All imports use .js extensions
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// File Structure and Imports
// ============================================================================

/**
 * Provider Registry - Singleton provider lifecycle management
 *
 * Implements singleton pattern for managing provider instances across
 * the application. Ensures single shared instance of each provider.
 *
 * @module providers
 */

import type { Provider, ProviderId } from '../types/providers.js';

// ============================================================================
// Class Definition with Private Members
// ============================================================================

/**
 * Singleton registry for managing provider instances.
 *
 * This class maintains a single instance of itself and stores provider
 * instances in a Map for efficient lookup by ProviderId.
 *
 * ## Singleton Pattern
 *
 * - Private constructor prevents direct instantiation
 * - Static getInstance() returns the single instance
 * - Lazy initialization creates instance on first call
 *
 * ## Usage
 *
 * ```ts
 * // Get registry instance
 * const registry = ProviderRegistry.getInstance();
 *
 * // Register a provider
 * registry.register(anthropicProvider);
 *
 * // Retrieve a provider
 * const provider = registry.get('anthropic');
 *
 * // Check existence
 * if (registry.has('anthropic')) {
 *   // Provider is registered
 * }
 * ```
 *
 * @example
 * ```ts
 * import { ProviderRegistry } from 'groundswell';
 *
 * // Register providers at startup
 * const registry = ProviderRegistry.getInstance();
 * registry.register(new AnthropicProvider());
 * registry.register(new OpenCodeProvider());
 *
 * // Retrieve providers throughout application
 * const anthropic = registry.get('anthropic');
 * if (anthropic) {
 *   await anthropic.initialize();
 * }
 * ```
 */
export class ProviderRegistry {
  /**
   * Private static instance - the singleton instance
   *
   * @internal
   */
  private static instance: ProviderRegistry;

  /**
   * Private provider storage - maps ProviderId to Provider instance
   *
   * @internal
   */
  private providers: Map<ProviderId, Provider> = new Map();

  /**
   * Private constructor - prevents direct instantiation
   *
   * Use getInstance() to get the singleton instance.
   *
   * @internal
   */
  private constructor() {
    // Empty constructor for S1
    // Future subtasks may initialize with configuration
  }

  // ============================================================================
  // Static Methods - Singleton Access
  // ============================================================================

  /**
   * Get the singleton ProviderRegistry instance
   *
   * Creates the instance on first call (lazy initialization).
   * Returns the same instance on subsequent calls.
   *
   * @returns The singleton ProviderRegistry instance
   *
   * @example
   * ```ts
   * const registry1 = ProviderRegistry.getInstance();
   * const registry2 = ProviderRegistry.getInstance();
   * console.log(registry1 === registry2); // true
   * ```
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  // ============================================================================
  // Instance Methods - Registry Operations
  // ============================================================================

  /**
   * Register a provider instance
   *
   * Stores the provider in the registry using its id as the key.
   * Throws an error if a provider with the same id is already registered.
   *
   * @param provider - The provider instance to register
   * @throws {Error} If a provider with the same id is already registered
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * const anthropic = new AnthropicProvider();
   * registry.register(anthropic);
   * ```
   */
  public register(provider: Provider): void {
    // PATTERN: Check for duplicate before adding
    // GOTCHA: provider.id is readonly - use directly
    // GOTCHA: Throw descriptive error message
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider '${provider.id}' is already registered`);
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a registered provider by id
   *
   * Returns the provider instance if registered, otherwise returns undefined.
   * Does NOT throw for missing providers.
   *
   * @param id - The provider id to look up
   * @returns The provider instance, or undefined if not registered
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * const anthropic = registry.get('anthropic');
   * if (anthropic) {
   *   console.log('Provider found:', anthropic.id);
   * }
   * ```
   */
  public get(id: ProviderId): Provider | undefined {
    // PATTERN: Return undefined for missing items
    // GOTCHA: Do NOT throw for missing providers
    return this.providers.get(id);
  }

  /**
   * Check if a provider is registered
   *
   * Returns true if a provider with the given id is registered,
   * otherwise returns false.
   *
   * @param id - The provider id to check
   * @returns true if the provider is registered, false otherwise
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * if (registry.has('anthropic')) {
   *   console.log('Anthropic provider is available');
   * }
   * ```
   */
  public has(id: ProviderId): boolean {
    // PATTERN: Use Map.has() for existence check
    return this.providers.has(id);
  }

  // ============================================================================
  // Testing Utilities - Internal Use Only
  // ============================================================================

  /**
   * Reset the singleton instance to null
   *
   * **FOR TESTING PURPOSES ONLY**
   *
   * Clears the singleton instance, causing the next call to getInstance()
   * to create a fresh instance. Use in afterEach() hooks to ensure
   * test isolation.
   *
   * @internal
   *
   * @example
   * ```ts
   * import { describe, it, afterEach } from 'vitest';
   *
   * describe('ProviderRegistry', () => {
   *   afterEach(() => {
   *     ProviderRegistry._resetForTesting();
   *   });
   *
   *   it('should start fresh', () => {
   *     const registry = ProviderRegistry.getInstance();
   *     // Test with clean state
   *   });
   * });
   * ```
   */
  public static _resetForTesting(): void {
    ProviderRegistry.instance = null as any;
  }
}

// ============================================================================
// Testing Pattern - Mock Provider Factory
// ============================================================================

/**
 * Helper function to create mock Provider for testing
 *
 * @example
 * ```ts
 * function createMockProvider(id: ProviderId): Provider {
 *   return {
 *     id,
 *     capabilities: {
 *       mcp: true,
 *       skills: true,
 *       lsp: false,
 *       streaming: true,
 *       sessions: false,
 *       extendedThinking: false,
 *     },
 *     initialize: vi.fn().mockResolvedValue(undefined),
 *     terminate: vi.fn().mockResolvedValue(undefined),
 *     execute: vi.fn(),
 *     registerMCPs: vi.fn(),
 *     loadSkills: vi.fn(),
 *     normalizeModel: vi.fn(),
 *   };
 * }
 * ```
 */
```

### Integration Points

```yaml
MODULE_STRUCTURE:
  - create: src/providers/ directory
  - create: src/providers/provider-registry.ts
  - create: src/providers/index.ts
  - export: ProviderRegistry class

TYPE_IMPORTS:
  - from: src/types/providers.js
  - import: Provider, ProviderId

TEST_STRUCTURE:
  - create: src/__tests__/unit/providers/ directory
  - create: src/__tests__/unit/providers/provider-registry.test.ts
  - mock: Use vi.fn() for Provider method mocks

FUTURE_INTEGRATION:
  - P1.M3.T1.S2: Will add initializeAll() method
  - P1.M3.T1.S3: Will add terminateAll() and clear() methods
  - P4.M1: Will be used by Agent constructor for provider lookup
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating the file structure
# Change to project root
cd /home/dustin/projects/groundswell

# TypeScript type checking
npx tsc --noEmit
# Expected: Zero errors. The class should compile without type errors.

# Check that file exists and is readable
ls -la src/providers/provider-registry.ts
# Expected: File exists, is readable

# Manual code review checks
# - [ ] All imports use .js extension
# - [ ] Class is exported
# - [ ] Constructor is private
# - [ ] getInstance() is static and public
# - [ ] register(), get(), has() are public instance methods
# - [ ] _resetForTesting() is static and public
# - [ ] JSDoc comments on all public members
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test file
npm test -- src/__tests__/unit/providers/provider-registry.test.ts

# Expected output:
# ✓ ProviderRegistry (all tests pass)
#   ✓ getInstance() returns same instance on multiple calls
#   ✓ register() successfully registers provider
#   ✓ register() throws on duplicate provider id
#   ✓ get() returns registered provider
#   ✓ get() returns undefined for unregistered provider
#   ✓ has() returns true for registered provider
#   ✓ has() returns false for unregistered provider
#   ✓ _resetForTesting() clears singleton state
#   ✓ registry maintains state across getInstance() calls
#
# Test Files  1 passed (1)
# Tests  10+ passed

# Run with coverage (if available)
npm run test:coverage -- src/__tests__/unit/providers/provider-registry.test.ts

# Expected: 100% coverage for ProviderRegistry class

# Run full unit test suite
npm test -- src/__tests__/unit/

# Expected: All tests pass, no regressions
```

### Level 3: Integration Testing (System Validation)

```bash
# Test that module exports are correct
node -e "
import('./src/providers/provider-registry.js').then(m => {
  console.log('Exports:', Object.keys(m));
  console.log('has ProviderRegistry:', typeof m.ProviderRegistry === 'function');
});
"
# Expected: ProviderRegistry is listed and is a class/function

# Test singleton behavior
node -e "
import('./src/providers/provider-registry.js').then(m => {
  const r1 = m.ProviderRegistry.getInstance();
  const r2 = m.ProviderRegistry.getInstance();
  console.log('Same instance:', r1 === r2);
  console.log('has method:', typeof r1.register === 'function');
  console.log('get method:', typeof r1.get === 'function');
  console.log('has method:', typeof r1.has === 'function');
});
"
# Expected: Same instance: true, all methods are functions

# Run full test suite
npm test
# Expected: All tests pass, no new failures
```

### Level 4: Type Safety & Contract Validation

```bash
# Verify TypeScript compilation with strict types
npx tsc --noEmit --strict

# Check that type inference works correctly
node -e "
import('./src/providers/provider-registry.js').then(m => {
  const registry = m.ProviderRegistry.getInstance();
  // This should compile without type errors
  const hasAnthropic = registry.has('anthropic');
  const hasInvalid = registry.has('invalid'); // Should error
  console.log('Type-safe has check:', hasAnthropic);
});
"
# Expected: Type error on invalid ProviderId literal

# Verify generic type safety
node -e "
import('./src/providers/provider-registry.js').then(m => {
  const registry = m.ProviderRegistry.getInstance();
  const provider = registry.get('anthropic');
  // Type should be Provider | undefined
  console.log('Provider type:', provider === undefined ? 'undefined' : 'Provider');
});
"
# Expected: No type errors, correct type inference
```

---

## Final Validation Checklist

### Technical Validation

- [ ] **Directory Created**: `src/providers/` directory exists
- [ ] **File Created**: `src/providers/provider-registry.ts` exists and compiles
- [ ] **Index File**: `src/providers/index.ts` exports ProviderRegistry
- [ ] **Private Static Instance**: `private static instance: ProviderRegistry`
- [ ] **Private Constructor**: `private constructor()` implemented
- [ ] **Private Providers Map**: `private providers: Map<ProviderId, Provider>`
- [ ] **getInstance() Method**: Static method with lazy initialization
- [ ] **register() Method**: Throws on duplicate, stores in Map
- [ ] **get() Method**: Returns `Provider | undefined` (not throwing)
- [ ] **has() Method**: Returns boolean from Map.has()
- [ ] **_resetForTesting() Method**: Static method for test isolation
- [ ] **JSDoc Complete**: All public methods documented
- [ ] **Type Safety**: No TypeScript compilation errors
- [ ] **All Tests Pass**: Both new and existing tests pass

### Feature Validation

- [ ] **Singleton Behavior**: `getInstance()` returns same instance on multiple calls
- [ ] **Lazy Initialization**: Instance created on first call to `getInstance()`
- [ ] **Registration Works**: `register()` stores provider by id
- [ ] **Duplicate Detection**: `register()` throws error on duplicate provider id
- [ ] **Retrieval Works**: `get()` returns registered provider
- [ ] **Missing Provider**: `get()` returns `undefined` for unregistered provider
- [ ] **Existence Check**: `has()` returns true/false correctly
- [ ] **Test Reset**: `_resetForTesting()` clears singleton state
- [ ] **State Persistence**: Registry state maintained across `getInstance()` calls

### Code Quality Validation

- [ ] **Follows MCPHandler Pattern**: Similar Map-based registry structure
- [ ] **ESM Compatible**: All imports use `.js` extensions
- [ ] **Type Annotations**: All methods properly typed
- [ ] **Error Messages**: Descriptive error messages for duplicate registration
- [ ] **Naming Conventions**: camelCase methods, PascalCase class
- [ ] **Documentation**: JSDoc with @example tags
- [ ] **Test Coverage**: 100% of public methods tested

### Anti-Patterns Check

- [ ] ❌ **Did NOT export instance variable** (private static)
- [ ] ❌ **Did NOT use public constructor** (constructor is private)
- [ ] ❌ **Did NOT throw from get()** (returns undefined)
- [ ] ❌ **Did NOT allow duplicates** (register() throws)
- [ ] ❌ **Did NOT use Object instead of Map** (Map for O(1) lookups)
- [ ] ❌ **Did NOT forget testing utility** (_resetForTesting exists)
- [ ] ❌ **Did NOT use string type for keys** (ProviderId union type)

---

## Anti-Patterns to Avoid

### ❌ Bad Pattern 1: Public Constructor

```typescript
// BAD: Allows direct instantiation, breaks singleton
export class ProviderRegistry {
  constructor() {} // Public!
}

// GOOD: Private constructor enforces singleton
export class ProviderRegistry {
  private constructor() {}
}
```

### ❌ Bad Pattern 2: Throwing from get()

```typescript
// BAD: Forces try/catch on every lookup
public get(id: ProviderId): Provider {
  const provider = this.providers.get(id);
  if (!provider) {
    throw new Error(`Provider '${id}' not found`);
  }
  return provider;
}

// GOOD: Return undefined for missing providers
public get(id: ProviderId): Provider | undefined {
  return this.providers.get(id);
}
```

### ❌ Bad Pattern 3: Not Checking for Duplicates

```typescript
// BAD: Silent failure on duplicate registration
public register(provider: Provider): void {
  this.providers.set(provider.id, provider); // Overwrites!
}

// GOOD: Fail fast with descriptive error
public register(provider: Provider): void {
  if (this.providers.has(provider.id)) {
    throw new Error(`Provider '${provider.id}' is already registered`);
  }
  this.providers.set(provider.id, provider);
}
```

### ❌ Bad Pattern 4: Using Object Instead of Map

```typescript
// BAD: Type safety issues, no has() method
private providers: Record<string, Provider> = {};

public has(id: ProviderId): boolean {
  return id in this.providers; // Wrong
}

// GOOD: Use Map for type-safe lookups
private providers: Map<ProviderId, Provider> = new Map();

public has(id: ProviderId): boolean {
  return this.providers.has(id); // Correct
}
```

### ❌ Bad Pattern 5: Missing Test Reset Function

```typescript
// BAD: Tests pollute each other's state
export class ProviderRegistry {
  // No reset method!
}

// Tests fail because singleton persists
describe('ProviderRegistry', () => {
  it('first test', () => {
    const registry = ProviderRegistry.getInstance();
    registry.register(mockProvider);
  });

  it('second test', () => {
    const registry = ProviderRegistry.getInstance();
    // Still has the provider from first test!
    expect(registry.has('anthropic')).toBe(true); // BUG!
  });
});

// GOOD: Provide reset for test isolation
export class ProviderRegistry {
  public static _resetForTesting(): void {
    ProviderRegistry.instance = null as any;
  }
}

describe('ProviderRegistry', () => {
  afterEach(() => {
    ProviderRegistry._resetForTesting();
  });

  it('first test', () => {
    // Clean state
  });

  it('second test', () => {
    // Also clean state
  });
});
```

### ❌ Bad Pattern 6: Eager Initialization

```typescript
// BAD: Instance created at module load time
export class ProviderRegistry {
  private static instance: ProviderRegistry = new ProviderRegistry();
  private constructor() {}

  static getInstance(): ProviderRegistry {
    return ProviderRegistry.instance;
  }
}

// GOOD: Lazy initialization (creates on first use)
export class ProviderRegistry {
  private static instance: ProviderRegistry;

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }
}
```

---

## References & Research Summary

### Codebase Patterns Found

1. **MCPHandler Registry** (from `src/core/mcp-handler.ts`)
   - Map-based storage with O(1) lookups
   - Throws error on duplicate registration
   - `has()` method returns boolean
   - `get()` method returns item (not throwing)

2. **Module-Level Singletons** (from `src/utils/provider-config.ts`)
   - ES module scoping for privacy
   - This will be FIRST class-based singleton in codebase

3. **Testing Patterns** (from `src/__tests__/unit/utils/provider-config.test.ts`)
   - `afterEach` hooks with reset functions
   - Test both configured and default states
   - Verify singleton behavior with reference equality

### External Best Practices

1. **Singleton Pattern** (Refactoring.guru)
   - Private static instance
   - Private constructor
   - Static getInstance() with lazy initialization

2. **Map API** (MDN)
   - `set()` for adding items
   - `get()` for retrieval (returns undefined if not found)
   - `has()` for existence check (returns boolean)

3. **Testing Singletons** (Jest/Vitest)
   - Reset state between tests
   - Use `afterEach` hooks
   - Provide testing utilities

---

## Confidence Score

**9/10** for one-pass implementation success

**Reasoning**:
- ✅ Well-defined contract with clear specification
- ✅ Existing MCPHandler pattern to follow for registry operations
- ✅ Standard singleton pattern with no variations
- ✅ All context provided with specific file paths and line numbers
- ✅ Testing patterns well-established in codebase
- ✅ No external dependencies or complex integration
- ✅ Only 4 public methods to implement (getInstance, register, get, has)
- ⚠️ Minor risk: Creating new `src/providers/` directory structure
- ⚠️ Minor risk: Ensuring proper test isolation with reset function

**Mitigation**: PRP includes explicit directory creation instructions, reset method implementation, and comprehensive test patterns.

---

## Appendix: Quick Reference

### File Locations

| Purpose | Path |
|---------|------|
| **Implementation** | `/home/dustin/projects/groundswell/src/providers/provider-registry.ts` (new) |
| **Module Index** | `/home/dustin/projects/groundswell/src/providers/index.ts` (new) |
| **Type Definitions** | `/home/dustin/projects/groundswell/src/types/providers.ts` |
| **Registry Reference** | `/home/dustin/projects/groundswell/src/core/mcp-handler.ts` |
| **Test File** | `/home/dustin/projects/groundswell/src/__tests__/unit/providers/provider-registry.test.ts` (new) |
| **Decision 7** | `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/decisions.md` |

### Key Line Numbers

| Item | File | Lines |
|------|------|-------|
| **Provider interface** | providers.ts | 442-600 |
| **ProviderId type** | providers.ts | 8-10 |
| **MCPHandler register pattern** | mcp-handler.ts | 52-70 |
| **MCPHandler has() pattern** | mcp-handler.ts | 152-154 |
| **Testing reset pattern** | provider-config.test.ts | 10-12 |

### Implementation Checklist

- [ ] Create `src/providers/` directory
- [ ] Create `src/providers/provider-registry.ts`
- [ ] Implement private static instance and constructor
- [ ] Implement `getInstance()` method
- [ ] Implement `register()` method
- [ ] Implement `get()` method
- [ ] Implement `has()` method
- [ ] Implement `_resetForTesting()` method
- [ ] Add JSDoc documentation
- [ ] Create `src/providers/index.ts`
- [ ] Create test directory `src/__tests__/unit/providers/`
- [ ] Write comprehensive tests
- [ ] Run TypeScript compilation
- [ ] Run test suite
- [ ] Verify module exports

### Success Command

```bash
# One command to verify implementation success
npm test -- src/__tests__/unit/providers/provider-registry.test.ts && npx tsc --noEmit && echo "✅ ProviderRegistry implementation verified"
```

---

**End of PRP**
