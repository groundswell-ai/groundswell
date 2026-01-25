# Product Requirement Prompt (PRP): Implement resolveProviderConfig() Cascade Utility

---

## Goal

**Feature Goal**: Implement `resolveProviderConfig()` cascade utility function that resolves provider configuration through the priority chain: **Global → Agent → Prompt**. First defined value wins at each level.

**Deliverable**: An exported `resolveProviderConfig()` function in `/home/dustin/projects/groundswell/src/utils/provider-config.ts` that returns resolved provider and merged options based on the configuration cascade.

**Success Definition**:
- Function takes `globalConfig`, `agentProvider`, `agentOptions`, `promptProvider`, `promptOptions` as inputs
- Resolves provider using nullish coalescing: `promptProvider ?? agentProvider ?? globalConfig.defaultProvider`
- Merges options using object spread: `{...globalDefaults, ...agentOptions, ...promptOptions}`
- Returns `{provider: ProviderId, options: ProviderOptions}` for Agent to use
- All existing tests pass + new comprehensive tests for cascade logic pass
- Function follows existing codebase patterns and conventions

---

## User Persona

**Target User**: Groundswell framework developers and provider system implementers who need to:
- Resolve the effective provider for Agent initialization (P4.M1)
- Merge configuration options from multiple sources (global, agent, prompt)
- Implement the PRD 7.7 configuration cascade specification

**Use Case**: When an Agent is initialized or when `agent.prompt()` is called, the system needs to determine:
1. Which provider to use (anthropic or opencode)
2. What options to apply (merged from global defaults, agent config, prompt overrides)

**User Journey**:
1. System has global config from `configureProviders({ defaultProvider: 'anthropic', providerDefaults: {...} })`
2. Agent may have provider override: `new Agent({ provider: 'opencode', providerOptions: {...} })`
3. Individual prompt may override: `agent.prompt('...', { provider: 'anthropic', providerOptions: {...} })`
4. `resolveProviderConfig()` merges all levels and returns final provider + options

**Pain Points Addressed**:
- **Configuration Complexity**: Multiple configuration levels (global/agent/prompt) are difficult to merge correctly
- **Type Safety**: Must ensure merged options maintain `ProviderOptions` type
- **Immutability**: Must not mutate input objects; create new merged object
- **Priority Clarity**: Clear precedence: prompt overrides agent overrides global

---

## Why

- **Configuration Cascade Foundation**: This function implements PRD 7.7's core cascade mechanism (global → agent → prompt)
- **Type Safety**: TypeScript generics ensure merged result maintains `ProviderOptions` type structure
- **Immutability**: Object spread creates new objects, preventing accidental mutation of source configs
- **Provider Resolution**: Nullish coalescing (`??`) ensures correct "first defined value wins" semantics
- **Agent Integration**: Used by Agent constructor (P4.M1) and `prompt()` method (P4.M3) to determine effective provider
- **Consistency**: Single source of truth for configuration merge logic across the codebase

---

## What

Implement a configuration cascade utility that merges provider configuration from three levels (global, agent, prompt) with proper priority handling.

### Contract Definition (from tasks.json P1.M2.T1.S4)

1. **INPUT**: `globalConfig: GlobalProviderConfig`, `agentProvider?: ProviderId`, `agentOptions?: ProviderOptions`, `promptProvider?: ProviderId`, `promptOptions?: ProviderOptions`
2. **LOGIC**:
   - Resolve provider: `promptProvider ?? agentProvider ?? globalConfig.defaultProvider`
   - Resolve options: `{...globalConfig.providerDefaults?.[resolvedProvider], ...agentOptions, ...promptOptions}`
   - Use object spread for merge (prompt overrides agent overrides global)
3. **OUTPUT**: `{provider: ProviderId, options: ProviderOptions}` for Agent to use

### Success Criteria

- [ ] Function `resolveProviderConfig()` is exported from `src/utils/provider-config.ts`
- [ ] Takes 5 parameters: globalConfig, agentProvider?, agentOptions?, promptProvider?, promptOptions?
- [ ] Returns `{provider: ProviderId, options: ProviderOptions}` tuple
- [ ] Provider resolution uses nullish coalescing (`??`) for correct priority
- [ ] Options merge uses object spread with correct precedence order
- [ ] Function is pure (no side effects, no mutations of inputs)
- [ ] Includes comprehensive JSDoc documentation
- [ ] All existing tests continue to pass
- [ ] New unit tests cover all cascade scenarios

---

## All Needed Context

### Context Completeness Check

✅ **PASS**: If someone knew nothing about this codebase, they would have everything needed to implement this successfully from this PRP.

### Documentation & References

```yaml
# MUST READ - Implementation file to modify
- file: /home/dustin/projects/groundswell/src/utils/provider-config.ts
  why: This is the file containing globalConfig storage and all provider config functions
  pattern: Lines 245-265 contain commented template for resolveProviderConfig()
  gotcha: The function is currently commented out with incomplete signature
  critical: Must import ProviderOptions type for return value

# MUST READ - Type definitions
- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Contains all type definitions needed for the function
  section: ProviderId type (lines 8-10), ProviderOptions interface (lines 35-50), GlobalProviderConfig interface (lines 353-364)
  gotcha: ProviderOptions has all optional properties; GlobalProviderConfig has required defaultProvider and optional providerDefaults

# MUST READ - Existing test patterns
- file: /home/dustin/projects/groundswell/src/__tests__/unit/utils/provider-config.test.ts
  why: Shows testing patterns for provider-config module
  pattern: describe/it/expect structure, afterEach reset pattern (lines 8-11)
  gotcha: Uses resetGlobalConfig() for test isolation - must use same pattern

# MUST READ - Implementation patterns
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md
  why: Defines configuration cascade pattern and default value patterns
  section: "Configuration Patterns" section (lines 407-460) for cascade and ?? operator usage
  critical: Use ?? (nullish coalescing) not || for defaults (line 436-444)

# MUST READ - PRD specification
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/prd_snapshot.md
  why: PRD Section 7.7 defines the configuration cascade requirement
  section: Section 7.7 "Configuration Cascade" (lines 352-366)
  critical: Defines priority: Global (lowest) → Agent → Prompt (highest)

# EXTERNAL RESEARCH - MDN Object Spread
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
  why: Understanding object spread behavior for merging options
  section: "Spread in object literals" section
  critical: Later objects override earlier objects for duplicate keys

# EXTERNAL RESEARCH - TypeScript Spread
- url: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html#object-spread-and-rest
  why: TypeScript-specific spread behavior and type inference
  section: "Object Spread and Rest" section

# EXTERNAL RESEARCH - Nullish Coalescing
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator
  why: Using ?? for provider resolution instead of ||
  section: "Description" and "Examples"
  critical: ?? only treats null/undefined as missing, || treats 0, '', false as missing
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── utils/
│   └── provider-config.ts           # IMPLEMENT HERE - Add resolveProviderConfig()
│       ├── let globalConfig: GlobalProviderConfig | null = null  (line 77)
│       ├── const DEFAULT_CONFIG: GlobalProviderConfig  (lines 87-90)
│       ├── configureProviders()     (lines 155-178)
│       ├── getGlobalProviderConfig() (lines 224-228)
│       ├── resetGlobalConfig()       (lines 241-243)
│       └── // TODO: resolveProviderConfig()  (lines 245-265 - commented template)
├── types/
│   └── providers.ts                 # TYPE DEFINITIONS
│       ├── ProviderId type  (lines 8-10: 'anthropic' | 'opencode')
│       ├── ProviderOptions interface  (lines 35-50)
│       └── GlobalProviderConfig interface  (lines 353-364)
└── __tests__/
    └── unit/
        └── utils/
            └── provider-config.test.ts  # TEST HERE - Add tests for resolveProviderConfig()
```

### Desired Codebase Tree (after implementation)

```bash
src/
├── utils/
│   └── provider-config.ts
│       ├── let globalConfig: GlobalProviderConfig | null = null
│       ├── configureProviders()     (existing, unchanged)
│       ├── getGlobalProviderConfig()  (existing, unchanged)
│       ├── resetGlobalConfig()       (existing, unchanged)
│       └── resolveProviderConfig()   # NEW - IMPLEMENT THIS
├── types/
│   └── providers.ts                 # (unchanged)
└── __tests__/
    └── unit/
        └── utils/
            └── provider-config.test.ts
                └── describe('resolveProviderConfig', ...)  # NEW - TEST THIS
```

### Known Gotchas of Groundswell Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript ESM requires .js extensions in imports
// Line 52 in provider-config.ts shows correct pattern:
import type { GlobalProviderConfig, ProviderId } from '../types/providers.js';
// Must also add ProviderOptions to this import

// CRITICAL: Use ?? (nullish coalescing) for provider resolution, not ||
// From implementation_patterns.md line 439:
// GOOD: const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;
// BAD:  const provider = promptProvider || agentProvider || globalConfig.defaultProvider;

// CRITICAL: Object spread merges with "last write wins" semantics
// For options merge:
// {...globalDefaults, ...agentOptions, ...promptOptions}
// Prompt options override agent options, which override global defaults

// CRITICAL: Spread from undefined/null is safe but returns empty object
// globalConfig.providerDefaults?.[resolvedProvider] may be undefined
// {...undefined, ...agentOptions} is same as {...agentOptions}

// CRITICAL: ProviderOptions interface has all optional properties
// interface ProviderOptions {
//   endpoint?: string;
//   apiKey?: string;
//   sessionId?: string;
//   timeout?: number;
//   headers?: Record<string, string>;
// }
// Merged result must satisfy this interface

// CRITICAL: Function signature in comment (lines 262-265) is incomplete
// Current: resolveProviderConfig(agentProvider?, agentOptions?)
// Required: resolveProviderConfig(globalConfig, agentProvider?, agentOptions?, promptProvider?, promptOptions?)

// CRITICAL: Must follow existing JSDoc style (see configureProviders lines 119-154)
// Use @example tags showing usage
// Document the cascade priority clearly

// CRITICAL: Return type is tuple, not separate object
// { provider: ProviderId, options: ProviderOptions }
// NOT { provider: ProviderId } | { options: ProviderOptions }
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed - using existing types from `src/types/providers.ts`:

```typescript
// From providers.ts lines 8-10
export type ProviderId = 'anthropic' | 'opencode';

// From providers.ts lines 35-50
export interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// From providers.ts lines 353-364
export interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}

// Return type - tuple object
type ResolvedProviderConfig = {
  provider: ProviderId;
  options: ProviderOptions;
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UPDATE type imports in provider-config.ts
  - MODIFY: Line 52 import statement
  - ADD: ProviderOptions to type imports
  - CURRENT: import type { GlobalProviderConfig, ProviderId } from '../types/providers.js';
  - NEW: import type { GlobalProviderConfig, ProviderId, ProviderOptions } from '../types/providers.js';
  - REASON: Need ProviderOptions type for function signature and return type

Task 2: DEFINE return type interface (optional, can use inline type)
  - CREATE: ResolvedProviderConfig interface at module level (optional)
  - OR: Use inline type: { provider: ProviderId; options: ProviderOptions }
  - LOCATION: After private validation helpers (after line 113)
  - NAMING: ResolvedProviderConfig (if creating interface)
  - REASON: Type safety for return value

Task 3: IMPLEMENT resolveProviderConfig() function
  - UNCOMMENT/REPLACE: Lines 245-265 in provider-config.ts
  - IMPLEMENT: export function resolveProviderConfig(
      globalConfig: GlobalProviderConfig,
      agentProvider?: ProviderId,
      agentOptions?: ProviderOptions,
      promptProvider?: ProviderId,
      promptOptions?: ProviderOptions
    ): { provider: ProviderId; options: ProviderOptions }
  - LOGIC:
    1. Resolve provider: promptProvider ?? agentProvider ?? globalConfig.defaultProvider
    2. Get global defaults: globalConfig.providerDefaults?.[resolvedProvider]
    3. Merge options: { ...globalDefaults, ...agentOptions, ...promptOptions }
    4. Return tuple object
  - PLACEMENT: After resetGlobalConfig() function (after line 243)
  - NAMING: resolveProviderConfig (camelCase function name)
  - DEPENDENCIES: Requires Task 1 (type imports)

Task 4: ADD comprehensive JSDoc documentation
  - DOCUMENT: Function purpose and cascade behavior
  - PATTERN: Follow configureProviders() JSDoc style (lines 119-154)
  - INCLUDE:
    - Cascade priority explanation (Global → Agent → Prompt)
    - @param tags for all 5 parameters
    - @returns tag describing return type
    - @example showing full cascade usage
  - EXPLAIN: "First defined value wins" semantics using ?? operator
  - EXPLAIN: Options merge precedence using spread

Task 5: WRITE comprehensive unit tests
  - CREATE: New describe block 'resolveProviderConfig' in provider-config.test.ts
  - LOCATION: After getGlobalProviderConfig tests (after line 229)
  - PATTERN: Follow existing test structure (describe/it/expect)
  - TEST SCENARIOS:
    1. Provider resolution:
       - Uses global default when no overrides
       - Agent provider overrides global default
       - Prompt provider overrides agent provider
       - Nullish coalescing behavior (undefined vs null)

    2. Options merge:
       - Only global defaults (no agent/prompt)
       - Agent options merge with global defaults
       - Prompt options override agent options
       - All three levels present
       - Empty/undefined options at various levels

    3. Cascade integration:
       - Full cascade with all levels
       - Prompt provider override with prompt options
       - Agent provider override with agent options
       - Provider-specific global defaults
       - Cross-scenario combinations

    4. Type safety:
       - Return value structure is correct
       - Properties are correctly typed
       - No mutation of input objects

    5. Edge cases:
       - All undefined parameters
       - Only global config
       - Conflicting provider resolution (agent vs prompt)
  - CLEANUP: Use resetGlobalConfig() in afterEach hooks
  - COVERAGE: Aim for 100% of function logic paths

Task 6: VERIFY module exports
  - CHECK: resolveProviderConfig() is exported
  - VERIFY: No breaking changes to existing exports
  - RUN: TypeScript compilation to verify no type errors
  - TEST: Import function from other modules works correctly
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// Pattern 1: Type Imports (Task 1)
// ============================================================================

// BEFORE (line 52):
import type { GlobalProviderConfig, ProviderId } from '../types/providers.js';

// AFTER:
import type {
  GlobalProviderConfig,
  ProviderId,
  ProviderOptions  // ADD THIS
} from '../types/providers.js';

// ============================================================================
// Pattern 2: Return Type Interface (Task 2 - Optional)
// ============================================================================

/**
 * Resolved provider configuration
 *
 * Result of cascading configuration from global → agent → prompt levels.
 *
 * @internal
 */
interface ResolvedProviderConfig {
  /** The resolved provider ID */
  provider: ProviderId;
  /** The merged provider options */
  options: ProviderOptions;
}

// ============================================================================
// Pattern 3: Function Implementation (Task 3)
// ============================================================================

/**
 * Resolve provider configuration with cascade
 *
 * **P1.M2.T1.S4 - Configuration Cascade Utility**
 *
 * This function implements the PRD 7.7 configuration cascade:
 * Global config → Agent config → Prompt config (highest priority).
 *
 * ## Provider Resolution
 *
 * The provider is resolved using nullish coalescing (`??`), which means
 * the first non-null/undefined value wins:
 *
 * ```ts
 * const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;
 * ```
 *
 * Priority (highest to lowest):
 * 1. Prompt-level provider override
 * 2. Agent-level provider override
 * 3. Global default provider
 *
 * ## Options Merge
 *
 * Options are merged using object spread with "last write wins" semantics:
 *
 * ```ts
 * const options = {
 *   ...globalConfig.providerDefaults?.[provider],
 *   ...agentOptions,
 *   ...promptOptions
 * };
 * ```
 *
 * Priority (highest to lowest):
 * 1. Prompt-level options (override everything)
 * 2. Agent-level options (override global defaults)
 * 3. Global provider-specific defaults (base layer)
 *
 * ## Immutability
 *
 * This function creates a new options object and does not mutate any
 * input parameters. All object spreads create shallow copies.
 *
 * @param globalConfig - Global provider configuration from configureProviders()
 * @param agentProvider - Agent-level provider override (optional)
 * @param agentOptions - Agent-level options override (optional)
 * @param promptProvider - Prompt-level provider override (optional)
 * @param promptOptions - Prompt-level options override (optional)
 * @returns Resolved provider and merged options
 *
 * @example
 * ```ts
 * import { resolveProviderConfig, getGlobalProviderConfig } from 'groundswell';
 *
 * // Setup global config
 * configureProviders({
 *   defaultProvider: 'anthropic',
 *   providerDefaults: {
 *     anthropic: { timeout: 30000, apiKey: 'sk-global' },
 *     opencode: { endpoint: 'http://localhost:8080' }
 *   }
 * });
 *
 * // Agent configured with opencode override
 * const agentProvider = 'opencode';
 * const agentOptions = { timeout: 10000 };
 *
 * // Prompt with anthropic override
 * const promptProvider = 'anthropic';
 * const promptOptions = { temperature: 0.5 };
 *
 * const global = getGlobalProviderConfig();
 * const { provider, options } = resolveProviderConfig(
 *   global,
 *   agentProvider,
 *   agentOptions,
 *   promptProvider,
 *   promptOptions
 * );
 *
 * console.log(provider); // 'anthropic' (prompt wins)
 * console.log(options);
 * // { timeout: 30000, apiKey: 'sk-global', temperature: 0.5 }
 * // timeout from anthropic global defaults (agent's timeout was for opencode)
 * // apiKey from anthropic global defaults
 * // temperature from prompt options
 * ```
 */
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions } {
  // Step 1: Resolve provider using nullish coalescing
  // ?? operator: first non-null/undefined value wins
  const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;

  // Step 2: Get global defaults for the resolved provider
  // Optional chaining: returns undefined if providerDefaults or provider key doesn't exist
  const globalDefaults = globalConfig.providerDefaults?.[provider];

  // Step 3: Merge options using object spread
  // Later objects override earlier objects for the same keys
  const options: ProviderOptions = {
    ...(globalDefaults ?? {}),      // Global defaults (base layer)
    ...(agentOptions ?? {}),         // Agent overrides (middle layer)
    ...(promptOptions ?? {})         // Prompt overrides (top layer)
  };

  // Step 4: Return resolved configuration tuple
  return { provider, options };
}

// ============================================================================
// Pattern 4: Testing Structure (Task 5)
// ============================================================================

describe('resolveProviderConfig', () => {
  // PATTERN: Reset after each test for isolation
  afterEach(() => {
    resetGlobalConfig();
  });

  // Setup helper for creating global config
  const createGlobalConfig = (
    defaultProvider: ProviderId = 'anthropic',
    providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>
  ): GlobalProviderConfig => ({
    defaultProvider,
    providerDefaults
  });

  describe('provider resolution', () => {
    it('should use global default when no overrides provided', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);

      expect(result.provider).toBe('anthropic');
    });

    it('should use agent provider when provided', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global, 'opencode');

      expect(result.provider).toBe('opencode');
    });

    it('should use prompt provider over agent provider', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global, 'opencode', undefined, 'anthropic');

      expect(result.provider).toBe('anthropic'); // Prompt wins
    });

    it('should handle undefined agent provider', () => {
      const global = createGlobalConfig('opencode');
      const result = resolveProviderConfig(global, undefined);

      expect(result.provider).toBe('opencode'); // Falls back to global
    });

    it('should handle null prompt provider as override', () => {
      const global = createGlobalConfig('anthropic');
      // Note: null would need to be filtered out in real implementation
      // This test documents expected behavior with nullish coalescing
      const result = resolveProviderConfig(
        global,
        'opencode',
        undefined,
        // Type error: null is not assignable to ProviderId
        // But ?? treats null and undefined the same
        undefined as any
      );

      expect(result.provider).toBe('opencode'); // Agent wins
    });
  });

  describe('options merge', () => {
    it('should use only global defaults when no overrides', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-test' }
      });
      const result = resolveProviderConfig(global);

      expect(result.options).toEqual({
        timeout: 30000,
        apiKey: 'sk-test'
      });
    });

    it('should merge agent options with global defaults', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-global' }
      });
      const result = resolveProviderConfig(global, 'anthropic', { timeout: 10000 });

      expect(result.options).toEqual({
        timeout: 10000,  // Agent overrides global
        apiKey: 'sk-global'  // Global preserved
      });
    });

    it('should merge prompt options with agent and global defaults', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-global', sessionId: 'session1' }
      });
      const result = resolveProviderConfig(
        global,
        'anthropic',
        { timeout: 10000, endpoint: 'https://agent.com' },
        undefined,
        { temperature: 0.5 }
      );

      expect(result.options).toEqual({
        timeout: 10000,           // Agent overrides global
        apiKey: 'sk-global',       // Global preserved
        sessionId: 'session1',     // Global preserved
        endpoint: 'https://agent.com',  // Agent added
        temperature: 0.5           // Prompt added
      });
    });

    it('should allow prompt options to override agent options', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });
      const result = resolveProviderConfig(
        global,
        'anthropic',
        { timeout: 10000, apiKey: 'sk-agent' },
        undefined,
        { timeout: 5000 }  // Prompt overrides agent
      );

      expect(result.options).toEqual({
        timeout: 5000,        // Prompt wins
        apiKey: 'sk-agent'    // Agent preserved
      });
    });

    it('should handle undefined global defaults', () => {
      const global = createGlobalConfig('anthropic'); // No providerDefaults
      const result = resolveProviderConfig(
        global,
        'anthropic',
        { timeout: 10000 }
      );

      expect(result.options).toEqual({
        timeout: 10000
      });
    });

    it('should handle undefined options at all levels', () => {
      const global = createGlobalConfig('opencode');
      const result = resolveProviderConfig(
        global,
        undefined,
        undefined,
        undefined,
        undefined
      );

      expect(result.options).toEqual({});
    });
  });

  describe('cascade integration', () => {
    it('should handle full cascade with all levels', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: {
          timeout: 30000,
          apiKey: 'sk-global',
          endpoint: 'https://api.anthropic.com'
        },
        opencode: {
          endpoint: 'http://localhost:8080',
          timeout: 60000
        }
      });

      const result = resolveProviderConfig(
        global,                    // Global: anthropic + both providers' defaults
        'opencode',                // Agent: use opencode provider
        { timeout: 10000 },        // Agent: override timeout
        'anthropic',               // Prompt: override back to anthropic
        { apiKey: 'sk-prompt' }    // Prompt: override apiKey
      );

      // Prompt provider wins
      expect(result.provider).toBe('anthropic');

      // anthropic global defaults + prompt options
      // Agent's timeout was for opencode, so ignored
      expect(result.options).toEqual({
        timeout: 30000,                      // From anthropic global defaults
        endpoint: 'https://api.anthropic.com',  // From anthropic global defaults
        apiKey: 'sk-prompt'                  // Prompt overrides global
      });
    });

    it('should use provider-specific global defaults', () => {
      const global = createGlobalConfig('opencode', {
        anthropic: { timeout: 30000 },
        opencode: { timeout: 60000, endpoint: 'http://localhost:8080' }
      });

      // Agent uses anthropic (override from global default opencode)
      const result = resolveProviderConfig(global, 'anthropic');

      expect(result.provider).toBe('anthropic');
      expect(result.options).toEqual({
        timeout: 30000  // anthropic's global defaults
      });
    });

    it('should merge across provider switches', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-anthropic' },
        opencode: { timeout: 60000, endpoint: 'http://localhost:8080' }
      });

      // Start with opencode at agent level
      const agentResult = resolveProviderConfig(global, 'opencode');
      expect(agentResult.provider).toBe('opencode');
      expect(agentResult.options).toEqual({
        timeout: 60000,
        endpoint: 'http://localhost:8080'
      });

      // Prompt switches to anthropic with custom timeout
      const promptResult = resolveProviderConfig(
        global,
        'opencode',
        { timeout: 10000 },  // Agent opencode options
        'anthropic',         // Prompt switches to anthropic
        { apiKey: 'sk-prompt' }  // Prompt anthropic options
      );

      expect(promptResult.provider).toBe('anthropic');
      expect(promptResult.options).toEqual({
        timeout: 30000,         // From anthropic global defaults
        apiKey: 'sk-prompt',     // Prompt overrides global
        // endpoint is not in anthropic defaults
      });
    });
  });

  describe('immutability', () => {
    it('should not mutate input objects', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });
      const agentOptions = { apiKey: 'sk-agent' };
      const promptOptions = { timeout: 5000 };

      const originalAgentOptions = { ...agentOptions };
      const originalPromptOptions = { ...promptOptions };

      resolveProviderConfig(global, 'anthropic', agentOptions, undefined, promptOptions);

      expect(agentOptions).toEqual(originalAgentOptions);
      expect(promptOptions).toEqual(originalPromptOptions);
    });

    it('should create new options object', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });
      const result1 = resolveProviderConfig(global);
      const result2 = resolveProviderConfig(global);

      expect(result1.options).not.toBe(result2.options); // Different references
      expect(result1.options).toEqual(result2.options);  // Same values
    });
  });

  describe('type safety', () => {
    it('should return correct structure', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);

      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('options');
      expect(typeof result.provider).toBe('string');
      expect(typeof result.options).toBe('object');
    });

    it('should return valid ProviderId', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);

      expect(['anthropic', 'opencode']).toContain(result.provider);
    });

    it('should return valid ProviderOptions structure', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-test' }
      });
      const result = resolveProviderConfig(global);

      // ProviderOptions can have any of these properties
      const validKeys = ['endpoint', 'apiKey', 'sessionId', 'timeout', 'headers'];
      const resultKeys = Object.keys(result.options);
      for (const key of resultKeys) {
        expect(validKeys).toContain(key);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle all undefined parameters', () => {
      const global = createGlobalConfig();
      const result = resolveProviderConfig(global);

      expect(result.provider).toBe('anthropic');
      expect(result.options).toEqual({});
    });

    it('should handle global with undefined providerDefaults', () => {
      const global: GlobalProviderConfig = {
        defaultProvider: 'opencode',
        providerDefaults: undefined
      };
      const result = resolveProviderConfig(global, 'opencode', { timeout: 5000 });

      expect(result.provider).toBe('opencode');
      expect(result.options).toEqual({ timeout: 5000 });
    });

    it('should handle empty options objects', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });
      const result = resolveProviderConfig(
        global,
        'anthropic',
        {},  // Empty agent options
        undefined,
        {}   // Empty prompt options
      );

      expect(result.options).toEqual({ timeout: 30000 });
    });
  });
});
```

### Integration Points

```yaml
MODULE_EXPORTS:
  - file: src/utils/provider-config.ts
  - add: export function resolveProviderConfig(...)
  - existing: configureProviders(), getGlobalProviderConfig(), resetGlobalConfig()
  - verify: No breaking changes to existing exports

TYPE_IMPORTS:
  - modify: import type { GlobalProviderConfig, ProviderId, ProviderOptions } from '../types/providers.js'
  - add: ProviderOptions to existing imports

CONFIGURATION_CASCADE:
  - uses: getGlobalProviderConfig() to get base config
  - used_by: Agent constructor (P4.M1.T1.S2 - not yet implemented)
  - used_by: Agent.prompt() method (P4.M3.T1.S2 - not yet implemented)
  - depends_on: GlobalProviderConfig from getGlobalProviderConfig()

TESTING:
  - file: src/__tests__/unit/utils/provider-config.test.ts
  - add: New describe block for resolveProviderConfig()
  - pattern: Follow existing configureProviders() and getGlobalProviderConfig() test structure
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
# Expected: Zero errors. The function should have correct parameter types and return type.

# Format check (if using prettier/ruff equivalent)
# This project uses TypeScript compiler for formatting
npx tsc --noEmit
# Expected: No type errors

# Verify type imports are correct
npx tsc --noEmit src/utils/provider-config.ts
# Expected: No errors about ProviderOptions not being found

# Manual code review
# - Check: JSDoc is complete and follows existing style
# - Check: Function uses ?? operator for provider resolution
# - Check: Function uses spread for options merge
# - Check: All 5 parameters are present
# - Check: Return type is { provider: ProviderId; options: ProviderOptions }
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test file
npm test -- src/__tests__/unit/utils/provider-config.test.ts

# Expected output:
# ✓ configureProviders (all existing tests)
# ✓ getGlobalProviderConfig (all existing tests)
# ✓ resolveProviderConfig (all new tests pass)
#
# Test Files  1 passed (1)
# Tests  XX passed (XX)

# Run with coverage (if available)
npm run test:coverage -- src/__tests__/unit/utils/provider-config.test.ts

# Expected: High coverage for resolveProviderConfig function (target 100%)

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
  console.log('has resolveProviderConfig:', typeof m.resolveProviderConfig === 'function');
});
"
# Expected: resolveProviderConfig is listed and is a function

# Test function behavior with simple inputs
node -e "
import('./src/utils/provider-config.js').then(m => {
  const global = { defaultProvider: 'anthropic', providerDefaults: undefined };
  const result = m.resolveProviderConfig(global);
  console.log('Provider:', result.provider);
  console.log('Options:', result.options);
});
"
# Expected:
# Provider: anthropic
# Options: {}

# Test cascade behavior
node -e "
import('./src/utils/provider-config.js').then(m => {
  const global = {
    defaultProvider: 'anthropic',
    providerDefaults: {
      anthropic: { timeout: 30000, apiKey: 'sk-global' }
    }
  };

  // Test agent override
  const agentResult = m.resolveProviderConfig(global, 'opencode');
  console.log('Agent provider:', agentResult.provider);

  // Test prompt override
  const promptResult = m.resolveProviderConfig(
    global,
    'opencode',
    { timeout: 10000 },
    'anthropic',
    { apiKey: 'sk-prompt' }
  );
  console.log('Prompt provider:', promptResult.provider);
  console.log('Prompt options:', promptResult.options);
});
"
# Expected:
# Agent provider: opencode
# Prompt provider: anthropic
# Prompt options: { timeout: 30000, apiKey: 'sk-prompt' }

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
  const global = { defaultProvider: 'anthropic' };
  const { provider, options } = m.resolveProviderConfig(global);

  // This should compile without type errors
  const providerId: 'anthropic' | 'opencode' = provider;
  const timeout: number | undefined = options.timeout;

  console.log('Type-safe access:', providerId, timeout);
});
"
# Expected: No TypeScript errors, outputs type-safe values

# Verify function handles nullish values correctly
node -e "
import('./src/utils/provider-config.js').then(m => {
  const global = { defaultProvider: 'anthropic' };

  // All undefined except global
  const result1 = m.resolveProviderConfig(global);
  console.log('All undefined:', result1.provider, result1.options);

  // Agent provider undefined
  const result2 = m.resolveProviderConfig(global, undefined, { timeout: 5000 });
  console.log('Agent undefined:', result2.provider, result2.options);

  // Prompt provider undefined
  const result3 = m.resolveProviderConfig(global, 'opencode', undefined, undefined);
  console.log('Prompt undefined:', result3.provider);
});
"
# Expected:
# All undefined: anthropic {}
# Agent undefined: anthropic { timeout: 5000 }
# Prompt undefined: opencode

# Verify immutability
node -e "
import('./src/utils/provider-config.js').then(m => {
  const global = { defaultProvider: 'anthropic' };
  const agentOptions = { timeout: 5000 };
  const originalAgentOptions = { ...agentOptions };

  m.resolveProviderConfig(global, 'anthropic', agentOptions);

  const mutated = Object.keys(agentOptions).some(
    key => agentOptions[key] !== originalAgentOptions[key]
  );

  console.log('Input mutated:', mutated);
  console.log('Should be false');
});
"
# Expected: Input mutated: false (no mutations)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] **Implementation Complete**: `resolveProviderConfig()` function exists and is exported
- [ ] **Signature Correct**: Takes 5 parameters (globalConfig, agentProvider?, agentOptions?, promptProvider?, promptOptions?)
- [ ] **Return Type Correct**: Returns `{ provider: ProviderId; options: ProviderOptions }`
- [ ] **Provider Resolution**: Uses `??` operator with correct priority (prompt > agent > global)
- [ ] **Options Merge**: Uses object spread with correct order (global, agent, prompt)
- [ ] **Type Imports**: ProviderOptions added to import statement
- [ ] **JSDoc Complete**: Comprehensive documentation with `@example` tags
- [ ] **Type Safety**: TypeScript compilation passes with no errors
- [ ] **All Tests Pass**: Both new tests and existing tests pass
- [ ] **No Linting Errors**: Code follows project style guidelines

### Feature Validation

- [ ] **Provider Resolution**: Correctly resolves provider from cascade levels
- [ ] **Options Merge**: Correctly merges options with proper precedence
- [ ] **Global Defaults**: Uses provider-specific defaults when available
- [ ] **Agent Override**: Agent-level overrides take precedence over global
- [ ] **Prompt Override**: Prompt-level overrides take highest precedence
- [ ] **Nullish Handling**: Correctly handles `undefined` at all levels
- [ ] **Immutability**: Does not mutate input objects
- [ ] **Empty Options**: Handles empty/undefined options correctly

### Code Quality Validation

- [ ] **Follows Existing Patterns**: Matches `configureProviders()` and `getGlobalProviderConfig()` style
- [ ] **Uses `??` Operator**: Nullish coalescing for provider resolution (not `||`)
- [ ] **Uses Spread Operator**: Object spread for options merge
- [ ] **Module Privacy**: No new private variables exported
- [ ] **ESM Compatible**: Uses `.js` extensions in imports if needed
- [ ] **No Breaking Changes**: Existing exports and functionality unchanged
- [ ] **Test Coverage**: Comprehensive test coverage for all scenarios

### Integration Validation

- [ ] **Module Exports**: Function is exported and accessible from module
- [ ] **Import Works**: Can import and use function from other modules
- [ ] **Type Inference**: TypeScript correctly infers parameter and return types
- [ ] **Documentation**: JSDoc matches implementation behavior
- [ ] **Future Compatibility**: Ready for use by Agent constructor (P4.M1)

### Anti-Patterns Check

- [ ] ❌ **Did NOT use `||` operator** (correctly used `??`)
- [ ] ❌ **Did NOT mutate input objects** (created new objects via spread)
- [ ] ❌ **Did NOT skip parameters** (all 5 parameters present)
- [ ] ❌ **Did NOT return wrong type** (returns tuple object, not separate values)
- [ ] ❌ **Did NOT throw errors** (function handles all cases gracefully)
- [ ] ❌ **Did NOT use `any` type** (properly typed with ProviderId and ProviderOptions)
- [ ] ❌ **Did NOT reverse merge order** (prompt has highest priority)

---

## Anti-Patterns to Avoid

### ❌ Bad Pattern 1: Using Logical OR (`||`)

```typescript
// BAD: Treats 0, '', false as missing
const provider = promptProvider || agentProvider || globalConfig.defaultProvider;

// GOOD: Only treats null/undefined as missing
const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;
```

### ❌ Bad Pattern 2: Reverse Merge Priority

```typescript
// BAD: Global overrides prompt (wrong priority)
const options = {
  ...promptOptions,
  ...agentOptions,
  ...globalDefaults
};

// GOOD: Prompt overrides agent overrides global (correct priority)
const options = {
  ...globalDefaults,
  ...agentOptions,
  ...promptOptions
};
```

### ❌ Bad Pattern 3: Mutating Input Objects

```typescript
// BAD: Mutates globalDefaults
const options = globalDefaults;
if (agentOptions) {
  Object.assign(options, agentOptions);
}

// GOOD: Creates new object with spread
const options = {
  ...globalDefaults,
  ...agentOptions
};
```

### ❌ Bad Pattern 4: Incomplete Function Signature

```typescript
// BAD: Missing prompt parameters
export function resolveProviderConfig(
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions } {
  // ...
}

// GOOD: All parameters present
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions } {
  // ...
}
```

### ❌ Bad Pattern 5: Wrong Return Type

```typescript
// BAD: Returns separate values (not tuple)
export function resolveProviderConfig(...): ProviderId | ProviderOptions {
  // ...
}

// BAD: Returns union instead of tuple
export function resolveProviderConfig(...): { provider?: ProviderId; options?: ProviderOptions } {
  // ...
}

// GOOD: Returns tuple object with both values
export function resolveProviderConfig(...): { provider: ProviderId; options: ProviderOptions } {
  // ...
}
```

### ❌ Bad Pattern 6: Ignoring Provider-Specific Defaults

```typescript
// BAD: Uses global defaultProvider's defaults, not resolved provider's
const globalDefaults = globalConfig.providerDefaults?.[globalConfig.defaultProvider];

// GOOD: Uses defaults for the RESOLVED provider
const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;
const globalDefaults = globalConfig.providerDefaults?.[provider];
```

---

## References & Research Summary

### Codebase Patterns Found

1. **Module-Private Variable Pattern** (from `src/utils/provider-config.ts:77`)
   - Uses ES module scoping for true privacy
   - `let globalConfig: GlobalProviderConfig | null = null` is not exported

2. **Existing Configuration Functions** (from `src/utils/provider-config.ts`)
   - `configureProviders()`: Lines 155-178 (validation and storage pattern)
   - `getGlobalProviderConfig()`: Lines 224-228 (accessor with defaults)
   - `resetGlobalConfig()`: Lines 241-243 (testing utility)

3. **Default Value Pattern** (from `src/utils/provider-config.ts:87-90`)
   - `DEFAULT_CONFIG` constant for fallback values
   - Uses `??` operator consistently

4. **Validation Patterns** (from `src/utils/provider-config.ts:102-113`)
   - `isValidProviderId()` type guard function
   - `getSupportedProvidersList()` for error messages

5. **Testing Patterns** (from `src/__tests__/unit/utils/provider-config.test.ts`)
   - `afterEach` reset pattern for isolation
   - `describe/it/expect` structure
   - Tests for both success paths and error cases

### External Best Practices

1. **Object Spread for Merge** (MDN)
   - Creates shallow copy with merged properties
   - Later objects override earlier ones for duplicate keys
   - Spreading `null` or `undefined` is safe (results in empty object)

2. **Nullish Coalescing (`??`)** (MDN)
   - Only treats `null` and `undefined` as missing values
   - Prefer over `||` for default values when 0, '', false are valid

3. **TypeScript Spread Type Inference** (TypeScript Handbook)
   - Correctly infers merged types
   - Later types override for conflicts
   - Use `Partial<T>` for optional overrides

4. **Configuration Cascade Pattern** (ESLint, Webpack, Vue)
   - Hierarchical configuration with right-to-left priority
   - Immutable merge operations
   - Type-safe configuration objects

### Testing Patterns

1. **Vitest Structure** (from existing tests)
   - `describe/it/expect` pattern
   - `afterEach` for cleanup/reset
   - Test both success paths and edge cases

2. **Test Isolation**
   - Use `resetGlobalConfig()` in `afterEach` hooks
   - Each test starts with clean state

3. **Comprehensive Coverage**
   - Test all parameter combinations
   - Test type safety
   - Test immutability

---

## Confidence Score

**9/10** for one-pass implementation success

**Reasoning**:
- ✅ Clear contract and specification from tasks.json
- ✅ Existing codebase has all patterns to follow
- ✅ All context provided with specific file paths and line numbers
- ✅ Testing patterns well-established in codebase
- ✅ Simple, well-defined function (2 story points)
- ✅ No external dependencies or complex integration
- ⚠️ Minor risk: Understanding object spread precedence (prompt > agent > global)
- ⚠️ Minor risk: Provider-specific defaults lookup (using resolved provider, not global default)

**Mitigation**: PRP includes explicit implementation patterns with code examples and comprehensive test cases that validate correct behavior.

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
| **Type imports** | provider-config.ts | 52 (modify to add ProviderOptions) |
| **globalConfig variable** | provider-config.ts | 77 |
| **DEFAULT_CONFIG** | provider-config.ts | 87-90 |
| **configureProviders()** | provider-config.ts | 155-178 |
| **getGlobalProviderConfig()** | provider-config.ts | 224-228 |
| **resetGlobalConfig()** | provider-config.ts | 241-243 |
| **TODO placeholder** | provider-config.ts | 245-265 (replace with implementation) |
| **ProviderId type** | providers.ts | 8-10 |
| **ProviderOptions interface** | providers.ts | 35-50 |
| **GlobalProviderConfig interface** | providers.ts | 353-364 |
| **Existing tests** | provider-config.test.ts | 1-230 |

### Implementation Checklist

- [ ] Add `ProviderOptions` to type imports (line 52)
- [ ] (Optional) Define `ResolvedProviderConfig` interface
- [ ] Implement `resolveProviderConfig()` function
- [ ] Add JSDoc documentation
- [ ] Write unit tests
- [ ] Run TypeScript compilation
- [ ] Run test suite
- [ ] Verify module exports

### Success Command

```bash
# One command to verify implementation success
npm test -- src/__tests__/unit/utils/provider-config.test.ts && echo "✅ resolveProviderConfig() implementation verified"
```

---

## Research Notes Storage

Store additional research findings in the research/ subdirectory:

```bash
plan/003_dd63ad365ffb/P1M2T1S4/
├── PRP.md                          # This file
└── research/
    ├── object-spread-research.md    # MDN/TypeScript spread syntax documentation
    ├── cascade-patterns-research.md # Framework cascade pattern research
    └── codebase-analysis.md         # Existing codebase patterns analysis
```

---

**End of PRP**
