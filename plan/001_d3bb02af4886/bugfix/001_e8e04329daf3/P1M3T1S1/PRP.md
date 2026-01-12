# Product Requirement Prompt (PRP): Find All Console.error Calls for Observer Errors

**Work Item**: P1.M3.T1.S1 - Find all console.error calls for observer errors
**PRD Reference**: Task P1.M3.T1 from plan/001_d3bb02af4886/bug_fix_tasks.json
**Implementation Target**: src/ directory (research task - no code changes)

---

## Goal

**Feature Goal**: Create a comprehensive inventory of all `console.error` calls in the codebase with precise categorization into observer-related vs other purposes, enabling the subsequent replacement task (P1.M3.T1.S2) to proceed with complete information.

**Deliverable**: A categorized list document (`console_error_inventory.md`) containing:
1. All console.error call locations with exact file paths and line numbers
2. Categorization: observer-related vs other purpose
3. Context for each call (method/function, what error is being logged)
4. Code snippets showing the surrounding context

**Success Definition**: The inventory enables the next subtask (P1.M3.T1.S2) to replace observer error console.error calls with logger.error() by:
- Providing exact locations of all observer-related console.error calls
- Distinguishing observer errors from validation/structural errors that should remain as console.error
- Including sufficient context to understand proper replacement patterns

## User Persona

**Target User**: Developer implementing the console.error replacement (P1.M3.T1.S2) and QA validating the fix (P1.M3.T1.S3)

**Use Case**: Understanding the complete landscape of console.error usage before implementing systematic replacement

**User Journey**:
1. Read this PRP to understand the research scope
2. Examine the generated console_error_inventory.md
3. Use findings to implement targeted replacement of only observer-related console.error calls
4. Validate that non-observer console.error calls remain unchanged

**Pain Points Addressed**:
- Uncertainty about which console.error calls should be replaced vs preserved
- Risk of accidentally removing console.error for structural validation errors
- Missing observer error locations that would cause inconsistent logging

## Why

- **Issue 5 Resolution**: Bug report Issue 5 identifies that observer errors use console.error instead of the structured WorkflowLogger
- **Logging Consistency**: Observer errors should go through the same logging infrastructure as other workflow events
- **Testability**: Replacing console.error with logger.error enables proper testing and mocking of observer error behavior
- **Production Readiness**: Structured logging with WorkflowLogger provides timestamps, workflow context, and observer metadata

## What

### Success Criteria

- [ ] Inventory document created at `plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T1S1/research/console_error_inventory.md`
- [ ] All console.error calls in src/ directory documented with file path and line number
- [ ] Each call categorized as observer-related or other purpose
- [ ] Observer-related calls identified for replacement in P1.M3.T1.S2
- [ ] Non-observer calls documented with rationale for preservation

---

## All Needed Context

### Context Completeness Check

_This PRP passes the "No Prior Knowledge" test - someone unfamiliar with the codebase would have everything needed to complete this research task successfully._

### Documentation & References

```yaml
# MUST READ - Bug Fix Tasks
- file: plan/001_d3bb02af4886/bug_fix_tasks.json
  why: Contains P1.M3.T1 task definition and contract for console.error research
  critical: Defines the research scope (observer errors) and expected output format
  section: Lines 221-256 define Task P1.M3.T1 and its subtasks

# CRITICAL - Known Locations (from Issue 5 and codebase_structure.md)
- file: src/core/workflow.ts
  why: Contains console.error calls at lines 277, 286, 376, 394
  gotcha: Mix of observer-related (376, 394) and validation errors (277, 286) - must categorize correctly

- file: src/core/logger.ts
  why: Contains console.error call at line 27 for observer onLog errors
  pattern: Error isolation pattern for observer callbacks

- file: src/utils/observable.ts
  why: Contains console.error calls at lines 39, 52, 65 for subscriber error handling
  pattern: Observable pattern with error isolation for subscriber callbacks

# CRITICAL - Architecture Documentation
- docfile: plan/001_d3bb02af4886/bugfix/architecture/codebase_structure.md
  why: Validated locations of console.error and observer pattern implementation details
  section: "Bug Report Claims" section validates Issue 5 claims about observer errors

- docfile: plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md
  why: Error handling patterns explaining why observer errors need special handling
  section: Observer error isolation and logging requirements

# CRITICAL - Observer Interface Definition
- file: src/types/observer.ts
  why: Defines WorkflowObserver interface with onLog, onEvent, onStateUpdated, onTreeChanged callbacks
  pattern: All four observer callbacks can throw errors that need to be caught and logged

# REFERENCE - Logger Implementation
- file: src/core/logger.ts
  why: WorkflowLogger class with error() method for structured logging
  pattern: this.logger.error(message, data) provides context-aware error logging

# REFERENCE - Test Patterns
- file: src/__tests__/adversarial/edge-case.test.ts
  why: Contains existing test patterns for error handling validation
  pattern: Uses vi.spyOn(console, 'error') for mocking console output

# REFERENCE - External Research
- url: https://blog.logrocket.com/async-await-typescript/
  why: Error handling patterns in TypeScript async contexts
  critical: Observer callbacks may be async, requiring proper error handling

- url: https://hupp.tech/blog/typescript/typescript-error-handling-tips-and-best-practices/
  why: TypeScript error handling best practices for observer patterns
  critical: Why console.error is problematic vs structured logging
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts              # TARGET FILE - console.error at 277, 286, 376, 394
│   ├── logger.ts                # TARGET FILE - console.error at 27
│   ├── agent.ts
│   ├── prompt.ts
│   └── index.ts
├── types/
│   ├── observer.ts              # WorkflowObserver interface definition
│   ├── logging.ts               # LogEntry, LogLevel definitions
│   └── workflow.ts              # WorkflowNode interface
├── utils/
│   ├── observable.ts            # TARGET FILE - console.error at 39, 52, 65
│   └── id.ts
├── decorators/
│   ├── task.ts
│   └── step.ts
├── debugger/
│   └── tree-debugger.ts
└── __tests__/
    ├── unit/
    ├── integration/
    └── adversarial/
        └── edge-case.test.ts    # Test patterns for validation
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Not all console.error calls are observer-related
// Lines 277, 286 in workflow.ts are VALIDATION errors before throwing
// These should NOT be replaced with logger.error

// CRITICAL: Observable class errors (observable.ts) may not have access to WorkflowLogger
// Lines 39, 52, 65 in observable.ts are in a standalone Observable utility class
// May need logger injection pattern for P1.M3.T1.S2

// CRITICAL: Observer error isolation is intentional
// All observer callbacks are wrapped in try-catch to prevent workflow crashes
// The console.error is for logging ONLY - workflow continues after error

// GOTCHA: Workflow class has this.logger property but Observable class does not
// src/core/workflow.ts calls can use this.logger.error()
// src/utils/observable.ts will need different approach (injection or fallback)

// PATTERN: Observer callbacks that can throw errors:
// - obs.onLog(entry)      - In WorkflowLogger.emit() at line 27
// - obs.onEvent(event)    - In Workflow.emitEvent() at line 376
// - obs.onStateUpdated(node) - In Workflow.snapshotState() at line 394
// - subscriber.next(value)   - In Observable.next() at line 39
// - subscriber.error(err)    - In Observable.error() at line 52
// - subscriber.complete()    - In Observable.complete() at line 65

// GOTCHA: Validation errors (workflow.ts:277, 286) log before throwing
// These are structural errors that halt execution
// They use console.error for immediate visibility before exception propagation
```

---

## Implementation Blueprint

### Research Task Breakdown

This is a **research-only task**. No code changes should be made.

The inventory document should follow this structure:

```markdown
# Console.error Call Inventory

## Executive Summary
- Total console.error calls found: X
- Observer-related: Y
- Other purpose: Z

## Observer-Related Console.error Calls

### 1. src/core/logger.ts:27
**Method**: WorkflowLogger.emit()
**Error Type**: Observer onLog callback error
**Context**: Emitting log entries to observers
```typescript
try {
  obs.onLog(entry);
} catch (err) {
  console.error('Observer onLog error:', err);
}
```
**Categorization**: Observer-related - REPLACE in P1.M3.T1.S2
**Replacement Pattern**: `this.logger.error('Observer onLog error', { error: err })`

### 2. src/core/workflow.ts:376
[... same pattern for each observer-related call ...]

## Other Purpose Console.error Calls

### 1. src/core/workflow.ts:277
**Method**: Workflow.attachChild()
**Error Type**: Validation error - child already has parent
**Context**: Structural validation before throwing exception
```typescript
const errorMessage = `Child '${childName}' already has a parent '${existingParentName}'. ...`;
console.error(errorMessage);
throw new Error(errorMessage);
```
**Categorization**: Other purpose - DO NOT REPLACE
**Rationale**: Validation error that immediately throws; console.error provides visibility before stack trace

### 2. src/core/workflow.ts:286
[... same pattern for validation error ...]

## Replacement Recommendations

### Observer-Related Calls (Replace with logger.error)
- src/core/logger.ts:27
- src/core/workflow.ts:376
- src/core/workflow.ts:394
- src/utils/observable.ts:39
- src/utils/observable.ts:52
- src/utils/observable.ts:65

### Validation Errors (Preserve as console.error)
- src/core/workflow.ts:277 - Structural validation
- src/core/workflow.ts:286 - Circular reference detection

## Implementation Notes for P1.M3.T1.S2

1. Workflow class calls can use `this.logger.error()`
2. Observable class may need logger injection pattern
3. Preserve error isolation - observer errors should not crash workflows
4. Add error context: observer type, event type, error details
```

### Implementation Patterns & Key Details

```typescript
// PATTERN: Observer error handling (current - to be replaced)
try {
  obs.onEvent(event);
} catch (err) {
  console.error('Observer onEvent error:', err);
}

// PATTERN: Observer error handling (target for P1.M3.T1.S2)
try {
  obs.onEvent(event);
} catch (err) {
  this.logger.error('Observer onEvent error', {
    error: err,
    observerType: obs.constructor.name,
    eventType: event.type,
    workflowId: this.node.id
  });
}

// PATTERN: Validation error handling (preserve - do NOT replace)
const errorMessage = `Child '${childName}' already has a parent '${existingParentName}'. ...`;
console.error(errorMessage);
throw new Error(errorMessage);
// Rationale: Console output provides immediate visibility before exception

// GOTCHA: Observable class logger injection (for P1.M3.T1.S2)
export class Observable<T> {
  private logger?: { error: (msg: string, data?: unknown) => void };

  constructor(logger?: { error: (msg: string, data?: unknown) => void }) {
    this.logger = logger;
  }

  next(value: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.next?.(value);
      } catch (err) {
        this.logger?.error('Observable subscriber error', { error: err });
        if (!this.logger) console.error('Observable subscriber error:', err);
      }
    }
  }
}
```

### Integration Points

```yaml
NO CODE CHANGES - This is a research task only.

OUTPUT:
  - create: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T1S1/research/console_error_inventory.md
  - content: Inventory document following the structure above

SEARCH TOOLS:
  - use: Grep tool with pattern 'console.error' in src/ directory
  - filter: Exclude test files (src/__tests__/) - only production code
  - context: Extract 5 lines before and after each match for context

CATEGORIZATION CRITERIA:
  - observer_related: Call is in try-catch around observer/subscriber callback
  - other_purpose: Call is for validation, structural errors, or before throwing exception

FOLLOW-UP:
  - next_task: P1.M3.T1.S2 (Replace observer error console.error with logger.error)
  - next_task: P1.M3.T1.S3 (Add tests for observer error logging)
```

---

## Validation Loop

### Level 1: Search Completeness (Immediate Validation)

```bash
# After completing search, verify no console.error calls were missed
grep -rn "console\.error" src/ --exclude-dir=__tests__ | wc -l

# Expected: At least 8 calls found in production code
# Compare with inventory document count
```

### Level 2: Categorization Accuracy (Verification)

```bash
# Verify observer-related calls are correctly categorized
# Observer calls will be in try-catch blocks around observer/subscriber methods
grep -A 3 "console\.error.*observer" src/

# Verify validation errors are correctly categorized
# Validation calls will be followed by "throw new Error()"
grep -B 1 -A 1 "console\.error.*errorMessage" src/

# Expected: All categorizations match code context
```

### Level 3: Document Quality (Review)

```markdown
Review checklist:
- [ ] All console.error calls are documented with file path and line number
- [ ] Each call includes the containing method/function name
- [ ] Categorization (observer-related vs other) is clearly stated
- [ ] Code snippets show the surrounding context (try-catch, throw, etc.)
- [ ] Replacement recommendations section provides clear guidance for P1.M3.T1.S2
- [ ] Document follows the specified structure
- [ ] Non-observer calls include rationale for preservation
```

### Level 4: Handoff Readiness

```bash
# Verify the document enables the next task
grep -i "observer-related" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T1S1/research/console_error_inventory.md | wc -l

# Expected: At least 6 observer-related calls identified
# Next task should be able to proceed without additional research
```

---

## Final Validation Checklist

### Research Validation

- [ ] Grep search for 'console.error' executed in src/ directory
- [ ] Test files (src/__tests__//) excluded from search results
- [ ] Each matching file read to understand context
- [ ] All console.error calls categorized as observer-related or other purpose
- [ ] Code snippets extracted showing surrounding context
- [ ] File paths and line numbers verified for accuracy

### Document Quality Validation

- [ ] Inventory document created at correct path
- [ ] Executive summary provides total counts
- [ ] Observer-related calls section includes all 6 expected calls
- [ ] Other purpose calls section includes validation errors
- [ ] Each call has: file path, line number, method, error type, context, categorization
- [ ] Replacement recommendations section clearly identifies which calls to replace
- [ ] Implementation notes provide guidance for P1.M3.T1.S2

### Handoff Validation

- [ ] Document location is correct and accessible
- [ ] All file references include exact paths and line numbers
- [ ] Next task (P1.M3.T1.S2) can proceed with only this document + codebase access
- [ ] No additional research should be required for implementation
- [ ] Categorization logic is clear and reproducible

---

## Anti-Patterns to Avoid

- [ ] Don't make any code changes - this is a research-only task
- [ ] Don't include test file console.error calls (those are mock assertions, not actual code)
- [ ] Don't categorize based solely on message text - examine code context
- [ ] Don't skip validation errors - document why they shouldn't be replaced
- [ ] Don't forget the Observable class - it has 3 console.error calls that are observer-related
- [ ] Don't assume all console.error in workflow.ts are observer-related - lines 277, 286 are validation
- [ ] Don't omit line numbers - exact locations are critical for the replacement task
- [ ] Don't forget to provide replacement pattern recommendations for P1.M3.T1.S2

---

## Appendix: Quick Reference

### Key File Locations

| File | Lines | Call Type | Categorization |
|------|-------|-----------|----------------|
| src/core/logger.ts | 27 | Observer onLog error | Observer-related |
| src/core/workflow.ts | 277 | Validation error | Other purpose |
| src/core/workflow.ts | 286 | Validation error | Other purpose |
| src/core/workflow.ts | 376 | Observer onEvent error | Observer-related |
| src/core/workflow.ts | 394 | Observer onStateUpdated error | Observer-related |
| src/utils/observable.ts | 39 | Subscriber next error | Observer-related |
| src/utils/observable.ts | 52 | Subscriber error handler failure | Observer-related |
| src/utils/observable.ts | 65 | Subscriber complete failure | Observer-related |

### Observer Interface

```typescript
export interface WorkflowObserver {
  onLog(entry: LogEntry): void;           // Can throw - src/core/logger.ts:27
  onEvent(event: WorkflowEvent): void;    // Can throw - src/core/workflow.ts:376
  onStateUpdated(node: WorkflowNode): void;  // Can throw - src/core/workflow.ts:394
  onTreeChanged(root: WorkflowNode): void;   // No console.error (safe implementation)
}

export interface Observer<T> {
  next?(value: T): void | Promise<void>;   // Can throw - src/utils/observable.ts:39
  error?(err: unknown): void | Promise<void>;  // Can throw - src/utils/observable.ts:52
  complete?(): void | Promise<void>;       // Can throw - src/utils/observable.ts:65
}
```

### Expected Inventory Totals

Based on codebase analysis:

- **Total console.error calls**: 8
- **Observer-related**: 6 (to be replaced in P1.M3.T1.S2)
- **Other purpose**: 2 (validation errors to preserve)

### Observer Error Categories

1. **WorkflowObserver callbacks** (3 calls):
   - onLog errors in WorkflowLogger.emit()
   - onEvent errors in Workflow.emitEvent()
   - onStateUpdated errors in Workflow.snapshotState()

2. **Observable subscriber callbacks** (3 calls):
   - next() errors in Observable.next()
   - error() handler failures in Observable.error()
   - complete() failures in Observable.complete()

3. **Validation errors** (2 calls - preserve as console.error):
   - Child already has parent validation
   - Circular reference detection

---

## Confidence Score

**8/10** - High confidence for one-pass research success

**Rationale**:
- All necessary context has been gathered and documented
- Research boundaries are clear (observer-related vs other purpose)
- Expected totals are known (8 total, 6 observer-related)
- Output format is well-specified
- Only potential gap: New console.error calls added after research documentation
