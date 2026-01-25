# PRP: Run Integration Tests and Fix Failures

**PRP ID**: P1.M4.T1.S2
**Work Item**: Run integration tests and fix failures
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Execute the complete integration test suite using `npm test` and fix any failing tests to achieve 100% pass rate, ensuring AgentResponse handling works correctly in multi-step workflow scenarios and child workflow response propagation.

**Deliverable**: All integration tests passing (100% pass rate) with no failing tests in `src/__tests__/integration/`, specifically validating that AgentResponse objects propagate correctly through nested workflows and multi-step workflows handle all response states properly.

**Success Definition**:
- Running `npm test` executes without errors
- All integration tests in `src/__tests__/integration/` pass
- Test output shows `X pass X fail` with 0 failures for integration tests
- Multi-step workflows properly handle AgentResponse in all states (success, error, partial)
- Child workflow responses properly propagate to parent workflows
- Type guards (isSuccess, isError, isPartial) work correctly in workflow contexts
- Test execution completes within reasonable time (< 120 seconds for integration tests)

---

## User Persona (if applicable)

**Target User**: Development team executing the test suite to validate the AgentResponse migration

**Use Case**: After unit tests pass (P1.M4.T1.S1), developers run integration tests to validate end-to-end functionality, including multi-step workflows and child workflow response propagation

**User Journey**:
1. Developer runs `npm test` after completing unit test fixes
2. Integration test suite runs, testing full workflows with Agent.prompt() calls
3. Any failures are analyzed and fixed using this PRP
4. Tests pass, validating the complete AgentResponse migration

**Pain Points Addressed**:
- Integration tests may fail after AgentResponse migration due to response propagation issues
- Multi-step workflows may not handle all AgentResponse states
- Child workflow responses may not propagate correctly to parents
- Type guards may not work correctly in async workflow contexts

---

## Why

**Business Value and User Impact**:
- **Quality assurance**: Integration tests catch issues that unit tests miss, validating full workflow execution
- **Migration validation**: Ensures AgentResponse changes work correctly in real workflow scenarios
- **Regression prevention**: Multi-step workflow tests prevent breaking existing functionality
- **Confidence in deployment**: 100% pass rate enables safe deployment of AgentResponse migration

**Integration with Existing Features**:
- **Depends on**: P1.M4.T1.S1 (unit tests passing) - provides foundation of working code
- **Validates**:
  - P1.M1.T1 (Agent.prompt() returns AgentResponse<T>)
  - P1.M1.T2 (All call sites handle AgentResponse)
  - P1.M2.T1 (Zod schema validation)
- **Testing**: Full workflows with Agent.prompt() calls, child workflow propagation, observer patterns

**Problems This Solves**:
- Integration tests may fail due to AgentResponse not propagating through nested workflows
- Multi-step workflows may not handle all three AgentResponse states (success, error, partial)
- Child workflow responses may be lost or not properly handled by parent workflows
- Type guards may lose type narrowing across async boundaries in workflows
- Observer propagation may not work correctly after AgentResponse changes

---

## What

**User-Visible Behavior**:
- Developers run `npm test` and see all tests pass
- Integration tests validate full workflow execution with Agent.prompt() calls
- Multi-step workflows properly handle AgentResponse objects
- Child workflow responses propagate correctly to parent workflows
- CI/CD pipeline executes integration tests without failures

**Technical Requirements**:
- Execute `npm test` which runs Vitest with `vitest run` command
- Analyze integration test output for failures (5 integration test files)
- Fix failing tests by updating AgentResponse handling in workflow contexts
- Ensure all multi-step workflows handle AgentResponse states correctly
- Validate child workflow response propagation patterns
- Run tests until 100% pass rate achieved

### Success Criteria

- [ ] All integration tests pass when running `npm test`
- [ ] No test failures in `src/__tests__/integration/` directory
- [ ] Test output shows `XX pass 0 fail` (zero failures) for integration tests
- [ ] Multi-step workflows handle all AgentResponse states (success, error, partial)
- [ ] Child workflow responses propagate correctly to parent workflows
- [ ] Type guards work correctly in workflow async contexts
- [ ] Observer propagation works correctly in multi-level workflows
- [ ] Tests complete in reasonable time (< 120 seconds for integration suite)

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact test commands, integration test patterns, failure catalog with fixes, and references to all integration test files. An implementer unfamiliar with the codebase can run tests and fix failures using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Previous Work Item Output (CONTRACT)
- file: plan/002_6761e4b84fd1/P1M4T1S1/PRP.md
  why: Defines unit test outputs - assumes 100% unit test pass rate as starting point
  critical: Integration tests run after unit tests pass; unit test fixes inform integration test issues

# Integration Test Files (5 files to test and fix)
- file: src/__tests__/integration/agent-workflow.test.ts
  why: Contains Agent.prompt() integration tests with AgentResponse handling in workflows
  pattern: Mock AgentResponse in workflow steps, type guard usage, metadata propagation (lines 263-573)
  gotcha: Tests use mock AgentResponse objects - must ensure they match actual structure

- file: src/__tests__/integration/tree-mirroring.test.ts
  why: Tests 1:1 tree mirror invariant between workflow tree and node tree
  pattern: TDDOrchestrator usage, WorkflowTreeDebugger, event tree validation
  gotcha: May fail due to AgentResponse in event logs causing circular references

- file: src/__tests__/integration/workflow-reparenting.test.ts
  why: Tests observer propagation after child workflow reparenting
  pattern: attachChild/detachChild cycles, observer routing validation
  gotcha: Events must route to correct observers after reparenting

- file: src/__tests__/integration/bidirectional-consistency.test.ts
  why: Validates PRD 12.2 bidirectional tree consistency (workflow tree ↔ node tree)
  pattern: verifyBidirectionalLink, verifyTreeMirror, validateTreeConsistency helpers
  gotcha: Uses tree-verification helpers from src/__tests__/helpers/tree-verification.ts

- file: src/__tests__/integration/observer-logging.test.ts
  why: Tests observer error handling and logging behavior
  pattern: Throwing observers, infinite recursion prevention, multiple observers
  gotcha: Observer errors logged to workflow.node.logs, not console.error

# Core Type Definitions
- file: src/types/agent.ts
  why: AgentResponse<T> type definitions, type guards, factory functions
  pattern: Discriminated union with status field, null over undefined (PRD 6.4.4)
  critical: isSuccess, isError, isPartial type guards for safe data access
  section: Lines 161-833 (complete AgentResponse definition)

- file: src/core/workflow.ts
  why: Workflow class with attachChild/detachChild, observer propagation
  pattern: Dual tree maintenance (workflow tree + node tree), getRootObservers()
  section: Lines 316-408 (attachChild/detachChild), 135-150 (observer propagation)

- file: src/core/agent.ts
  why: Agent.prompt() implementation returning AgentResponse<T>
  pattern: executePrompt method, Zod validation, metadata generation
  section: Lines 118-147 (prompt method signature and execution)

# Test Configuration
- file: package.json
  why: Contains test command definition
  section: scripts.test = "vitest run"
  critical: Use 'npm test' to run all tests (unit + integration + adversarial)

- file: vitest.config.ts
  why: Vitest configuration for test execution
  pattern: include: ['src/__tests__/**/*.test.ts'], globals: true
  critical: Tests use global describe/it/expect without imports

# Research Files (created for this PRP)
- docfile: plan/002_6761e4b84fd1/P1M4T1S2/research/integration-test-best-practices.md
  why: Complete guide for integration testing complex workflows with Vitest
  section: All sections - test organization, response propagation, failure patterns, custom matchers
  critical: Patterns for multi-step workflow testing, child workflow validation, debugging utilities

- docfile: plan/002_6761e4b84fd1/P1M4T1S2/research/child-workflow-propagation-analysis.md
  why: Complete analysis of child workflow response propagation patterns
  section: Sections 1-7 (attachment patterns, event propagation, AgentResponse handling)
  critical: attachChild/detachChild patterns, observer propagation, spawnWorkflow usage

- docfile: plan/002_6761e4b84fd1/P1M4T1S2/research/integration-test-failures-catalog.md
  why: Catalog of 10+ common integration test failure patterns with fixes
  section: All 10 pattern categories with detection, fix, and prevention
  critical: Response propagation failures, type guard failures, Zod validation failures

# Helper Files Referenced
- file: src/__tests__/helpers/tree-verification.ts
  why: Helper functions for testing tree consistency
  pattern: verifyBidirectionalLink, verifyTreeMirror, verifyOrphaned, validateTreeConsistency
  gotcha: These helpers throw descriptive errors for tree violations

# Example Workflows (for reference)
- file: src/examples/tdd-orchestrator.ts
  why: Example of complex workflow with child workflows
  pattern: TDDOrchestrator with cycles, child workflow spawning
  gotcha: Shows real-world AgentResponse usage patterns
```

### Current Codebase Tree (test structure)

```bash
/home/dustin/projects/groundswell
├── package.json                 # Contains "test": "vitest run"
├── vitest.config.ts            # Vitest configuration
├── src/
│   ├── __tests__/
│   │   ├── integration/        # Integration test directory (5 test files)
│   │   │   ├── agent-workflow.test.ts           # AgentResponse in workflows
│   │   │   ├── tree-mirroring.test.ts          # Tree mirror invariant
│   │   │   ├── workflow-reparenting.test.ts    # Observer routing
│   │   │   ├── bidirectional-consistency.test.ts  # Tree consistency
│   │   │   └── observer-logging.test.ts        # Observer error handling
│   │   ├── helpers/
│   │   │   ├── tree-verification.ts           # Tree validation helpers
│   │   │   └── index.ts
│   │   ├── unit/              # Unit tests (assumed passing from P1.M4.T1.S1)
│   │   └── adversarial/       # Adversarial tests (run in P1.M4.T1.S3)
│   ├── core/
│   │   ├── agent.ts            # Agent.prompt() returns AgentResponse<T>
│   │   └── workflow.ts         # Workflow class with attachChild/detachChild
│   └── types/
│       └── agent.ts            # AgentResponse type definitions
└── plan/
    └── 002_6761e4b84fd1/
        └── P1M4T1S2/
            ├── PRP.md           # This file
            └── research/        # Research files (3 files)
                ├── integration-test-best-practices.md
                ├── child-workflow-propagation-analysis.md
                └── integration-test-failures-catalog.md
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Test Command
// - Use 'npm test' NOT 'vitest' directly
// - package.json defines: "test": "vitest run"
// - vitest run executes tests once (not watch mode)
// - Runs ALL tests: unit + integration + adversarial

// CRITICAL: Test File Pattern
// - Vitest config: include: ['src/__tests__/**/*.test.ts']
// - All test files must end in .test.ts
// - Integration tests located in src/__tests__/integration/

// CRITICAL: Global Test Variables
// - vitest.config.ts has globals: true
// - No need to import describe, it, expect, vi
// - They're available globally in test files

// CRITICAL: ES Module Imports
// - This is an ES Module project ("type": "module" in package.json)
// - All imports must use .js extension (even for TypeScript files)
// - Example: import { Workflow } from '../../core/workflow.js'

// CRITICAL: AgentResponse in Integration Tests
// - Integration tests exercise full workflows with Agent.prompt() calls
// - Multi-step workflows must handle all 3 states: success, error, partial
// - Child workflow responses must propagate to parent workflows
// - Type guards must be used before accessing response.data or response.error

// CRITICAL: Integration Test Patterns
// - Use mock AgentResponse objects for predictable testing
// - Always use factory functions (createSuccessResponse, createErrorResponse)
// - Test all three response states (success, error, partial) not just happy path
// - Clear event arrays between test phases (setup vs test phases)

// CRITICAL: Multi-Step Workflow Gotchas
// - Type narrowing lost across async boundaries - capture data before await
// - AgentResponse metadata must be preserved through workflow chain
// - Child workflow responses must be captured and propagated
// - Observer errors caught and logged, not thrown

// CRITICAL: Child Workflow Propagation
// - attachChild maintains dual tree (workflow + node)
// - Events bubble up: child → parent → ... → root observers
// - Observer propagation updates after reparenting
// - spawnWorkflow attaches child nodes and emits childAttached event

// CRITICAL: Common Integration Test Failures
// - Pattern 1.1: AgentResponse lost in nested workflow (not captured)
// - Pattern 1.2: Metadata not propagated (agentId/timestamp/requestId)
// - Pattern 2.1: Type guard not used before data access
// - Pattern 2.2: Type narrowing lost after await
// - Pattern 3.1: Undefined instead of null (PRD 6.4.4 violation)
// - Pattern 3.2: Wrong status case (use lowercase 'success' not 'Success')
// - Pattern 4.1: Tree mirror violation (manual mutation breaks invariant)
// - Pattern 9.1: Test arrays not cleared between phases

// CRITICAL: Test Execution Time
// - Integration tests should complete in < 120 seconds
// - If tests hang, there may be an async/await issue
// - Use --reporter=verbose for detailed output

// CRITICAL: Zod Validation in Integration Tests
// - AgentResponse must conform to schema (discriminated union)
// - Success responses: data is T, error is null
// - Error responses: data is null, error is AgentErrorDetails
// - PRD 6.4.4: Use null instead of undefined
```

---

## Implementation Blueprint

### Data Models and Structure

This task validates existing code through integration testing. No new data models.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: RUN integration tests to identify failures
  - EXECUTE: npm test
  - FILTER: Focus on integration test output (src/__tests__/integration/)
  - CAPTURE: Full test output including failures
  - COUNT: Total pass/fail/skip counts for integration tests
  - IDENTIFY: Which specific integration test files are failing
  - LOCATION: Run from /home/dustin/projects/groundswell
  - EXPECTED: Unit tests pass (from P1.M4.T1.S1), integration tests may fail

Task 2: ANALYZE integration test failures
  - REVIEW: Each failing integration test's error message
  - CATEGORIZE: Failure type using catalog from research/integration-test-failures-catalog.md
  - IDENTIFY: Root cause (response propagation, type guard, Zod validation, etc.)
  - DOCUMENT: List of failures with proposed fixes
  - REFERENCE: Use failure categories from catalog:
    * Pattern 1.x: Response Propagation Failures
    * Pattern 2.x: Type Guard Failures
    * Pattern 3.x: Zod Validation Failures
    * Pattern 4.x: Workflow State Consistency
    * Pattern 5.x: Observer Error Handling

Task 3: FIX AgentResponse propagation failures in workflows
  - PATTERN: Child workflow returns AgentResponse but parent doesn't capture it
  - FIX: Capture child workflow return value and propagate AgentResponse
  - REFERENCE: research/integration-test-failures-catalog.md Pattern 1.1
  - EXAMPLE:
      Before: await child.run(); // Response lost
      After: const childResponse = await child.run();
            if (isSuccess(childResponse)) {
              return createSuccessResponse(
                childResponse.data,
                { agentId: this.id, timestamp: Date.now() }
              );
            }

Task 4: FIX metadata propagation through workflow chain
  - PATTERN: Metadata not updated when propagating response to parent
  - FIX: Create new AgentResponse with updated metadata, preserve requestId
  - REFERENCE: research/integration-test-failures-catalog.md Pattern 1.2
  - EXAMPLE:
      // Preserve correlation ID and timing data
      return createSuccessResponse(
        childResponse.data,
        {
          agentId: this.id, // Update to parent
          timestamp: Date.now(), // Update timestamp
          requestId: childResponse.metadata.requestId, // PRESERVE
          duration: childResponse.metadata.duration, // PRESERVE
        }
      );

Task 5: FIX type guard failures in workflow contexts
  - PATTERN: Accessing response.data without checking status first
  - FIX: Use isSuccess/isError type guards before accessing data
  - REFERENCE: research/integration-test-failures-catalog.md Pattern 2.1
  - EXAMPLE:
      Before: console.log(response.data.toUpperCase()); // May crash
      After: if (isSuccess(response)) {
               console.log(response.data.toUpperCase()); // Safe
             } else if (isError(response)) {
               console.error(response.error.message);
             }

Task 6: FIX type narrowing lost across async boundaries
  - PATTERN: Type guard doesn't persist after await
  - FIX: Capture narrowed value in local variable before async operation
  - REFERENCE: research/integration-test-failures-catalog.md Pattern 2.2
  - EXAMPLE:
      Before: if (isSuccess(response)) { await operation(); console.log(response.data); }
      After: if (isSuccess(response)) {
               const data = response.data; // Capture before await
               await operation();
               console.log(data); // Use captured variable
             }

Task 7: FIX Zod validation failures (null over undefined)
  - PATTERN: Using undefined instead of null for absent values
  - FIX: Use factory functions or explicitly set null
  - REFERENCE: research/integration-test-failures-catalog.md Pattern 3.1
  - EXAMPLE:
      Before: error: undefined, data: undefined
      After: Use factory functions - createSuccessResponse() handles null automatically

Task 8: FIX wrong status value case
  - PATTERN: Using 'Success' instead of 'success' (case-sensitive)
  - FIX: Use exact lowercase values or factory functions
  - REFERENCE: research/integration-test-failures-catalog.md Pattern 3.2
  - EXAMPLE:
      Before: status: 'Success' // Wrong case
      After: status: 'success' // Correct lowercase
      BEST: createSuccessResponse(data, metadata) // Factory handles it

Task 9: FIX partial response handling in multi-step workflows
  - PATTERN: Multi-step workflows only check success/error, ignore partial
  - FIX: Add isPartial type guard handling for incremental results
  - REFERENCE: research/integration-test-failures-catalog.md Pattern 1.3
  - EXAMPLE:
      if (isSuccess(response)) {
        return finalize(response.data);
      } else if (isPartial(response)) {
        // Accumulate and continue
        this.accumulated.push(response.data.partialContent);
        return this.run(); // Recursive for next chunk
      } else if (isError(response)) {
        return response; // Propagate error
      }

Task 10: FIX test arrays not cleared between phases
  - PATTERN: Events from setup phase counted in test assertions
  - FIX: Clear event arrays before test phase
  - REFERENCE: research/integration-test-failures-catalog.md Pattern 9.1
  - EXAMPLE:
      // Setup phase
      const child = new Workflow('Child', parent1); // Emits childAttached
      parent1.detachChild(child);
      parent2.attachChild(child);

      // CLEAR setup events
      events.length = 0;

      // Test phase
      child.setStatus('running'); // Emits treeUpdated
      expect(events.some(e => e.type === 'treeUpdated')).toBe(true);

Task 11: RE-RUN integration tests after each fix batch
  - EXECUTE: npm test after fixing 2-3 tests
  - VERIFY: Previously failing tests now pass
  - CHECK: No new test failures introduced
  - ITERATE: Return to Task 2 if new failures appear

Task 12: VERIFY 100% integration test pass rate
  - EXECUTE: npm test one final time
  - CONFIRM: Output shows "XX pass 0 fail" for integration tests
  - CONFIRM: All 5 integration test files pass
  - CONFIRM: No skipped or pending tests
  - CONFIRM: Test execution time < 120 seconds

Task 13: DOCUMENT test results
  - RECORD: Final test pass/fail counts
  - RECORD: Integration tests that needed fixes
  - RECORD: Common failure patterns observed
  - STORE: Notes in research/ directory for future reference
```

### Implementation Patterns & Key Details

```typescript
// Show critical patterns and gotchas - keep concise

// Pattern 1: Capturing Child Workflow AgentResponse
// PROBLEM: Child workflow returns AgentResponse but parent doesn't capture it
class ParentWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    const child = new ChildWorkflow('child', this);

    // WRONG: Response lost
    await child.run();
    return createSuccessResponse('done', { agentId: this.id, timestamp: Date.now() });

    // CORRECT: Capture and propagate
    const childResponse = await child.run();
    if (isError(childResponse)) {
      return createErrorResponse(
        'CHILD_FAILED',
        'Child workflow failed',
        { childError: childResponse.error },
        childResponse.error.recoverable
      );
    }
    return createSuccessResponse(
      childResponse.data,
      {
        agentId: this.id,
        timestamp: Date.now(),
        requestId: childResponse.metadata.requestId, // Preserve correlation
      }
    );
  }
}

// Pattern 2: Type Guards Before Data Access
// PROBLEM: Accessing response.data without type guard
const response: AgentResponse<string> = await agent.prompt('test');

// WRONG: May crash on error response
console.log(response.data.toUpperCase());

// CORRECT: Always use type guard
if (isSuccess(response)) {
  console.log(response.data.toUpperCase()); // Safe
} else if (isError(response)) {
  console.error(`Error: ${response.error.code} - ${response.error.message}`);
}

// Pattern 3: Capture Data Before Async Boundary
// PROBLEM: Type narrowing lost after await
if (isSuccess(response)) {
  await someAsyncOperation();
  console.log(response.data.toUpperCase()); // Type error possible
}

// CORRECT: Capture before await
if (isSuccess(response)) {
  const data = response.data; // Capture
  await someAsyncOperation();
  console.log(data.toUpperCase()); // Safe
}

// Pattern 4: Handle All Three Response States
// PROBLEM: Only checking success/error, ignoring partial
const response = await agent.prompt('Generate report');

if (isSuccess(response)) {
  console.log(response.data);
} else if (isError(response)) {
  console.error(response.error.message);
}
// Partial responses fall through and ignored

// CORRECT: Handle all three states
if (isSuccess(response)) {
  return finalize(response.data);
} else if (isPartial(response)) {
  this.accumulated.push(response.data.partialContent);
  return this.run(); // Continue for next chunk
} else if (isError(response)) {
  return response; // Propagate error
}

// Pattern 5: Clear Test Arrays Between Phases
it('should emit event after reparenting', () => {
  const events: WorkflowEvent[] = [];
  parent1.addObserver({ onEvent: (e) => events.push(e), ... });

  // Setup phase (generates events)
  const child = new Workflow('Child', parent1);
  parent1.detachChild(child);
  parent2.attachChild(child);

  // CLEAR setup events before test phase
  events.length = 0;

  // Test phase
  child.setStatus('running');
  expect(events.some(e => e.type === 'treeUpdated')).toBe(true);
});

// Pattern 6: Mock AgentResponse in Tests
// Use factory functions for valid mock responses
const mockResponse = createSuccessResponse(
  'result',
  { agentId: 'test-agent', timestamp: Date.now() }
);

vi.spyOn(agent, 'prompt').mockResolvedValue(mockResponse);
```

### Integration Points

```yaml
DEPENDS_ON:
  - P1.M4.T1.S1: Unit tests passing (provides foundation of working code)
  - P1.M1.T1: Agent.prompt() returns AgentResponse<T>
  - P1.M1.T2: All call sites handle AgentResponse
  - P1.M2.T1: Zod schema validation in prompt execution

VALIDATES:
  - AgentResponse handling in full workflow scenarios
  - Multi-step workflow execution with Agent.prompt() calls
  - Child workflow response propagation
  - Observer propagation in multi-level workflows
  - Type guard behavior in async workflow contexts
  - PRD 6.4.4 compliance (null over undefined)

OUTPUTS:
  - 100% passing integration test suite
  - Documented fixes (if any) in research/
  - Validation that AgentResponse migration works in real workflows

NEXT_STEPS:
  - P1.M4.T1.S3: Run adversarial tests
  - P1.M4.T2: Verify TypeScript compilation
  - P1.M4.T3: Verify example scripts run successfully
```

---

## Validation Loop

### Level 1: Test Execution (Immediate Feedback)

```bash
# Run all tests (unit + integration + adversarial)
npm test

# Expected output format:
# ✓ src/__tests__/unit/agent-response.test.ts (X)
# ✓ src/__tests__/unit/agent-response-factory.test.ts (X)
# ... all unit tests pass ...
# ✓ src/__tests__/integration/agent-workflow.test.ts (X)
# ✓ src/__tests__/integration/tree-mirroring.test.ts (X)
# ✓ src/__tests__/integration/workflow-reparenting.test.ts (X)
# ✓ src/__tests__/integration/bidirectional-consistency.test.ts (X)
# ✓ src/__tests__/integration/observer-logging.test.ts (X)
# ... all tests pass ...
# Test Files  XX passed (XX)
# Tests XX passed (XX)
# Duration XX ms

# If failures occur:
# 1. Note the failing test file and test name
# 2. Read the error message carefully
# 3. Categorize the failure type using catalog
# 4. Apply appropriate fix from research/integration-test-failures-catalog.md

# Run specific integration test file
npm test -- agent-workflow.test.ts

# Run with verbose output for debugging
npm test -- --reporter=verbose

# Run specific test by pattern
npm test -- --grep "should handle AgentResponse in workflow step"

# Expected: All tests pass with 0 failures
```

### Level 2: Failure Analysis (Component Validation)

```bash
# If tests fail, analyze the failure type:

# 1. Response Propagation Failures
# Symptom: Child workflow returns AgentResponse but parent receives undefined
# Reference: research/integration-test-failures-catalog.md Pattern 1.1
# Fix: Capture child workflow return value and propagate AgentResponse

# 2. Type Guard Failures
# Symptom: Runtime error - Cannot read properties of null
# Reference: research/integration-test-failures-catalog.md Pattern 2.1
# Fix: Use isSuccess/isError type guards before accessing data

# 3. Type Narrowing Lost After Await
# Symptom: TypeScript complains about null access after await
# Reference: research/integration-test-failures-catalog.md Pattern 2.2
# Fix: Capture narrowed value before async boundary

# 4. Zod Validation Failures
# Symptom: ZodError - Invalid discriminator value or undefined not allowed
# Reference: research/integration-test-failures-catalog.md Pattern 3.x
# Fix: Use factory functions, ensure lowercase status, use null not undefined

# 5. Workflow State Consistency
# Symptom: Tree mirror violations, observer not notified
# Reference: research/integration-test-failures-catalog.md Pattern 4.x
# Fix: Use attachChild/detachChild properly, clear test arrays

# Expected: Categorize all failures, apply fixes, re-run tests
```

### Level 3: Progressive Fix Validation (System Validation)

```bash
# Fix tests in batches of 2-3 to track progress

# Batch 1: Fix response propagation failures
# 1. Identify all Pattern 1.x failures
# 2. Apply fix: Capture child responses and propagate
# 3. Run: npm test
# 4. Verify: previously failing tests now pass

# Batch 2: Fix type guard failures
# 1. Identify all Pattern 2.x failures
# 2. Apply fix: Add type guards before data access
# 3. Run: npm test
# 4. Verify: no regressions from Batch 1

# Batch 3: Fix Zod validation failures
# 1. Identify all Pattern 3.x failures
# 2. Apply fix: Use factory functions, correct status case
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
# - All 5 integration test files show ✓ (passing)
# - No ✗ (failing) indicators
# - Summary shows: XX pass 0 fail
# - Duration is reasonable (< 120 seconds for integration tests)

# Verify specific integration tests:
npm test -- --grep "Agent-Workflow Integration"
npm test -- --grep "Tree Mirroring"
npm test -- --grep "Reparenting Observer Propagation"
npm test -- --grep "Bidirectional Consistency"
npm test -- --grep "Observer Error Logging"

# Check for any warnings
npm test 2>&1 | grep -i warning

# Expected:
# - Zero test failures
# - Zero test errors
# - Zero critical warnings
# - Clean test execution
# - All multi-step workflows handle AgentResponse correctly
# - All child workflow responses propagate correctly
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 5 integration test files in `src/__tests__/integration/` pass
- [ ] Test output shows "XX pass 0 fail" (zero failures) for integration tests
- [ ] No test files skipped or pending in integration suite
- [ ] Test execution time is reasonable (< 120 seconds for integration tests)
- [ ] No console errors during test execution
- [ ] No test timeouts or hanging tests

### AgentResponse Validation

- [ ] Multi-step workflows handle all 3 response states (success, error, partial)
- [ ] Type guards (isSuccess, isError, isPartial) work correctly in workflows
- [ ] Child workflow AgentResponse objects captured and propagated
- [ ] Metadata (agentId, timestamp, requestId) preserved through workflow chain
- [ ] PRD 6.4.4 compliance verified (null over undefined)
- [ ] Zod schema validation passes for all AgentResponse objects
- [ ] No circular references in AgentResponse data

### Code Quality Validation

- [ ] Test fixes follow existing integration test patterns
- [ ] Test assertions are specific and meaningful
- [ ] Test names are descriptive (should_do_expected_behavior)
- [ ] No commented-out test code
- [ ] No TODO comments in failing tests
- [ ] Test structure follows describe/it pattern
- [ ] Test arrays cleared between setup and test phases

### Documentation & Deployment

- [ ] Fixes documented in research/ if significant
- [ ] Common failure patterns noted for future reference
- [ ] Integration test suite provides confidence for deployment
- [ ] CI/CD pipeline will pass with these test results

---

## Anti-Patterns to Avoid

- ❌ Don't skip integration tests - fix the underlying issue
- ❌ Don't use `.only` to isolate tests - remove `.only` before committing
- ❌ Don't ignore failing integration tests - all must pass
- ❌ Don't change test intent to make it pass - fix the implementation
- ❌ Don't remove assertions without reason - keep test coverage
- ❌ Don't add `// @ts-ignore` to fix type errors - fix the types properly
- ❌ Don't mock the system under test - test the actual implementation
- ❌ Don't use `expect.anything()` excessively - be specific about expected values
- ❌ Don't forget to add type guard imports when using isSuccess/isError
- ❌ Don't access `response.data` without checking `response.status` first
- ❌ Don't use `undefined` in test expectations - use `null` for PRD 6.4.4 compliance
- ❌ Don't lose child workflow responses - always capture and propagate
- ❌ Don't lose metadata through workflow chain - preserve requestId and timing
- ❌ Don't forget to handle partial responses in multi-step workflows
- ❌ Don't let type narrowing cross async boundaries without capturing
- ❌ Don't forget to clear test arrays between setup and test phases

---

## References

### Research Files (plan/002_6761e4b84fd1/P1M4T1S2/research/)

- `integration-test-best-practices.md` - Comprehensive guide for integration testing complex workflows with Vitest
- `child-workflow-propagation-analysis.md` - Complete analysis of child workflow response propagation patterns
- `integration-test-failures-catalog.md` - Catalog of 10+ common integration test failure patterns with fixes

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
- `src/core/workflow.ts` - Workflow class with attachChild/detachChild
- `src/__tests__/integration/agent-workflow.test.ts` - AgentResponse in workflows
- `src/__tests__/integration/tree-mirroring.test.ts` - Tree mirror invariant
- `src/__tests__/integration/workflow-reparenting.test.ts` - Observer propagation
- `src/__tests__/integration/bidirectional-consistency.test.ts` - Tree consistency
- `src/__tests__/integration/observer-logging.test.ts` - Observer error handling
- `src/__tests__/helpers/tree-verification.ts` - Tree validation helpers

---

**End of PRP**
