# Product Requirement Prompt (PRP): Implement formatModelForProvider() Function

**Work Item:** P1.M1.T2.S2
**Title:** Implement formatModelForProvider() function
**Points:** 1
**Status:** Ready for Implementation

---

## Goal

**Feature Goal**: Implement the `formatModelForProvider()` utility function that formats a `ModelSpec` for a specific target provider, handling same-provider pass-through and throwing clear errors for cross-provider translation attempts (not yet supported).

**Deliverable**: A pure TypeScript utility function `formatModelForProvider()` in `src/utils/model-spec.ts` with comprehensive validation, clear error messages, JSDoc documentation, and unit tests.

**Success Definition**:
- `formatModelForProvider()` returns model name when `spec.provider === targetProvider`
- `formatModelForProvider()` throws descriptive error when providers differ
- Error messages include source provider, model, and target provider
- Function exported from `src/utils/index.ts`
- Unit tests cover pass-through and error cases
- TypeScript compilation passes with no errors
- Follows existing codebase patterns for validation functions

---

## User Persona

**Target User**: Groundswell core developers implementing the Provider interface and provider configuration utilities.

**Use Case**: Developers need to format model specifications for specific providers when:
1. Normalizing model specs for provider initialization
2. Validating model-provider compatibility
3. Preparing model strings for API requests
4. Handling model configuration across the provider system

**User Journey**:
1. Developer obtains a `ModelSpec` from `parseModelSpec()` or `Provider.normalizeModel()`
2. Developer calls `formatModelForProvider(spec, targetProvider)` to format for specific provider
3. Function returns model name if providers match, or throws error if different
4. Developer uses returned model string for provider API calls

**Pain Points Addressed**:
- **No model formatting utility** - before this, each provider would need custom formatting logic
- **Unclear cross-provider errors** - users get confusing errors when trying to use models across providers
- **Missing validation** - no single source of truth for model-provider compatibility checking
- **Type safety gaps** - no type-safe way to format models for specific providers

---

## Why

- **Model formatting foundation** - This function is required by PRD 7.8 and Decision 6 for formatting model specs
- **Provider interface support** - Used by `Provider.normalizeModel()` method (defined in P1.M1.T1.S3)
- **Configuration utilities** - Required for P1.M2 (Global Provider Configuration) and P1.M3 (Provider Registry)
- **Type safety** - Ensures model specifications are correctly formatted for target providers
- **Error handling** - Provides clear, actionable error messages for cross-provider translation attempts
- **Single source of truth** - Centralizes model formatting logic per Decision 6
- **Testability** - Pure function with deterministic behavior for comprehensive testing
- **Future extensibility** - Lays groundwork for future cross-provider model mapping

**From Decision 6 (plan/003_dd63ad365ffb/docs/architecture/decisions.md):**
> "How to parse and validate model specifications like `anthropic/claude-sonnet-4-20250514`?"
>
> **Decision:** Follow PRD specification with implementation provided.

---

## What

Implement `formatModelForProvider()` function per PRD 7.8 and Decision 6:

### Function Signature

```typescript
/**
 * Format a ModelSpec for a specific target provider
 *
 * @param spec - ModelSpec from parseModelSpec() or Provider.normalizeModel()
 * @param targetProvider - The provider to format the model for
 * @returns Formatted model string for target provider
 * @throws {Error} When providers differ (cross-provider translation not supported)
 */
export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string
```

### Supported Behavior

**1. Same Provider (Pass-Through)**:
- Input: `spec = { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: '...' }`, `targetProvider = 'anthropic'`
- Output: `"claude-3-5-sonnet"` (model name only)
- Use Case: Formatting model for the same provider it was specified for

**2. Different Providers (Error)**:
- Input: `spec = { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: '...' }`, `targetProvider = 'opencode'`
- Output: Throws `Error` with message: `"Cannot translate anthropic/claude-3-5-sonnet to opencode provider. Cross-provider model translation is not supported."`
- Use Case: Validates model-provider compatibility before API calls

### Validation Rules

1. **Same provider check**: Return `spec.model` when `spec.provider === targetProvider`
2. **Different provider check**: Throw error when providers differ
3. **Error message format**: Include source provider, model, and target provider in error
4. **No model translation**: Cross-provider translation is explicitly not supported in MVP

### Error Cases

| spec.provider | targetProvider | Error | Reason |
|---------------|----------------|-------|--------|
| `'anthropic'` | `'opencode'` | Cross-provider translation error | Translation not supported (MVP) |
| `'opencode'` | `'anthropic'` | Cross-provider translation error | Translation not supported (MVP) |

### Future Considerations (Out of Scope for MVP)

- Model mapping table for cross-provider translation (e.g., `claude-3-5-sonnet` → `gpt-4-turbo`)
- Capability-based model matching (tier-based translation)
- Alias support for model name variants

### Success Criteria

- [ ] Function defined in `src/utils/model-spec.ts`
- [ ] Same provider returns model name only
- [ ] Different providers throw descriptive error
- [ ] Error messages include source provider, model, and target provider
- [ ] Exported from `src/utils/index.ts`
- [ ] Comprehensive JSDoc documentation
- [ ] Unit tests for pass-through and error cases
- [ ] TypeScript compilation passes

---

## All Needed Context

### Context Completeness Check

**Question**: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

**Answer**: **YES** - This PRP provides:
- Complete function specification from Decision 6
- Exact file locations and patterns to follow
- ModelSpec and ProviderId type definitions
- Validation and error handling patterns from codebase
- Test framework and test patterns to follow
- Common gotchas specific to this codebase
- External research on model formatting best practices
- Implementation examples with edge cases

### Documentation & References

```yaml
# MUST READ - Decision 6 Implementation Specification
- file: plan/003_dd63ad365ffb/docs/architecture/decisions.md
  section: "## Decision 6: Model Specification Parsing"
  lines: h2.5 (heading 2.5)
  why: Complete implementation specification from architectural decision
  critical: Shows exact implementation approach with pass-through and error handling
  pattern: Check spec.provider === targetProvider, throw with descriptive message

# MUST READ - Type Definitions
- file: src/types/providers.ts
  lines: 8-10
  why: ProviderId union type definition ('anthropic' | 'opencode')
  pattern: Union type format for provider validation

- file: src/types/providers.ts
  lines: 150-157
  why: ModelSpec interface definition with provider, model, raw fields
  pattern: Input type structure for formatModelForProvider()

# MUST READ - Existing parseModelSpec Implementation (Dependency)
- file: src/utils/model-spec.ts
  lines: 1-169 (entire file)
  why: Reference for code style, patterns, JSDoc format, helper functions
  pattern: Function structure, type guard pattern, error message format

# MUST READ - Existing Codebase Patterns
- file: src/utils/model-spec.ts
  lines: 30-32, 39-41
  why: Helper function patterns (isValidProviderId, getSupportedProvidersList)
  pattern: Private helper functions for validation and error messages

- file: src/utils/model-spec.ts
  lines: 104-168
  why: Main function implementation pattern with JSDoc
  pattern: Function signature, validation logic, return statement, error throwing

- file: src/core/workflow.ts
  lines: 102-105, 328-337
  why: Error throwing patterns with descriptive messages
  pattern: throw new Error() with specific, actionable messages

# MUST READ - Test Patterns
- file: src/__tests__/unit/utils/model-spec.test.ts
  why: Unit test structure for utility functions (same file will have formatModelForProvider tests)
  pattern: describe/it blocks with arrange-act-assert, error testing with expect().toThrow()

- file: vitest.config.ts
  why: Test framework configuration (Vitest with globals: true)
  pattern: Use describe, it, expect without imports

# EXTERNAL REFERENCES - Model Formatting Best Practices
- docfile: plan/003_dd63ad365ffb/P1M1T2S2/research/model-formatting-research.md
  why: Comprehensive research on model formatting patterns, cross-provider translation strategies
  section: "Cross-Provider Translation Strategies", "Error Handling Best Practices"
  critical: Fail fast with clear error messages, include context in errors

# EXTERNAL REFERENCES - Multi-Provider Libraries
- url: https://github.com/berriai/litellm
  why: LiteLLM unified API patterns for provider-specific model formatting
  critical: Provider-qualified model format (e.g., "anthropic/claude-3-5-sonnet")

- url: https://openrouter.ai/docs
  why: OpenRouter gateway patterns for multi-provider model handling
  critical: Model name normalization per provider

- url: https://docs.anthropic.com/en/docs/about-claude/models
  why: Anthropic model naming conventions
  critical: Understanding model name formats for Anthropic provider
```

### Current Codebase Tree (relevant paths)

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── types/
│   │   ├── providers.ts           # REFERENCE: ProviderId, ModelSpec definitions
│   │   └── index.ts               # EXPORT: Import types for validation
│   ├── utils/
│   │   ├── model-spec.ts          # MODIFY: Add formatModelForProvider() here
│   │   ├── index.ts               # MODIFY: Export formatModelForProvider
│   │   └── ...existing files...
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── utils/
│   │   │   │   └── model-spec.test.ts  # MODIFY: Add formatModelForProvider tests
│   │   │   └── ...existing tests...
│   │   └── ...existing test dirs...
│   └── core/
│       ├── workflow.ts            # REFERENCE: Error throwing patterns
│       └── agent.ts               # REFERENCE: Default parameter patterns
├── vitest.config.ts               # TEST: Vitest configuration
└── package.json                   # TEST: npm test script
```

### Desired Codebase Tree (after implementation)

```bash
src/
├── utils/
│   ├── model-spec.ts              # [MODIFY] Add formatModelForProvider() function
│   ├── index.ts                   # [MODIFY] Export formatModelForProvider
│   └── ...existing files...
├── __tests__/
│   └── unit/
│       └── utils/
│           └── model-spec.test.ts # [MODIFY] Add tests for formatModelForProvider()
└── types/
    └── providers.ts               # [REFERENCE] ProviderId, ModelSpec (no changes)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript moduleResolution: bundler requires .js extensions
// Even though source files are .ts, imports must use .js
import type { ModelSpec, ProviderId } from '../types/providers.js';  // CORRECT
import type { ModelSpec, ProviderId } from '../types/providers';     // WRONG

// CRITICAL: formatModelForProvider() should be in the same file as parseModelSpec()
// This keeps model-spec utilities co-located and easier to maintain
// File: src/utils/model-spec.ts

// PATTERN: Follow parseModelSpec() implementation patterns
// - Use helper functions for validation logic
// - Use descriptive error messages with context
// - Comprehensive JSDoc with examples
// - Type-safe function signature

// GOTCHA: Error messages should include all relevant context
// Follow src/core/workflow.ts pattern
throw new Error(
  `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
  'Cross-provider model translation is not supported.'
);

// PATTERN: Same provider pass-through
// When spec.provider === targetProvider, return spec.model only
// This is the "happy path" for MVP
if (spec.provider === targetProvider) {
  return spec.model;
}

// GOTCHA: Cross-provider translation is NOT supported in MVP
// Do not implement model mapping or translation logic
// Throw clear error indicating this is not supported
throw new Error(
  `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
  'Cross-provider model translation is not supported.'
);

// PATTERN: Vitest globals are enabled
// No need to import describe, it, expect
describe('formatModelForProvider', () => {
  it('should return model name when providers match', () => {
    expect(result).toBe('claude-3-5-sonnet');
  });
});

// PATTERN: Error testing with expect().toThrow()
expect(() => formatModelForProvider(spec, 'opencode')).toThrow(
  /Cannot translate.*anthropic.*to.*opencode/
);

// CRITICAL: Export from utils/index.ts
// Add formatModelForProvider to barrel export
export { formatModelForProvider } from './model-spec.js';

// GOTCHA: ModelSpec preserves original input in raw field
// formatModelForProvider() should NOT use raw field
// Use spec.provider and spec.model only
```

---

## Implementation Blueprint

### Data Models and Structure

**No new models** - Uses existing types:
- `ModelSpec` (from `src/types/providers.ts`) - Input parameter
- `ProviderId` (from `src/types/providers.ts`) - Target provider parameter

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/utils/model-spec.ts
  - ADD: formatModelForProvider() function after parseModelSpec()
  - IMPORT: ModelSpec, ProviderId types (already imported for parseModelSpec)
  - IMPLEMENT: Same provider pass-through logic
  - IMPLEMENT: Cross-provider error with descriptive message
  - JSDOC: Comprehensive documentation with examples
  - FILE: Modify existing src/utils/model-spec.ts

Task 2: MODIFY src/__tests__/unit/utils/model-spec.test.ts
  - ADD: New describe block for formatModelForProvider
  - IMPLEMENT: Tests for same provider pass-through (anthropic, opencode)
  - IMPLEMENT: Tests for cross-provider error (anthropic→opencode, opencode→anthropic)
  - IMPLEMENT: Tests for error message content validation
  - FOLLOW: Pattern from existing parseModelSpec tests
  - FRAMEWORK: Vitest with describe/it/expect

Task 3: MODIFY src/utils/index.ts
  - ADD: export { formatModelForProvider } from './model-spec.js';
  - FIND: Existing parseModelSpec export (line 4)
  - ADD: After parseModelSpec export
  - PRESERVE: All existing exports

Task 4: RUN TypeScript validation
  - EXEC: npx tsc --noEmit
  - VERIFY: No type errors
  - CHECK: Imports use .js extensions
  - CHECK: Function signature matches specification

Task 5: RUN unit tests
  - EXEC: npm test -- src/__tests__/unit/utils/model-spec.test.ts
  - VERIFY: All tests pass (both parseModelSpec and formatModelForProvider)
  - COVERAGE: All success and error paths

Task 6: RUN full test suite
  - EXEC: npm test
  - VERIFY: No existing tests broken
  - CHECK: No regressions
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: Function Signature and Placement
// ============================================

/**
 * File: src/utils/model-spec.ts
 * ADD formatModelForProvider() AFTER parseModelSpec()
 */

// ... existing parseModelSpec() function ...

/**
 * Format a ModelSpec for a specific target provider
 *
 * ## Behavior
 *
 * ### Same Provider (Pass-Through)
 * When `spec.provider` matches `targetProvider`, returns the model name only.
 * - Input: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: '...' }`, `'anthropic'`
 * - Output: `"claude-3-5-sonnet"`
 *
 * ### Different Providers (Error)
 * When providers differ, throws an error. Cross-provider translation is not
 * supported in the MVP.
 * - Input: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: '...' }`, `'opencode'`
 * - Output: Throws `Error` with descriptive message
 *
 * @param spec - ModelSpec from parseModelSpec() or Provider.normalizeModel()
 * @param targetProvider - The provider to format the model for
 * @returns Formatted model string for target provider (model name only)
 * @throws {Error} When providers differ with message:
 *   "Cannot translate {source}/{model} to {target} provider. Cross-provider model translation is not supported."
 *
 * @example
 * ```ts
 * // Same provider: pass-through
 * const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
 * const model = formatModelForProvider(spec, 'anthropic');
 * // Returns: "claude-3-5-sonnet"
 *
 * // Different provider: error
 * const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
 * formatModelForProvider(spec, 'opencode');
 * // Throws: Error("Cannot translate anthropic/claude-3-5-sonnet to opencode provider. Cross-provider model translation is not supported.")
 * ```
 *
 * @see {@link parseModelSpec} for creating ModelSpec objects
 * @see {@link ModelSpec} for the input type structure
 */
export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string {
  // Implementation...
}

// ============================================
// PATTERN 2: Main Implementation Logic
// ============================================

export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string {
  // Step 1: Check if providers match (pass-through)
  if (spec.provider === targetProvider) {
    return spec.model;
  }

  // Step 2: Different providers - throw error
  // Cross-provider translation is not supported in MVP
  throw new Error(
    `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
    'Cross-provider model translation is not supported.'
  );
}

// ============================================
// PATTERN 3: Test Structure
// ============================================

/**
 * Unit tests for formatModelForProvider()
 * File: src/__tests__/unit/utils/model-spec.test.ts
 * ADD after parseModelSpec tests
 */

import { describe, it, expect } from 'vitest';
import { parseModelSpec, formatModelForProvider } from '../../../utils/model-spec.js';
import type { ModelSpec, ProviderId } from '../../../types/providers.js';

// ... existing parseModelSpec tests ...

describe('formatModelForProvider', () => {
  describe('same provider pass-through', () => {
    it('should return model name when providers match (anthropic)', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet'
      };

      const result = formatModelForProvider(spec, 'anthropic');

      expect(result).toBe('claude-3-5-sonnet');
    });

    it('should return model name when providers match (opencode)', () => {
      const spec: ModelSpec = {
        provider: 'opencode',
        model: 'gpt-4-turbo',
        raw: 'opencode/gpt-4-turbo'
      };

      const result = formatModelForProvider(spec, 'opencode');

      expect(result).toBe('gpt-4-turbo');
    });

    it('should work with specs from parseModelSpec', () => {
      const spec = parseModelSpec('anthropic/claude-opus-4');

      const result = formatModelForProvider(spec, 'anthropic');

      expect(result).toBe('claude-opus-4');
    });
  });

  describe('cross-provider translation error', () => {
    it('should throw when converting anthropic to opencode', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet'
      };

      expect(() => formatModelForProvider(spec, 'opencode')).toThrow(
        /Cannot translate.*anthropic\/claude-3-5-sonnet.*to.*opencode/
      );
    });

    it('should throw when converting opencode to anthropic', () => {
      const spec: ModelSpec = {
        provider: 'opencode',
        model: 'gpt-4',
        raw: 'opencode/gpt-4'
      };

      expect(() => formatModelForProvider(spec, 'anthropic')).toThrow(
        /Cannot translate.*opencode\/gpt-4.*to.*anthropic/
      );
    });

    it('should include helpful error message', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4'
      };

      expect(() => formatModelForProvider(spec, 'opencode')).toThrow(
        'Cross-provider model translation is not supported'
      );
    });
  });
});
```

### Integration Points

```yaml
TYPE_IMPORTS:
  - from: '../types/providers.js' (already imported in model-spec.ts)
    imports: type ModelSpec, type ProviderId
    used_by: Function signature, parameter types
    critical: Must use .js extension

EXPORTS:
  - add_to: src/utils/index.ts
    location: After parseModelSpec export (line 4)
    export: "export { formatModelForProvider } from './model-spec.js';"

TEST_IMPORTS:
  - from: '../../../utils/model-spec.js' (already imported in test file)
    imports: formatModelForProvider function
    used_by: Unit tests

  - from: '../../../types/providers.js' (already imported in test file)
    imports: type ModelSpec, type ProviderId
    used_by: Test type assertions

FUTURE_DEPENDENCIES:
  - P1.M2.T4: resolveProviderConfig() will use formatModelForProvider() for validation
  - P2.M1.T5: AnthropicProvider.normalizeModel() will benefit from this utility
  - P3.M2.T5: OpenCodeProvider.normalizeModel() will benefit from this utility
  - Future: Model mapping table for cross-provider translation (out of scope for MVP)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npx tsc --noEmit

# Expected: Zero TypeScript errors
# Common errors to watch for:
# - "Cannot find module '../types/providers.ts'" - need .js extension
# - "Cannot find name 'ModelSpec'" - need to import type
# - "Type 'string' is not assignable to type 'ProviderId'" - need type guard

# Check specific file
npx tsc --noEmit src/utils/model-spec.ts

# Verify function is exported
grep -n "export.*formatModelForProvider" src/utils/model-spec.ts

# Verify import in utils/index.ts
grep -n "formatModelForProvider" src/utils/index.ts

# Expected: Function found and exported
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new unit tests
npm test -- src/__tests__/unit/utils/model-spec.test.ts

# Expected: All tests pass
# Test coverage should include:
# - Same provider pass-through (anthropic, opencode)
# - Cross-provider error (anthropic→opencode, opencode→anthropic)
# - Error message validation
# - Integration with parseModelSpec()

# Run all unit tests (ensure no regressions)
npm test -- src/__tests__/unit/

# Expected: All existing tests still pass

# Run all tests
npm test

# Expected: All tests pass, no regressions
```

### Level 3: Type System Validation

```bash
# Test that formatModelForProvider() can be used correctly
cat > /tmp/test-format-model-for-provider.ts << 'EOF'
import { parseModelSpec, formatModelForProvider } from './src/utils/index.js';
import type { ModelSpec, ProviderId } from './src/types/index.js';

// Test same provider pass-through
const spec1: ModelSpec = parseModelSpec('anthropic/claude-3-5-sonnet');
const model1: string = formatModelForProvider(spec1, 'anthropic');
console.log(model1); // "claude-3-5-sonnet"

// Test type safety
if (spec1.provider === 'anthropic') {
  const model2 = formatModelForProvider(spec1, 'anthropic');
  console.log(model2); // TypeScript knows model2 is string
}

console.log('Type system validation passed');
EOF

npx tsc --noEmit /tmp/test-format-model-for-provider.ts

# Expected: Successful compilation, no errors

# Test error cases type correctly
cat > /tmp/test-format-model-for-provider-errors.ts << 'EOF
import { parseModelSpec, formatModelForProvider } from './src/utils/index.js';

const spec = parseModelSpec('anthropic/claude-3-5-sonnet');

// @ts-expect-error - Should throw on cross-provider translation
const result = formatModelForProvider(spec, 'opencode');

console.log('Error type validation passed');
EOF

npx tsc --noEmit /tmp/test-format-model-for-provider-errors.ts

# Expected: Errors are expected (ts-expect-error), compilation succeeds
```

### Level 4: Integration Validation

```bash
# Verify formatModelForProvider() works with Provider.normalizeModel() pattern
cat > /tmp/test-provider-integration.ts << 'EOF
import { parseModelSpec, formatModelForProvider } from './src/utils/index.js';
import type { ModelSpec, ProviderId, ProviderCapabilities } from './src/types/index.js';

class MockProvider {
  readonly id: ProviderId = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    mcp: true, skills: true, lsp: true, streaming: true, sessions: false, extendedThinking: false
  };

  normalizeModel(model: string): ModelSpec {
    return parseModelSpec(model, this.id);
  }

  formatModelForUse(spec: ModelSpec): string {
    return formatModelForProvider(spec, this.id);
  }
}

const provider = new MockProvider();
const spec = provider.normalizeModel('claude-3-5-sonnet');
const model = provider.formatModelForUse(spec);
console.log(model); // 'claude-3-5-sonnet'

console.log('Provider integration validation passed');
EOF

npx tsc --noEmit /tmp/test-provider-integration.ts

# Expected: Successful compilation

# Verify error handling in provider context
cat > /tmp/test-provider-error-handling.ts << 'EOF
import { parseModelSpec, formatModelForProvider } from './src/utils/index.js';
import type { ModelSpec, ProviderId } from './src/types/index.js';

function validateModelForProvider(spec: ModelSpec, targetProvider: ProviderId): void {
  try {
    formatModelForProvider(spec, targetProvider);
    console.log(`Model ${spec.model} is compatible with ${targetProvider}`);
  } catch (error) {
    console.error((error as Error).message);
    // Handle cross-provider incompatibility
  }
}

const anthropicSpec = parseModelSpec('anthropic/claude-3-5-sonnet');
validateModelForProvider(anthropicSpec, 'anthropic'); // Compatible
validateModelForProvider(anthropicSpec, 'opencode'); // Error

console.log('Error handling validation passed');
EOF

npx tsc --noEmit /tmp/test-provider-error-handling.ts

# Expected: Successful compilation
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] All imports use `.js` extensions
- [ ] Function exported from `src/utils/index.ts`
- [ ] No circular dependencies
- [ ] No `any` types used
- [ ] Function placed after `parseModelSpec()` in `src/utils/model-spec.ts`

### Feature Validation

- [ ] Same provider returns model name only
- [ ] Different providers throw error
- [ ] Error message includes source provider, model, and target provider
- [ ] Error message mentions "Cross-provider model translation is not supported"
- [ ] Works with `ModelSpec` from `parseModelSpec()`
- [ ] Works for both anthropic and opencode providers

### Code Quality Validation

- [ ] Follows existing error throwing patterns (src/core/workflow.ts)
- [ ] Comprehensive JSDoc with examples
- [ ] Descriptive error messages with context
- [ ] File placement matches desired structure
- [ ] Export pattern consistent with `parseModelSpec()`
- [ ] No anti-patterns (see below)

### Test Validation

- [ ] Tests added to `src/__tests__/unit/utils/model-spec.test.ts`
- [ ] All tests pass: `npm test -- src/__tests__/unit/utils/model-spec.test.ts`
- [ ] Test coverage includes all success paths
- [ ] Test coverage includes all error paths
- [ ] No existing tests broken by changes
- [ ] Error messages validated in tests

---

## Anti-Patterns to Avoid

- **Don't implement cross-provider translation** - This is explicitly out of scope for MVP
- **Don't use unsafe type assertions** - All types should be properly inferred
- **Don't skip .js extension** - Imports must use `.js` even for `.ts` files
- **Don't forget to export** - Must add to `src/utils/index.ts`
- **Don't use generic error messages** - Include context (source provider, model, target provider)
- **Don't place in separate file** - Keep with `parseModelSpec()` in `model-spec.ts`
- **Don't use spec.raw field** - Use `spec.provider` and `spec.model` only
- **Don't create custom error class** - Use standard `Error` per codebase pattern
- **Don't skip JSDoc** - Function needs comprehensive documentation
- **Don't forget to test** - Both pass-through and error cases need tests
- **Don't use async** - This is a synchronous pure function
- **Don't modify ModelSpec** - Function should not modify the input parameter
- **Don't implement model mapping** - Future feature, not MVP

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Validation**:
- Clear specification from Decision 6
- All dependent types already defined (ModelSpec, ProviderId)
- Existing codebase patterns to follow (parseModelSpec)
- Comprehensive research findings documented
- Pure function with no external dependencies
- Straightforward logic (pass-through or error)
- No integration complexity
- Simple test cases

**Risk Factors**: None identified
- Well-scoped pure function
- No external API calls
- No async operations
- Clear success/failure criteria
- Type-safe implementation
- Comprehensive test coverage possible

---

## Appendix: Complete Code Reference

### formatModelForProvider() Implementation

```typescript
// File: src/utils/model-spec.ts
// ADD AFTER parseModelSpec() function (after line 168)

/**
 * Format a ModelSpec for a specific target provider
 *
 * ## Behavior
 *
 * ### Same Provider (Pass-Through)
 * When `spec.provider` matches `targetProvider`, returns the model name only.
 *
 * **Example:**
 * - Input: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }`, `'anthropic'`
 * - Output: `"claude-3-5-sonnet"`
 *
 * ### Different Providers (Error)
 * When providers differ, throws an error. Cross-provider model translation
 * is not supported in the MVP.
 *
 * **Example:**
 * - Input: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }`, `'opencode'`
 * - Output: Throws `Error` with message:
 *   `"Cannot translate anthropic/claude-3-5-sonnet to opencode provider. Cross-provider model translation is not supported."`
 *
 * ## Use Cases
 *
 * 1. **Model Validation**: Validate that a model spec is compatible with a target provider
 * 2. **API Preparation**: Format model names for provider-specific API requests
 * 3. **Configuration**: Prepare model strings for provider initialization
 *
 * ## Future Enhancements (Out of Scope)
 *
 * - Cross-provider model mapping table (e.g., claude-3-5-sonnet → gpt-4-turbo)
 * - Capability-based model matching (tier-based translation)
 * - Alias support for model name variants
 *
 * @param spec - ModelSpec from parseModelSpec() or Provider.normalizeModel()
 * @param targetProvider - The provider to format the model for
 * @returns Formatted model string for target provider (model name only)
 * @throws {Error} When providers differ with message:
 *   "Cannot translate {source}/{model} to {target} provider. Cross-provider model translation is not supported."
 *
 * @example
 * ```ts
 * // Same provider: pass-through
 * const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
 * const model = formatModelForProvider(spec, 'anthropic');
 * console.log(model); // "claude-3-5-sonnet"
 *
 * // Different provider: error
 * const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
 * try {
 *   formatModelForProvider(spec, 'opencode');
 * } catch (error) {
 *   console.error((error as Error).message);
 *   // "Cannot translate anthropic/claude-3-5-sonnet to opencode provider. Cross-provider model translation is not supported."
 * }
 *
 * // Use with Provider.normalizeModel()
 * const provider = new AnthropicProvider();
 * const spec = provider.normalizeModel('claude-opus-4');
 * const model = formatModelForProvider(spec, 'anthropic');
 * console.log(model); // "claude-opus-4"
 * ```
 *
 * @see {@link parseModelSpec} for creating ModelSpec objects
 * @see {@link ModelSpec} for the input type structure
 * @see {@link ProviderId} for valid provider identifiers
 */
export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string {
  // Pass-through: same provider
  if (spec.provider === targetProvider) {
    return spec.model;
  }

  // Error: different providers (translation not supported in MVP)
  throw new Error(
    `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
    'Cross-provider model translation is not supported.'
  );
}
```

### Export from utils/index.ts

```typescript
// File: src/utils/index.ts
// Add to existing exports (after line 4)

export { generateId } from './id.js';
export { Observable } from './observable.js';
export { mergeWorkflowErrors } from './workflow-error-utils.js';
export { parseModelSpec, formatModelForProvider } from './model-spec.js';
//                                                                ^^^^^^^^^^^^^^^^^^^^^^ ADD THIS
export type { Subscription, Observer } from './observable.js';
```

### Research Notes

```markdown
# Research Summary for P1.M1.T2.S2

## Codebase Patterns Found

1. **Error Throwing Pattern** (src/core/workflow.ts:102-105)
   - Use descriptive error messages with context
   - Include invalid values in error messages
   - throw new Error() with specific, actionable messages

2. **Function Organization** (src/utils/model-spec.ts)
   - Related utility functions in same file
   - Helper functions as private (not exported)
   - Comprehensive JSDoc for all exported functions

3. **Export Pattern** (src/utils/index.ts)
   - Barrel export for utilities
   - Group related exports together

## External Research Key Findings

1. **Model Name Conventions by Provider**
   - Anthropic: claude-{tier}-{major}-{minor}-{date}
   - OpenAI: {family}-{variant}-{date}
   - Google: {family}-{variant}

2. **Cross-Provider Translation Strategies**
   - Direct alias mapping (1:1 mappings)
   - Capability-based mapping (tier-based)
   - Semantic translation (parse and translate)

3. **Best Practices for Handling Mismatches**
   - Fail fast with clear error messages
   - Include available models in error output
   - Support graceful degradation (optional fallback)

4. **Open Source Libraries**
   - LiteLLM: Unified API with provider/model format
   - OpenRouter: Gateway pattern with provider-qualified names
   - LangChain: Provider-specific classes

## Implementation Decisions

1. **MVP Scope**: Pass-through only, no cross-provider translation
2. **Error Strategy**: Fail fast with descriptive error message
3. **Future Extensibility**: Structure allows adding model mapping table later
4. **Code Organization**: Keep with parseModelSpec() for co-location

## Gotchas

1. TypeScript requires .js extensions for imports
2. Don't use spec.raw field (use spec.provider and spec.model)
3. Cross-provider translation is explicitly out of scope
4. Must export from utils/index.ts barrel
5. Vitest globals are enabled (no need to import)
```

---

**PRP Version**: 1.0
**Created**: January 25, 2026
**For**: Subtask P1.M1.T2.S2 - Implement formatModelForProvider() Function
**Plan**: 003_dd63ad365ffb - Multi-Provider Agent SDK Support
