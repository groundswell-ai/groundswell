# PRP: Run Unit Tests and Fix Failures

**PRP ID**: P1.M4.T1.S1
**Work Item**: Run unit tests and fix failures
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Execute the complete unit test suite using `npm test` and fix any failing tests to achieve 100% pass rate, ensuring the AgentResponse migration is fully validated.

**Deliverable**: All unit tests passing (100% pass rate) with no failing tests in `src/__tests__/unit/`.

**Success Definition**:
- Running `npm test` executes without errors
- All unit tests in `src/__tests__/unit/` pass
- Test output shows `X pass X fail` with 0 failures
- No skipped or pending tests (unless intentional)
- Test execution completes within reasonable time (< 60 seconds for unit tests)

---

## Why

**Business Value and User Impact**:
- **Quality assurance**: Passing tests ensure code changes don't break existing functionality
- **Regression prevention**: Catch issues before they reach production
- **Migration validation**: Verify AgentResponse changes work correctly across the codebase
- **Confidence in deployment**: 100% pass rate enables safe deployment

**Integration with Existing Features**:
- Builds upon completed work items:
  - **P1.M1**: `Agent.prompt()` now returns `AgentResponse<T>`
  - **P1.M2**: Zod schema validation added to `Agent.prompt()` return path
  - **P1.M3**: Migration guide and README documentation updated
- Validates that all AgentResponse changes are working correctly
- Ensures backward compatibility is maintained where required

**Problems This Solves**:
- Tests may fail after AgentResponse migration due to API changes
- Type mismatches between old return values and new `AgentResponse<T>` wrapper
- Missing status checks in test assertions
- Outdated test expectations from pre-migration code

---

## What

**User-Visible Behavior**:
- Developers run `npm test` and see all tests pass
- CI/CD pipeline executes tests without failures
- Test suite provides fast feedback on code changes

**Technical Requirements**:
- Execute `npm test` which runs Vitest with `vitest run` command
- Analyze test output for failures
- Fix failing tests by updating assertions and test patterns
- Ensure all AgentResponse-related tests follow PRD 6.4 compliance
- Run tests until 100% pass rate achieved

### Success Criteria

- [ ] All unit tests pass when running `npm test`
- [ ] No test failures in `src/__tests__/unit/` directory
- [ ] Test output shows `XX pass 0 fail` (zero failures)
- [ ] Tests complete in reasonable time (< 60 seconds)
- [ ] No console errors or warnings during test execution
- [ ] All AgentResponse tests validate PRD 6.4.4 (null over undefined)
- [ ] All error code tests validate PRD 6.2 requirements

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact test commands, common failure patterns, fix strategies, and references to test implementation details. An implementer unfamiliar with the codebase can run tests and fix failures using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: package.json
  why: Contains test command definition - use npm test
  section: scripts.test = "vitest run"
  critical: Test command is 'npm test', not 'vitest' directly

- file: vitest.config.ts
  why: Vitest configuration for test execution
  pattern: include: ['src/__tests__/**/*.test.ts'], globals: true
  critical: Tests use global describe/it/expect without imports

- file: SYSTEM_CONTEXT.md
  why: Contains test infrastructure overview
  section: "Testing Infrastructure" section
  critical: Unit tests located in src/__tests__/unit/, uses Vitest

- research: test-patterns.md
  why: Complete test patterns used in this codebase
  section: All sections - test structure, assertions, mocking
  critical: Shows describe/it patterns, AgentResponse testing, type guards

- research: common-test-failures.md
  why: Catalog of common test failures and their fixes
  section: All 12 failure types with fix examples
  critical: Type mismatches, missing status checks, error handling

- research: vitest-best-practices.md
  why: Vitest documentation and debugging strategies
  section: CLI commands, debugging options, failure fixes
  critical: How to run specific tests, debug failures, filter output

- research: agentresponse-implementation.md
  why: Complete AgentResponse implementation reference
  section: Type definitions, factory functions, error codes
  critical: Understanding what tests are validating

- file: src/__tests__/unit/agent-response.test.ts
  why: Reference for AgentResponse test patterns
  pattern: Zod schema validation, type guards, error codes
  critical: Example of proper AgentResponse testing

- file: src/__tests__/unit/agent-response-factory.test.ts
  why: Reference for factory function testing
  pattern: createSuccessResponse, createErrorResponse usage
  critical: Shows how to test factory functions

- file: src/__tests__/unit/agent-error-codes.test.ts
  why: Reference for error code testing patterns
  pattern: All 6 error codes tested with assertions
  critical: PRD 6.2 compliance validation

- file: src/types/agent.ts
  why: Source of AgentResponse type definitions
  pattern: Discriminated union, type guards, factory functions
  critical: Understanding the contract being tested
```

### Current Codebase Tree (test structure)

```bash
/home/dustin/projects/groundswell
├── package.json                 # Contains "test": "vitest run"
├── vitest.config.ts            # Vitest configuration
├── src/
│   ├── __tests__/
│   │   └── unit/               # Unit test directory (22 test files)
│   │       ├── agent-response.test.ts
│   │       ├── agent-response-factory.test.ts
│   │       ├── agent-response-public-api.test.ts
│   │       ├── agent-error-codes.test.ts
│   │       ├── agent.test.ts
│   │       ├── prompt.test.ts
│   │       ├── workflow.test.ts
│   │       ├── cache.test.ts
│   │       ├── decorators.test.ts
│   │       ├── tree-debugger.test.ts
│   │       ├── introspection-tools.test.ts
│   │       ├── observable.test.ts
│   │       ├── reflection.test.ts
│   │       ├── context.test.ts
│   │       ├── logger.test.ts
│   │       └── ... (other unit tests)
│   ├── core/
│   │   ├── agent.ts            # Agent.prompt() returns AgentResponse<T>
│   │   └── workflow.ts
│   └── types/
│       └── agent.ts            # AgentResponse type definitions
└── plan/
    └── 002_6761e4b84fd1/
        └── P1M4T1S1/
            ├── PRP.md           # This file
            └── research/        # Research files (4 files)
                ├── test-patterns.md
                ├── common-test-failures.md
                ├── vitest-best-practices.md
                └── agentresponse-implementation.md
```

### Known Gotchas of Our Codebase & Library Quirks

```bash
# CRITICAL: Test Command
# - Use 'npm test' NOT 'vitest' directly
# - package.json defines: "test": "vitest run"
# - vitest run executes tests once (not watch mode)

# CRITICAL: Test File Pattern
# - Vitest config: include: ['src/__tests__/**/*.test.ts']
# - All test files must end in .test.ts
# - Located in src/__tests__/unit/ for unit tests

# CRITICAL: Global Test Variables
# - vitest.config.ts has globals: true
# - No need to import describe, it, expect, vi
# - They're available globally in test files

# CRITICAL: ES Module Imports
# - This is an ES Module project ("type": "module" in package.json)
# - All imports must use .js extension (even for TypeScript files)
# - Example: import { Agent } from '../../core/agent.js'

# CRITICAL: AgentResponse Test Pattern
# - Tests must check response.status before accessing response.data
# - Use type guards: isSuccess(response), isError(response)
# - Error responses have data: null, success responses have error: null
# - PRD 6.4.4: Use null instead of undefined

# CRITICAL: Common Test Failures After Migration
# - Type mismatch: Tests expect T but receive AgentResponse<T>
# - Fix: Extract data from response.data after status check
# - Missing status check: Tests access response.data without checking status
# - Fix: Add expect(response.status).toBe('success') assertion first

# CRITICAL: Test Execution Time
# - Unit tests should complete in < 60 seconds
# - If tests hang, there may be an async/await issue
# - Use --reporter=verbose for detailed output

# CRITICAL: Zod Validation in Tests
# - Agent.prompt() validates responses against Zod schema
# - INVALID_RESPONSE_FORMAT error if validation fails
# - Tests should handle both success and error paths
```

---

## Implementation Blueprint

### Data Models and Structure

This task validates existing code through testing. No new data models.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: RUN unit tests to identify failures
  - EXECUTE: npm test
  - CAPTURE: Full test output including failures
  - COUNT: Total pass/fail/skip counts
  - IDENTIFY: Which specific test files are failing
  - LOCATION: Run from /home/dustin/projects/groundswell

Task 2: ANALYZE test failures
  - REVIEW: Each failing test's error message
  - CATEGORIZE: Failure type (reference research/common-test-failures.md)
  - IDENTIFY: Root cause (type mismatch, missing status check, etc.)
  - DOCUMENT: List of failures with proposed fixes
  - REFERENCE: Use failure categories from research file

Task 3: FIX type mismatch failures
  - PATTERN: Tests expecting T but receiving AgentResponse<T>
  - FIX: Update assertions to check response.status first
  - FIX: Extract data from response.data property
  - REFERENCE: research/common-test-failures.md "Type Mismatch Failures"
  - EXAMPLE:
      Before: expect(result).toBe('value')
      After: expect(response.status).toBe('success'); expect(response.data).toBe('value')

Task 4: FIX missing status check failures
  - PATTERN: Tests accessing response.data without status check
  - FIX: Add expect(response.status).toBe('success') before data assertions
  - FIX: Use optional chaining response.data?.property
  - REFERENCE: research/common-test-failures.md "Missing Status Check Failures"

Task 5: FIX error handling failures
  - PATTERN: Tests using rejects.toThrow() for errors
  - FIX: Replace with error response assertions
  - FIX: Check response.status === 'error' and response.error.code
  - REFERENCE: research/common-test-failures.md "Incorrect Error Handling Patterns"

Task 6: FIX import/type guard failures
  - PATTERN: Tests failing due to missing isSuccess/isError imports
  - FIX: Add type guard imports from types/agent.js
  - FIX: Use type guards for type narrowing
  - REFERENCE: research/common-test-failures.md "Type Guard Not Imported"

Task 7: FIX Zod validation failures
  - PATTERN: Tests failing due to schema validation errors
  - FIX: Verify schema matches response structure
  - FIX: Update prompt instructions if agent returns invalid format
  - REFERENCE: research/common-test-failures.md "INVALID_RESPONSE_FORMAT Errors"

Task 8: RE-RUN tests after each fix batch
  - EXECUTE: npm test after fixing 3-5 tests
  - VERIFY: Previously failing tests now pass
  - CHECK: No new test failures introduced
  - ITERATE: Return to Task 2 if new failures appear

Task 9: VERIFY 100% pass rate
  - EXECUTE: npm test one final time
  - CONFIRM: Output shows "XX pass 0 fail"
  - CONFIRM: No skipped or pending tests
  - CONFIRM: Test execution time < 60 seconds

Task 10: DOCUMENT test results
  - RECORD: Final test pass/fail counts
  - RECORD: Any tests that needed fixes
  - RECORD: Common failure patterns observed
  - STORE: Notes in research/ directory for future reference
```

### Implementation Patterns & Key Details

```bash
# Test Execution Pattern

# 1. Run all tests
npm test

# Expected output format:
# ✓ src/__tests__/unit/agent-response.test.ts (X)
# ✓ src/__tests__/unit/agent-response-factory.test.ts (X)
# ...
# XX pass 0 fail

# 2. Run specific test file
npm test -- agent-response.test.ts

# 3. Run with verbose output
npm test -- --reporter=verbose

# 4. Run specific test by pattern
npm test -- --grep "should_return_success"

# Common Fix Patterns

# Fix Type Mismatch (expect T but get AgentResponse<T>)
# Before:
expect(result).toBe('expected value');
# After:
expect(response.status).toBe('success');
expect(response.data).toBe('expected value');

# Fix Missing Status Check
# Before:
expect(response.data.result).toBe('expected');
# After:
expect(response.status).toBe('success');
expect(response.data.result).toBe('expected');

# Fix Error Handling
# Before:
await expect(agent.prompt(prompt)).rejects.toThrow();
# After:
expect(response.status).toBe('error');
expect(response.error.code).toBe('INVALID_RESPONSE_FORMAT');

# Fix Import Issues
# Add to imports:
import { isSuccess, isError, isPartial } from '../../types/agent.js';

# Use type guards for narrowing:
if (isSuccess(response)) {
  expect(response.data).toBe('expected');
}
```

### Integration Points

```yaml
DEPENDS_ON:
  - P1.M1.T1: Agent.prompt() returns AgentResponse<T>
  - P1.M2.T1: Zod schema validation in Agent.prompt()
  - P1.M3.T1.S1: Migration guide created (parallel execution)

VALIDATES:
  - All AgentResponse factory functions work correctly
  - All error codes are properly handled (PRD 6.2)
  - Type guards provide proper type narrowing
  - Zod schemas validate responses correctly
  - PRD 6.4.4 compliance (null over undefined)

OUTPUTS:
  - 100% passing unit test suite
  - Documented fixes (if any) in research/
  - Validation that AgentResponse migration is complete

NEXT_STEPS:
  - P1.M4.T1.S2: Run integration tests
  - P1.M4.T1.S3: Run adversarial tests
  - P1.M4.T2: Verify TypeScript compilation
```

---

## Validation Loop

### Level 1: Test Execution (Immediate Feedback)

```bash
# Run unit tests
npm test

# Expected output:
# ✓ src/__tests__/unit/agent-response.test.ts (X)
# ✓ src/__tests__/unit/agent-response-factory.test.ts (X)
# ✓ src/__tests__/unit/agent-response-public-api.test.ts (X)
# ✓ src/__tests__/unit/agent-error-codes.test.ts (X)
# ✓ src/__tests__/unit/agent.test.ts (X)
# ✓ src/__tests__/unit/prompt.test.ts (X)
# ... all unit tests pass ...
# Test Files  XX passed (XX)
# Tests XX passed (XX)
# Duration XX ms

# If failures occur:
# 1. Note the failing test file and test name
# 2. Read the error message carefully
# 3. Categorize the failure type
# 4. Apply appropriate fix from research/common-test-failures.md

# Run specific failing test file
npm test -- agent-response.test.ts

# Run with verbose output for debugging
npm test -- --reporter=verbose

# Run specific test by name pattern
npm test -- --grep "test_name_pattern"

# Expected: All tests pass with 0 failures
```

### Level 2: Failure Analysis (Component Validation)

```bash
# If tests fail, analyze the failure type:

# 1. Type mismatch failures
# Symptom: expect().toBe() fails on object vs primitive
# Action: Add status check, extract data from response.data
# Reference: research/common-test-failures.md sections 1-2

# 2. Missing status check failures
# Symptom: Cannot read property of null (response.data is null)
# Action: Add expect(response.status).toBe('success') before data assertions
# Reference: research/common-test-failures.md section 2

# 3. Error handling failures
# Symptom: rejects.toThrow() passes but test expects no throw
# Action: Change to error response assertions
# Reference: research/common-test-failures.md section 3

# 4. Import failures
# Symptom: ReferenceError: isSuccess is not defined
# Action: Add type guard imports from types/agent.js
# Reference: research/common-test-failures.md section 8

# Expected: Categorize all failures, apply fixes, re-run tests
```

### Level 3: Progressive Fix Validation (System Validation)

```bash
# Fix tests in batches of 3-5 to track progress

# Batch 1: Fix type mismatch failures
# 1. Identify all type mismatch failures
# 2. Apply fix: add status check, extract data
# 3. Run: npm test
# 4. Verify: previously failing tests now pass

# Batch 2: Fix missing status check failures
# 1. Identify all missing status check failures
# 2. Apply fix: add expect(response.status).toBe('success')
# 3. Run: npm test
# 4. Verify: no regressions from Batch 1

# Batch 3: Fix error handling failures
# 1. Identify error handling failures
# 2. Apply fix: change to error response assertions
# 3. Run: npm test
# 4. Verify: all batches still passing

# Continue until 100% pass rate achieved

# Expected: Iterative fixing with validation after each batch
```

### Level 4: Final Validation (Complete System)

```bash
# Final test run with all fixes applied
npm test

# Verify output:
# - All test files show ✓ (passing)
# - No ✗ (failing) indicators
# - Summary shows: XX pass 0 fail
# - Duration is reasonable (< 60 seconds for unit tests)

# Run with coverage (if coverage tools available)
npm test -- --coverage

# Verify:
# - All tested files have reasonable coverage
# - No critical code paths missing tests

# Check for any warnings
npm test 2>&1 | grep -i warning

# Expected:
# - Zero test failures
# - Zero test errors
# - Zero critical warnings
# - Clean test execution
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All unit tests in `src/__tests__/unit/` pass
- [ ] Test output shows "XX pass 0 fail" (zero failures)
- [ ] No test files skipped or pending
- [ ] Test execution time is reasonable (< 60 seconds)
- [ ] No console errors during test execution
- [ ] No test timeouts or hanging tests

### AgentResponse Validation

- [ ] All AgentResponse factory functions tested and passing
- [ ] All 6 error codes tested (PRD 6.2 compliance)
- [ ] Type guard tests pass (isSuccess, isError, isPartial)
- [ ] Zod schema validation tests pass
- [ ] PRD 6.4.4 compliance verified (null over undefined)
- [ ] Metadata validation tests pass
- [ ] Serialization tests pass (JSON round-trip)

### Code Quality Validation

- [ ] Test fixes follow existing test patterns
- [ ] Test assertions are specific and meaningful
- [ ] Test names are descriptive (should_do_expected_behavior)
- [ ] No commented-out test code
- [ ] No TODO comments in failing tests
- [ ] Test structure follows describe/it pattern

### Documentation & Deployment

- [ ] Fixes documented in research/ if significant
- [ ] Common failure patterns noted for future reference
- [ ] Test suite provides confidence for deployment
- [ ] CI/CD pipeline will pass with these test results

---

## Anti-Patterns to Avoid

- ❌ Don't skip tests - fix the underlying issue
- ❌ Don't use `.only` to isolate tests - remove `.only` before committing
- ❌ Don't ignore failing tests - all must pass
- ❌ Don't change test intent to make it pass - fix the implementation
- ❌ Don't remove assertions without reason - keep test coverage
- ❌ Don't add `// @ts-ignore` to fix type errors - fix the types properly
- ❌ Don't mock the system under test - test the actual implementation
- ❌ Don't use `expect.anything()` excessively - be specific about expected values
- ❌ Don't forget to add type guard imports when using isSuccess/isError
- ❌ Don't access `response.data` without checking `response.status` first
- ❌ Don't use `undefined` in test expectations - use `null` for PRD 6.4.4 compliance

---

## Appendix: Common Failure Quick Reference

### Failure Type → Quick Fix

| Failure Pattern | Quick Fix |
|-----------------|-----------|
| `expect(result).toBe()` | `expect(response.status).toBe('success'); expect(response.data).toBe()` |
| `expect(response.data.property)` | `expect(response.status).toBe('success')` first |
| `await expects().rejects.toThrow()` | `expect(response.status).toBe('error')` |
| `isSuccess is not defined` | `import { isSuccess } from '../../types/agent.js'` |
| `Cannot read property of null` | Check `response.status` before accessing `response.data` |
| `ZodError: Invalid value` | Verify schema matches response structure |
| `toBeNull() fails` | Check for `null` not `undefined` (PRD 6.4.4) |
| `TypeError: response.data.xxx` | Add `response.status === 'success'` check |

### Test Command Quick Reference

```bash
npm test                    # Run all tests once
npm test -- <file>          # Run specific test file
npm test -- --grep <pattern> # Run tests matching pattern
npm test -- --reporter=verbose  # Verbose output
npm test -- --coverage      # Run with coverage report
```

---

## References

### Research Files (plan/002_6761e4b84fd1/P1M4T1S1/research/)

- `test-patterns.md` - Complete test structure and patterns used in this codebase
- `common-test-failures.md` - 12 common failure types with fixes and prevention strategies
- `vitest-best-practices.md` - Vitest CLI commands, debugging, and best practices
- `agentresponse-implementation.md` - Complete AgentResponse implementation reference

### External References

- Vitest Documentation: https://vitest.dev
- Vitest CLI Reference: https://vitest.dev/guide/cli.html
- Vitest Expect API: https://vitest.dev/api/expect.html
- Vitest Debugging: https://vitest.dev/guide/debugging.html

### Source Files Referenced

- `package.json` - Test command definition
- `vitest.config.ts` - Vitest configuration
- `src/types/agent.ts` - AgentResponse type definitions
- `src/core/agent.ts` - Agent.prompt() implementation
- `src/__tests__/unit/agent-response.test.ts` - AgentResponse test patterns
- `src/__tests__/unit/agent-response-factory.test.ts` - Factory function tests
- `src/__tests__/unit/agent-error-codes.test.ts` - Error code tests
