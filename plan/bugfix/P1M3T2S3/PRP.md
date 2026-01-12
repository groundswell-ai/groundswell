---
name: "PRP: Run Full Test Suite and Verify All Pass - Final Validation for P1 Bug Fix"
description: Execute comprehensive test suite validation ensuring 260+ tests pass with 100% success rate, documenting results and analyzing any failures

---

## Goal

**Feature Goal**: Execute the complete test suite to validate that all bug fixes for P1 (attachChild() Tree Integrity Violation) are working correctly without regressions.

**Deliverable**: A final test report stored at `plan/bugfix/P1M3T2S3/test-results.md documenting total test count (expected 260+), pass rate (must be 100%), and detailed analysis of any failures.

**Success Definition**:
- All tests in src/__tests__/ directory execute successfully
- Total test count is 260+ (up from original 241 baseline)
- Pass rate is 100% - zero failing tests
- Report documents test execution metrics with per-file breakdown
- Any failures (if present) are analyzed as regressions vs pre-existing issues
- Report serves as final validation checkpoint before P1.M4 (Documentation & Final Validation)

## User Persona

**Target User**: Development team and QA engineers performing final validation before the bug fix release

**Use Case**: Comprehensive test suite execution to verify all P1 bug fix implementations (parent validation, circular reference detection, reparenting support, PRD compliance) work correctly

**User Journey**:
1. Execute full test suite using npm test
2. Capture total test count and pass/fail status
3. Analyze any test failures (if present)
4. Document results in structured report
5. Sign off on P1 completion if all tests pass

**Pain Points Addressed**:
- Manual test execution and result capture is error-prone
- Need documented baseline for regression detection
- Unclear whether failures are from our changes or pre-existing
- Lack of comprehensive test metrics for release readiness assessment

## Why

- **Quality Gate**: 100% test pass rate is required before release
- **Regression Detection**: Compare current results against baseline (244 tests from P1.M1.T2.S4)
- **PRD Compliance**: Validates all PRD requirements are met with passing tests
- **Release Readiness**: Demonstrates all bug fixes work correctly without breaking existing functionality
- **Documentation**: Provides auditable test results for release notes

## What

Execute complete test suite and create comprehensive test results report:

### Success Criteria

- [ ] Full test suite executed via `npm test` or `vitest run`
- [ ] Total test count captured and documented (expected 260+)
- [ ] Pass rate calculated (must be 100%)
- [ ] Per-file test breakdown included in report
- [ ] Any failing tests analyzed (regression vs pre-existing)
- [ ] Test duration and performance metrics captured
- [ ] Report stored at `plan/bugfix/P1M3T2S3/test-results.md`
- [ ] Exit code is 0 (success)

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: Yes - This PRP provides complete context including:
- Exact test execution commands for this project
- Baseline test count from previous regression check (244 tests)
- Expected test count after all new tests (260+)
- Test file organization and structure
- How to analyze test failures
- Report format and storage location

### Documentation & References

```yaml
# MUST READ - Work Item Definition
- file: /home/dustin/projects/groundswell/bug_fix_tasks.json
  why: Contains exact contract definition for P1.M3.T2.S3 with expected outcomes
  section: '"id": "P1.M3.T2.S3"' - Lines 284-292
  critical: Specifies expected test count (260+) and 100% pass rate requirement

# BASELINE - Previous Test Results for Regression Comparison
- file: /home/dustin/projects/groundswell/plan/bugfix/P1M1T2S4/research/TEST_RESULTS.md
  why: Contains baseline test results from commit e829e3f (244 tests passing)
  critical: Shows test count before new adversarial tests were added
  section: "## Overall Results" - Lines 9-16
  gotcha: Current test count is 339 (as of latest run), exceeding original 260+ expectation

# TEST CONFIGURATION
- file: /home/dustin/projects/groundswell/vitest.config.ts
  why: Defines test file pattern and globals configuration
  pattern: include: ['src/__tests__/**/*.test.ts'], globals: true
  gotcha: Tests must use .test.ts extension to be discovered

# TEST SCRIPTS
- file: /home/dustin/projects/groundswell/package.json
  why: Contains npm test scripts
  section: "scripts" - Lines 32-36
  pattern: "test": "vitest run" for single execution, "test:watch": "vitest" for watch mode

# VITEST DOCUMENTATION - CLI Options
- url: https://vitest.dev/guide/cli.html
  why: Official CLI reference for vitest run command
  critical: Understanding exit codes, reporters, and filtering options
  section: "Command Line Interface" - Complete CLI options reference

# VITEST DOCUMENTATION - Reporters
- url: https://vitest.dev/guide/reporters.html
  why: Reporter options for capturing structured test output
  critical: JSON reporter for programmatic result parsing
  section: "Reporters" - default, verbose, json, junit options

# NEW TESTS ADDED - Adversarial Tests
- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  why: New stress test (5 tests) added in P1.M3.T1.S1
  pattern: Deep hierarchy validation (100+ level trees)

- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/manual-parent-mutation.test.ts
  why: New edge case test (5 tests) added in P1.M3.T1.S2
  pattern: Direct parent assignment bypassing attachChild()

- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/complex-circular-reference.test.ts
  why: New circular reference tests (5 tests) added in P1.M3.T1.S3
  pattern: Multi-depth circular reference detection

- file: /home/dustin/projects/groundswell/src/__tests__/integration/bidirectional-consistency.test.ts
  why: New dual tree validation tests (34 tests) added in P1.M3.T1.S4
  pattern: Verifies workflow tree and node tree stay synchronized

# NEW TESTS ADDED - PRD Compliance Tests
- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/prd-12-2-compliance.test.ts
  why: New PRD Section 12.2 compliance tests (27 tests) added in P1.M3.T2.S1
  pattern: Tests each requirement from PRD Section 12.2 explicitly

- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/observer-propagation.test.ts
  why: New PRD Section 7 observer propagation tests (27 tests) added in P1.M3.T2.S2
  pattern: Validates event bubbling from grandchildren to root observers

# EXPECTED STDERR OUTPUT
- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts
  why: Contains intentional observer error tests that produce expected stderr
  section: Lines 436-459
  gotcha: "Observer onEvent error: Error: Event observer error" is expected output

# EXPECTED CIRCULAR REFERENCE STDERR
- file: /home/dustin/projects/groundswell/src/__tests__/integration/bidirectional-consistency.test.ts
  why: Tests that intentionally trigger circular reference errors
  gotcha: "Cannot attach child 'X' - it is an ancestor of 'Y'. This would create a circular reference." is expected
```

### Current Codebase tree (test structure)

```bash
src/
├── __tests__/
│   ├── unit/                           # 131 tests (baseline)
│   │   ├── agent.test.ts              # 11 tests
│   │   ├── cache.test.ts              # 16 tests
│   │   ├── cache-key.test.ts          # 17 tests
│   │   ├── context.test.ts            # 11 tests
│   │   ├── decorators.test.ts         # 6 tests
│   │   ├── prompt.test.ts             # 10 tests
│   │   ├── reflection.test.ts         # 19 tests
│   │   ├── introspection-tools.test.ts # 20 tests
│   │   ├── tree-debugger.test.ts      # 5 tests
│   │   ├── workflow.test.ts           # 13 tests
│   │   └── workflow-detachChild.test.ts # 5 tests (NEW - P1.M2)
│   ├── integration/                    # 48 tests (baseline 13 + new 35)
│   │   ├── agent-workflow.test.ts     # 9 tests
│   │   ├── tree-mirroring.test.ts     # 4 tests
│   │   ├── workflow-reparenting.test.ts # (NEW - P1.M2)
│   │   └── bidirectional-consistency.test.ts # 34 tests (NEW - P1.M3.T1.S4)
│   └── adversarial/                    # 160 tests (baseline 101 + new 59)
│       ├── circular-reference.test.ts # 2 tests
│       ├── parent-validation.test.ts  # 2 tests
│       ├── deep-analysis.test.ts      # 34 tests
│       ├── prd-compliance.test.ts     # 29 tests
│       ├── edge-case.test.ts          # 27 tests
│       ├── e2e-prd-validation.test.ts # 9 tests
│       ├── deep-hierarchy-stress.test.ts # 5 tests (NEW - P1.M3.T1.S1)
│       ├── manual-parent-mutation.test.ts # 5 tests (NEW - P1.M3.T1.S2)
│       ├── complex-circular-reference.test.ts # 5 tests (NEW - P1.M3.T1.S3)
│       ├── prd-12-2-compliance.test.ts # 27 tests (NEW - P1.M3.T2.S1)
│       └── observer-propagation.test.ts # 27 tests (NEW - P1.M3.T2.S2)
│
└── helpers/
    └── tree-verification.ts           # Test utilities
```

### Known Gotchas of our codebase & Library Quirks

```bash
# CRITICAL: Expected stderr output is NORMAL - not a test failure
# - "Observer onEvent error: Error: Event observer error" from edge-case.test.ts:448
# - "Cannot attach child 'X' - it is an ancestor of 'Y'" from circular reference tests
# These verify error handling works correctly

# CRITICAL: Test count exceeded original 260+ expectation
# - Original baseline: 244 tests (P1.M1.T2.S4)
# - Expected after new tests: 260+ (work item estimate)
# - Actual current count: 339 tests (as of latest run)
# - This is GOOD - more tests than expected means better coverage

# GOTCHA: Vitest exit codes
# - Exit code 0: All tests passed
# - Exit code 1: One or more tests failed
# - Check $? immediately after test execution

# PATTERN: Test duration varies by test type
# - Unit tests: Fast (< 1ms to ~30ms per file)
# - Integration tests: Medium (~30ms to ~1500ms for tree-mirroring)
# - Adversarial tests: Variable (~5ms to ~700ms for deep-hierarchy-stress)

# GOTCHA: tree-mirroring.test.ts has long duration (~1400ms)
# - This is expected - it builds complex tree structures
# - Not a performance issue, just test complexity

# PATTERN: Vitest output format
# - Test Files: X passed (X)
# - Tests: Y passed (Y)
# - Duration: X.XXs (transform XXms, setup Xms, collect XXms, tests XXms, environment XXms, prepare XXms)
```

## Implementation Blueprint

### Test Execution Strategy

```yaml
Phase 1: Pre-Execution Validation
  - VERIFY: Node version >= 18 (check package.json engines)
  - VERIFY: Dependencies installed (node_modules exists)
  - VERIFY: Vitest configuration (vitest.config.ts is present)
  - RECORD: Git commit hash for traceability

Phase 2: Execute Full Test Suite
  - COMMAND: npm test (equivalent to vitest run)
  - CAPTURE: Full console output to file
  - MEASURE: Execution duration
  - CHECK: Exit code (must be 0)

Phase 3: Parse Test Results
  - EXTRACT: Total test count
  - EXTRACT: Passed test count
  - EXTRACT: Failed test count (if any)
  - CALCULATE: Pass rate percentage
  - IDENTIFY: Slowest test files

Phase 4: Analyze Failures (if any)
  - CATEGORIZE: Regression vs pre-existing
  - COMPARE: Against baseline results (P1.M1.T2.S4)
  - INVESTIGATE: Root cause of each failure
  - DETERMINE: Action required (fix vs document as known issue)

Phase 5: Generate Report
  - CREATE: plan/bugfix/P1M3T2S3/test-results.md
  - INCLUDE: Test execution summary
  - INCLUDE: Per-file breakdown
  - INCLUDE: Failure analysis (if applicable)
  - INCLUDE: Recommendations
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: PREPARE test execution environment
  - VERIFY: Node version with node --version (must be >= 18)
  - VERIFY: Dependencies with npm list --depth=0
  - RECORD: Git commit hash with git rev-parse HEAD
  - RECORD: Current branch with git branch --show-current
  - CREATE: Output directory plan/bugfix/P1M3T2S3/ if not exists

Task 2: EXECUTE full test suite
  - RUN: npm test 2>&1 | tee test-output.txt
  - CAPTURE: Exit code echo $?
  - VERIFY: All test files discovered (should be 26 files)
  - MEASURE: Wall clock time with time command

Task 3: PARSE test output
  - EXTRACT: Total test count from "Tests XXX passed" line
  - EXTRACT: Test file count from "Test Files XXX passed" line
  - EXTRACT: Duration breakdown from "Duration" line
  - IDENTIFY: Any FAIL markers in output
  - LIST: All test files with individual test counts

Task 4: ANALYZE results
  - COMPARE: Current test count vs baseline (244 from P1.M1.T2.S4)
  - COMPARE: Current test count vs expected (260+ from work item)
  - VALIDATE: Pass rate is 100%
  - IDENTIFY: Any new test failures (regressions)
  - CHECK: For expected stderr output (observer errors, circular reference messages)

Task 5: GENERATE test results report
  - CREATE: plan/bugfix/P1M3T2S3/test-results.md
  - INCLUDE: Test execution summary (date, commit, command)
  - INCLUDE: Overall results (total files, total tests, pass rate)
  - INCLUDE: Per-file breakdown table
  - INCLUDE: Comparison vs baseline
  - INCLUDE: Failure analysis (if applicable)
  - INCLUDE: Recommendations

Task 6: VALIDATE success criteria
  - CHECK: Total test count >= 260
  - CHECK: Pass rate == 100%
  - CHECK: Exit code == 0
  - CHECK: Report file exists and is complete
  - DOCUMENT: Any deviations from expected results
```

### Test Execution Commands

```bash
# PRIMARY: Execute full test suite (single run, not watch mode)
npm test
# Equivalent to: vitest run

# ALTERNATIVE: Verbose output for detailed test-by-test results
npx vitest run --reporter=verbose

# CAPTURE: Save output to file for parsing
npm test 2>&1 | tee plan/bugfix/P1M3T2S3/test-output.txt

# CHECK: Exit code immediately after
echo "Exit code: $?"

# FILTER: Run specific test category (for debugging failures)
npm test -- src/__tests__/unit/
npm test -- src/__tests__/integration/
npm test -- src/__tests__/adversarial/

# SINGLE: Run specific test file (for failure analysis)
npm test -- src/__tests__/adversarial/prd-12-2-compliance.test.ts

# JSON: Generate structured output for programmatic parsing
npx vitest run --reporter=json --outputFile=plan/bugfix/P1M3T2S3/test-results.json

# COVERAGE: Generate coverage report (optional)
npx vitest run --coverage
```

### Result Report Template

```markdown
# Test Results - P1.M3.T2.S3 Final Validation

## Test Execution Summary

**Date**: [CURRENT_DATE]
**Commit**: [COMMIT_HASH]
**Branch**: [BRANCH_NAME]
**Test Command**: `npm test`

## Overall Results

```
[COPIED OUTPUT FROM VITEST]
```

**Exit Code**: [EXIT_CODE] (Success/Failure)

## Test Metrics

| Metric | Value | Expected | Status |
|--------|-------|----------|--------|
| Test Files | [COUNT] | 26 | [PASS/FAIL] |
| Total Tests | [COUNT] | 260+ | [PASS/FAIL] |
| Passed Tests | [COUNT] | [TOTAL] | [PASS/FAIL] |
| Failed Tests | [COUNT] | 0 | [PASS/FAIL] |
| Pass Rate | [PERCENTAGE] | 100% | [PASS/FAIL] |
| Duration | [TIME] | - | - |

## Test File Breakdown

### Unit Tests ([COUNT] tests)

| Test File | Tests | Duration | Status |
|-----------|-------|----------|--------|
| [FILE] | [N] | [TIME] | [PASS/FAIL] |
| ... | ... | ... | ... |

### Integration Tests ([COUNT] tests)

| Test File | Tests | Duration | Status |
|-----------|-------|----------|--------|
| [FILE] | [N] | [TIME] | [PASS/FAIL] |
| ... | ... | ... | ... |

### Adversarial Tests ([COUNT] tests)

| Test File | Tests | Duration | Status |
|-----------|-------|----------|--------|
| [FILE] | [N] | [TIME] | [PASS/FAIL] |
| ... | ... | ... | ... |

## Comparison vs Baseline

| Metric | Baseline (P1.M1.T2.S4) | Current | Delta |
|--------|------------------------|---------|-------|
| Date | 2026-01-11 | [CURRENT] | - |
| Commit | e829e3f | [CURRENT] | - |
| Test Files | 18 | [COUNT] | [+N] |
| Total Tests | 244 | [COUNT] | [+N] |
| Pass Rate | 100% | [PERCENT] | - |

## New Tests Added (Since Baseline)

- [ ] P1.M2.T1: detachChild() implementation (5 tests)
- [ ] P1.M3.T1: Adversarial tests (15 tests)
- [ ] P1.M3.T1.S4: Bidirectional consistency (34 tests)
- [ ] P1.M3.T2.S1: PRD Section 12.2 compliance (27 tests)
- [ ] P1.M3.T2.S2: PRD Section 7 observer propagation (27 tests)

## Failure Analysis (If Applicable)

### [Test Name]
- **Status**: [FAIL/PASS]
- **Error**: [Error message]
- **Classification**: [Regression / Pre-existing]
- **Root Cause**: [Analysis]
- **Action Required**: [Fix / Document / Ignore]

## Expected Stderr Output

The following stderr output is **expected and normal**:

```
stderr | src/__tests__/adversarial/edge-case.test.ts > ...
Observer onEvent error: Error: Event observer error

stderr | src/__tests__/integration/bidirectional-consistency.test.ts > ...
Cannot attach child 'Root' - it is an ancestor of 'Child'. This would create a circular reference.
```

## Recommendations

1. [Based on test results - next steps]
2. [...]

## Conclusion

**Status**: [PASS / FAIL]

[Summary statement about P1 completion readiness]

---

**Verified By**: Automated test execution
**Verification Date**: [DATE_TIME]
**Task**: P1.M3.T2.S3 - Run full test suite and verify all pass
```

### Test Result Parsing Script (Optional)

```bash
#!/bin/bash
# parse-test-results.sh - Parse vitest output and generate metrics

# Run tests and capture output
OUTPUT=$(npm test 2>&1)
EXIT_CODE=$?

# Save raw output
echo "$OUTPUT" > plan/bugfix/P1M3T2S3/test-output.txt

# Extract metrics
TEST_FILES=$(echo "$OUTPUT" | grep "Test Files" | awk '{print $3}')
TOTAL_TESTS=$(echo "$OUTPUT" | grep "Tests " | awk '{print $2}')
PASSED_TESTS=$(echo "$OUTPUT" | grep "Tests " | awk '{print $3}' | tr -d '()')

# Calculate pass rate
if [ "$TOTAL_TESTS" -gt 0 ]; then
  PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
else
  PASS_RATE=0
fi

# Print summary
echo "Test Files: $TEST_FILES"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed Tests: $PASSED_TESTS"
echo "Pass Rate: ${PASS_RATE}%"
echo "Exit Code: $EXIT_CODE"

# Check success criteria
if [ "$EXIT_CODE" -eq 0 ] && [ "$TOTAL_TESTS" -ge 260 ] && [ "$PASS_RATE" -eq 100 ]; then
  echo "STATUS: PASS - All success criteria met"
  exit 0
else
  echo "STATUS: FAIL - Success criteria not met"
  exit 1
fi
```

## Validation Loop

### Level 1: Pre-Execution Validation

```bash
# Verify Node version
node --version
# Expected: v18.x.x or higher

# Verify dependencies
npm list --depth=0 | grep vitest
# Expected: vitest@1.0.0 or higher

# Verify test files exist
find src/__tests__ -name "*.test.ts" | wc -l
# Expected: 26 test files

# Get current commit for traceability
git rev-parse HEAD
git branch --show-current
```

### Level 2: Test Execution

```bash
# Execute full test suite
npm test

# Expected output format:
# Test Files  26 passed (26)
#      Tests  339 passed (339)
#   Start at  HH:MM:SS
#   Duration  X.XXs (transform XXms, setup Xms, collect XXms, tests XXms, environment XXms, prepare XXms)

# Expected exit code: 0
# Expected pass rate: 100%
# Expected test count: 260+ (actual: 339)
```

### Level 3: Result Parsing and Report Generation

```bash
# Verify test results file created
ls -la plan/bugfix/P1M3T2S3/test-results.md
# Expected: File exists with content

# Verify report contains required sections
grep -q "## Overall Results" plan/bugfix/P1M3T2S3/test-results.md
grep -q "## Test Metrics" plan/bugfix/P1M3T2S3/test-results.md
grep -q "## Comparison vs Baseline" plan/bugfix/P1M3T2S3/test-results.md
# Expected: All sections present

# Verify success criteria
grep -q "Pass Rate.*100%" plan/bugfix/P1M3T2S3/test-results.md
grep -q "Total Tests.*33[0-9]" plan/bugfix/P1M3T2S3/test-results.md
# Expected: Pass rate 100%, test count >= 260
```

### Level 4: Final Validation Checklist

```bash
# Manual verification steps

# 1. Review test output for unexpected failures
# - Look for "FAIL" markers (expected: none)
# - Look for timeout errors (expected: none)
# - Verify expected stderr is present (observer errors, circular reference messages)

# 2. Verify test count increase is explained
# - New tests from P1.M2 (detachChild): ~5 tests
# - New tests from P1.M3.T1 (adversarial): ~15 tests
# - New tests from P1.M3.T1.S4 (bidirectional): ~34 tests
# - New tests from P1.M3.T2.S1 (PRD 12.2): ~27 tests
# - New tests from P1.M3.T2.S2 (observer): ~27 tests
# Total new: ~108 tests
# Baseline: 244 tests
# Expected total: ~352 tests (actual may vary slightly)

# 3. Verify all new test files are present
ls src/__tests__/adversarial/prd-12-2-compliance.test.ts
ls src/__tests__/adversarial/observer-propagation.test.ts
ls src/__tests__/adversarial/deep-hierarchy-stress.test.ts
ls src/__tests__/adversarial/manual-parent-mutation.test.ts
ls src/__tests__/adversarial/complex-circular-reference.test.ts
ls src/__tests__/integration/bidirectional-consistency.test.ts
# Expected: All files exist

# 4. Verify report is complete and accurate
cat plan/bugfix/P1M3T2S3/test-results.md
# Expected: All sections filled, metrics match console output
```

## Final Validation Checklist

### Technical Validation

- [ ] Test suite executed successfully via `npm test`
- [ ] Exit code is 0 (success)
- [ ] Total test count is 260+ (expected: 339 based on latest run)
- [ ] Pass rate is 100% (all tests passing)
- [ ] Test duration is reasonable (< 5 seconds for full suite)
- [ ] All 26 test files were discovered and executed
- [ ] Report file created at `plan/bugfix/P1M3T2S3/test-results.md`

### Report Content Validation

- [ ] Report includes test execution summary (date, commit, command)
- [ ] Report includes overall results table with all metrics
- [ ] Report includes per-file breakdown (unit, integration, adversarial)
- [ ] Report includes comparison vs baseline (P1.M1.T2.S4)
- [ ] Report lists all new tests added since baseline
- [ ] Report documents expected stderr output
- [ ] Report includes recommendations and conclusion

### Feature Validation (P1 Bug Fix)

- [ ] Parent validation tests pass (parent-validation.test.ts)
- [ ] Circular reference detection tests pass (circular-reference.test.ts)
- [ ] DetachChild tests pass (workflow-detachChild.test.ts)
- [ ] Deep hierarchy stress tests pass (deep-hierarchy-stress.test.ts)
- [ ] Manual parent mutation tests pass (manual-parent-mutation.test.ts)
- [ ] Complex circular reference tests pass (complex-circular-reference.test.ts)
- [ ] Bidirectional consistency tests pass (bidirectional-consistency.test.ts)
- [ ] PRD Section 12.2 compliance tests pass (prd-12-2-compliance.test.ts)
- [ ] Observer propagation tests pass (observer-propagation.test.ts)

### Regression Detection

- [ ] No tests that passed in baseline are now failing
- [ ] All unit tests from baseline still pass (131 tests)
- [ ] All integration tests from baseline still pass (13 tests)
- [ ] All adversarial tests from baseline still pass (101 tests)
- [ ] No unexpected error messages in stderr

### Documentation & Deployment

- [ ] Test results report is formatted in Markdown
- [ ] Report includes clear success/failure status
- [ ] Report specifies readiness for P1.M4 (Documentation & Final Validation)
- [ ] Any deviations from expectations are documented with explanation

## Anti-Patterns to Avoid

- **Don't ignore failing tests** - All tests must pass for P1 completion
- **Don't skip test categories** - Run full suite, not just subset
- **Don't use watch mode** - Use `npm test` (single run), not `npm run test:watch`
- **Don't ignore expected stderr** - Observer errors and circular reference messages are normal
- **Don't forget to capture exit code** - Exit code 0 = success, 1 = failure
- **Don't confuse test count expectations** - 260+ was minimum estimate, 339 actual is GOOD
- **Don't skip per-file breakdown** - Detailed breakdown helps identify problem areas
- **Don't omit baseline comparison** - Needed to detect regressions
- **Don't forget traceability** - Include commit hash and date in report
- **Don't use manual test execution** - Use npm test for consistency
- **Don't ignore slow tests** - tree-mirroring.test.ts is expected to be slow (~1400ms)
- **Don't skip report generation** - Report is primary deliverable for this task

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Validation**: This PRP provides:
1. Exact test execution commands for this project
2. Baseline test results for regression comparison
3. Expected test count and success criteria
4. Complete test file organization breakdown
5. Report template with all required sections
6. Validation commands for each step
7. Clear gotchas and expected behavior
8. Optional parsing script for automation

**Risk Mitigation**:
- Single command execution (`npm test`) minimizes error risk
- Baseline comparison (P1.M1.T2.S4) provides regression detection
- Expected stderr documented to prevent false alarms
- Report template ensures complete deliverable
- Multiple validation levels catch issues early
- Clear success criteria (100% pass rate, 260+ tests)
