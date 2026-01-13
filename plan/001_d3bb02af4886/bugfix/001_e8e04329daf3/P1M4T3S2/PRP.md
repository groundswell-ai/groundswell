# Product Requirement Prompt (PRP) - P1.M4.T3.S2

## Goal

**Feature Goal**: Create a comprehensive backward compatibility test suite that validates all existing API usage patterns continue to work after bug fixes, and ensures breaking changes fail with clear, actionable error messages directing users to the correct migration path.

**Deliverable**: A new test file `src/__tests__/compatibility/backward-compatibility.test.ts` containing tests that verify:
1. All existing code patterns from documentation/examples work correctly
2. Old API patterns continue to function (backward compatible changes)
3. Breaking changes fail with descriptive error messages
4. Migration examples from documentation work as expected

**Success Definition**:
- All backward compatibility tests pass (100% success rate)
- Breaking change (workflow name validation) provides clear error messages
- Existing documentation examples run without modification
- Total test coverage includes backward compatibility scenarios

## User Persona

**Target User**: Library maintainers and developers who need to ensure that bug fixes don't break existing user code.

**Use Case**: After implementing bug fixes for version 0.0.3 → 0.0.4, verify that existing user code continues to work and that the one breaking change (workflow name validation) is well-documented with clear error messages.

**User Journey**:
1. Run the backward compatibility test suite after bug fixes
2. Verify all existing usage patterns still work
3. Confirm breaking changes have clear error messages
4. Use tests as documentation for migration paths

**Pain Points Addressed**:
- Fear of breaking existing user code with bug fixes
- Unclear error messages when breaking changes occur
- Lack of automated validation for backward compatibility

## Why

- **Business value**: Maintains user trust by ensuring updates don't silently break their code
- **Integration with existing features**: Validates that all 8 bug fixes preserve expected behavior
- **Problems this solves**: Provides automated confidence that the library's public API remains stable except for documented breaking changes

## What

Create a comprehensive backward compatibility test suite that:

1. Tests all 11 example files from `examples/examples/` directory work correctly
2. Validates all README documentation examples execute without error
3. Confirms backward compatible API changes (WorkflowLogger.child(), Promise.allSettled) maintain old behavior
4. Verifies the one breaking change (workflow name validation) has clear error messages
5. Tests decorator usage patterns from documentation
6. Validates parent-child workflow patterns
7. Tests functional workflow factory patterns

### Success Criteria

- [ ] All backward compatibility tests pass
- [ ] Examples from `examples/` directory run successfully
- [ ] README quick start examples execute without modification
- [ ] Old API patterns (string-based logger.child(), Promise.all behavior) work correctly
- [ ] Breaking change (name validation) throws descriptive errors
- [ ] Test file follows existing patterns from `src/__tests__/unit/`

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully? ✓ YES

This PRP includes:
- Specific file paths and patterns to follow
- Complete breaking changes audit from S1
- Existing test patterns to emulate
- All documentation examples to test
- Exact test framework configuration
- Validation commands specific to this project

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Breaking Changes Audit - Complete analysis of all 8 bug fixes
- file: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T3S1/BREAKING_CHANGES_AUDIT.md
  why: Contains complete analysis of 1 breaking change (workflow name validation) and 7 non-breaking changes
  critical: Only LOW severity breaking change: Workflow constructor now rejects empty/whitespace/long names (>100 chars)
  gotcha: All other changes are backward compatible via function overloads or default behavior preservation

# Existing Test Patterns - Follow these patterns
- file: src/__tests__/unit/workflow.test.ts
  why: Shows Vitest testing patterns, Workflow class testing, error assertion patterns
  pattern: describe/it structure, expect().toThrow() for error validation, async test patterns

- file: src/__tests__/unit/logger.test.ts
  why: Shows backward compatibility testing for WorkflowLogger.child() signature change
  pattern: Tests both old (string) and new (Partial<LogEntry>) API patterns, parameterized tests with it.each

- file: src/__tests__/adversarial/concurrent-task-failures.test.ts
  why: Shows Promise.allSettled backward compatibility testing
  pattern: Validates default behavior (throw first error) is preserved

# Examples to Test - All 11 example files should execute without modification
- file: examples/examples/01-basic-workflow.ts
  why: Basic class-based workflow pattern - most common usage

- file: examples/examples/02-decorator-options.ts
  why: All @Step, @Task, @ObservedState decorator options

- file: examples/examples/03-parent-child.ts
  why: Parent-child workflow hierarchy patterns

- file: examples/examples/05-error-handling.ts
  why: Error handling patterns with WorkflowError

- file: examples/examples/06-concurrent-tasks.ts
  why: @Task concurrent execution patterns

# Documentation Examples
- file: README.md
  why: Quick start examples are primary user onboarding patterns
  section: Lines 17-84 contain all quick start examples

- file: docs/workflow.md
  why: Complete API reference with usage examples
  section: Lines 17-258 document all workflow patterns

# External Best Practices
- url: https://semver.org/spec/v2.0.0.html
  why: Semantic versioning definition of breaking changes
  critical: MAJOR = incompatible API changes, PATCH = backward-compatible bug fixes

- url: https://vitest.dev/guide/
  why: Vitest testing framework documentation
  critical: Project uses Vitest for all tests

- url: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes
  why: TypeScript-specific breaking change patterns
  critical: Adding optional interface properties is non-breaking
```

### Current Codebase Structure

```bash
groundswell/
├── src/
│   ├── __tests__/
│   │   ├── unit/              # Unit tests (17 test files)
│   │   ├── integration/       # Integration tests (5 test files)
│   │   ├── adversarial/       # Adversarial/edge case tests (13 test files)
│   │   └── helpers/           # Test utilities (tree-verification.ts, index.ts)
│   ├── core/                  # Core classes (Workflow, WorkflowLogger, Agent)
│   ├── decorators/            # @Step, @Task, @ObservedState decorators
│   ├── types/                 # TypeScript type definitions
│   └── index.ts               # Public API exports
├── examples/
│   └── examples/              # 11 runnable example files
├── dist/                      # Compiled TypeScript output
├── vitest.config.ts           # Vitest configuration
└── package.json               # Project scripts and dependencies
```

### Desired Codebase Structure with Files to be Added

```bash
src/__tests__/
├── compatibility/             # NEW: Backward compatibility tests
│   └── backward-compatibility.test.ts    # NEW: Main backward compatibility test suite
├── unit/                      # Existing unit tests
├── integration/               # Existing integration tests
└── adversarial/               # Existing adversarial tests
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Vitest requires specific import pattern
// Use: import { describe, it, expect } from 'vitest';
// NOT: import { test } from 'node:test';

// CRITICAL: Workflow constructor has TWO patterns
// Pattern 1: Class-based (extends Workflow)
class MyWorkflow extends Workflow {
  constructor(name?: string) { super(name); }
}

// Pattern 2: Functional
const wf = new Workflow({ name: 'MyWorkflow' }, async (ctx) => { ... });

// GOTCHA: Workflow name validation applies to BOTH patterns
// Empty string, whitespace-only, and names >100 chars throw Error

// CRITICAL: WorkflowLogger.child() has TWO valid signatures
// Old API (backward compatible):
logger.child('parent-log-id')

// New API:
logger.child({ parentLogId: 'parent-log-id' })

// GOTCHA: @Task with concurrent: true still throws first error by default
// This preserves Promise.all() behavior despite using Promise.allSettled()
// Only when errorMergeStrategy.enabled = true does behavior change

// CRITICAL: Test files must end in .test.ts for Vitest to pick them up
// Place in src/__tests__/compatibility/ directory
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed - testing existing public API patterns.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/compatibility/backward-compatibility.test.ts
  - IMPLEMENT: Comprehensive backward compatibility test suite
  - FOLLOW pattern: src/__tests__/unit/workflow.test.ts (describe/it structure, expect().toThrow())
  - NAMING: Descriptive test names following pattern "should {expected behavior}"
  - PLACEMENT: New compatibility/ directory under __tests__/

Task 2: ADD Tests for Breaking Change (Workflow Name Validation)
  - IMPLEMENT: Tests that verify empty/whitespace/long names throw clear errors
  - FOLLOW pattern: src/__tests__/unit/workflow.test.ts lines 13-85 (name validation tests)
  - VALIDATE: Error messages are descriptive and guide users to fix
  - COVER: Both class-based and functional constructor patterns

Task 3: ADD Tests for Backward Compatible Changes (WorkflowLogger.child())
  - IMPLEMENT: Tests that string-based API still works
  - FOLLOW pattern: src/__tests__/unit/logger.test.ts lines 90-140
  - VALIDATE: Both string and Partial<LogEntry> parameters work
  - COVER: All log levels (debug, info, warn, error)

Task 4: ADD Tests for Backward Compatible Changes (Promise.allSettled)
  - IMPLEMENT: Tests that concurrent tasks still throw first error by default
  - FOLLOW pattern: src/__tests__/adversarial/concurrent-task-failures.test.ts
  - VALIDATE: Default behavior matches old Promise.all() behavior
  - COVER: Single task failure, multiple task failure scenarios

Task 5: ADD Tests for Documentation Examples
  - IMPLEMENT: Tests that execute README quick start examples
  - REFERENCE: README.md lines 17-84
  - VALIDATE: All examples run without modification
  - COVER: Class-based, functional, decorator, and agent patterns

Task 6: ADD Tests for Example Files
  - IMPLEMENT: Tests that import and instantiate classes from examples/
  - REFERENCE: All 11 files in examples/examples/
  - VALIDATE: Example workflows can be created and run
  - COVER: Basic workflow, decorators, parent-child, error handling, concurrent tasks

Task 7: ADD Tests for Decorator Patterns
  - IMPLEMENT: Tests for @Step, @Task, @ObservedState with various options
  - REFERENCE: examples/examples/02-decorator-options.ts
  - VALIDATE: All decorator option combinations work
  - COVER: name, trackTiming, snapshotState, concurrent, errorMergeStrategy options

Task 8: ADD Tests for Parent-Child Patterns
  - IMPLEMENT: Tests for hierarchical workflow creation
  - REFERENCE: examples/examples/03-parent-child.ts
  - VALIDATE: Parent-child relationships establish correctly
  - COVER: Constructor with parent parameter, @Task decorator with parent

Task 9: UPDATE vitest.config.ts (if needed)
  - VERIFY: Test include pattern covers new compatibility directory
  - CURRENT: include: ['src/__tests__/**/*.test.ts']
  - ACTION: Should already cover new files, verify no changes needed

Task 10: RUN Full Test Suite
  - EXECUTE: npm test or vitest run
  - VALIDATE: All 479 existing tests still pass
  - VALIDATE: New backward compatibility tests pass
  - RESULT: 100% test pass rate
```

### Implementation Patterns & Key Details

```typescript
// CRITICAL: Test file structure for backward-compatibility.test.ts

import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowLogger, Step, Task, ObservedState } from '../../index.js';

// Pattern 1: Test file structure - nested describe blocks
describe('Backward Compatibility Tests', () => {
  describe('Breaking Changes - Workflow Name Validation', () => {
    // Tests for the 1 breaking change
  });

  describe('Backward Compatible Changes - WorkflowLogger.child()', () => {
    // Tests for old API patterns that still work
  });

  describe('Documentation Examples', () => {
    // Tests from README.md and docs/
  });

  describe('Example Files', () => {
    // Tests from examples/examples/
  });
});

// Pattern 2: Breaking change test with error message validation
it('should throw descriptive error for empty workflow name', () => {
  expect(() => new Workflow({ name: '' }, async () => {}))
    .toThrow('Workflow name cannot be empty or whitespace only');
});

// Pattern 3: Backward compatibility test - old API still works
it('should support string-based logger.child() API (backward compatible)', async () => {
  class TestWorkflow extends Workflow {
    async run() {
      // Old API - should still work
      const childLogger = this.logger.child('parent-log-id');
      childLogger.info('Test message');
    }
  }

  const workflow = new TestWorkflow();
  await workflow.run();

  expect(workflow.node.logs[0].parentLogId).toBe('parent-log-id');
});

// Pattern 4: Test from documentation - execute README example
it('should execute README class-based workflow example', async () => {
  // From README.md lines 50-57
  class DataProcessingWorkflow extends Workflow {
    private data: string[] = [];

    async run(): Promise<string[]> {
      this.setStatus('running');
      this.data = ['item1', 'item2'];
      this.setStatus('completed');
      return this.data;
    }
  }

  const workflow = new DataProcessingWorkflow('DataPipeline');
  const result = await workflow.run();

  expect(result).toEqual(['item1', 'item2']);
  expect(workflow.status).toBe('completed');
});

// Pattern 5: Parameterized tests with it.each
it.each([
  { name: 'Basic', decorator: Step },
  { name: 'With timing', decorator: Step.bind(null, { trackTiming: true }) },
])('should support @Step decorator: $name', async ({ name, decorator }) => {
  // Test implementation
});

// GOTCHA: Always use async/await for workflow.run()
// The run() method returns a Promise, must await it

// GOTCHA: Import from index.js (compiled output), not .ts files
// This tests the actual public API, not internal implementation
import { Workflow } from '../../index.js';  // CORRECT
import { Workflow } from '../../core/workflow';  // WRONG - tests internals
```

### Integration Points

```yaml
TEST_DIRECTORY:
  - create: src/__tests__/compatibility/
  - purpose: Dedicated directory for backward compatibility tests
  - pattern: Matches existing test structure (unit/, integration/, adversarial/)

VITEST_CONFIG:
  - file: vitest.config.ts
  - current_pattern: include: ['src/__tests__/**/*.test.ts']
  - change_needed: NO - existing pattern includes new compatibility directory

PACKAGE_SCRIPTS:
  - test: "vitest run" - runs all tests including new compatibility tests
  - test:watch: "vitest" - watch mode for development
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating backward-compatibility.test.ts
npx tsc --noEmit src/__tests__/compatibility/backward-compatibility.test.ts

# Type check the new file
npx tsc --noEmit

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test only the new backward compatibility file
npx vitest run src/__tests__/compatibility/backward-compatibility.test.ts

# Test with verbose output
npx vitest run src/__tests__/compatibility/backward-compatibility.test.ts --reporter=verbose

# Full test suite for affected areas
npx vitest run src/__tests__/compatibility/

# Expected: All new backward compatibility tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite - ensure no regressions
npm test

# Verify test count increased appropriately
# Current: 479 tests
# Expected: 479 + (number of new backward compatibility tests)

# Run specific test categories
npx vitest run src/__tests__/unit/
npx vitest run src/__tests__/integration/
npx vitest run src/__tests__/adversarial/

# Expected: All existing tests still pass, new tests pass
```

### Level 4: Documentation & Example Validation

```bash
# Run example files to ensure they work
npm run start:01-basic-workflow
npm run start:02-decorator-options
npm run start:03-parent-child
npm run start:05-error-handling
npm run start:06-concurrent-tasks

# Expected: All example files run successfully without modification

# Verify README examples can be executed
# (Copy code snippets from README and run in Node.js REPL)
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test` shows 100% pass rate
- [ ] No type errors: `npx tsc --noEmit` completes cleanly
- [ ] Breaking change tests verify clear error messages
- [ ] Backward compatibility tests verify old APIs still work
- [ ] Documentation example tests all pass

### Feature Validation

- [ ] Workflow name validation throws descriptive errors for invalid names
- [ ] Old logger.child() string API still works (backward compatible)
- [ ] Promise.all behavior preserved (throws first error by default)
- [ ] All README examples execute without modification
- [ ] All 11 example files can be instantiated and run
- [ ] Decorator patterns from documentation work correctly

### Code Quality Validation

- [ ] Follows existing test patterns from src/__tests__/unit/
- [ ] File placement in src/__tests__/compatibility/ matches desired structure
- [ ] Test names follow "should {expected behavior}" convention
- [ ] Tests use describe/it structure from Vitest
- [ ] Import statements use ../../index.js (public API)

### Documentation & Deployment

- [ ] Test file is self-documenting with clear test descriptions
- [ ] Tests serve as executable documentation for API patterns
- [ ] Breaking change error messages are clear and actionable
- [ ] Migration path is obvious from test failures

---

## Anti-Patterns to Avoid

- ❌ Don't test internal implementation - test public API only
- ❌ Don't import from internal files - use `../../index.js`
- ❌ Don't skip testing the breaking change - it must have clear error messages
- ❌ Don't assume old APIs work - explicitly test them
- ❌ Don't test random edge cases - focus on documented usage patterns
- ❌ Don't modify existing tests - add new tests in compatibility directory
- ❌ Don't use sync execution - always await workflow.run()
- ❌ Don't forget to test both constructor patterns (class and functional)

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Validation**: The completed PRP contains:
- Complete breaking changes analysis from S1 audit
- Specific file patterns to follow
- All documentation examples to test
- Existing test patterns to emulate
- Exact validation commands
- Clear gotchas and anti-patterns

**Expected Outcome**: An AI agent unfamiliar with the codebase can implement this test suite successfully using only the PRP content and codebase access.
