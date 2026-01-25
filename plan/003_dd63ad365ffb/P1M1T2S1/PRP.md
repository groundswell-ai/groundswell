# Product Requirement Prompt (PRP): Implement parseModelSpec() Function

**Work Item:** P1.M1.T2.S1
**Title:** Implement parseModelSpec() function
**Points:** 2
**Status:** Ready for Implementation

---

## Goal

**Feature Goal**: Implement the `parseModelSpec()` utility function that parses model specification strings in both "plain" (`claude-sonnet-4`) and "qualified" (`anthropic/claude-sonnet-4`) formats, returning a typed `ModelSpec` object with proper validation.

**Deliverable**: A pure TypeScript utility function `parseModelSpec()` in `src/utils/model-spec.ts` with comprehensive input validation, error handling, JSDoc documentation, and unit tests.

**Success Definition**:
- `parseModelSpec()` function parses "provider/model" format correctly
- `parseModelSpec()` function handles plain model names with default provider
- Provider validation against `ProviderId` union type (`'anthropic' | 'opencode'`)
- Comprehensive error handling for edge cases (empty input, invalid provider, malformed strings)
- Function exported from `src/utils/index.ts`
- Unit tests cover all success and error cases
- TypeScript compilation passes with no errors
- Follows existing codebase patterns for validation functions

---

## User Persona

**Target User**: Groundswell core developers implementing the Provider interface (specifically `Provider.normalizeModel()` method) and provider configuration utilities.

**Use Case**: Developers need a reliable way to parse user/agent-provided model strings into structured `ModelSpec` objects for:
1. Provider initialization with model selection
2. `Provider.normalizeModel()` method implementation
3. `GlobalProviderConfig` validation and resolution
4. Agent configuration with model specification

**User Journey**:
1. Developer calls `parseModelSpec('claude-sonnet-4', 'anthropic')` for plain format
2. Developer calls `parseModelSpec('opencode/gpt-4')` for qualified format
3. Function validates and returns `ModelSpec` object with provider, model, and raw fields
4. Developer uses returned `ModelSpec` for provider initialization

**Pain Points Addressed**:
- **No model parsing utility** - before this, each provider would implement custom parsing
- **Inconsistent validation** - no single source of truth for model format validation
- **Unclear error messages** - users get generic errors instead of actionable feedback
- **Type safety gaps** - string parsing without proper type guards

---

## Why

- **Model specification foundation** - This function is required by PRD 7.8 and Decision 6 for parsing model strings
- **Provider interface support** - Used by `Provider.normalizeModel()` method (defined in P1.M1.T1.S3)
- **Configuration utilities** - Required for P1.M2 (Global Provider Configuration) and P1.M3 (Provider Registry)
- **Type safety** - Ensures model specifications are validated against `ProviderId` union type
- **Error handling** - Provides clear, actionable error messages for invalid model specifications
- **Single source of truth** - Centralizes model parsing logic per Decision 6
- **Testability** - Pure function with deterministic behavior for comprehensive testing

**From Decision 6 (plan/003_dd63ad365ffb/docs/architecture/decisions.md):**
> "How to parse and validate model specifications like `anthropic/claude-sonnet-4-20250514`?"
>
> **Decision:** Follow PRD specification with implementation provided.

---

## What

Implement `parseModelSpec()` function per PRD 7.8 and Decision 6:

### Function Signature

```typescript
/**
 * Parse a model specification string into a ModelSpec object
 *
 * @param model - Model string in "provider/model" or "model" format
 * @param defaultProvider - Default provider when none specified (default: 'anthropic')
 * @returns Parsed ModelSpec object
 * @throws {Error} When model specification is invalid
 */
export function parseModelSpec(
  model: string,
  defaultProvider?: ProviderId
): ModelSpec
```

### Supported Formats

**1. Qualified Format** (`provider/model`):
- Input: `"anthropic/claude-3-5-sonnet"`
- Output: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }`
- Input: `"opencode/gpt-4"`
- Output: `{ provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }`

**2. Plain Format** (`model` only):
- Input: `"claude-sonnet-4"` with `defaultProvider: 'anthropic'`
- Output: `{ provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }`
- Input: `"gpt-4"` with `defaultProvider: 'opencode'`
- Output: `{ provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }`

### Validation Rules

1. **Empty input**: Throw error for empty or whitespace-only strings
2. **Invalid provider**: Throw error for provider not in `'anthropic' | 'opencode'`
3. **Empty parts**: Throw error for empty provider or model parts
4. **Split behavior**: Use first slash only (split with limit: 2)
5. **Whitespace**: Trim input before parsing, preserve original in `raw` field

### Error Cases

| Input | Error | Reason |
|-------|-------|--------|
| `""` | Empty input | Cannot parse empty string |
| `"   "` | Empty input | Whitespace-only is invalid |
| `"/model"` | Empty provider | Provider part is empty |
| `"anthropic/"` | Empty model | Model part is empty |
| `"invalid/model"` | Invalid provider | Provider not in union type |

### Success Criteria

- [ ] Function defined in `src/utils/model-spec.ts`
- [ ] Parses qualified format: `"provider/model"` → `{ provider, model, raw }`
- [ ] Parses plain format: `"model"` with defaultProvider → `{ provider, model, raw }`
- [ ] Validates provider against `ProviderId` union type
- [ ] Throws descriptive errors for invalid input
- [ ] Preserves original input in `raw` field
- [ ] Exported from `src/utils/index.ts`
- [ ] Comprehensive JSDoc documentation
- [ ] Unit tests for all success and error cases
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
- External research on string parsing best practices
- Implementation examples with edge cases

### Documentation & References

```yaml
# MUST READ - Decision 6 Implementation Specification
- file: plan/003_dd63ad365ffb/docs/architecture/decisions.md
  section: "## Decision 6: Model Specification Parsing"
  lines: h2.5 (heading 2.5)
  why: Complete implementation specification from architectural decision
  critical: Shows exact implementation approach with split() and validation
  pattern: Use split('/', 2) for first slash only, validate provider before assertion

# MUST READ - Type Definitions
- file: src/types/providers.ts
  lines: 8-10
  why: ProviderId union type definition ('anthropic' | 'opencode')
  pattern: Union type format for provider validation

- file: src/types/providers.ts
  lines: 150-157
  why: ModelSpec interface definition with provider, model, raw fields
  pattern: Return type structure for parseModelSpec()

- file: src/types/providers.ts
  lines: 132-148
  why: JSDoc documentation pattern for model specification parsing
  pattern: Comprehensive JSDoc with examples

# MUST READ - Existing Codebase Patterns
- file: src/core/workflow.ts
  lines: 102-105, 328-337
  why: Error throwing patterns with descriptive messages
  pattern: throw new Error() with specific, actionable messages

- file: src/core/agent.ts
  lines: 95
  why: Default parameter handling pattern
  pattern: nullish coalescing ?? for default values

- file: src/tools/introspection.ts
  lines: 461
  why: Error message pattern for invalid values
  pattern: Include invalid value in error message

# MUST READ - Test Patterns
- file: src/__tests__/unit/cache.test.ts
  why: Unit test structure for utility functions
  pattern: describe/it blocks with arrange-act-assert

- file: src/__tests__/adversarial/circular-reference.test.ts
  why: Error testing patterns with expect().toThrow()
  pattern: expect(() => fn()).toThrow(/pattern/)

- file: vitest.config.ts
  why: Test framework configuration (Vitest with globals: true)
  pattern: Use describe, it, expect without imports

# INTERNAL RESEARCH - Model Spec Parsing Best Practices
- docfile: plan/003_dd63ad365ffb/P1M1T1S5/research/model-spec-parsing-best-practices.md
  why: Comprehensive research on parsing patterns, edge cases, TypeScript gotchas
  section: "String Splitting Best Practices", "Edge Cases and Error Handling"
  critical: Type guard pattern, error code pattern, complete implementation example

# INTERNAL RESEARCH - Testing Patterns
- docfile: plan/003_dd63ad365ffb/P1M1T2S1/research/testing-patterns-report.md
  why: Complete testing patterns report for this codebase
  section: "Test Patterns Documented", "Specific Patterns for parseModelSpec() Tests"
  critical: Vitest patterns, assertion patterns, error testing

# EXTERNAL REFERENCES - TypeScript Documentation
- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  why: Type guards and type narrowing for union type validation
  critical: Type guard function pattern: value is ProviderId

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split
  why: String.prototype.split() with limit parameter
  critical: split('/', 2) splits only on first slash

# EXTERNAL REFERENCES - Validation Patterns
- url: https://zellwk.com/blog/input-validation-best-practices/
  why: Input validation best practices (sanitize, validate, error messages)
  critical: Provide actionable error messages with context
```

### Current Codebase Tree (relevant paths)

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── types/
│   │   ├── providers.ts           # REFERENCE: ProviderId, ModelSpec definitions
│   │   └── index.ts               # EXPORT: Import types for validation
│   ├── utils/
│   │   ├── id.ts                  # REFERENCE: Utility function patterns
│   │   ├── index.ts               # MODIFY: Export parseModelSpec
│   │   └── workflow-error-utils.ts # REFERENCE: Error handling patterns
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── cache.test.ts      # REFERENCE: Test patterns for utilities
│   │   │   └── utils/
│   │   │       └── workflow-error-utils.test.ts  # REFERENCE: Utils test patterns
│   │   └── adversarial/
│   │       └── circular-reference.test.ts  # REFERENCE: Error testing
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
│   ├── model-spec.ts              # [NEW] parseModelSpec() function
│   ├── index.ts                   # [MODIFY] Export parseModelSpec
│   └── ...existing files...
├── __tests__/
│   └── unit/
│       └── utils/
│           └── model-spec.test.ts # [NEW] Unit tests for parseModelSpec()
└── types/
    └── providers.ts               # [REFERENCE] ProviderId, ModelSpec (no changes)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript moduleResolution: bundler requires .js extensions
// Even though source files are .ts, imports must use .js
import type { ProviderId, ModelSpec } from '../types/providers.js';  // CORRECT
import type { ProviderId, ModelSpec } from '../types/providers';     // WRONG

// CRITICAL: Use split() with limit parameter
// split('/', 2) ensures we only split on the FIRST slash
const parts = model.split('/', 2);  // CORRECT - splits "anthropic/claude/3" → ['anthropic', 'claude/3']
const parts = model.split('/');     // OK but less precise - splits "anthropic/claude/3" → ['anthropic', 'claude', '3']

// CRITICAL: Validate before type assertion
// Never use 'as ProviderId' without runtime validation
const provider = parts[0];
if (!isValidProviderId(provider)) {
  throw new Error(`Invalid provider: "${provider}"`);
}
// Now TypeScript knows provider is ProviderId in subsequent code

// GOTCHA: String.split() always returns string[], not discriminated types
const parts = model.split('/', 2);
// parts is string[], NOT [string] | [string, string]
// Must check parts.length to discriminate

// PATTERN: Type guard for union type validation
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}

// PATTERN: Descriptive error messages with context
// Follow src/core/workflow.ts pattern
throw new Error(
  `Invalid provider: "${provider}". ` +
  `Supported providers: "anthropic", "opencode"`
);

// GOTCHA: Default parameter with union type
// defaultProvider?: ProviderId means undefined is allowed
// Function should default to 'anthropic' when undefined
export function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'  // CORRECT - default value in signature
): ModelSpec {
  // ...
}

// CRITICAL: Trim input but preserve original in raw field
const trimmed = model.trim();
if (trimmed.length === 0) {
  throw new Error('Model specification cannot be empty');
}
// Use trimmed for parsing, preserve model in raw field

// PATTERN: Check empty parts after split
const parts = trimmed.split('/', 2);
if (parts.length === 2) {
  const [provider, modelName] = parts;
  if (provider.length === 0) {
    throw new Error('Provider cannot be empty');
  }
  if (modelName.length === 0) {
    throw new Error('Model name cannot be empty');
  }
}

// GOTCHA: Vitest globals are enabled
// No need to import describe, it, expect
describe('parseModelSpec', () => {
  it('should parse qualified format', () => {
    expect(result.provider).toBe('anthropic');
  });
});

// PATTERN: Error testing with expect().toThrow()
expect(() => parseModelSpec('')).toThrow(/empty/i);
expect(() => parseModelSpec('invalid/model')).toThrow(/invalid provider/i);

// CRITICAL: Export from utils/index.ts
// Add parseModelSpec to barrel export
export { parseModelSpec } from './model-spec.js';
```

---

## Implementation Blueprint

### Data Models and Structure

**No new models** - Uses existing types:
- `ProviderId` (from `src/types/providers.ts`)
- `ModelSpec` (from `src/types/providers.ts`)

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/utils/model-spec.ts
  - IMPLEMENT: parseModelSpec() function with type signature
  - IMPORT: ProviderId, ModelSpec types from '../types/providers.js'
  - IMPLEMENT: Type guard function isValidProviderId()
  - IMPLEMENT: Helper function getSupportedProvidersList()
  - LOGIC:
    1. Trim input and check for empty
    2. Split on first slash (limit: 2)
    3. If 2 parts: validate provider, check non-empty parts, return ModelSpec
    4. If 1 part: use defaultProvider, return ModelSpec
  - ERROR HANDLING: throw new Error() with descriptive messages
  - JSDOC: Comprehensive documentation with examples
  - FILE: New file in src/utils/

Task 2: CREATE src/utils/model-spec.test.ts
  - CREATE: src/__tests__/unit/utils/model-spec.test.ts
  - IMPLEMENT: Tests for qualified format (anthropic/claude-3-5-sonnet)
  - IMPLEMENT: Tests for plain format with default provider
  - IMPLEMENT: Tests for defaultProvider parameter
  - IMPLEMENT: Tests for invalid provider error
  - IMPLEMENT: Tests for empty input error
  - IMPLEMENT: Tests for empty provider part error
  - IMPLEMENT: Tests for empty model part error
  - IMPLEMENT: Tests for whitespace handling
  - IMPLEMENT: Tests for multiple slashes (first slash only)
  - FOLLOW: Pattern from src/__tests__/unit/cache.test.ts
  - FRAMEWORK: Vitest with describe/it/expect

Task 3: MODIFY src/utils/index.ts
  - ADD: export { parseModelSpec } from './model-spec.js';
  - FIND: Existing utility exports section
  - PRESERVE: All existing exports
  - PATTERN: Group with other utility function exports

Task 4: RUN TypeScript validation
  - EXEC: npx tsc --noEmit
  - VERIFY: No type errors
  - CHECK: Imports use .js extensions
  - CHECK: Type guard properly narrows types

Task 5: RUN unit tests
  - EXEC: npm test -- src/__tests__/unit/utils/model-spec.test.ts
  - VERIFY: All tests pass
  - COVERAGE: All success and error paths

Task 6: RUN full test suite
  - EXEC: npm test
  - VERIFY: No existing tests broken
  - CHECK: No regressions
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: Function Signature and Imports
// ============================================

/**
 * Model specification parser utility
 */

import type { ProviderId, ModelSpec } from '../types/providers.js';

/**
 * Parse a model specification string into a ModelSpec object
 *
 * ## Supported Formats
 *
 * ### Qualified Format (provider/model)
 * - Input: "anthropic/claude-3-5-sonnet"
 * - Output: { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }
 *
 * ### Plain Format (model only)
 * - Input: "claude-sonnet-4" with defaultProvider: 'anthropic'
 * - Output: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
 *
 * @param model - Model string in "provider/model" or "model" format
 * @param defaultProvider - Default provider when none specified (default: 'anthropic')
 * @returns Parsed ModelSpec object with provider, model, and raw string
 * @throws {Error} When model specification is invalid:
 * - Empty or whitespace-only input
 * - Invalid provider (not 'anthropic' or 'opencode')
 * - Empty provider or model parts
 *
 * @example
 * ```ts
 * // Qualified format
 * const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
 * // Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }
 *
 * // Plain format with explicit default
 * const spec = parseModelSpec('gpt-4', 'opencode');
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
 *
 * // Plain format with default provider
 * const spec = parseModelSpec('claude-sonnet-4');
 * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
 * ```
 */
export function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Implementation...
}

// ============================================
// PATTERN 2: Type Guard for Provider Validation
// ============================================

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

// ============================================
// PATTERN 3: Main Implementation Logic
// ============================================

export function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Step 1: Trim and validate input
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new Error(
      'Model specification cannot be empty. ' +
      'Expected format: "provider/model" or "model"'
    );
  }

  // Step 2: Split on first slash only
  const parts = trimmed.split('/', 2);

  // Step 3: Handle qualified format (provider/model)
  if (parts.length === 2) {
    const [provider, modelName] = parts;

    // Validate provider part is not empty
    if (provider.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Provider cannot be empty. Expected format: "provider/model"'
      );
    }

    // Validate model part is not empty
    if (modelName.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Model name cannot be empty. Expected format: "provider/model"'
      );
    }

    // Validate provider is in union type
    if (!isValidProviderId(provider)) {
      throw new Error(
        `Invalid provider: "${provider}". ` +
        `Supported providers: ${getSupportedProvidersList()}`
      );
    }

    // Return ModelSpec for qualified format
    return {
      provider,
      model: modelName,
      raw: trimmed
    };
  }

  // Step 4: Handle plain format (model only)
  const modelName = parts[0];

  return {
    provider: defaultProvider,
    model: modelName,
    raw: trimmed
  };
}

// ============================================
// PATTERN 4: Test Structure
// ============================================

/**
 * Unit tests for parseModelSpec()
 * File: src/__tests__/unit/utils/model-spec.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseModelSpec } from '../../../utils/model-spec.js';
import type { ModelSpec, ProviderId } from '../../../types/providers.js';

describe('parseModelSpec', () => {
  describe('qualified format (provider/model)', () => {
    it('should parse anthropic model', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet'
      } as ModelSpec);
    });

    it('should parse opencode model', () => {
      const result = parseModelSpec('opencode/gpt-4');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('gpt-4');
      expect(result.raw).toBe('opencode/gpt-4');
    });

    it('should preserve trimmed whitespace in raw but trim parts', () => {
      const result = parseModelSpec('  anthropic/claude-3-5-sonnet  ');

      expect(result.raw).toBe('  anthropic/claude-3-5-sonnet  ');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
    });
  });

  describe('plain format (model only)', () => {
    it('should use default provider for plain model', () => {
      const result = parseModelSpec('claude-sonnet-4', 'anthropic');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4'
      } as ModelSpec);
    });

    it('should use opencode as default provider', () => {
      const result = parseModelSpec('gpt-4', 'opencode');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('gpt-4');
    });

    it('should default to anthropic when no default specified', () => {
      const result = parseModelSpec('claude-opus-4');

      expect(result.provider).toBe('anthropic');
    });
  });

  describe('edge cases', () => {
    it('should handle model names with special characters', () => {
      const result = parseModelSpec('anthropic/claude-3.5-sonnet_20250514');

      expect(result.model).toBe('claude-3.5-sonnet_20250514');
    });

    it('should handle multiple slashes (use first only)', () => {
      const result = parseModelSpec('anthropic/claude/3/5');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude/3/5');
    });
  });

  describe('error cases', () => {
    it('should throw on empty string', () => {
      expect(() => parseModelSpec('')).toThrow(/cannot be empty/i);
    });

    it('should throw on whitespace-only input', () => {
      expect(() => parseModelSpec('   ')).toThrow(/cannot be empty/i);
    });

    it('should throw on invalid provider', () => {
      expect(() => parseModelSpec('invalid/model')).toThrow(/invalid provider/i);
    });

    it('should throw on empty provider part', () => {
      expect(() => parseModelSpec('/model')).toThrow(/provider cannot be empty/i);
    });

    it('should throw on empty model part', () => {
      expect(() => parseModelSpec('anthropic/')).toThrow(/model name cannot be empty/i);
    });

    it('should include supported providers in error message', () => {
      try {
        parseModelSpec('invalid/model');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('anthropic');
        expect((error as Error).message).toContain('opencode');
      }
    });
  });
});
```

### Integration Points

```yaml
TYPE_IMPORTS:
  - from: '../types/providers.js'
    imports: type ProviderId, type ModelSpec
    used_by: Function signature, return type, type guard
    critical: Must use .js extension

EXPORTS:
  - add_to: src/utils/index.ts
    location: After existing utility exports
    export: "export { parseModelSpec } from './model-spec.js';"

TEST_IMPORTS:
  - from: '../../../utils/model-spec.js'
    imports: parseModelSpec function
    used_by: Unit tests

  - from: '../../../types/providers.js'
    imports: type ModelSpec, type ProviderId
    used_by: Test type assertions

FUTURE_DEPENDENCIES:
  - P1.M1.T2.S2: formatModelForProvider() will use parseModelSpec() output
  - P1.M2.T4: resolveProviderConfig() will use parseModelSpec() for validation
  - P2.M1.T5: AnthropicProvider.normalizeModel() will call this function
  - P3.M2.T5: OpenCodeProvider.normalizeModel() will call this function
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
# - "Cannot find name 'ProviderId'" - need to import type
# - "Type 'string' is not assignable to type 'ProviderId'" - need type guard

# Check specific file
npx tsc --noEmit src/utils/model-spec.ts

# Verify function is exported
grep -n "export.*parseModelSpec" src/utils/model-spec.ts

# Verify import in utils/index.ts
grep -n "parseModelSpec" src/utils/index.ts

# Expected: Function found and exported
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new unit tests
npm test -- src/__tests__/unit/utils/model-spec.test.ts

# Expected: All tests pass
# Test coverage should include:
# - Qualified format parsing (anthropic/..., opencode/...)
# - Plain format parsing with default provider
# - Default provider parameter behavior
# - Whitespace handling
# - Multiple slashes (first slash only)
# - Empty string error
# - Whitespace-only error
# - Invalid provider error
# - Empty provider part error
# - Empty model part error
# - Error message content

# Run all unit tests (ensure no regressions)
npm test -- src/__tests__/unit/

# Expected: All existing tests still pass

# Run all tests
npm test

# Expected: All tests pass, no regressions
```

### Level 3: Type System Validation

```bash
# Test that parseModelSpec() can be used correctly
cat > /tmp/test-parse-model-spec.ts << 'EOF'
import { parseModelSpec } from './src/utils/index.js';
import type { ModelSpec, ProviderId } from './src/types/index.js';

// Test qualified format
const spec1: ModelSpec = parseModelSpec('anthropic/claude-3-5-sonnet');
console.log(spec1.provider); // TypeScript knows this is 'anthropic' | 'opencode'

// Test plain format
const spec2: ModelSpec = parseModelSpec('claude-sonnet-4');
console.log(spec2.provider); // 'anthropic'

// Test with opencode default
const spec3: ModelSpec = parseModelSpec('gpt-4', 'opencode');
console.log(spec3.provider); // 'opencode'

// Test type narrowing
if (spec1.provider === 'anthropic') {
  console.log('Using Anthropic provider');
}

console.log('Type system validation passed');
EOF

npx tsc --noEmit /tmp/test-parse-model-spec.ts

# Expected: Successful compilation, no errors

# Test error cases type correctly
cat > /tmp/test-parse-model-spec-errors.ts << 'EOF'
import { parseModelSpec } from './src/utils/index.js';

// @ts-expect-error - Should throw on empty string
const spec1 = parseModelSpec('');

// @ts-expect-error - Should throw on invalid provider
const spec2 = parseModelSpec('invalid/model');

console.log('Error type validation passed');
EOF

npx tsc --noEmit /tmp/test-parse-model-spec-errors.ts

# Expected: Errors are expected (ts-expect-error), compilation succeeds
```

### Level 4: Integration Validation

```bash
# Verify parseModelSpec() works with Provider.normalizeModel() pattern
cat > /tmp/test-provider-integration.ts << 'EOF'
import { parseModelSpec } from './src/utils/index.js';
import type { ModelSpec, ProviderId, ProviderCapabilities } from './src/types/index.js';

class MockProvider {
  readonly id: ProviderId = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    mcp: true, skills: true, lsp: true, streaming: true, sessions: false, extendedThinking: false
  };

  normalizeModel(model: string): ModelSpec {
    return parseModelSpec(model, this.id);
  }
}

const provider = new MockProvider();
const spec = provider.normalizeModel('claude-3-5-sonnet');
console.log(spec.provider); // 'anthropic'

console.log('Provider integration validation passed');
EOF

npx tsc --noEmit /tmp/test-provider-integration.ts

# Expected: Successful compilation

# Verify ModelSpec can be used in configuration
cat > /tmp/test-config-integration.ts << 'EOF'
import { parseModelSpec } from './src/utils/index.js';
import type { GlobalProviderConfig } from './src/types/index.js';

// Model spec from user input
const userSpec = parseModelSpec('anthropic/claude-3-5-sonnet');

// Use in configuration
const config: GlobalProviderConfig = {
  defaultProvider: userSpec.provider,
  providerDefaults: {
    [userSpec.provider]: { apiKey: 'sk-test' }
  }
};

console.log('Configuration integration validation passed');
EOF

npx tsc --noEmit /tmp/test-config-integration.ts

# Expected: Successful compilation
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] All imports use `.js` extensions
- [ ] Type guard `isValidProviderId()` properly narrows types
- [ ] Function exported from `src/utils/index.ts`
- [ ] No circular dependencies
- [ ] No `any` types used

### Feature Validation

- [ ] Qualified format parsing works: `"provider/model"` → `{ provider, model, raw }`
- [ ] Plain format parsing works: `"model"` with defaultProvider → `{ provider, model, raw }`
- [ ] Default provider defaults to `'anthropic'`
- [ ] Provider validation against `'anthropic' | 'opencode'`
- [ ] Empty input throws error
- [ ] Invalid provider throws error with list of supported providers
- [ ] Empty provider part throws error
- [ ] Empty model part throws error
- [ ] Original input preserved in `raw` field
- [ ] Whitespace trimmed from parts

### Code Quality Validation

- [ ] Follows existing error throwing patterns (src/core/workflow.ts)
- [ ] Comprehensive JSDoc with examples
- [ ] Descriptive error messages with context
- [ ] File placement matches desired structure
- [ ] Export pattern consistent with other utils
- [ ] No anti-patterns (see below)

### Test Validation

- [ ] Unit test file created: `src/__tests__/unit/utils/model-spec.test.ts`
- [ ] All tests pass: `npm test -- src/__tests__/unit/utils/model-spec.test.ts`
- [ ] Test coverage includes all success paths
- [ ] Test coverage includes all error paths
- [ ] No existing tests broken by changes
- [ ] Error messages validated in tests

---

## Anti-Patterns to Avoid

- ❌ **Don't use unsafe type assertions** - Always validate before `as ProviderId`
- ❌ **Don't skip .js extension** - Imports must use `.js` even for `.ts` files
- ❌ **Don't use optional chaining for validation** - Check length explicitly
- ❌ **Don't forget to trim input** - Always trim before validation
- ❌ **Don't lose original input** - Preserve in `raw` field
- ❌ **Don't use split() without limit** - Use `split('/', 2)` for first slash only
- ❌ **Don't use generic error messages** - Include context and actionable info
- ❌ **Don't skip JSDoc** - Function needs comprehensive documentation
- ❌ **Don't forget default parameter** - `defaultProvider: ProviderId = 'anthropic'`
- ❌ **Don't catch and re-throw errors** - Let them propagate naturally
- ❌ **Don't use regex for simple split** - `split('/', 2)` is clearer
- ❌ **Don't validate model name format** - Only validate provider, accept any model name
- ❌ **Don't create custom error class** - Use standard `Error` per codebase pattern

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Validation**:
- Clear specification from Decision 6
- All dependent types already defined (ProviderId, ModelSpec)
- Existing codebase patterns to follow
- Comprehensive research findings documented
- Pure function with no external dependencies
- Straightforward validation logic
- No integration complexity

**Risk Factors**: None identified
- Well-scoped pure function
- No external API calls
- No async operations
- Clear success/failure criteria
- Type-safe implementation
- Comprehensive test coverage possible

---

## Appendix: Complete Code Reference

### parseModelSpec() Implementation

```typescript
// File: src/utils/model-spec.ts

/**
 * Model specification parsing utility
 *
 * Provides parsing and validation of model specification strings
 * per PRD 7.8 and Decision 6.
 */

import type { ProviderId, ModelSpec } from '../types/providers.js';

/**
 * Type guard to check if a string is a valid ProviderId
 *
 * Use this function to validate and narrow string types to ProviderId.
 *
 * @param value - The string value to check
 * @returns True if the value is a valid ProviderId ('anthropic' | 'opencode')
 *
 * @example
 * ```ts
 * const value: string = getUserInput();
 *
 * if (isValidProviderId(value)) {
 *   // TypeScript knows value is ProviderId here
 *   console.log(`Valid provider: ${value}`);
 * } else {
 *   console.error(`Invalid provider: ${value}`);
 * }
 * ```
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

/**
 * Parse a model specification string into a ModelSpec object
 *
 * ## Supported Formats
 *
 * ### Qualified Format (provider/model)
 * Explicit provider specification with "/" separator.
 * - Input: `"anthropic/claude-3-5-sonnet"`
 * - Output: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }`
 *
 * ### Plain Format (model only)
 * Uses default provider when no provider specified.
 * - Input: `"claude-sonnet-4"` with defaultProvider: `'anthropic'`
 * - Output: `{ provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }`
 *
 * ## Validation Rules
 *
 * 1. Input cannot be empty or whitespace-only
 * 2. Provider must be one of: `'anthropic'`, `'opencode'`
 * 3. Model name cannot be empty after provider split
 * 4. Only the first slash is considered the provider/model separator
 * 5. Input is trimmed before parsing, original preserved in `raw` field
 *
 * @param model - Model specification string to parse
 * @param defaultProvider - Default provider to use when none specified (default: 'anthropic')
 * @returns Parsed ModelSpec object with provider, model, and raw string
 * @throws {Error} When model specification is invalid:
 * - Empty or whitespace-only input
 * - Invalid provider (not 'anthropic' or 'opencode')
 * - Empty provider or model parts
 *
 * @example
 * ```ts
 * // Qualified format with explicit provider
 * const spec1 = parseModelSpec('anthropic/claude-3-5-sonnet');
 * // Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }
 *
 * // Qualified format with opencode
 * const spec2 = parseModelSpec('opencode/gpt-4');
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }
 *
 * // Plain format with explicit default provider
 * const spec3 = parseModelSpec('gpt-4', 'opencode');
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
 *
 * // Plain format with default provider (anthropic)
 * const spec4 = parseModelSpec('claude-sonnet-4');
 * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
 *
 * // Error case: invalid provider
 * try {
 *   parseModelSpec('invalid/model');
 * } catch (error) {
 *   console.error(error.message);
 *   // "Invalid provider: "invalid". Supported providers: "anthropic", "opencode""
 * }
 * ```
 *
 * @see {@link ModelSpec} for the return type structure
 * @see {@link ProviderId} for valid provider identifiers
 */
export function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Step 1: Trim and validate input
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new Error(
      'Model specification cannot be empty. ' +
      'Expected format: "provider/model" or "model"'
    );
  }

  // Step 2: Split on first slash only
  const parts = trimmed.split('/', 2);

  // Step 3: Handle qualified format (provider/model)
  if (parts.length === 2) {
    const [provider, modelName] = parts;

    // Validate provider part is not empty
    if (provider.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Provider cannot be empty. Expected format: "provider/model"'
      );
    }

    // Validate model part is not empty
    if (modelName.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Model name cannot be empty. Expected format: "provider/model"'
      );
    }

    // Validate provider is in union type
    if (!isValidProviderId(provider)) {
      throw new Error(
        `Invalid provider: "${provider}". ` +
        `Supported providers: ${getSupportedProvidersList()}`
      );
    }

    // Return ModelSpec for qualified format
    return {
      provider,
      model: modelName,
      raw: trimmed
    };
  }

  // Step 4: Handle plain format (model only)
  const modelName = parts[0];

  return {
    provider: defaultProvider,
    model: modelName,
    raw: trimmed
  };
}
```

### Export from utils/index.ts

```typescript
// File: src/utils/index.ts
// Add to existing exports section

export { parseModelSpec } from './model-spec.js';
```

### Research Notes

```markdown
# Research Summary for P1.M1.T2.S1

## Codebase Patterns Found

1. **Error Throwing Pattern** (src/core/workflow.ts:102-105)
   - Use descriptive error messages with context
   - Include invalid values in error messages
   - throw new Error() with specific, actionable messages

2. **Type Guard Pattern** (from research)
   - Function signature: `value is ProviderId`
   - Runtime validation before type narrowing
   - Enables type-safe conditional blocks

3. **Default Parameter Pattern** (src/core/agent.ts:95)
   - Use default value in function signature
   - Nullish coalescing for optional overrides

4. **Test Pattern** (Vitest with globals: true)
   - describe/it/expect without imports
   - expect().toThrow() for error testing
   - Arrange-act-assert structure

## External Research Key Findings

1. **String.split() with limit** (MDN)
   - split('/', 2) splits only on first slash
   - Returns array with 1 or 2 elements

2. **Type Guard Best Practices** (TypeScript Handbook)
   - Use `value is Type` return type annotation
   - Enables type narrowing in conditional blocks

3. **Validation Best Practices** (External research)
   - Trim input before validation
   - Preserve original for debugging
   - Provide actionable error messages

## Edge Cases Identified

1. Empty string input
2. Whitespace-only input
3. Empty provider part: "/model"
4. Empty model part: "anthropic/"
5. Invalid provider: "invalid/model"
6. Multiple slashes: "anthropic/claude/3"
7. Model names with special characters
8. Whitespace around input

## Gotchas

1. TypeScript requires .js extensions for imports
2. String.split() always returns string[], not discriminated types
3. Type assertions must be preceded by runtime validation
4. Template literal types are compile-time only
5. Vitest globals are enabled (no need to import)
```

---

**PRP Version**: 1.0
**Created**: January 25, 2026
**For**: Subtask P1.M1.T2.S1 - Implement parseModelSpec() Function
**Plan**: 003_dd63ad365ffb - Multi-Provider Agent SDK Support
