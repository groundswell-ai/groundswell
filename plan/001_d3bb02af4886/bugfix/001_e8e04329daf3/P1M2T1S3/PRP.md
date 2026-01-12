# PRP: P1.M2.T1.S3 - Add Tests for Concurrent Task Failure Scenarios

**Document Version:** 1.0
**Creation Date:** 2026-01-12
**Target:** Subtask P1.M2.T1.S3 - Add tests for concurrent task failure scenarios
**Primary Files:** `src/__tests__/adversarial/concurrent-task-failures.test.ts` (new)

---

## Goal

**Feature Goal**: Create a comprehensive test suite for the Promise.allSettled implementation in the @Task decorator (completed in S2) that validates all concurrent task failure scenarios including single child failure, multiple children failing, mixed success/failure, and all children failing. Tests must verify that all children complete execution even when some fail, and that error collection works correctly.

**Deliverable**: New test file `src/__tests__/adversarial/concurrent-task-failures.test.ts` containing:
1. Tests for single child failure in concurrent batch
2. Tests for multiple children failing concurrently
3. Tests for mixed success/failure scenarios
4. Tests for all children failing edge case
5. Verification that ALL workflows complete (no orphaned promises)
6. Verification of error collection correctness
7. Event emission validation during concurrent failures

**Success Definition**:
- All tests pass demonstrating all workflows complete before error is thrown
- Error collection is validated (all errors captured)
- Test file follows existing Groundswell test patterns
- Tests use vitest framework and follow project conventions
- Tests verify the Promise.allSettled implementation from S2 works correctly
- No orphaned or hanging promises in any test scenario

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact test file location and naming convention
- Complete code examples for all test scenarios
- Existing test patterns to follow
- Vitest testing patterns from research
- Production examples from workflow engines
- Helper functions to create test workflows
- Event verification patterns
- Timeout protection patterns

### Documentation & References

```yaml
# MUST READ - Promise.allSettled implementation from S2
- file: src/decorators/task.ts
  lines: 111-120
  why: Contains the Promise.allSettled implementation that needs testing
  pattern: const results = await Promise.allSettled(...); const rejected = results.filter(...);
  critical: Tests must verify this implementation collects all errors before throwing first

- file: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M2T1S2/PRP.md
  why: PRP for S2 implementation showing exact changes made
  section: "Appendix: Complete Code Change Reference"
  critical: Shows the before/after of Promise.all to Promise.allSettled migration

# EXISTING TEST PATTERNS - Follow these conventions
- file: src/__tests__/adversarial/edge-case.test.ts
  lines: 366-430
  why: Contains existing concurrent task execution tests with mixed success/failure
  pattern: Testing @Task decorator with concurrent option and error handling

- file: src/__tests__/unit/decorators.test.ts
  lines: 1-100
  why: Shows basic test structure, Workflow class usage, and decorator patterns
  pattern: describe blocks, async/await, expect assertions

- file: src/__tests__/adversarial/observer-propagation.test.ts
  why: Shows event collection and verification patterns
  pattern: Event observer setup, event filtering, assertion patterns

- file: src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  lines: 297-324
  why: Shows concurrent execution with @Task decorator and multiple children
  pattern: @Task({ concurrent: true }) usage with array of workflows

# VITEST TESTING PATTERNS
- url: https://vitest.dev/guide/async.html
  why: Official vitest async testing guide
  section: Async Testing
  critical: async/await patterns, .resolves/.rejects modifiers

- url: https://vitest.dev/api/expect.html
  why: Complete expect API reference
  section: Matchers
  critical: toHaveLength, toMatchObject, toContain, toBeInstanceOf

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T1S3/research/vitest_concurrent_testing.md
  why: Research document with vitest patterns for concurrent testing
  section: "3. Promise.allSettled Testing Patterns"
  critical: Type guard patterns, error filtering, counting assertions

# CONCURRENT ERROR TESTING RESEARCH
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T1S3/research/concurrent_error_testing_patterns.md
  why: Production examples from workflow engines
  section: "Test Scenarios"
  critical: Complete test scenarios for all failure patterns

- docfile: plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_RESEARCH.md
  why: Promise.allSettled implementation patterns and testing
  section: "Testing Examples"
  critical: Patterns for verifying all operations complete

# GROUNDSWELL TEST CONVENTIONS
- file: vitest.config.ts
  why: Test runner configuration
  pattern: include: ['src/__tests__/**/*.test.ts'], globals: true

- file: package.json
  lines: 34-35
  why: Test scripts
  command: npm test or npm run test:watch

# TYPES AND INTERFACES
- file: src/types/decorators.ts
  why: TaskOptions interface definition
  pattern: { name?: string; concurrent?: boolean }

- file: src/types/error.ts
  why: WorkflowError interface for error validation
  pattern: { message, original, workflowId, stack, state, logs }

- file: src/types/events.ts
  why: WorkflowEvent types for event verification
  pattern: Union type with error events

# HELPER PATTERNS FOR TEST WORKFLOWS
- file: src/__tests__/adversarial/edge-case.test.ts
  lines: 146-167
  why: Example of creating child workflow classes for testing
  pattern: class ChildWorkflow extends Workflow { async run() { ... } }
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── decorators/
│   │   ├── index.ts
│   │   ├── step.ts
│   │   └── task.ts                    # Promise.allSettled implementation (line 112)
│   ├── types/
│   │   ├── index.ts
│   │   ├── decorators.ts              # TaskOptions interface
│   │   ├── error.ts                   # WorkflowError interface
│   │   └── events.ts                  # WorkflowEvent types
│   └── __tests__/
│       ├── unit/
│       │   └── decorators.test.ts     # Basic decorator tests
│       └── adversarial/
│           ├── edge-case.test.ts      # Concurrent execution tests (lines 366-430)
│           ├── observer-propagation.test.ts  # Event verification patterns
│           ├── prd-compliance.test.ts
│           └── deep-hierarchy-stress.test.ts
├── plan/
│   └── 001_d3bb02af4886/
│       └── bugfix/
│           └── 001_e8e04329daf3/
│               ├── P1M2T1S1/
│               │   └── PRP.md         # S1 analysis PRP
│               ├── P1M2T1S2/
│               │   └── PRP.md         # S2 implementation PRP
│               ├── P1M2T1S3/
│               │   ├── PRP.md         # THIS FILE
│               │   └── research/
│               │       ├── vitest_concurrent_testing.md
│               │       └── concurrent_error_testing_patterns.md
│               └── architecture/
│                   ├── promise_all_analysis.md
│                   └── concurrent_execution_best_practices.md
└── vitest.config.ts
```

### Desired Codebase Tree (Changes for This Task)

```bash
# NEW FILES:
src/__tests__/adversarial/concurrent-task-failures.test.ts  # NEW: Test suite for concurrent failures

# NO MODIFICATIONS to existing files
# This task creates new tests only
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL GOTCHA #1: @Task decorator runs children BEFORE Promise.allSettled
// Lines 91-102 in task.ts: Children are attached before concurrent execution
// Failed workflows remain attached to parent even when they fail
// DO NOT expect failed children to be detached from parent

// CRITICAL GOTCHA #2: Promise.allSettled results maintain input ORDER
// Results are in input order, NOT completion order
// results[0] corresponds to first workflow in array, even if it completes last
// Use .filter() and .map() with indices for correlation

// CRITICAL GOTCHA #3: Type guards REQUIRED for PromiseSettledResult
// TypeScript doesn't narrow types without type guards
// BAD: results.filter(r => r.status === 'rejected').forEach(r => console.log(r.reason))
//     Type error: Property 'reason' does not exist on type 'PromiseSettledResult<unknown>'
// GOOD: results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')

// CRITICAL GOTCHA #4: Error events already emitted by @Step decorator
// Each failing workflow emits error event with full WorkflowError context
// DO NOT expect @Task decorator to emit additional error events
// DO verify each failing workflow's error event in tests

// CRITICAL GOTCHA #5: First error is thrown AFTER all workflows complete
// Promise.allSettled waits for ALL promises to settle
// Then first error is thrown for backward compatibility
// Tests must account for this delay (all workflows complete before throw)

// CRITICAL GOTCHA #6: WorkflowError.original is `unknown`, not `Error`
// When validating errors, don't assume Error interface
// BAD: expect(error.original.stack).toBeDefined()
// GOOD: if (error.original instanceof Error) expect(error.original.stack).toBeDefined()

// CRITICAL GOTCHA #7: Children run via @Task decorator
// Use @Task({ concurrent: true }) decorator in parent workflow
// Children are returned as array from @Task-decorated method
// Parent method: async spawnChildren() { return [child1, child2, child3]; }

// CRITICAL GOTCHA #8: Test file location matters
// Adversarial tests go in src/__tests__/adversarial/
// Test file must end in .test.ts for vitest to pick it up
// Use describe blocks for organization, it() for individual tests

// CRITICAL GOTCHA #9: Use @Task decorator for concurrent execution
// The Promise.allSettled is ONLY invoked when opts.concurrent is true
// Tests must use @Task({ concurrent: true }) to trigger the code path

// CRITICAL GOTCHA #10: Observer attachment only on root workflows
// Observers can only be added to root workflows (throws error if parent exists)
// In tests, add observer to parent workflow before running

// CRITICAL GOTCHA #11: No automatic timeout detection in tests
// Must manually add timeout to detect hanging promises
// Use Promise.race() with timeout promise for tests requiring timeout protection
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models for this task** - tests use existing Workflow, Task, Step decorators and WorkflowError interface.

**Test Helper Functions** (defined inline in test file):

```typescript
// Helper to create a child workflow that may fail
function createChildWorkflow(
  parent: Workflow,
  name: string,
  shouldFail: boolean = false
): Workflow;

// Helper to setup event observer for event collection
function setupEventObserver(workflow: Workflow): WorkflowEvent[];

// Helper to track workflow completions
function createCompletionTracker(): {
  complete: (id: string) => void;
  fail: (id: string) => void;
  assertAllComplete: () => void;
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/concurrent-task-failures.test.ts
  - IMPLEMENT: Test file with imports and basic describe structure
  - FOLLOW pattern: src/__tests__/adversarial/edge-case.test.ts (file structure, imports)
  - NAMING: concurrent-task-failures.test.ts (snake_case, descriptive)
  - PLACEMENT: src/__tests__/adversarial/ directory
  - IMPORTS: Workflow, Task, Step from '../../index.js'; expect, describe, it from 'vitest'

Task 2: IMPLEMENT helper functions for test workflows
  - IMPLEMENT: createChildWorkflow(parent, name, shouldFail) helper
  - IMPLEMENT: setupEventObserver(workflow) helper
  - IMPLEMENT: createCompletionTracker() helper
  - FOLLOW pattern: src/__tests__/adversarial/edge-case.test.ts (workflow creation)
  - DEPENDENCIES: Task 1

Task 3: IMPLEMENT "Single child failure" test suite
  - IMPLEMENT: describe('Single child failure scenarios') suite
  - TEST: should complete all siblings when one child fails
  - VERIFY: All 4 children complete, exactly 1 failure, error message preserved
  - DEPENDENCIES: Task 2

Task 4: IMPLEMENT "Multiple concurrent failures" test suite
  - IMPLEMENT: describe('Multiple concurrent failures') suite
  - TEST: should collect all errors from multiple failing children
  - TEST: should preserve error context for each failure
  - VERIFY: Correct failure count, all errors distinct, error context preserved
  - DEPENDENCIES: Task 2

Task 5: IMPLEMENT "Mixed success/failure" test suite
  - IMPLEMENT: describe('Mixed success/failure scenarios') suite
  - TEST: should complete successful workflows despite failures
  - TEST: should ensure no orphaned workflows in mixed scenario
  - VERIFY: Successful workflows complete, all workflows accounted for
  - DEPENDENCIES: Task 2

Task 6: IMPLEMENT "All children failing" test suite
  - IMPLEMENT: describe('All children failing') suite
  - TEST: should handle edge case of all children failing
  - VERIFY: All children failed, no successes, all errors collected
  - DEPENDENCIES: Task 2

Task 7: IMPLEMENT "Event emission verification" test suite
  - IMPLEMENT: describe('Event emission during concurrent failures') suite
  - TEST: should emit error events for all failing workflows
  - TEST: should capture logs from both successful and failed workflows
  - VERIFY: Error events emitted, logs captured from all workflows
  - DEPENDENCIES: Task 2

Task 8: IMPLEMENT "No orphaned workflows" test suite
  - IMPLEMENT: describe('No orphaned workflows') suite
  - TEST: should verify all workflows complete with no hanging promises
  - INCLUDE: Timeout protection (Promise.race with 5s timeout)
  - VERIFY: All workflows accounted for, no pending promises
  - DEPENDENCIES: Task 2

Task 9: RUN test suite to verify all tests pass
  - RUN: npm test -- src/__tests__/adversarial/concurrent-task-failures.test.ts
  - VERIFY: All tests pass
  - VERIFY: Tests validate Promise.allSettled implementation
  - DEPENDENCIES: Tasks 1-8

Task 10: RUN full test suite to ensure no regressions
  - RUN: npm test
  - VERIFY: All existing tests still pass
  - VERIFY: No new tests break existing functionality
  - DEPENDENCIES: Task 9
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: Test File Structure
// Location: src/__tests__/adversarial/concurrent-task-failures.test.ts
// ============================================

import { describe, it, expect } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';
import type { WorkflowEvent } from '../../types/index.js';

describe('@Task decorator concurrent failure scenarios', () => {
  // Helper functions
  function createChildWorkflow(parent: Workflow, name: string, shouldFail: boolean): Workflow {
    return new (class extends Workflow {
      constructor(name: string, parent: Workflow) {
        super(name, parent);
      }

      @Step()
      async executeStep() {
        if (shouldFail) {
          throw new Error(`${name} failed`);
        }
        return `${name} succeeded`;
      }

      async run() {
        return this.executeStep();
      }
    })(name, parent);
  }

  // Test suites...
});

// ============================================
// PATTERN 2: Single Child Failure Test
// Location: Test suite for single failure scenarios
// ============================================

it('should complete all siblings when one child fails', async () => {
  // ARRANGE: Create parent with 4 children, child[1] will fail
  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'Child-0', false),
        createChildWorkflow(this, 'Child-1', true),  // Will fail
        createChildWorkflow(this, 'Child-2', false),
        createChildWorkflow(this, 'Child-3', false),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected - first error thrown after all complete
      }
    }
  }

  const parent = new ParentWorkflow('Parent');

  // ACT: Run parent (children run concurrently)
  await parent.run();

  // ASSERT: All 4 children attached
  expect(parent.children.length).toBe(4);

  // ASSERT: Verify child statuses
  const failedCount = parent.children.filter(c => c.status === 'failed').length;
  const completedCount = parent.children.filter(c => c.status === 'completed').length;

  expect(failedCount).toBe(1);
  expect(completedCount).toBe(3);
});

// KEY INSIGHTS:
// - @Task({ concurrent: true }) triggers Promise.allSettled code path
// - All children complete regardless of individual failures
// - Failed children remain attached to parent
// - Status can be checked via workflow.status property

// ============================================
// PATTERN 3: Multiple Concurrent Failures Test
// Location: Test suite for multiple failure scenarios
// ============================================

it('should collect all errors when multiple children fail concurrently', async () => {
  // ARRANGE: Create parent with 6 children, 3 will fail
  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'Alpha', false),
        createChildWorkflow(this, 'Beta', true),   // Will fail
        createChildWorkflow(this, 'Gamma', false),
        createChildWorkflow(this, 'Delta', true),  // Will fail
        createChildWorkflow(this, 'Epsilon', false),
        createChildWorkflow(this, 'Zeta', true),   // Will fail
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected
      }
    }
  }

  const parent = new ParentWorkflow('Parent');

  // ACT
  await parent.run();

  // ASSERT: Exactly 3 failures, 3 successes
  const failed = parent.children.filter(c => c.status === 'failed');
  const completed = parent.children.filter(c => c.status === 'completed');

  expect(failed.length).toBe(3);
  expect(completed.length).toBe(3);

  // ASSERT: All errors distinct
  const failedNames = failed.map(c => c.node.name);
  expect(new Set(failedNames).size).toBe(3);
  expect(failedNames).toContain('Beta');
  expect(failedNames).toContain('Delta');
  expect(failedNames).toContain('Zeta');
});

// ============================================
// PATTERN 4: Event Emission Verification
// Location: Test suite for event emission during failures
// ============================================

it('should emit error events for all failing workflows', async () => {
  // ARRANGE: Setup event observer
  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'Good', false),
        createChildWorkflow(this, 'Bad1', true),
        createChildWorkflow(this, 'Bad2', true),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const events: WorkflowEvent[] = [];

  // CRITICAL: Add observer to root workflow
  parent.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // ACT
  await parent.run();

  // ASSERT: Error events emitted for both failures
  const errorEvents = events.filter(e => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(2);

  // ASSERT: Each error event has correct structure
  errorEvents.forEach(event => {
    expect(event.type).toBe('error');
    if (event.type === 'error') {
      expect(event.error).toBeDefined();
      expect(event.error.workflowId).toBeDefined();
      expect(event.error.message).toBeDefined();
      expect(Array.isArray(event.error.logs)).toBe(true);
    }
  });
});

// ============================================
// PATTERN 5: No Orphaned Workflows Test
// Location: Test suite for completion verification
// ============================================

it('should verify all workflows complete with no hanging promises', async () => {
  // ARRANGE: Track all completions
  const completedWorkflows = new Set<string>();

  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true })
    async spawnChildren() {
      const children = Array.from({ length: 10 }, (_, i) =>
        createChildWorkflow(this, `Child-${i}`, Math.random() < 0.3)
      );

      // Track completion for all children
      children.forEach(child => {
        child.run().then(
          () => completedWorkflows.add(child.id),
          () => completedWorkflows.add(child.id)
        );
      });

      return children;
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected
      }
    }
  }

  const parent = new ParentWorkflow('Parent');

  // ACT: Run with timeout to detect hanging promises
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: workflows hung')), 5000)
  );

  const runPromise = parent.run();

  await Promise.race([runPromise, timeoutPromise]);

  // ASSERT: All 10 workflows accounted for (no orphans)
  expect(completedWorkflows.size).toBe(10);
});

// KEY INSIGHTS:
// - Timeout protection ensures test fails if promises hang
// - Completion tracking verifies all workflows finish
// - Promise.race prevents infinite test execution

// ============================================
// PATTERN 6: All Children Failing Edge Case
// Location: Test suite for all-failures scenario
// ============================================

it('should handle edge case of all children failing', async () => {
  // ARRANGE: All children will fail
  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true })
    async spawnChildren() {
      return Array.from({ length: 5 }, (_, i) =>
        createChildWorkflow(this, `FailChild-${i}`, true)  // All fail
      );
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected - first error thrown
      }
    }
  }

  const parent = new ParentWorkflow('Parent');

  // ACT
  await parent.run();

  // ASSERT: All children failed
  expect(parent.children.length).toBe(5);

  const allFailed = parent.children.every(c => c.status === 'failed');
  expect(allFailed).toBe(true);

  // ASSERT: No successes
  const completedCount = parent.children.filter(c => c.status === 'completed').length;
  expect(completedCount).toBe(0);
});

// ============================================
// PATTERN 7: Type Guard for PromiseRejectedResult
// Location: Helper functions in test file
// ============================================

// Type guard for filtering rejected promises
function isRejected(result: PromiseSettledResult<unknown>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

// Usage in tests (if directly testing Promise.allSettled):
const results = await Promise.allSettled(workflows.map(w => w.run()));
const rejected = results.filter(isRejected);
expect(rejected.length).toBe(expectedFailureCount);
```

### Integration Points

```yaml
NO_INTEGRATION_CHANGES:
  - This task creates new tests only
  - No modifications to existing code
  - Tests verify existing Promise.allSettled implementation from S2

TEST_DEPENDENCIES:
  - Requires S2 implementation to be complete (Promise.allSettled in task.ts)
  - Tests will validate the S2 implementation works correctly
  - Run after S2 is complete and all tests pass
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript type checking on new test file
npx tsc --noEmit src/__tests__/adversarial/concurrent-task-failures.test.ts

# Run vitest type checking
npx vitest type-check src/__tests__/adversarial/concurrent-task-failures.test.ts

# Expected: Zero type errors
# Common error to fix: Missing imports, incorrect type annotations
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new test file
npm test -- src/__tests__/adversarial/concurrent-task-failures.test.ts

# Run with watch mode for development
npm run test:watch -- concurrent-task-failures

# Run with coverage
npm test -- --coverage src/__tests__/adversarial/concurrent-task-failures.test.ts

# Expected: All new tests pass
# If tests fail, debug - they should validate Promise.allSettled behavior
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all adversarial tests
npm test -- src/__tests__/adversarial/

# Run all unit tests
npm test -- src/__tests__/unit/

# Run full test suite
npm test

# Expected: All tests pass, including existing tests
# This validates no regressions and new tests integrate correctly
```

### Level 4: Manual Verification

```bash
# Verify test file exists and is properly formatted
ls -la src/__tests__/adversarial/concurrent-task-failures.test.ts

# Count tests in file
grep -c "^  it(" src/__tests__/adversarial/concurrent-task-failures.test.ts

# Expected: File exists with 8-10 tests covering all scenarios

# Verify test output includes helpful messages
npm test -- src/__tests__/adversarial/concurrent-task-failures.test.ts --reporter=verbose

# Expected: Clear test names showing what is being tested
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at `src/__tests__/adversarial/concurrent-task-failures.test.ts`
- [ ] All imports correct (Workflow, Task, Step, vitest functions)
- [ ] No TypeScript errors: `npx tsc --noEmit` passes
- [ ] All tests pass: `npm test -- concurrent-task-failures.test.ts`
- [ ] Test file follows existing patterns from edge-case.test.ts
- [ ] Helper functions defined and used correctly

### Feature Validation

- [ ] Single child failure test: All siblings complete when one fails
- [ ] Multiple failures test: All errors collected correctly
- [ ] Mixed success/failure test: Successful workflows complete
- [ ] All children failing test: Edge case handled
- [ ] No orphaned workflows test: All workflows accounted for
- [ ] Event emission test: Error events emitted for failures
- [ ] Log capture test: Logs captured from all workflows

### Code Quality Validation

- [ ] Test names descriptive (should/shouldn't pattern)
- [ ] AAA pattern followed (Arrange, Act, Assert)
- [ ] Comments explain complex test scenarios
- [ ] No hardcoded timeouts except for protection
- [ ] Error messages specific and helpful
- [ ] Follows Groundswell test conventions

### Documentation & Completeness

- [ ] All required test scenarios covered
- [ ] Tests validate Promise.allSettled implementation from S2
- [ ] No orphaned or hanging promises in any test
- [ ] Timeout protection in tests that could hang
- [ ] Event verification for error scenarios
- [ ] Completion verification for all scenarios

---

## Anti-Patterns to Avoid

- ❌ **Don't modify existing code** - This task creates tests only
- ❌ **Don't use Promise.all in tests** - Use @Task decorator to test the implementation
- ❌ **Don't forget type guards** - TypeScript requires them for PromiseSettledResult
- ❌ **Don't skip timeout protection** - Tests that could hang need timeout
- ❌ **Don't assume error type** - Error.original is unknown, check with instanceof
- ❌ **Don't test @Task without concurrent: true** - Must trigger concurrent code path
- ❌ **Don't expect failed children to detach** - Failed children remain attached
- ❌ **Don't ignore event emission** - Verify error events are emitted
- ❌ **Don't hardcode workflow IDs** - Use workflow.id or workflow.node.name
- ❌ **Don't use sync assertions after async** - Always await before asserting
- ❌ **Don't create test file in wrong location** - Must be in src/__tests__/adversarial/
- ❌ **Don't use .test.js extension** - Must be .test.ts for TypeScript
- ❌ **Don't forget to add observers to root** - Observers only on root workflows
- ❌ **Don't assume completion order** - Promise.allSettled maintains input order, not completion order
- ❌ **Don't create unnecessary abstractions** - Keep test helpers simple and focused

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Definition of Done**:
1. Test file created at `src/__tests__/adversarial/concurrent-task-failures.test.ts`
2. All tests pass validating Promise.allSettled implementation from S2
3. Single child failure scenario tested and passing
4. Multiple concurrent failures scenario tested and passing
5. Mixed success/failure scenario tested and passing
6. All children failing scenario tested and passing
7. No orphaned workflows verified in all tests
8. Event emission verified for concurrent failures
9. Zero TypeScript errors
10. All existing tests still pass (no regressions)

**Validation**: The test suite provides comprehensive coverage of concurrent task failure scenarios, ensuring the Promise.allSettled implementation works correctly and all workflows complete regardless of individual failures.

---

## Appendix: Complete Test File Template

```typescript
/**
 * Concurrent Task Failure Scenarios Test Suite
 *
 * Tests the Promise.allSettled implementation in @Task decorator
 * for concurrent execution with various failure scenarios.
 *
 * Validates:
 * - Single child failure in concurrent batch
 * - Multiple children failing concurrently
 * - Mixed success/failure scenarios
 * - All children failing edge case
 * - No orphaned or hanging promises
 * - Error collection correctness
 * - Event emission during failures
 */

import { describe, it, expect } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';
import type { WorkflowEvent } from '../../types/index.js';

describe('@Task decorator concurrent failure scenarios', () => {
  /**
   * Helper to create a child workflow that may fail
   */
  function createChildWorkflow(
    parent: Workflow,
    name: string,
    shouldFail: boolean = false
  ): Workflow {
    return new (class extends Workflow {
      constructor(n: string, p: Workflow) {
        super(n, p);
      }

      @Step()
      async executeStep() {
        if (shouldFail) {
          throw new Error(`${name} failed`);
        }
        return `${name} succeeded`;
      }

      async run() {
        return this.executeStep();
      }
    })(name, parent);
  }

  /**
   * Helper to setup event observer
   */
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

  describe('Single child failure scenarios', () => {
    it('should complete all siblings when one child fails', async () => {
      // Test implementation...
    });
  });

  describe('Multiple concurrent failures', () => {
    it('should collect all errors when multiple children fail concurrently', async () => {
      // Test implementation...
    });

    it('should preserve error context for each failure', async () => {
      // Test implementation...
    });
  });

  describe('Mixed success/failure scenarios', () => {
    it('should complete successful workflows despite failures', async () => {
      // Test implementation...
    });

    it('should ensure no orphaned workflows in mixed scenario', async () => {
      // Test implementation...
    });
  });

  describe('All children failing', () => {
    it('should handle edge case of all children failing', async () => {
      // Test implementation...
    });
  });

  describe('No orphaned workflows', () => {
    it('should verify all workflows complete with no hanging promises', async () => {
      // Test implementation...
    });
  });

  describe('Event emission verification', () => {
    it('should emit error events for all failing workflows', async () => {
      // Test implementation...
    });

    it('should capture logs from both successful and failed workflows', async () => {
      // Test implementation...
    });
  });
});
```

---

**PRP Status**: ✅ Complete - Ready for Implementation
**Next Task**: P1.M2.T1.S4 - Run full test suite to ensure no regressions
