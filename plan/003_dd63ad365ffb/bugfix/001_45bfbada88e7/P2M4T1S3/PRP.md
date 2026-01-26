# Product Requirement Prompt (PRP): Write Tests for Workflow-Level Error Merge

---

## Goal

**Feature Goal**: Create comprehensive test coverage for workflow-level error merge functionality implemented in P2.M4.T1.S2, validating that sequential step errors are collected, merged, and emitted correctly when `errorMergeStrategy.enabled` is true.

**Deliverable**: New test file `src/__tests__/unit/workflow-error-merge.test.ts` with comprehensive coverage of workflow-level error merge behavior for sequential steps.

**Success Definition**:
- [ ] Test file created at `src/__tests__/unit/workflow-error-merge.test.ts`
- [ ] Tests validate default behavior (first error thrown immediately)
- [ ] Tests validate error collection when `errorMergeStrategy.enabled === true`
- [ ] Tests validate WorkflowAggregateError contains all collected errors
- [ ] Tests validate custom combine function usage
- [ ] Tests validate error event emission (individual + merged)
- [ ] Tests pass: `npm test -- workflow-error-merge.test.ts`
- [ ] Coverage matches existing error-merge-strategy.test.ts patterns

---

## User Persona

**Target User**: Implementation agent working on P2.M4.T1.S3 (test creation for workflow-level error merge).

**Use Case**: Creating comprehensive test coverage for the workflow-level error merge feature implemented in P2.M4.T1.S2, ensuring the feature works correctly for sequential step execution with error collection and merging.

**User Journey**:
1. Read existing error-merge-strategy.test.ts to understand @Task concurrent patterns
2. Adapt patterns for workflow sequential step execution
3. Create test file with helper functions for workflow creation and event observation
4. Write test cases covering all scenarios (default, enabled, custom, edge cases)
5. Validate tests pass and provide comprehensive coverage

**Pain Points Addressed**:
- **Test Pattern Gap**: Existing tests only cover @Task concurrent error merge, not workflow sequential
- **Feature Validation**: Need to verify P2.M4.T1.S2 implementation works correctly
- **Regression Prevention**: Tests prevent breaking error merge in future changes
- **Documentation**: Tests serve as executable documentation for workflow error merge behavior

---

## Why

**Business Value and User Impact**:
- Validates P2.M4.T1.S2 implementation is correct and complete
- Prevents regressions in workflow-level error handling
- Provides confidence for refactoring workflow execution logic
- Documents expected behavior for future developers

**Integration with Existing Features**:
- Builds on error merge infrastructure from P2.M4.T1.S1 (interface extension)
- Tests the implementation from P2.M4.T1.S2 (error collection in workflow execution)
- Follows patterns from `src/__tests__/adversarial/error-merge-strategy.test.ts`
- Uses existing test utilities and helper patterns
- Maintains consistency with existing workflow test conventions

**Problems Solved**:
- **Missing Test Coverage**: No tests exist for workflow-level error merge (only @Task)
- **Implementation Validation**: Verifies P2.M4.T1.S2 error collection works as specified
- **Behavior Documentation**: Tests clearly document how error merge works at workflow level
- **Edge Case Coverage**: Ensures all error scenarios are handled correctly

---

## What

**User-Visible Behavior and Technical Requirements**:

### Test Coverage Requirements

Create test file `src/__tests__/unit/workflow-error-merge.test.ts` with the following test suites:

#### 1. Default Behavior (errorMergeStrategy Disabled)
- Test that first error is thrown immediately when no config provided
- Test that first error is thrown immediately when `enabled: false`
- Verify execution stops on first error
- Verify only individual error events emitted (no merge event)
- Verify backward compatibility with existing workflows

#### 2. Enabled with Default Error Merge
- Test that all errors are collected when `enabled: true`
- Test that execution continues after step failures
- Test that WorkflowAggregateError is thrown for multiple errors
- Test that single error is thrown directly (not wrapped)
- Verify error message format: "X of Y steps failed in workflow 'workflowName'"
- Verify metadata structure (errors, failedChildren, totalChildren, failedWorkflowIds)

#### 3. Enabled with Custom Combine Function
- Test that custom combine function is called
- Test that custom combine receives all collected errors
- Test that custom error is returned from combine function
- Test that custom error is thrown instead of default merged error
- Verify custom fields are preserved in merged error

#### 4. Error Event Emission
- Test that individual error events are emitted for each failure
- Test that merged error event is emitted after all steps complete
- Test event count (individual + merged)
- Test event sequence (individual before merged)
- Verify event payload completeness (error, workflowId, state, logs, node)

#### 5. Edge Cases
- Test workflow with no errors (all steps succeed)
- Test workflow where all steps fail
- Test workflow with single failing step (not wrapped in aggregate)
- Test workflow with mixed success and failure
- Test workflow with errorMergeStrategy but no errors

#### 6. Backward Compatibility
- Test that existing workflow patterns still work
- Test that workflows without errorMergeStrategy behave identically
- Verify no breaking changes to existing API

### Success Criteria

- [ ] Test file created at specified path
- [ ] All test suites implemented (default, enabled, custom, events, edge cases)
- [ ] Tests follow existing patterns from error-merge-strategy.test.ts
- [ ] Helper functions included (createTestWorkflow, setupEventObserver, createMockError)
- [ ] Tests use proper Vitest patterns (describe, it, expect, vi)
- [ ] Tests validate both behavior and events
- [ ] All tests pass when run
- [ ] Test coverage is comprehensive

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact test file path and naming convention
- Complete test structure with all required test suites
- Helper function patterns to follow
- Existing test patterns to replicate
- Type definitions for all interfaces
- Example test cases from existing tests
- Validation commands to verify tests pass

---

### Documentation & References

```yaml
# MUST READ - Existing test patterns to replicate
- file: src/__tests__/adversarial/error-merge-strategy.test.ts
  why: Shows comprehensive error merge test patterns for @Task concurrent execution
  pattern: Helper functions, event observer setup, error validation patterns
  lines: 29-90 (helper functions), 93-176 (default behavior), 178-256 (enabled behavior)
  gotcha: Adapts these patterns for workflow sequential execution instead of @Task concurrent

# MUST READ - Workflow test patterns
- file: src/__tests__/unit/workflow.test.ts
  why: Shows standard workflow test structure and conventions
  pattern: Test file organization, workflow creation patterns, assertion patterns
  gotcha: Follow this structure for consistency with existing workflow tests

# MUST READ - Workflow error utils tests
- file: src/__tests__/unit/utils/workflow-error-utils.test.ts
  why: Shows how to test mergeWorkflowErrors function directly
  pattern: Error creation, merge validation, metadata validation
  lines: 38-89 (error aggregation tests)
  critical: Shows exact validation patterns for WorkflowAggregateError

# MUST READ - Implementation being tested
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S2/PRP.md
  why: Shows what P2.M4.T1.S2 implemented - this is what you're testing
  section: Goal, What, Implementation Blueprint
  critical: Tests must validate the exact implementation specified in P2.M4.T1.S2

# MUST READ - Type definitions for test assertions
- file: src/types/error-strategy.ts
  why: ErrorMergeStrategy interface definition
  pattern: enabled, maxMergeDepth, combine function signature
  lines: 6-13

- file: src/types/error.ts
  why: WorkflowError interface for test assertions
  pattern: message, original, workflowId, stack, state, logs
  lines: 7-20

- file: src/types/workflow-context.ts
  why: WorkflowConfig with errorMergeStrategy field
  pattern: Optional errorMergeStrategy field
  lines: 144-153

# MUST READ - Error merge utility
- file: src/utils/workflow-error-utils.ts
  why: mergeWorkflowErrors function that workflows use
  pattern: Function signature, return type, metadata structure
  lines: 23-56
  critical: Shows exact metadata structure to validate in tests

# MUST READ - Research documentation
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S3/research/error-merge-test-patterns.md
  why: Complete analysis of existing error merge test patterns
  section: Patterns to Replicate for Workflow-Level Tests
  critical: Shows exact patterns to follow for workflow-level tests

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S3/research/workflow-test-patterns.md
  why: Workflow-specific test patterns and conventions
  section: Test File Naming Conventions, Common Test Patterns
  critical: Shows workflow test file structure and naming

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S3/research/error-merge-types-and-utils.md
  why: Complete type definitions and utility signatures
  section: Test Assertion Patterns, Function Signatures
  critical: Shows exact types and assertions to use in tests

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S3/research/external-test-best-practices.md
  why: Comprehensive testing best practices and patterns
  section: Recommended Test Structure Template, Test Coverage Checklist
  critical: Provides production-ready test templates and anti-patterns to avoid
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts                    # Contains workflow execution with error collection (from P2.M4.T1.S2)
│   └── workflow-context.ts            # Contains ctx.step() with error collection support
├── types/
│   ├── error-strategy.ts              # ErrorMergeStrategy interface (from P2.M4.T1.S1)
│   ├── error.ts                       # WorkflowError interface
│   └── workflow-context.ts            # WorkflowConfig with errorMergeStrategy field
├── utils/
│   └── workflow-error-utils.ts        # mergeWorkflowErrors function
└── __tests__/
    ├── adversarial/
    │   └── error-merge-strategy.test.ts  # Reference pattern for @Task concurrent tests (760 lines)
    ├── unit/
    │   ├── workflow.test.ts            # Workflow test patterns
    │   ├── workflow-*.test.ts          # Other workflow-specific tests
    │   └── utils/
    │       └── workflow-error-utils.test.ts  # Error merge utility tests
    └── (P2.M4.T1.S3 will add workflow-error-merge.test.ts here)
```

---

### Desired Codebase Tree with Files to be Added

```bash
# NEW FILE TO CREATE:

# src/__tests__/unit/workflow-error-merge.test.ts
# - Comprehensive test coverage for workflow-level error merge
# - Tests for default behavior (first error wins)
# - Tests for enabled error merge (collect all errors)
# - Tests for custom combine function
# - Tests for error event emission
# - Tests for edge cases (no errors, all errors, single error, mixed)
# - Helper functions for workflow creation and event observation
# - Follows patterns from error-merge-strategy.test.ts
# - Validates P2.M4.T1.S2 implementation

# NO OTHER FILES MODIFIED - This is test-only task
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: P2.M4.T1.S2 implementation MUST exist
// Assume workflow execution has been modified to support error collection
// Tests validate that this implementation works correctly

// CRITICAL: WorkflowAggregateError is NOT a formal class
// It's a plain object pattern created by mergeWorkflowErrors
// Detect via: error.original?.name === 'WorkflowAggregateError'
// Don't test for: error instanceof WorkflowAggregateError

// CRITICAL: Two execution modes to test
// 1. Functional workflows: Use ctx.step() for sequential execution
// 2. Class-based workflows: Override run() and call methods directly
// P2.M4.T1.S2 primarily modifies runFunctional() for functional workflows
// Focus tests on functional workflows with ctx.step()

// CRITICAL: Error message format difference
// @Task: "X of Y concurrent child workflows failed in task 'taskName'"
// Workflow: "X of Y steps failed in workflow 'workflowName'" (adapted)
// Don't expect exact @Task message format in workflow tests

// CRITICAL: Event emission pattern
// Individual errors: Emitted immediately when step fails
// Merged error: Emitted after all steps complete (before throw)
// Total event count = individual errors + 1 merged error (when multiple failures)

// CRITICAL: Single error handling
// If only one error collected, throw it directly (not wrapped)
// Tests should verify single error is NOT wrapped in WorkflowAggregateError

// CRITICAL: Custom combine function
// If config.errorMergeStrategy?.combine exists, use it instead of mergeWorkflowErrors
// Tests should verify custom combine is called with collected errors
// Tests should verify custom error is thrown

// CRITICAL: Default behavior MUST NOT CHANGE
// When errorMergeStrategy is undefined or enabled=false:
// - Throw first error immediately
// - Stop execution on first failure
// - Only individual error events (no merge event)
// This is backward compatible behavior

// CRITICAL: Helper function patterns from existing tests
// createChildWorkflow() for @Task: Returns child workflow instance
// For workflow tests: create inline workflow classes with @Step decorators
// setupEventObserver(): Returns array of events
// createMockWorkflowError(): Returns mock error with overrides

// CRITICAL: Test file naming convention
// Unit tests: src/__tests__/unit/workflow-{feature}.test.ts
// Use: workflow-error-merge.test.ts (not workflow-error-merge-strategy.test.ts)

// CRITICAL: Vitest import paths
// Use: import { describe, it, expect, vi } from 'vitest';
// Use: import { Workflow, Step } from '@/core/workflow.js';
// Use: import type { WorkflowError, WorkflowEvent, ErrorMergeStrategy } from '@/types/index.js';

// CRITICAL: Test structure
// Use describe() for test suites
// Use it() for individual test cases
// Use AAA pattern: Arrange, Act, Assert
// Use async/await for all async operations

// CRITICAL: WorkflowConfig usage
// Pass via constructor: new Workflow({ name: 'Test', errorMergeStrategy: {...} })
// Or use static config: static config = { errorMergeStrategy: {...} }
// Tests should verify both patterns work

// CRITICAL: Workflow class extension
// Define workflow class inline in tests
// Use @Step() decorator for step methods
// Override run() method for class-based workflows
// Use executor for functional workflows

// CRITICAL: Error capture pattern
// Use try-catch in run() to capture errors for validation
// Return error from catch block for test assertions
// Cast to WorkflowError for property access

// CRITICAL: Type guards for metadata
// Use: const metadata = error.original as { name?: string; errors?: WorkflowError[] };
// Don't assume metadata exists without type guard
// Check metadata.name === 'WorkflowAggregateError' for detection

// CRITICAL: Event filtering
// Use: const errorEvents = events.filter(e => e.type === 'error');
// Use discriminated unions: if (e.type === 'error') { ... }
// Don't access error properties without type narrowing
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - testing existing types from P2.M4.T1.S1 and P2.M4.T1.S2:

```typescript
// Types from src/types/error-strategy.ts (added in P2.M4.T1.S1)
interface ErrorMergeStrategy {
  enabled: boolean;
  maxMergeDepth?: number;
  combine?(errors: WorkflowError[]): WorkflowError;
}

// Types from src/types/error.ts
interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}

// Types from src/types/workflow-context.ts (added in P2.M4.T1.S1)
interface WorkflowConfig {
  name?: string;
  errorMergeStrategy?: ErrorMergeStrategy;
  // ... other fields
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE TEST FILE WITH BASIC STRUCTURE
  - FILE: src/__tests__/unit/workflow-error-merge.test.ts
  - IMPORT: Vitest utilities (describe, it, expect, vi)
  - IMPORT: Workflow, Step from @/core/workflow.js
  - IMPORT: Types (WorkflowError, WorkflowEvent, ErrorMergeStrategy)
  - ADD: Top-level describe block: 'Workflow Error Merge Strategy'
  - ADD: File header JSDoc with purpose and related PRP references
  - FOLLOW pattern: src/__tests__/unit/workflow.test.ts (file structure)

Task 2: ADD HELPER FUNCTIONS
  - ADD: setupEventObserver(workflow: Workflow): WorkflowEvent[]
  - PATTERN: src/__tests__/adversarial/error-merge-strategy.test.ts:57-66
  - ADD: createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError
  - PATTERN: src/__tests__/adversarial/error-merge-strategy.test.ts:72-90
  - VERIFY: Helpers return correct types and are reusable

Task 3: ADD DEFAULT BEHAVIOR TEST SUITE
  - DESCRIBE: 'Default behavior (errorMergeStrategy disabled)'
  - TEST: 'should throw first error when errorMergeStrategy not provided'
  - TEST: 'should throw first error when errorMergeStrategy.enabled=false'
  - VERIFY: Execution stops on first error
  - VERIFY: Only individual error events emitted
  - PATTERN: src/__tests__/adversarial/error-merge-strategy.test.ts:93-176

Task 4: ADD ENABLED ERROR MERGE TEST SUITE
  - DESCRIBE: 'Enabled with default error merge'
  - TEST: 'should merge all errors when errorMergeStrategy.enabled=true'
  - TEST: 'should execute all steps when collecting errors'
  - TEST: 'should create WorkflowAggregateError with correct metadata'
  - TEST: 'should not wrap single error in WorkflowAggregateError'
  - VERIFY: Error message format adapted for workflows
  - VERIFY: Metadata contains all collected errors
  - PATTERN: src/__tests__/adversarial/error-merge-strategy.test.ts:178-256

Task 5: ADD CUSTOM COMBINE FUNCTION TEST SUITE
  - DESCRIBE: 'Enabled with custom combine function'
  - TEST: 'should call custom combine function when provided'
  - TEST: 'should pass all collected errors to custom combine'
  - TEST: 'should use custom error from combine function'
  - VERIFY: Custom combine called with correct arguments
  - VERIFY: Custom error thrown instead of default
  - PATTERN: src/__tests__/adversarial/error-merge-strategy.test.ts:401-501

Task 6: ADD ERROR EVENT EMISSION TEST SUITE
  - DESCRIBE: 'Error event emission'
  - TEST: 'should emit individual error events for each failure'
  - TEST: 'should emit merged error event after all steps complete'
  - TEST: 'should emit correct number of error events'
  - TEST: 'should emit events in correct sequence'
  - VERIFY: Event payloads are complete
  - PATTERN: src/__tests__/adversarial/error-merge-strategy.test.ts:697-748

Task 7: ADD EDGE CASES TEST SUITE
  - DESCRIBE: 'Edge cases'
  - TEST: 'should complete successfully when no errors occur'
  - TEST: 'should collect all errors when all steps fail'
  - TEST: 'should handle single error without wrapping'
  - TEST: 'should handle mixed success and failure'
  - VERIFY: All edge cases handled correctly

Task 8: RUN TESTS AND VALIDATE
  - COMMAND: npm test -- workflow-error-merge.test.ts
  - VERIFY: All tests pass
  - VERIFY: No TypeScript errors
  - VERIFY: Coverage is comprehensive
  - DEBUG: Fix any failing tests

Task 9: VALIDATE TEST PATTERNS
  - VERIFY: Tests follow existing patterns from error-merge-strategy.test.ts
  - VERIFY: Helper functions are reusable
  - VERIFY: Test names are descriptive
  - VERIFY: AAA pattern used throughout
  - VERIFY: Type-safe assertions
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Test file structure
import { describe, it, expect, vi } from 'vitest';
import { Workflow, Step } from '@/core/workflow.js';
import type { WorkflowError, WorkflowEvent, ErrorMergeStrategy } from '@/types/index.js';

describe('Workflow Error Merge Strategy', () => {
  // Helper functions
  function setupEventObserver(workflow: Workflow): WorkflowEvent[] {
    const events: WorkflowEvent[] = [];
    workflow.addObserver({
      onLog: () => {},
      onEvent: (e) => events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });
    return events;
  }

  // Test suites...
});

// PATTERN 2: Creating test workflow with @Step decorators
class TestWorkflow extends Workflow {
  static config = {
    errorMergeStrategy: { enabled: true }
  };

  async run() {
    await this.step1();  // Success
    await this.step2();  // Fails
    await this.step3();  // Fails
  }

  @Step()
  async step1() {
    return 'success';
  }

  @Step()
  async step2() {
    throw new Error('Step 2 failed');
  }

  @Step()
  async step3() {
    throw new Error('Step 3 failed');
  }
}

// PATTERN 3: Error capture for validation
const workflow = new TestWorkflow({ name: 'Test' });
const error = await workflow.run().catch(e => e);

// PATTERN 4: WorkflowAggregateError detection
const metadata = error.original as {
  name?: string;
  errors?: WorkflowError[];
  failedChildren?: number;
  totalChildren?: number;
};

if (metadata.name === 'WorkflowAggregateError') {
  expect(metadata.errors).toHaveLength(2);
  expect(metadata.failedChildren).toBe(2);
}

// PATTERN 5: Event validation
const events = setupEventObserver(workflow);
await workflow.run().catch(() => {});

const errorEvents = events.filter(e => e.type === 'error');
expect(errorEvents.length).toBeGreaterThanOrEqual(3); // 2 individual + 1 merged

// PATTERN 6: Custom combine function test
const combineSpy = vi.fn((errors: WorkflowError[]) => ({
  message: `Custom: ${errors.length} errors`,
  original: { name: 'CustomError', errors },
  workflowId: '',
  logs: [],
}));

class CustomCombineWorkflow extends Workflow {
  static config = {
    errorMergeStrategy: {
      enabled: true,
      combine: combineSpy,
    }
  };
}

expect(combineSpy).toHaveBeenCalledTimes(1);
const errorsArg = combineSpy.mock.calls[0][0] as WorkflowError[];
expect(errorsArg).toHaveLength(2);

// GOTCHA 1: Don't test for WorkflowAggregateError instance
// error instanceof WorkflowAggregateError  // ❌ WRONG - not a formal class
// error.original?.name === 'WorkflowAggregateError'  // ✅ CORRECT

// GOTCHA 2: Error message format is different from @Task
// @Task: "X of Y concurrent child workflows failed in task 'taskName'"
// Workflow: "X of Y steps failed in workflow 'workflowName'"
// Don't expect exact @Task format

// GOTCHA 3: Single error not wrapped
// If only one error collected, it's thrown directly
// Don't expect WorkflowAggregateError for single error

// GOTCHA 4: Event timing
// Individual errors: Emitted immediately
// Merged error: Emitted after all steps complete
// Event count = individual + merged (when multiple)

// GOTCHA 5: Type guards required
// Always use type guards before accessing error.original properties
// Don't assume metadata structure exists

// GOTCHA 6: Test both execution modes
// Functional workflows: Use ctx.step()
// Class-based workflows: Override run() and call methods
// Focus on functional workflows for P2.M4.T1.S2 coverage
```

---

### Integration Points

```yaml
TEST FILE:
  - src/__tests__/unit/workflow-error-merge.test.ts
    create: New test file with comprehensive coverage
    follow: Pattern from error-merge-strategy.test.ts
    test: Implementation from P2.M4.T1.S2

DEPENDENCIES (no changes, test-only):
  - src/core/workflow.ts - Contains error collection implementation (P2.M4.T1.S2)
  - src/core/workflow-context.ts - Contains ctx.step() error collection (P2.M4.T1.S2)
  - src/types/error-strategy.ts - ErrorMergeStrategy interface (P2.M4.T1.S1)
  - src/types/error.ts - WorkflowError interface
  - src/utils/workflow-error-utils.ts - mergeWorkflowErrors function

REFERENCE PATTERNS:
  - src/__tests__/adversarial/error-merge-strategy.test.ts - @Task concurrent patterns
  - src/__tests__/unit/workflow.test.ts - Workflow test structure
  - src/__tests__/unit/utils/workflow-error-utils.test.ts - Error validation patterns

SCOPE BOUNDARIES:
  - This task: Test creation only
  - Previous task (P2.M4.T1.S2): Implementation of error collection
  - First task (P2.M4.T1.S1): Interface extension
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating test file - fix before proceeding
npm test -- workflow-error-merge.test.ts

# Expected: All tests pass. If failures:
# - Check import paths are correct
# - Check type assertions are safe
# - Check async/await usage
# - Check helper function signatures

# Common errors and fixes:
# "Cannot find module '@/core/workflow'" → Check import path uses .js extension
# "Property 'original' does not exist" → Add type guard before accessing
# "Expected async function" → Add async keyword to test function
```

### Level 2: Test Execution (Component Validation)

```bash
# Run specific test suites
npm test -- workflow-error-merge.test.ts -t "Default behavior"
npm test -- workflow-error-merge.test.ts -t "Enabled with default"
npm test -- workflow-error-merge.test.ts -t "Custom combine"
npm test -- workflow-error-merge.test.ts -t "Error event emission"
npm test -- workflow-error-merge.test.ts -t "Edge cases"

# Expected: All test suites pass
# Each suite validates specific aspect of error merge behavior

# Run with coverage
npm test -- workflow-error-merge.test.ts --coverage

# Expected: High coverage of error merge code paths
```

### Level 3: Integration Testing (System Validation)

```bash
# Test alongside existing error merge tests
npm test -- --testNamePattern="Error Merge"

# Expected: Both @Task and workflow error merge tests pass
# No conflicts between @Task and workflow error merge

# Test entire workflow test suite
npm test -- workflow-*.test.ts

# Expected: All workflow tests pass
# New tests don't break existing tests
```

### Level 4: Pattern Validation

```bash
# Verify test patterns match existing conventions
# Compare with:
# - src/__tests__/adversarial/error-merge-strategy.test.ts
# - src/__tests__/unit/workflow.test.ts

# Check:
# - Helper function patterns match
# - Test structure matches
# - Assertion patterns match
# - Event validation patterns match

# Expected: Tests follow established patterns
# No new anti-patterns introduced
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at `src/__tests__/unit/workflow-error-merge.test.ts`
- [ ] All imports correct and use proper paths
- [ ] All helper functions defined and reusable
- [ ] All test suites implemented (default, enabled, custom, events, edge cases)
- [ ] TypeScript compiles without errors
- [ ] All tests pass when run
- [ ] Test coverage is comprehensive

### Feature Validation

- [ ] Default behavior tests pass (first error wins)
- [ ] Enabled error merge tests pass (collect all errors)
- [ ] Custom combine function tests pass
- [ ] Error event emission tests pass
- [ ] Edge case tests pass
- [ ] Backward compatibility validated

### Code Quality Validation

- [ ] Tests follow existing patterns from error-merge-strategy.test.ts
- [ ] Tests follow workflow test conventions
- [ ] AAA pattern used throughout
- [ ] Test names are descriptive
- [ ] Type-safe assertions used
- [ ] No anti-patterns introduced

### Documentation & Deployment

- [ ] File has JSDoc header with purpose and references
- [ ] Test suites have describe blocks with clear descriptions
- [ ] Complex assertions have explanatory comments
- [ ] Tests serve as executable documentation

---

## Anti-Patterns to Avoid

- ❌ Don't test implementation details - test behavior
- ❌ Don't use brittle string matching - use flexible patterns
- ❌ Don't ignore error object structure - validate all fields
- ❌ Don't test without type safety - use proper type guards
- ❌ Don't mix multiple concerns in one test - separate tests
- ❌ Don't use magic numbers - use named constants
- ❌ Don't skip edge cases - test all scenarios
- ❌ Don't break existing test patterns - follow conventions
- ❌ Don't assume P2.M4.T1.S2 implementation - test what exists
- ❌ Don't create brittle tests - make them maintainable

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Clear deliverable (test file at specified path)
- ✅ Complete test structure with all required suites
- ✅ Existing patterns to replicate from error-merge-strategy.test.ts
- ✅ Helper function patterns clearly defined
- ✅ Type definitions provided for all assertions
- ✅ Validation commands specified
- ✅ Edge cases identified and addressed
- ✅ Research documents provide comprehensive context
- ⚠️ Relies on P2.M4.T1.S2 implementation being correct
- ⚠️ Must adapt @Task patterns to workflow sequential execution

**Validation**: The completed test file will provide comprehensive coverage of workflow-level error merge functionality, ensuring the implementation from P2.M4.T1.S2 works correctly for all scenarios. Tests will serve as both validation and documentation for the feature.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
