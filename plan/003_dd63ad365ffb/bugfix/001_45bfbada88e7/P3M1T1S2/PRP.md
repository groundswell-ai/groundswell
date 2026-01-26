# Product Requirement Prompt (PRP): Write Tests for Capability Helpers

---

## Goal

**Feature Goal**: Create comprehensive test coverage for the `supports()` and `requiresFeatures()` capability checking methods implemented in P3.M1.T1.S1.

**Deliverable**: Complete unit test suite for AnthropicProvider and OpenCodeProvider capability helper methods.

**Success Definition**:
- [ ] Test file for AnthropicProvider.supports() and requiresFeatures()
- [ ] Test file for OpenCodeProvider.supports() and requiresFeatures()
- [ ] All 6 capabilities tested (mcp, skills, lsp, streaming, sessions, extendedThinking)
- [ ] Edge cases covered (empty arrays, single elements, all capabilities)
- [ ] Comparative tests showing provider capability differences
- [ ] All tests pass: `npm test -- provider-*-supports.test.ts`
- [ ] Tests follow existing codebase patterns

---

## User Persona

**Target User**: Implementation agent working on P3.M1.T1.S2 (capability helper method tests).

**Use Case**: Ensuring the capability checking helper methods work correctly across different providers with different capability configurations.

**User Journey**:
1. Review P3.M1.T1.S1 PRP to understand what methods were implemented
2. Study existing test patterns in src/__tests__/unit/providers/
3. Create test files for each provider's capability methods
4. Run tests and verify coverage
5. Ensure tests follow established patterns

**Pain Points Addressed**:
- **No Test Coverage**: Capability helper methods currently have zero test coverage
- **Provider Differences**: Need to verify methods work correctly for providers with different capabilities
- **Edge Cases**: Empty arrays, all capabilities, and mixed scenarios need verification

---

## Why

**Business Value and User Impact**:
- Ensures reliability of capability checking API
- Documents expected behavior through tests
- Catches regressions if capability implementations change
- Validates provider capability differences work correctly

**Integration with Existing Features**:
- Builds on capability methods from P3.M1.T1.S1
- Follows existing test patterns in src/__tests__/unit/providers/
- Uses Vitest framework (already configured)
- Extends provider test coverage

**Problems Solved**:
- **Zero Coverage**: Capability methods have no tests
- **Provider Differences**: Need to verify Anthropic (all true) vs OpenCode (mcp=false, lsp=false)
- **Edge Cases**: Empty array handling, mixed capability arrays need verification

---

## What

**User-Visible Behavior and Technical Requirements**:

### Test Coverage Requirements

**AnthropicProvider Tests** (src/__tests__/unit/providers/anthropic-provider-supports.test.ts):
- Test `supports()` returns true for all 6 capabilities (mcp, skills, lsp, streaming, sessions, extendedThinking)
- Test `requiresFeatures()` returns true when all features supported
- Test `requiresFeatures()` returns true for empty array
- Test `requiresFeatures()` handles single-element arrays
- Test `requiresFeatures()` handles all-capabilities array

**OpenCodeProvider Tests** (src/__tests__/unit/providers/opencode-provider-supports.test.ts):
- Test `supports()` returns false for mcp (disabled in OpenCode)
- Test `supports()` returns false for lsp (disabled in OpenCode)
- Test `supports()` returns true for skills, streaming, sessions, extendedThinking
- Test `requiresFeatures()` returns false when mcp or lsp in requirements
- Test `requiresFeatures()` returns true when only requesting enabled features
- Test edge cases same as AnthropicProvider

**Comparative Tests** (optional but recommended):
- Test that AnthropicProvider.supports('mcp') === true
- Test that OpenCodeProvider.supports('mcp') === false
- Document provider capability differences through tests

### Success Criteria

- [ ] anthropic-provider-supports.test.ts created with 10+ tests
- [ ] opencode-provider-supports.test.ts created with 10+ tests
- [ ] All 6 capabilities tested for each provider
- [ ] Edge cases covered (empty array, single element, all capabilities)
- [ ] Provider differences documented in tests
- [ ] All tests pass: `npm test -- provider-*-supports.test.ts`
- [ ] Tests follow existing patterns (beforeEach, describe/it, expect)
- [ ] Tests use Vitest framework

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact test file locations and naming conventions
- Complete test patterns from existing tests
- Provider capability values (what's true/false)
- Test framework setup (Vitest)
- Validation commands to verify success
- Contract from P3.M1.T1.S1 defining what methods exist

---

### Documentation & References

```yaml
# MUST READ - Contract from P3.M1.T1.S1
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T1S1/PRP.md
  why: Defines what supports() and requiresFeatures() methods exist
  section: Goal, Implementation Blueprint, Implementation Tasks
  critical: Methods are implemented at lines 105-117 (Anthropic) and 133-145 (OpenCode)

# MUST READ - Existing AnthropicProvider test patterns
- file: src/__tests__/unit/providers/anthropic-provider.test.ts
  why: Shows test structure, beforeEach patterns, capability testing
  pattern: Lines 22-66 show how to test id and capabilities properties
  gotcha: Use beforeEach for provider instance creation

# MUST READ - Existing method-specific test patterns
- file: src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
  why: Shows how to structure tests for a specific method
  pattern: describe blocks for different scenarios, it() for individual tests
  gotcha: Test both positive and negative cases

# MUST READ - AnthropicProvider implementation
- file: src/providers/anthropic-provider.ts
  why: Shows the methods being tested and their implementation
  lines: 105-117 (supports() and requiresFeatures() implementations)
  lines: 84-97 (capabilities definition - all true)
  critical: All capabilities are true for AnthropicProvider

# MUST READ - OpenCodeProvider implementation
- file: src/providers/opencode-provider.ts
  why: Shows the methods being tested and their implementation
  lines: 133-145 (supports() and requiresFeatures() implementations)
  lines: 112-125 (capabilities definition - mcp=false, lsp=false)
  critical: mcp and lsp are false for OpenCodeProvider

# MUST READ - ProviderCapabilities type definition
- file: src/types/providers.ts
  why: Shows all 6 capability keys that must be tested
  lines: 15-28 (ProviderCapabilities interface)
  critical: mcp, skills, lsp, streaming, sessions, extendedThinking

# MUST READ - Test framework configuration
- file: package.json
  why: Shows test scripts and framework
  lines: 34-35 (test scripts: "test": "vitest run", "test:watch": "vitest")
  critical: Use npm test to run tests

# MUST READ - External research (created by parallel agent)
- file: GROUNDSWELL-CAPABILITY-TESTING-GUIDE.md
  why: Comprehensive testing guide with concrete examples
  section: Part 1 (supports() tests), Part 2 (requiresFeatures() tests), Part 3 (comparative)
  critical: Copy-pasteable test templates for both providers
```

---

### Current Codebase Tree

```bash
src/
├── providers/
│   ├── anthropic-provider.ts           # Lines 105-117: capability methods to test
│   │                                    # Lines 84-97: capabilities (all true)
│   └── opencode-provider.ts            # Lines 133-145: capability methods to test
│                                        # Lines 112-125: capabilities (mcp=false, lsp=false)
├── types/
│   └── providers.ts                    # Lines 15-28: ProviderCapabilities type
└── __tests__/
    └── unit/
        └── providers/
            ├── anthropic-provider.test.ts           # Structure patterns
            ├── anthropic-provider-normalizemodel.test.ts  # Method-specific patterns
            ├── opencode-provider-*-test.ts          # OpenCode test patterns
            └── (P3.M1.T1.S2 will add tests here)
```

---

### Desired Codebase Tree with Files to be Added

```bash
# NEW FILES:

# src/__tests__/unit/providers/anthropic-provider-supports.test.ts
# - Tests for AnthropicProvider.supports() method (all 6 capabilities return true)
# - Tests for AnthropicProvider.requiresFeatures() method
# - Tests for empty arrays, single elements, all capabilities
# - Follows patterns from anthropic-provider-normalizemodel.test.ts

# src/__tests__/unit/providers/opencode-provider-supports.test.ts
# - Tests for OpenCodeProvider.supports() method (mcp=false, lsp=false, others=true)
# - Tests for OpenCodeProvider.requiresFeatures() method
# - Tests show provider returns false for mcp/lsp combinations
# - Same structure as anthropic-provider-supports.test.ts
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: AnthropicProvider has ALL capabilities true
// mcp: true, skills: true, lsp: true, streaming: true, sessions: true, extendedThinking: true
// All supports() calls should return true for AnthropicProvider

// CRITICAL: OpenCodeProvider has SOME capabilities false
// mcp: false, lsp: false (disabled - LLM-only mode)
// skills: true, streaming: true, sessions: true, extendedThinking: true
// supports('mcp') and supports('lsp') should return false

// CRITICAL: requiresFeatures() empty array behavior
// [].every() returns true by default in JavaScript
// requiresFeatures([]) should return true for both providers
// This is correct behavior - no requirements = always satisfied

// CRITICAL: Test file naming convention
// Pattern: {provider}-{method}.test.ts
// Examples: anthropic-provider-supports.test.ts, opencode-provider-supports.test.ts
// Don't use: capability-tests.test.ts (too generic)

// CRITICAL: Use beforeEach for test isolation
// Pattern: let provider: AnthropicProvider; beforeEach(() => { provider = new AnthropicProvider(); });
// Ensures each test gets a fresh provider instance

// CRITICAL: Import paths must use .js extension
// Pattern: import { AnthropicProvider } from '../../../providers/anthropic-provider.js';
// Even though source files are .ts, imports use .js for TypeScript module resolution

// CRITICAL: Vitest imports
// Pattern: import { describe, it, expect, beforeEach } from 'vitest';
// Use describe for grouping, it for individual tests, expect for assertions

// CRITICAL: Test organization patterns
// Use describe() blocks to group related tests
// Use it() for individual test cases with descriptive names
// Pattern: describe('supports()', () => { describe('positive cases', () => { it('should return true for mcp', () => { ... }); }); });

// CRITICAL: Capability keys are keyof ProviderCapabilities
// The 6 capabilities are: 'mcp', 'skills', 'lsp', 'streaming', 'sessions', 'extendedThinking'
// Tests should cover ALL 6 capabilities

// CRITICAL: Provider differences are important to test
// AnthropicProvider: supports('mcp') === true
// OpenCodeProvider: supports('mcp') === false
// These differences should be explicitly tested

// CRITICAL: Test both true and false cases
// Don't just test that capabilities are true
// Test false cases too (especially for OpenCodeProvider)

// CRITICAL: Type safety tests
// Verify that methods accept only valid capability keys
// Use @ts-expect-error for testing invalid inputs

// CRITICAL: Run tests with npm test
// Command: npm test -- provider-*-supports.test.ts
// Or for specific file: npm test -- anthropic-provider-supports.test.ts

// CRITICAL: No async/await needed
// supports() and requiresFeatures() are synchronous methods
// Don't use async/await in tests for these methods

// CRITICAL: OpenCodeProvider is deprecated
// Still test it for consistency, but note it's deprecated since v1.5.0
// Tests ensure it works correctly even though deprecated
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - testing existing methods:

```typescript
// Methods being tested (from P3.M1.T1.S1 contract):

// AnthropicProvider.supports()
// File: src/providers/anthropic-provider.ts (lines 105-107)
supports(capability: keyof ProviderCapabilities): boolean {
  return this.capabilities[capability];
}

// AnthropicProvider.requiresFeatures()
// File: src/providers/anthropic-provider.ts (lines 115-117)
requiresFeatures(features: (keyof ProviderCapabilities)[]): boolean {
  return features.every(f => this.capabilities[f]);
}

// Same methods in OpenCodeProvider (lines 133-145)

// ProviderCapabilities type
// File: src/types/providers.ts (lines 15-28)
interface ProviderCapabilities {
  mcp: boolean;
  skills: boolean;
  lsp: boolean;
  streaming: boolean;
  sessions: boolean;
  extendedThinking: boolean;
}

// AnthropicProvider capabilities (lines 84-97)
capabilities: ProviderCapabilities = {
  mcp: true,
  skills: true,
  lsp: true,
  streaming: true,
  sessions: true,
  extendedThinking: true,
}

// OpenCodeProvider capabilities (lines 112-125)
capabilities: ProviderCapabilities = {
  mcp: false,
  skills: true,
  lsp: false,
  streaming: true,
  sessions: true,
  extendedThinking: true,
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/unit/providers/anthropic-provider-supports.test.ts
  - IMPLEMENT: Tests for supports() method with all 6 capabilities
  - IMPLEMENT: Tests for requiresFeatures() with various scenarios
  - FOLLOW pattern: src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
  - NAMING: Descriptive test names ("should return true for mcp capability")
  - COVERAGE: All 6 capabilities, empty array, single element, all capabilities
  - PLACEMENT: src/__tests__/unit/providers/

Task 2: CREATE src/__tests__/unit/providers/opencode-provider-supports.test.ts
  - IMPLEMENT: Tests for supports() method (mcp=false, lsp=false)
  - IMPLEMENT: Tests for requiresFeatures() with mixed scenarios
  - FOLLOW pattern: Same structure as anthropic-provider-supports.test.ts
  - COVERAGE: All 6 capabilities, false cases for mcp/lsp
  - PLACEMENT: src/__tests__/unit/providers/

Task 3: VERIFY test execution
  - COMMAND: npm test -- anthropic-provider-supports.test.ts
  - COMMAND: npm test -- opencode-provider-supports.test.ts
  - VERIFY: All tests pass
  - VERIFY: No TypeScript errors
  - VERIFY: Test output shows expected number of tests

Task 4: (OPTIONAL) CREATE comparative tests
  - CREATE: Test showing AnthropicProvider.supports('mcp') === true
  - CREATE: Test showing OpenCodeProvider.supports('mcp') === false
  - DOCUMENT: Provider capability differences through tests
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Test file structure
// File: src/__tests__/unit/providers/anthropic-provider-supports.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../providers/anthropic-provider.js';

describe('AnthropicProvider.supports()', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
  });

  describe('positive cases - all capabilities supported', () => {
    it('should return true for "mcp" capability', () => {
      expect(provider.supports('mcp')).toBe(true);
    });

    it('should return true for "skills" capability', () => {
      expect(provider.supports('skills')).toBe(true);
    });

    it('should return true for "lsp" capability', () => {
      expect(provider.supports('lsp')).toBe(true);
    });

    it('should return true for "streaming" capability', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should return true for "sessions" capability', () => {
      expect(provider.supports('sessions')).toBe(true);
    });

    it('should return true for "extendedThinking" capability', () => {
      expect(provider.supports('extendedThinking')).toBe(true);
    });
  });
});

describe('AnthropicProvider.requiresFeatures()', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
  });

  describe('all features supported', () => {
    it('should return true when all requested features are supported', () => {
      const result = provider.requiresFeatures(['mcp', 'skills', 'streaming']);
      expect(result).toBe(true);
    });

    it('should return true for single supported feature', () => {
      const result = provider.requiresFeatures(['mcp']);
      expect(result).toBe(true);
    });

    it('should return true for all capabilities', () => {
      const allCapabilities: (keyof ProviderCapabilities)[] = [
        'mcp', 'skills', 'lsp', 'streaming', 'sessions', 'extendedThinking'
      ];
      const result = provider.requiresFeatures(allCapabilities);
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return true for empty array (no requirements)', () => {
      const result = provider.requiresFeatures([]);
      expect(result).toBe(true);
    });

    it('should handle single-element array', () => {
      const result = provider.requiresFeatures(['mcp']);
      expect(result).toBe(true);
    });
  });
});


// PATTERN 2: OpenCodeProvider test file (showing false cases)
// File: src/__tests__/unit/providers/opencode-provider-supports.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCodeProvider } from '../../../providers/opencode-provider.js';

describe('OpenCodeProvider.supports()', () => {
  let provider: OpenCodeProvider;

  beforeEach(() => {
    provider = new OpenCodeProvider();
  });

  describe('disabled capabilities', () => {
    it('should return false for "mcp" capability', () => {
      expect(provider.supports('mcp')).toBe(false);
    });

    it('should return false for "lsp" capability', () => {
      expect(provider.supports('lsp')).toBe(false);
    });
  });

  describe('enabled capabilities', () => {
    it('should return true for "skills" capability', () => {
      expect(provider.supports('skills')).toBe(true);
    });

    it('should return true for "streaming" capability', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should return true for "sessions" capability', () => {
      expect(provider.supports('sessions')).toBe(true);
    });

    it('should return true for "extendedThinking" capability', () => {
      expect(provider.supports('extendedThinking')).toBe(true);
    });
  });
});

describe('OpenCodeProvider.requiresFeatures()', () => {
  let provider: OpenCodeProvider;

  beforeEach(() => {
    provider = new OpenCodeProvider();
  });

  describe('some features unsupported', () => {
    it('should return false when any feature is unsupported', () => {
      const result = provider.requiresFeatures(['mcp', 'streaming']);
      expect(result).toBe(false); // mcp is false
    });

    it('should return true when only checking supported features', () => {
      const result = provider.requiresFeatures(['streaming', 'sessions']);
      expect(result).toBe(true); // both are true
    });

    it('should return false when multiple features are unsupported', () => {
      const result = provider.requiresFeatures(['mcp', 'lsp']);
      expect(result).toBe(false); // both are false
    });
  });

  describe('edge cases', () => {
    it('should return true for empty array (no requirements)', () => {
      const result = provider.requiresFeatures([]);
      expect(result).toBe(true);
    });
  });
});


// PATTERN 3: Comparative test (optional, shows provider differences)
// File: src/__tests__/unit/providers/provider-capability-comparison.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../providers/anthropic-provider.js';
import { OpenCodeProvider } from '../../../providers/opencode-provider.js';

describe('Provider Capability Comparison', () => {
  let anthropic: AnthropicProvider;
  let opencode: OpenCodeProvider;

  beforeEach(() => {
    anthropic = new AnthropicProvider();
    opencode = new OpenCodeProvider();
  });

  describe('mcp capability difference', () => {
    it('AnthropicProvider should support mcp', () => {
      expect(anthropic.supports('mcp')).toBe(true);
    });

    it('OpenCodeProvider should not support mcp', () => {
      expect(opencode.supports('mcp')).toBe(false);
    });
  });

  describe('lsp capability difference', () => {
    it('AnthropicProvider should support lsp', () => {
      expect(anthropic.supports('lsp')).toBe(true);
    });

    it('OpenCodeProvider should not support lsp', () => {
      expect(opencode.supports('lsp')).toBe(false);
    });
  });

  describe('common capabilities', () => {
    it('both providers should support skills', () => {
      expect(anthropic.supports('skills')).toBe(true);
      expect(opencode.supports('skills')).toBe(true);
    });

    it('both providers should support streaming', () => {
      expect(anthropic.supports('streaming')).toBe(true);
      expect(opencode.supports('streaming')).toBe(true);
    });
  });

  describe('requiresFeatures() differences', () => {
    it('AnthropicProvider should support mcp + lsp combination', () => {
      expect(anthropic.requiresFeatures(['mcp', 'lsp'])).toBe(true);
    });

    it('OpenCodeProvider should not support mcp + lsp combination', () => {
      expect(opencode.requiresFeatures(['mcp', 'lsp'])).toBe(false);
    });
  });
});


// GOTCHA 1: AnthropicProvider has ALL capabilities true
// Don't test for false capabilities in AnthropicProvider
// All 6 capabilities return true for AnthropicProvider

// GOTCHA 2: OpenCodeProvider has SOME capabilities false
// mcp: false, lsp: false
// These are important to test explicitly

// GOTCHA 3: Empty array handling
// requiresFeatures([]) returns true
// This is correct JavaScript behavior ([].every() returns true)

// GOTCHA 4: Import paths use .js extension
// Even though source is .ts, imports use .js
// import { AnthropicProvider } from '../../../providers/anthropic-provider.js';

// GOTCHA 5: Use beforeEach for test isolation
// Each test should get a fresh provider instance
// Prevents state leakage between tests

// GOTCHA 6: Test naming convention
// Use descriptive names: "should return true for mcp capability"
// Don't use: "test mcp" (too vague)

// GOTCHA 7: No async/await needed
// supports() and requiresFeatures() are synchronous
// Don't use async/await in these tests

// GOTCHA 8: Test organization
// Use describe blocks to group related tests
// Makes test output more readable

// GOTCHA 9: Type safety tests
// Can add @ts-expect-error tests for invalid capability keys
// Documents that TypeScript catches invalid inputs

// GOTCHA 10: Provider differences are important
// Explicitly test that different providers have different capabilities
// This documents the architectural differences
```

---

### Integration Points

```yaml
P3.M1.T1.S1 CONTRACT:
  - file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T1S1/PRP.md
    dependency: Methods must be implemented first
    verify: Check src/providers/anthropic-provider.ts lines 105-117 exist

ANTHROPIC PROVIDER:
  - file: src/providers/anthropic-provider.ts
    test: Lines 105-117 (supports() and requiresFeatures())
    test: Lines 84-97 (capabilities - all true)

OPENCODE PROVIDER:
  - file: src/providers/opencode-provider.ts
    test: Lines 133-145 (supports() and requiresFeatures())
    test: Lines 112-125 (capabilities - mcp=false, lsp=false)

TYPE DEPENDENCIES:
  - src/types/providers.ts:15-28 - ProviderCapabilities interface

TEST FRAMEWORK:
  - framework: Vitest v1.0.0
  - command: npm test -- <test-file-pattern>
  - config: vitest.config.ts (globals enabled)

EXISTING TESTS:
  - src/__tests__/unit/providers/anthropic-provider.test.ts - Structure patterns
  - src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts - Method patterns
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating each test file - fix before proceeding
npm test -- anthropic-provider-supports.test.ts
npm test -- opencode-provider-supports.test.ts

# Expected: All tests pass. If failing:
# - Check import paths (use .js extension)
# - Check method names (supports, requiresFeatures)
# - Check capability names (mcp, skills, lsp, streaming, sessions, extendedThinking)
# - Check assertion values (true for Anthropic, mixed for OpenCode)
```

### Level 2: Test Coverage Validation (Component Validation)

```bash
# Run tests for specific provider
npm test -- anthropic-provider-supports.test.ts

# Check test count
# Expected: 10+ tests for each provider

# Run all provider tests
npm test -- provider-*-supports.test.ts

# Expected: All tests pass, no skipped tests
```

### Level 3: Integration Testing (System Validation)

```bash
# Run entire provider test suite
npm test -- src/__tests__/unit/providers/

# Verify new tests don't break existing tests
npm test

# Expected: All tests pass (existing + new)
```

### Level 4: Type Safety Validation

```bash
# Verify TypeScript compilation
npm run lint

# Expected: No type errors
# Import paths should resolve correctly
```

---

## Final Validation Checklist

### Technical Validation

- [ ] anthropic-provider-supports.test.ts created
- [ ] opencode-provider-supports.test.ts created
- [ ] All 6 capabilities tested for AnthropicProvider
- [ ] All 6 capabilities tested for OpenCodeProvider
- [ ] Empty array edge case tested
- [ ] Single element array tested
- [ ] All capabilities array tested
- [ ] Provider differences tested (mcp, lsp)
- [ ] All tests pass: `npm test -- provider-*-supports.test.ts`
- [ ] No TypeScript errors: `npm run lint`

### Feature Validation

- [ ] AnthropicProvider.supports() returns true for all capabilities
- [ ] OpenCodeProvider.supports() returns false for mcp and lsp
- [ ] requiresFeatures() returns true when all features supported
- [ ] requiresFeatures() returns false when any feature unsupported
- [ ] requiresFeatures() returns true for empty array
- [ ] Tests follow existing patterns (beforeEach, describe/it)

### Code Quality Validation

- [ ] Test files follow naming convention ({provider}-{method}.test.ts)
- [ ] Import paths use .js extension
- [ ] Tests use Vitest framework (describe, it, expect, beforeEach)
- [ ] Test names are descriptive
- [ ] Tests are organized with describe blocks
- [ ] No async/await used (methods are synchronous)

### Documentation & Deployment

- [ ] Tests document expected behavior
- [ ] Tests show provider capability differences
- [ ] Tests serve as examples for capability checking API usage

---

## Anti-Patterns to Avoid

- ❌ Don't test implementation details - test public API behavior
- ❌ Don't skip testing all 6 capabilities - test each one
- ❌ Don't forget false cases for OpenCodeProvider
- ❌ Don't use async/await - methods are synchronous
- ❌ Don't use wrong import paths - must use .js extension
- ❌ Don't skip beforeEach - use it for test isolation
- ❌ Don't use vague test names - be descriptive
- ❌ Don't skip edge cases - test empty arrays
- ❌ Don't ignore provider differences - test them explicitly
- ❌ Don't duplicate tests - each test should verify unique behavior

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Simple test writing task - no complex logic
- ✅ Clear deliverable (2 test files)
- ✅ Complete patterns to follow from existing tests
- ✅ Known values (what's true/false for each provider)
- ✅ Comprehensive validation commands
- ✅ No external dependencies needed
- ✅ Test framework already configured
- ✅ Methods already implemented (P3.M1.T1.S1)
- ✅ Edge cases well-defined
- ✅ Research provides concrete templates

**Validation**: Writing tests is straightforward following existing patterns. The implementation being tested is simple property access wrappers. All context is provided including exact file locations, test patterns, and expected values. High confidence for one-pass implementation.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
