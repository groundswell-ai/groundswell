# Product Requirement Prompt (PRP): Update Step Decorator JSDoc for trackTiming Default

---

## Goal

**Feature Goal**: Update the JSDoc comment for the `trackTiming` option in the `StepOptions` interface to clearly indicate that timing is tracked by default (true) unless explicitly set to false.

**Deliverable**: A single-line JSDoc comment update in `src/types/decorators.ts` line 13.

**Success Definition**:
- [ ] JSDoc comment updated in `src/types/decorators.ts` line 13
- [ ] Comment reads: "Track and emit step duration (default: true, tracked unless explicitly set to false)"
- [ ] No other changes to the codebase
- [ ] Linting passes: `npm run lint`
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] All tests pass (unchanged): `npm test`

---

## User Persona

**Target User**: Implementation agent working on P3.M1.T2.S1 (JSDoc clarity improvement).

**Use Case**: Improving developer experience by making the default behavior of the `trackTiming` option crystal clear in documentation.

**User Journey**:
1. Review Issue 9 context to understand the problem
2. Study JSDoc patterns in the codebase
3. Update the JSDoc comment following established patterns
4. Verify the change with linting and build
5. Confirm no tests need to be updated (documentation-only change)

**Pain Points Addressed**:
- **Unclear Default**: Current JSDoc says "(default: true)" but doesn't explain the "opt-out" pattern
- **Counter-Intuitive Behavior**: Most optional features default to false, but this one defaults to true
- **Performance Awareness**: Users may not realize timing overhead is on by default
- **Documentation Clarity**: Developers need clear documentation about default behaviors

---

## Why

**Business Value and User Impact**:
- Improves developer experience with clearer documentation
- Prevents confusion about timing overhead being on by default
- Makes the "opt-out" pattern explicit and easy to understand
- Reduces time spent debugging performance issues

**Integration with Existing Features**:
- Follows established JSDoc patterns in the codebase
- Builds on documentation from Issue 9
- Consistent with other StepOptions documentation
- No behavioral changes - documentation only

**Problems Solved**:
- **Ambiguous Default**: "(default: true)" doesn't explain the opt-out behavior
- **Performance Surprises**: Users may not know timing is tracked by default
- **DX Friction**: Unclear documentation causes confusion

---

## What

**User-Visible Behavior and Technical Requirements**:

### Documentation Update Requirements

**File to Modify**: `src/types/decorators.ts`
**Line Number**: 13
**Current JSDoc**:
```typescript
/** Track and emit step duration (default: true) */
trackTiming?: boolean;
```

**Proposed JSDoc**:
```typescript
/** Track and emit step duration (default: true, tracked unless explicitly set to false) */
trackTiming?: boolean;
```

### Success Criteria

- [ ] JSDoc comment updated in `src/types/decorators.ts` line 13
- [ ] Comment accurately reflects the implementation (opt-out pattern)
- [ ] Comment follows established codebase patterns
- [ ] No other changes to the file
- [ ] No changes to implementation code
- [ ] No test changes required (documentation-only)
- [ ] Linting passes
- [ ] Build succeeds
- [ ] All tests pass

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file location and line number
- Current JSDoc comment text
- Proposed JSDoc comment text
- Codebase JSDoc pattern conventions
- Implementation behavior context
- Validation commands
- Research files with detailed context

---

### Documentation & References

```yaml
# MUST READ - Implementation context
- file: src/types/decorators.ts
  why: Contains the JSDoc comment that needs updating
  lines: 13 (trackTiming JSDoc comment)
  critical: This is the only line that needs modification

# MUST READ - Implementation behavior
- file: src/decorators/step.ts
  why: Shows the actual implementation that the JSDoc documents
  lines: 133 (if (opts.trackTiming !== false))
  pattern: Shows opt-out pattern - timing tracked unless explicitly false
  critical: Confirms the default behavior is "tracked unless false"

# MUST READ - Codebase JSDoc patterns
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S1/research/jsdoc-patterns-in-codebase.md
  why: Documents JSDoc patterns used throughout the codebase
  section: Pattern 1 (Inline Default in Property Description)
  critical: Shows the (default: value) pattern is standard in this codebase

# MUST READ - Best practices research
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S1/research/jsdoc-best-practices.md
  why: Industry-standard JSDoc patterns for default values
  section: Pattern 2 (Default in Description)
  critical: Shows (default: value) is widely-used pattern

# MUST READ - Issue 9 context
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S1/research/issue-9-context.md
  why: Full context on why this change is needed
  section: Resolution
  critical: Shows proposed JSDoc text matches Issue 9 requirements

# MUST READ - Implementation context
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S1/research/implementation-context.md
  why: Complete implementation context including dependencies
  section: Exact Change Required
  critical: Shows single-line change with exact diff

# MUST READ - Similar JSDoc pattern in codebase
- file: src/types/error-strategy.ts
  why: Shows similar pattern of default + behavioral context
  lines: 7 (default: false, first error wins)
  pattern: Default value plus explanation of default behavior
  critical: Model for adding behavioral context to default value
```

---

### Current Codebase Tree

```bash
src/
├── decorators/
│   ├── index.ts
│   ├── observed-state.ts
│   ├── step.ts                    # Lines 133: trackTiming implementation
│   └── task.ts
├── types/
│   ├── index.ts
│   └── decorators.ts              # Line 13: trackTiming JSDoc to update
└── [other directories unchanged]
```

---

### Desired Codebase Tree with Files to be Modified

```bash
# MODIFIED FILE:

# src/types/decorators.ts
# Line 13: Update JSDoc comment for trackTiming property
# Change: "Track and emit step duration (default: true)"
# To: "Track and emit step duration (default: true, tracked unless explicitly set to false)"
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: This is a documentation-only change
// NO implementation code should be modified
// NO tests should be created or modified

// CRITICAL: trackTiming uses "opt-out" pattern
// Implementation: if (opts.trackTiming !== false)
// This means timing is ON by default, must explicitly pass false to disable
// This is counter-intuitive since most optional features default to false

// CRITICAL: The JSDoc pattern in this codebase
// Pattern: /** Description (default: value) */
// Examples from src/types/decorators.ts:
// - "Track and emit step duration (default: true)"
// - "If true, step can be restarted on failure (default: false)"
// - "Maximum number of retry attempts (default: 3)"

// CRITICAL: Adding behavioral context to default values
// Pattern from src/types/error-strategy.ts:7:
// "Enable error merging (default: false, first error wins)"
// This shows the pattern of adding explanation after the default value

// CRITICAL: Only modify line 13 of src/types/decorators.ts
// Don't modify other JSDoc comments in the same file
// Don't modify the implementation in src/decorators/step.ts
// Don't modify any tests

// CRITICAL: This is Issue 9
// Issue 9 specifically requests making the default "crystal clear"
// The proposed JSDoc explicitly states "tracked unless explicitly set to false"

// CRITICAL: No tests needed
// This is a documentation-only change
// Runtime behavior is unchanged
// Existing tests verify the implementation works correctly

// CRITICAL: Follow existing codebase conventions
// Use "(default: value)" notation
// Add behavioral context in the same sentence
// Keep it concise and readable

// CRITICAL: The StepOptions interface is exported
// File: src/types/decorators.ts
// This is a public API documentation change
// Users of the library will see this JSDoc in their IDE

// CRITICAL: Validation is simple
// Just run lint and build to ensure no errors
// Tests should pass unchanged
// No new test files needed
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - this is a documentation-only change:

```typescript
// BEFORE (src/types/decorators.ts line 13):
/** Track and emit step duration (default: true) */
trackTiming?: boolean;

// AFTER (src/types/decorators.ts line 13):
/** Track and emit step duration (default: true, tracked unless explicitly set to false) */
trackTiming?: boolean;

// Implementation (src/decorators/step.ts line 133) - NO CHANGE:
if (opts.trackTiming !== false) {
  wf.emitEvent({
    type: 'stepEnd',
    node: wf.node,
    step: stepName,
    duration,
  });
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/decorators.ts line 13
  - UPDATE: JSDoc comment for trackTiming property
  - CHANGE FROM: "Track and emit step duration (default: true)"
  - CHANGE TO: "Track and emit step duration (default: true, tracked unless explicitly set to false)"
  - PATTERN: Follow (default: value) pattern from codebase
  - PLACEMENT: src/types/decorators.ts line 13

Task 2: VERIFY change with git diff
  - COMMAND: git diff src/types/decorators.ts
  - VERIFY: Only line 13 changed
  - VERIFY: Only JSDoc comment changed, nothing else

Task 3: RUN linter
  - COMMAND: npm run lint
  - EXPECTED: No errors (documentation-only change)
  - FIX: Any linting issues if they arise (unlikely)

Task 4: RUN build
  - COMMAND: npm run build
  - EXPECTED: No type errors (documentation-only change)
  - FIX: Any type errors if they arise (unlikely)

Task 5: RUN tests
  - COMMAND: npm test
  - EXPECTED: All tests pass (documentation-only change)
  - VERIFY: No test changes needed
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN: JSDoc for boolean properties with default values
// File: src/types/decorators.ts

// Current (line 13):
/** Track and emit step duration (default: true) */
trackTiming?: boolean;

// Proposed (line 13):
/** Track and emit step duration (default: true, tracked unless explicitly set to false) */
trackTiming?: boolean;

// PATTERN: Adding behavioral context to defaults (from error-strategy.ts)
// File: src/types/error-strategy.ts line 7
/** Enable error merging (default: false, first error wins) */
enabled: boolean;

// PATTERN: Other StepOptions defaults for reference
// File: src/types/decorators.ts
/** If true, step can be restarted on failure (default: false) */
restartable?: boolean;
/** Maximum number of retry attempts (default: 3) */
maxRetries?: number;
/** Delay between retry attempts in milliseconds (default: 1000) */
retryDelayMs?: number;

// GOTCHA 1: This is a documentation-only change
// Don't modify any implementation code
// Don't create or modify tests
// Don't change any other JSDoc comments

// GOTCHA 2: trackTiming uses opt-out pattern
// Implementation: if (opts.trackTiming !== false)
// Means: true by default, must pass false to disable
// This is different from most optional features (default to false)

// GOTCHA 3: The JSDoc must match the implementation
// Implementation shows timing is tracked unless explicitly false
// JSDoc should say "tracked unless explicitly set to false"
// This makes the opt-out pattern crystal clear

// GOTCHA 4: Follow existing codebase conventions
// Use "(default: value)" notation
// Add behavioral context in same sentence
// Keep it concise and readable

// GOTCHA 5: Only modify line 13
// Don't modify other JSDoc comments in the file
// Don't reformat the entire file
// Single-line change only

// GOTCHA 6: No tests needed
// Documentation-only change
// Runtime behavior unchanged
// Existing tests verify implementation

// GOTCHA 7: This is a public API documentation change
// StepOptions is exported and used by library users
// IDEs will show this JSDoc in autocomplete
// Clarity matters for developer experience
```

---

### Integration Points

```yaml
NO INTEGRATION POINTS:
  - This is a standalone documentation change
  - No dependencies on other work items
  - No integration with other components
  - No configuration changes
  - No test changes

RELATED FILES (No Changes Needed):
  - src/decorators/step.ts:133 - Implementation (correct as-is)
  - src/types/index.ts - Re-exports StepOptions (no change needed)
  - PRD.md - Contains trackTiming docs (no change needed for this item)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Verify the change with git diff
git diff src/types/decorators.ts

# Expected output:
# - /** Track and emit step duration (default: true) */
# + /** Track and emit step duration (default: true, tracked unless explicitly set to false) */

# Run linter
npm run lint

# Expected: No errors (documentation-only change)
# If errors exist, READ output and fix before proceeding
```

### Level 2: TypeScript Compilation (Component Validation)

```bash
# Run TypeScript compiler
npm run build

# Expected: No type errors (documentation-only change)
# If errors exist, READ output and fix before proceeding
```

### Level 3: Tests (System Validation)

```bash
# Run full test suite
npm test

# Expected: All tests pass (documentation-only change)
# No test modifications needed

# Verify test count unchanged
# Expected: Same number of tests as before
```

### Level 4: Review and Confirm (Final Validation)

```bash
# Review the change one more time
git diff src/types/decorators.ts

# Confirm:
# - Only line 13 changed
# - Only JSDoc comment changed
# - No implementation code changed
# - No test files changed
# - Change matches Issue 9 requirements
```

---

## Final Validation Checklist

### Technical Validation

- [ ] JSDoc comment updated in `src/types/decorators.ts` line 13
- [ ] Comment reads: "Track and emit step duration (default: true, tracked unless explicitly set to false)"
- [ ] No other lines changed in the file
- [ ] No other files modified
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass: `npm test`

### Feature Validation

- [ ] JSDoc accurately reflects implementation (opt-out pattern)
- [ ] JSDoc follows established codebase patterns
- [ ] JSDoc matches Issue 9 requirements
- [ ] Default value clearly stated as "(default: true)"
- [ ] Behavioral context clearly states "tracked unless explicitly set to false"

### Code Quality Validation

- [ ] Only documentation modified (no code changes)
- [ ] Follows existing JSDoc patterns in codebase
- [ ] Concise and readable
- [ ] No test changes (documentation-only)
- [ ] No breaking changes (public API documentation)

### Documentation & Deployment

- [ ] Change addresses Issue 9 completely
- [ ] No additional documentation updates needed
- [ ] No migration notes needed (no behavior change)

---

## Anti-Patterns to Avoid

- ❌ Don't modify the implementation in `src/decorators/step.ts`
- ❌ Don't create tests for a documentation-only change
- ❌ Don't modify other JSDoc comments in the same file
- ❌ Don't modify the PRD.md file
- ❌ Don't reformat the entire file (only change the specific JSDoc comment)
- ❌ Don't change the behavior or add new features
- ❌ Don't modify any test files
- ❌ Don't skip validation steps (lint, build, test)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Simple single-line documentation change
- ✅ Clear deliverable (update one JSDoc comment)
- ✅ Complete context provided (exact line, current text, proposed text)
- ✅ Comprehensive validation commands
- ✅ No external dependencies needed
- ✅ No test writing required (documentation-only)
- ✅ Research provides concrete patterns to follow
- ✅ Implementation behavior well-documented
- ✅ Edge cases well-defined (none for documentation change)
- ✅ Issue 9 requirements fully captured

**Validation**: This is a straightforward documentation update. The change is a single JSDoc comment line. All context is provided including exact file location, current text, proposed text, codebase patterns, and validation commands. This is one of the simplest possible PRP implementations - just editing one line of documentation. Maximum confidence for one-pass implementation.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
