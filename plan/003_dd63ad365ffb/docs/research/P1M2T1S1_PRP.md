# Product Requirement Prompt (PRP)
## Subtask P1.M2.T1.S1: Implement Global Provider Configuration Storage

---

## Goal

**Feature Goal**: Create module-level private variable storage for global provider configuration following the singleton pattern with module encapsulation.

**Deliverable**: A new module `src/utils/provider-config.ts` with:
1. Module-private variable `globalConfig` to store GlobalProviderConfig singleton
2. Initial state set to `null` with planned initialization to `defaultProvider: 'anthropic'`
3. Foundation for `configureProviders()`, `getGlobalProviderConfig()`, and `resolveProviderConfig()` functions (to be implemented in subsequent subtasks)

**Success Definition**:
- Module-private variable exists and is not exported (true privacy via ESM module scoping)
- Variable is typed as `GlobalProviderConfig | null` with initial value `null`
- Code compiles without type errors
- Module follows existing patterns from `src/cache/cache.ts` and `src/utils/model-spec.ts`

---

## User Persona

**Target User**: Developer implementing the multi-provider system (internal API, not end-user facing)

**Use Case**: Foundation for global provider configuration storage that will be mutated by `configureProviders()` in subtask P1.M2.T1.S2 and accessed by `getGlobalProviderConfig()` in subtask P1.M2.T1.S3

**User Journey**:
1. Developer creates `src/utils/provider-config.ts` with module-private variable
2. Variable initializes to `null` (unconfigured state)
3. Later subtasks will add `configureProviders()` to mutate this variable
4. Later subtasks will add accessor functions to read this variable

**Pain Points Addressed**:
- Provides single source of truth for global provider configuration
- Prevents accidental external mutation through module encapsulation
- Enables configuration cascade pattern (global → agent → prompt)

---

## Why

- **Foundation for Multi-Provider System**: Global config storage is prerequisite for provider switching and configuration cascade
- **Encapsulation**: Module-private variable prevents direct external modification, ensuring controlled access via accessor functions
- **Singleton Pattern**: Single global configuration instance shared across all agents
- **Type Safety**: TypeScript strict typing with `GlobalProviderConfig | null` prevents invalid states
- **Consistency**: Follows existing patterns in codebase (LLMCache singleton, model-spec utilities)

---

## What

Implement module-level private variable storage for global provider configuration.

### Implementation Scope (This Subtask Only)

**IN SCOPE**:
1. Create `src/utils/provider-config.ts` module
2. Declare module-private variable: `let globalConfig: GlobalProviderConfig | null = null`
3. Add JSDoc documentation explaining the pattern and usage
4. Add placeholder comments for future functions (configureProviders, getGlobalProviderConfig, resolveProviderConfig)
5. Export types for use by future functions

**OUT OF SCOPE** (Future Subtasks):
- `configureProviders()` function → P1.M2.T1.S2
- `getGlobalProviderConfig()` accessor → P1.M2.T1.S3
- `resolveProviderConfig()` cascade utility → P1.M2.T1.S4
- Provider registry integration → P1.M3
- Actual provider implementations → P2, P3

### Success Criteria

- [ ] File `src/utils/provider-config.ts` exists
- [ ] Module-private variable `globalConfig` declared as `let globalConfig: GlobalProviderConfig | null = null`
- [ ] Variable is NOT exported (module-private via ESM scoping)
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] File follows existing codebase patterns (JSDoc, structure, imports)
- [ ] Placeholder comments added for future functions

---

## All Needed Context

### Context Completeness Check

✅ **"No Prior Knowledge" Test**: A developer unfamiliar with this codebase has everything needed:
- Complete type definitions (GlobalProviderConfig, ProviderId, ProviderOptions)
- File location and naming patterns from existing utils
- Module system details (ESM, TypeScript config)
- Test patterns and validation approach
- Existing singleton patterns to follow (cache.ts)
- Implementation patterns from project documentation

### Documentation & References

```yaml
# MUST READ - Type Definitions
- file: src/types/providers.ts
  why: Contains GlobalProviderConfig interface definition (lines 353-364)
  critical: |
    - defaultProvider: ProviderId (required)
    - providerDefaults?: Partial<Record<ProviderId, ProviderOptions>> (optional)
  section: "Global Provider Configuration (PRD 7.6)"

# MUST READ - Implementation Pattern
- file: plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md
  why: Module-level private variable pattern for global config (line ~408-460)
  critical: |
    - Configuration Cascade: Global → Agent → Prompt priority
    - Default Value Patterns: Use ?? for nullish coalescing
    - Immutable Configuration: Treat config objects as immutable
  section: "Configuration Patterns"

# MUST READ - Singleton Pattern Example
- file: src/cache/cache.ts
  why: Existing singleton pattern with module-level state (line 236)
  pattern: export const defaultCache = new LLMCache();
  gotcha: This exports the singleton, but provider-config should NOT export the variable (use accessor functions instead)

# MUST READ - Utility Module Pattern
- file: src/utils/model-spec.ts
  why: Utility function pattern with comprehensive JSDoc (lines 1-251)
  pattern: |
    - File header JSDoc explaining purpose
    - Function-level JSDoc with examples
    - Type imports from '../types/providers.js'
    - ES module syntax (.js extensions)
  gotcha: Always use .js extensions in import paths (TypeScript requires this for ESM)

# MUST READ - Barrel Export Pattern
- file: src/utils/index.ts
  why: How to export from utils module (line 4)
  pattern: export { parseModelSpec, formatModelForProvider } from './model-spec.js';
  note: Will need to add provider-config exports here in future subtasks

# MUST READ - Test Pattern
- file: src/__tests__/unit/utils/model-spec.test.ts
  why: Test structure for utility functions (Vitest, describe/it/expect)
  pattern: |
    - Import from '../../../utils/model-spec.js'
    - describe() for function grouping
    - it() for individual test cases
    - expect().toEqual() for assertions
  note: Tests will be added in future subtasks after functions are implemented

# Project Configuration
- file: package.json
  why: Confirm ESM module system ("type": "module")
  critical: All imports must use .js extensions

- file: tsconfig.json
  why: TypeScript configuration (ES2022 target, ES2022 modules)
  critical: Strict mode enabled, noEmit for builds only

- file: vitest.config.ts
  why: Test framework configuration
  pattern: Tests in src/__tests__/**/*.test.ts, globals enabled

# External Research
- docfile: plan/003_dd63ad365ffb/P1M2T1S1/research/typescript-module-patterns.md
  why: TypeScript module-level private variable best practices
  critical: |
    - ESM provides true privacy through module scoping
    - Variables not exported are genuinely private at runtime
    - ES modules are singletons by design (evaluated once)
    - Use 'let' for mutable state, accessor functions for controlled access
```

### Current Codebase Tree

```bash
src/
├── cache/
│   └── cache.ts                    # Singleton pattern example (exports defaultCache)
├── core/
│   ├── agent.ts                    # Agent class (will use provider config)
│   ├── context.ts                  # AsyncLocalStorage context pattern
│   └── ...
├── types/
│   ├── providers.ts                # GlobalProviderConfig interface (lines 353-364)
│   └── index.ts                    # Barrel exports
├── utils/
│   ├── id.ts                       # Utility functions
│   ├── model-spec.ts               # Model parsing utilities (pattern to follow)
│   ├── observable.ts               # Observable class
│   └── index.ts                    # Barrel exports (line 1-6)
└── __tests__/
    └── unit/
        └── utils/
            └── model-spec.test.ts  # Test pattern reference
```

### Desired Codebase Tree (After This Subtask)

```bash
src/
├── utils/
│   ├── provider-config.ts          # NEW: Module-private globalConfig variable
│   ├── model-spec.ts               # Existing: Model parsing utilities
│   └── index.ts                    # UPDATE: Export provider-config functions (future subtasks)
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: ESM Module System
// Project uses pure ESM ("type": "module" in package.json)
// All imports MUST use .js extensions (TypeScript requires this for ESM)
import type { GlobalProviderConfig } from '../types/providers.js';  // ✓ CORRECT
import type { GlobalProviderConfig } from '../types/providers';     // ✗ WRONG

// CRITICAL: Module-Private Variable Pattern
// DO NOT export the globalConfig variable directly
// Instead, export accessor functions (to be added in P1.M2.T1.S2 and P1.M2.T1.S3)
let globalConfig: GlobalProviderConfig | null = null;  // ✓ CORRECT (not exported)
export let globalConfig: GlobalProviderConfig | null = null;  // ✗ WRONG (breaks encapsulation)

// CRITICAL: Initialization State
// Initialize to null (unconfigured state)
// Do NOT initialize with defaultProvider: 'anthropic' in this subtask
// That will be done by configureProviders() in P1.M2.T1.S2
let globalConfig: GlobalProviderConfig | null = null;  // ✓ CORRECT

// CRITICAL: TypeScript Type Safety
// Use strict typing with | null for unconfigured state
// Do not use 'any' or loose types
let globalConfig: GlobalProviderConfig | null = null;  // ✓ CORRECT
let globalConfig: GlobalProviderConfig | any = null;   // ✗ WRONG

// CRITICAL: File Organization
// Follow existing utils pattern (like model-spec.ts)
// - File header JSDoc
// - Type imports from '../types/providers.js'
// - ES module syntax
// - Future: Export functions for barrel export in index.ts

// CRITICAL: Singleton Semantics
// ES modules are evaluated once per process, providing natural singleton behavior
// No need for additional singleton pattern complexity
// Module-private variable is automatically singleton

// CRITICAL: Future Integration Points
// This subtask creates ONLY the variable storage
// P1.M2.T1.S2 will add configureProviders() to mutate this variable
// P1.M2.T1.S3 will add getGlobalProviderConfig() to access this variable
// P1.M2.T1.S4 will add resolveProviderConfig() to cascade configuration
```

---

## Implementation Blueprint

### Data Models and Structure

**No new models** - uses existing `GlobalProviderConfig` interface from `src/types/providers.ts`:

```typescript
// From src/types/providers.ts (lines 353-364)
export interface GlobalProviderConfig {
  /** Default provider to use when none specified */
  defaultProvider: ProviderId;

  /** Per-provider default options */
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
Task 1: CREATE src/utils/provider-config.ts
  - IMPLEMENT: Module-private variable declaration
  - PATTERN: Follow src/utils/model-spec.ts structure (file header, imports, JSDoc)
  - VARIABLE: let globalConfig: GlobalProviderConfig | null = null
  - NAMING: camelCase for variable (globalConfig)
  - PLACEMENT: src/utils/provider-config.ts (new file)
  - DEPENDENCIES: Import types from ../types/providers.js
  - DOCUMENTATION: Add JSDoc explaining module-private variable pattern
  - PLACEHOLDERS: Add comments for future functions (configureProviders, getGlobalProviderConfig, resolveProviderConfig)

Task 2: VERIFY TypeScript Compilation
  - RUN: npx tsc --noEmit
  - EXPECTED: Zero type errors
  - VALIDATION: Check that .js extensions are used in imports
  - VALIDATION: Check that GlobalProviderConfig type is resolved correctly

Task 3: VERIFY File Placement (Manual Verification)
  - CHECK: File exists at src/utils/provider-config.ts
  - CHECK: Variable is module-private (not exported)
  - CHECK: Imports use .js extensions
  - CHECK: JSDoc comments present
  - CHECK: Placeholder comments for future functions present

Note: Tests will be added in P1.M2.T1.S2, P1.M2.T1.S3, and P1.M2.T1.S4 when functions are implemented.
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// src/utils/provider-config.ts
// ============================================================================

/**
 * Global provider configuration storage
 *
 * ## Module-Private Variable Pattern
 *
 * This module uses ES module scoping to create a truly private singleton
 * configuration storage. The `globalConfig` variable is not exported,
 * preventing direct external modification. Access is provided through
 * exported functions (to be implemented in subsequent subtasks).
 *
 * ## Initialization State
 *
 * - Initial value: `null` (unconfigured state)
 * - After configuration: Set by `configureProviders()` (P1.M2.T1.S2)
 * - Access: Via `getGlobalProviderConfig()` (P1.M2.T1.S3)
 * - Resolution: Via `resolveProviderConfig()` (P1.M2.T1.S4)
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * Global config is the lowest priority in the cascade:
 * 1. GlobalProviderConfig (this config) - lowest priority
 * 2. AgentConfig.provider / AgentConfig.providerOptions
 * 3. Prompt-level overrides - highest priority
 *
 * @example
 * ```ts
 * // In P1.M2.T1.S2: Configure providers
 * import { configureProviders } from './utils/provider-config.js';
 *
 * configureProviders({
 *   defaultProvider: 'anthropic',
 *   providerDefaults: {
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 *
 * // In P1.M2.T1.S3: Access configuration
 * import { getGlobalProviderConfig } from './utils/provider-config.js';
 *
 * const config = getGlobalProviderConfig();
 * console.log(config.defaultProvider); // 'anthropic'
 * ```
 *
 * @see {@link GlobalProviderConfig} for configuration interface
 * @see {@link configureProviders} to be implemented in P1.M2.T1.S2
 * @see {@link getGlobalProviderConfig} to be implemented in P1.M2.T1.S3
 * @see {@link resolveProviderConfig} to be implemented in P1.M2.T1.S4
 */

// Type imports from providers module
// CRITICAL: Use .js extension (TypeScript requirement for ESM)
import type { GlobalProviderConfig } from '../types/providers.js';

// ============================================================================
// Module-Private Variable Storage
// ============================================================================

/**
 * Global provider configuration storage
 *
 * **Module-private variable** - not exported to prevent external modification.
 * Access via exported functions in subsequent subtasks.
 *
 * ## Type Safety
 *
 * - `GlobalProviderConfig | null`: Strict typing with nullable state
 * - Initialized to `null`: Unconfigured state until `configureProviders()` is called
 * - Mutable via `let`: Allows configuration updates in P1.M2.T1.S2
 *
 * ## Singleton Semantics
 *
 * ES modules are evaluated once per process, so this variable is naturally
 * a singleton shared across all imports of this module.
 *
 * @internal
 */
let globalConfig: GlobalProviderConfig | null = null;

// ============================================================================
// Future Functions (To Be Implemented in Subsequent Subtasks)
// ============================================================================

/**
 * Configure global provider settings
 *
 * **TO BE IMPLEMENTED IN P1.M2.T1.S2**
 *
 * This function will mutate the module-private `globalConfig` variable.
 *
 * @param config - Global provider configuration
 * @throws {Error} If configuration is invalid
 *
 * @example
 * ```ts
 * configureProviders({
 *   defaultProvider: 'anthropic',
 *   providerDefaults: {
 *     anthropic: { apiKey: 'sk-...' }
 *   }
 * });
 * ```
 */
// export function configureProviders(config: GlobalProviderConfig): void { ... }

/**
 * Get the current global provider configuration
 *
 * **TO BE IMPLEMENTED IN P1.M2.T1.S3**
 *
 * This function will return the module-private `globalConfig` variable.
 *
 * @returns Current global provider configuration
 * @throws {Error} If providers not configured (globalConfig is null)
 *
 * @example
 * ```ts
 * const config = getGlobalProviderConfig();
 * console.log(config.defaultProvider); // 'anthropic'
 * ```
 */
// export function getGlobalProviderConfig(): GlobalProviderConfig { ... }

/**
 * Resolve provider configuration with cascade
 *
 * **TO BE IMPLEMENTED IN P1.M2.T1.S4**
 *
 * This function will implement the configuration cascade:
 * Global → Agent → Prompt priority.
 *
 * @param agentProvider - Agent-level provider override
 * @param agentOptions - Agent-level options override
 * @returns Resolved provider and options
 *
 * @example
 * ```ts
 * const { provider, options } = resolveProviderConfig('opencode', { timeout: 5000 });
 * ```
 */
// export function resolveProviderConfig(
//   agentProvider?: ProviderId,
//   agentOptions?: ProviderOptions
// ): { provider: ProviderId; options: ProviderOptions } { ... }
```

### Integration Points

```yaml
TYPE_IMPORTS:
  - from: ../types/providers.js
  - types: GlobalProviderConfig
  - pattern: import type { GlobalProviderConfig } from '../types/providers.js';

FUTURE_EXPORTS:
  - add_to: src/utils/index.ts (in P1.M2.T1.S2)
  - pattern: export { configureProviders, getGlobalProviderConfig, resolveProviderConfig } from './provider-config.js';
  - note: Not adding exports in this subtask (functions not implemented yet)

FUTURE_TESTS:
  - create: src/__tests__/unit/utils/provider-config.test.ts (in P1.M2.T1.S2)
  - pattern: Follow src/__tests__/unit/utils/model-spec.test.ts
  - framework: Vitest with describe/it/expect
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file creation - fix before proceeding
# Check TypeScript compilation
npx tsc --noEmit

# Expected: Zero errors. Output should be silent (no errors printed).

# If errors occur, READ the error message carefully:
# - Check for missing .js extensions in imports
# - Check that GlobalProviderConfig type is resolved
# - Check for any type mismatches

# Example error to fix:
# error TS2307: Cannot find module '../types/providers'
# Fix: Change to '../types/providers.js'
```

### Level 2: File Structure Verification

```bash
# Verify file exists and has correct structure
ls -la src/utils/provider-config.ts

# Verify file is not empty
wc -l src/utils/provider-config.ts

# Expected: File exists with >50 lines (JSDoc + variable + placeholders)

# Verify variable is module-private (not exported)
grep -n "^export.*globalConfig" src/utils/provider-config.ts

# Expected: No matches (variable should not be exported)
# If found: Remove export keyword from variable declaration
```

### Level 3: Manual Code Review

```bash
# Open file for manual review
cat src/utils/provider-config.ts

# Check清单:
# [ ] File has comprehensive JSDoc header (like model-spec.ts)
# [ ] Import uses .js extension: import type { ... } from '../types/providers.js'
# [ ] Variable declared as: let globalConfig: GlobalProviderConfig | null = null
# [ ] Variable is NOT exported (no export keyword)
# [ ] Placeholder comments present for future functions
# [ ] No syntax errors (red squigglies in IDE)

# Verify imports resolve
grep "import.*GlobalProviderConfig" src/utils/provider-config.ts

# Expected: import type { GlobalProviderConfig } from '../types/providers.js';
```

### Level 4: Type Safety Verification

```bash
# TypeScript type checking (comprehensive)
npx tsc --noEmit --pretty

# Expected: Zero errors

# Verify type can be imported
node -e "import('./src/utils/provider-config.ts').then(m => console.log('Module loads OK'))"
# Note: This requires TypeScript execution support, may fail in Node directly
# Alternative: Use IDE "Go to Definition" on GlobalProviderConfig import

# In IDE (VS Code):
# 1. Open src/utils/provider-config.ts
# 2. Right-click on "GlobalProviderConfig" in import
# 3. Select "Go to Definition"
# 4. Should navigate to src/types/providers.ts line 353
```

### Level 5: Integration Readiness

```bash
# Verify file can be imported (prepare for future subtasks)
# Create temporary test file (cleanup after)
cat > /tmp/test-import.ts << 'EOF'
import type { GlobalProviderConfig } from './src/types/providers.js';

// This should compile without errors
const config: GlobalProviderConfig | null = null;
console.log('Type import works');
EOF

# Compile test file
npx tsc --noEmit /tmp/test-import.ts

# Expected: Zero errors
# Cleanup: rm /tmp/test-import.ts

# Verify module structure
tree -L 2 src/utils/

# Expected output should include:
# src/utils/
# ├── provider-config.ts  <-- NEW FILE
# ├── model-spec.ts
# └── index.ts
```

---

## Final Validation Checklist

### Technical Validation

- [ ] File `src/utils/provider-config.ts` exists
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Import uses .js extension: `import type { GlobalProviderConfig } from '../types/providers.js'`
- [ ] Variable declared as `let globalConfig: GlobalProviderConfig | null = null`
- [ ] Variable is module-private (NOT exported)
- [ ] File header JSDoc explains module-private variable pattern
- [ ] Placeholder comments present for future functions
- [ ] File follows existing patterns (similar to model-spec.ts structure)
- [ ] No ESLint errors (if project uses ESLint)
- [ ] No Prettier formatting errors (if project uses Prettier)

### Feature Validation

- [ ] Variable initializes to `null` (unconfigured state)
- [ ] Type is `GlobalProviderConfig | null` (strict typing)
- [ ] Variable is mutable (`let` not `const`) for future configuration
- [ ] JSDoc references future subtasks (P1.M2.T1.S2, P1.M2.T1.S3, P1.M2.T1.S4)
- [ ] JSDoc includes usage examples
- [ ] JSDoc explains configuration cascade (PRD 7.7)

### Code Quality Validation

- [ ] Follows existing codebase naming conventions (camelCase for variables)
- [ ] File placement matches desired codebase tree (src/utils/provider-config.ts)
- [ ] Import pattern matches existing utils (type-only import from providers.js)
- [ ] JSDoc style matches existing files (comprehensive, with examples)
- [ ] No dead code or commented-out code (except intentional placeholder comments)
- [ ] No console.log or debugging statements
- [ ] No hardcoded values (variable initializes to null only)

### Documentation & Deployment

- [ ] File header JSDoc explains purpose and pattern
- [ ] JSDoc includes @see references to related types and functions
- [ ] JSDoc includes @example for future usage
- [ ] Placeholder comments clearly indicate which subtask implements each function
- [ ] No external documentation changes needed (this is internal API)

---

## Anti-Patterns to Avoid

- ❌ **DON'T export the globalConfig variable directly**
  - Use accessor functions (to be added in P1.M2.T1.S2 and P1.M2.T1.S3)
  - Exporting breaks encapsulation and allows uncontrolled mutation

- ❌ **DON'T initialize with defaultProvider in this subtask**
  - Initialize to `null` (unconfigured state)
  - `configureProviders()` in P1.M2.T1.S2 will set the actual configuration

- ❌ **DON'T use `const` instead of `let`**
  - Variable must be mutable for `configureProviders()` to work
  - Use `let globalConfig: GlobalProviderConfig | null = null`

- ❌ **DON'T forget .js extensions in imports**
  - ESM requires .js extensions even for TypeScript files
  - Wrong: `import type { X } from '../types/providers'`
  - Correct: `import type { X } from '../types/providers.js'`

- ❌ **DON'T create functions in this subtask**
  - This subtask ONLY creates the variable storage
  - Functions will be added in P1.M2.T1.S2, P1.M2.T1.S3, P1.M2.T1.S4

- ❌ **DON'T add tests in this subtask**
  - Tests will be added in P1.M2.T1.S2 when `configureProviders()` exists
  - Testing a null variable without accessors provides no value

- ❌ **DON'T export from src/utils/index.ts yet**
  - Exports will be added in P1.M2.T1.S2 when functions exist
  - Barrel export of an incomplete module is premature

- ❌ **DON'T use loose types like `any`**
  - Use strict typing: `GlobalProviderConfig | null`
  - Type safety is critical for the configuration system

- ❌ **DON'T add reset/test-only functions in production code**
  - Test isolation will be handled in test files
  - Don't pollute production API with test utilities

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
- Complete type definitions available in codebase
- Clear existing patterns to follow (cache.ts, model-spec.ts)
- Simple, focused scope (one variable declaration)
- Comprehensive validation steps provided
- No dependencies on external libraries or complex logic

**Validation**: A developer unfamiliar with this codebase can successfully implement this feature using only this PRP content and codebase access.

---

## Appendix: Related Subtasks

This PRP is part of a sequence. Understanding the broader context helps:

- **P1.M2.T1.S1** (THIS PRP): Create module-private variable storage
- **P1.M2.T1.S2**: Implement `configureProviders()` function to mutate `globalConfig`
- **P1.M2.T1.S3**: Implement `getGlobalProviderConfig()` accessor to read `globalConfig`
- **P1.M2.T1.S4**: Implement `resolveProviderConfig()` cascade utility

The module-private variable created in this subtask is the foundation for all subsequent configuration functions.
