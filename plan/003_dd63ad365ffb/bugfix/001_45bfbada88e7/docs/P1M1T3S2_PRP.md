# Product Requirement Prompt: Add analyzeError Method to Workflow Base Class

**Work Item**: P1.M1.T3.S2
**Title**: Add analyzeError method to Workflow base class
**Status**: Ready for Implementation
**Confidence Score**: 9/10

---

## Goal

**Feature Goal**: Add an `analyzeError()` method to the Workflow base class that enables parent workflows to analyze child WorkflowError instances and make intelligent restart decisions (retry, abort, or rebuild) for hierarchical workflow error handling.

**Deliverable**: Modified `src/core/workflow.ts` containing:
1. New `analyzeError(error: WorkflowError): 'retry' | 'abort' | 'rebuild'` method
2. Integration with existing `analyzeErrorForRestart` utility for consistency
3. Complete JSDoc documentation with usage examples
4. Full test coverage in `src/__tests__/unit/workflow-analyze-error.test.ts`

**Success Definition**:
- Method correctly analyzes WorkflowError instances and returns appropriate restart decisions
- Uses `analyzeErrorForRestart` utility from P1.M1.T2.S2 for consistency
- Checks error recoverability, step metadata, and retry criteria
- Returns 'retry' | 'abort' | 'rebuild' based on analysis
- All tests pass including edge cases
- Method follows existing Workflow class patterns

---

## User Persona

**Target User**: Framework developers building hierarchical workflows with parent-child error handling

**Use Case**: When a child workflow fails and emits a WorkflowError, the parent workflow needs to analyze the error and decide whether to retry the child, abort the parent workflow, or rebuild the execution plan.

**User Journey**:
1. Child workflow fails and wraps error in WorkflowError
2. Parent workflow receives error event or catches error
3. Parent calls `this.analyzeError(childError)` to get restart decision
4. Parent uses decision to trigger retry, abort, or plan rebuild
5. Parent can optionally call `restartStep()` if decision is 'retry'

**Pain Points Addressed**:
- No parent-level error analysis framework exists
- Parent workflows receive child errors but have no structured decision framework
- Inconsistent restart logic across parent workflows
- Missing integration between child errors and parent restart decisions

---

## Why

**Business Value and User Impact**:
- Enables intelligent hierarchical error handling
- Reduces manual intervention in multi-level workflow failures
- Improves workflow reliability through consistent parent-level decisions
- Provides observability through structured error analysis

**Integration with Existing Features**:
- Uses `analyzeErrorForRestart` utility from P1.M1.T2.S2 (already implemented)
- Works with `restartStep()` method from P1.M1.T3.S1 (already implemented)
- Integrates with `@Step` decorator's `restartable` option and `retryOn` criteria
- Supports PRD Section 11 (Restart Semantics) requirements for parent-level decisions

**Problems This Solves**:
- **Problem**: No parent-level error analysis exists (from architecture/restart_logic_analysis.md:50-56)
- **Problem**: Parent workflows receive child errors but have no framework for restart decisions
- **Problem**: Inconsistent error handling across parent-child workflows
- **Problem**: Missing integration between child WorkflowError and parent restart logic

---

## What

### User-Visible Behavior

The `analyzeError()` method provides intelligent error analysis for parent workflows:

**Input**: `WorkflowError` instance (typically from child workflow)

**Output**: `'retry' | 'abort' | 'rebuild'` indicating the recommended action

**Key Behaviors**:
1. Checks `error.recoverable` - if false, returns 'abort' immediately
2. Extracts stepName from error metadata (if available)
3. Retrieves step metadata from stepMetadata map (if exists)
4. Checks if step is restartable - if not, returns 'abort'
5. Checks step's `retryOn` criteria against error using `analyzeErrorForRestart`
6. Returns 'retry' if any criteria match, otherwise 'abort'
7. Uses `analyzeErrorForRestart` utility for consistency with step-level logic

### Success Criteria

- [ ] Method exists at `src/core/workflow.ts` as public method
- [ ] Returns `'retry' | 'abort' | 'rebuild'` for all inputs
- [ ] Correctly identifies non-recoverable errors (returns 'abort')
- [ ] Correctly identifies restartable steps with matching criteria (returns 'retry')
- [ ] Correctly identifies non-restartable steps (returns 'abort')
- [ ] Uses `analyzeErrorForRestart` utility for criterion matching
- [ ] Full test coverage with all edge cases
- [ ] JSDoc documentation complete with examples
- [ ] Follows existing Workflow class method patterns

---

## All Needed Context

### Context Completeness Check

**Before proceeding, validate**: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

**Answer**: YES - This PRP provides:
- Complete type definitions with file paths
- Existing Workflow class structure and patterns
- analyzeErrorForRestart utility implementation
- Test patterns with full examples
- Validation commands that work in this codebase
- Critical gotchas and anti-patterns to avoid
- Integration points with existing features

### Documentation & References

```yaml
# MUST READ - Contract Definition
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/tasks.json
  why: Contains the official contract definition for this work item
  section: "P1.M1.T3.S2"
  critical: |
    - INPUT: WorkflowError from child workflow
    - LOGIC: Check error.recoverable, get stepName from metadata, get stepMeta from stepMetadata,
      check if restartable, check retryOn criteria using analyzeErrorForRestart
    - OUTPUT: 'retry' | 'abort' | 'rebuild'
    - MUST use analyzeErrorForRestart utility for consistency

# MUST READ - Architecture Analysis
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md
  why: Explains the critical gap in parent-level error analysis
  section: "What's Missing: Traditional Restart Logic" (lines 49-57)
  critical: |
    - "No parent-level error analysis exists"
    - "Parent workflows currently receive child error events but have no framework
      for restart decisions"
    - Analyze method should check: error.recoverable, stepName, stepMeta.restartable,
      stepMeta.options.retryOn criteria

# MUST READ - Workflow Class Structure
- file: src/core/workflow.ts
  why: Contains the Workflow base class that needs the new method
  pattern: |
    - Public methods: restartStep, setStatus, getNode, run, attachChild, detachChild
    - Protected methods: getRoot
    - Private methods: getRootObservers
    - Uses JSDoc with @param, @returns, @example
    - Method placement: Group related functionality together
  gotcha: |
    - Class uses public/private/protected modifiers
    - Methods follow camelCase naming
    - All methods have comprehensive JSDoc
    - Existing restartStep method shows pattern for step-related operations

# MUST READ - analyzeErrorForRestart Utility
- file: src/utils/restart-analysis.ts
  why: Contains the utility function this method must use for consistency
  pattern: |
    export function analyzeErrorForRestart(
      error: WorkflowError,
      stepOptions?: { retryOn?: ErrorCriterion[] }
    ): RestartAnalysis {
      // Returns { shouldRestart, reason, suggestedAction, estimatedSuccessProbability }
    }
  critical: |
    - MUST use this utility instead of duplicating logic
    - Pass stepMeta.options to get criterion matching
    - Convert RestartAnalysis.suggestedAction to return value
  integration: |
    import { analyzeErrorForRestart } from '../utils/restart-analysis.js';

# MUST READ - WorkflowError Type
- file: src/types/error.ts
  why: Contains WorkflowError interface definition
  critical: |
    - Has: message, original, workflowId, stack?, state, logs
    - MISSING: 'code' and 'recoverable' properties (mentioned in contract but don't exist)
    - Check error.original?.recoverable for recoverable flag
    - Use error.message as fallback for error.code

# MUST READ - StepOptions and Metadata
- file: src/types/decorators.ts
  why: Contains StepOptions interface with restart configuration
  pattern: |
    export interface StepOptions {
      restartable?: boolean;
      maxRetries?: number;
      retryDelayMs?: number;
      retryOn?: ErrorCriterion[];
    }
  critical: |
    - stepMeta.options will have these properties if step is decorated
    - retryOn is array of ErrorCriterion for matching errors
    - restartable must be true to allow retry

- file: src/decorators/step.ts
  why: Shows how step decorator stores metadata
  pattern: |
    // Step decorator doesn't currently store metadata in a centralized location
    // This is a known gap - stepMetadata map doesn't exist yet
  gotcha: |
    - CRITICAL: stepMetadata Map is mentioned in contract but DOESN'T EXIST
    - For this implementation, we must handle missing stepMetadata gracefully
    - If stepMetadata doesn't exist or step not found, return 'abort'
    - Future work will add stepMetadata storage in decorator

# MUST READ - Restart Types
- file: src/types/restart.ts
  why: Contains RestartAnalysis and ErrorCriterion types
  critical: |
    - RestartAnalysis has: shouldRestart, reason, suggestedAction, estimatedSuccessProbability
    - ErrorCriterion is discriminated union: { code }, { recoverable }, or function
    - Function types MUST be checked first at runtime

# MUST READ - Event Types
- file: src/types/events.ts
  why: Shows stepRetry and stepRestarted event structure
  pattern: |
    - stepRetry has: node, stepName, retryCount, analysis, error, timestamp
    - stepRestarted has: node, stepName, retryCount, state
  critical: |
    - Error events contain WorkflowError with metadata
    - stepName can be extracted from error events for analysis

# MUST READ - Test Patterns
- file: src/__tests__/unit/workflow-restart-step.test.ts
  why: Shows comprehensive test patterns for workflow methods
  pattern: |
    - Nested describe blocks for organization
    - Helper class with state tracking for verification
    - Test naming: describe('methodName', () => { it('should do something') })
    - Uses toMatchObject for WorkflowError comparison
    - Tests error cases, success cases, and edge cases
  coverage: |
    - Error handling (step not found, max retries exceeded)
    - Successful execution (various return types)
    - State preservation (workflow context binding)
    - Edge cases (default values, optional parameters)

- file: src/__tests__/unit/utils/restart-analysis.test.ts
  why: Shows test patterns for error analysis
  pattern: |
    - Helper function createMockWorkflowError(overrides?)
    - Tests all RestartAnalysis return values
    - Tests all ErrorCriterion variants
    - Tests recoverable flag checking
    - Tests transient error detection
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts              # ✅ EXISTS - Add analyzeError method here
│   ├── workflow-context.ts      # ✅ EXISTS - Context creation
│   └── index.ts                 # ✅ EXISTS - Core exports
├── types/
│   ├── restart.ts               # ✅ EXISTS - RestartAnalysis, ErrorCriterion
│   ├── error.ts                 # ✅ EXISTS - WorkflowError interface
│   ├── decorators.ts            # ✅ EXISTS - StepOptions with retryOn
│   ├── events.ts                # ✅ EXISTS - WorkflowEvent types
│   └── index.ts                 # ✅ EXISTS - Type exports
├── utils/
│   ├── restart-analysis.ts      # ✅ EXISTS - analyzeErrorForRestart utility
│   └── index.ts                 # ✅ EXISTS - Utility exports
├── decorators/
│   └── step.ts                  # ✅ EXISTS - Step decorator with retry logic
└── __tests__/
    └── unit/
        ├── workflow-restart-step.test.ts  # ✅ EXISTS - Workflow method test patterns
        ├── utils/
        │   └── restart-analysis.test.ts  # ✅ EXISTS - Error analysis test patterns
        └── [workflow-analyze-error.test.ts]  # ❌ TO CREATE - Tests for new method
```

### Desired Codebase Tree (After Implementation)

```bash
src/
├── core/
│   └── workflow.ts              # ✅ UPDATE - Add analyzeError method
└── __tests__/
    └── unit/
        └── [workflow-analyze-error.test.ts]  # ✅ NEW - Tests for analyzeError method
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: stepMetadata Map doesn't exist yet!
// The contract mentions getting stepMeta from stepMetadata, but this map doesn't exist.
// The step decorator doesn't currently store metadata in a centralized location.
//
// SOLUTION: Handle missing stepMetadata gracefully
// - Check if stepMetadata exists before using it
// - If it doesn't exist or step not found, return 'abort'
// - This is a known limitation that will be fixed in future work
//
// Pattern to use:
// public analyzeError(error: WorkflowError): 'retry' | 'abort' | 'rebuild' {
//   // ... check recoverable, get stepName ...
//
//   // CRITICAL: Handle missing stepMetadata gracefully
//   if (!('stepMetadata' in this)) {
//     return 'abort'; // No metadata available, can't determine restartability
//   }
//
//   const stepMeta = (this as any).stepMetadata.get(stepName);
//   if (!stepMeta || !stepMeta.options.restartable) {
//     return 'abort';
//   }
//
//   // ... rest of analysis ...
// }

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

// Workaround for recoverable:
const original = error.original as Error | undefined;
if (original && 'recoverable' in original && !original.recoverable) {
  return 'abort';
}

// CRITICAL: Module resolution requires .js extensions
import { analyzeErrorForRestart } from '../utils/restart-analysis.js';  // CORRECT
import { analyzeErrorForRestart } from '../utils/restart-analysis';     // WRONG - will cause error

// CRITICAL: Return type is union of string literals
// Not an enum, not a string - exact values required
return 'retry';   // CORRECT
return 'abort';   // CORRECT
return 'rebuild'; // CORRECT
return 'retry_or_abort'; // WRONG - not in union type

// CRITICAL: Integration with restartStep method
// The restartStep method (already implemented in workflow.ts:505-561) can be used
// after analyzeError returns 'retry'. They are complementary:
// 1. Parent calls analyzeError(error) to get decision
// 2. If 'retry', parent can call restartStep(stepName) to execute retry
// 3. If 'abort', parent throws error or returns early
// 4. If 'rebuild', parent triggers plan rebuild logic

// CRITICAL: Test patterns use helper classes with state tracking
class TestWorkflow extends Workflow {
  analysisResult: 'retry' | 'abort' | 'rebuild' = 'abort';

  async run(): Promise<void> {
    const error: WorkflowError = { /* ... */ };
    this.analysisResult = this.analyzeError(error);
  }
}

// CRITICAL: JSDoc pattern for Workflow class methods
/**
 * Analyze a WorkflowError and determine the appropriate restart action
 *
 * @param error - The WorkflowError to analyze (typically from child workflow)
 * @returns The recommended action: 'retry', 'abort', or 'rebuild'
 *
 * @example Analyze error from child workflow
 * ```ts
 * class ParentWorkflow extends Workflow {
 *   async run(): Promise<void> {
 *     try {
 *       await this.runChild();
 *     } catch (error) {
 *       const action = this.analyzeError(error as WorkflowError);
 *       if (action === 'retry') {
 *         await this.restartStep('runChild');
 *       } else if (action === 'abort') {
 *         throw error;
 *       } else if (action === 'rebuild') {
 *         // Trigger plan rebuild
 *       }
 *     }
 *   }
 * }
 * ```
 */
```

---

## Implementation Blueprint

### Data Models and Structure

All types are already defined and used in existing code:

```typescript
// Input type (already exists)
import type { WorkflowError } from '../types/error.js';

// Output type (new for this method)
type RestartDecision = 'retry' | 'abort' | 'rebuild';

// Utility function return type (already exists)
import type { RestartAnalysis } from '../types/restart.js';

// Step options (already exists)
import type { StepOptions } from '../types/decorators.js';
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD analyzeError method to Workflow class
  - FILE: src/core/workflow.ts
  - LOCATION: After restartStep method (around line 562), before setStatus
  - SIGNATURE: public analyzeError(error: WorkflowError): 'retry' | 'abort' | 'rebuild'
  - IMPORT: Add import for analyzeErrorForRestart from '../utils/restart-analysis.js'
  - NAMING: camelCase method name, following existing pattern
  - ACCESS: Public method (can be called by parent workflows)

Task 2: IMPLEMENT recoverable flag check
  - CHECK: error.original for recoverable property
  - CAST: error.original as Error | undefined
  - GUARD: if ('recoverable' in original && !original.recoverable)
  - RETURN: 'abort' immediately if not recoverable
  - PATTERN: Follow analyzeErrorForRestart recoverable check (restart-analysis.ts:383-391)

Task 3: IMPLEMENT stepName extraction from error metadata
  - EXTRACT: stepName from error (if available)
  - PROBLEM: WorkflowError doesn't have a stepName property
  - SOLUTION: Check if error.state has stepName or other metadata
  - FALLBACK: If no stepName available, return 'abort' (can't determine restartability)
  - PATTERN: Use optional chaining and type guards

Task 4: IMPLEMENT stepMetadata lookup with graceful handling
  - CHECK: if ('stepMetadata' in this) - Map may not exist yet
  - GET: const stepMeta = (this as any).stepMetadata.get(stepName)
  - GUARD: if (!stepMeta) return 'abort'
  - CHECK: if (!stepMeta.options.restartable) return 'abort'
  - DOCUMENT: Add TODO comment that stepMetadata will be added by decorator in future
  - PATTERN: Graceful degradation - missing metadata means can't restart

Task 5: IMPLEMENT retry criteria check using analyzeErrorForRestart
  - CALL: analyzeErrorForRestart(error, stepMeta.options)
  - PASS: stepMeta.options as second parameter (contains retryOn criteria)
  - GET: RestartAnalysis return value
  - CHECK: if (analysis.shouldRestart) return 'retry'
  - RETURN: 'abort' if no criteria match
  - PATTERN: Reuse existing utility for consistency

Task 6: ADD comprehensive JSDoc documentation
  - INCLUDE: @param description for error parameter
  - INCLUDE: @returns description for RestartDecision type
  - INCLUDE: @example showing parent workflow error handling
  - INCLUDE: @remarks explaining stepMetadata limitation
  - FOLLOW: Existing JSDoc pattern in restartStep method (workflow.ts:473-503)

Task 7: CREATE comprehensive test suite
  - FILE: src/__tests__/unit/workflow-analyze-error.test.ts
  - HELPER: createMockWorkflowError function
  - TEST: Non-recoverable errors return 'abort'
  - TEST: Recoverable errors with matching criteria return 'retry'
  - TEST: Errors without stepName return 'abort'
  - TEST: Missing stepMetadata returns 'abort'
  - TEST: Non-restartable steps return 'abort'
  - TEST: All ErrorCriterion variants (string, regex, recoverable, function)
  - TEST: Integration with analyzeErrorForRestart utility
  - PATTERN: Follow workflow-restart-step.test.ts structure
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// CRITICAL PATTERN: Graceful handling of missing stepMetadata
// ============================================================
// The step decorator doesn't store metadata yet, so we must handle this

public analyzeError(error: WorkflowError): 'retry' | 'abort' | 'rebuild' {
  // STEP 1: Check recoverable flag
  const original = error.original as Error | undefined;
  if (original && 'recoverable' in original && !original.recoverable) {
    return 'abort';
  }

  // STEP 2: Extract stepName from error metadata
  // GOTCHA: WorkflowError doesn't have stepName property
  // Check if error.state or error.original has step information
  const stepName = error.state?.stepName as string | undefined;
  if (!stepName) {
    return 'abort'; // Can't determine which step failed
  }

  // STEP 3: Get step metadata with graceful handling
  // CRITICAL: stepMetadata may not exist yet (decorator doesn't store it)
  if (!('stepMetadata' in this)) {
    return 'abort'; // No metadata available
  }

  const stepMeta = (this as any).stepMetadata.get(stepName);
  if (!stepMeta) {
    return 'abort'; // Step not found in metadata
  }

  // STEP 4: Check if step is restartable
  if (!stepMeta.options?.restartable) {
    return 'abort'; // Step not marked as restartable
  }

  // STEP 5: Use analyzeErrorForRestart for criterion matching
  const analysis = analyzeErrorForRestart(error, stepMeta.options);
  if (analysis.shouldRestart) {
    return 'retry';
  }

  // STEP 6: Default to abort
  return 'abort';
}

// ============================================================
// IMPORT ADDITION (add to top of workflow.ts)
// ============================================================
import { analyzeErrorForRestart } from '../utils/restart-analysis.js';

// ============================================================
// JSDOC DOCUMENTATION PATTERN
// ============================================================
/**
 * Analyze a WorkflowError from a child workflow and determine restart action
 *
 * This method enables parent workflows to make intelligent decisions about child
 * workflow failures by analyzing the error and step metadata to determine whether
 * to retry the child, abort the parent, or rebuild the execution plan.
 *
 * **Analysis Flow:**
 * 1. Check `error.original?.recoverable` - if false, return 'abort'
 * 2. Extract stepName from error metadata (if available)
 * 3. Retrieve step metadata from stepMetadata map (if exists)
 * 4. Check if step is marked as restartable - if not, return 'abort'
 * 5. Use `analyzeErrorForRestart` utility to check retry criteria
 * 6. Return 'retry' if any criteria match, otherwise 'abort'
 *
 * **Integration with restartStep:**
 * This method is designed to be used alongside `restartStep()`:
 * - Call `analyzeError()` to get the decision
 * - If 'retry', call `restartStep(stepName)` to execute
 * - If 'abort', throw the error or return early
 * - If 'rebuild', trigger plan rebuild logic
 *
 * @param error - The WorkflowError to analyze (typically from child workflow)
 * @returns The recommended action: 'retry', 'abort', or 'rebuild'
 *
 * @example Parent workflow error handling
 * ```ts
 * class ParentWorkflow extends Workflow {
 *   @Step({ restartable: true, retryOn: [{ code: 'TIMEOUT' }] })
 *   async childWorkflow(): Promise<void> {
 *     // Child logic that may fail
 *   }
 *
 *   async run(): Promise<void> {
 *     try {
 *       await this.childWorkflow();
 *     } catch (err) {
 *       const error = err as WorkflowError;
 *       const action = this.analyzeError(error);
 *
 *       if (action === 'retry') {
 *         await this.restartStep('childWorkflow');
 *       } else if (action === 'abort') {
 *         throw error;
 *       } else if (action === 'rebuild') {
 *         // Trigger plan rebuild logic
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @example Analyze error from child workflow event
 * ```ts
 * class ParentWorkflow extends Workflow {
 *   private lastError: WorkflowError | null = null;
 *
 *   async run(): Promise<void> {
 *     // Subscribe to error events
 *     this.on('error', (event) => {
 *       this.lastError = event.error;
 *     });
 *
 *     // Later, analyze the error
 *     if (this.lastError) {
 *       const action = this.analyzeError(this.lastError);
 *       // Take action based on decision
 *     }
 *   }
 * }
 * ```
 *
 * @remarks
 * **Known Limitation:**
 * The `stepMetadata` map is not yet populated by the `@Step` decorator.
 * This method will return 'abort' if stepMetadata is not available or the step
 * is not found. This will be improved in a future update to the decorator.
 *
 * **Error Metadata:**
 * The stepName is extracted from `error.state?.stepName`. Ensure child
 * workflows populate this field when creating WorkflowError instances.
 *
 * @see {@link restartStep} - For executing a retry after analysis
 * @see {@link analyzeErrorForRestart} - For the underlying utility function
 */
public analyzeError(error: WorkflowError): 'retry' | 'abort' | 'rebuild' {
  // Implementation...
}
```

### Integration Points

```yaml
UTILITIES:
  - import: src/utils/restart-analysis.ts (analyzeErrorForRestart)
  - usage: Pass stepMeta.options to get criterion matching
  - consistency: Ensures parent and child error analysis use same logic

TYPES:
  - import: src/types/error.ts (WorkflowError)
  - import: src/types/restart.ts (RestartAnalysis - returned by utility)
  - import: src/types/decorators.ts (StepOptions - for metadata structure)

WORKFLOW METHODS:
  - use with: restartStep() - Execute retry after analyzeError returns 'retry'
  - emit: error events - Child workflows emit errors that parent analyzes
  - access: stepMetadata - Future decorator will populate this Map

TESTING:
  - location: src/__tests__/unit/workflow-analyze-error.test.ts
  - pattern: Follow workflow-restart-step.test.ts structure
  - helper: createMockWorkflowError function for test data
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after implementation - fix before proceeding
npm run lint                     # TypeScript type checking
npm run build                    # Full project compilation

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the new method
npm test -- src/__tests__/unit/workflow-analyze-error.test.ts

# Run all workflow tests
npm test -- src/__tests__/unit/workflow-restart-step.test.ts

# Full test suite for affected areas
npm test -- src/__tests__/unit/

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Test that method can be called on Workflow instance
cat > /tmp/test-analyze-error.ts << 'EOF'
import { Workflow, Step, type WorkflowError } from './dist/index.js';

class TestWorkflow extends Workflow {
  @Step({ restartable: true, retryOn: [{ code: 'TIMEOUT' }] })
  async testStep(): Promise<void> {
    throw new Error('TIMEOUT');
  }

  async run(): Promise<void> {
    try {
      await this.testStep();
    } catch (err) {
      const error = err as WorkflowError;
      const action = this.analyzeError(error);
      console.log('Analysis result:', action);
      if (action === 'retry') {
        console.log('Would retry step');
      }
    }
  }
}

const wf = new TestWorkflow();
wf.run().catch(console.error);
EOF

tsx /tmp/test-analyze-error.ts

# Expected: Method executes successfully, returns valid RestartDecision
```

### Level 4: Domain-Specific Validation

```bash
# Test integration with restartStep method
cat > /tmp/test-integration.ts << 'EOF'
import { Workflow, Step, type WorkflowError } from './dist/index.js';

class ParentWorkflow extends Workflow {
  retryCount = 0;

  @Step({ restartable: true, maxRetries: 2 })
  async childStep(): Promise<string> {
    this.retryCount++;
    if (this.retryCount < 2) {
      const error: WorkflowError = {
        message: 'TIMEOUT',
        original: new Error('Timeout'),
        workflowId: this.id,
        state: { stepName: 'childStep' },
        logs: []
      };
      throw error;
    }
    return 'success';
  }

  async run(): Promise<string> {
    try {
      return await this.childStep();
    } catch (err) {
      const error = err as WorkflowError;
      const action = this.analyzeError(error);

      if (action === 'retry') {
        console.log('Analyzing as retry');
        return await this.restartStep('childStep') as string;
      }

      throw error;
    }
  }
}

const wf = new ParentWorkflow();
wf.run().then(result => {
  console.log('Result:', result);
  console.log('Retry count:', wf.retryCount);
}).catch(console.error);
EOF

tsx /tmp/test-integration.ts

# Expected: Full integration works, analyzeError returns 'retry', restartStep executes
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test -- src/__tests__/unit/workflow-analyze-error.test.ts`
- [ ] No TypeScript errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Method returns valid RestartDecision for all inputs
- [ ] Method uses analyzeErrorForRestart utility (no duplicated logic)

### Feature Validation

- [ ] Non-recoverable errors return 'abort' (error.original?.recoverable === false)
- [ ] Errors without stepName return 'abort'
- [ ] Missing stepMetadata returns 'abort' (graceful degradation)
- [ ] Non-restartable steps return 'abort' (!stepMeta.options.restartable)
- [ ] Restartable steps with matching criteria return 'retry'
- [ ] Restartable steps without matching criteria return 'abort'
- [ ] All ErrorCriterion patterns work (string, regex, recoverable, function)

### Code Quality Validation

- [ ] Follows existing Workflow class method patterns
- [ ] JSDoc documentation complete with @param, @returns, @example, @remarks
- [ ] Method placement is logical (after restartStep, before setStatus)
- [ ] Import added for analyzeErrorForRestart utility
- [ ] Proper error handling for missing data (stepName, stepMetadata)
- [ ] Type annotations are correct and specific

### Integration Validation

- [ ] Works with existing WorkflowError structure
- [ ] Compatible with RestartAnalysis return type from utility
- [ ] Integrates with restartStep method for execution
- [ ] No breaking changes to existing code
- [ ] Graceful degradation when stepMetadata doesn't exist

### Documentation Validation

- [ ] JSDoc explains stepMetadata limitation clearly
- [ ] Examples show real-world usage patterns
- [ ] @see references link to related methods
- [ ] Remarks section documents known limitations
- [ ] Parameter and return types are documented

---

## Anti-Patterns to Avoid

- ❌ Don't duplicate error analysis logic (use analyzeErrorForRestart utility)
- ❌ Don't assume stepMetadata exists (handle missing gracefully)
- ❌ Don't assume error has stepName (check error.state?.stepName)
- ❌ Don't use enum for return type (use string literal union: 'retry' | 'abort' | 'rebuild')
- ❌ Don't forget .js extension in imports (required by moduleResolution: "bundler")
- ❌ Don't add side effects (logging, I/O) - keep method pure
- ❌ Don't throw errors (return 'abort' instead)
- ❌ Don't modify input error parameter
- ❌ Don't skip JSDoc documentation
- ❌ Don't make method private or protected (must be public for parent workflows)
- ❌ Don't place method in wrong location (should be after restartStep)
- ❌ Don't forget to handle undefined/null in error.original
- ❌ Don't check error.code property (doesn't exist, use error.message)

---

## Success Metrics

**Confidence Score**: 9/10

**Rationale**:
- ✅ All type definitions exist and are well-documented
- ✅ analyzeErrorForRestart utility is implemented and tested
- ✅ Workflow class structure and patterns are well-understood
- ✅ Test patterns are established and comprehensive
- ✅ Integration points with existing features are clear
- ⚠️ Minor uncertainty: stepMetadata doesn't exist yet (graceful handling documented)

**Validation**: The completed PRP should enable an AI agent unfamiliar with the codebase to implement this method successfully using only the PRP content and codebase access.
