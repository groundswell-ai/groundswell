# PRP: P1.M2.T1.S4 - Run Full Test Suite to Ensure No Regressions

**Document Version:** 1.0
**Creation Date:** 2026-01-12
**Target:** Subtask P1.M2.T1.S4 - Run full test suite to ensure no regressions
**Primary Files:** Test execution (no new files), Validation of existing tests

---

## Goal

**Feature Goal**: Execute the complete test suite using the project's Vitest framework to verify that the Promise.allSettled implementation from S2 and the new concurrent task failure tests from S3 work correctly without introducing any regressions to the existing 387 tests across the codebase.

**Deliverable**: Full test suite execution with documented results showing:
1. All existing tests still pass (100% pass rate maintained)
2. New concurrent-task-failures.test.ts tests pass
3. No regressions introduced by Promise.allSettled changes
4. Documentation of any edge cases or issues encountered

**Success Definition**:
- Test suite executes successfully with `npm test` command
- All 387+ tests pass (existing tests + new S3 tests)
- Zero test failures or errors
- No regressions in existing functionality
- Promise.allSettled implementation validated through test coverage

---

## User Persona

**Target User**: Development team members, QA engineers, and maintainers who need to verify code changes don't break existing functionality.

**Use Case**: After implementing the Promise.allSettled change in S2 and adding comprehensive tests in S3, the full test suite must be run to ensure no regressions were introduced.

**User Journey**:
1. Developer runs `npm test` to execute the full test suite
2. Vitest runs all tests across unit, integration, and adversarial categories
3. Results show all tests passing with no failures
4. Developer gains confidence that the implementation is production-ready

**Pain Points Addressed**:
- Fear of breaking existing functionality when changing core concurrency logic
- Uncertainty about whether new tests properly validate the implementation
- Need for systematic validation before merging changes

---

## Why

- **Quality Assurance**: Ensures the Promise.allSettled migration from Promise.all doesn't break any existing concurrent execution patterns
- **Validation of S3 Tests**: Confirms the new concurrent-task-failures.test.ts tests work correctly and integrate with the existing test suite
- **Regression Prevention**: Catches any unintended side effects of the changes before they reach production
- **Confidence Building**: Provides objective proof that the codebase remains in a working state
- **PRD Compliance**: Validates that bug fix 001_e8e04329daf3 is fully resolved

---

## What

### User-Visible Behavior

**Test Execution**: The full test suite runs all 387+ tests using Vitest, providing clear output on pass/fail status for each test.

**Expected Results**:
- All existing tests continue to pass
- New concurrent-task-failures tests pass
- No errors or warnings related to the Promise.allSettled changes
- Clear summary output showing total tests passed

### Success Criteria

- [ ] All 387 existing tests pass (100% pass rate maintained)
- [ ] New concurrent-task-failures.test.ts tests (from S3) pass
- [ ] Zero test failures or errors in the full suite
- [ ] Promise.allSettled implementation validated through test coverage
- [ ] No regressions in existing concurrent execution patterns
- [ ] Test execution completes in reasonable time (no hanging tests)
- [ ] Document any edge cases or issues encountered during execution

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact test command and execution pattern
- Complete test suite structure and file locations
- Expected test count (387+ tests)
- Vitest configuration details
- Promise.allSettled implementation context from S2
- New test file context from S3
- Troubleshooting steps for common issues

### Documentation & References

```yaml
# MUST READ - Test Configuration
- file: vitest.config.ts
  why: Test runner configuration showing file patterns and globals
  pattern: include: ['src/__tests__/**/*.test.ts'], globals: true
  critical: Tests must match this pattern to be executed

- file: package.json
  lines: 34-35
  why: Test script definitions
  command: "test": "vitest run", "test:watch": "vitest"
  critical: Use `npm test` to run full suite

# S2 IMPLEMENTATION - What changed
- file: src/decorators/task.ts
  lines: 111-120
  why: Promise.allSettled implementation that needs validation
  pattern: const results = await Promise.allSettled(runnable.map((w) => w.run()));
  critical: This change replaced Promise.all and needs test verification

# S3 NEW TESTS - What was added
- file: src/__tests__/adversarial/concurrent-task-failures.test.ts
  why: New comprehensive test suite for concurrent failures
  pattern: Tests for single/multiple failures, mixed scenarios, orphaned workflows
  critical: These tests must pass as part of the full suite

# EXISTING TEST PATTERNS - For context
- file: src/__tests__/adversarial/edge-case.test.ts
  lines: 366-430
  why: Existing concurrent execution tests that must continue to pass
  pattern: @Task({ concurrent: true }) usage with error handling
  critical: These tests validate backward compatibility

- file: src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  lines: 297-324
  why: Concurrent execution stress tests that must pass
  pattern: Multiple child workflows with concurrent execution
  critical: Validates Promise.allSettled doesn't break deep hierarchies

- file: src/__tests__/adversarial/observer-propagation.test.ts
  why: Event emission tests that must continue to work
  pattern: Event collection and verification during failures
  critical: Ensures error events still emitted correctly

# VITEST DOCUMENTATION
- url: https://vitest.dev/guide/cli.html
  why: Complete CLI reference for vitest commands
  section: Command Line Interface
  critical: --run, --watch, --reporter options

- url: https://vitest.dev/guide/reporters.html
  why: Test output reporter options
  section: Reporters
  critical: Understanding test output format

# PROJECT ARCHITECTURE
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M2T1S2/PRP.md
  why: PRP for S2 implementation showing exact changes made
  section: "Appendix: Complete Code Change Reference"
  critical: Shows before/after of Promise.all to Promise.allSettled migration

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T1S3/PRP.md
  why: PRP for S3 test implementation
  section: "Success Metrics"
  critical: Shows what tests were added and their expected behavior
```

### Current Codebase Tree (Test Structure)

```bash
/home/dustin/projects/groundswell
├── src/
│   └── __tests__/
│       ├── unit/                    # 13 test files (unit tests)
│       │   ├── agent.test.ts
│       │   ├── cache-key.test.ts
│       │   ├── cache.test.ts
│       │   ├── context.test.ts
│       │   ├── decorators.test.ts
│       │   ├── introspection-tools.test.ts
│       │   ├── logger.test.ts
│       │   ├── prompt.test.ts
│       │   ├── reflection.test.ts
│       │   ├── tree-debugger.test.ts
│       │   ├── workflow-detachChild.test.ts
│       │   ├── workflow-emitEvent-childDetached.test.ts
│       │   └── workflow.test.ts
│       ├── integration/             # 4 test files (integration tests)
│       │   ├── agent-workflow.test.ts
│       │   ├── bidirectional-consistency.test.ts
│       │   ├── tree-mirroring.test.ts
│       │   └── workflow-reparenting.test.ts
│       └── adversarial/             # 12 test files (adversarial/stress tests)
│           ├── attachChild-performance.test.ts
│           ├── circular-reference.test.ts
│           ├── complex-circular-reference.test.ts
│           ├── concurrent-task-failures.test.ts  # NEW from S3
│           ├── deep-analysis.test.ts
│           ├── deep-hierarchy-stress.test.ts
│           ├── e2e-prd-validation.test.ts
│           ├── edge-case.test.ts
│           ├── observer-propagation.test.ts
│           ├── parent-validation.test.ts
│           ├── prd-12-2-compliance.test.ts
│           └── prd-compliance.test.ts
├── vitest.config.ts                 # Test configuration
├── package.json                     # Test scripts: npm test, npm run test:watch
└── tsconfig.json                    # TypeScript configuration
```

### Test Count Breakdown

```yaml
TOTAL_TESTS: 387+ individual test cases

UNIT_TESTS:
  - 13 test files
  - Tests for individual components (decorators, workflow, logger, etc.)
  - Fast execution, isolated testing

INTEGRATION_TESTS:
  - 4 test files
  - Tests for component interactions
  - Medium execution time

ADVERSARIAL_TESTS:
  - 12 test files (including new concurrent-task-failures.test.ts)
  - Stress tests, edge cases, PRD compliance
  - Longer execution time, comprehensive coverage
```

### Desired Codebase Tree with Files to be Added

```bash
# NO NEW FILES for this task
# This task executes existing tests only
# Output: Test results document (optional) or console output
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL GOTCHA #1: Test file location and naming
// Tests MUST be in src/__tests__/ and end in .test.ts
// Vitest config pattern: include: ['src/__tests__/**/*.test.ts']
// If tests aren't discovered, check file location and extension

// CRITICAL GOTCHA #2: Use `npm test` not `vitest` directly
// package.json script: "test": "vitest run"
// Direct vitest command may use different config
// ALWAYS use npm test to ensure consistent behavior

// CRITICAL GOTCHA #3: TypeScript compilation happens before tests
// If TypeScript has errors, tests won't run
// Check `npx tsc --noEmit` if tests fail to load
// Common issue: Import paths with .js extension for TypeScript files

// CRITICAL GOTCHA #4: Vitest globals enabled
// vitest.config.ts has globals: true
// No need to import describe, it, expect from vitest
// Files may still have imports (which is fine)

// CRITICAL GOTCHA #5: Promise.allSettled changes affect concurrent tests
// Any test using @Task({ concurrent: true }) is affected
// Existing tests expect all-or-nothing behavior (Promise.all)
// New behavior: all complete, then first error thrown
// Tests that catch errors may see different timing

// CRITICAL GOTCHA #6: Test execution order may affect results
// Vitest runs tests in parallel by default
-- If tests share state or resources, may see flakes
// Groundswell tests are isolated, so this shouldn't be an issue

// CRITICAL GOTCHA #7: Test timeout defaults
// Vitest has default timeout (usually 5000ms)
// Hanging tests will fail with timeout error
// New concurrent-task-failures.test.ts has timeout protection

// CRITICAL GOTCHA #8: ES modules and .js extension imports
// Imports use .js extension even for .ts files
// Example: import { Workflow } from '../../index.js';
// This is correct TypeScript + ESM pattern

// CRITICAL GOTCHA #9: New test file from S3
// concurrent-task-failures.test.ts is new
// Must be included in test run
// Verify it's being executed (check test output)

// CRITICAL GOTCHA #10: CI/CD not configured
// No GitHub Actions, GitLab CI, or other CI
// Test validation must be done manually
-- Consider this when planning release process

// CRITICAL GOTCHA #11: Node.js version requirement
// vitest.config.ts targets 'node18'
-- Tests may fail on older Node versions
// Check node version: node --version

// CRITICAL GOTCHA #12: Memory considerations for full test suite
// 387 tests may consume significant memory
// If OOM errors occur, run tests in smaller batches
// Example: npm test -- src/__tests__/unit/
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - This task executes existing tests and validates the codebase.

**Test Execution Structure**:
```typescript
// Test execution flow:
// 1. npm test → vitest run
// 2. Vitest loads vitest.config.ts
// 3. Discovers all tests matching src/__tests__/**/*.test.ts
// 4. Compiles TypeScript (via tsconfig.json)
// 5. Runs all tests in parallel
// 6. Reports results to console
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: PRE-FLIGHT CHECKS - Verify environment setup
  - RUN: node --version (ensure Node 18+)
  - RUN: npm ls vitest (verify vitest installed)
  - RUN: npx tsc --noEmit (verify TypeScript compiles)
  - VERIFY: No TypeScript errors blocking test execution
  - DOCUMENT: Any environment issues found

Task 2: RUN NEW TESTS ONLY - Verify S3 tests work
  - RUN: npm test -- src/__tests__/adversarial/concurrent-task-failures.test.ts
  - VERIFY: All new tests from S3 pass
  - VERIFY: Test file is discovered and executed
  - DOCUMENT: Any test failures with full error messages

Task 3: RUN UNIT TESTS - Verify unit test suite
  - RUN: npm test -- src/__tests__/unit/
  - VERIFY: All 13 unit test files pass
  - VERIFY: No regressions in decorator, workflow, logger tests
  - DOCUMENT: Any failures with specific test names

Task 4: RUN INTEGRATION TESTS - Verify integration suite
  - RUN: npm test -- src/__tests__/integration/
  - VERIFY: All 4 integration test files pass
  - VERIFY: No regressions in agent-workflow, tree-mirroring tests
  - DOCUMENT: Any failures with specific test names

Task 5: RUN ADVERSARIAL TESTS - Verify adversarial suite
  - RUN: npm test -- src/__tests__/adversarial/
  - VERIFY: All 12 adversarial test files pass
  - VERIFY: concurrent-task-failures.test.ts included
  - VERIFY: No regressions in edge-case, deep-hierarchy tests
  - DOCUMENT: Any failures with specific test names

Task 6: RUN FULL TEST SUITE - Complete validation
  - RUN: npm test
  - VERIFY: All 387+ tests pass
  - VERIFY: Test count shows increase from baseline (344 → 387+)
  - VERIFY: 100% pass rate maintained
  - DOCUMENT: Total test count, pass count, execution time

Task 7: VALIDATE PROMISE.ALLSETTLED COVERAGE
  - ANALYZE: Test output for concurrent execution tests
  - VERIFY: concurrent-task-failures.test.ts tests executed
  - VERIFY: All concurrent failure scenarios covered
  - DOCUMENT: Specific test counts for concurrent scenarios

Task 8: DOCUMENT RESULTS - Create summary report
  - CREATE: Summary of test execution results
  - INCLUDE: Total tests passed, execution time, any issues
  - INCLUDE: Validation of Promise.allSettled implementation
  - INCLUDE: Edge cases or issues encountered
  - STORE: Results in work item directory or as comment

Task 9: TROUBLESHOOTING (if needed)
  - IF: Tests fail, analyze error messages
  - RUN: Failing test with --reporter=verbose for details
  - DEBUG: Use npm run test:watch for interactive debugging
  - FIX: Any regressions discovered (coordinate with team)
  - RERUN: Full suite after fixes
```

### Implementation Patterns & Key Details

```bash
# ============================================
# PATTERN 1: Basic Test Execution
# Command: npm test
# ============================================

# Run all tests once (non-interactive)
npm test

# Expected output format:
# ✓ src/__tests__/unit/decorators.test.ts (10 tests)
# ✓ src/__tests__/unit/workflow.test.ts (15 tests)
# ...
# ✓ src/__tests__/adversarial/concurrent-task-failures.test.ts (9 tests)
# Test Files  29 passed (29)
# Tests  387 passed (387)
# Duration  2.34s

# KEY INSIGHTS:
# - Shows each test file with test count
# - Final summary shows total pass/fail
# - Duration indicates performance

# ============================================
# PATTERN 2: Run Specific Test Directory
# Command: npm test -- <directory>
# ============================================

# Run only unit tests
npm test -- src/__tests__/unit/

# Run only adversarial tests
npm test -- src/__tests__/adversarial/

# Run specific test file
npm test -- src/__tests__/adversarial/concurrent-task-failures.test.ts

# KEY INSIGHTS:
# - Use -- to pass arguments to vitest
# - Useful for isolating test categories
# - Faster feedback during debugging

# ============================================
# PATTERN 3: Watch Mode for Development
# Command: npm run test:watch
# ============================================

# Run tests in watch mode
npm run test:watch

# Watch specific file
npm run test:watch -- concurrent-task-failures

# KEY INSIGHTS:
# - Automatically re-runs tests on file changes
# - Useful for debugging test failures
# - Press 'q' to quit

# ============================================
# PATTERN 4: Verbose Output for Debugging
# Command: npm test -- --reporter=verbose
# ============================================

# Run with verbose output
npm test -- --reporter=verbose

# Run specific test with verbose output
npm test -- concurrent-task-failures --reporter=verbose

# Expected output:
#   ✓ should complete all siblings when one child fails
#   ✓ should collect all errors when multiple children fail concurrently
#   ...

# KEY INSIGHTS:
# - Shows individual test names
# - Useful for identifying which specific test failed
# - Can be combined with file filters

# ============================================
# PATTERN 5: TypeScript Check Before Tests
# Command: npx tsc --noEmit
# ============================================

# Check TypeScript compiles without errors
npx tsc --noEmit

# Expected: No output (if successful)
# Errors shown if TypeScript has issues

# KEY INSIGHTS:
# - Catches type errors before running tests
# - Faster than running full test suite
# - Use when tests fail to load

# ============================================
# PATTERN 6: Parallel vs Sequential Execution
# Command: npm test -- --run --reporter=dot
# ============================================

# Run tests sequentially (useful for debugging)
npm test -- --reporter=dot --no-parallel

# Run with dot reporter (compact output)
npm test -- --reporter=dot

# KEY INSIGHTS:
# - Sequential execution can reveal race conditions
# - Dot reporter shows progress with dots
# - Useful for CI/CD pipelines

# ============================================
# PATTERN 7: Coverage Report (if configured)
# Command: npm test -- --coverage
# ============================================

# Run tests with coverage
npm test -- --coverage

# Expected coverage output (if configured):
# % Coverage report
# Files             % Stmts   % Branch   % Funcs   % Lines
# ...

# KEY INSIGHTS:
# - Shows code coverage for tests
# - Not currently configured in vitest.config.ts
# - Would need to add coverage configuration

# ============================================
# PATTERN 8: Analyzing Test Failures
# Troubleshooting workflow
# ============================================

# Step 1: Run full suite to identify failures
npm test

# Step 2: If failures, run specific file with verbose output
npm test -- <failing-file> --reporter=verbose

# Step 3: Use watch mode for iterative debugging
npm run test:watch -- <failing-file>

# Step 4: Check TypeScript compiles
npx tsc --noEmit

# Step 5: Examine error messages and stack traces

# KEY INSIGHTS:
# - Systematic approach to debugging
# - Isolate failures to specific files
# - Use verbose output for detailed error info
```

### Integration Points

```yaml
NO_CODE_CHANGES:
  - This task executes tests only
  - No modifications to existing code
  - Validates S2 and S3 work correctly

DEPENDENCY_ON_S2:
  - Requires Promise.allSettled implementation to be complete
  - Validating that S2 changes work correctly

DEPENDENCY_ON_S3:
  - Requires concurrent-task-failures.test.ts to exist
  - Validating that S3 tests pass
```

---

## Validation Loop

### Level 1: Pre-Execution Checks

```bash
# Verify Node.js version (must be 18+)
node --version
# Expected output: v18.x.x or higher

# Verify npm dependencies installed
npm ls vitest
# Expected output: vitest@1.x.x installed

# Verify TypeScript compiles without errors
npx tsc --noEmit
# Expected: No output (success) or type errors (fix before running tests)

# Verify test configuration
cat vitest.config.ts
# Expected: include: ['src/__tests__/**/*.test.ts'], globals: true

# Expected: All checks pass, no blockers to test execution
# If errors exist, fix before proceeding to Level 2
```

### Level 2: Incremental Test Execution

```bash
# Step 1: Run new S3 tests only
npm test -- src/__tests__/adversarial/concurrent-task-failures.test.ts

# Expected: 9 tests pass (concurrent failure scenarios)
# Test names:
#   - should complete all siblings when one child fails
#   - should collect all errors when multiple children fail concurrently
#   - should preserve error context for each failure
#   - should complete successful workflows despite failures
#   - should ensure no orphaned workflows in mixed scenario
#   - should handle edge case of all children failing
#   - should verify all workflows complete with no hanging promises
#   - should emit error events for all failing workflows
#   - should capture logs from both successful and failed workflows

# Step 2: Run unit tests
npm test -- src/__tests__/unit/

# Expected: All 13 unit test files pass
# Key files to watch:
#   - decorators.test.ts (validates @Task decorator)
#   - workflow.test.ts (validates workflow execution)
#   - logger.test.ts (validates logging)

# Step 3: Run integration tests
npm test -- src/__tests__/integration/

# Expected: All 4 integration test files pass
# Key files to watch:
#   - agent-workflow.test.ts (validates agent + workflow integration)
#   - tree-mirroring.test.ts (validates tree operations)

# Step 4: Run adversarial tests
npm test -- src/__tests__/adversarial/

# Expected: All 12 adversarial test files pass
# Key files to watch:
#   - concurrent-task-failures.test.ts (new S3 tests)
#   - edge-case.test.ts (concurrent execution edge cases)
#   - deep-hierarchy-stress.test.ts (stress testing)

# Expected: All incremental test runs pass
# If any step fails, debug before proceeding to next step
```

### Level 3: Full Test Suite Execution

```bash
# Run complete test suite
npm test

# Expected output structure:
# ✓ src/__tests__/unit/agent.test.ts (X tests)
# ✓ src/__tests__/unit/cache.test.ts (Y tests)
# ...
# ✓ src/__tests__/adversarial/concurrent-task-failures.test.ts (9 tests)
# ...
# Test Files  29 passed (29)
# Tests  387+ passed (387+)
# Duration  X.XX s (typically 2-5 seconds)

# Validation checkpoints:
# 1. Test Files: 29 passed (no skipped, no failed)
# 2. Tests: 387+ passed (increased from baseline 344)
# 3. Duration: Reasonable time (no hanging tests)
# 4. concurrent-task-failures.test.ts included in output
# 5. Zero errors or warnings in output

# Expected: All tests pass with 100% success rate
# Document total test count and execution time
```

### Level 4: Result Analysis and Documentation

```bash
# Count total tests (if not shown in output)
npm test 2>&1 | grep -E "Tests.*passed"

# Verify concurrent-task-failures.test.ts was executed
npm test 2>&1 | grep concurrent-task-failures

# Check for any warnings or deprecations
npm test 2>&1 | grep -i warning

# Document results:
# - Total tests executed
# - Total tests passed
# - Execution time
# - Any warnings or issues
# - Validation of Promise.allSettled implementation

# Create results summary (example format):
# TEST SUITE EXECUTION SUMMARY
# =============================
# Date: 2026-01-12
# Command: npm test
#
# RESULTS:
# - Total Test Files: 29
# - Total Tests: 387+
# - Tests Passed: 387+
# - Tests Failed: 0
# - Pass Rate: 100%
# - Execution Time: ~2.5s
#
# VALIDATION:
# - Promise.allSettled implementation: VERIFIED
# - Concurrent failure tests: PASSING (9 tests)
# - No regressions detected: CONFIRMED
# - All existing tests passing: CONFIRMED
#
# ISSUES: None

# Expected: Clear documentation of test results
# Store results in work item directory or as code comment
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Pre-flight checks pass (Node version, dependencies, TypeScript)
- [ ] New S3 tests pass (concurrent-task-failures.test.ts)
- [ ] Unit tests pass (all 13 unit test files)
- [ ] Integration tests pass (all 4 integration test files)
- [ ] Adversarial tests pass (all 12 adversarial test files)
- [ ] Full test suite passes (npm test)
- [ ] Test count verified (387+ tests, up from baseline 344)
- [ ] 100% pass rate maintained
- [ ] No TypeScript errors
- [ ] No warnings or deprecations
- [ ] Execution time reasonable (no hanging tests)

### Feature Validation

- [ ] Promise.allSettled implementation validated through test coverage
- [ ] Concurrent task failure scenarios tested and passing
- [ ] Single child failure scenario: PASSING
- [ ] Multiple concurrent failures scenario: PASSING
- [ ] Mixed success/failure scenario: PASSING
- [ ] All children failing scenario: PASSING
- [ ] No orphaned workflows verified: PASSING
- [ ] Event emission during failures: PASSING
- [ ] Log capture from all workflows: PASSING

### Regression Validation

- [ ] No existing tests broken by Promise.allSettled changes
- [ ] @Task decorator concurrent execution still works correctly
- [ ] Error handling patterns unchanged for non-concurrent tasks
- [ ] Event emission still works as expected
- [ ] Logger functionality unaffected
- [ ] Workflow attach/detach operations unaffected
- [ ] Observer pattern still functions correctly

### Documentation & Deployment

- [ ] Test execution results documented
- [ ] Total test count recorded
- [ ] Execution time recorded
- [ ] Any edge cases or issues documented
- [ ] Promise.allSettled implementation confirmed production-ready

---

## Anti-Patterns to Avoid

- **Don't skip pre-flight checks** - Verify environment before running tests
- **Don't ignore TypeScript errors** - Fix compilation errors before running tests
- **Don't run tests directly with vitest** - Always use `npm test` for consistent behavior
- **Don't assume tests will pass** - S2 changes could have unintended side effects
- **Don't skip incremental testing** - Run test categories in isolation for easier debugging
- **Don't ignore test output** - Review full output for warnings or issues
- **Don't forget to document results** - Test results should be recorded for reference
- **Don't proceed if tests fail** - All failures must be investigated and fixed
- **Don't overlook the new test file** - Verify concurrent-task-failures.test.ts is executed
- **Don't assume concurrent behavior is unchanged** - Promise.allSettled changes timing semantics
- **Don't ignore hanging tests** - Timeout errors indicate serious issues
- **Don't run tests in wrong directory** - Must run from project root
- **Don't use wrong Node version** - Tests target Node 18, older versions may fail
- **Don't forget watch mode for debugging** - Use `npm run test:watch` for iterative debugging
- **Don't miss edge cases** - All concurrent failure scenarios must be tested

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass execution success

**Definition of Done**:
1. Pre-flight checks completed successfully
2. All 387+ tests pass (100% pass rate)
3. New concurrent-task-failures.test.ts tests passing
4. Zero regressions in existing functionality
5. Promise.allSettled implementation validated
6. Test execution results documented
7. Execution time reasonable (no performance degradation)

**Validation Criteria**:
- `npm test` completes with exit code 0
- Test output shows "Tests  387+ passed (387+)"
- concurrent-task-failures.test.ts shown in output
- No error messages or stack traces
- Documented results showing successful validation

**Expected Test Count**:
- Baseline: 344 tests (before S3)
- After S3: 387+ tests (includes 9 new concurrent failure tests)
- Validation: Test count should increase by ~9 tests

---

## Appendix: Test Execution Quick Reference

### Command Reference

```bash
# Full test suite
npm test

# Specific test categories
npm test -- src/__tests__/unit/
npm test -- src/__tests__/integration/
npm test -- src/__tests__/adversarial/

# Specific test file
npm test -- src/__tests__/adversarial/concurrent-task-failures.test.ts

# Watch mode (interactive)
npm run test:watch

# Verbose output
npm test -- --reporter=verbose

# TypeScript check
npx tsc --noEmit

# Environment check
node --version
npm ls vitest
```

### Expected Output Format

```
✓ src/__tests__/unit/agent.test.ts (X)
✓ src/__tests__/unit/cache.test.ts (X)
...
✓ src/__tests__/adversarial/concurrent-task-failures.test.ts (9)
...
Test Files  29 passed (29)
Tests  387 passed (387)
Start at  14:23:45
Duration  2.34s (transform 1.23s, setup 0s, collect 456ms, tests 1.11s)
```

### Troubleshooting Guide

| Issue | Symptom | Solution |
|-------|---------|----------|
| TypeScript errors | Tests fail to load | Run `npx tsc --noEmit` and fix type errors |
| Tests not found | "No test files found" | Check file location (must be in `src/__tests__/`) |
| Import errors | "Cannot find module" | Verify imports use `.js` extension for `.ts` files |
| Timeout errors | Tests hang and timeout | Check for infinite loops or hanging promises |
| Wrong Node version | Tests fail with syntax errors | Install Node 18+ |
| Dependency errors | "Cannot find package" | Run `npm install` to install dependencies |

---

**PRP Status**: ✅ Complete - Ready for Execution
**Next Task**: P1.M2.T2.S1 - Add errorMergeStrategy to TaskOptions interface
