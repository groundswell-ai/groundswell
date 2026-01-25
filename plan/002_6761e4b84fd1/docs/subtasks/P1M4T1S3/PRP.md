# PRP: Run Adversarial Tests and Fix Failures

**PRP ID**: P1.M4.T1.S3
**Work Item**: Run adversarial tests and fix failures
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Execute the complete adversarial test suite using `npm test -- src/__tests__/adversarial/` and fix any failing tests to achieve 100% pass rate, ensuring AgentResponse error codes are correct and PRD 6.4.4 compliance (null over undefined) is enforced throughout the codebase.

**Deliverable**: All adversarial tests passing (100% pass rate) with no failing tests in `src/__tests__/adversarial/`, specifically validating that AgentResponse objects correctly handle edge cases, error codes are properly validated, and PRD compliance violations are caught.

**Success Definition**:
- Running `npm test -- src/__tests__/adversarial/` executes without errors
- All adversarial tests in `src/__tests__/adversarial/` pass
- Test output shows `X pass X fail` with 0 failures for adversarial tests
- AgentResponse error codes are correct (INVALID_RESPONSE_FORMAT, VALIDATION_FAILED, etc.)
- PRD 6.4.4 compliance enforced (null over undefined)
- Zod schema validation catches malformed responses
- Discriminated union behavior is correct
- Type guards (isSuccess, isError, isPartial) work correctly
- Test execution completes within reasonable time (< 300 seconds for adversarial tests)

---

## User Persona (if applicable)

**Target User**: Development team executing the adversarial test suite to validate AgentResponse robustness against malformed inputs and edge cases

**Use Case**: After integration tests pass (P1.M4.T1.S2), developers run adversarial tests to validate error handling, schema validation, and PRD compliance under adversarial conditions

**User Journey**:
1. Developer runs `npm test -- src/__tests__/adversarial/` after completing integration test fixes
2. Adversarial test suite runs, testing edge cases and error conditions
3. Any failures are analyzed and fixed using this PRP
4. Tests pass, validating the complete AgentResponse migration robustness

**Pain Points Addressed**:
- Adversarial tests may fail due to PRD 6.4.4 violations (undefined instead of null)
- Error codes may be incorrect or missing in error responses
- Zod schema validation may not catch malformed responses
- Discriminated union behavior may be broken
- Type guards may not narrow types correctly
- Circular references or non-serializable data may cause issues

---

## Why

**Business Value and User Impact**:
- **Quality assurance**: Adversarial tests catch issues that unit/integration tests miss, validating robustness under malformed inputs
- **PRD compliance validation**: Ensures PRD 6.4.4 (null over undefined) requirement is enforced
- **Error handling validation**: Verifies error codes are correct and error responses are properly structured
- **Type safety validation**: Confirms discriminated unions and type guards work correctly
- **Serialization validation**: Ensures all responses are valid JSON
- **Confidence in deployment**: 100% pass rate enables safe deployment of AgentResponse migration

**Integration with Existing Features**:
- **Depends on**: P1.M4.T1.S2 (integration tests passing) - provides foundation of working code
- **Validates**:
  - P1.M1.T1 (Agent.prompt() returns AgentResponse<T>)
  - P1.M1.T2 (All call sites handle AgentResponse)
  - P1.M2.T1 (Zod schema validation)
  - P1.M2.T2.S3 (Adversarial tests written for edge cases)
  - PRD 6.4.4 compliance (null over undefined)
  - PRD 6.6 (Response validation requirements)

**Testing**: Edge cases, error conditions, schema validation, PRD compliance, type safety, serialization

**Problems This Solves**:
- Adversarial tests may fail due to undefined values instead of null (PRD 6.4.4 violation)
- Error codes may not be set correctly on error responses
- Zod schema validation may not catch malformed responses
- Discriminated union mismatches may not be detected
- Type guards may not narrow types correctly
- Circular references may not be handled
- Non-serializable data may cause JSON.stringify to fail

---

## What

**User-Visible Behavior**:
- Developers run `npm test -- src/__tests__/adversarial/` and see all tests pass
- Adversarial tests validate edge cases and error conditions with AgentResponse
- PRD 6.4.4 compliance is enforced (null over undefined)
- Error codes are correctly set on error responses
- Zod schema validation catches malformed responses
- Type guards work correctly for type narrowing
- CI/CD pipeline executes adversarial tests without failures

**Technical Requirements**:
- Execute `npm test -- src/__tests__/adversarial/` which runs Vitest with adversarial test filter
- Analyze adversarial test output for failures (15 adversarial test files)
- Fix failing tests by updating AgentResponse handling, Zod schemas, or factory functions
- Ensure all adversarial edge cases are properly handled
- Validate error codes are correct (INVALID_RESPONSE_FORMAT, VALIDATION_FAILED, etc.)
- Run tests until 100% pass rate achieved

### Success Criteria

- [ ] All adversarial tests pass when running `npm test -- src/__tests__/adversarial/`
- [ ] No test failures in `src/__tests__/adversarial/` directory
- [ ] Test output shows `XX pass 0 fail` (zero failures) for adversarial tests
- [ ] AgentResponse error codes are correct (INVALID_RESPONSE_FORMAT on malformed responses)
- [ ] PRD 6.4.4 compliance enforced (null over undefined)
- [ ] Zod schema validation catches malformed responses
- [ ] Discriminated union behavior is correct
- [ ] Type guards work correctly for type narrowing
- [ ] Tests complete in reasonable time (< 300 seconds for adversarial suite)
- [ ] No circular reference issues in AgentResponse data
- [ ] All responses are JSON serializable

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact test commands, adversarial test patterns, failure catalog with fixes, error code definitions, and references to all adversarial test files. An implementer unfamiliar with the codebase can run tests and fix failures using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Previous Work Item Output (CONTRACT)
- file: plan/002_6761e4b84fd1/P1M4T1S2/PRP.md
  why: Defines integration test outputs - assumes 100% integration test pass rate as starting point
  critical: Adversarial tests run after integration tests pass; integration test fixes inform adversarial test issues

# Adversarial Test Files (15 files to test and fix)
- file: src/__tests__/adversarial/agent-response-edge-cases.test.ts
  why: PRIMARY AgentResponse adversarial test file - 54 tests covering all edge cases
  pattern: Zod schema validation, PRD 6.4.4 compliance, discriminated union behavior, error code validation
  gotcha: Tests intentionally validate that MALFORMED responses FAIL validation
  critical: This is the main AgentResponse adversarial test file - highest priority

- file: src/__tests__/adversarial/prd-compliance.test.ts
  why: Validates PRD requirements compliance including decorator behavior and tree mirror
  pattern: PRD requirement validation, decorator option testing, tree mirror invariant
  gotcha: Tests verify @Step, @Task, @ObservedState behavior matches PRD specs

- file: src/__tests__/adversarial/circular-reference.test.ts
  why: Tests circular reference detection in workflow trees
  pattern: Immediate circular reference (parent ↔ child), ancestor circular reference
  gotcha: Tests expect circular references to be DETECTED and BLOCKED

- file: src/__tests__/adversarial/complex-circular-reference.test.ts
  why: Tests deep circular reference scenarios
  pattern: Multi-level circular references, complex tree structures
  gotcha: More complex than circular-reference.test.ts

- file: src/__tests__/adversarial/parent-validation.test.ts
  why: Tests parent-child attachment validation
  pattern: attachChild validation, parent integrity checks
  gotcha: Tests verify parent-child relationships are maintained

- file: src/__tests__/adversarial/observer-propagation.test.ts
  why: Tests observer event propagation through workflow tree
  pattern: Event bubbling, observer notification, multi-level propagation
  gotcha: Events must propagate to correct observers

- file: src/__tests__/adversarial/attachChild-performance.test.ts
  why: Performance benchmarks for attachChild operation
  pattern: Performance measurement, timing validation
  gotcha: Tests may fail if performance degrades

- file: src/__tests__/adversarial/concurrent-task-failures.test.ts
  why: Tests concurrent task error handling
  pattern: Concurrent task execution, error propagation in concurrent scenarios
  gotcha: Race conditions in error handling

- file: src/__tests__/adversarial/error-merge-strategy.test.ts
  why: Tests multi-error merging strategy
  pattern: Error merging, multiple error combination
  gotcha: Default is disabled (first error wins)

- file: src/__tests__/adversarial/incremental-performance.test.ts
  why: Tests incremental build performance
  pattern: Performance measurement for incremental changes
  gotcha: Tests may fail if incremental performance degrades

- file: src/__tests__/adversarial/edge-case.test.ts
  why: Tests general edge cases (empty values, unicode, stress tests)
  pattern: Empty string handling, unicode validation, deep/wide hierarchy stress
  gotcha: May include AgentResponse edge cases

- file: src/__tests__/adversarial/deep-analysis.test.ts
  why: Tests deep tree analysis functionality
  pattern: Deep tree traversal, analysis algorithms
  gotcha: Tests deep nesting behavior

- file: src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  why: Tests deep nesting stress (1000+ levels)
  pattern: Deep hierarchy stress testing, stack overflow prevention
  gotcha: May fail with stack overflow or performance issues

- file: src/__tests__/adversarial/node-map-update-benchmarks.test.ts
  why: Node map update performance benchmarks
  pattern: Node map update performance measurement
  gotcha: Tests may fail if node map performance degrades

- file: src/__tests__/adversarial/prd-12-2-compliance.test.ts
  why: Tests PRD 12.2 bidirectional tree consistency
  pattern: Tree mirror validation, bidirectional link verification
  gotcha: Validates workflow tree ↔ node tree 1:1 invariant

- file: src/__tests__/adversarial/observer-propagation.test.ts
  why: Tests observer propagation after tree changes
  pattern: Observer routing, event propagation after reparenting
  gotcha: Observers must receive events after tree changes

# Core Type Definitions
- file: src/types/agent.ts
  why: AgentResponse<T> type definitions, error codes, Zod schemas, factory functions
  pattern: Discriminated union with status field, null over undefined (PRD 6.4.4)
  critical: AGENT_ERROR_CODES constant, AgentResponseSchema, createSuccessResponse/createErrorResponse/createPartialResponse
  section: Lines 161-833 (complete AgentResponse definition), error codes at lines 200-210

- file: src/core/agent.ts
  why: Agent.prompt() implementation returning AgentResponse<T>
  pattern: executePrompt method, Zod validation, error code generation
  section: Lines 118-147 (prompt method signature), lines 425-478 (INVALID_RESPONSE_FORMAT handling)

# Test Configuration
- file: package.json
  why: Contains test command definition
  section: scripts.test = "vitest run"
  critical: Use 'npm test -- src/__tests__/adversarial/' to run adversarial tests only

- file: vitest.config.ts
  why: Vitest configuration for test execution
  pattern: include: ['src/__tests__/**/*.test.ts'], globals: true
  critical: Tests use global describe/it/expect without imports

# Research Files (created for this PRP)
- docfile: plan/002_6761e4b84fd1/P1M4T1S3/research/adversarial-test-failure-catalog.md
  why: Complete catalog of 10+ common adversarial test failure patterns with fixes
  section: All sections - failure patterns, detection, fix, prevention
  critical: PRD 6.4.4 violations, status case sensitivity, discriminated union mismatches, error code validation

- docfile: plan/002_6761e4b84fd1/P1M4T1S3/research/adversarial-test-guide.md
  why: Comprehensive guide for running, debugging, and fixing adversarial tests
  section: All sections - test organization, running tests, debugging, validation strategies
  critical: Test commands, failure interpretation, common fix patterns, validation strategies
```

### Current Codebase Tree (adversarial test structure)

```bash
/home/dustin/projects/groundswell
├── package.json                 # Contains "test": "vitest run"
├── vitest.config.ts            # Vitest configuration
├── src/
│   ├── __tests__/
│   │   ├── adversarial/        # Adversarial test directory (15 test files)
│   │   │   ├── agent-response-edge-cases.test.ts    # PRIMARY - 54 AgentResponse tests
│   │   │   ├── prd-compliance.test.ts               # PRD requirement validation
│   │   │   ├── prd-12-2-compliance.test.ts          # PRD 12.2 compliance
│   │   │   ├── circular-reference.test.ts           # Circular reference detection
│   │   │   ├── complex-circular-reference.test.ts    # Deep circular references
│   │   │   ├── parent-validation.test.ts            # Parent attachment validation
│   │   │   ├── observer-propagation.test.ts         # Observer event tests
│   │   │   ├── attachChild-performance.test.ts      # Performance benchmarks
│   │   │   ├── concurrent-task-failures.test.ts     # Concurrent error handling
│   │   │   ├── error-merge-strategy.test.ts         # Multi-error merging
│   │   │   ├── incremental-performance.test.ts      # Build performance
│   │   │   ├── edge-case.test.ts                    # General edge cases
│   │   │   ├── deep-analysis.test.ts                # Deep tree analysis
│   │   │   ├── deep-hierarchy-stress.test.ts        # Deep nesting stress
│   │   │   └── node-map-update-benchmarks.test.ts   # Node map benchmarks
│   │   ├── unit/              # Unit tests (assumed passing from P1.M4.T1.S1)
│   │   └── integration/       # Integration tests (assumed passing from P1.M4.T1.S2)
│   ├── core/
│   │   ├── agent.ts            # Agent.prompt() returns AgentResponse<T>
│   │   └── workflow.ts         # Workflow class with attachChild/detachChild
│   └── types/
│       └── agent.ts            # AgentResponse type definitions, error codes, Zod schemas
└── plan/
    └── 002_6761e4b84fd1/
        └── P1M4T1S3/
            ├── PRP.md           # This file
            └── research/        # Research files (2 files)
                ├── adversarial-test-failure-catalog.md
                └── adversarial-test-guide.md
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Test Command
// - Use 'npm test -- src/__tests__/adversarial/' NOT 'npm test'
// - Add double dash '--' before path to pass arguments to vitest
// - vitest run executes tests once (not watch mode)
// - Runs ONLY adversarial tests when path is specified

// CRITICAL: Adversarial Test Intent
// - Adversarial tests INTENTIONALLY validate that MALFORMED responses FAIL
// - If test name says "should fail validation", it expects validation to FAIL
// - If test name says "should pass validation", it expects validation to PASS
// - Read test names carefully to understand expected behavior

// CRITICAL: PRD 6.4.4 Compliance (Most Common Issue)
// - PRD 6.4.4: "Use null for absent values; undefined is not valid JSON"
// - Zod schemas must use .nullable() NOT .optional() for data/error fields
// - .nullable() accepts T | null (rejects undefined)
// - .optional() accepts T | undefined | undefined (WRONG for PRD 6.4.4)
// - Factory functions automatically convert undefined to null

// CRITICAL: Status Case Sensitivity
// - Status field is CASE-SENSITIVE (discriminated union)
// - Valid values: 'success', 'error', 'partial' (all lowercase)
// - INVALID: 'SUCCESS', 'Error', 'PARTIAL', 'succes', ''
// - Use factory functions or exact string literals with 'as const'

// CRITICAL: Discriminated Union Consistency
// - Success: status='success', data=<T>, error=null
// - Error: status='error', data=null, error=<AgentErrorDetails>
// - Partial: status='partial', data=<T>, error=null
// - Mismatches between status and data/error values FAIL validation

// CRITICAL: Error Code Definitions
// - AGENT_ERROR_CODES constant defines 6 standard error codes:
//   * INVALID_RESPONSE_FORMAT (malformed API responses)
//   * VALIDATION_FAILED (Zod validation failures)
//   * EXECUTION_FAILED (workflow execution errors)
//   * API_REQUEST_FAILED (API call failures)
//   * TOOL_EXECUTION_FAILED (tool execution errors)
//   * INTERNAL_ERROR (internal bugs)
// - All error codes are SCREAMING_SNAKE_CASE strings
// - Custom error codes allowed but should follow same convention

// CRITICAL: Zod Schema Validation
// - AgentResponseSchema uses discriminatedUnion on 'status' field
// - Validation error codes: invalid_union_discriminator, invalid_type, invalid_literal
// - Use result.success to check validation, result.error.errors for details
// - safeParse() returns { success: boolean, data?: T, error?: ZodError }

// CRITICAL: Type Guards
// - isSuccess(response): narrows to response.data is not null
// - isError(response): narrows to response.error is not null
// - isPartial(response): narrows to response.data is not null
// - Type narrowing lost across async boundaries - capture data before await

// CRITICAL: Non-Serializable Data Handling
// - JSON.stringify() throws on: circular references, BigInt, functions
// - Symbols are accepted by Zod but lost in serialization
// - Prototype pollution attempts are treated as regular string keys (safe)
// - Test with JSON.stringify() before wrapping in AgentResponse

// CRITICAL: Adversarial Test Categories
// - Category 1: AgentResponse edge cases (agent-response-edge-cases.test.ts) - PRIMARY
// - Category 2: PRD compliance (prd-compliance.test.ts, prd-12-2-compliance.test.ts)
// - Category 3: Tree integrity (circular-reference.test.ts, parent-validation.test.ts)
// - Category 4: Performance (attachChild-performance.test.ts, deep-hierarchy-stress.test.ts)

// CRITICAL: Common Failure Patterns
// - Pattern 1: Undefined instead of null (PRD 6.4.4 violation) - MOST COMMON
// - Pattern 2: Wrong status case (uppercase instead of lowercase)
// - Pattern 3: Discriminated union mismatch (success with error populated)
// - Pattern 4: Non-string error codes (number, boolean)
// - Pattern 5: Wrong metadata types (agentId as number, timestamp as string)

// CRITICAL: Test Execution Time
// - Adversarial tests should complete in < 300 seconds
// - Performance tests may take longer but should have reasonable timeouts
// - If tests hang, there may be an infinite loop or circular reference

// CRITICAL: Factory Function Usage
// - ALWAYS use factory functions: createSuccessResponse(), createErrorResponse(), createPartialResponse()
// - Factory functions handle: null conversion, metadata generation, status validation
// - NEVER manually construct AgentResponse objects unless testing validation

// CRITICAL: Console Spying in Tests
// - Most adversarial tests spy on console methods to suppress output
// - beforeEach: vi.spyOn(console, 'log').mockImplementation(() => {})
// - afterEach: vi.restoreAllMocks()
// - This is normal for adversarial tests
```

---

## Implementation Blueprint

### Data Models and Structure

This task validates existing code through adversarial testing. No new data models.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: RUN adversarial tests to identify failures
  - EXECUTE: npm test -- src/__tests__/adversarial/
  - FILTER: Focus on adversarial test output (src/__tests__/adversarial/)
  - CAPTURE: Full test output including failures
  - COUNT: Total pass/fail/skip counts for adversarial tests
  - IDENTIFY: Which specific adversarial test files are failing
  - PRIORITIZE: agent-response-edge-cases.test.ts is highest priority
  - LOCATION: Run from /home/dustin/projects/groundswell
  - EXPECTED: Integration tests pass (from P1.M4.T1.S2), adversarial tests may fail

Task 2: ANALYZE adversarial test failures
  - REVIEW: Each failing adversarial test's error message
  - CATEGORIZE: Failure type using catalog from research/adversarial-test-failure-catalog.md
  - IDENTIFY: Root cause (PRD 6.4.4 violation, wrong status case, discriminated union mismatch, etc.)
  - DOCUMENT: List of failures with proposed fixes
  - PRIORITIZE: Fix AgentResponse-related failures first (agent-response-edge-cases.test.ts)
  - REFERENCE: Use failure categories from catalog:
    * Pattern 1: PRD 6.4.4 violations (undefined instead of null)
    * Pattern 2: Status case sensitivity failures
    * Pattern 3: Discriminated union mismatches
    * Pattern 4: Invalid error code types
    * Pattern 5: Metadata validation failures
    * Pattern 6: Circular reference issues
    * Pattern 7: Non-serializable data issues

Task 3: FIX PRD 6.4.4 violations (undefined instead of null)
  - PATTERN: Schema accepts undefined when it should require null
  - FIX: Update Zod schemas to use .nullable() instead of .optional()
  - REFERENCE: research/adversarial-test-failure-catalog.md Pattern 1
  - EXAMPLE:
      Before: data: z.any().optional()  // Allows undefined - WRONG
      After: data: dataSchema.nullable()  // Requires T or null - CORRECT
  - FILES: src/types/agent.ts (AgentResponseSchema, AgentErrorDetailsSchema)
  - VALIDATION: Tests should now FAIL when undefined is used, PASS when null is used

Task 4: FIX status case sensitivity issues
  - PATTERN: Uppercase or mixed case status values failing validation
  - FIX: Ensure all status values are lowercase ('success', 'error', 'partial')
  - REFERENCE: research/adversarial-test-failure-catalog.md Pattern 2
  - EXAMPLE:
      Before: status: 'SUCCESS'  // Wrong case - fails
      After: status: 'success'  // Correct lowercase - passes
  - FILES: src/types/agent.ts (factory functions), src/core/agent.ts (prompt method)
  - VALIDATION: Use exact string literals or factory functions

Task 5: FIX discriminated union mismatches
  - PATTERN: Status doesn't match data/error field values
  - FIX: Ensure success/partial have error=null, error has data=null
  - REFERENCE: research/adversarial-test-failure-catalog.md Pattern 3
  - EXAMPLE:
      // Wrong: success with error populated
      { status: 'success', data: 'test', error: { code: 'TEST', ... } }
      // Correct: success with null error
      { status: 'success', data: 'test', error: null }
  - FILES: src/types/agent.ts (AgentResponseSchema), factory functions
  - VALIDATION: Use factory functions which enforce consistency

Task 6: FIX error code type validation
  - PATTERN: Error codes that are not strings (number, boolean, null)
  - FIX: Ensure all error codes are strings
  - REFERENCE: research/adversarial-test-failure-catalog.md Pattern 4
  - EXAMPLE:
      Before: error: { code: 123, message: 'test', ... }  // Number - fails
      After: error: { code: 'ERROR_CODE', message: 'test', ... }  // String - passes
  - FILES: src/core/agent.ts (error code generation), factory functions
  - VALIDATION: Use AGENT_ERROR_CODES constants

Task 7: FIX metadata validation failures
  - PATTERN: Wrong metadata types (agentId as number, timestamp as string)
  - FIX: Ensure agentId is string, timestamp is number (Date.now())
  - REFERENCE: research/adversarial-test-failure-catalog.md Pattern 5
  - EXAMPLE:
      Before: metadata: { agentId: 123, timestamp: '123456' }  // Wrong types
      After: metadata: { agentId: 'agent-123', timestamp: Date.now() }  // Correct types
  - FILES: src/core/agent.ts (metadata generation), factory functions
  - VALIDATION: Use Date.now() for timestamps, ID generator for agent IDs

Task 8: FIX circular reference handling
  - PATTERN: Circular references in AgentResponse data cause JSON.stringify to fail
  - FIX: Detect and handle circular references before wrapping in AgentResponse
  - REFERENCE: research/adversarial-test-failure-catalog.md Pattern 6
  - EXAMPLE:
      // Detect circular references
      if (hasCircularReference(data)) {
        return createErrorResponse(
          'INVALID_RESPONSE_FORMAT',
          'Response contains circular references',
          null,
          false
        );
      }
  - FILES: src/core/agent.ts (prompt method), add circular reference detection
  - VALIDATION: JSON.stringify(response) should not throw

Task 9: FIX non-serializable data handling
  - PATTERN: Functions, symbols, BigInt in data cause serialization issues
  - FIX: Validate data is JSON-serializable before wrapping
  - REFERENCE: research/adversarial-test-failure-catalog.md Pattern 7
  - EXAMPLE:
      // Test serialization
      try {
        JSON.stringify(data);
      } catch (err) {
        return createErrorResponse(
          'INVALID_RESPONSE_FORMAT',
          'Response contains non-serializable data',
          { type: typeof data },
          false
        );
      }
  - FILES: src/core/agent.ts (prompt method)
  - VALIDATION: All responses should be JSON-serializable

Task 10: RE-RUN adversarial tests after each fix batch
  - EXECUTE: npm test -- src/__tests__/adversarial/ after fixing 2-3 patterns
  - VERIFY: Previously failing tests now pass
  - CHECK: No new test failures introduced
  - ITERATE: Return to Task 2 if new failures appear
  - PRIORITIZE: Fix agent-response-edge-cases.test.ts failures first

Task 11: VERIFY 100% adversarial test pass rate
  - EXECUTE: npm test -- src/__tests__/adversarial/ one final time
  - CONFIRM: Output shows "XX pass 0 fail" for adversarial tests
  - CONFIRM: All 15 adversarial test files pass
  - CONFIRM: No skipped or pending tests
  - CONFIRM: Test execution time < 300 seconds

Task 12: DOCUMENT test results
  - RECORD: Final test pass/fail counts
  - RECORD: Adversarial tests that needed fixes
  - RECORD: Common failure patterns observed
  - STORE: Notes in research/ directory for future reference
```

### Implementation Patterns & Key Details

```typescript
// Show critical patterns and gotchas - keep concise

// Pattern 1: PRD 6.4.4 Compliance (Most Common Fix)
// PROBLEM: Schema accepts undefined when it should require null
// Before: Uses .optional() which allows undefined
const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),  // WRONG
  recoverable: z.boolean(),
});

// After: Use .nullable() which requires null
const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),  // CORRECT
  recoverable: z.boolean(),
});

// Pattern 2: Status Case Sensitivity
// PROBLEM: Uppercase or mixed case status values fail validation
// Before: Uppercase status
const response = { status: 'SUCCESS', data: 'test', error: null };
// Zod validation: FAILS - invalid_union_discriminator

// After: Lowercase status
const response = { status: 'success', data: 'test', error: null };
// Zod validation: PASSES

// Pattern 3: Discriminated Union Consistency
// PROBLEM: Status doesn't match data/error fields
// Before: Success with error populated
const response = {
  status: 'success',
  data: 'test',
  error: { code: 'TEST', message: 'test', details: null, recoverable: false }
};
// Zod validation: FAILS - success requires error: null

// After: Use factory functions
const response = createSuccessResponse('test', metadata);
// Zod validation: PASSES - factory enforces consistency

// Pattern 4: Error Code Type Validation
// PROBLEM: Error code is not a string
// Before: Number error code
const error = { code: 123, message: 'test', details: null, recoverable: false };
// Zod validation: FAILS - invalid_type, expected string

// After: String error code
const error = { code: 'VALIDATION_FAILED', message: 'test', details: null, recoverable: false };
// Zod validation: PASSES

// Pattern 5: Metadata Type Validation
// PROBLEM: Wrong metadata types
// Before: Wrong types
const metadata = {
  agentId: 123,        // Number - should be string
  timestamp: '123456'  // String - should be number
};

// After: Correct types
const metadata = {
  agentId: 'agent-123',     // String
  timestamp: Date.now()     // Number
};

// Pattern 6: Circular Reference Detection
// PROBLEM: Circular references cause JSON.stringify to throw
// Solution: Detect and return error response
function hasCircularReference(obj: unknown): boolean {
  const seen = new WeakSet();
  const detect = (obj: unknown): boolean => {
    if (obj === null || typeof obj !== 'object') return false;
    if (seen.has(obj)) return true;
    seen.add(obj);
    return Object.values(obj).some(detect);
  };
  return detect(obj);
}

// In prompt method
if (hasCircularReference(data)) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'Response contains circular references',
    null,
    false
  );
}

// Pattern 7: Non-Serializable Data Detection
// PROBLEM: Functions, symbols, BigInt not JSON-serializable
// Solution: Test serialization before wrapping
try {
  JSON.stringify(data);
} catch (err) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'Response contains non-serializable data',
    { type: typeof data, error: err instanceof Error ? err.message : String(err) },
    false
  );
}

// Pattern 8: Factory Function Usage (Best Practice)
// ALWAYS use factory functions for creating AgentResponse objects
// Factory functions handle:
// - Null conversion (undefined -> null)
// - Metadata generation
// - Status validation
// - Discriminated union consistency

// Instead of manual construction (error-prone):
const response = {
  status: 'success',
  data: 'test',
  error: undefined,  // Wrong - should be null
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// Use factory functions (correct):
const response = createSuccessResponse(
  'test',
  { agentId: 'test', timestamp: Date.now() }
);
```

### Integration Points

```yaml
DEPENDS_ON:
  - P1.M4.T1.S1: Unit tests passing
  - P1.M4.T1.S2: Integration tests passing
  - P1.M1.T1: Agent.prompt() returns AgentResponse<T>
  - P1.M1.T2: All call sites handle AgentResponse
  - P1.M2.T1: Zod schema validation in prompt execution
  - P1.M2.T2.S3: Adversarial tests written for edge cases

VALIDATES:
  - AgentResponse handling under adversarial conditions
  - PRD 6.4.4 compliance (null over undefined)
  - Error code correctness (INVALID_RESPONSE_FORMAT, VALIDATION_FAILED, etc.)
  - Zod schema validation robustness
  - Discriminated union behavior
  - Type guard behavior in edge cases
  - JSON serializability of all responses
  - Circular reference handling

OUTPUTS:
  - 100% passing adversarial test suite
  - Documented fixes (if any) in research/
  - Validation that AgentResponse migration handles edge cases correctly

NEXT_STEPS:
  - P1.M4.T2: Verify TypeScript compilation
  - P1.M4.T3: Verify example scripts run successfully
```

---

## Validation Loop

### Level 1: Test Execution (Immediate Feedback)

```bash
# Run adversarial tests only
npm test -- src/__tests__/adversarial/

# Expected output format:
# ✓ src/__tests__/adversarial/agent-response-edge-cases.test.ts (54)
# ✓ src/__tests__/adversarial/prd-compliance.test.ts (X)
# ✓ src/__tests__/adversarial/circular-reference.test.ts (X)
# ... all adversarial tests pass ...
# Test Files  XX passed (XX)
# Tests XX passed (XX)
# Duration XX ms

# If failures occur:
# 1. Note the failing test file and test name
# 2. Read the error message carefully
# 3. Categorize the failure type using catalog
# 4. Apply appropriate fix from research/adversarial-test-failure-catalog.md

# Run specific adversarial test file
npm test -- src/__tests__/adversarial/agent-response-edge-cases.test.ts

# Run with verbose output for debugging
npm test -- --reporter=verbose src/__tests__/adversarial/

# Run specific test by pattern
npm test -- --grep "should fail validation when data field is undefined"

# Expected: All tests pass with 0 failures
```

### Level 2: Failure Analysis (Component Validation)

```bash
# If tests fail, analyze the failure type:

# 1. PRD 6.4.4 Violations (Most Common)
# Symptom: expect(result.success).toBe(false) fails (validation passed when should fail)
# Reference: research/adversarial-test-failure-catalog.md Pattern 1
# Fix: Update Zod schema to use .nullable() instead of .optional()

# 2. Status Case Sensitivity
# Symptom: ZodError - invalid_union_discriminator
# Reference: research/adversarial-test-failure-catalog.md Pattern 2
# Fix: Use lowercase status values ('success', 'error', 'partial')

# 3. Discriminated Union Mismatches
# Symptom: ZodError - discriminator mismatch
# Reference: research/adversarial-test-failure-catalog.md Pattern 3
# Fix: Ensure status matches data/error field values

# 4. Invalid Error Code Types
# Symptom: ZodError - invalid_type, expected string
# Reference: research/adversarial-test-failure-catalog.md Pattern 4
# Fix: Use string error codes (AGENT_ERROR_CODES constants)

# 5. Metadata Validation Failures
# Symptom: ZodError - invalid_type for metadata field
# Reference: research/adversarial-test-failure-catalog.md Pattern 5
# Fix: Ensure agentId is string, timestamp is number

# 6. Circular Reference Issues
# Symptom: JSON.stringify throws TypeError
# Reference: research/adversarial-test-failure-catalog.md Pattern 6
# Fix: Detect circular references and return error response

# 7. Non-Serializable Data
# Symptom: JSON.stringify throws TypeError (BigInt, function, symbol)
# Reference: research/adversarial-test-failure-catalog.md Pattern 7
# Fix: Validate data is JSON-serializable before wrapping

# Expected: Categorize all failures, apply fixes, re-run tests
```

### Level 3: Progressive Fix Validation (System Validation)

```bash
# Fix tests in batches of 2-3 patterns to track progress

# Batch 1: Fix PRD 6.4.4 violations
# 1. Identify all Pattern 1 failures
# 2. Apply fix: Update schemas to use .nullable() instead of .optional()
# 3. Run: npm test -- src/__tests__/adversarial/
# 4. Verify: previously failing tests now pass

# Batch 2: Fix status case sensitivity issues
# 1. Identify all Pattern 2 failures
# 2. Apply fix: Use lowercase status values
# 3. Run: npm test -- src/__tests__/adversarial/
# 4. Verify: no regressions from Batch 1

# Batch 3: Fix discriminated union mismatches
# 1. Identify all Pattern 3 failures
# 2. Apply fix: Ensure status matches data/error fields
# 3. Run: npm test -- src/__tests__/adversarial/
# 4. Verify: all batches still passing

# Continue until 100% pass rate achieved

# Expected: Iterative fixing with validation after each batch
```

### Level 4: Final Validation (Complete System)

```bash
# Final test run with all fixes applied
npm test -- src/__tests__/adversarial/

# Verify output:
# - All 15 adversarial test files show ✓ (passing)
# - No ✗ (failing) indicators
# - Summary shows: XX pass 0 fail
# - Duration is reasonable (< 300 seconds for adversarial tests)

# Verify specific adversarial tests:
npm test -- --grep "AgentResponse"
npm test -- --grep "PRD 6.4"
npm test -- --grep "Undefined Fields"
npm test -- --grep "Status"

# Check for any warnings
npm test -- src/__tests__/adversarial/ 2>&1 | grep -i warning

# Verify all AgentResponse edge cases pass
npm test -- src/__tests__/adversarial/agent-response-edge-cases.test.ts

# Expected:
# - Zero test failures
# - Zero test errors
# - Zero critical warnings
# - Clean test execution
# - All PRD 6.4.4 violations caught
# - All error codes are correct
# - All discriminated unions work correctly
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 15 adversarial test files in `src/__tests__/adversarial/` pass
- [ ] Test output shows "XX pass 0 fail" (zero failures) for adversarial tests
- [ ] No test files skipped or pending in adversarial suite
- [ ] Test execution time is reasonable (< 300 seconds for adversarial tests)
- [ ] No console errors during test execution
- [ ] No test timeouts or hanging tests

### AgentResponse Validation

- [ ] PRD 6.4.4 compliance enforced (null over undefined)
- [ ] Error codes are correct (INVALID_RESPONSE_FORMAT, VALIDATION_FAILED, etc.)
- [ ] Zod schema validation catches malformed responses
- [ ] Discriminated union behavior is correct
- [ ] Type guards (isSuccess, isError, isPartial) work correctly
- [ ] Status case sensitivity enforced (lowercase only)
- [ ] Metadata validation works correctly
- [ ] Circular references are handled or detected
- [ ] All responses are JSON serializable

### Code Quality Validation

- [ ] Test fixes follow existing adversarial test patterns
- [ ] Test assertions are specific and meaningful
- [ ] Test names are descriptive (should_do_expected_behavior)
- [ ] No commented-out test code
- [ ] No TODO comments in failing tests
- [ ] Factory functions used instead of manual construction
- [ ] Zod schemas use .nullable() instead of .optional()

### Documentation & Deployment

- [ ] Fixes documented in research/ if significant
- [ ] Common failure patterns noted for future reference
- [ ] Adversarial test suite provides confidence for deployment
- [ ] CI/CD pipeline will pass with these test results

---

## Anti-Patterns to Avoid

- ❌ Don't skip adversarial tests - fix the underlying issue
- ❌ Don't use `.only` to isolate tests - remove `.only` before committing
- ❌ Don't ignore failing adversarial tests - all must pass
- ❌ Don't change test intent to make it pass - fix the implementation
- ❌ Don't remove assertions without reason - keep test coverage
- ❌ Don't add `// @ts-ignore` to fix type errors - fix the types properly
- ❌ Don't mock the system under test - test the actual implementation
- ❌ Don't use `expect.anything()` excessively - be specific about expected values
- ❌ Don't forget to use factory functions for AgentResponse creation
- ❌ Don't use `undefined` in test expectations - use `null` for PRD 6.4.4 compliance
- ❌ Don't use uppercase status values - use lowercase ('success', 'error', 'partial')
- ❌ Don't use .optional() in Zod schemas when .nullable() is required
- ❌ Don't manually construct AgentResponse objects - use factory functions
- ❌ Don't forget to validate JSON serializability before wrapping responses
- ❌ Don't ignore circular reference detection - handle or prevent circular refs
- ❌ Don't forget that adversarial tests INTENTIONALLY validate that malformed inputs FAIL
- ❌ Don't misinterpret test names - "should fail validation" expects validation to FAIL

---

## References

### Research Files (plan/002_6761e4b84fd1/P1M4T1S3/research/)

- `adversarial-test-failure-catalog.md` - Catalog of 10+ common adversarial test failure patterns with fixes
- `adversarial-test-guide.md` - Comprehensive guide for running, debugging, and fixing adversarial tests

### External References

- Vitest Documentation: https://vitest.dev
- Vitest CLI Reference: https://vitest.dev/guide/cli.html
- Vitest Expect API: https://vitest.dev/api/expect.html
- Zod Documentation: https://zod.dev

### Source Files Referenced

- `package.json` - Test command definition
- `vitest.config.ts` - Vitest configuration
- `src/types/agent.ts` - AgentResponse type definitions, error codes, Zod schemas, factory functions
- `src/core/agent.ts` - Agent.prompt() implementation
- `src/__tests__/adversarial/agent-response-edge-cases.test.ts` - Primary AgentResponse adversarial tests
- `src/__tests__/adversarial/prd-compliance.test.ts` - PRD compliance validation
- All other adversarial test files (15 total)

### PRD References

- PRD Section 6: Agent Response Model
- PRD Section 6.4: Response Requirements (null over undefined)
- PRD Section 6.6: Validation requirements

---

**End of PRP**
