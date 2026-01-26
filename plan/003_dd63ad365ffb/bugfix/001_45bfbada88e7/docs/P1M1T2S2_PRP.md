# Product Requirement Prompt: Implement analyzeErrorForRestart Utility Function

**Work Item**: P1.M1.T2.S2
**Title**: Implement analyzeErrorForRestart utility function
**Status**: Ready for Implementation
**Confidence Score**: 9/10

---

## Goal

**Feature Goal**: Create a pure, side-effect-free utility function that analyzes `WorkflowError` instances to determine if a step should be restarted, providing structured restart analysis with reason, suggested action, and success probability estimation.

**Deliverable**: New file `src/utils/restart-analysis.ts` containing:
1. `analyzeErrorForRestart()` function with comprehensive error analysis logic
2. Transient error code constants (TIMEOUT, RATE_LIMIT, NETWORK_ERROR, SERVICE_UNAVAILABLE)
3. Complete JSDoc documentation with usage examples
4. Full test coverage in `src/__tests__/unit/utils/restart-analysis.test.ts`

**Success Definition**:
- Function correctly analyzes errors and returns `RestartAnalysis` objects
- All error code matching patterns work (string, regex, recoverable, function)
- Transient error detection properly identifies retryable errors
- Function is pure (no side effects, deterministic output for same input)
- All tests pass including edge cases
- Function exported from `src/utils/index.ts`

---

## User Persona

**Target User**: Framework developers using the @Step decorator for error-aware workflow automation

**Use Case**: When a step fails during workflow execution, the framework needs to analyze the error to determine whether restarting the step is likely to succeed, and provide actionable guidance for the retry decision.

**User Journey**:
1. Step decorator catches an error during workflow execution
2. Error is wrapped in `WorkflowError` with context
3. `analyzeErrorForRestart()` is called with the error and optional step options
4. Function returns `RestartAnalysis` with restart decision, reasoning, and success probability
5. Step decorator uses analysis to emit `stepRetry` event and decide whether to retry

**Pain Points Addressed**:
- No centralized error analysis - each step must implement custom logic
- Inconsistent error handling across workflows
- Missing success probability estimation for retry decisions
- No clear separation between transient and permanent errors

---

## Why

**Business Value and User Impact**:
- Enables intelligent, automatic retry logic for transient failures
- Reduces manual intervention in workflow execution
- Improves workflow reliability and success rates
- Provides observability through structured error analysis

**Integration with Existing Features**:
- Used by @Step decorator's retry loop (already implemented in `src/decorators/step.ts:40-65`)
- Emits `stepRetry` events with `RestartAnalysis` payload
- Works with `ErrorCriterion` matching from `StepOptions.retryOn`
- Supports PRD Section 11 (Restart Semantics) requirements

**Problems This Solves**:
- **Problem**: No utility function exists for error restart analysis
- **Problem**: Transient error detection logic is scattered across codebase
- **Problem**: No success probability estimation for retry decisions
- **Problem**: Error analysis logic is duplicated in step decorator

---

## What

### User-Visible Behavior

The `analyzeErrorForRestart()` function provides intelligent error analysis:

**Input**: `WorkflowError` instance, optional `StepOptions` with `retryOn` criteria

**Output**: `RestartAnalysis` object with:
- `shouldRestart`: boolean indicating if step should be retried
- `reason`: human-readable explanation of the decision
- `suggestedAction`: 'retry' | 'abort' | 'rebuild'
- `estimatedSuccessProbability`: number (0-1) indicating likelihood of success

**Key Behaviors**:
1. Checks `error.recoverable` - if false, returns abort immediately
2. Checks error code against transient error list (TIMEOUT, RATE_LIMIT, NETWORK_ERROR, SERVICE_UNAVAILABLE)
3. If `stepOptions.retryOn` provided, iterates through criteria:
   - Code matching (string or regex)
   - Recoverable flag matching
   - Custom function evaluation
4. Defaults to `shouldRestart=false` if no criteria match

### Success Criteria

- [ ] Function exists at `src/utils/restart-analysis.ts`
- [ ] Returns `RestartAnalysis` object for all inputs
- [ ] Correctly identifies transient errors (returns shouldRestart=true)
- [ ] Correctly identifies permanent errors (returns shouldRestart=false)
- [ ] Supports all `ErrorCriterion` patterns (code, recoverable, function)
- [ ] Function is pure (no side effects, deterministic)
- [ ] Full test coverage with all edge cases
- [ ] Exported from `src/utils/index.ts`
- [ ] JSDoc documentation complete with examples

---

## All Needed Context

### Context Completeness Check

**Before proceeding, validate**: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

**Answer**: YES - This PRP provides:
- Complete type definitions with file paths
- Existing patterns to follow with code examples
- Test patterns with full examples
- Validation commands that work in this codebase
- Critical gotchas and anti-patterns to avoid
- External research with industry best practices

### Documentation & References

```yaml
# MUST READ - Type Definitions
- file: src/types/restart.ts
  why: Contains RestartAnalysis interface and ErrorCriterion discriminated union type
  critical: |
    - RestartAnalysis has 4 required fields: shouldRestart, reason, suggestedAction, estimatedSuccessProbability
    - ErrorCriterion is discriminated union: { code }, { recoverable }, or function
    - Function types MUST be last in union for proper type narrowing
  gotcha: |
    When checking ErrorCriterion at runtime, ALWAYS check `typeof criterion === 'function'` FIRST.
    Functions can have properties in JavaScript, so discriminant checks like 'code' in criterion
    will return true for functions with a code property, breaking type narrowing.

- file: src/types/error.ts
  why: Contains WorkflowError interface definition
  critical: |
    - WorkflowError has: message, original, workflowId, stack, state, logs
    - NOTE: Currently missing 'code' and 'recoverable' properties referenced in contract
  gotcha: |
    The contract mentions error.code and error.recoverable but WorkflowError doesn't have these.
    Use error.message as fallback for code, check error.original for recoverable property.

- file: src/types/decorators.ts
  why: Contains StepOptions interface with retryOn field
  pattern: retryOn?: ErrorCriterion[] - array of criteria for matching errors

# MUST READ - Implementation Patterns
- file: src/decorators/step.ts
  why: Shows existing matchesCriterion() implementation (lines 40-65)
  pattern: |
    function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
      // CRITICAL: Check typeof first for function type narrowing
      if (typeof criterion === 'function') {
        return criterion(error);
      }
      // Object type checks (type narrowing works after typeof check)
      if ('code' in criterion) {
        const errorCode = error.message;  // Uses message as code!
        return typeof criterion.code === 'string'
          ? errorCode === criterion.code
          : criterion.code.test(errorCode);
      }
      if ('recoverable' in criterion) {
        const original = error.original as Error | undefined;
        if (original && 'recoverable' in original) {
          return (original as { recoverable: boolean }).recoverable === criterion.recoverable;
        }
        return criterion.recoverable;
      }
      return false;
    }
  gotcha: Uses error.message as fallback for error.code since WorkflowError doesn't have code property

- file: src/utils/model-spec.ts
  why: Example of complex utility function with validation and JSDoc
  pattern: |
    - Comprehensive JSDoc with @param, @returns, @throws
    - Input validation with descriptive error messages
    - Explicit return type annotation
    - Pure function (no side effects)

- file: src/utils/workflow-error-utils.ts
  why: Example of error-related utility function
  pattern: |
    - Function accepts WorkflowError as input
    - Returns structured output based on error analysis
    - No side effects or mutations

# MUST READ - Test Patterns
- file: src/__tests__/unit/decorators/step-restart.test.ts
  why: Shows comprehensive test patterns for retry logic
  pattern: |
    - Tests all ErrorCriterion variants (string code, regex code, function)
    - Tests edge cases (zero maxRetries, no matching criteria)
    - Tests event emission with analysis structure
    - Uses helper class with attemptCount for verification
  coverage: |
    - String code matching (line 302-332)
    - Regex code matching (line 334-364)
    - Function criterion matching (line 366-396)
    - Multiple criteria (line 398-436)
    - No matching criteria (line 272-300)

- file: src/__tests__/unit/utils/workflow-error-utils.test.ts
  why: Shows test patterns for utility functions
  pattern: |
    - Helper function for creating mock WorkflowError
    - Nested describe blocks for organization
    - Test naming: describe('functionName', () => { it('should do something') })
    - Uses toStrictEqual for object comparison

# EXTERNAL RESEARCH
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T2S2/research/external_research.md
  why: Industry best practices for error analysis utilities
  section: "1. Transient Error Detection Best Practices"
  critical: |
    - Transient errors: TIMEOUT, RATE_LIMIT (429), NETWORK_ERROR, SERVICE_UNAVAILABLE (503)
    - Detection pattern: error code first (most reliable), HTTP status second, message matching last (brittle)
    - Use Set for O(1) lookup performance with error codes
  section: "3. Pure Function Design Patterns"
  critical: |
    - Pure functions must be deterministic (same input → same output)
    - No side effects (no I/O, no mutations, no external dependencies)
    - No use of Date.now(), Math.random(), or external state
  section: "4. Error Matching and Criterion Evaluation"
  critical: |
    - CRITICAL: Check typeof criterion === 'function' FIRST before discriminant checks
    - Functions can have properties in JavaScript, breaking discriminant narrowing
    - Always check instanceof RegExp before calling .test()
  section: "7. Industry-Standard Retry Decision Logic"
  critical: |
    - Success probability estimation: 0.0-0.3 (low), 0.4-0.6 (moderate), 0.7-1.0 (high)
    - Transient errors: 0.7-0.9 probability
    - Permanent errors: 0.0 probability
    - Decrease probability with each retry attempt

# ARCHITECTURE CONTEXT
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md
  why: Explains that no error analysis utility exists yet
  critical: |
    - "No error analysis utility exists"
    - Reflection-based retry in src/core/reflection.ts provides AI-powered analysis
    - This utility is for traditional restart logic (separate from reflection)

# TESTING FRAMEWORK
- file: package.json
  why: Shows test runner configuration
  pattern: Uses vitest for testing
  command: npm test or vitest run
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── restart.ts              # ✅ EXISTS - RestartAnalysis, ErrorCriterion
│   ├── error.ts                # ✅ EXISTS - WorkflowError interface
│   └── decorators.ts           # ✅ EXISTS - StepOptions with retryOn
├── utils/
│   ├── index.ts                # ✅ EXISTS - Central export hub
│   ├── model-spec.ts           # ✅ EXISTS - Example utility with JSDoc
│   ├── workflow-error-utils.ts # ✅ EXISTS - Error-related utility example
│   ├── delay.ts                # ✅ EXISTS - Simple pure function
│   ├── id.ts                   # ✅ EXISTS - Simple pure function
│   └── [restart-analysis.ts]   # ❌ TO CREATE - New utility
├── decorators/
│   └── step.ts                 # ✅ EXISTS - Contains matchesCriterion pattern
└── __tests__/
    └── unit/
        ├── decorators/
        │   └── step-restart.test.ts  # ✅ EXISTS - Retry logic test patterns
        └── utils/
            ├── workflow-error-utils.test.ts  # ✅ EXISTS - Utility test patterns
            └── [restart-analysis.test.ts]    # ❌ TO CREATE - Tests for new utility
```

### Desired Codebase Tree (After Implementation)

```bash
src/
├── utils/
│   ├── restart-analysis.ts     # ✅ NEW - analyzeErrorForRestart function
│   │   ├── TRANSIENT_ERROR_CODES constant
│   │   ├── analyzeErrorForRestart() function
│   │   └── Internal helper functions
│   └── index.ts                # ✅ UPDATE - Add export for analyzeErrorForRestart
└── __tests__/
    └── unit/
        └── utils/
            └── restart-analysis.test.ts  # ✅ NEW - Comprehensive tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: WorkflowError interface mismatch
// The contract mentions error.code and error.recoverable but WorkflowError doesn't have these!
// Current interface (src/types/error.ts):
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
  // NO 'code' property!
  // NO 'recoverable' property!
}

// Workaround used in step decorator (line 48):
const errorCode = error.message;  // Uses message as fallback for code

// For recoverable, check error.original:
const original = error.original as Error | undefined;
if (original && 'recoverable' in original) {
  return (original as { recoverable: boolean }).recoverable === criterion.recoverable;
}

// CRITICAL: ErrorCriterion discriminated union - Function MUST be last
export type ErrorCriterion =
  | { code: string | RegExp }
  | { recoverable: boolean }
  | ((error: WorkflowError) => boolean);  // MUST be last!

// CRITICAL: Runtime checking order - Function FIRST
function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
  if (typeof criterion === 'function') {  // CHECK FUNCTION FIRST
    return criterion(error);
  }
  // Now safe to use discriminant checks
  if ('code' in criterion) {
    // ...
  }
}

// CRITICAL: Module resolution requires .js extensions
import type { WorkflowError } from './error.js';  // CORRECT
import type { WorkflowError } from './error';     // WRONG - will cause error

// CRITICAL: Test patterns use helper functions for mock data
function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Test error',
    original: new Error('Original error'),
    workflowId: 'wf-test-123',
    stack: 'Error: Test error\n    at test.ts:10:15',
    state: { key: 'value' },
    logs: [],
    ...overrides,
  };
}
```

---

## Implementation Blueprint

### Data Models and Structure

All types are already defined in `src/types/restart.ts`:

```typescript
// Already exists - DO NOT MODIFY
export interface RestartAnalysis {
  shouldRestart: boolean;
  reason: string;
  suggestedAction: 'retry' | 'abort' | 'rebuild';
  estimatedSuccessProbability: number;
}

// Already exists - DO NOT MODIFY
export type ErrorCriterion =
  | { code: string | RegExp }
  | { recoverable: boolean }
  | ((error: WorkflowError) => boolean);
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/utils/restart-analysis.ts
  - DEFINE: Transient error code constants as const assertion
  - IMPLEMENT: analyzeErrorForRestart(error, stepOptions?) function
  - IMPLEMENT: Internal helper functions (isTransientError, matchesCriterion, estimateProbability)
  - FOLLOW pattern: src/utils/model-spec.ts for JSDoc and structure
  - NAMING: camelCase for function, UPPER_SNAKE_CASE for constants
  - PLACEMENT: New file in src/utils/
  - DEPENDENCIES: Import types from src/types/restart.ts, src/types/error.ts

Task 2: IMPLEMENT Transient Error Detection
  - DEFINE: TRANSIENT_ERROR_CODES constant array with const assertion
  - INCLUDE: 'TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'
  - IMPLEMENT: isTransientError(error: WorkflowError) helper function
  - LOGIC: Check error.message against transient error codes
  - RETURN: boolean indicating if error is transient
  - PATTERN: Use Set for O(1) lookup performance

Task 3: IMPLEMENT Error Criterion Matching
  - IMPLEMENT: matchesCriterion(error: WorkflowError, criterion: ErrorCriterion) helper
  - CRITICAL: Check typeof criterion === 'function' FIRST
  - HANDLE: String code matching (exact equality)
  - HANDLE: RegExp code matching (criterion.code.test())
  - HANDLE: Recoverable flag matching (check error.original?.recoverable)
  - HANDLE: Function criterion (execute with error as parameter)
  - FOLLOW: Existing pattern in src/decorators/step.ts:40-65
  - GOTCHA: Use error.message as fallback for error.code

Task 4: IMPLEMENT Success Probability Estimation
  - IMPLEMENT: estimateSuccessProbability(error: WorkflowError) helper function
  - RETURN: number between 0.0 and 1.0
  - LOGIC:
    - Transient errors: 0.7-0.9 (high probability)
    - Permanent errors (auth, validation): 0.0 (no chance)
    - Unknown errors: 0.5 (moderate probability)
  - PATTERN: Switch statement or object lookup for error categories

Task 5: IMPLEMENT Main analyzeErrorForRestart Function
  - SIGNATURE: analyzeErrorForRestart(error: WorkflowError, stepOptions?: { retryOn?: ErrorCriterion[] }): RestartAnalysis
  - STEP 1: Check error.original?.recoverable - if false, return abort
  - STEP 2: Check if error is transient - if yes, return retry with high probability
  - STEP 3: If stepOptions.retryOn provided, iterate through criteria
  - STEP 4: For each criterion, call matchesCriterion(error, criterion)
  - STEP 5: If any criterion matches, return restart with analysis
  - STEP 6: Default: return no restart with abort action
  - ENSURE: Function is pure (no side effects, deterministic)
  - RETURN: RestartAnalysis object with all required fields

Task 6: UPDATE src/utils/index.ts
  - ADD: export { analyzeErrorForRestart } from './restart-analysis.js';
  - PRESERVE: All existing exports
  - VERIFY: No circular dependencies

Task 7: CREATE src/__tests__/unit/utils/restart-analysis.test.ts
  - IMPLEMENT: Helper function createMockWorkflowError(overrides?)
  - IMPLEMENT: Test suite following src/__tests__/unit/decorators/step-restart.test.ts pattern
  - COVER: All function branches and edge cases
  - TEST: Transient error detection
  - TEST: Error criterion matching (string, regex, recoverable, function)
  - TEST: Success probability estimation
  - TEST: Pure function behavior (same input → same output)
  - TEST: Edge cases (undefined error, null original, missing properties)
  - NAMING: describe('analyzeErrorForRestart', () => { it('should do something') })
  - PLACEMENT: New test file in src/__tests__/unit/utils/
```

### Implementation Patterns & Key Details

```typescript
// CRITICAL PATTERN: Transient error detection with Set for O(1) lookup
const TRANSIENT_ERROR_CODES = [
  'TIMEOUT',
  'RATE_LIMIT',
  'NETWORK_ERROR',
  'SERVICE_UNAVAILABLE'
] as const;

const TRANSIENT_ERROR_SET = new Set(TRANSIENT_ERROR_CODES);

function isTransientError(error: WorkflowError): boolean {
  // Use error.message as fallback for error.code (WorkflowError doesn't have code property)
  const errorCode = error.message;
  return TRANSIENT_ERROR_SET.has(errorCode);
}

// CRITICAL PATTERN: Error criterion matching - Function FIRST!
function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
  // CRITICAL: Check typeof first for function type narrowing
  if (typeof criterion === 'function') {
    return criterion(error);
  }

  // Object type checks (type narrowing works after typeof check)
  if ('code' in criterion) {
    // GOTCHA: Use error.message as fallback for error.code
    const errorCode = error.message;
    return typeof criterion.code === 'string'
      ? errorCode === criterion.code
      : criterion.code.test(errorCode);
  }

  if ('recoverable' in criterion) {
    // Check error.original for recoverable property
    const original = error.original as Error | undefined;
    if (original && 'recoverable' in original) {
      return (original as { recoverable: boolean }).recoverable === criterion.recoverable;
    }
    // If no recoverable field, default to true for backward compatibility
    return criterion.recoverable;
  }

  return false;
}

// CRITICAL PATTERN: Success probability estimation
function estimateSuccessProbability(error: WorkflowError): number {
  // Check if transient error first
  if (isTransientError(error)) {
    return 0.8; // High probability for transient errors
  }

  // Check error message for permanent error patterns
  const msg = error.message.toLowerCase();
  if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('invalid')) {
    return 0.0; // No chance for auth/validation errors
  }

  // Default: moderate probability
  return 0.5;
}

// MAIN FUNCTION: analyzeErrorForRestart
export function analyzeErrorForRestart(
  error: WorkflowError,
  stepOptions?: { retryOn?: ErrorCriterion[] }
): RestartAnalysis {
  // STEP 1: Check recoverable flag (if available)
  const original = error.original as Error | undefined;
  if (original && 'recoverable' in original && !original.recoverable) {
    return {
      shouldRestart: false,
      reason: `Error is marked as non-recoverable: ${error.message}`,
      suggestedAction: 'abort',
      estimatedSuccessProbability: 0.0
    };
  }

  // STEP 2: Check if transient error
  if (isTransientError(error)) {
    return {
      shouldRestart: true,
      reason: `Transient error detected: ${error.message}`,
      suggestedAction: 'retry',
      estimatedSuccessProbability: 0.8
    };
  }

  // STEP 3: Check retry criteria if provided
  if (stepOptions?.retryOn && stepOptions.retryOn.length > 0) {
    for (const criterion of stepOptions.retryOn) {
      if (matchesCriterion(error, criterion)) {
        return {
          shouldRestart: true,
          reason: `Error matches retry criteria: ${error.message}`,
          suggestedAction: 'retry',
          estimatedSuccessProbability: estimateSuccessProbability(error)
        };
      }
    }
  }

  // STEP 4: Default: no restart
  return {
    shouldRestart: false,
    reason: `No matching retry criteria for error: ${error.message}`,
    suggestedAction: 'abort',
    estimatedSuccessProbability: 0.0
  };
}

// GOTCHA: Ensure .js extension for imports
import type { WorkflowError } from '../types/error.js';
import type { RestartAnalysis, ErrorCriterion } from '../types/restart.js';
```

### Integration Points

```yaml
TYPES:
  - import: src/types/restart.ts (RestartAnalysis, ErrorCriterion)
  - import: src/types/error.ts (WorkflowError)

UTILS:
  - export to: src/utils/index.ts
  - pattern: Add export line alongside existing utilities

DECORATORS:
  - use by: src/decorators/step.ts (optional refactoring)
  - current: Has inline matchesCriterion function
  - future: Could import analyzeErrorForRestart for consistency

TESTS:
  - location: src/__tests__/unit/utils/restart-analysis.test.ts
  - pattern: Follow step-restart.test.ts structure
  - helper: createMockWorkflowError function
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npx tsc --noEmit src/utils/restart-analysis.ts     # TypeScript type checking
npx tsc --noEmit                                    # Full project type check

# Run formatter
npm run format                                      # Or: npx prettier --write src/utils/restart-analysis.ts

# Run linter
npm run lint                                        # Or: npx eslint src/utils/restart-analysis.ts

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the new utility function
npm test -- src/__tests__/unit/utils/restart-analysis.test.ts

# Run all utility tests
npm test -- src/__tests__/unit/utils/

# Run with coverage
npm test -- --coverage src/utils/restart-analysis.ts

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Test that utility can be imported
node -e "import('./src/utils/index.js').then(m => console.log(Object.keys(m)))"

# Test TypeScript compilation with import
cat > /tmp/test-import.ts << 'EOF'
import { analyzeErrorForRestart } from './src/utils/index.js';
import type { WorkflowError } from './src/types/error.js';

const error: WorkflowError = {
  message: 'TIMEOUT',
  original: new Error('Timeout'),
  workflowId: 'test',
  state: {},
  logs: []
};

const analysis = analyzeErrorForRestart(error);
console.log(analysis);
EOF

npx ts-node /tmp/test-import.ts

# Expected: No import errors, function executes successfully
```

### Level 4: Domain-Specific Validation

```bash
# Test pure function behavior
cat > /tmp/test-pure.ts << 'EOF'
import { analyzeErrorForRestart } from './src/utils/index.js';
import type { WorkflowError } from './src/types/error.js';

const error: WorkflowError = {
  message: 'TIMEOUT',
  original: new Error('Timeout'),
  workflowId: 'test',
  state: {},
  logs: []
};

// Test 1: Same input → Same output (deterministic)
const result1 = analyzeErrorForRestart(error);
const result2 = analyzeErrorForRestart(error);
console.assert(JSON.stringify(result1) === JSON.stringify(result2), 'Not deterministic!');

// Test 2: No side effects (original error not modified)
console.assert(error.message === 'TIMEOUT', 'Error was modified!');

console.log('Pure function tests passed!');
EOF

npx ts-node /tmp/test-pure.ts

# Test all ErrorCriterion variants
cat > /tmp/test-criteria.ts << 'EOF'
import { analyzeErrorForRestart } from './src/utils/index.js';
import type { WorkflowError, ErrorCriterion } from './src/types/index.js';

const baseError: WorkflowError = {
  message: 'Test error',
  original: new Error('Test'),
  workflowId: 'test',
  state: {},
  logs: []
};

// Test string code
console.log('String code:', analyzeErrorForRestart(baseError, { retryOn: [{ code: 'Test error' }] }));

// Test regex code
console.log('Regex code:', analyzeErrorForRestart(baseError, { retryOn: [{ code: /Test|Error/ }] }));

// Test recoverable flag
const recoverableError = { ...baseError, original: { recoverable: true } };
console.log('Recoverable:', analyzeErrorForRestart(recoverableError, { retryOn: [{ recoverable: true }] }));

// Test function criterion
console.log('Function:', analyzeErrorForRestart(baseError, {
  retryOn: [(e) => e.message.includes('Test')]
}));

console.log('All criterion tests passed!');
EOF

npx ts-node /tmp/test-criteria.ts

# Expected: All tests pass, demonstrating pure function behavior and correct criterion matching
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test -- src/__tests__/unit/utils/restart-analysis.test.ts`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No linting errors: `npm run lint`
- [ ] No formatting issues: `npm run format`
- [ ] Function is pure (deterministic, no side effects)
- [ ] All code paths tested (100% coverage target)

### Feature Validation

- [ ] Function correctly identifies transient errors (TIMEOUT, RATE_LIMIT, NETWORK_ERROR, SERVICE_UNAVAILABLE)
- [ ] Function correctly identifies permanent errors (auth, validation)
- [ ] All ErrorCriterion patterns work (string code, regex code, recoverable flag, function)
- [ ] Success probability estimation returns values between 0.0 and 1.0
- [ ] RestartAnalysis object includes all required fields
- [ ] Reason strings are descriptive and helpful
- [ ] Suggested action matches error type (retry for transient, abort for permanent)

### Code Quality Validation

- [ ] Follows existing codebase patterns (matchesCriterion function structure)
- [ ] File placement matches desired tree structure
- [ ] Named exports used (not default)
- [ ] JSDoc documentation complete with @param, @returns, @example
- [ ] Constants use const assertion for type safety
- [ ] Error handling is robust (handles undefined/null values)
- [ ] No circular dependencies in imports

### Integration Validation

- [ ] Function exported from src/utils/index.ts
- [ ] Can be imported by other modules (decorators, workflows)
- [ ] Works with existing WorkflowError structure
- [ ] Compatible with RestartAnalysis and ErrorCriterion types
- [ ] No breaking changes to existing code

---

## Anti-Patterns to Avoid

- ❌ Don't add side effects (logging, I/O, external state)
- ❌ Don't use Date.now(), Math.random(), or other non-deterministic functions
- ❌ Don't mutate input parameters (error or stepOptions)
- ❌ Don't check discriminants before typeof === 'function'
- ❌ Don't assume error.code exists (use error.message as fallback)
- ❌ Don't forget to handle undefined/null in error.original
- ❌ Don't use default exports (use named exports only)
- ❌ Don't skip JSDoc documentation
- ❌ Don't skip edge case testing (undefined, null, functions with properties)
- ❌ Don't hardcode success probability (use estimation logic)
- ❌ Don't forget .js extension in imports (required by moduleResolution: "bundler")
- ❌ Don't create circular dependencies

---

## Success Metrics

**Confidence Score**: 9/10

**Rationale**:
- ✅ All type definitions exist and are well-documented
- ✅ Clear implementation pattern exists in step decorator
- ✅ Test patterns are established and comprehensive
- ✅ External research provides industry best practices
- ✅ Pure function requirements are well-understood
- ⚠️ Minor uncertainty: WorkflowError interface missing code/recoverable properties (workaround documented)

**Validation**: The completed PRP should enable an AI agent unfamiliar with the codebase to implement this utility successfully using only the PRP content and codebase access.
