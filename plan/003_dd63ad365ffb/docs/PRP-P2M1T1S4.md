---

name: "PRP: Implement AnthropicProvider.normalizeModel() Method"
description: |

---

## Goal

**Feature Goal**: Complete the `normalizeModel()` method implementation in `AnthropicProvider` class to convert model strings into `ModelSpec` objects with provider validation.

**Deliverable**: A fully functional `normalizeModel()` method that:
1. Delegates to the existing `parseModelSpec()` utility function
2. Validates the provider is 'anthropic'
3. Returns a properly formatted `ModelSpec` object
4. Includes comprehensive unit tests

**Success Definition**:
- All unit tests pass (Vitest)
- Method correctly handles both plain (`claude-sonnet-4`) and qualified (`anthropic/claude-opus-4`) formats
- Provider validation throws descriptive errors for non-anthropic providers
- TypeScript type checking passes with no errors
- Linting passes with no warnings

## User Persona

**Target User**: Internal - The `normalizeModel()` method is used by the Provider system and Agent execution layer, not directly by end users.

**Use Case**: When an Agent is configured with a model string (either plain or qualified format), the AnthropicProvider needs to normalize it to a `ModelSpec` for internal use.

**User Journey**:
1. Agent receives model configuration (e.g., `model: 'claude-sonnet-4'`)
2. Agent calls `provider.normalizeModel(model)`
3. Provider returns `ModelSpec` with normalized format
4. Agent uses ModelSpec for SDK execution

**Pain Points Addressed**:
- Inconsistent model string formats across configuration sources
- Need for provider-specific model validation
- Type-safe model specification for TypeScript

## Why

- **Interface Contract**: The `Provider` interface (src/types/providers.ts:580-599) requires all providers to implement `normalizeModel()`
- **Model Normalization**: Converts user-provided model strings into structured `ModelSpec` objects
- **Provider Validation**: Ensures model strings are compatible with the Anthropic provider
- **Foundation for Execution**: This method is called before `execute()` to prepare model specifications
- **Consistency**: Matches the pattern used by other providers in the multi-provider architecture

## What

Implement the `normalizeModel(model: string): ModelSpec` method in the `AnthropicProvider` class per PRD Section 7.8.

### Method Contract

**Input**: `model: string` - A model identifier in either:
- Plain format: `"claude-sonnet-4"` (no provider prefix)
- Qualified format: `"anthropic/claude-opus-4"` (explicit provider prefix)

**Logic**:
1. Call `parseModelSpec(model, 'anthropic')` to parse the model string
2. Validate that the resulting `spec.provider` is `'anthropic'`
3. Return the `ModelSpec` object

**Output**: `ModelSpec` object with:
- `provider`: Always `'anthropic'` for this provider
- `model`: The model name (without provider prefix)
- `raw`: The original input string

### Success Criteria

- [ ] Method delegates to `parseModelSpec()` utility from `src/utils/model-spec.js`
- [ ] Plain format returns `provider='anthropic'` with original model name
- [ ] Qualified format with `'anthropic/'` prefix returns parsed spec
- [ ] Qualified format with other provider (e.g., `'opencode/gpt-4'`) throws descriptive error
- [ ] Error messages follow existing codebase patterns
- [ ] JSDoc updated to reflect full implementation
- [ ] Unit tests cover all scenarios (plain, qualified, error cases)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: Yes. This PRP includes:
- Exact file paths and line numbers to reference
- Complete function signatures
- Specific code patterns to follow
- Test framework and patterns used
- Error message formats to match

### Documentation & References

```yaml
# MUST READ - Implementation Context
- file: src/providers/anthropic-provider.ts
  why: Contains the current stub implementation at lines 221-228
  pattern: Look at initialize() (lines 106-142) and terminate() (lines 153-168) for method patterns
  gotcha: The normalizeModel() stub currently returns a hard-coded ModelSpec without delegation

- file: src/utils/model-spec.ts
  why: Contains parseModelSpec() function (lines 104-168) that this method must delegate to
  pattern: Import pattern: import { parseModelSpec } from '../utils/model-spec.js';
  critical: parseModelSpec() handles all parsing logic, validation, and error throwing

- file: src/types/providers.ts
  why: Contains ModelSpec interface (lines 150-157) and Provider.normalizeModel() contract (lines 580-599)
  pattern: Type import: import type { ModelSpec, ProviderId } from '../types/providers.js';

- file: src/__tests__/unit/providers/anthropic-provider.test.ts
  why: Contains existing test patterns for AnthropicProvider
  pattern: Use describe() blocks with 'should' statements for it() naming
  gotcha: Tests use Vitest with globals enabled (no import needed for describe/it/expect)

- file: src/__tests__/unit/utils/model-spec.test.ts
  why: Shows comprehensive test patterns for parseModelSpec() which this method wraps
  pattern: Test both happy path and error cases with expect().toThrow() for errors

- docfile: plan/003_dd63ad365ffb/P2M1T1S4/research/codebase-patterns.md
  why: Summary of existing codebase patterns for validation, error messages, and tests
  section: Validation Patterns, Test Patterns

- docfile: plan/003_dd63ad365ffb/P2M1T1S4/research/external-patterns.md
  why: Best practices from LangChain, Vercel AI SDK for model normalization
  section: Best Practices Identified, Common Pitfalls
```

### Current Codebase Tree (Relevant Sections)

```bash
src/
├── providers/
│   ├── anthropic-provider.ts    # TARGET FILE - Modify normalizeModel() at lines 221-228
│   ├── provider-registry.ts     # Reference for provider patterns
│   └── index.ts                 # Export patterns
├── utils/
│   ├── model-spec.ts            # REFERENCE - parseModelSpec() implementation
│   └── provider-config.ts       # Reference for validation patterns
├── types/
│   ├── providers.ts             # REFERENCE - ModelSpec interface, Provider interface
│   └── index.ts
└── __tests__/
    └── unit/
        ├── providers/
        │   ├── anthropic-provider.test.ts           # Reference test patterns
        │   ├── anthropic-provider-initialize.test.ts # Reference async method tests
        │   └── anthropic-provider-terminate.test.ts # Reference idempotent pattern tests
        └── utils/
            └── model-spec.test.ts  # Reference parseModelSpec() test patterns
```

### Desired Codebase Tree (No New Files - Modification Only)

```bash
# No new files needed - this PRP modifies existing files only:
#
# 1. MODIFY src/providers/anthropic-provider.ts
#    - Update normalizeModel() method at lines 221-228
#    - Add import for parseModelSpec
#
# 2. CREATE src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
#    - New test file for normalizeModel() method
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: parseModelSpec() throws on invalid input - don't catch, let it propagate
// parseModelSpec() handles:
//   - Empty/whitespace input
//   - Invalid provider names
//   - Empty provider or model parts
//   - Provider validation against 'anthropic' | 'opencode' union type
// DO NOT duplicate this validation in normalizeModel()

// CRITICAL: Import paths must use .js extension for ES modules
// WRONG: import { parseModelSpec } from '../utils/model-spec';
// RIGHT: import { parseModelSpec } from '../utils/model-spec.js';

// CRITICAL: Type imports use 'import type' for pure TypeScript types
// WRONG: import { ModelSpec } from '../types/providers.js';
// RIGHT: import type { ModelSpec } from '../types/providers.js';

// GOTCHA: Vitest globals are enabled - no need to import describe/it/expect
// Tests can use these directly without imports

// GOTCHA: Error message pattern in this codebase includes the invalid value
// Example: throw new Error(`Invalid provider: "${provider}". Supported providers: "anthropic", "opencode"`);
// Follow this pattern for consistency

// GOTCHA: Provider validation should happen AFTER parseModelSpec()
// parseModelSpec() already validates provider against the union type
// normalizeModel() only needs to check if provider matches this.id

// GOTCHA: The 'raw' field in ModelSpec must preserve the ORIGINAL input
// parseModelSpec() handles this correctly - don't modify the raw field
```

---

## Implementation Blueprint

### Data Models and Structure

This PRP modifies existing types only - no new data models needed.

**Existing Types Used**:
- `ModelSpec` (src/types/providers.ts:150-157): `{ provider: ProviderId, model: string, raw: string }`
- `ProviderId` (src/types/providers.ts:8-10): `'anthropic' | 'opencode'`

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/providers/anthropic-provider.ts - Import parseModelSpec
  - ADD: Import statement for parseModelSpec utility
  - LOCATION: Top of file, after existing imports (around line 49)
  - CODE: import { parseModelSpec } from '../utils/model-spec.js';
  - NAMING: Follow existing import pattern (see line 48: import type { Tool, MCPServer, Skill })
  - PLACEMENT: Separate type imports and value imports
  - GOTCHA: Use .js extension for ES module imports

Task 2: MODIFY src/providers/anthropic-provider.ts - Implement normalizeModel()
  - REPLACE: Lines 221-228 (current stub implementation)
  - IMPLEMENT: Full normalizeModel() method with delegation and validation
  - LOCATION: src/providers/anthropic-provider.ts, lines 221-228
  - CODE STRUCTURE:
    ```typescript
    normalizeModel(model: string): ModelSpec {
      // Delegate to existing utility function
      const spec = parseModelSpec(model, 'anthropic');

      // Provider-specific validation
      if (spec.provider !== 'anthropic') {
        throw new Error(
          `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider. ` +
          `Use ProviderRegistry.get('${spec.provider}') instead.`
        );
      }

      return spec;
    }
    ```
  - PATTERN: Follow error throwing pattern from src/providers/provider-registry.ts:196
  - PATTERN: Use template literals for error messages (see src/utils/model-spec.ts:146-149)
  - VALIDATION: Check spec.provider against this.id ('anthropic')
  - RETURN: Return the ModelSpec from parseModelSpec() (don't create new object)
  - DEPENDENCIES: Requires Task 1 (import statement)

Task 3: MODIFY src/providers/anthropic-provider.ts - Update JSDoc
  - UPDATE: JSDoc comment above normalizeModel() method (lines 214-220)
  - REMOVE: "@remarks Full implementation in P2.M1.T1.S4" (implementation complete)
  - ADD: Detailed implementation documentation
  - CODE STRUCTURE:
    ```typescript
    /**
     * Normalize a model string to a ModelSpec
     *
     * Parses model strings in two formats:
     * - Plain: "claude-sonnet-4" → { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
     * - Qualified: "anthropic/claude-opus-4" → { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }
     *
     * Delegates to {@link parseModelSpec} for parsing and validation.
     * Validates that the provider is 'anthropic'.
     *
     * @param model - Model string to normalize
     * @returns Parsed ModelSpec with provider='anthropic'
     * @throws {Error} When model specification is invalid (delegated to parseModelSpec)
     * @throws {Error} When provider is not 'anthropic'
     *
     * @example
     * ```ts
     * const provider = new AnthropicProvider();
     *
     * // Plain format
     * provider.normalizeModel('claude-sonnet-4');
     * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
     *
     * // Qualified format
     * provider.normalizeModel('anthropic/claude-opus-4');
     * // Returns: { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }
     *
     * // Error: wrong provider
     * provider.normalizeModel('opencode/gpt-4');
     * // Throws: "Cannot normalize opencode/gpt-4 with AnthropicProvider..."
     * ```
     */
    ```
  - PATTERN: Follow JSDoc style from initialize() method (lines 97-105)
  - PATTERN: Use {@link} for cross-references to other functions
  - DEPENDENCIES: Requires Task 2 (implementation)

Task 4: CREATE src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
  - CREATE: New test file for normalizeModel() method
  - LOCATION: src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
  - IMPLEMENT: Comprehensive unit tests for all scenarios
  - CODE STRUCTURE:
    ```typescript
    /**
     * Unit tests for AnthropicProvider.normalizeModel()
     */

    import { describe, it, expect } from 'vitest';
    import { AnthropicProvider } from '../../../providers/anthropic-provider.js';
    import type { ModelSpec } from '../../../types/providers.js';

    describe('AnthropicProvider.normalizeModel()', () => {
      let provider: AnthropicProvider;

      // Setup: Create provider instance before each test
      beforeEach(() => {
        provider = new AnthropicProvider();
      });

      describe('plain format (model without provider prefix)', () => {
        it('should normalize plain model string with default provider', () => {
          const result = provider.normalizeModel('claude-sonnet-4');

          expect(result).toEqual({
            provider: 'anthropic',
            model: 'claude-sonnet-4',
            raw: 'claude-sonnet-4',
          } as ModelSpec);
        });

        it('should handle claude-opus-4 model name', () => {
          const result = provider.normalizeModel('claude-opus-4');

          expect(result.provider).toBe('anthropic');
          expect(result.model).toBe('claude-opus-4');
          expect(result.raw).toBe('claude-opus-4');
        });

        it('should handle claude-haiku-4 model name', () => {
          const result = provider.normalizeModel('claude-haiku-4');

          expect(result.provider).toBe('anthropic');
          expect(result.model).toBe('claude-haiku-4');
        });

        it('should preserve original input in raw field (whitespace)', () => {
          const result = provider.normalizeModel('  claude-sonnet-4  ');

          expect(result.raw).toBe('  claude-sonnet-4  ');
          expect(result.model).toBe('claude-sonnet-4'); // trimmed
        });
      });

      describe('qualified format (provider/model prefix)', () => {
        it('should normalize anthropic/claude-sonnet-4', () => {
          const result = provider.normalizeModel('anthropic/claude-sonnet-4');

          expect(result).toEqual({
            provider: 'anthropic',
            model: 'claude-sonnet-4',
            raw: 'anthropic/claude-sonnet-4',
          } as ModelSpec);
        });

        it('should normalize anthropic/claude-opus-4', () => {
          const result = provider.normalizeModel('anthropic/claude-opus-4');

          expect(result.provider).toBe('anthropic');
          expect(result.model).toBe('claude-opus-4');
          expect(result.raw).toBe('anthropic/claude-opus-4');
        });

        it('should handle qualified format with date suffix', () => {
          const result = provider.normalizeModel('anthropic/claude-sonnet-4-20250514');

          expect(result.provider).toBe('anthropic');
          expect(result.model).toBe('claude-sonnet-4-20250514');
        });

        it('should handle qualified format with whitespace', () => {
          const result = provider.normalizeModel('  anthropic/claude-sonnet-4  ');

          expect(result.raw).toBe('  anthropic/claude-sonnet-4  ');
          expect(result.provider).toBe('anthropic');
          expect(result.model).toBe('claude-sonnet-4');
        });
      });

      describe('provider validation', () => {
        it('should throw on opencode provider', () => {
          expect(() => provider.normalizeModel('opencode/gpt-4')).toThrow(
            /Cannot normalize opencode\/gpt-4 with AnthropicProvider/
          );
        });

        it('should throw with helpful error message for wrong provider', () => {
          try {
            provider.normalizeModel('opencode/gpt-4');
            expect.fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain('Cannot normalize');
            expect((error as Error).message).toContain('opencode/gpt-4');
            expect((error as Error).message).toContain('AnthropicProvider');
            expect((error as Error).message).toContain('ProviderRegistry');
          }
        });

        it('should suggest using correct provider registry', () => {
          expect(() => provider.normalizeModel('opencode/gpt-4')).toThrow(
            /ProviderRegistry\.get\('opencode'\)/
          );
        });
      });

      describe('error delegation to parseModelSpec', () => {
        it('should throw on empty string (delegated to parseModelSpec)', () => {
          expect(() => provider.normalizeModel('')).toThrow(/cannot be empty/i);
        });

        it('should throw on whitespace-only input', () => {
          expect(() => provider.normalizeModel('   ')).toThrow(/cannot be empty/i);
        });

        it('should throw on invalid provider (delegated to parseModelSpec)', () => {
          expect(() => provider.normalizeModel('invalid/model')).toThrow(/invalid provider/i);
        });

        it('should throw on empty provider part', () => {
          expect(() => provider.normalizeModel('/model')).toThrow(/provider cannot be empty/i);
        });

        it('should throw on empty model part', () => {
          expect(() => provider.normalizeModel('anthropic/')).toThrow(/model name cannot be empty/i);
        });
      });

      describe('edge cases', () => {
        it('should handle model names with special characters', () => {
          const result = provider.normalizeModel('claude-3.5-sonnet_20250514');

          expect(result.provider).toBe('anthropic');
          expect(result.model).toBe('claude-3.5-sonnet_20250514');
        });

        it('should handle model names with numbers', () => {
          const result = provider.normalizeModel('claude-sonnet-4-20250514');

          expect(result.model).toBe('claude-sonnet-4-20250514');
        });
      });

      describe('type safety', () => {
        it('should return ModelSpec with correct types', () => {
          const result = provider.normalizeModel('claude-sonnet-4');

          expect(result.provider).toBe('anthropic');
          expect(typeof result.model).toBe('string');
          expect(typeof result.raw).toBe('string');
        });
      });
    });
    ```
  - PATTERN: Follow test structure from anthropic-provider.test.ts (lines 1-191)
  - PATTERN: Use beforeEach() for provider instance creation
  - PATTERN: Group tests by describe() blocks for scenarios
  - PATTERN: Use expect().toEqual() for object comparison
  - PATTERN: Use expect().toThrow() for error testing
  - PATTERN: Use expect.fail() when testing error catch blocks
  - IMPORT: Use .js extension for imports
  - COVERAGE: All code paths (plain, qualified, errors, edge cases)
  - DEPENDENCIES: Requires Tasks 1-3 (implementation complete)

Task 5: VALIDATE - TypeScript Type Checking
  - RUN: npx tsc --noEmit
  - EXPECT: Zero type errors
  - CHECK: Import paths resolve correctly
  - CHECK: Type annotations match ModelSpec return type
  - DEPENDENCIES: Requires Tasks 1-4

Task 6: VALIDATE - Linting
  - RUN: npm run lint (or project-specific lint command)
  - EXPECT: Zero linting errors
  - CHECK: Code follows project style guide
  - DEPENDENCIES: Requires Tasks 1-4

Task 7: VALIDATE - Unit Tests
  - RUN: npm test -- anthropic-provider-normalizemodel
  - EXPECT: All tests pass
  - COVERAGE: 100% of normalizeModel() method
  - DEPENDENCIES: Requires Tasks 1-4
```

### Implementation Patterns & Key Details

```typescript
// ============ IMPORT PATTERN ============
// Separate type imports and value imports
import type { ModelSpec, ProviderId } from '../types/providers.js';
import { parseModelSpec } from '../utils/model-spec.js';

// ============ METHOD SIGNATURE ============
// Synchronous method (no async)
normalizeModel(model: string): ModelSpec {
  // Implementation
}

// ============ DELEGATION PATTERN ============
// Delegate to existing utility, don't reimplement parsing
const spec = parseModelSpec(model, 'anthropic');

// ============ PROVIDER VALIDATION PATTERN ============
// Check that provider matches this provider instance
if (spec.provider !== this.id) {
  throw new Error(
    `Cannot normalize ${spec.provider}/${spec.model} with ${this.constructor.name}. ` +
    `Use ProviderRegistry.get('${spec.provider}') instead.`
  );
}

// ============ ERROR MESSAGE PATTERN ============
// Follow existing codebase pattern:
// - Template literal with backticks
// - Include the invalid value in quotes
// - Be specific about what went wrong
// - Suggest corrective action
throw new Error(
  `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider. ` +
  `Use ProviderRegistry.get('${spec.provider}') instead.`
);

// ============ RETURN PATTERN ============
// Return the ModelSpec from parseModelSpec() directly
// DON'T create a new object - preserve all fields from parseModelSpec
return spec;

// ============ JSDOC PATTERN ============
/**
 * Brief one-line description.
 *
 * Detailed description with:
 * - Supported formats listed
 * - Behavior for each format
 * - Delegation noted
 * - Validation described
 *
 * @param paramName - Parameter description
 * @returns Return value description
 * @throws {Error} When error condition
 *
 * @example
 * ```ts
 * // Usage example
 * const result = provider.normalizeModel('claude-sonnet-4');
 * ```
 */
```

### Integration Points

```yaml
# No external integration points - this is a pure method with no side effects
#
# INTERNAL CALLERS:
#   - ProviderRegistry (may call during provider validation)
#   - Agent class (may call for model normalization before execution)
#   - Future provider configuration code
#
# DEPENDENCIES:
#   - parseModelSpec() from src/utils/model-spec.ts
#   - ModelSpec type from src/types/providers.ts
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript Type Checking
npx tsc --noEmit

# Expected: Zero type errors. If errors exist:
# - Check import paths use .js extension
# - Verify type annotations match ModelSpec
# - Ensure parseModelSpec is imported as value, not type

# Linting (if project uses ESLint)
npm run lint

# Expected: Zero linting errors. If errors exist:
# - Check for unused imports
# - Verify consistent quote style
# - Ensure proper spacing/indentation

# Format check (if project uses Prettier)
npm run format:check

# Expected: Zero formatting issues
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run normalizeModel() tests only
npm test -- anthropic-provider-normalizemodel

# Run with coverage
npm test -- --coverage anthropic-provider-normalizemodel

# Run all provider tests
npm test -- src/__tests__/unit/providers/

# Expected: All tests pass
# Test count: ~20 tests (see Task 4 for full test list)
#
# If tests fail:
# - Read error message carefully
# - Check implementation against Task 2 specification
# - Verify parseModelSpec() delegation is correct
# - Ensure provider validation logic matches spec

# Coverage validation (if coverage tools configured)
npm run test:coverage

# Expected: 100% coverage for normalizeModel() method
# - All branches tested (plain format, qualified format, validation)
# - All error paths tested
```

### Level 3: Integration Testing (System Validation)

```bash
# Test with ProviderRegistry (if integration exists)
npm test -- provider-registry

# Expected: Existing tests still pass
# No new integration tests needed - this is a pure method

# Manual TypeScript validation (if IDE available)
# 1. Open src/providers/anthropic-provider.ts
# 2. Hover over normalizeModel() method
# 3. Verify type signature shows: normalizeModel(model: string): ModelSpec
# 4. Check that ModelSpec tooltip shows correct type definition
```

### Level 4: Creative & Domain-Specific Validation

```bash
# No creative validation needed for this PRP
#
# This is a straightforward utility method with no:
# - External API calls
# - File system operations
# - Network requests
# - Database interactions
# - Performance requirements (beyond basic efficiency)
#
# The method is:
# - Synchronous
# - Pure (no side effects)
# - Deterministic (same input = same output)
# - Well-bounded (single responsibility)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All unit tests pass: `npm test -- anthropic-provider-normalizemodel`
- [ ] No linting errors: `npm run lint`
- [ ] Code follows existing patterns (matches initialize(), terminate() style)
- [ ] Import paths use .js extension for ES modules
- [ ] Type imports use `import type` syntax

### Feature Validation

- [ ] Plain format (`claude-sonnet-4`) returns correct ModelSpec
- [ ] Qualified format (`anthropic/claude-opus-4`) returns correct ModelSpec
- [ ] Whitespace handling preserves `raw` field
- [ ] Non-anthropic provider (`opencode/gpt-4`) throws descriptive error
- [ ] Empty/invalid input throws appropriate errors (delegated to parseModelSpec)
- [ ] Return type matches ModelSpec interface
- [ ] Provider is always 'anthropic' in returned ModelSpec

### Code Quality Validation

- [ ] Method delegates to parseModelSpec() (no reimplementation of parsing)
- [ ] Provider validation uses `this.id` for comparison (not hardcoded 'anthropic')
- [ ] Error messages follow codebase patterns (include invalid value, suggest fix)
- [ ] JSDoc is comprehensive with examples and @throws tags
- [ ] Tests cover all code paths (happy path, error cases, edge cases)
- [ ] Test file follows existing naming convention (anthropic-provider-normalizemodel.test.ts)

### Documentation & Deployment

- [ ] JSDoc updated to reflect full implementation (removed "in P2.M1.T1.S4" remark)
- [ ] JSDoc includes @example tags showing usage
- [ ] JSDoc cross-references parseModelSpec() with {@link}
- [ ] Code is self-documenting with clear variable names
- [ ] No commented-out debug code or console.logs remain

---

## Anti-Patterns to Avoid

- ❌ **Don't reimplement parseModelSpec() logic** - Delegate to existing utility
- ❌ **Don't hardcode 'anthropic'** - Use `this.id` for provider comparison
- ❌ **Don't catch and rethrow parseModelSpec() errors** - Let them propagate naturally
- ❌ **Don't create new ModelSpec object** - Return the one from parseModelSpec()
- ❌ **Don't modify the raw field** - parseModelSpec() handles this correctly
- ❌ **Don't add async/await** - This is a synchronous method
- ❌ **Don't skip provider validation** - Must verify provider matches this.id
- ❌ **Don't use generic error messages** - Include specific values in errors
- ❌ **Don't forget .js extension** - ES module imports require it
- ❌ **Don't mix type/value imports** - Use `import type` for types

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Validation Checklist**:
- [ ] All 4 validation levels completed successfully
- [ ] All unit tests pass (target: ~20 tests)
- [ ] Zero TypeScript errors
- [ ] Zero linting warnings
- [ ] Code review passes (follows existing patterns)

**Definition of Done**:
1. normalizeModel() method implemented per Tasks 1-3
2. Unit tests created and passing (Task 4)
3. TypeScript compilation succeeds (Task 5)
4. Linting passes (Task 6)
5. All tests pass with coverage (Task 7)

---

## Appendix: Quick Reference

### File Locations Summary

| File | Lines | Purpose |
|------|-------|---------|
| `src/providers/anthropic-provider.ts` | 221-228 | Target method implementation |
| `src/utils/model-spec.ts` | 104-168 | parseModelSpec() utility to delegate to |
| `src/types/providers.ts` | 150-157 | ModelSpec interface definition |
| `src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts` | NEW | Test file to create |

### Key Functions Reference

```typescript
// FUNCTION TO DELEGATE TO
// Location: src/utils/model-spec.ts:104-168
function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec

// FUNCTION TO IMPLEMENT
// Location: src/providers/anthropic-provider.ts:221-228
normalizeModel(model: string): ModelSpec
```

### Test Pattern Reference

```typescript
// Standard test structure (from existing tests)
describe('AnthropicProvider.normalizeModel()', () => {
  beforeEach(() => {
    provider = new AnthropicProvider();
  });

  describe('scenario group', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test-input';

      // Act
      const result = provider.normalizeModel(input);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

---

**End of PRP**
