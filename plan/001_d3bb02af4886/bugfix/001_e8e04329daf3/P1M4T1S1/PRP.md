# Product Requirement Prompt (PRP): Run Full Test Suite

## Goal

**Feature Goal**: Execute the complete test suite to verify all 344+ tests pass after bug fix implementations from milestones P1.M1, P1.M2, and P1.M3.

**Deliverable**: A comprehensive test execution report documenting total test count, pass count, fail count, and analysis of any failures (distinguishing pre-existing from newly introduced).

**Success Definition**:
- All 344+ existing tests pass without regressions
- Test execution results captured with detailed metrics
- Any failures documented with root cause analysis
- Report stored at `plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T1S1/TEST_EXECUTION_REPORT.md`

## User Persona

**Target User**: Development team and QA engineers responsible for validating bug fix implementations.

**Use Case**: Final validation step after completing all bug fixes to ensure no regressions were introduced and the system remains stable.

**User Journey**:
1. Execute full test suite using appropriate vitest command
2. Capture and parse test output for metrics
3. Analyze any failures to determine if they're pre-existing or caused by bug fixes
4. Document findings in structured report
5. If failures are found, coordinate with next subtask (P1.M4.T1.S2) for fixes

**Pain Points Addressed**:
- Manual test execution and result capture is error-prone
- Need to distinguish between pre-existing failures and regressions
- Requirement for auditable validation of bug fix quality

## Why

- **Quality Assurance**: Ensures all bug fixes from P1.M1 (WorkflowLogger.child()), P1.M2 (Promise.allSettled, ErrorMergeStrategy), and P1.M3 (observer error logging, tree debugger optimization, workflow name validation, isDescendantOf) don't break existing functionality
- **Regression Prevention**: Baseline of 344+ passing tests must be maintained
- **Release Readiness**: Test results inform whether the codebase is ready for documentation and release steps
- **Risk Mitigation**: Early detection of test failures prevents shipping broken code

## What

Execute the complete test suite using Vitest and produce a detailed execution report.

### Success Criteria

- [ ] Test suite executes completely (no early termination)
- [ ] Test count metrics captured: total tests, passed, failed, skipped
- [ ] 344+ tests pass (matching or exceeding baseline)
- [ ] All test failures analyzed and documented
- [ ] Pre-existing failures distinguished from new regressions
- [ ] Execution report generated at specified path
- [ ] Report includes vitest command used and execution timestamp

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: Yes - this PRP provides complete context including vitest configuration, test structure, bug fix summaries, expected baseline, and execution procedures.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://vitest.dev/guide/cli.html
  why: CLI command reference for running tests and capturing output
  critical: Use `vitest run` for CI mode (single run), `--reporter=json` for programmatic parsing

- url: https://vitest.dev/guide/reporters.html
  why: Built-in reporter options for different output formats
  critical: JSON reporter enables automated test count extraction

- file: /home/dustin/projects/groundswell/vitest.config.ts
  why: Test configuration - shows test file pattern (`src/__tests__/**/*.test.ts`)
  pattern: include: ['src/__tests__/**/*.test.ts'], globals: true
  gotcha: Tests use global describe/it/expect (no imports needed)

- file: /home/dustin/projects/groundswell/package.json
  why: NPM scripts for test execution
  pattern: "test": "vitest run", "test:watch": "vitest"
  gotcha: Use `npm test` for consistent execution via project script

- file: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/TEST_RESULTS.md
  why: Documents expected baseline of 344 passing tests
  section: "Testing Summary" and "Positive Findings"
  gotcha: Baseline is 344 tests; any significant deviation requires investigation

- file: /home/dustin/projects/groundswell/docs/vitest-research.md
  why: Project-specific vitest research with command examples
  section: "Running Full Test Suite and Capturing Detailed Output"
  gotcha: Multiple reporter formats available - JSON recommended for parsing

- file: /home/dustin/projects/groundswell/src/__tests__/**/*.test.ts
  why: Understanding test structure and patterns in the codebase
  pattern: Three categories: unit/, integration/, adversarial/
  gotcha: 39 test files with ~175 test cases (some describe blocks contain nested tests)

# Bug Fix Implementation Context
- file: /home/dustin/projects/groundswell/src/core/logger.ts
  why: P1.M1.T1 fix - WorkflowLogger.child() signature change
  section: Lines 102-110 (method overloads and implementation)
  gotcha: Backward compatible - accepts both string and Partial<LogEntry>

- file: /home/dustin/projects/groundswell/src/decorators/task.ts
  why: P1.M2.T1 and P1.M2.T2 fixes - Promise.allSettled and ErrorMergeStrategy
  section: Lines 113-142 (Promise.allSettled implementation), Lines 121-138 (error merging)
  gotcha: Error handling now aggregates failures instead of throwing first error

- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: P1.M3.T1, P1.M3.T3, P1.M3.T4 fixes - Observer logging, name validation, isDescendantOf
  section: Lines 426/444 (observer error logging), Lines 99-107 (name validation), Line 201 (isDescendantOf visibility)
  gotcha: isDescendantOf changed from private to public

- file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
  why: P1.M3.T2 fix - Tree debugger node map optimization
  section: Lines 65-115 (removeSubtreeNodes and optimized onTreeChanged)
  gotcha: Performance optimization - should not affect test results

# Test Utilities and Helpers
- file: /home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts
  why: Critical tree validation helpers used throughout tests
  pattern: collectAllNodes(), validateTreeConsistency(), verifyTreeMirror()
  gotcha: Tests verify 1:1 mirror invariant between Workflow and WorkflowNode trees
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── __tests__/
│   │   ├── unit/              # Unit tests for individual components
│   │   ├── integration/       # Integration tests between components
│   │   ├── adversarial/       # Stress tests and edge cases
│   │   └── helpers/           # Shared test utilities
│   │       └── tree-verification.ts
│   ├── core/
│   │   ├── logger.ts          # P1.M1.T1: WorkflowLogger.child() fix
│   │   └── workflow.ts        # P1.M3.T1/T3/T4: Observer logging, validation, isDescendantOf
│   ├── decorators/
│   │   └── task.ts            # P1.M2.T1/T2: Promise.allSettled, ErrorMergeStrategy
│   └── debugger/
│       └── tree-debugger.ts   # P1.M3.T2: Node map optimization
├── vitest.config.ts           # Test configuration
├── package.json               # NPM scripts: "test": "vitest run"
└── plan/
    └── 001_d3bb02af4886/
        └── bugfix/
            └── 001_e8e04329daf3/
                └── P1M4T1S1/
                    └── PRP.md  # This file
```

### Desired Codebase Tree (Files to be Added)

```bash
plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T1S1/
├── PRP.md                     # This file
├── TEST_EXECUTION_REPORT.md   # OUTPUT: Test execution results (to be created)
└── research/                  # Research artifacts (optional)
    └── vitest-research.md     # External vitest documentation research
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Vitest configuration uses global test functions
// No need to import { describe, it, expect } from 'vitest' - they're global

// CRITICAL: Test file pattern is strict
// Only files matching src/__tests__/**/*.test.ts will be executed
// Test files elsewhere in the codebase will be ignored

// CRITICAL: Expected baseline is 344+ tests
// Documented in plan/001_d3bb02af4886/TEST_RESULTS.md
// Significant deviation from this count requires investigation

// GOTCHA: Test count can vary
// The 344 number is from a previous validation
// New tests may have been added in bug fixes
// Check for recent test additions in modified files

// GOTCHA: Some tests may be skipped
// Look for test.skip() or describe.skip() in test files
// Skipped tests appear in output but don't count as passed/failed

// GOTCHA: Promise.allSettled change affects error handling tests
// P1.M2.T1 changed concurrent task error behavior
// Tests expecting first-error-to-fail may need updates
// Error merge strategy tests (P1.M2.T2.S4) should cover new behavior

// GOTCHA: Workflow name validation may break existing tests
// P1.M3.T3 added strict validation for workflow names
// Tests creating workflows with empty/long names may now fail
// Check test workflow construction in setUp/beforeEach blocks

// PATTERN: Tree verification helpers are critical
// Many tests use helpers/tree-verification.ts for validation
// Failures in tree-related tests often indicate core invariant violations
```

## Implementation Blueprint

### Data Models and Structure

No data models required - this is a validation and reporting task. Output will be Markdown documentation.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: EXECUTE test suite with verbose output
  - COMMAND: npm test 2>&1 | tee test-output.log
  - PURPOSE: Run full test suite and capture complete output
  - OUTPUT: Console output saved to test-output.log
  - VALIDATION: Command exits with code 0 (all tests pass) or non-zero (failures present)
  - TIMEOUT: None (let tests complete fully)

Task 2: EXECUTE test suite with JSON reporter for programmatic parsing
  - COMMAND: npm test -- --reporter=json --outputFile=test-results.json
  - PURPOSE: Generate machine-readable test results
  - OUTPUT: test-results.json with detailed test metrics
  - VALIDATION: JSON file is created and valid
  - DEPENDS ON: Task 1 (optional - can run in parallel)

Task 3: PARSE test results and extract metrics
  - INPUT: test-output.log and/or test-results.json
  - EXTRACT: Total tests, passed, failed, skipped, duration
  - METHOD: Parse console output OR JSON file
  - OUTPUT: Structured metrics object with counts
  - DEPENDS ON: Task 1 or Task 2

Task 4: ANALYZE any test failures
  - INPUT: Failed test names and error messages from test results
  - DETERMINE: Pre-existing vs. newly introduced failures
  - METHOD: Compare against TEST_RESULTS.md baseline, check test dates, review git blame
  - OUTPUT: Failure analysis with root cause assessment
  - DEPENDS ON: Task 3

Task 5: CREATE test execution report
  - TEMPLATE: Use markdown format with sections for summary, metrics, failures, analysis
  - CONTENT: Include command used, timestamp, metrics, failure details
  - LOCATION: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T1S1/TEST_EXECUTION_REPORT.md
  - DEPENDS ON: Task 3 and Task 4
  - REQUIRED SECTIONS:
    - Execution Summary (command, timestamp, duration)
    - Test Metrics (total, passed, failed, skipped, pass rate)
    - Failure Analysis (if any failures)
    - Regression Assessment (new vs. pre-existing)
    - Recommendations (next steps)

Task 6: VERIFY report completeness
  - CHECK: All required sections present
  - CHECK: Metrics accurate and consistent with console output
  - CHECK: File saved at correct path
  - CHECK: Markdown formatting valid
  - DEPENDS ON: Task 5
```

### Implementation Patterns & Key Details

```bash
# Pattern: Running tests with multiple reporters
npm test -- --reporter=verbose --reporter=json --outputFile=test-results.json
# This produces both console output and JSON file for analysis

# Pattern: Extracting test count from vitest output
# Vitest console output format:
# Test Files  39 passed (39)
#      Tests  344 passed (344)
# Use grep/awk to extract:
npm test 2>&1 | grep -E "Test Files|Tests" | tee test-summary.txt

# Pattern: JSON result parsing (Node.js one-liner)
node -e "const data = require('./test-results.json'); console.log(\`Total: \${data.stats.tests}, Passed: \${data.stats.tests - data.stats.failures}, Failed: \${data.stats.failures}\`)"

# Pattern: Checking for pre-existing failures
git log --oneline --all -- "src/__tests__/**/*.test.ts" | head -20
# Shows recent test file modifications

# Pattern: Analyzing specific test failures
npm test -- --testNamePattern="failing_test_name"
# Run only the failing test for detailed output

# Pattern: Determining if failure is new
git diff HEAD~5 -- "src/__tests__/file_with_failure.test.ts"
# Check if test was recently modified as part of bug fixes
```

### Integration Points

```yaml
NPM_SCRIPTS:
  - use: npm test
  - command: vitest run
  - location: package.json scripts section
  - gotcha: Don't use vitest directly - always use npm script for consistency

VITEST_CONFIG:
  - location: vitest.config.ts
  - include pattern: src/__tests__/**/*.test.ts
  - globals: true (describe/it/expect available globally)

DOCUMENTATION:
  - baseline: plan/001_d3bb02af4886/TEST_RESULTS.md
  - expected: 344+ passing tests
  - reference for comparison

NEXT_SUBTASK:
  - if failures found: P1.M4.T1.S2 (Fix any test failures caused by bug fixes)
  - handoff: Include failure details in report for next subtask
```

## Validation Loop

### Level 1: Test Execution Completeness (Immediate Feedback)

```bash
# Verify test suite runs to completion
npm test 2>&1 | tee test-output.log

# Check for early termination or crashes
grep -i "error\|exception\|crash" test-output.log
# Expected: No unexpected errors or crashes (test failures are OK)

# Verify output contains test summary
grep -E "Test Files|Tests" test-output.log
# Expected: Summary lines with counts present

# Check exit code
echo $?
# Expected: 0 if all tests pass, 1 if any tests fail (both are valid outcomes)
```

### Level 2: Metrics Extraction Accuracy (Component Validation)

```bash
# Generate JSON output for programmatic validation
npm test -- --reporter=json --outputFile=test-results.json

# Verify JSON file exists and is valid
cat test-results.json | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
# Expected: "Valid JSON"

# Extract and verify metrics
cat test-results.json | jq '.stats | {tests: .tests, passed: (.tests - .failures), failed: .failures, duration: .duration}'
# Expected: Object with all fields populated

# Compare console output with JSON counts
CONSOLE_TESTS=$(grep "Tests" test-output.log | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
JSON_TESTS=$(cat test-results.json | jq -r '.stats.tests')
echo "Console: $CONSOLE_TESTS, JSON: $JSON_TESTS"
# Expected: Numbers match (or close if accounting for skipped tests)
```

### Level 3: Baseline Validation (System Validation)

```bash
# Verify test count meets or exceeds baseline
CURRENT_COUNT=$(cat test-results.json | jq -r '.stats.tests')
BASELINE_COUNT=344
if [ "$CURRENT_COUNT" -ge "$BASELINE_COUNT" ]; then
  echo "PASS: Test count ($CURRENT_COUNT) meets baseline ($BASELINE_COUNT)"
else
  echo "WARNING: Test count ($CURRENT_COUNT) below baseline ($BASELINE_COUNT)"
fi

# Check pass rate
PASSED=$(cat test-results.json | jq -r '.stats.tests - .stats.failures')
PASS_RATE=$(echo "scale=2; $PASSED * 100 / $CURRENT_COUNT" | bc)
echo "Pass rate: $PASS_RATE%"
# Expected: 100% for success, <100% requires failure analysis

# Verify no new test files were accidentally excluded
NEW_TEST_FILES=$(git diff --name-only HEAD~10 | grep -E "\.test\.ts$" | wc -l)
echo "New or modified test files: $NEW_TEST_FILES"
# Expected: Informational - helps explain count changes
```

### Level 4: Report Quality Validation

```bash
# Verify report file exists
REPORT_PATH="plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T1S1/TEST_EXECUTION_REPORT.md"
if [ -f "$REPORT_PATH" ]; then
  echo "PASS: Report file exists at $REPORT_PATH"
else
  echo "FAIL: Report file not found"
fi

# Verify required sections exist in report
for section in "Execution Summary" "Test Metrics" "Failure Analysis" "Regression Assessment"; do
  if grep -q "$section" "$REPORT_PATH"; then
    echo "PASS: Section '$section' present"
  else
    echo "FAIL: Section '$section' missing"
  fi
done

# Verify markdown formatting
grep -E "^#+ " "$REPORT_PATH" | head -20
# Expected: Proper heading hierarchy present

# Verify test count documented in report
grep -E "[0-9]+ test" "$REPORT_PATH"
# Expected: Test counts mentioned in report
```

## Final Validation Checklist

### Technical Validation

- [ ] Test suite executed completely with `npm test`
- [ ] Test output captured (console and/or JSON)
- [ ] Metrics extracted: total, passed, failed, skipped
- [ ] Test count meets or exceeds baseline (344+)
- [ ] Report file created at specified path
- [ ] Report contains all required sections

### Feature Validation

- [ ] Execution summary includes command, timestamp, duration
- [ ] Test metrics are accurate and clearly presented
- [ ] Failures (if any) are documented with error details
- [ ] Failure analysis distinguishes new vs. pre-existing
- [ ] Regression assessment is supported by evidence
- [ ] Recommendations provided for next steps (if applicable)

### Code Quality Validation

- [ ] Report follows markdown best practices
- [ ] All claims are supported by test output evidence
- [ ] File paths and commands are accurate
- [ ] Analysis is objective and fact-based
- [ ] Report is self-contained (no external references required)

### Documentation & Deployment

- [ ] Report stored at correct path: `plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T1S1/TEST_EXECUTION_REPORT.md`
- [ ] Report is readable by both humans and machines
- [ ] Timestamped for version control traceability
- [ ] Ready for handoff to P1.M4.T1.S2 if failures found

---

## Anti-Patterns to Avoid

- ❌ Don't assume test count without verification - always run and count
- ❌ Don't ignore skipped tests - document them separately
- ❌ Don't confuse test files with test cases (39 files != 39 tests)
- ❌ Don't modify tests during execution - this is a read-only validation task
- ❌ Don't rely on memory - capture all output to files
- ❌ Don't blame failures on bug fixes without evidence - verify with git history
- ❌ Don't skip the report creation - output is the primary deliverable
- ❌ Don't use relative paths in report - all paths should be absolute from project root
- ❌ Don't forget to document the vitest version used
- ❌ Don't proceed to P1.M4.T1.S2 without completing this report

## Appendix: Quick Reference

### Vitest Commands for This Task

```bash
# Basic test execution
npm test

# Verbose output with capture
npm test 2>&1 | tee test-output.log

# JSON output for parsing
npm test -- --reporter=json --outputFile=test-results.json

# Both console and JSON
npm test -- --reporter=verbose --reporter=json --outputFile=test-results.json

# Run specific test file (for debugging failures)
npm test -- src/__tests__/unit/workflow.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="child"
```

### Test Result JSON Structure

```json
{
  "stats": {
    "tests": 344,
    "failures": 0,
    "errors": 0,
    "duration": 5000
  },
  "testFiles": [
    {
      "name": "src/__tests__/unit/workflow.test.ts",
      "tests": [
        {
          "name": "Workflow should execute steps",
          "result": {
            "status": "pass"
          }
        }
      ]
    }
  ]
}
```

### Report Template

```markdown
# Test Execution Report - P1.M4.T1.S1

## Execution Summary
- **Command**: `npm test`
- **Timestamp**: YYYY-MM-DD HH:MM:SS
- **Duration**: X seconds
- **Vitest Version**: X.X.X

## Test Metrics
- **Total Tests**: XXX
- **Passed**: XXX
- **Failed**: XXX
- **Skipped**: XXX
- **Pass Rate**: XX%

## Failure Analysis
[List any failures with error details and root cause analysis]

## Regression Assessment
[Analysis of whether failures are new or pre-existing]

## Recommendations
[Next steps based on findings]
```
