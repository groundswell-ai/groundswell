# PRP: Test Configuration Cascade Logic

---

## Goal

**Feature Goal**: Verify comprehensive test coverage for the `resolveProviderConfig()` configuration cascade utility to ensure correct provider resolution and options merging across all priority levels (global → agent → prompt).

**Deliverable**: Verified (and if needed, enhanced) unit tests in `src/__tests__/unit/utils/provider-config.test.ts` covering all cascade scenarios specified in contract P5.M1.T1.S2.

**Success Definition**:
- All test cases pass when run with `npm test -- src/__tests__/unit/utils/provider-config.test.ts`
- Test coverage includes all contract-specified scenarios:
  - Global default only
  - Agent override
  - Prompt override (highest priority)
  - Options merge (prompt overrides agent overrides global)
- Tests follow established Vitest patterns used in the codebase
- Configuration cascade behavior is thoroughly validated

## User Persona (if applicable)

**Target User**: Developer implementing the multi-provider system, requiring confidence that the configuration cascade correctly resolves providers and merges options at all priority levels.

**Use Case**: When agents are created with provider configurations and prompts include provider overrides, developers need to ensure the correct provider is selected and options are properly merged from all configuration sources.

**User Journey**:
1. Developer configures global providers with `configureProviders()`
2. Developer creates an Agent with provider-level overrides
3. Developer calls `agent.prompt()` with prompt-level provider overrides
4. `resolveProviderConfig()` combines all three levels correctly
5. Tests verify the cascade priority and merge behavior

**Pain Points Addressed**:
- Unclear priority order when multiple config sources exist
- Unclear options merge behavior when same key exists at multiple levels
- Potential for incorrect provider selection in cascade scenarios

## Why

- **Foundation for Provider System**: `resolveProviderConfig()` is the core utility that implements PRD 7.7 configuration cascade, used by both `Agent.prompt()` and `Agent.stream()`
- **Correct Provider Selection**: Ensures the right provider is chosen when global, agent, and prompt configs conflict
- **Correct Options Merging**: Ensures options are combined properly with correct priority (prompt > agent > global)
- **Contract Compliance**: Fulfills the testing requirements for P5.M1.T1.S2 in the PRD
- **Regression Prevention**: Comprehensive tests prevent breaking changes to this critical utility

## What

Verify and potentially enhance test coverage for the `resolveProviderConfig()` function covering:

1. **Global Default Only**: When no agent or prompt overrides are provided
2. **Agent Override**: Agent-level provider and options override global defaults
3. **Prompt Override**: Prompt-level provider and options override agent and global (highest priority)
4. **Options Merge**: Proper merging of options across all three levels with correct priority

### Success Criteria

- [ ] All existing tests pass: `npm test -- src/__tests__/unit/utils/provider-config.test.ts`
- [ ] Contract-specified scenarios are tested:
  - [ ] Global default only
  - [ ] Agent override
  - [ ] Prompt override (highest priority)
  - [ ] Options merge (prompt overrides agent overrides global)
- [ ] Tests follow established patterns from existing test files
- [ ] Configuration cascade priority is validated
- [ ] Options immutability is verified

## All Needed Context

### Context Completeness Check

✅ **"No Prior Knowledge" test passed**: This PRP provides complete file paths, exact function signatures, existing test patterns, validation commands, and all necessary type definitions. An implementer unfamiliar with the codebase can successfully verify these tests using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Core implementation and types
- file: src/utils/provider-config.ts
  why: Contains the resolveProviderConfig() function implementation with complete JSDoc documentation
  pattern: Configuration cascade logic with nullish coalescing and object spread merging
  critical: lines 338-363 contain the complete resolveProviderConfig implementation
  gotcha: The function uses the RESOLVED provider to look up global defaults, not the global default provider

- file: src/__tests__/unit/utils/provider-config.test.ts
  why: Contains existing tests for resolveProviderConfig() (lines 241-557)
  pattern: describe/it/expect structure, helper function for creating configs, comprehensive test coverage
  gotcha: Tests may already be complete - this is primarily a VERIFICATION task
  critical: lines 241-557 contain all existing resolveProviderConfig tests

- file: src/types/providers.ts
  why: Contains GlobalProviderConfig, ProviderOptions, and ProviderId type definitions
  pattern: Union type for ProviderId (lines 9-11), interface structures (lines 36-51, 357-368)
  critical: GlobalProviderConfig has defaultProvider and optional providerDefaults per provider

- file: vitest.config.ts
  why: Contains Vitest configuration including test file patterns and globals setting
  pattern: Test files are located in src/__tests__/**/*.test.ts, globals enabled
  gotcha: Vitest globals are enabled, no need to import describe/it/expect

# EXTERNAL DOCUMENTATION
- url: https://vitest.dev/api/expect.html#toequal
  why: Documentation for expect().toEqual() used for options object comparison
  critical: toEqual() performs deep equality check on object properties

- url: https://vitest.dev/api/expect.html#tohaveproperty
  why: Documentation for expect().toHaveProperty() used for structure validation
  critical: Used to verify returned object has expected properties

# RELATED TEST PATTERNS
- file: src/__tests__/unit/utils/model-spec.test.ts
  why: Similar utility function test patterns for validation and edge case coverage
  pattern: Error testing, edge case coverage, type safety verification

- file: src/__tests__/unit/agent-prompt-provider-override.test.ts
  why: Example of provider cascade testing at integration level
  pattern: Provider override testing, mock usage patterns
```

### Current Codebase tree

```bash
src/
├── __tests__/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── provider-config.test.ts      # ← Target file (lines 241-557 for resolveProviderConfig)
│   │   │   ├── model-spec.test.ts           # ← Reference for utility test patterns
│   │   │   └── workflow-error-utils.test.ts
│   │   ├── agent-prompt-provider-override.test.ts
│   │   └── ...
│   ├── integration/
│   └── ...
├── types/
│   ├── providers.ts                          # ← GlobalProviderConfig, ProviderOptions, ProviderId
│   └── ...
└── utils/
    └── provider-config.ts                    # ← resolveProviderConfig() implementation (lines 338-363)
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# Note: Tests already exist at src/__tests__/unit/utils/provider-config.test.ts
# This is primarily a VERIFICATION task

src/__tests__/unit/utils/provider-config.test.ts  # VERIFY or ENHANCE
  Responsibility: Unit tests for provider configuration utilities
  Contains:
    - configureProviders() tests (lines 19-141)
    - getGlobalProviderConfig() tests (lines 143-235)
    - resolveProviderConfig() tests (lines 241-557) ← Focus area

  Verify sections include:
    - Provider resolution priority (global → agent → prompt)
    - Options merge behavior with correct priority
    - Immutability guarantees
    - Type safety
    - Edge cases
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Vitest globals are enabled in vitest.config.ts
// No need to import describe, it, expect - they are available globally

// CRITICAL: Test files use .js extension in imports due to TypeScript module resolution
// Import pattern: import { resolveProviderConfig } from '../../../utils/provider-config.js';

// CRITICAL: resolveProviderConfig() uses the RESOLVED provider to look up global defaults
// If prompt switches to anthropic, it uses anthropic's global defaults, NOT the global default provider's defaults
// Example: global default is opencode, prompt switches to anthropic → uses anthropic's global defaults

// CRITICAL: Provider resolution uses nullish coalescing (??), not logical OR (||)
// promptProvider ?? agentProvider ?? globalConfig.defaultProvider
// This means only null/undefined are treated as missing, not falsy values

// CRITICAL: Options merge uses object spread with "last write wins"
// { ...globalDefaults, ...agentOptions, ...promptOptions }
// Same key in multiple levels = last one wins (prompt has highest priority)

// CRITICAL: The function creates NEW objects and does NOT mutate inputs
// This is important for tests that verify immutability

// CRITICAL: Existing tests use a helper function createGlobalConfig()
// Follow this pattern for consistency:
// const createGlobalConfig = (defaultProvider, providerDefaults) => ({ defaultProvider, providerDefaults });

// CRITICAL: Test structure uses nested describe blocks by feature area
// describe('resolveProviderConfig', () => {
//   describe('provider resolution', () => { ... });
//   describe('options merge', () => { ... });
// });

// CRITICAL: Use expect().toEqual() for object comparison
// toStrictEqual() is NOT used in existing tests for provider-config

// CRITICAL: Agent options are applied regardless of provider switch
// If agent configures opencode options but prompt switches to anthropic, opencode options are still applied
```

## Implementation Blueprint

### Data models and structure

```typescript
// GlobalProviderConfig interface from src/types/providers.ts (lines 357-368)
export interface GlobalProviderConfig {
  /** Default provider to use when none specified */
  defaultProvider: ProviderId;

  /** Per-provider default options (optional) */
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}

// ProviderOptions interface from src/types/providers.ts (lines 36-51)
export interface ProviderOptions {
  /** API endpoint override */
  endpoint?: string;

  /** API key (if not from environment) */
  apiKey?: string;

  /** Session ID for session-based providers */
  sessionId?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Custom headers */
  headers?: Record<string, string>;
}

// ProviderId type from src/types/providers.ts (lines 9-11)
export type ProviderId =
  | 'anthropic'
  | 'opencode';

// resolveProviderConfig function signature from src/utils/provider-config.ts (lines 338-344)
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY existing test file exists
  - CHECK: src/__tests__/unit/utils/provider-config.test.ts exists (it does - lines 241-557)
  - VERIFY: Tests are for resolveProviderConfig function
  - CONFIRM: Import statements are correct with .js extensions
  - CONFIRM: Type imports are present

Task 2: VERIFY provider resolution tests (lines 252-286)
  - CHECK: "should use global default when no overrides provided"
  - CHECK: "should use agent provider when provided"
  - CHECK: "should use prompt provider over agent provider"
  - CHECK: Tests demonstrate correct priority: prompt > agent > global
  - VERIFY: Both 'anthropic' and 'opencode' providers are tested

Task 3: VERIFY options merge tests (lines 288-377)
  - CHECK: "should use only global defaults when no overrides"
  - CHECK: "should merge agent options with global defaults"
  - CHECK: "should merge prompt options with agent and global defaults"
  - CHECK: "should allow prompt options to override agent options"
  - VERIFY: Merge priority is prompt > agent > global
  - VERIFY: Preserved properties from lower priority levels are included

Task 4: VERIFY cascade integration tests (lines 379-458)
  - CHECK: "should handle full cascade with all levels"
  - CHECK: "should use provider-specific global defaults"
  - CHECK: "should merge across provider switches"
  - VERIFY: Correct behavior when prompt switches provider
  - VERIFY: Agent options are applied regardless of provider switch

Task 5: VERIFY immutability tests (lines 460-487)
  - CHECK: "should not mutate input objects"
  - CHECK: "should create new options object"
  - VERIFY: Input objects are unchanged after function call
  - VERIFY: New object references are created

Task 6: VERIFY type safety tests (lines 489-520)
  - CHECK: "should return correct structure"
  - CHECK: "should return valid ProviderId"
  - CHECK: "should return valid ProviderOptions structure"
  - VERIFY: Return type matches function signature

Task 7: VERIFY edge case tests (lines 522-556)
  - CHECK: "should handle all undefined parameters"
  - CHECK: "should handle global with undefined providerDefaults"
  - CHECK: "should handle empty options objects"
  - VERIFY: Edge cases are covered

Task 8: RUN tests and verify all pass
  - EXECUTE: npm test -- src/__tests__/unit/utils/provider-config.test.ts
  - VERIFY: All tests pass
  - VERIFY: No test failures or errors

Task 9: COMPARE against contract requirements
  - CHECK: Global default only scenario is tested
  - CHECK: Agent override scenario is tested
  - CHECK: Prompt override (highest priority) scenario is tested
  - CHECK: Options merge (prompt > agent > global) is tested
  - ADD: Any missing test cases if gaps are found

Task 10: DOCUMENT findings
  - NOTE: Any discrepancies between contract and actual implementation
  - NOTE: Any missing test scenarios
  - NOTE: Any recommendations for additional tests
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Helper function for creating test configs (line 243)
const createGlobalConfig = (
  defaultProvider: ProviderId = 'anthropic',
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>
): GlobalProviderConfig => ({
  defaultProvider,
  providerDefaults
});

// PATTERN 2: Test structure with nested describe blocks
describe('resolveProviderConfig', () => {
  describe('provider resolution', () => {
    it('should use global default when no overrides provided', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);
      expect(result.provider).toBe('anthropic');
    });
  });

  describe('options merge', () => {
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
  });
});

// PATTERN 3: Testing cascade with all three levels
it('should handle full cascade with all levels', () => {
  const global = createGlobalConfig('anthropic', {
    anthropic: { timeout: 30000, apiKey: 'sk-global' },
    opencode: { endpoint: 'http://localhost:8080' }
  });

  const result = resolveProviderConfig(
    global,                    // Global: anthropic + defaults for both
    'opencode',                // Agent: use opencode
    { timeout: 10000 },        // Agent: override timeout
    'anthropic',               // Prompt: switch back to anthropic
    { apiKey: 'sk-prompt' }    // Prompt: override apiKey
  );

  expect(result.provider).toBe('anthropic'); // Prompt wins
  expect(result.options).toEqual({
    timeout: 10000,                      // Agent override preserved
    endpoint: undefined,                 // Not in anthropic defaults
    apiKey: 'sk-prompt'                  // Prompt override
  });
});

// PATTERN 4: Testing immutability
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

// GOTCHA: When prompt switches provider, agent options are still applied
// This is because agent options are not provider-specific in the current design
// If agent configures opencode options but prompt switches to anthropic, opencode options are merged
```

### Integration Points

```yaml
NO EXTERNAL INTEGRATIONS:
  - resolveProviderConfig is a pure utility function with no external dependencies
  - Tests are self-contained unit tests with no mocks required

TEST RUNNER:
  - framework: Vitest (configured in vitest.config.ts)
  - command: npm test -- src/__tests__/unit/utils/provider-config.test.ts
  - watch mode: npm run test:watch

RELATED MODULELES:
  - configureProviders(): Sets up global configuration
  - getGlobalProviderConfig(): Retrieves global configuration
  - Agent class: Uses resolveProviderConfig in prompt() and stream() methods
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript type checking
npm run lint

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.

# Run tests in watch mode for immediate feedback
npm run test:watch src/__tests__/unit/utils/provider-config.test.ts

# Expected: All tests pass. Watch mode will re-run on file changes.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run specific test file
npm test -- src/__tests__/unit/utils/provider-config.test.ts

# Run with verbose output
npm test -- src/__tests__/unit/utils/provider-config.test.ts --reporter=verbose

# Expected output:
# Test Files  1 passed (1)
# Tests  23+ passed (all resolveProviderConfig tests)
# Duration  < 1s

# Run all utils tests to ensure no regressions
npm test -- src/__tests__/unit/utils/

# Expected: All utils tests pass (configureProviders, getGlobalProviderConfig, resolveProviderConfig)
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite to ensure no regressions
npm test

# Expected: All tests pass, no failures in other test files

# Verify related provider tests still pass
npm test -- src/__tests__/unit/agent-prompt-provider-override.test.ts

# Expected: Related provider tests pass, confirming cascade works in integration context

# Verify provider registry tests pass
npm test -- src/__tests__/unit/providers/provider-registry.test.ts

# Expected: Registry tests pass, confirming provider system integration
```

### Level 4: Manual Verification (Optional)

```bash
# Verify test coverage manually by reviewing src/utils/provider-config.ts
# Check that each code path has a corresponding test:

# Line 347: Provider resolution (prompt ?? agent ?? global)
#   → Tests: "should use global default", "should use agent provider", "should use prompt provider"

# Line 351: Global defaults lookup for resolved provider
#   → Tests: "should use provider-specific global defaults", "should merge across provider switches"

# Lines 355-359: Options merge (global → agent → prompt)
#   → Tests: "should merge agent options with global", "should allow prompt to override agent"

# Line 362: Return resolved configuration
#   → Tests: "should return correct structure", type safety tests
```

## Final Validation Checklist

### Technical Validation

- [ ] All test cases pass: `npm test -- src/__tests__/unit/utils/provider-config.test.ts`
- [ ] No type errors: `npm run lint`
- [ ] Test file follows established patterns from existing test files
- [ ] Used `expect().toEqual()` for object comparison
- [ ] Helper function `createGlobalConfig()` is used consistently

### Feature Validation (Contract P5.M1.T1.S2)

- [ ] Global default only tested
- [ ] Agent override tested
- [ ] Prompt override (highest priority) tested
- [ ] Options merge (prompt overrides agent overrides global) tested
- [ ] Configuration cascade priority validated
- [ ] Provider switching across cascade levels tested

### Code Quality Validation

- [ ] Tests follow describe/it/expect Vitest pattern
- [ ] Test names are descriptive and follow "should..." pattern
- [ ] No shared state between tests (each test is independent)
- [ ] File location matches codebase convention (src/__tests__/unit/utils/)
- [ ] Import paths use .js extension (TypeScript ESM requirement)

### Contract Compliance

- [ ] All contract-specified test scenarios exist
- [ ] Tests verify correct priority order (prompt > agent > global)
- [ ] Tests verify options merge behavior
- [ ] Tests verify immutability guarantees
- [ ] Tests cover edge cases (undefined values, empty objects)

### Documentation

- [ ] Any discrepancies between contract and implementation noted
- [ ] Any missing test scenarios documented
- [ ] Test coverage assessment complete

---

## Anti-Patterns to Avoid

- ❌ Don't use `toStrictEqual()` - existing tests use `toEqual()` for provider-config
- ❌ Don't import describe/it/expect - Vitest globals are enabled
- ❌ Don't forget the `.js` extension in import paths - TypeScript requires it
- ❌ Don't modify the implementation - this is a VERIFICATION task, not implementation
- ❌ Don't skip verifying existing tests - they may be incomplete or have bugs
- ❌ Don't assume tests are correct - verify they match contract requirements
- ❌ Don't create new test patterns - follow existing patterns from provider-config.test.ts
- ❌ Don't forget to verify provider-specific defaults behavior - use resolved provider, not global default
- ❌ Don't miss the "provider switch" scenario - what happens when prompt switches to different provider
- ❌ Don't forget immutability tests - verify inputs are not mutated

## Additional Notes

### Existing Tests Notice

Comprehensive tests for `resolveProviderConfig()` already exist in `src/__tests__/unit/utils/provider-config.test.ts` (lines 241-557). This PRP is primarily a **verification task**:

1. **Verify existing tests pass**: Run `npm test -- src/__tests__/unit/utils/provider-config.test.ts`
2. **Compare against contract requirements**: Ensure all contract-specified test cases exist
3. **Add missing tests if needed**: Focus on any gaps between existing tests and contract requirements

### Contract vs. Reality Discrepancy

The contract definition specifies `/tests/providers/provider-config.test.ts` but the actual codebase uses `src/__tests__/unit/utils/` for utility tests. This PRP uses the actual codebase convention (`src/__tests__/unit/utils/provider-config.test.ts`) rather than the contract's path.

### Test Coverage Summary

Existing tests cover:
- ✅ Provider resolution (5 tests)
- ✅ Options merge (6 tests)
- ✅ Cascade integration (3 tests)
- ✅ Immutability (2 tests)
- ✅ Type safety (3 tests)
- ✅ Edge cases (3 tests)

**Total: 22+ test cases** covering all contract-specified scenarios.

### Vitest Reference

- **Official Docs**: https://vitest.dev/
- **API Reference**: https://vitest.dev/api/
- **Expect API**: https://vitest.dev/api/expect.html

---

## Confidence Score

**9/10** - One-pass verification success likelihood is very high.

**Rationale**:
- Complete implementation details with exact file paths and line numbers
- Existing tests provide clear reference for expected patterns
- Comprehensive test coverage already exists (22+ test cases)
- All validation commands verified to work in this codebase
- Clear guidance on contract discrepancies
- Complete type definitions provided

**Risk factor**: The existing tests may have bugs or may not match contract requirements exactly, requiring careful verification rather than just running the tests.

**Primary Task**: This is primarily a **verification task** - confirm existing tests match contract requirements and pass, rather than implementing new tests from scratch.
