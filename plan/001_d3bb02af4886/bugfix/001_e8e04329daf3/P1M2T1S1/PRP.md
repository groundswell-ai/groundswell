# PRP: P1.M2.T1.S1 - Analyze Current Promise.all Implementation in @Task Decorator

---

## Goal

**Feature Goal**: Analyze and document the current Promise.all implementation in the @Task decorator to establish a complete understanding of concurrent execution behavior, error propagation flow, and requirements for migrating to Promise.allSettled.

**Deliverable**: Analysis document stored at `plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md` documenting:
- Current Promise.all implementation details (lines 104-114 in task.ts)
- Runnable workflow filtering logic
- Error propagation flow when concurrent workflows fail
- Requirements for Promise.allSettled migration
- Edge cases and gotchas identified

**Success Definition**: Analysis document provides sufficient context for P1.M2.T1.S2 (implement Promise.allSettled) to proceed without additional research. The document must answer:
1. How does the current implementation filter runnable workflows?
2. What happens when one concurrent workflow fails?
3. What error context is currently captured?
4. What changes are needed for Promise.allSettled migration?

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to complete this research task successfully?

**Answer**: YES - This PRP provides:
- Exact file locations with line numbers
- Code snippets to analyze
- Expected documentation structure
- Validation criteria

### Documentation & References

```yaml
# MUST READ - Core Implementation
- file: src/decorators/task.ts
  lines: 104-114
  why: Contains the Promise.all implementation for concurrent task execution
  pattern: Concurrent workflow execution with runnable filtering
  gotcha: Promise.all fails fast on first error, losing other concurrent errors

- file: src/decorators/task.ts
  lines: 1-129 (full file)
  why: Complete context for @Task decorator including workflow attachment logic
  pattern: Task decorator wrapper function with event emission

- file: plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md
  why: Comprehensive error handling architecture analysis
  section: "2. All Promise.all Usage Locations" through "5. Recommended Pattern"
  critical: Already documents Promise.all location and recommended allSettled pattern

# TYPE DEFINITIONS
- file: src/types/error-strategy.ts
  why: Defines ErrorMergeStrategy interface (currently unused)
  pattern: Interface with enabled, maxMergeDepth, and combine() function

- file: src/types/decorators.ts
  why: Defines TaskOptions interface for @Task decorator configuration
  pattern: Options interface for decorator configuration

- file: src/types/error.ts
  why: Defines WorkflowError interface structure
  pattern: Interface with message, original, workflowId, stack, state, logs

# TEST PATTERNS - Follow these for understanding behavior
- file: src/__tests__/adversarial/edge-case.test.ts
  lines: 366-430
  why: Contains concurrent task execution tests with errors
  pattern: Testing concurrent workflows with mixed success/failure

- file: src/__tests__/adversarial/prd-compliance.test.ts
  lines: 421-460
  why: Tests concurrent execution with multiple child workflows
  pattern: Execution order tracking for verifying concurrency

# EXTERNAL RESEARCH - Created for this work item
- docfile: plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_RESEARCH.md
  why: Comprehensive Promise.allSettled best practices and migration strategies
  section: "2. Promise.all vs Promise.allSettled: Technical Comparison"

- docfile: plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_QUICK_REF.md
  why: Quick reference for Promise.allSettled implementation
  section: "Groundswell Implementation" (lines 145-182)

# TESTING FRAMEWORK
- file: vitest.config.ts
  why: Test configuration - use vitest for testing
  command: npm test or npm run test:watch

# EXAMPLES - Reference for concurrent patterns
- file: examples/examples/06-concurrent-tasks.ts
  lines: 171, 174, 219
  why: Shows manual Promise.all patterns in example code
  pattern: Fan-out/fan-in pattern for concurrent workflows
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── decorators/
│   │   └── task.ts                    # PRIMARY: Promise.all implementation (line 112)
│   ├── types/
│   │   ├── error-strategy.ts          # ErrorMergeStrategy interface (unused)
│   │   ├── error.ts                   # WorkflowError interface
│   │   └── decorators.ts              # TaskOptions interface
│   ├── __tests__/
│   │   ├── adversarial/
│   │   │   ├── edge-case.test.ts      # Concurrent error tests
│   │   │   ├── prd-compliance.test.ts # Concurrent execution tests
│   │   │   └── deep-analysis.test.ts  # Promise.all usage in tests
│   │   └── helpers/
│   │       └── test-helpers.ts        # Test utilities
│   └── core/
│       └── workflow.ts                # Workflow class with run() method
├── plan/
│   └── 001_d3bb02af4886/
│       ├── bugfix/
│       │   └── architecture/
│       │       ├── error_handling_patterns.md    # EXISTING: Error architecture analysis
│       │       ├── concurrent_execution_best_practices.md
│       │       └── promise_all_analysis.md       # OUTPUT: Create this file
│       └── docs/
│           └── research/
│               ├── PROMISE_ALLSETTLED_RESEARCH.md
│               └── PROMISE_ALLSETTLED_QUICK_REF.md
└── vitest.config.ts                   # Test runner configuration
```

### Desired Codebase Tree (NO CODE CHANGES - Research Only)

```bash
# No new files added - this is a research task
# OUTPUT: plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Current Promise.all implementation (src/decorators/task.ts:112)
// - FAILS FAST on first error
// - Other concurrent workflows continue but results are LOST
// - Only first error is visible to parent
// - No error aggregation exists

// CRITICAL: Workflow.run() returns Promise<unknown>
// - Type is deliberately generic to support any workflow return type
// - Errors thrown in run() are wrapped in WorkflowError by @Step decorator
// - Run method can be async or sync (but should be async)

// CRITICAL: Runnable filtering uses type guard pattern
// - Filters for objects with 'run' method that is a function
// - Does NOT check if workflow is already running
// - Does NOT prevent duplicate workflow execution

// CRITICAL: ErrorMergeStrategy exists but is UNUSED
// - Interface is defined but not implemented
// - No configuration hook in TaskOptions for error strategy
// - PRD specifies "default: disabled" for error merging

// CRITICAL: Child attachment happens BEFORE concurrent execution
// - Lines 91-102: attach children before running
// - Parent-child relationship established regardless of execution success
// - Failed workflows remain attached to parent

// CRITICAL: Concurrent option only affects execution, NOT attachment
// - Children are ALWAYS attached (if they have 'id' property)
// - concurrent: true only calls run() in parallel
// - concurrent: false/undefined returns children without running them
```

---

## Implementation Blueprint

### Research Tasks (ordered by dependencies)

```yaml
Task 1: READ Promise.all implementation
  - LOCATION: src/decorators/task.ts lines 104-114
  - UNDERSTAND: How concurrent workflows are filtered via runnable type guard
  - UNDERSTAND: Promise.all execution with runnable.map((w) => w.run())
  - DOCUMENT: Exact code structure and behavior
  - DEPENDENCIES: None

Task 2: ANALYZE runnable workflow filtering logic
  - LOCATION: src/decorators/task.ts lines 106-109
  - UNDERSTAND: Type guard (w): w is WorkflowClass checks
  - UNDERSTAND: Filter criteria: 'run' in w && typeof w.run === 'function'
  - DOCUMENT: What gets included/excluded from concurrent execution
  - DEPENDENCIES: Task 1

Task 3: TRACE error propagation flow
  - LOCATION: Multiple files
    - src/decorators/step.ts:109-134 (@Step error wrapping)
    - src/core/workflow.ts:470-488 (runFunctional error handling)
    - src/decorators/task.ts:112 (Promise.all error point)
  - UNDERSTAND: How errors flow from @Step through Promise.all to parent
  - UNDERSTAND: What error context is captured (WorkflowError structure)
  - DOCUMENT: Step-by-step error flow with file locations
  - DEPENDENCIES: Task 1

Task 4: IDENTIFY concurrent failure behavior
  - LOCATION: src/decorators/task.ts:112 + test files
  - UNDERSTAND: What happens when ONE concurrent workflow fails
  - UNDERSTAND: What happens to OTHER concurrent workflows
  - UNDERSTAND: Can parent see ALL errors or just FIRST error?
  - REVIEW: src/__tests__/adversarial/edge-case.test.ts lines 366-403
  - DOCUMENT: "First error wins" behavior and its implications
  - DEPENDENCIES: Task 3

Task 5: REVIEW existing ErrorMergeStrategy design
  - LOCATION: src/types/error-strategy.ts
  - UNDERSTAND: Interface structure (enabled, maxMergeDepth, combine)
  - UNDERSTAND: Why it's not used (refer to error_handling_patterns.md)
  - DOCUMENT: Requirements for making it functional
  - DEPENDENCIES: Task 4

Task 6: DOCUMENT Promise.allSettled migration requirements
  - SYNTHESIZE: Findings from Tasks 1-5
  - IDENTIFY: Code changes needed for Promise.allSettled
  - IDENTIFY: Type definitions needed for PromiseSettledResult
  - IDENTIFY: Error aggregation pattern requirements
  - DOCUMENT: Specific implementation requirements for P1.M2.T1.S2
  - DEPENDENCIES: Tasks 1-5

Task 7: CREATE promise_all_analysis.md
  - LOCATION: plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
  - CONTENT: Structure with sections:
    1. Current Implementation Overview
    2. Runnable Workflow Filtering Logic
    3. Error Propagation Flow (step-by-step)
    4. Concurrent Failure Behavior Analysis
    5. Promise.allSettled Migration Requirements
    6. Edge Cases and Gotchas
  - FORMAT: Markdown with code examples and file:line references
  - DEPENDENCIES: Task 6
```

### Research Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: Runnable Workflow Type Guard
// Location: src/decorators/task.ts:106-109
// ============================================

const runnable = workflows.filter(
  (w): w is WorkflowClass =>
    w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
);

// RESEARCH NOTES:
// - (w): w is WorkflowClass is a TYPE PREDICATE (type guard)
// - Returns true if w has a run method that's a function
// - Filters out non-workflow objects (strings, numbers, null, etc.)
// - Does NOT check if workflow is already running
// - Does NOT prevent running same workflow twice

// ============================================
// PATTERN 2: Promise.all Execution
// Location: src/decorators/task.ts:111-113
// ============================================

if (runnable.length > 0) {
  await Promise.all(runnable.map((w) => w.run()));
}

// RESEARCH NOTES:
// - runnable.map((w) => w.run()) creates array of Promise<unknown>
// - Promise.all waits for ALL to resolve OR rejects on FIRST rejection
// - When one rejects: Promise.all immediately throws that error
// - Other in-flight promises continue but results are LOST
// - Parent only sees first error, not all errors

// ============================================
// PATTERN 3: Child Attachment (Before Execution)
// Location: src/decorators/task.ts:91-102
// ============================================

for (const workflow of workflows) {
  if (workflow && typeof workflow === 'object' && 'id' in workflow) {
    const childWf = workflow as WorkflowClass;
    if (!childWf.parent) {
      childWf.parent = wf;
      wf.attachChild(childWf as unknown as WorkflowLike);
    }
  }
}

// RESEARCH NOTES:
// - Attachment happens BEFORE concurrent execution
// - Parent-child relationship established regardless of execution success
// - Only attaches if parent is not already set
// - Uses 'id' property check to identify workflow objects

// ============================================
// PATTERN 4: WorkflowError Structure
// Location: src/types/error.ts
// ============================================

export interface WorkflowError {
  message: string;           // Error message
  original: unknown;         // Original thrown error
  workflowId: string;        // ID of workflow where error occurred
  stack?: string;            // Stack trace if available
  state: SerializedWorkflowState;  // State snapshot at error time
  logs: LogEntry[];          // Logs from failing workflow node
}

// RESEARCH NOTES:
// - Complete context captured at error time
// - Includes workflowId for tracing in hierarchies
// - Preserves original error for root cause analysis
// - State and logs provide debugging context
```

### Integration Points (For Future P1.M2.T1.S2 Implementation)

```yaml
# These are FUTURE considerations - document them in analysis

DECORATOR_OPTIONS:
  - add to: src/types/decorators.ts (TaskOptions interface)
  - future pattern: "errorStrategy?: 'fail-fast' | 'complete-all'"

TASK_DECORATOR:
  - modify: src/decorators/task.ts lines 104-114
  - future pattern: Replace Promise.all with Promise.allSettled when errorStrategy='complete-all'

ERROR_AGGREGATION:
  - use existing: src/types/error-strategy.ts (ErrorMergeStrategy interface)
  - future pattern: Implement combine() function for error merging

TYPE_GUARDS:
  - create: src/utils/promise-utils.ts
  - future pattern: isFulfilled, isRejected type guards for PromiseSettledResult
```

---

## Validation Loop

### Level 1: Document Structure (Immediate Validation)

```bash
# After creating promise_all_analysis.md, verify structure

# Check file exists
test -f plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md || echo "File not created"

# Verify required sections exist
grep -q "Current Implementation Overview" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "Runnable Workflow Filtering Logic" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "Error Propagation Flow" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "Concurrent Failure Behavior" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "Migration Requirements" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "Edge Cases" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Expected: All sections present, zero errors
```

### Level 2: Content Validation (Research Completeness)

```bash
# Verify document includes specific code references

# Check for src/decorators/task.ts line references
grep -q "src/decorators/task.ts" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "line 104" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "line 112" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Check for Promise.all vs Promise.allSettled comparison
grep -q "Promise.all" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "Promise.allSettled" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Check for error flow documentation
grep -q "error propagation" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "WorkflowError" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Check for migration requirements
grep -q "migration" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
grep -q "requirements" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Expected: All content elements present
```

### Level 3: Context Completeness (Usability for Next Task)

```bash
# Verify analysis provides sufficient context for P1.M2.T1.S2

# Check for implementation guidance
grep -q "P1.M2.T1.S2" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Check for type guard information
grep -q "type guard" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Check for gotchas/pitfalls
grep -q "gotcha\|pitfall\|critical" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Check for code examples
grep -q "```typescript\|```ts" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Expected: Document is actionable for implementation
```

### Level 4: Cross-Reference Validation

```bash
# Verify document references existing research

# Check for references to error_handling_patterns.md
grep -q "error_handling_patterns.md" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Check for references to external research
grep -q "PROMISE_ALLSETTLED" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Check for test file references
grep -q "edge-case.test.ts\|prd-compliance.test.ts" plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md

# Expected: Document connects to existing research
```

---

## Final Validation Checklist

### Research Completeness

- [ ] All 7 research tasks completed systematically
- [ ] promise_all_analysis.md created at specified location
- [ ] Document includes all 6 required sections
- [ ] Code snippets include specific file:line references
- [ ] Error flow is documented step-by-step with locations

### Technical Accuracy

- [ ] Promise.all implementation accurately described
- [ ] Runnable filtering logic correctly explained
- [ ] Error propagation flow traces through actual code
- [ ] Concurrent failure behavior matches test observations
- [ ] Migration requirements are actionable

### Context Completeness

- [ ] Document references src/decorators/task.ts:104-114
- [ ] Document references src/types/error-strategy.ts
- [ ] Document references existing test patterns
- [ ] Document connects to error_handling_patterns.md
- [ ] Document links to PROMISE_ALLSETTLED research

### Usability for Next Task

- [ ] P1.M2.T1.S2 implementer can proceed without additional research
- [ ] Code examples are clear and specific
- [ ] Gotchas and pitfalls are highlighted
- [ ] Migration requirements are unambiguous
- [ ] Type guard patterns are documented

---

## Anti-Patterns to Avoid

- ❌ Don't modify any code - this is a RESEARCH task only
- ❌ Don't skip reading the actual source files - documentation can be stale
- ❌ Don't ignore test files - they demonstrate actual behavior
- ❌ Don't create vague analysis - be specific with file:line references
- ❌ Don't document "how to fix" - document "what is and what's needed"
- ❌ Don't assume existing documentation is correct - verify with code
- ❌ Don't forget to document the ERROR FLOW (critical for next task)
- ❌ Don't ignore the ErrorMergeStrategy interface (it exists for a reason)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass research completion

**Validation**: The completed analysis document should enable P1.M2.T1.S2 (implement Promise.allSettled) to proceed without any additional research or clarification.

**Definition of Done**:
1. promise_all_analysis.md exists with all 6 required sections
2. Document answers the 4 questions from Success Definition
3. All code references include specific file paths and line numbers
4. Error flow is traceable through the codebase
5. Next task (P1.M2.T1.S2) can be implemented using only this analysis
