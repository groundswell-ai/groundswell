# Product Requirement Prompt (PRP): Add tests for new child() signature with Partial<LogEntry>

**Work Item**: P1.M1.T1.S3 - Add tests for new child() signature with Partial<LogEntry>
**PRD Reference**: Section 12.1 - WorkflowLogger Skeleton
**Implementation Target**: src/__tests__/unit/logger.test.ts (NEW FILE)

---

## Goal

**Feature Goal**: Create comprehensive test suite for the updated `WorkflowLogger.child()` method that validates both the new `Partial<LogEntry>` signature and backward compatibility with the legacy string signature.

**Deliverable**: A new test file `src/__tests__/unit/logger.test.ts` containing:
1. Tests for child() with `Partial<LogEntry>` containing parentLogId
2. Tests for child() with `Partial<LogEntry>` containing id (should NOT use as parentLogId)
3. Tests for child() with string parameter (backward compatibility)
4. Tests for child() with empty object
5. Verification that parentLogId is correctly set in child logger's log entries
6. Parameterized tests for multiple log levels with child logger

**Success Definition**:
- All new tests pass
- All 344 existing tests continue to pass
- Test coverage for child() method is comprehensive
- Backward compatibility is verified
- Tests follow established vitest patterns from the codebase

## User Persona

**Target User**: QA engineer and future developers maintaining the logger functionality

**Use Case**: Ensuring the child() method works correctly with both legacy string calls and new Partial<LogEntry> calls

**User Journey**:
1. Run `npm test` to execute all tests including new logger tests
2. Review test coverage to ensure child() is fully tested
3. Use tests as documentation for expected child() behavior
4. Run tests when making changes to WorkflowLogger

**Pain Points Addressed**:
- **No dedicated logger tests**: Logger functionality is tested indirectly through workflow tests
- **Incomplete child() coverage**: Only adversarial tests exist for child() method
- **Unclear behavior**: Tests document exactly how parentLogId is handled in different scenarios
- **Regression risk**: Comprehensive tests prevent breaking changes in future modifications

## Why

- **Quality Gate**: P1.M1.T1.S2 implemented the signature change; S3 validates it works correctly
- **Backward Compatibility**: Ensures existing string-based calls continue to work
- **Documentation**: Tests serve as living documentation of child() behavior
- **Regression Prevention**: Catches any future changes that break child() functionality
- **PRD Compliance**: Validates the implementation matches PRD specification

## What

### Success Criteria

- [ ] New test file created at `src/__tests__/unit/logger.test.ts`
- [ ] Tests cover child() with `Partial<LogEntry>` containing parentLogId
- [ ] Tests cover child() with `Partial<LogEntry>` containing id (undefined parentLogId)
- [ ] Tests cover child() with string parameter (backward compatibility)
- [ ] Tests cover child() with empty object (undefined parentLogId)
- [ ] Tests verify parentLogId is set in child logger's log entries
- [ ] All 344 existing tests continue to pass
- [ ] Tests follow vitest patterns (describe/it, globals: true)
- [ ] Tests use Workflow extension pattern for testing

---

## All Needed Context

### Context Completeness Check

_This PRP passes the "No Prior Knowledge" test - someone unfamiliar with the codebase would have everything needed to implement this successfully._

### Documentation & References

```yaml
# MUST READ - Updated child() Implementation
- file: src/core/logger.ts
  why: Current child() implementation with function overloads (lines 81-94)
  pattern: Type guard `typeof input === 'string'` to narrow union type
  critical: Implementation extracts parentLogId differently for string vs object

# MUST READ - LogEntry Type Definition
- file: src/types/logging.ts
  why: Complete LogEntry interface with all 7 fields
  section: Lines 9-24
  critical: parentLogId is optional (parentLogId?: string)

# MUST READ - Existing Test Patterns
- file: src/__tests__/adversarial/deep-analysis.test.ts
  why: Example of child() test with empty string (line 61)
  pattern: Workflow extension pattern, node.logs verification

- file: src/__tests__/adversarial/edge-case.test.ts
  why: Example of child() test with parent ID (line 96)
  pattern: Workflow extension pattern

- file: src/__tests__/unit/workflow.test.ts
  why: Example of basic logging test patterns
  pattern: Observer pattern for capturing logs

# MUST READ - Vitest Configuration
- file: vitest.config.ts
  why: Vitest configuration with globals: true
  pattern: No imports needed for describe/it/expect

# MUST READ - Test Scripts
- file: package.json
  why: Test scripts to run
  section: `"test": "vitest run"`, `"test:watch": "vitest"`

# REFERENCE - S2 PRP
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M1T1S2/PRP.md
  why: Context on child() implementation from previous subtask
  section: Implementation Blueprint shows exact overload signatures

# REFERENCE - Vitest Documentation
- url: https://vitest.dev/api/test.html#test-each
  why: Parameterized test syntax for testing multiple log levels
  critical: test.each() with array or template string syntax

- url: https://vitest.dev/api/mock.html
  why: Mock function patterns (vi.fn, vi.spyOn)
  critical: beforeEach/afterEach for setup/teardown

# RESEARCH - Test Patterns
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M1T1S3/test_patterns_research.md
  why: Comprehensive analysis of existing test patterns in codebase

# RESEARCH - Implementation Details
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M1T1S3/child_implementation_research.md
  why: Detailed analysis of child() behavior for each input type

# RESEARCH - Vitest Best Practices
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M1T1S3/vitest_patterns_research.md
  why: Vitest testing patterns and best practices
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── logger.ts              # WorkflowLogger class with child() at lines 81-94
│   ├── workflow.ts            # Workflow class that creates root logger
│   └── index.ts
├── types/
│   ├── logging.ts             # LogEntry, LogLevel definitions
│   ├── observer.ts            # WorkflowObserver interface
│   └── index.ts
└── __tests__/
    ├── unit/
    │   └── workflow.test.ts   # Basic logging tests (no child() tests)
    └── adversarial/
        ├── deep-analysis.test.ts    # Uses child('') at line 61
        └── edge-case.test.ts        # Uses child('parent-id-123') at line 96
```

### Desired Codebase Tree with Files to be Added

```bash
# CREATE: src/__tests__/unit/logger.test.ts
# Responsibility: Comprehensive test suite for WorkflowLogger.child() method
#
# Test Coverage:
#   - child() with Partial<LogEntry> containing parentLogId
#   - child() with Partial<LogEntry> containing id (undefined parentLogId)
#   - child() with string parameter (backward compatibility)
#   - child() with empty object (undefined parentLogId)
#   - child() with string containing parentLogId
#   - Parameterized tests for all log levels with child logger
#   - Verification that parentLogId is set in log entries
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Empty string '' is falsy, so parentLogId becomes undefined
// Test expectation: workflow.node.logs[0].parentLogId).toBeUndefined()

// CRITICAL: child() with { id: 'some-id' } does NOT use id as parentLogId
// The implementation only extracts input.parentLogId, not input.id
// Test expectation: parentLogId should be undefined

// CRITICAL: vitest uses globals: true, no imports needed
// describe, it, expect, vi are available globally

// GOTCHA: Tests must extend Workflow class and use this.logger
// Cannot instantiate WorkflowLogger directly due to constructor requirements

// PATTERN: Verify logs via workflow.node.logs array
// expect(workflow.node.logs[0].parentLogId).toBe('expected-id')

// PATTERN: Use Workflow extension for test isolation
// class TestWorkflow extends Workflow { async run() { /* test logic */ } }

// GOTCHA: Must await workflow.run() before asserting on logs
// Logs are created during workflow execution
```

---

## Implementation Blueprint

### Test File Structure

The test file should follow this structure:

```typescript
// File: src/__tests__/unit/logger.test.ts
import { describe, it, expect } from 'vitest';
import { Workflow } from '../../core/workflow';
import type { LogEntry } from '../../types/logging';

describe('WorkflowLogger.child()', () => {
  // Group 1: New functionality - Partial<LogEntry> with parentLogId
  describe('with Partial<LogEntry> containing parentLogId', () => {
    // Test cases...
  });

  // Group 2: Edge cases - Partial<LogEntry> with other fields
  describe('with Partial<LogEntry> containing id field', () => {
    // Test cases...
  });

  // Group 3: Empty object
  describe('with empty Partial<LogEntry>', () => {
    // Test cases...
  });

  // Group 4: Backward compatibility - string parameter
  describe('with string parameter (backward compatibility)', () => {
    // Test cases...
  });

  // Group 5: Log levels with child logger
  describe('child logger with different log levels', () => {
    // Parameterized test cases...
  });

  // Group 6: Hierarchical logging
  describe('parent-child log hierarchy', () => {
    // Test cases...
  });
});
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/unit/logger.test.ts
  - IMPLEMENT: Test file structure with describe blocks
  - FOLLOW pattern: src/__tests__/unit/workflow.test.ts (describe/it structure)
  - NAMING: logger.test.ts (follows unit test naming convention)
  - PLACEMENT: src/__tests__/unit/ directory
  - IMPORTS: Workflow from ../../core/workflow, LogEntry type

Task 2: IMPLEMENT tests for child() with Partial<LogEntry> containing parentLogId
  - IMPLEMENT: Test case verifying parentLogId is set correctly
  - FOLLOW pattern: src/__tests__/adversarial/edge-case.test.ts (Workflow extension)
  - VERIFY: workflow.node.logs[0].parentLogId equals provided value
  - NAMING: "should create child logger with parentLogId from Partial<LogEntry>"

Task 3: IMPLEMENT tests for child() with Partial<LogEntry> containing id field
  - IMPLEMENT: Test case verifying id field is NOT used as parentLogId
  - VERIFY: parentLogId is undefined when only id is provided
  - NAMING: "should not use id field as parentLogId"
  - CRITICAL: The implementation only extracts input.parentLogId

Task 4: IMPLEMENT tests for child() with empty object
  - IMPLEMENT: Test case with logger.child({})
  - VERIFY: parentLogId is undefined for empty object
  - NAMING: "should create child logger with undefined parentLogId from empty object"

Task 5: IMPLEMENT tests for child() with string parameter (backward compatibility)
  - IMPLEMENT: Test case with logger.child('parent-id-123')
  - FOLLOW pattern: src/__tests__/adversarial/edge-case.test.ts:96
  - VERIFY: parentLogId equals the string value
  - NAMING: "should create child logger with parentLogId from string (backward compatibility)"

Task 6: IMPLEMENT test for child() with empty string
  - IMPLEMENT: Test case with logger.child('')
  - FOLLOW pattern: src/__tests__/adversarial/deep-analysis.test.ts:61
  - VERIFY: parentLogId is undefined (empty string is falsy)
  - NAMING: "should create child logger with undefined parentLogId from empty string"

Task 7: IMPLEMENT parameterized tests for log levels
  - IMPLEMENT: test.each() for 'debug', 'info', 'warn', 'error' levels
  - FOLLOW pattern: vitest test.each() syntax
  - VERIFY: Each log level works correctly with child logger
  - NAMING: "should log at $level level with child logger"

Task 8: IMPLEMENT tests for parent-child hierarchy
  - IMPLEMENT: Test creating parent log, then child logger, verify relationship
  - VERIFY: Child log entry has parentLogId matching parent log entry id
  - NAMING: "should maintain parent-child relationship in log entries"

Task 9: RUN all tests to verify
  - RUN: npm test -- src/__tests__/unit/logger.test.ts
  - RUN: npm test (full suite)
  - VERIFY: All new tests pass
  - VERIFY: All 344 existing tests still pass
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN: Workflow Extension for Testing
// ============================================
// From: src/__tests__/adversarial/edge-case.test.ts:96

class TestWorkflow extends Workflow {
  async run() {
    // Test logic here
    const childLogger = this.logger.child('parent-id-123');
    childLogger.info('Child message');
  }
}

const workflow = new TestWorkflow();
await workflow.run();

// Verify logs
expect(workflow.node.logs.length).toBe(1);
expect(workflow.node.logs[0].parentLogId).toBe('parent-id-123');

// ============================================
// PATTERN: Vitest Parameterized Tests
// ============================================
// From: vitest documentation

test.each([
  { level: 'debug', method: 'debug' as const },
  { level: 'info', method: 'info' as const },
  { level: 'warn', method: 'warn' as const },
  { level: 'error', method: 'error' as const },
])('should log at $level level with child logger', ({ level, method }) => {
  class TestWorkflow extends Workflow {
    async run() {
      const childLogger = this.logger.child({ parentLogId: 'parent-123' });
      childLogger[method](`Test ${level} message`);
    }
  }

  const workflow = new TestWorkflow();
  workflow.run(); // Note: info/warn/error are sync, only debug might be async

  expect(workflow.node.logs[0].level).toBe(level);
  expect(workflow.node.logs[0].parentLogId).toBe('parent-123');
});

// ============================================
// CRITICAL: parentLogId Verification Pattern
// ============================================

// After workflow.run(), access logs via workflow.node.logs
expect(workflow.node.logs[0].parentLogId).toBe('expected-id');

// For undefined checks:
expect(workflow.node.logs[0].parentLogId).toBeUndefined();

// ============================================
// CRITICAL: Empty String Falsy Behavior
// ============================================

// When child('') is called, parentLogId = ''
// In the log() method, if (this.parentLogId) evaluates to false for ''
// So parentLogId in the log entry becomes undefined

class TestWorkflow extends Workflow {
  async run() {
    const childLogger = this.logger.child('');
    childLogger.info('Test');
  }
}

const workflow = new TestWorkflow();
await workflow.run();

// parentLogId is undefined, NOT ''
expect(workflow.node.logs[0].parentLogId).toBeUndefined();

// ============================================
// GOTCHA: id field is NOT used as parentLogId
// ============================================

class TestWorkflow extends Workflow {
  async run() {
    // This does NOT set parentLogId to 'custom-id'
    const childLogger = this.logger.child({ id: 'custom-id' });
    childLogger.info('Test');
  }
}

const workflow = new TestWorkflow();
await workflow.run();

// parentLogId is undefined because implementation only checks input.parentLogId
expect(workflow.node.logs[0].parentLogId).toBeUndefined();

// ============================================
// PATTERN: Parent-Child Hierarchy Test
// ============================================

class TestWorkflow extends Workflow {
  async run() {
    // Log from parent logger
    this.logger.info('Parent message');

    // Get the parent log entry ID
    const parentLogId = workflow.node.logs[0].id;

    // Create child logger with that ID
    const childLogger = this.logger.child({ parentLogId });
    childLogger.info('Child message');
  }
}

const workflow = new TestWorkflow();
await workflow.run();

// Verify hierarchy
expect(workflow.node.logs.length).toBe(2);
expect(workflow.node.logs[0].parentLogId).toBeUndefined(); // Root log
expect(workflow.node.logs[1].parentLogId).toBe(workflow.node.logs[0].id); // Child log
```

### Integration Points

```yaml
NO CODE CHANGES: This task creates a new test file only

NEW FILES:
  - create: src/__tests__/unit/logger.test.ts
  - content: Comprehensive test suite for child() method

NO CHANGES TO:
  - src/core/logger.ts (implementation from S2)
  - src/__tests__/adversarial/deep-analysis.test.ts
  - src/__tests__/adversarial/edge-case.test.ts

TEST EXECUTION:
  - command: npm test -- src/__tests__/unit/logger.test.ts
  - command: npm test (full suite validation)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating test file
npm test -- src/__tests__/unit/logger.test.ts

# Expected: Tests run (may fail if implementation incomplete, but syntax must be valid)
# If TypeScript errors exist, READ output and fix before proceeding

# Common TypeScript errors and fixes:
# Error: "Cannot find module '../../core/workflow'"
# Fix: Verify import path is correct relative to test file location

# Error: "Property 'logs' does not exist on type 'WorkflowNode'"
# Fix: Access logs via workflow.node.logs (not workflow.logs)

# Type checking
npx tsc --noEmit

# Expected: Zero type errors related to the new test file
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run only the new logger tests
npm test -- src/__tests__/unit/logger.test.ts

# Expected output:
# ✓ logger.test.ts (number of tests)
#   ✓ WorkflowLogger.child()
#     ✓ with Partial<LogEntry> containing parentLogId
#       ✓ should create child logger with parentLogId from Partial<LogEntry>
#     ✓ with Partial<LogEntry> containing id field
#       ✓ should not use id field as parentLogId
#     ✓ with empty Partial<LogEntry>
#       ✓ should create child logger with undefined parentLogId from empty object
#     ✓ with string parameter (backward compatibility)
#       ✓ should create child logger with parentLogId from string
#       ✓ should create child logger with undefined parentLogId from empty string
#     ✓ child logger with different log levels
#       ✓ should log at debug level with child logger
#       ✓ should log at info level with child logger
#       ✓ should log at warn level with child logger
#       ✓ should log at error level with child logger
#     ✓ parent-child log hierarchy
#       ✓ should maintain parent-child relationship in log entries

# Run with coverage (if configured)
npm test -- --coverage src/__tests__/unit/logger.test.ts

# Expected: High coverage for child() method
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite to ensure no regressions
npm test

# Expected: All 344+ existing tests pass + new tests pass
# Test Files: (previous count) + 1 (logger.test.ts)
# Tests: (previous count) + (new test count)

# Run specific existing tests that use child()
npm test -- src/__tests__/adversarial/deep-analysis.test.ts
npm test -- src/__tests__/adversarial/edge-case.test.ts

# Expected: All existing child() tests still pass

# Run workflow tests to ensure logger integration works
npm test -- src/__tests__/unit/workflow.test.ts

# Expected: All workflow logging tests pass
```

### Level 4: Coverage and Quality Validation

```bash
# Generate coverage report
npm test -- --coverage

# Expected: WorkflowLogger child() method has high test coverage

# Verify test file follows conventions
grep -c "describe(" src/__tests__/unit/logger.test.ts  # Should be > 0
grep -c "it(" src/__tests__/unit/logger.test.ts         # Should be > 0

# Verify test patterns match codebase style
head -5 src/__tests__/unit/logger.test.ts
# Should import describe, it, expect from vitest

# Check for proper Workflow extension pattern
grep "class.*extends Workflow" src/__tests__/unit/logger.test.ts
# Should find multiple test workflow classes

# Check for parentLogId assertions
grep -c "parentLogId" src/__tests__/unit/logger.test.ts
# Should be many (each test verifies parentLogId)

# Expected: All checks pass, test follows codebase conventions
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] New test file created at `src/__tests__/unit/logger.test.ts`
- [ ] All new tests pass: `npm test -- src/__tests__/unit/logger.test.ts`
- [ ] All 344+ existing tests pass: `npm test`
- [ ] No TypeScript errors: `npx tsc --noEmit`

### Feature Validation

- [ ] Tests cover child() with `Partial<LogEntry>` containing parentLogId
- [ ] Tests cover child() with `Partial<LogEntry>` containing id (undefined parentLogId)
- [ ] Tests cover child() with string parameter (backward compatibility)
- [ ] Tests cover child() with empty string (undefined parentLogId)
- [ ] Tests cover child() with empty object (undefined parentLogId)
- [ ] Parameterized tests for all log levels
- [ ] Parent-child hierarchy verification
- [ ] All success criteria from contract are met

### Code Quality Validation

- [ ] Tests follow established vitest patterns (describe/it, globals: true)
- [ ] Tests use Workflow extension pattern
- [ ] Tests verify via workflow.node.logs array
- [ ] Test file naming convention followed (logger.test.ts)
- [ ] Tests are self-documenting with clear names
- [ ] No modification to existing code

### Documentation & Completeness

- [ ] Tests serve as documentation for child() behavior
- [ ] Test names clearly indicate what is being tested
- [ ] Edge cases are covered (empty string, empty object, id field)
- [ ] Backward compatibility explicitly tested

---

## Anti-Patterns to Avoid

- [ ] Don't modify existing test files - create new file
- [ ] Don't instantiate WorkflowLogger directly - use Workflow extension
- [ ] Don't forget to await workflow.run() before asserting
- [ ] Don't use vi.mock for WorkflowLogger - test real implementation
- [ ] Don't skip testing edge cases (empty string, empty object)
- [ ] Don't assume id field becomes parentLogId - it doesn't
- [ ] Don't forget that empty string is falsy (parentLogId becomes undefined)
- [ ] Don't use console.log for debugging - use test assertions
- [ ] Don't create tests that depend on execution order
- [ ] Don't modify src/core/logger.ts (implementation is complete from S2)

---

## Appendix: Quick Reference

### Key File Locations

| File | Lines | Purpose |
|------|-------|---------|
| src/__tests__/unit/logger.test.ts | NEW | Test file to create |
| src/core/logger.ts | 81-94 | child() implementation |
| src/types/logging.ts | 9-24 | LogEntry interface |
| src/__tests__/adversarial/deep-analysis.test.ts | 61 | Empty string test pattern |
| src/__tests__/adversarial/edge-case.test.ts | 96 | Normal parent ID test pattern |

### Test Scenarios Summary

| Input | Expected parentLogId | Test Category |
|-------|---------------------|---------------|
| `logger.child({ parentLogId: 'id-123' })` | `'id-123'` | New functionality |
| `logger.child({ id: 'custom-id' })` | `undefined` | Edge case |
| `logger.child({})` | `undefined` | Edge case |
| `logger.child('string-parent')` | `'string-parent'` | Backward compat |
| `logger.child('')` | `undefined` | Backward compat |

### Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { Workflow } from '../../core/workflow';

describe('WorkflowLogger.child()', () => {
  it('should create child logger with parentLogId from Partial<LogEntry>', async () => {
    class TestWorkflow extends Workflow {
      async run() {
        const childLogger = this.logger.child({ parentLogId: 'parent-123' });
        childLogger.info('Child message');
      }
    }

    const workflow = new TestWorkflow();
    await workflow.run();

    expect(workflow.node.logs.length).toBe(1);
    expect(workflow.node.logs[0].parentLogId).toBe('parent-123');
    expect(workflow.node.logs[0].message).toBe('Child message');
  });
});
```

### Confidence Score

**9/10** for one-pass implementation success likelihood

**Rationale**:
- Clear test requirements specified in contract
- Comprehensive research provided on existing patterns
- Implementation is complete (from S2), only tests needed
- Well-defined test scenarios with expected outcomes
- No code changes required - pure test creation

**Risk Factors**:
- Edge case behavior (empty string, id field) must be understood
- Workflow extension pattern must be followed correctly
- Test assertions must use correct property access (workflow.node.logs)

**Mitigation**:
- Research documents clearly document child() behavior for each input type
- Existing test patterns provide clear examples to follow
- PRP includes detailed test templates
- Validation gates ensure tests actually verify correct behavior

---

**PRP Version**: 1.0
**Created**: 2026-01-12
**For**: P1.M1.T1.S3 - Add tests for new child() signature with Partial<LogEntry>
**Next Task**: P1.M1.T1.S4 - Verify all existing child() calls still work
