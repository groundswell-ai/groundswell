# Product Requirement Prompt (PRP): Document @Task Decorator Lenient Validation Behavior

**Work Item**: P1.M3.T2.S1
**Issue Reference**: ANALYSIS_PRD_VS_IMPLEMENTATION.md Issue #5
**Points**: 1
**Type**: Documentation

---

## Goal

**Feature Goal**: Add JSDoc documentation to the `@Task` decorator explaining its lenient validation behavior for non-Workflow return values.

**Deliverable**: Updated JSDoc comments in `src/decorators/task.ts` and `src/types/decorators.ts` that clearly document the decorator's lenient validation approach and its rationale.

**Success Definition**:
- JSDoc comments added to `@Task` decorator function explaining validation behavior
- JSDoc comments added to `TaskOptions` interface documenting lenient behavior
- README.md updated with @Task validation behavior documentation (task P1.M3.T2.S2)
- Documentation clearly explains the difference from PRD-specified strict validation
- Code examples demonstrate both valid and edge-case return scenarios

## User Persona

**Target User**: TypeScript developers using the groundswell workflow engine who implement `@Task` decorated methods in their workflow classes.

**Use Case**: Developers need to understand why the `@Task` decorator doesn't throw errors when returning non-Workflow values, and how to properly structure their task methods.

**User Journey**:
1. Developer reads the `@Task` decorator JSDoc
2. Developer understands the lenient validation design
3. Developer optionally reads the rationale for why it's lenient
4. Developer implements task methods with confidence, knowing edge cases are handled gracefully

**Pain Points Addressed**:
- **Confusion**: PRD specified strict validation but implementation is lenient
- **Silent failures**: Non-Workflow returns are skipped without error, which could be confusing
- **Debugging difficulty**: Without documentation, developers may not understand why their task isn't attaching workflows

## Why

- **Aligns documentation with implementation**: The PRD specified throwing errors for non-Workflow returns, but the implementation uses lenient validation. This documents the actual behavior.
- **Reduces developer confusion**: Developers reading the code will understand why non-Workflow returns don't throw errors.
- **Clarifies design intent**: The lenient approach enables duck-typing flexibility and allows working with workflow-like objects.
- **Completes P1.M3 task set**: This is the first of two documentation tasks for @Task (P1.M3.T2), following the pattern established for @Step in P1.M3.T1.

## What

Add JSDoc comments explaining the `@Task` decorator's lenient validation behavior:

1. **@Task decorator JSDoc**: Add a "Validation Behavior" section explaining that non-Workflow returns are silently skipped
2. **TaskOptions interface JSDoc**: Consider adding a note about the lenient approach to the interface documentation
3. **Code examples**: Include examples showing:
   - Standard usage returning Workflow/Workflow[]
   - Edge case: method returning non-workflow values (what happens and why)
   - Best practices for task method signatures

### Success Criteria

- [ ] JSDoc added to `@Task` decorator function in `src/decorators/task.ts`
- [ ] JSDoc explains lenient validation behavior clearly
- [ ] JSDoc includes rationale for lenient approach (duck-typing flexibility)
- [ ] Code examples demonstrate both normal and edge-case scenarios
- [ ] Documentation passes TypeScript JSDoc validation
- [ ] Pattern follows existing JSDoc style from `@Step` decorator (P1.M3.T1.S1)

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: ✅ PASS

A developer unfamiliar with this codebase would have everything needed to implement this documentation change:
- Exact file paths and line numbers for modifications
- Complete existing JSDoc patterns to follow
- The lenient validation code logic explained
- Examples of similar JSDoc from the codebase
- External best practices references

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: file:///home/dustin/projects/groundswell/plan/docs/bugfix/ANALYSIS_PRD_VS_IMPLEMENTATION.md
  section: "Issue 5: @Task Decorator Silently Ignores Non-Workflow Returns (lines 494-577)"
  why: Explains the PRD vs implementation gap and the rationale for lenient validation
  critical: The analysis concludes this is an INTENTIONAL design decision, not a bug. Key insight: "Duck typing: The implementation uses structural typing ('id' in workflow) rather than nominal typing (instanceof Workflow)"

- file: src/decorators/task.ts
  why: Contains the @Task decorator implementation with lenient validation logic
  pattern: Lines 59-70 show the type guard that silently skips non-workflow objects
  gotcha: The decorator already has basic JSDoc (lines 18-32), but doesn't explain validation behavior

- file: src/types/decorators.ts
  why: Contains TaskOptions interface that needs JSDoc enhancement
  pattern: Lines 17-25 show TaskOptions with basic property JSDoc
  gotcha: Consider adding a behavior note to the interface-level JSDoc

- file: src/decorators/step.ts
  why: Reference pattern for decorator JSDoc from P1.M3.T1.S1
  pattern: Lines 1-36 show the @Step decorator JSDoc format
  gotcha: The trackTiming JSDoc (line 10) shows how to document default values: "Track and emit step duration (default: true)"

- docfile: plan/bugfix/P1M3T2S1/research/jsdoc_best_practices.md
  why: External research on JSDoc best practices for decorators
  section: "Documenting Lenient vs Strict Behavior" (lines 138-169)
  critical: Provides template patterns for documenting validation behavior nuances

- url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
  why: Official TypeScript JSDoc reference for syntax validation
  critical: Ensures JSDoc syntax is correct and IDE-friendly
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── decorators/
│   ├── index.ts
│   ├── observed-state.ts
│   ├── step.ts          # Reference for JSDoc pattern (P1.M3.T1.S1)
│   └── task.ts          # PRIMARY FILE: Add JSDoc here (lines 18-32)
└── types/
    └── decorators.ts    # PRIMARY FILE: Enhance TaskOptions JSDoc (lines 17-25)
```

### Files to Modify

```bash
# Existing files to edit (no new files needed)
src/decorators/task.ts          # Add validation behavior documentation to @Task JSDoc
src/types/decorators.ts         # Add behavior note to TaskOptions interface JSDoc
```

### Known Gotchas of our Codebase & Library Quirks

```typescript
// CRITICAL: JSDoc placement matters for IDE tooltips
// - Decorator function JSDoc (lines 18-32 in task.ts) shows when hovering over @Task usage
// - Interface JSDoc (lines 17-25 in decorators.ts) shows when hovering over TaskOptions type

// PATTERN: Follow existing JSDoc style from codebase (see step.ts)
// - Multi-line JSDoc block with /** opening
// - No @param or @returns tags for decorator functions
// - @example section with complete code
// - Short, concise descriptions

// GOTCHA: Don't use @throws or @error tags
// The lenient behavior is specifically designed NOT to throw, so documenting throws would be misleading

// CRITICAL: The lenient validation is in lines 59-70 of task.ts:
// for (const workflow of workflows) {
//   if (workflow && typeof workflow === 'object' && 'id' in workflow) {
//     // Only processes objects with 'id' property
//   }
//   // Silently skips anything that doesn't match the type guard
// }

// TYPE GUARD PATTERN: Uses structural typing (duck typing)
// if (workflow && typeof workflow === 'object' && 'id' in workflow)
// This allows workflow-like objects, not just Workflow instances

// RATIONALE: Lenient approach enables:
// 1. Duck-typing flexibility (works with workflow-like objects)
// 2. Graceful handling of edge cases (null, undefined, primitives)
// 3. TypeScript compile-time type checking already catches obvious errors
// 4. Methods can return any type without breaking the decorator
```

## Implementation Blueprint

### Data Models and Structure

No data model changes - this is a documentation-only task.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ src/decorators/task.ts lines 18-96
  - UNDERSTAND: Current @Task decorator implementation
  - IDENTIFY: Lenient validation logic at lines 59-70
  - NOTE: Type guard pattern: 'id' in workflow check
  - PLACEMENT: Decorator file in src/decorators/

Task 2: READ src/decorators/step.ts lines 1-36
  - EXTRACT: JSDoc pattern from @Step decorator (P1.M3.T1.S1)
  - FOLLOW: Multi-line JSDoc format with @example section
  - NOTE: No @param/@returns tags for decorators
  - PATTERN: Concise description + @example

Task 3: MODIFY src/decorators/task.ts JSDoc (lines 18-32)
  - ADD: "Validation Behavior" section after the main description
  - DOCUMENT: Lenient type guard that silently skips non-workflow objects
  - EXPLAIN: Rationale - duck-typing flexibility, graceful edge case handling
  - PRESERVE: Existing @example section with concurrent: true usage
  - ADD: New @example showing non-workflow return scenario
  - NAMING: Follow existing JSDoc formatting (indentation, line breaks)

Task 4: MODIFY src/types/decorators.ts TaskOptions JSDoc (lines 17-25)
  - REVIEW: Interface-level JSDoc comment (line 17-18)
  - CONSIDER: Adding behavior note about lenient validation
  - ALTERNATIVE: Keep interface JSDoc minimal (current approach)
  - DECISION: Add only if it adds value beyond decorator JSDoc

Task 5: VERIFY TypeScript JSDoc syntax
  - RUN: npx tsc --noEmit to check for JSDoc syntax errors
  - CHECK: IDE tooltip displays JSDoc correctly
  - VALIDATE: @example code is syntactically valid TypeScript

Task 6: DOCUMENT for next task (P1.M3.T2.S2)
  - NOTE: README.md updates are in P1.M3.T2.S2 (separate task)
  - REFERENCE: @Step README pattern (lines 116-154 in README.md)
  - PREPARE: @Task section should follow same structure
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// PATTERN: @Task Decorator JSDoc Structure
// ============================================================================

/**
 * @Task decorator
 * Wraps a method that returns child workflow(s), automatically attaching them
 *
 * @example
 * class ParentWorkflow extends Workflow {
 *   @Task({ concurrent: true })
 *   async createChildren(): Promise<ChildWorkflow[]> {
 *     return [
 *       new ChildWorkflow('child1', this),
 *       new ChildWorkflow('child2', this),
 *     ];
 *   }
 * }
 *
 * @ValidationBehavior
 *
 * The decorator uses lenient validation for return values:
 * - Workflow objects (with 'id' property) are automatically attached
 * - Non-workflow objects are silently skipped (not attached)
 * - The original return value is always preserved
 *
 * This lenient approach enables:
 * - Duck-typing: Works with workflow-like objects, not just Workflow instances
 * - Flexible signatures: Methods can return any type without breaking
 * - Graceful handling: Edge cases (null, undefined, primitives) don't throw errors
 *
 * @example Non-workflow return (silently skipped)
 * class MyWorkflow extends Workflow {
 *   @Task()
 *   async returnsString(): Promise<string> {
 *     return 'not a workflow';  // Returned as-is, not attached
 *   }
 * }
 *
 * @example Mixed return (only workflows attached)
 * class MyWorkflow extends Workflow {
 *   @Task()
 *   async mixedReturn(): Promise<(Workflow | string)[]> {
 *     return [
 *       new ChildWorkflow('child1', this),  // Attached
 *       'some string',                       // Skipped
 *       new ChildWorkflow('child2', this),  // Attached
 *     ];
 *   }
 * }
 */
export function Task(opts: TaskOptions = {}) {
  // ... implementation
}

// ============================================================================
// PATTERN: TaskOptions Interface JSDoc (Optional Enhancement)
// ============================================================================

/**
 * Configuration options for @Task decorator
 *
 * @note The decorator uses lenient validation - non-Workflow returns are
 *       silently skipped. See the @Task decorator JSDoc for details.
 */
export interface TaskOptions {
  /** Custom task name (defaults to method name) */
  name?: string;
  /** If true, run returned workflows concurrently */
  concurrent?: boolean;
}

// ============================================================================
// GOTCHA: Type Guard Pattern Explained
// ============================================================================

// The lenient validation uses this type guard (lines 61-62 in task.ts):
if (workflow && typeof workflow === 'object' && 'id' in workflow) {
  // Only processes objects that:
  // 1. Are truthy (not null/undefined)
  // 2. Are objects (not primitives)
  // 3. Have an 'id' property (structural typing, not instanceof)
}

// This means:
// - new Workflow('x')    → Attached (has 'id')
// - { id: 'fake' }       → Attached (has 'id', duck-typing)
// - 'string'             → Skipped (not an object)
// - null                 → Skipped (not truthy)
// - { name: 'x' }        → Skipped (no 'id' property)

// ============================================================================
// REFERENCE: @Step JSDoc Pattern to Follow (from step.ts lines 1-36)
// ============================================================================

/**
 * @Step decorator
 * Wraps a method to emit step events, handle errors, and optionally snapshot state
 *
 * @example
 * class MyWorkflow extends Workflow {
 *   @Step({ snapshotState: true, trackTiming: true })
 *   async processData() {
 *     // ... step logic
 *   }
 * }
 */
```

### Integration Points

```yaml
NO_CODE_CHANGES:
  - This is a documentation-only task
  - No behavior modifications
  - No new dependencies
  - No configuration changes

INTEGRATION:
  - JSDoc comments are part of the source code
  - IDE tooltips will display the new documentation
  - TypeScript compiler validates JSDoc syntax
  - No runtime changes

RELATED_TASKS:
  - P1.M3.T2.S2: Update README.md with @Task validation documentation
  - P1.M3.T1.S1: @Step decorator trackTiming JSDoc (completed, pattern reference)
  - P1.M3.T1.S2: @Step README documentation (completed, pattern reference)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Verify TypeScript compilation with JSDoc
npx tsc --noEmit

# Expected: Zero errors. JSDoc comments should not cause type errors.

# Verify no linting issues
npm run lint 2>/dev/null || npx eslint src/decorators/task.ts src/types/decorators.ts

# Expected: Zero linting errors.

# Format check (if using Prettier)
npx prettier --check src/decorators/task.ts src/types/decorators.ts

# Expected: Files are properly formatted.
```

### Level 2: JSDoc Validation (Documentation Quality)

```bash
# Check JSDoc renders correctly in IDE
# Open src/decorators/task.ts in VS Code
# Hover over the @Task decorator usage
# Expected: Full JSDoc tooltip with ValidationBehavior section

# Verify @example code is syntactically valid
# Copy @example code to a test file
cat > /tmp/test-jsdoc.ts << 'EOF'
class TestWorkflow extends Workflow {
  @Task()
  async returnsString(): Promise<string> {
    return 'not a workflow';
  }

  @Task({ concurrent: true })
  async mixedReturn(): Promise<(Workflow | string)[]> {
    return [
      new ChildWorkflow('child1', this),
      'some string',
    ];
  }
}
EOF
npx tsc --noEmit /tmp/test-jsdoc.ts

# Expected: Zero errors (example code is valid TypeScript)
```

### Level 3: Content Verification (Documentation Accuracy)

```bash
# Verify JSDoc matches actual implementation
grep -A 3 "if (workflow && typeof workflow === 'object' && 'id' in workflow)" src/decorators/task.ts

# Expected: Type guard pattern is exactly as documented

# Verify no false claims in JSDoc
# Check that the decorator truly doesn't throw for non-workflow returns

# Manual verification:
# 1. Read the JSDoc comments
# 2. Read the implementation (lines 59-70)
# 3. Confirm JSDoc accurately describes the behavior
# 4. Confirm rationale is clearly explained

# Expected: JSDoc accurately reflects lenient validation behavior
```

### Level 4: Integration Verification (Related Task Readiness)

```bash
# Ensure documentation is ready for P1.M3.T2.S2 (README update)
# The JSDoc content should provide all information needed for README.md

# Check JSDoc is complete enough for README extraction
grep -E "@ValidationBehavior|@example" src/decorators/task.ts

# Expected: Both sections present and complete

# Verify TaskOptions interface is documented
grep -A 10 "export interface TaskOptions" src/types/decorators.ts

# Expected: Interface has clear JSDoc comments
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] JSDoc syntax is valid (no compiler warnings)
- [ ] @example code is syntactically valid TypeScript
- [ ] JSDoc renders correctly in IDE tooltips
- [ ] No linting errors: `npm run lint` (if available)

### Documentation Validation

- [ ] JSDoc explains lenient validation behavior clearly
- [ ] Rationale for lenient approach is documented
- [ ] @example includes standard usage (returning Workflow[])
- [ ] @example includes edge case (non-workflow return scenario)
- [ ] Type guard pattern is accurately described
- [ ] Duck-typing flexibility is explained
- [ ] Documentation follows @Step JSDoc pattern from P1.M3.T1.S1

### Code Quality Validation

- [ ] JSDoc formatting matches existing codebase style
- [ ] Indentation and line breaks are consistent
- [ ] No @throws tags (lenient approach doesn't throw)
- [ ] No misleading claims about validation
- [ ] Code examples are complete and runnable

### Integration & Readiness

- [ ] Documentation is ready for P1.M3.T2.S2 (README update)
- [ ] JSDoc content can be extracted for README.md
- [ ] Related tasks (P1.M3.T1.*) patterns are followed
- [ ] Task completes the P1.M3.T2 task set alongside P1.M3.T2.S2

---

## Anti-Patterns to Avoid

- ❌ **Don't use @throws tags**: The lenient approach explicitly doesn't throw errors
- ❌ **Don't claim strict validation**: The PRD specified strict, but implementation is lenient
- ❌ **Don't document non-existent behavior**: Only document what actually happens
- ❌ **Don't over-document the type guard**: Keep it simple - "has 'id' property" is sufficient
- ❌ **Don't criticize the design choice**: Present the rationale neutrally
- ❌ **Don't add JSDoc to wrapper function**: Only document the exported Task decorator function
- ❌ **Don't use @param/@returns tags**: Decorator JSDoc pattern doesn't use these (see @Step)
- ❌ **Don't modify the implementation**: This is documentation-only, no code changes

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
- Documentation-only task with clear scope
- Exact file paths and line numbers specified
- Existing JSDoc pattern to follow (@Step decorator)
- No code changes required
- Comprehensive context provided
- External research included
- Anti-patterns clearly documented

**Validation**: The completed PRP enables an AI agent to implement this documentation change using only the PRP content and codebase access. The JSDoc pattern from P1.M3.T1.S1 provides a template to follow, and all edge cases are documented.
