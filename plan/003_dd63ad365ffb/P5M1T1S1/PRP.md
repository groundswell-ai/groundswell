# PRP: Test parseModelSpec() Function

---

## Goal

**Feature Goal**: Create comprehensive unit tests for the `parseModelSpec()` utility function to ensure correct parsing and validation of model specification strings.

**Deliverable**: Unit test file at `src/__tests__/unit/utils/model-spec.test.ts` with full coverage of success paths, error cases, edge cases, and type safety verification.

**Success Definition**:
- All test cases pass when run with `vitest run`
- Test coverage includes all code paths in `parseModelSpec()` function
- Tests follow the established `describe/it/expect` Vitest pattern used in the codebase
- Error messages are validated for correctness and helpfulness
- Type safety is verified through TypeScript narrowing tests

## User Persona (if applicable)

**Target User**: Developer implementing the multi-provider system, requiring confidence that model specification parsing works correctly across all input formats.

**Use Case**: When integrating providers into the Agent system, developers need to ensure model specifications (like `"anthropic/claude-3-5-sonnet"` or `"claude-sonnet-4"`) are parsed correctly into `ModelSpec` objects with proper validation.

**User Journey**:
1. Developer writes code using `parseModelSpec()` to parse user-provided model strings
2. Tests validate that valid inputs produce correct `ModelSpec` objects
3. Tests validate that invalid inputs throw helpful error messages
4. Developer gains confidence the function handles edge cases correctly

**Pain Points Addressed**:
- Unclear behavior when parsing model strings with various formats
- Unclear error messages for invalid inputs
- Potential for type safety violations when using parsed results

## Why

- **Foundation for Multi-Provider System**: `parseModelSpec()` is a core utility that converts user-provided model strings into typed `ModelSpec` objects used throughout the provider system
- **Type Safety**: Ensures provider IDs are constrained to valid values (`'anthropic'` | `'opencode'`)
- **Error Handling**: Validates inputs and provides helpful error messages for debugging
- **Contract Compliance**: Fulfills the testing requirements for P5.M1.T1.S1 in the PRD

## What

Create a comprehensive test suite for the `parseModelSpec()` function that covers:

1. **Qualified Format (provider/model)**: Parse strings like `"anthropic/claude-3-5-sonnet"`
2. **Plain Format (model only)**: Parse strings like `"claude-sonnet-4"` with default provider
3. **Default Provider Parameter**: Test explicit and implicit default provider values
4. **Invalid Provider Error**: Test that invalid providers throw errors with helpful messages
5. **Edge Cases**: Whitespace handling, multiple slashes, special characters
6. **Type Safety**: Verify TypeScript type narrowing works correctly

### Success Criteria

- [ ] All test cases pass with `vitest run src/__tests__/unit/utils/model-spec.test.ts`
- [ ] Test coverage includes all branches in `parseModelSpec()` function
- [ ] Tests follow established patterns from existing test files
- [ ] Error message content is validated for accuracy and helpfulness
- [ ] Type safety tests verify ProviderId narrowing

## All Needed Context

### Context Completeness Check

✅ **"No Prior Knowledge" test passed**: This PRP provides complete file paths, exact function signatures, test patterns to follow, validation commands, and all necessary type definitions. An implementer unfamiliar with the codebase can successfully implement these tests using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Core implementation and types
- file: src/utils/model-spec.ts
  why: Contains the parseModelSpec() function implementation with complete JSDoc documentation
  pattern: Function signature, validation logic, error handling patterns
  gotcha: The function uses split('/', 2) to limit splitting to first slash only
  critical: lines 104-168 contain the complete parseModelSpec implementation

- file: src/types/providers.ts
  why: Contains ProviderId type and ModelSpec interface definitions
  pattern: Union type for ProviderId (lines 9-11), interface structure for ModelSpec (lines 154-161)
  critical: ModelSpec has three fields: provider (ProviderId), model (string), raw (string)

- file: src/__tests__/unit/utils/model-spec.test.ts
  why: Contains existing tests that demonstrate the expected test patterns
  pattern: describe/it/expect structure, error testing with expect().toThrow(), type safety tests
  gotcha: Tests already exist - verify they pass and match contract requirements
  critical: This file may already contain the tests - verify completeness against contract

- file: vitest.config.ts
  why: Contains Vitest configuration including test file patterns
  pattern: Test files are located in src/__tests__/**/*.test.ts
  gotcha: Vitest globals are enabled, no need to import describe/it/expect

# EXTERNAL DOCUMENTATION
- url: https://vitest.dev/api/expect.html#tostrictequal
  why: Documentation for expect().toStrictEqual() used for ModelSpec object comparison
  critical: toStrictEqual() checks strict equality including type and undefined properties

- url: https://vitest.dev/api/expect.html#tothrow
  why: Documentation for testing functions that throw errors
  critical: Use toThrow() with regex patterns or exact error message strings

# RELATED TEST PATTERNS
- file: src/__tests__/unit/utils/provider-config.test.ts
  why: Similar utility function test patterns for validation and error testing
  pattern: Error testing with descriptive messages, edge case coverage

- file: src/__tests__/unit/agent-prompt-provider-override.test.ts
  why: Example of provider-related testing in the codebase
  pattern: Provider testing patterns, type safety verification
```

### Current Codebase tree

```bash
src/
├── __tests__/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── model-spec.test.ts      # ← Target file (may already exist)
│   │   │   ├── provider-config.test.ts # ← Reference for utility test patterns
│   │   │   └── workflow-error-utils.test.ts
│   │   ├── agent-prompt-provider-override.test.ts
│   │   └── ...
│   ├── integration/
│   └── ...
├── types/
│   ├── providers.ts                      # ← ProviderId, ModelSpec definitions
│   └── ...
└── utils/
    └── model-spec.ts                     # ← parseModelSpec() implementation
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# Note: Tests may already exist at src/__tests__/unit/utils/model-spec.test.ts
# Verify completeness and update as needed

src/__tests__/unit/utils/model-spec.test.ts  # UPDATE or VERIFY
  Responsibility: Unit tests for parseModelSpec() function
  Contains:
    - Qualified format parsing tests (provider/model)
    - Plain format parsing tests (model only with default provider)
    - Error case tests (empty input, invalid provider, empty parts)
    - Edge case tests (whitespace, multiple slashes, special characters)
    - Type safety verification tests
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Vitest globals are enabled in vitest.config.ts
// No need to import describe, it, expect - they are available globally

// CRITICAL: Test files use .js extension in imports due to TypeScript module resolution
// Import pattern: import { parseModelSpec } from '../../../utils/model-spec.js';

// CRITICAL: parseModelSpec() uses split('/', 2) - limits to first slash only
// Input: "anthropic/claude/3/5" → provider: "anthropic", model: "claude"

// CRITICAL: The 'raw' field preserves original input including whitespace
// Input: "  claude-sonnet-4  " → raw: "  claude-sonnet-4  ", model: "claude-sonnet-4"

// CRITICAL: Default provider parameter defaults to 'anthropic' if not specified
// parseModelSpec('model') uses 'anthropic' as default provider

// CRITICAL: Error messages include original input in quotes for debugging
// Empty provider: 'Invalid model specification: "/model". Provider cannot be empty.'

// CRITICAL: Type assertion with 'as ModelSpec' is used in existing tests
// expect(result).toEqual({ ... } as ModelSpec);

// CRITICAL: expect().toStrictEqual() is required per contract definition
// Use toStrictEqual() instead of toEqual() for ModelSpec comparison

// CRITICAL: Error tests use try/catch with expect.fail() for detailed message validation
// Pattern: try { fn(); expect.fail('Should have thrown'); } catch (e) { expect(e.message).toContain(...) }
```

## Implementation Blueprint

### Data models and structure

```typescript
// ModelSpec interface from src/types/providers.ts (lines 154-161)
export interface ModelSpec {
  /** Provider identifier */
  provider: ProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string (preserves user input) */
  raw: string;
}

// ProviderId type from src/types/providers.ts (lines 9-11)
export type ProviderId =
  | 'anthropic'
  | 'opencode';

// parseModelSpec function signature from src/utils/model-spec.ts (lines 104-107)
export function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY OR CREATE src/__tests__/unit/utils/model-spec.test.ts
  - CHECK if file exists (it likely already exists based on research)
  - IF exists: Verify tests match contract requirements and add any missing cases
  - IF not exists: Create new test file following existing patterns
  - IMPORT: parseModelSpec from '../../../utils/model-spec.js'
  - IMPORT: ModelSpec, ProviderId types from '../../../types/providers.js'
  - USE: describe/it/expect pattern (globals enabled, no import needed)

Task 2: WRITE qualified format (provider/model) tests
  - IMPLEMENT: describe block for 'qualified format (provider/model)'
  - TEST: anthropic provider with model (anthropic/claude-3-5-sonnet)
  - TEST: opencode provider with model (opencode/gpt-4)
  - TEST: whitespace preservation (raw keeps original, parts are trimmed)
  - ASSERT: Use expect().toStrictEqual() per contract definition
  - PATTERN: Follow lines 10-36 of existing model-spec.test.ts

Task 3: WRITE plain format (model only) tests
  - IMPLEMENT: describe block for 'plain format (model only)'
  - TEST: explicit default provider parameter (parseModelSpec('model', 'anthropic'))
  - TEST: opencode as default provider
  - TEST: implicit default to anthropic (no defaultProvider parameter)
  - ASSERT: provider field equals defaultProvider or 'anthropic'
  - PATTERN: Follow lines 38-61 of existing model-spec.test.ts

Task 4: WRITE error case tests
  - IMPLEMENT: describe block for 'error cases'
  - TEST: empty string throws /cannot be empty/i
  - TEST: whitespace-only input throws /cannot be empty/i
  - TEST: invalid provider throws /invalid provider/i
  - TEST: empty provider part (/model) throws /provider cannot be empty/i
  - TEST: empty model part (anthropic/) throws /model name cannot be empty/i
  - TEST: error message contains supported providers list
  - TEST: error message contains original input in quotes
  - PATTERN: Use expect().toThrow() with regex; use try/catch with expect.fail() for message validation
  - REFERENCE: Lines 87-148 of existing model-spec.test.ts

Task 5: WRITE edge case tests
  - IMPLEMENT: describe block for 'edge cases'
  - TEST: model names with special characters (dots, underscores)
  - TEST: multiple slashes (only first slash is separator)
  - TEST: whitespace around input (raw preserves, model trimmed)
  - PATTERN: Follow lines 63-85 of existing model-spec.test.ts

Task 6: WRITE type safety tests
  - IMPLEMENT: describe block for 'type safety'
  - TEST: returned provider field is assignable to ProviderId type
  - TEST: TypeScript type narrowing works with provider === 'anthropic' check
  - PATTERN: Follow lines 150-167 of existing model-spec.test.ts

Task 7: RUN tests and verify all pass
  - EXECUTE: npm test -- src/__tests__/unit/utils/model-spec.test.ts
  - VERIFY: All tests pass
  - VERIFY: No linting errors with npm run lint
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Import statement with .js extension (TypeScript module resolution)
import { describe, it, expect } from 'vitest';
import { parseModelSpec, formatModelForProvider } from '../../../utils/model-spec.js';
import type { ModelSpec, ProviderId } from '../../../types/providers.js';

// PATTERN 2: Describe block structure (nested by scenario)
describe('parseModelSpec', () => {
  describe('qualified format (provider/model)', () => {
    it('should parse anthropic model', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');
      expect(result).toStrictEqual({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet'
      } as ModelSpec);
    });
  });

  // ... more describe blocks
});

// PATTERN 3: Error testing with toThrow regex
it('should throw on empty string', () => {
  expect(() => parseModelSpec('')).toThrow(/cannot be empty/i);
});

// PATTERN 4: Error message validation with try/catch
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

// PATTERN 5: Type safety verification
it('should return ModelSpec with correct ProviderId type', () => {
  const result = parseModelSpec('anthropic/claude-3-5-sonnet');
  const provider: ProviderId = result.provider; // Type assertion
  expect(provider).toBe('anthropic');
});

// PATTERN 6: Whitespace handling test
it('should preserve trimmed whitespace in raw but trim parts', () => {
  const result = parseModelSpec('  anthropic/claude-3-5-sonnet  ');
  expect(result.raw).toBe('  anthropic/claude-3-5-sonnet  ');
  expect(result.provider).toBe('anthropic');
  expect(result.model).toBe('claude-3-5-sonnet');
});

// GOTCHA: toStrictEqual vs toEqual - contract requires toStrictEqual()
// toStrictEqual checks strict equality including undefined properties and type
```

### Integration Points

```yaml
NO EXTERNAL INTEGRATIONS:
  - parseModelSpec is a pure utility function with no external dependencies
  - Tests are self-contained unit tests

TEST RUNNER:
  - framework: Vitest (configured in vitest.config.ts)
  - command: npm test -- src/__tests__/unit/utils/model-spec.test.ts
  - watch mode: npm run test:watch

TYPE CHECKING:
  - linter: TypeScript compiler (tsc --noEmit)
  - command: npm run lint
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript type checking
npm run lint

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.

# Run tests in watch mode for immediate feedback
npm run test:watch src/__tests__/unit/utils/model-spec.test.ts

# Expected: All tests pass. Watch mode will re-run on file changes.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run specific test file
npm test -- src/__tests__/unit/utils/model-spec.test.ts

# Run with verbose output
npm test -- src/__tests__/unit/utils/model-spec.test.ts --reporter=verbose

# Expected output:
# Test Files  1 passed (1)
# Tests  15 passed (15)
# Duration  < 1s

# Run all utils tests to ensure no regressions
npm test -- src/__tests__/unit/utils/

# Expected: All utils tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite to ensure no regressions
npm test

# Expected: All tests pass, no failures in other test files

# Verify related provider tests still pass
npm test -- src/__tests__/unit/agent-prompt-provider-override.test.ts
npm test -- src/__tests__/unit/utils/provider-config.test.ts

# Expected: Related provider tests pass, confirming no breaking changes
```

### Level 4: Coverage Validation (Optional but Recommended)

```bash
# If coverage is configured in vitest.config.ts
npm test -- --coverage

# Expected: parseModelSpec function shows 100% coverage
# Check that all branches are covered (qualified vs plain format, all error paths)

# Manual verification: Review src/utils/model-spec.ts
# Ensure each code path has a corresponding test:
# - Line 114: Empty input check → Test with '' and '   '
# - Line 125: Qualified format check → Test with 'anthropic/model'
# - Line 129: Empty provider check → Test with '/model'
# - Line 137: Empty model check → Test with 'anthropic/'
# - Line 145: Invalid provider check → Test with 'invalid/model'
# - Line 161: Plain format fallback → Test with 'model-only'
```

## Final Validation Checklist

### Technical Validation

- [ ] All test cases pass: `npm test -- src/__tests__/unit/utils/model-spec.test.ts`
- [ ] No type errors: `npm run lint`
- [ ] Test file follows established patterns from existing test files
- [ ] Used `expect().toStrictEqual()` per contract definition
- [ ] Error messages validated for content and helpfulness

### Feature Validation

- [ ] Qualified format (provider/model) tested with anthropic and opencode
- [ ] Plain format (model only) tested with explicit and implicit default provider
- [ ] Invalid provider error tested with error message validation
- [ ] Empty input error tested (empty string and whitespace-only)
- [ ] Empty parts error tested (/model and anthropropic/)
- [ ] Edge cases tested (whitespace, multiple slashes, special characters)
- [ ] Type safety verified with ProviderId type assertion

### Code Quality Validation

- [ ] Tests follow describe/it/expect Vitest pattern
- [ ] Test names are descriptive and follow "should..." pattern
- [ ] Error tests use appropriate patterns (toThrow with regex, try/catch for message validation)
- [ ] No shared state between tests (each test is independent)
- [ ] File location matches codebase convention (src/__tests__/unit/utils/)

### Contract Compliance

- [ ] Test file created at src/__tests__/unit/utils/model-spec.test.ts (or verified existing)
- [ ] Test cases include: plain model with default provider
- [ ] Test cases include: provider/model format (anthropic/claude-sonnet-4)
- [ ] Test cases include: invalid provider (throws error)
- [ ] Test cases include: default provider parameter variations
- [ ] Used expect().toStrictEqual() for ModelSpec comparison

---

## Anti-Patterns to Avoid

- ❌ Don't use `toEqual()` - contract requires `toStrictEqual()` for ModelSpec comparison
- ❌ Don't import describe/it/expect - Vitest globals are enabled
- ❌ Don't forget the `.js` extension in import paths - TypeScript requires it
- ❌ Don't test only happy path - must include error cases and edge cases
- ❌ Don't skip error message validation - contract requires verifying error content
- ❌ Don't use `// @ts-ignore` to suppress type errors - fix the underlying issue
- ❌ Don't create shared state between tests - each test must be independent
- ❌ Don't use `expect(result.provider).toBe('anthropic')` alone - must use `toStrictEqual()` for full object comparison per contract
- ❌ Don't forget type safety tests - contract requires verifying ProviderId type narrowing
- ❌ Don't create new test patterns - follow existing patterns from model-spec.test.ts and provider-config.test.ts

## Additional Notes

### Existing Tests Notice

Based on research, comprehensive tests for `parseModelSpec()` already exist at `src/__tests__/unit/utils/model-spec.test.ts`. Before implementing:

1. **Verify existing tests pass**: Run `npm test -- src/__tests__/unit/utils/model-spec.test.ts`
2. **Compare against contract requirements**: Ensure all contract-specified test cases exist
3. **Add missing tests if needed**: Focus on any gaps between existing tests and contract requirements

### Contract vs. Reality Discrepancy

The contract definition specifies `/tests/providers/model-spec.test.ts` but the actual codebase uses `src/__tests__/unit/utils/` for utility tests. This PRP uses the actual codebase convention (`src/__tests__/unit/utils/model-spec.test.ts`) rather than the contract's path.

### Vitest Reference

- **Official Docs**: https://vitest.dev/
- **API Reference**: https://vitest.dev/api/
- **Expect API**: https://vitest.dev/api/expect.html

---

## Confidence Score

**9/10** - One-pass implementation success likelihood is very high.

**Rationale**:
- Complete implementation details with exact file paths and line numbers
- Existing test file provides clear pattern to follow
- Comprehensive test cases specified with expected assertions
- All validation commands verified to work in this codebase
- Clear guidance on contract discrepancies
- Complete type definitions provided

**Risk factor**: The existing tests may already be complete, reducing this to a verification task rather than implementation.
