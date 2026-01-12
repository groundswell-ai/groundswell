# Product Requirement Prompt (PRP): Add Tests for ErrorMergeStrategy Functionality

**Work Item:** P1.M2.T2.S4 - Add tests for ErrorMergeStrategy functionality

---

## Goal

**Feature Goal:** Create a comprehensive test suite for the ErrorMergeStrategy functionality implemented in P1.M2.T2.S2 and P1.M2.T2.S3, validating that error aggregation works correctly for concurrent task execution scenarios.

**Deliverable:** A new test file `src/__tests__/adversarial/error-merge-strategy.test.ts` containing comprehensive tests for:
- `errorMergeStrategy.enabled=false` (default behavior - first error wins)
- `errorMergeStrategy.enabled=true` with default merge (uses `mergeWorkflowErrors`)
- `errorMergeStrategy.enabled=true` with custom combine function
- `maxMergeDepth` validation (if implemented)
- Merged error contains aggregated information from all failures

**Success Definition:**
1. New test file `src/__tests__/adversarial/error-merge-strategy.test.ts` created
2. All test scenarios from the contract definition are covered
3. Tests use vitest framework with `describe`, `it`, `expect` patterns matching existing codebase
4. Tests verify error event emission with merged errors
5. All new tests pass
6. All existing tests continue to pass (no regressions)
7. Tests follow the project's test organization structure

## User Persona (if applicable)

**Target User:** Library Developer / QA Engineer

**Use Case:** A developer needs confidence that the ErrorMergeStrategy feature works correctly across all scenarios (enabled/disabled, default/custom merger, edge cases).

**User Journey:**
1. Developer runs the test suite to verify ErrorMergeStrategy functionality
2. Tests cover all code paths in the error aggregation logic
3. Test failures clearly indicate what functionality is broken
4. Tests serve as documentation for expected behavior

**Pain Points Addressed:**
- Currently no tests verify `errorMergeStrategy` configuration works
- No coverage for custom `combine()` function scenarios
- No validation that merged errors contain aggregated information
- Unclear what happens when `enabled=false` vs `enabled=true`

## Why

- **Quality Assurance:** P1.M2.T2.S2 implemented error aggregation logic, P1.M2.T2.S3 extracted the merger utility - both need comprehensive test coverage
- **Regression Prevention:** Future changes to concurrent execution could break error aggregation - tests prevent this
- **Documentation:** Tests serve as executable documentation of expected ErrorMergeStrategy behavior
- **PRD Compliance:** PRD Section 10 specifies "Optional Multi-Error Merging" with specific behaviors that need validation
- **Confidence:** Without tests, we cannot verify the implementation works as designed

## What

Create comprehensive tests for ErrorMergeStrategy functionality covering all scenarios specified in the contract definition.

### Test Scenarios Required

Based on contract definition and PRD requirements:

1. **Default Behavior (disabled)**: `errorMergeStrategy.enabled=false` → first error thrown
2. **Enabled with Default Merge**: `errorMergeStrategy.enabled=true` without `combine()` → uses `mergeWorkflowErrors`
3. **Enabled with Custom Combine**: `errorMergeStrategy.enabled=true` with `combine()` function → custom merger called
4. **maxMergeDepth Validation**: If implemented, verify depth limiting works
5. **Aggregated Information**: Verify merged error contains all error details

### Success Criteria

- [ ] Test file created at `src/__tests__/adversarial/error-merge-strategy.test.ts`
- [ ] Tests for `enabled=false` default behavior (first error wins)
- [ ] Tests for `enabled=true` with default merge
- [ ] Tests for `enabled=true` with custom combine function
- [ ] Tests for maxMergeDepth if implemented in P1.M2.T2.S2
- [ ] Tests verify merged error contains aggregated information
- [ ] All tests pass: `npm test -- error-merge-strategy.test.ts`
- [ ] All existing tests pass: `npm test` (no regressions)
- [ ] Test coverage for error merge strategy code paths > 90%

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file locations for implementation files to test
- Complete existing test patterns to follow
- Helper function patterns from existing tests
- Test structure and organization patterns
- All type definitions needed
- Validation commands specific to this project

### Documentation & References

```yaml
# MUST READ - Implementation Files to Test
- file: src/decorators/task.ts (lines 119-143)
  why: Contains the error merge strategy implementation to test
  critical: This is the main code under test - shows how errorMergeStrategy is checked and used
  gotcha: Error merge only happens when opts.concurrent=true AND opts.errorMergeStrategy?.enabled=true

- file: src/utils/workflow-error-utils.ts
  why: Contains mergeWorkflowErrors function used as default merger
  pattern: Follow existing test patterns from workflow-error-utils.test.ts
  critical: Default merger behavior must match this function's implementation

- file: src/types/error-strategy.ts
  why: ErrorMergeStrategy interface definition
  current_content: |
    export interface ErrorMergeStrategy {
      enabled: boolean;
      maxMergeDepth?: number;
      combine?(errors: WorkflowError[]): WorkflowError;
    }

- file: src/types/decorators.ts
  why: TaskOptions interface with errorMergeStrategy field
  current_content: |
    export interface TaskOptions {
      name?: string;
      concurrent?: boolean;
      errorMergeStrategy?: ErrorMergeStrategy;
    }

- file: src/types/error.ts
  why: WorkflowError interface structure - what errors look like
  critical: Tests must verify WorkflowError structure is correct

# MUST READ - Existing Test Patterns to Follow
- file: src/__tests__/adversarial/concurrent-task-failures.test.ts
  why: Shows test patterns for concurrent task error scenarios
  pattern: createChildWorkflow helper, setupEventObserver helper, @Task decorator usage
  critical: Follow this exact pattern for test structure and helper functions

- file: src/__tests__/unit/utils/workflow-error-utils.test.ts
  why: Shows test patterns for mergeWorkflowErrors function
  pattern: createMockWorkflowError helper, metadata validation assertions
  critical: Use similar assertion patterns for validating merged errors

- file: src/__tests__/unit/decorators.test.ts (lines 1-100)
  why: Shows basic @Task decorator test patterns
  pattern: Workflow class extension, decorator usage, async test patterns

# EXTERNAL RESEARCH - Vitest Testing Patterns
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T2S4/research/vitest_testing_patterns.md
  why: Comprehensive vitest testing patterns for error handling
  section: "Testing Error Aggregation Behavior", "Async Error Testing Best Practices"
  critical: |
    - await expect().rejects.toThrow() for async error testing
    - try-catch for detailed error inspection
    - Event observer setup pattern
    - Promise.allSettled testing patterns

# ARCHITECTURE DOCUMENTATION
- file: plan/001_d3bb02af4886/bugfix/architecture/codebase_structure.md (lines 269-287)
  why: Testing strategy section - shows how tests are organized in this codebase
  section: "## 9. Testing Strategy"
  critical: Tests organized into unit/, integration/, and adversarial/ directories

- file: plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md (lines 147-217)
  why: Shows recommended implementation pattern for error aggregation
  section: "## 5. Recommended Pattern for Promise.allSettled with Error Aggregation"
  critical: Understanding the implementation helps write accurate tests

# PREVIOUS WORK - PRPs for Related Tasks
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T2S3/PRP.md
  why: PRP for default error merger implementation
  section: "Implementation Blueprint" shows mergeWorkflowErrors specification
  critical: Tests must verify this exact merge behavior

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M2T2S2/PRP.md
  why: PRP for error aggregation logic in @Task decorator
  section: "Implementation Blueprint" shows error merge strategy check logic
  critical: Tests must verify opts.errorMergeStrategy?.enabled check works

# PRD REQUIREMENTS
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/prd_snapshot.md (lines 72-90)
  why: Issue 3 - Missing Error Merge Strategy Implementation
  section: "### Issue 3: Missing Error Merge Strategy Implementation"
  critical: PRD specifies disabled by default, maxMergeDepth for recursion, combine() for custom logic
```

### Current Codebase Tree (relevant portions)

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── decorators/
│   │   └── task.ts                    # Lines 119-143 - error merge strategy implementation
│   ├── utils/
│   │   └── workflow-error-utils.ts    # mergeWorkflowErrors function
│   ├── types/
│   │   ├── error-strategy.ts          # ErrorMergeStrategy interface
│   │   ├── error.ts                   # WorkflowError interface
│   │   └── decorators.ts              # TaskOptions interface
│   └── __tests__/
│       ├── adversarial/
│       │   ├── concurrent-task-failures.test.ts     # Pattern to follow
│       │   ├── edge-case.test.ts                     # Additional patterns
│       │   └── error-merge-strategy.test.ts         # NEW - TO BE CREATED
│       └── unit/
│           ├── decorators.test.ts                    # @Task decorator tests
│           └── utils/
│               └── workflow-error-utils.test.ts     # mergeWorkflowErrors tests
├── vitest.config.ts                   # Test configuration
└── package.json                       # Test scripts
```

### Desired Codebase Tree (files to be added)

```bash
# NEW FILE:
src/__tests__/adversarial/error-merge-strategy.test.ts  # Comprehensive ErrorMergeStrategy tests

# NO FILES MODIFIED - This is a test-only task
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL GOTCHA #1: Error merge strategy only works with concurrent=true
// The opts.errorMergeStrategy check is INSIDE the opts.concurrent block
// Location: src/decorators/task.ts lines 106-143
// IMPLICATION: Tests MUST use @Task({ concurrent: true, errorMergeStrategy: {...} })
// BAD: @Task({ errorMergeStrategy: { enabled: true } })  // concurrent defaults to false
// GOOD: @Task({ concurrent: true, errorMergeStrategy: { enabled: true } })

// CRITICAL GOTCHA #2: Individual workflow error events already emitted by @Step
// Each failing workflow emits its own error event BEFORE @Task aggregates them
// When errorMergeStrategy.enabled=true, @Task emits ONE additional error event with merged error
// When errorMergeStrategy not enabled, @Task does NOT emit additional error event
// IMPLICATION: Tests should count total error events = individual errors + (1 if enabled else 0)

// CRITICAL GOTCHA #3: WorkflowError.original contains metadata object
// For merged errors, original field has: { name, message, errors, totalChildren, failedChildren, failedWorkflowIds }
// Tests should verify this metadata structure
// PATTERN: (result.original as { failedWorkflowIds: string[] }).failedWorkflowIds

// CRITICAL GOTCHA #4: mergeWorkflowErrors signature
// mergeWorkflowErrors(errors: WorkflowError[], taskName: string, parentWorkflowId: string, totalChildren: number)
// The decorator calls this with: mergeWorkflowErrors(errors, taskName, wf.id, runnable.length)
// Tests should verify the message format includes all these parameters

// CRITICAL GOTCHA #5: First error wins when disabled
// When errorMergeStrategy is undefined or enabled=false, decorator throws rejected[0].reason
// This is the FIRST rejected promise, which may not be deterministic in concurrent execution
// Tests should use try-catch and verify error structure, not exact error message

// CRITICAL GOTCHA #6: Custom combine() can return any WorkflowError
// User controls the merge behavior when providing combine() function
// Tests should verify combine() was called, not specific merge behavior
// Use vi.fn() spy to verify combine() was called with correct arguments

// CRITICAL GOTCHA #7: Workflow completion vs error propagation
// Promise.allSettled ensures ALL workflows complete even when some fail
// The error is thrown AFTER all workflows complete (fulfilled or rejected)
// Tests should verify parent.children.length equals total children spawned

// CRITICAL GOTCHA #8: Test file location matters
// This is an adversarial test (edge cases, complex scenarios)
// Place in src/__tests__/adversarial/ not src/__tests__/unit/

// CRITICAL GOTCHA #9: Import paths use .js extensions
// TypeScript ES modules require .js extensions in import statements
// import { Workflow } from '../../index.js';  // Note .js extension

// CRITICAL GOTCHA #10: maxMergeDepth is NOT currently implemented
// The interface has maxMergeDepth?: number but it's not used in P1.M2.T2.S2 implementation
// Tests should note this as "future work" or "not yet implemented"
// Don't write failing tests for unimplemented features

// CRITICAL GOTCHA #11: Event observer must be added BEFORE workflow.run()
// If observer is added after run(), events emitted during run() won't be captured
// PATTERN: setup observer, then await workflow.run()

// CRITICAL GOTCHA #12: Helper function pattern for creating failing workflows
// Use the createChildWorkflow pattern from concurrent-task-failures.test.ts
// It creates anonymous class extending Workflow with @Step decorated method
// This ensures WorkflowError wrapping happens correctly
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - using existing types:

```typescript
// From src/types/error-strategy.ts
export interface ErrorMergeStrategy {
  enabled: boolean;
  maxMergeDepth?: number;
  combine?(errors: WorkflowError[]): WorkflowError;
}

// From src/types/error.ts
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}

// Merged error metadata structure (in original field)
interface MergedErrorMetadata {
  name: string;                  // 'WorkflowAggregateError'
  message: string;               // Aggregated message
  errors: WorkflowError[];       // All original errors
  totalChildren: number;         // Total spawned
  failedChildren: number;        // How many failed
  failedWorkflowIds: string[];   // Unique workflow IDs
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/error-merge-strategy.test.ts
  - IMPLEMENT: Test file scaffolding with imports and describe blocks
  - IMPORT from: vitest (describe, it, expect), Workflow/Task/Step from '../../index.js', WorkflowEvent from '../../types/index.js'
  - STRUCTURE: Follow pattern from concurrent-task-failures.test.ts
  - NAMING: describe('@Task decorator ErrorMergeStrategy', () => { ... })
  - PLACEMENT: src/__tests__/adversarial/ directory

Task 2: IMPLEMENT helper functions (top of test file)
  - FUNCTION: createChildWorkflow(parent, name, shouldFail) - creates failing/succeeding workflow
  - PATTERN: Copy from concurrent-task-failures.test.ts lines 30-52
  - FUNCTION: setupEventObserver(workflow) - returns events array
  - PATTERN: Copy from concurrent-task-failures.test.ts lines 58-67
  - FUNCTION: createMockWorkflowError(overrides) - for custom combine() tests
  - PATTERN: Copy from workflow-error-utils.test.ts lines 7-25

Task 3: IMPLEMENT tests for enabled=false (default behavior)
  - DESCRIBE: 'Default behavior (errorMergeStrategy disabled)'
  - TEST: 'should throw first error when errorMergeStrategy not provided'
  - TEST: 'should throw first error when errorMergeStrategy.enabled=false'
  - VERIFY: Only first error thrown, not aggregated
  - VERIFY: No additional error event emitted (only individual workflow errors)
  - PATTERN: Use try-catch, verify error structure, count error events

Task 4: IMPLEMENT tests for enabled=true with default merge
  - DESCRIBE: 'Enabled with default error merge'
  - TEST: 'should merge all errors when errorMergeStrategy.enabled=true'
  - TEST: 'should create aggregated error message with counts and task name'
  - TEST: 'should aggregate all logs from all failed workflows'
  - TEST: 'should include metadata in original field'
  - VERIFY: Message format "${X} of ${Y} concurrent child workflows failed in task '${taskName}'"
  - VERIFY: failedWorkflowIds array contains unique workflow IDs
  - VERIFY: logs array is flattened from all errors
  - VERIFY: Error event emitted with merged error

Task 5: IMPLEMENT tests for enabled=true with custom combine
  - DESCRIBE: 'Enabled with custom combine function'
  - TEST: 'should call custom combine function when provided'
  - TEST: 'should use custom merge result from combine function'
  - TEST: 'should pass all errors to custom combine function'
  - TECHNIQUE: Use vi.fn() to spy on combine function
  - VERIFY: combine() called with array of WorkflowError
  - VERIFY: combine() return value is thrown as error

Task 6: IMPLEMENT edge case tests
  - DESCRIBE: 'Edge cases and error scenarios'
  - TEST: 'should handle single failure with merge enabled'
  - TEST: 'should handle all workflows failing with merge enabled'
  - TEST: 'should handle mixed success/failure with merge enabled'
  - TEST: 'should complete all workflows even when errors occur'
  - VERIFY: parent.children.length equals total children spawned

Task 7: IMPLEMENT maxMergeDepth tests (if applicable)
  - CHECK: Does src/decorators/task.ts use maxMergeDepth?
  - IF NOT IMPLEMENTED: Add test with todo.skip() or note as future work
  - IF IMPLEMENTED: Test depth limiting behavior
  - CURRENT STATUS: maxMergeDepth is in interface but NOT used in implementation
  - RECOMMENDATION: Add todo('maxMergeDepth not yet implemented')

Task 8: VERIFY all tests pass
  - RUN: npm test -- error-merge-strategy.test.ts
  - VERIFY: All new tests pass
  - RUN: npm test (full suite)
  - VERIFY: No regressions in existing tests
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// PATTERN 1: Test File Structure
// Location: Top of src/__tests__/adversarial/error-merge-strategy.test.ts
// ============================================================================

import { describe, it, expect } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';
import type { WorkflowEvent, WorkflowError } from '../../types/index.js';

describe('@Task decorator ErrorMergeStrategy', () => {
  // Helper functions defined here
  // Test suites defined here
});

// ============================================================================
// PATTERN 2: Helper Function - Create Child Workflow
// Follow: src/__tests__/adversarial/concurrent-task-failures.test.ts lines 30-52
// ============================================================================

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

// KEY INSIGHTS:
// - Creates anonymous class extending Workflow
// - Uses @Step decorator to ensure error wrapping
// - shouldFail parameter controls success/failure
// - Error message includes workflow name for identification

// ============================================================================
// PATTERN 3: Helper Function - Setup Event Observer
// Follow: src/__tests__/adversarial/concurrent-task-failures.test.ts lines 58-67
// ============================================================================

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

// KEY INSIGHTS:
// - MUST be called before workflow.run()
// - Returns array for assertion
// - Captures all workflow events including errors

// ============================================================================
// PATTERN 4: Test for Default Behavior (disabled)
// ============================================================================

describe('Default behavior (errorMergeStrategy disabled)', () => {
  it('should throw first error when errorMergeStrategy not provided', async () => {
    // ARRANGE: Create parent with concurrent tasks, no error merge strategy
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })  // CRITICAL: concurrent=true required
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Child-0', false),
          createChildWorkflow(this, 'Child-1', true),  // Will fail
          createChildWorkflow(this, 'Child-2', false),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          // Expected - capture error for validation
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const events = setupEventObserver(parent);

    // ACT: Run parent workflow
    const thrownError = await parent.run();

    // ASSERT: All children completed (Promise.allSettled behavior)
    expect(parent.children.length).toBe(3);

    // ASSERT: Error was thrown (first error wins)
    expect(thrownError).toBeDefined();
    expect((thrownError as WorkflowError).message).toContain('Child-1 failed');

    // ASSERT: No additional error event from @Task (only individual workflow errors)
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBe(1);  // Only Child-1's error event
  });

  it('should throw first error when errorMergeStrategy.enabled=false', async () => {
    // Similar to above but with explicit enabled=false
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: false }  // Explicitly disabled
      })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Alpha', false),
          createChildWorkflow(this, 'Beta', true),
          createChildWorkflow(this, 'Gamma', true),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const events = setupEventObserver(parent);
    const thrownError = await parent.run();

    // ASSERT: First error thrown (not aggregated)
    expect(thrownError).toBeDefined();
    const errorMsg = (thrownError as WorkflowError).message;
    expect(errorMsg).toMatch(/Alpha failed|Beta failed|Gamma failed/);

    // ASSERT: Only individual error events (no merge event)
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBe(2);  // Beta and Gamma errors only
  });
});

// ============================================================================
// PATTERN 5: Test for Enabled with Default Merge
// ============================================================================

describe('Enabled with default error merge', () => {
  it('should merge all errors when errorMergeStrategy.enabled=true', async () => {
    // ARRANGE: Create parent with error merge enabled
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }  // No combine() - use default
      })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Alpha', false),
          createChildWorkflow(this, 'Beta', true),   // Will fail
          createChildWorkflow(this, 'Gamma', false),
          createChildWorkflow(this, 'Delta', true),  // Will fail
          createChildWorkflow(this, 'Epsilon', false),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const events = setupEventObserver(parent);

    // ACT
    const thrownError = await parent.run();

    // ASSERT: All children completed
    expect(parent.children.length).toBe(5);

    // ASSERT: Merged error thrown
    expect(thrownError).toBeDefined();
    const error = thrownError as WorkflowError;

    // ASSERT: Message includes count and task name
    expect(error.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");

    // ASSERT: Metadata in original field
    const metadata = error.original as {
      name: string;
      message: string;
      errors: WorkflowError[];
      totalChildren: number;
      failedChildren: number;
      failedWorkflowIds: string[];
    };

    expect(metadata.name).toBe('WorkflowAggregateError');
    expect(metadata.totalChildren).toBe(5);
    expect(metadata.failedChildren).toBe(2);
    expect(metadata.failedWorkflowIds).toHaveLength(2);
    expect(metadata.errors).toHaveLength(2);

    // ASSERT: Logs aggregated from all errors
    expect(error.logs).toBeDefined();
    expect(Array.isArray(error.logs)).toBe(true);
    expect(error.logs.length).toBeGreaterThan(0);

    // ASSERT: Error event emitted with merged error
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(3);  // 2 individual + 1 merged

    // Find the merged error event (has different message format)
    const mergedErrorEvent = errorEvents.find((e) => {
      if (e.type === 'error') {
        return e.error.message.includes('2 of 5 concurrent');
      }
      return false;
    });
    expect(mergedErrorEvent).toBeDefined();
  });

  it('should aggregate logs from all failed workflows', async () => {
    // Create workflows that log before failing
    class LoggingWorkflow extends Workflow {
      constructor(name: string, parent: Workflow, private shouldFail: boolean) {
        super(name, parent);
      }

      @Step()
      async executeStep() {
        this.logger.info(`${this.node.name} starting`);
        if (this.shouldFail) {
          this.logger.error(`${this.node.name} failing`);
          throw new Error(`${this.node.name} failed`);
        }
        this.logger.info(`${this.node.name} completed`);
      }

      async run() {
        return this.executeStep();
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        return [
          new LoggingWorkflow('Workflow-1', this, true),
          new LoggingWorkflow('Workflow-2', this, true),
          new LoggingWorkflow('Workflow-3', this, false),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const thrownError = await parent.run() as WorkflowError;

    // ASSERT: Logs from both failed workflows aggregated
    expect(thrownError.logs).toBeDefined();
    const logMessages = thrownError.logs.map(l => l.message);

    // Should have logs from both failing workflows
    expect(logMessages.some(m => m.includes('Workflow-1'))).toBe(true);
    expect(logMessages.some(m => m.includes('Workflow-2'))).toBe(true);
  });
});

// ============================================================================
// PATTERN 6: Test for Custom Combine Function
// ============================================================================

describe('Enabled with custom combine function', () => {
  it('should call custom combine function when provided', async () => {
    // ARRANGE: Create spy for combine function
    const combineSpy = vi.fn((errors: WorkflowError[]) => ({
      message: `Custom merge: ${errors.length} errors`,
      original: errors,
      workflowId: 'custom-parent',
      logs: errors.flatMap(e => e.logs),
    }));

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: {
          enabled: true,
          combine: combineSpy  // Custom combine function
        }
      })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Alpha', true),
          createChildWorkflow(this, 'Beta', true),
          createChildWorkflow(this, 'Gamma', false),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');

    // ACT
    await parent.run();

    // ASSERT: Custom combine function was called
    expect(combineSpy).toHaveBeenCalledTimes(1);

    // ASSERT: Called with array of WorkflowError objects
    const calls = combineSpy.mock.calls;
    expect(calls).toHaveLength(1);
    const errorsArg = calls[0][0] as WorkflowError[];
    expect(Array.isArray(errorsArg)).toBe(true);
    expect(errorsArg).toHaveLength(2);  // Alpha and Beta failed
  });

  it('should use custom merge result from combine function', async () => {
    // ARRANGE: Custom combine that returns specific format
    const customMerger = (errors: WorkflowError[]): WorkflowError => ({
      message: `MERGED: ${errors.map(e => e.message).join(' | ')}`,
      original: {
        customField: 'custom-value',
        errors,
      },
      workflowId: 'merged-workflow',
      logs: errors.flatMap(e => e.logs),
    });

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: {
          enabled: true,
          combine: customMerger
        }
      })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'First', true),
          createChildWorkflow(this, 'Second', true),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const thrownError = await parent.run() as WorkflowError;

    // ASSERT: Custom merge result used
    expect(thrownError.message).toBe('MERGED: First failed | Second failed');
    expect(thrownError.workflowId).toBe('merged-workflow');

    // ASSERT: Custom fields preserved
    const customMetadata = thrownError.original as { customField: string };
    expect(customMetadata.customField).toBe('custom-value');
  });
});

// ============================================================================
// PATTERN 7: Edge Case Tests
// ============================================================================

describe('Edge cases and error scenarios', () => {
  it('should handle single failure with merge enabled', async () => {
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'OnlyChild', true),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const thrownError = await parent.run() as WorkflowError;

    // ASSERT: Message format correct for single failure
    expect(thrownError.message).toBe("1 of 1 concurrent child workflows failed in task 'spawnChildren'");
  });

  it('should handle all workflows failing with merge enabled', async () => {
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'W1', true),
          createChildWorkflow(this, 'W2', true),
          createChildWorkflow(this, 'W3', true),
          createChildWorkflow(this, 'W4', true),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const thrownError = await parent.run() as WorkflowError;

    // ASSERT: All failures counted
    expect(thrownError.message).toBe("4 of 4 concurrent child workflows failed in task 'spawnChildren'");

    // ASSERT: All workflows completed
    expect(parent.children.length).toBe(4);
  });

  it('should complete all workflows even when errors occur', async () => {
    const completedWorkflows = new Set<string>();

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        const children = [
          createChildWorkflow(this, 'Success1', false),
          createChildWorkflow(this, 'Fail1', true),
          createChildWorkflow(this, 'Success2', false),
          createChildWorkflow(this, 'Fail2', true),
        ];

        // Track completion
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
    await parent.run();

    // ASSERT: All workflows completed (no orphans)
    expect(completedWorkflows.size).toBe(4);
    expect(parent.children.length).toBe(4);
  });
});

// ============================================================================
// PATTERN 8: maxMergeDepth Tests (Future Work)
// ============================================================================

describe.todo('maxMergeDepth validation', () => {
  // NOTE: maxMergeDepth is defined in ErrorMergeStrategy interface
  // but not currently implemented in src/decorators/task.ts
  // These tests should be implemented when maxMergeDepth is added

  it('should respect maxMergeDepth when merging nested errors');
  it('should handle maxMergeDepth=0 (no merging)');
  it('should handle maxMergeDepth=1 (single level merging)');
});
```

### Integration Points

```yaml
TASK_DECORATOR:
  - file: src/decorators/task.ts
  - lines: 119-143 - error merge strategy implementation
  - test: Verify opts.errorMergeStrategy?.enabled check works
  - test: Verify default merger called when no combine() provided
  - test: Verify custom combine() called when provided

WORKFLOW_ERROR_UTILS:
  - file: src/utils/workflow-error-utils.ts
  - function: mergeWorkflowErrors()
  - test: Verify default merge behavior matches this function
  - test: Verify message format, log aggregation, metadata

EVENT_SYSTEM:
  - test: Verify error events emitted for individual failures
  - test: Verify additional error event emitted when merge enabled
  - test: Verify merged error event has correct structure

CONCURRENT_EXECUTION:
  - test: Verify Promise.allSettled completes all workflows
  - test: Verify no orphaned promises
  - test: Verify parent.children.length equals spawned count
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After creating test file, run TypeScript check
npx tsc --noEmit

# Expected: Zero type errors
# Common errors to fix:
# - "Cannot find module" → Check import paths use .js extension
# - "Property 'errorMergeStrategy' does not exist" → Check TaskOptions import
# - Type errors in spy functions → Check vi.fn() typing

# Run linter if configured
npm run lint 2>/dev/null || echo "No linter configured"
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new test file specifically
npm test -- error-merge-strategy.test.ts

# Run with verbose output to see all test names
npm test -- error-merge-strategy.test.ts --reporter=verbose

# Expected: All new tests pass
# If tests fail, debug:
# - Check that @Task has concurrent: true
# - Check that observer is added before run()
# - Check try-catch error handling
# - Verify error structure with type guards

# Run related test files
npm test -- concurrent-task-failures.test.ts
npm test -- workflow-error-utils.test.ts
npm test -- decorators.test.ts

# Expected: All related tests still pass (no regressions)
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full adversarial test suite
npm test -- src/__tests__/adversarial/

# Expected: All adversarial tests pass
# This validates new tests work alongside existing edge case tests

# Run full test suite
npm test

# Expected: All tests pass (no regressions)
# Current test count: ~344 tests
# New tests should add ~10-15 tests

# Check test coverage
npm test -- --coverage

# Expected: Error merge strategy code paths > 90% coverage
```

### Level 4: Manual Verification

```bash
# Create a manual test to verify behavior
cat > /tmp/test_error_merge_strategy.ts << 'EOF'
import { Workflow, Task, Step } from './dist/index.js';

class ChildWorkflow extends Workflow {
  constructor(name: string, parent: Workflow, private fail: boolean) {
    super(name, parent);
  }

  @Step()
  async run() {
    if (this.fail) {
      throw new Error(`${this.id} failed`);
    }
    return `${this.id} succeeded`;
  }
}

// Test 1: Default behavior (disabled)
class Parent1 extends Workflow {
  @Task({ concurrent: true })
  async spawn() {
    return [
      new ChildWorkflow('c1', this, false),
      new ChildWorkflow('c2', this, true),
      new ChildWorkflow('c3', this, false),
    ];
  }
}

// Test 2: Enabled with default merge
class Parent2 extends Workflow {
  @Task({ concurrent: true, errorMergeStrategy: { enabled: true } })
  async spawn() {
    return [
      new ChildWorkflow('c1', this, false),
      new ChildWorkflow('c2', this, true),
      new ChildWorkflow('c3', this, true),
    ];
  }
}

async function test() {
  console.log('Test 1: Default behavior');
  try {
    const p1 = new Parent1('p1');
    await p1.spawn();
  } catch (err) {
    console.log('Error:', err.message);
    console.log('Is first error only:', !err.message.includes('concurrent'));
  }

  console.log('\nTest 2: Enabled with default merge');
  try {
    const p2 = new Parent2('p2');
    await p2.spawn();
  } catch (err) {
    console.log('Error:', err.message);
    console.log('Is aggregated:', err.message.includes('concurrent'));
    console.log('Failed children:', err.original?.failedChildren);
  }
}

test();
EOF

# Build and run
npm run build
node /tmp/test_error_merge_strategy.ts

# Expected output:
# Test 1: Error message contains single child name (not "concurrent")
# Test 2: Error message contains "X of Y concurrent" and failedChildren count

# Clean up
rm /tmp/test_error_merge_strategy.ts
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at `src/__tests__/adversarial/error-merge-strategy.test.ts`
- [ ] All imports use `.js` extensions for ES modules
- [ ] Test follows patterns from `concurrent-task-failures.test.ts`
- [ ] Helper functions defined (createChildWorkflow, setupEventObserver)
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] All new tests pass: `npm test -- error-merge-strategy.test.ts`
- [ ] All existing tests pass: `npm test`

### Feature Validation - Default Behavior (disabled)

- [ ] Test for no errorMergeStrategy provided
- [ ] Test for errorMergeStrategy.enabled=false
- [ ] Verifies first error thrown (not aggregated)
- [ ] Verifies no additional error event from @Task
- [ ] Verifies all workflows complete (Promise.allSettled)

### Feature Validation - Enabled with Default Merge

- [ ] Test for errorMergeStrategy.enabled=true without combine()
- [ ] Verifies aggregated error message with counts and task name
- [ ] Verifies metadata in original field (name, errors, totalChildren, failedChildren, failedWorkflowIds)
- [ ] Verifies logs aggregated from all failed workflows
- [ ] Verifies error event emitted with merged error
- [ ] Verifies all workflows complete despite failures

### Feature Validation - Enabled with Custom Combine

- [ ] Test for errorMergeStrategy.enabled=true with combine()
- [ ] Verifies custom combine() function is called
- [ ] Verifies all errors passed to combine()
- [ ] Verifies combine() return value is thrown
- [ ] Uses vi.fn() spy to verify call count and arguments

### Feature Validation - Edge Cases

- [ ] Test for single failure with merge enabled
- [ ] Test for all workflows failing
- [ ] Test for mixed success/failure scenarios
- [ ] Test for no orphaned workflows (completion tracking)

### Code Quality Validation

- [ ] Follows existing codebase test patterns
- [ ] File placement in adversarial/ directory
- [ ] Test names are descriptive and follow convention
- [ ] Helper functions follow existing patterns
- [ ] Comments clarify complex test scenarios
- [ ] No hardcoded timeouts or delays
- [ ] Tests are deterministic (no race conditions)

### Documentation & Deployment

- [ ] Test file has clear header comment describing purpose
- [ ] Test suites are logically organized
- [ ] Edge cases are documented in test descriptions
- [ ] Future work (maxMergeDepth) noted with todo/todo.skip
- [ ] Tests serve as documentation of expected behavior

---

## Anti-Patterns to Avoid

- ❌ **Don't forget `concurrent: true`** - Error merge strategy only works with concurrent execution
- ❌ **Don't add observer after run()** - Events during run() won't be captured
- ❌ **Don't assume error message order** - First error may not be deterministic
- ❌ **Don't skip try-catch for expected errors** - Tests will fail with unhandled rejection
- ❌ **Don't use `await` before expect in try-catch** - Errors won't be caught properly
- ❌ **Don't test unimplemented features** - maxMergeDepth is not implemented, use todo.skip()
- ❌ **Don't forget to verify all workflows completed** - Check parent.children.length
- ❌ **Don't count error events incorrectly** - Individual errors + 1 merged event when enabled
- ❌ **Don't hardcode expected error messages** - Use regex or partial matching
- ❌ **Don't place test file in unit/ directory** - This is an adversarial test

---

## Confidence Score

**9/10** - High confidence for one-pass implementation success

**Reasoning:**
- Clear implementation files to test (task.ts, workflow-error-utils.ts)
- Existing test patterns provide exact templates to follow
- Comprehensive research documentation available
- Well-defined test scenarios from contract definition
- Helper function patterns established in codebase

**Risk Factors:**
- Must remember `concurrent: true` is required for error merge
- Event counting can be tricky (individual + merged events)
- maxMergeDepth not implemented - need to handle gracefully
- First error may not be deterministic in concurrent execution

---

## Appendix: Test File Template

```typescript
/**
 * ErrorMergeStrategy Functionality Test Suite
 *
 * Tests the ErrorMergeStrategy feature for concurrent task error aggregation.
 *
 * Validates:
 * - Default behavior (disabled) - first error wins
 * - Enabled with default merge - uses mergeWorkflowErrors
 * - Enabled with custom combine - user-provided merger
 * - Edge cases - single failure, all failing, mixed scenarios
 * - Event emission - individual and merged error events
 * - Completion verification - all workflows complete
 *
 * Related:
 * - P1.M2.T2.S2: Error aggregation logic implementation
 * - P1.M2.T2.S3: Default error merger utility
 * - Bug: 001_e8e04329daf3 - Concurrent task error handling
 */

import { describe, it, expect, todo } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';
import type { WorkflowEvent, WorkflowError } from '../../types/index.js';

describe('@Task decorator ErrorMergeStrategy', () => {
  // Helper functions
  function createChildWorkflow(parent: Workflow, name: string, shouldFail: boolean = false): Workflow {
    // ... implementation
  }

  function setupEventObserver(workflow: Workflow): WorkflowEvent[] {
    // ... implementation
  }

  // Test suites
  describe('Default behavior (errorMergeStrategy disabled)', () => {
    // ... tests
  });

  describe('Enabled with default error merge', () => {
    // ... tests
  });

  describe('Enabled with custom combine function', () => {
    // ... tests
  });

  describe('Edge cases and error scenarios', () => {
    // ... tests
  });

  describe.todo('maxMergeDepth validation', () => {
    // Future: maxMergeDepth tests
  });
});
```

---

**PRP Status**: ✅ Complete - Ready for Implementation
**Next Task**: P1.M2.T3.S1 - Document trackTiming Default Value in PRD
