# Product Requirement Prompt (PRP): Add getObservedState Import to workflow-context.ts

**Work Item**: P1.M1.T2.S1
**Title**: Add getObservedState import to workflow-context.ts
**Status**: Ready for Implementation
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Add the `getObservedState` import statement to `workflow-context.ts` to enable the subsequent subtasks (P1.M1.T2.S2 and P1.M1.T2.S3) to fix empty state objects in error handlers.

**Deliverable**: Modified `src/core/workflow-context.ts` with import statement `import { getObservedState } from '../decorators/observed-state.js';` added at the top of the file.

**Success Definition**:
- Import statement is added in the correct location (after existing imports, before class definition)
- Import uses correct relative path (`../decorators/observed-state.js`)
- File compiles without TypeScript errors
- Subsequent subtasks (S2, S3) can successfully use `getObservedState(this.workflow)` in error handlers

---

## User Persona

**Target User**: Developer implementing bug fixes for workflow error handling (typically an AI agent or human developer following the PRP).

**Use Case**: This is the first step in a 4-step bug fix task. The import must be added before the error handlers can be modified to use `getObservedState()`.

**User Journey**:
1. Developer reads this PRP
2. Developer adds the single import line to workflow-context.ts
3. Developer validates with `npm run test` that nothing broke
4. Developer proceeds to P1.M1.T2.S2 (fixing first error handler)

**Pain Points Addressed**:
- Without this import, the code in P1.M1.T2.S2/S3 would fail with "getObservedState is not defined"
- Mirrors the pattern already established in P1.M1.T1.S1 for workflow.ts
- Provides explicit guidance on exact placement to avoid import sorting issues

---

## Why

- **Dependency Setup**: This import is required for P1.M1.T2.S2 and P1.M1.T2.S3, which will replace empty `state: {}` objects with `getObservedState(this.workflow)` calls
- **Pattern Consistency**: Follows the same pattern established in P1.M1.T1.S1 where `getObservedState` was imported into `workflow.ts`
- **Error Handler Fix**: The workflow-context.ts file has 2 error handlers (lines 155-162 and 319-326) with empty state objects that need to be fixed
- **Type Safety**: The import provides the `getObservedState` function signature: `(obj: object): SerializedWorkflowState`

---

## What

Add exactly one import statement to `src/core/workflow-context.ts`:

```typescript
import { getObservedState } from '../decorators/observed-state.js';
```

**Placement**: After line 28 (after `import { createReflectionConfig } from '../types/index.js';`), before line 30 (before the `interface WorkflowLike` declaration).

### Success Criteria

- [ ] Import statement added to `src/core/workflow-context.ts`
- [ ] Import placed after existing imports (lines 8-28)
- [ ] Import uses correct relative path: `../decorators/observed-state.js`
- [ ] File compiles: `npx tsc --noEmit` produces no errors
- [ ] Tests still pass: `npm run test` succeeds
- [ ] Import is ready for use in P1.M1.T2.S2 and P1.M1.T2.S3

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: Yes. This PRP provides:
- Exact file path and line number for the change
- The complete import statement to add
- The correct placement location with context
- Reference to the same change already made in workflow.ts (P1.M1.T1.S1)
- Validation commands to verify the change
- Type information about what's being imported

---

### Documentation & References

```yaml
# MUST READ - Target file to modify
- file: /home/dustin/projects/groundswell/src/core/workflow-context.ts
  why: This is the file that needs the import statement added
  lines: 1-29 (import section)
  pattern: Imports are grouped by purpose: types, then implementations
  critical: Add new import after line 28, before line 30

# MUST READ - Source of the import
- file: /home/dustin/projects/groundswell/src/decorators/observed-state.ts
  why: This exports getObservedState function that we need to import
  lines: 46-77
  pattern: export function getObservedState(obj: object): SerializedWorkflowState
  gotcha: The function returns empty object {} if no @ObservedState fields exist

# REFERENCE - Same change already completed
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Shows the exact import pattern that was added in P1.M1.T1.S1
  lines: 11
  pattern: import { getObservedState } from '../decorators/observed-state.js';
  critical: Use this exact import statement - it's already been validated

# RESEARCH - Context on why this import is needed
- file: /home/dustin/projects/groundswell/plan/docs/bugfix_QUICK_REFERENCE.md
  why: Documents the common pitfall of forgetting imports
  section: "Common Pitfalls #1: Forgetting imports"
  critical: Reminds to add import before using getObservedState

# TYPE DEFINITIONS - What getObservedState returns
- file: /home/dustin/projects/groundswell/src/types/index.ts
  why: Defines SerializedWorkflowState type that getObservedState returns
  pattern: type SerializedWorkflowState = Record<string, unknown>
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts                    # Already has getObservedState import (line 11) - COMPLETED in P1.M1.T1.S1
│   ├── workflow-context.ts            # TARGET FILE - needs import added
│   ├── context.ts
│   ├── event-tree.ts
│   └── logger.ts
├── decorators/
│   ├── observed-state.ts              # Exports getObservedState
│   ├── step.ts
│   └── task.ts
└── types/
    └── index.ts                       # Defines SerializedWorkflowState
```

---

### Desired Codebase Tree

```bash
# No new files - modifying existing file:

src/
└── core/
    └── workflow-context.ts            # MODIFY: Add import at line 29
        # Add: import { getObservedState } from '../decorators/observed-state.js';
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use .js extension in imports
// Even though we're importing from TypeScript files, use .js extension
// This is because the project compiles to JavaScript modules
// CORRECT: import { getObservedState } from '../decorators/observed-state.js';
// WRONG:   import { getObservedState } from '../decorators/observed-state';

// CRITICAL: Import placement matters
// Add the import after line 28, before the interface declaration
// The file groups imports: type imports first, then implementation imports

// CRITICAL: This is a named import, not a default export
// CORRECT: import { getObservedState } from ...
// WRONG:   import getObservedState from ...

// CRITICAL: The function signature
// getObservedState(obj: object): SerializedWorkflowState
// Returns empty object {} if no @ObservedState fields on the object

// CRITICAL: Subsequent usage pattern (for P1.M1.T2.S2/S3)
// In WorkflowContext error handlers, use: getObservedState(this.workflow)
// NOT: getObservedState(this) - this.workflow is the correct parameter

// CRITICAL: This mirrors P1.M1.T1.S1
// The same import was added to workflow.ts at line 11
// Use that as the exact reference pattern
```

---

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ workflow-context.ts import section
  - READ: /home/dustin/projects/groundswell/src/core/workflow-context.ts lines 1-29
  - UNDERSTAND: Import grouping pattern (types first, then implementations)
  - VALIDATION: Confirm file does NOT already have getObservedState import

Task 2: ADD import statement
  - ADD LINE: Line 29 (after existing imports, before interface declaration)
  - CONTENT: import { getObservedState } from '../decorators/observed-state.js';
  - PATTERN: Follow same pattern as workflow.ts line 11

Task 3: VALIDATE compilation
  - RUN: npx tsc --noEmit
  - EXPECTED: No TypeScript errors
  - IF ERRORS: Check import path is correct (../decorators/observed-state.js)

Task 4: VALIDATE tests
  - RUN: npm run test
  - EXPECTED: All tests pass (155+ tests)
  - EXPECTED: No new failures introduced
```

---

### Implementation Code Template

```typescript
// ADD THIS LINE AT LINE 29 in src/core/workflow-context.ts
// Place AFTER: import { createReflectionConfig } from '../types/index.js';
// Place BEFORE: interface WorkflowLike {

import { getObservedState } from '../decorators/observed-state.js';
```

**Context (lines 26-31 showing where to add):**

```typescript
import { ReflectionManager } from '../reflection/reflection.js';
import { createReflectionConfig } from '../types/index.js';
// ADD IMPORT HERE: import { getObservedState } from '../decorators/observed-state.js';

/**
 * Interface for workflow-like objects that can emit events
 */
interface WorkflowLike {
```

---

### Integration Points

```yaml
NO NEW INTEGRATIONS
  - This is an import-only change
  - No function calls added yet (those come in P1.M1.T2.S2 and P1.M1.T2.S3)
  - No changes to runtime behavior
  - No new dependencies

MODIFIED FILES:
  - file: src/core/workflow-context.ts
    action: Add import statement at line 29
    lines_modified: 1 line added

DEPENDS ON:
  - None (this is the first subtask in P1.M1.T2)

ENABLES:
  - P1.M1.T2.S2: Fix first error handler (line 155-162)
  - P1.M1.T2.S3: Fix second error handler (line 319-326)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after adding the import - fix any issues
npx tsc --noEmit                   # Type check the codebase

# Expected: Zero type errors
# If errors: Check that the import path is correct (../decorators/observed-state.js)

# The import should be visible at:
grep -n "getObservedState" /home/dustin/projects/groundswell/src/core/workflow-context.ts
# Expected output: 29:import { getObservedState } from '../decorators/observed-state.js';
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Run all tests to ensure nothing broke
npm run test

# Expected output:
# ✓ 155+ tests pass (same count as before this change)

# Run specific workflow-context related tests
npx vitest run src/__tests__/unit/context.test.ts

# Expected: All context tests pass
```

---

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite
npm run test

# Expected: All tests pass
# No changes to test count (this is import-only, no new functionality)

# Verify the import is accessible
node -e "
import('./src/core/workflow-context.ts').then(m => console.log('Module loaded successfully'))
"
# Expected: No import errors
```

---

### Level 4: Creative & Domain-Specific Validation

```bash
# Domain-specific validation for import changes:

# 1. Verify import is NOT duplicated
grep -c "getObservedState" /home/dustin/projects/groundswell/src/core/workflow-context.ts
# Expected: 1 (only the import we added)

# 2. Verify import path resolution
node -p "
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const resolved = require.resolve('../decorators/observed-state.js', { paths: ['./src/core'] });
console.log(resolved);
"
# Expected: Resolves to /home/dustin/projects/groundswell/src/decorators/observed-state.ts

# 3. Verify import matches workflow.ts pattern
diff <(grep "getObservedState" /home/dustin/projects/groundswell/src/core/workflow.ts) \
     <(grep "getObservedState" /home/dustin/projects/groundswell/src/core/workflow-context.ts)
# Expected: Only whitespace differences (same import statement)

# 4. Verify no circular dependencies
npx tsc --noEmit --graph
# Expected: No circular dependency warnings involving workflow-context.ts and observed-state.ts
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Import statement added to workflow-context.ts
- [ ] TypeScript compiles: `npx tsc --noEmit` succeeds
- [ ] All tests pass: `npm run test`
- [ ] No duplicate imports (grep shows exactly 1 match)
- [ ] Import path uses .js extension

### Feature Validation

- [ ] Import matches the pattern from workflow.ts line 11
- [ ] Import is placed at correct location (after other imports)
- [ ] Import uses named import syntax: `{ getObservedState }`
- [ ] File structure preserved (no other lines modified)

### Code Quality Validation

- [ ] Follows existing import grouping pattern
- [ ] No trailing whitespace added
- [ ] Import line formatted consistently with other imports
- [ ] Ready for use in P1.M1.T2.S2 and P1.M1.T2.S3

---

## Anti-Patterns to Avoid

- ❌ Don't add the import in the middle of existing imports - add after line 28
- ❌ Don't forget the .js extension - use `../decorators/observed-state.js`
- ❌ Don't use default import - must be named: `{ getObservedState }`
- ❌ Don't skip validation - always run `npm run test` after adding imports
- ❌ Don't add this import to other files - only workflow-context.ts needs it
- ❌ Don't add duplicate imports if it already exists (check with grep first)

---

## External Research Summary

This task requires minimal external research as it follows an established pattern within the codebase:

1. **Pattern Reference**: P1.M1.T1.S1 already added this exact import to workflow.ts - follow that pattern

2. **TypeScript Import Best Practice**: Always use `.js` extension in import paths even for TypeScript files (ESM requirement)

3. **Import Organization**: Group imports by purpose - types first, then implementations

---

## Success Metrics

**Confidence Score**: 10/10

**Justification**:
- Single line change, very low complexity
- Exact pattern already established in P1.M1.T1.S1
- Clear file path and line number specified
- Import statement provided verbatim
- Validation commands are straightforward

**Expected Implementation Time**: 2-5 minutes

**Risk Factors**:
- Zero risk: Import-only change, no runtime behavior modification
- No dependencies: This is the first subtask in the sequence
- High confidence: Same change already validated in workflow.ts

**Dependencies**:
- None (this is the first subtask in P1.M1.T2)

**Enables**:
- P1.M1.T2.S2: Fix first error handler (line 155-162)
- P1.M1.T2.S3: Fix second error handler (line 319-326)
- P1.M1.T2.S4: Write test for WorkflowContext error state capture

---

## Appendix: Quick Reference

### Key Files

- **Target file**: `/home/dustin/projects/groundswell/src/core/workflow-context.ts`
- **Add import at**: Line 29 (after existing imports)
- **Reference pattern**: `/home/dustin/projects/groundswell/src/core/workflow.ts` line 11
- **Source module**: `/home/dustin/projects/groundswell/src/decorators/observed-state.ts`

### Commands

```bash
# Type check
npx tsc --noEmit

# Run tests
npm run test

# Verify import added
grep "getObservedState" src/core/workflow-context.ts
```

### Import Statement

```typescript
import { getObservedState } from '../decorators/observed-state.js';
```

---

## Related Tasks

- **P1.M1.T1.S1** (Complete): Added same import to workflow.ts - use as reference
- **P1.M1.T2.S2** (Next): Will use this import in first error handler
- **P1.M1.T2.S3** (After S2): Will use this import in second error handler
- **P1.M1.T2.S4** (Final): Will write tests validating error state capture

---

**PRP Version**: 1.0
**Created**: 2025-01-11
**Status**: Ready for Implementation
