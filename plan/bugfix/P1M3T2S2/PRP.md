# Product Requirement Prompt (PRP): Update README.md with @Task Validation Behavior Documentation

**Work Item**: P1.M3.T2.S2
**Issue Reference**: ANALYSIS_PRD_VS_IMPLEMENTATION.md Issue #5
**Points**: 1
**Type**: Documentation

---

## Goal

**Feature Goal**: Add user-facing documentation to README.md explaining the `@Task` decorator's lenient validation behavior for non-Workflow return values.

**Deliverable**: Updated README.md with an expanded `@Task` section that documents:
- The decorator's lenient validation approach (non-Workflow returns are silently skipped)
- Duck-typing behavior (objects with 'id' property are treated as workflows)
- Code examples showing valid Workflow returns, edge cases, and mixed returns
- Clear distinction between what gets attached vs. what gets skipped

**Success Definition**:
- README.md `@Task` section clearly explains lenient validation behavior
- Code examples demonstrate both standard usage and edge cases
- Documentation aligns with JSDoc added in P1.M3.T2.S1
- Users understand why non-Workflow returns don't throw errors
- Pattern follows @Step documentation structure from P1.M3.T1.S2

## User Persona

**Target User**: TypeScript developers using the groundswell workflow engine who implement `@Task` decorated methods in their workflow classes and reference README.md for usage guidance.

**Use Case**: When a developer reads the README to understand `@Task` decorator usage, they need to:
1. Understand the decorator's validation behavior (lenient, not strict)
2. See what return values are valid and how they're handled
3. Understand edge cases (mixed returns, non-workflow objects)
4. Know why the decorator doesn't throw errors for non-Workflow returns

**User Journey**:
1. Developer installs groundswell and opens README.md
2. Developer reads the "Decorators" section to understand @Task usage
3. Developer sees current example: `@Task({ concurrent: true })`
4. Developer reads new documentation explaining lenient validation
5. Developer implements task methods with confidence, knowing edge cases are handled gracefully

**Pain Points Addressed**:
- **Confusion**: PRD specified strict validation but implementation is lenient
- **Silent failures**: Non-Workflow returns are skipped without error, which could be confusing without documentation
- **Debugging difficulty**: Without documentation, developers may not understand why their task isn't attaching workflows
- **Mental model mismatch**: Developers expect errors for invalid returns, but get silent skipping

## Why

- **Completes P1.M3.T2 task set**: P1.M3.T2.S1 added JSDoc to the decorator; P1.M3.T2.S2 adds user-facing README documentation
- **Aligns documentation with implementation**: The PRD specified throwing errors for non-Workflow returns, but the implementation uses lenient validation
- **Reduces developer confusion**: Developers reading the README will understand why non-Workflow returns don't throw errors
- **Clarifies design intent**: The lenient approach enables duck-typing flexibility and allows working with workflow-like objects
- **Follows established pattern**: Matches the @Step documentation approach from P1.M3.T1.S2

## What

Update README.md to document the `@Task` decorator's lenient validation behavior.

### Current README.md @Task Section (Lines 155-162)

```markdown
### @Task

Spawn and manage child workflows.

```typescript
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }
```
```

### Required Changes

Expand the `@Task` section to follow the comprehensive pattern established for `@Step` in P1.M3.T1.S2:

```markdown
### @Task

Spawn and manage child workflows.

**Validation Behavior**: The decorator performs lenient validation - methods returning non-Workflow objects are silently skipped rather than throwing errors. This enables flexible method designs and duck-typing.

**Configuration Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom task name |
| `concurrent` | `boolean` | `false` | If `true`, automatically run returned workflows in parallel using `Promise.all()` |

**How It Works**:
- Workflow objects (with `id` property) are automatically attached as children
- Non-workflow objects are silently skipped (not attached)
- The original return value is always preserved
- Duck-typing is used: any object with an `id` property is treated as workflow-like

**Examples**:

```typescript
// Standard usage - return single workflow
@Task()
async createChild(): Promise<ChildWorkflow> {
  return new ChildWorkflow('child1', this);  // Attached as child
}

// Return multiple workflows
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> {
  return [
    new WorkerWorkflow('worker1', 100, this),  // Attached
    new WorkerWorkflow('worker2', 150, this),  // Attached
  ];  // Both run concurrently
}

// Mixed return - only workflows are attached
@Task()
async mixedReturn(): Promise<(Workflow | string)[]> {
  return [
    new ChildWorkflow('child1', this),  // Attached
    'some string',                       // Skipped (not a workflow)
    new ChildWorkflow('child2', this),  // Attached
  ];
}

// Non-workflow return - handled gracefully
@Task()
async returnsData(): Promise<string> {
  return 'just some data';  // Returned as-is, no attachment attempted
}
```

**Important Notes**:
- The decorator uses structural typing (duck-typing) via the `id` property check
- This enables working with workflow-like objects, not just `Workflow` class instances
- TypeScript compile-time type checking still catches obvious errors
- Use `concurrent: true` for automatic parallel execution of returned workflows
```

### Success Criteria

- [ ] README.md explicitly states lenient validation behavior
- [ ] Code examples demonstrate valid Workflow returns
- [ ] Code examples demonstrate edge cases (non-workflow returns, mixed returns)
- [ ] Duck-typing behavior is explained
- [ ] Configuration options table is present
- [ ] Pattern follows @Step documentation from P1.M3.T1.S2
- [ ] Documentation aligns with JSDoc from P1.M3.T2.S1

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: PASS

A developer unfamiliar with this codebase would have everything needed:
- Exact line numbers of current @Task documentation in README
- Complete JSDoc content from P1.M3.T2.S1 to reference
- The lenient validation code logic explained
- Examples of similar README documentation pattern (@Step from P1.M3.T1.S2)
- External best practices references
- Working code examples from the codebase

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- file: README.md
  why: TARGET FILE - Contains decorators section requiring update
  pattern: Lines 155-162 contain current minimal @Task section
  line_range: 155-162
  critical: Current section only shows basic usage, needs comprehensive expansion

- file: README.md
  why: PATTERN REFERENCE - @Step documentation from P1.M3.T1.S2
  pattern: Lines 116-154 show comprehensive @Step documentation structure
  line_range: 116-154
  critical: This is the pattern to follow: Default Behavior, Options Table, Examples, Notes

- file: src/decorators/task.ts
  why: IMPLEMENTATION PROOF - Shows lenient validation logic
  pattern: Lines 53-64 show complete JSDoc with validation behavior documentation
  line_range: 53-64
  critical: JSDoc from P1.M3.T2.S1 documents: "The decorator uses lenient validation for return values"

- file: src/decorators/task.ts
  why: IMPLEMENTATION DETAILS - Type guard that performs lenient check
  pattern: Lines 91-102 show the type guard that silently skips non-workflow objects
  line_range: 91-102
  critical: Type guard: `if (workflow && typeof workflow === 'object' && 'id' in workflow)`

- file: examples/examples/06-concurrent-tasks.ts
  why: WORKING EXAMPLES - Real-world @Task usage patterns
  pattern: Lines 74-77, 117-122, 156-158, 202-206 show various @Task usage patterns
  line_range: 74-206
  critical: Shows: single workflow return, array return, concurrent usage, fan-out pattern

- file: plan/bugfix/P1M3T2S1/PRP.md
  why: SIBLING PRP - Completed JSDoc documentation for validation behavior
  pattern: Lines 239-269 show the JSDoc content that was added
  section: "Implementation Patterns & Key Details"
  reference: P1.M3.T2.S1 added comprehensive validation behavior JSDoc

- file: plan/bugfix/P1M3T1S2/PRP.md
  why: PATTERN REFERENCE - README documentation pattern for decorators
  pattern: Lines 78-132 show the @Step subsection structure
  section: "Required Changes - Option 1"
  critical: Shows the structure: Default Behavior, Options Table, Examples, Notes

# URL REFERENCES - For additional context (if needed)

- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#duck-typing
  why: TypeScript documentation on structural typing (duck-typing)
  section: "Duck typing" explanation
  pattern: Explains how TypeScript uses structural typing, not nominal typing
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── README.md                # TARGET FILE - User-facing documentation
├── examples/
│   └── examples/
│       └── 06-concurrent-tasks.ts  # Working @Task examples
├── plan/
│   └── bugfix/
│       ├── P1M3T1S2/        # Pattern reference - @Step README docs
│       ├── P1M3T2S1/        # Sibling PRP - JSDoc completed
│       └── P1M3T2S2/        # THIS PRP LOCATION
└── src/
    └── decorators/
        └── task.ts          # Implementation with lenient validation JSDoc
```

### Desired Codebase Tree (No new files - modification only)

```bash
# No new files created - this is a documentation-only change
# Modified: README.md (lines 155-162 expand to comprehensive @Task section)
```

### Known Gotchas of Our Codebase & Library Quirks

```markdown
# CRITICAL: The current @Task section (lines 155-162) is VERY minimal
# Only shows: @Task({ concurrent: true }) with one-line example
# Needs comprehensive expansion following @Step pattern

# CRITICAL: P1.M3.T2.S1 already added JSDoc to src/decorators/task.ts
# Lines 53-64 contain the "Validation Behavior" section explaining lenient approach
# This PRP translates that JSDoc into user-facing README documentation

# CRITICAL: The lenient validation is INTENTIONAL, not a bug
# ANALYSIS_PRD_VS_IMPLEMENTATION.md Issue #5 concludes this is a design decision
# Key rationale: "Duck typing: The implementation uses structural typing"

# TYPE GUARD PATTERN (lines 91-102 in task.ts):
# if (workflow && typeof workflow === 'object' && 'id' in workflow) {
#   // Only processes objects with 'id' property
# }
# This means:
# - new Workflow('x')    → Attached (has 'id')
# - { id: 'fake' }       → Attached (has 'id', duck-typing)
# - 'string'             → Skipped (not an object)
# - null                 → Skipped (not truthy)
# - { name: 'x' }        → Skipped (no 'id' property)

# GOTCHA: README.md uses code fence format ```typescript not ```
# Preserve this format for all code examples

# CRITICAL: Follow existing README formatting patterns from @Step section
# - H3 ### for decorator subsections
# - Bold text for emphasis (**Validation Behavior**)
# - Code fences with ```typescript
# - Tables for options (| Option | Type | Default | Description |)
# - Multiple code examples with inline comments

# CRITICAL: The concurrent option behavior
# When concurrent: true is set, the decorator automatically:
# 1. Attaches all workflow-like objects as children
# 2. Filters for objects with a 'run' method
# 3. Executes all runnable workflows in parallel with Promise.all()
# See lines 104-114 in task.ts for implementation

# PATTERN: Examples should show progressive complexity
# Level 1: Single workflow return (basic)
# Level 2: Multiple workflows with concurrent option (common pattern)
# Level 3: Mixed return showing lenient validation (edge case)
# Level 4: Non-workflow return showing graceful handling (edge case)

# CRITICAL: Distinguish between what gets ATTACHED vs what gets SKIPPED
# This is the key behavior to document
# Attached: Objects with 'id' property (workflow-like)
# Skipped: Primitives, null, objects without 'id' property

# STYLE: Use clear, inclusive language
# "lenient validation" instead of "weak typing"
# "silently skipped" instead of "ignored"
# "duck-typing" with explanation (structural typing)

# CRITICAL: Reference the JSDoc from P1.M3.T2.S1 for accuracy
# The JSDoc (lines 53-64) contains the authoritative description
# README should present the same information in user-friendly format

# GOTCHA: docs/workflow.md may also have @Task documentation
# Lines 114-244 in docs/workflow.md may contain detailed information
# But README is the primary user-facing document
# Focus on README, be aware of docs/workflow.md (out of scope to update)
```

## Implementation Blueprint

### Data Models and Structure

This task modifies README.md documentation - no new data models needed.

**Key Documentation Structure**:
```markdown
## Decorators
├── @Step (existing comprehensive section from P1.M3.T1.S2)
├── @Task (TARGET - expand to match @Step pattern)
│   ├── Description
│   ├── Validation Behavior (NEW - key addition)
│   ├── Configuration Options Table
│   ├── How It Works (NEW - explains duck-typing)
│   ├── Examples (progressive complexity)
│   └── Important Notes
└── @ObservedState (existing)
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: REVIEW CURRENT README STRUCTURE
  - READ: README.md lines 114-175 (Decorators section)
  - IDENTIFY: Current @Task section at lines 155-162
  - IDENTIFY: @Step section pattern at lines 116-154 (reference)
  - NOTE: Current @Task is minimal, needs expansion
  - DEPENDENCIES: None

Task 2: VERIFY JSDOC COMPLETION FROM P1.M3.T2.S1
  - READ: src/decorators/task.ts lines 53-64
  - VERIFY: JSDoc contains "Validation Behavior" section
  - EXTRACT: Key points to translate to README:
    * Lenient validation approach
    * Non-workflow returns are silently skipped
    * Duck-typing flexibility
    * Original return value preserved
  - DEPENDENCIES: Task 1

Task 3: REVIEW WORKING EXAMPLES
  - READ: examples/examples/06-concurrent-tasks.ts
  - EXTRACT: Usage patterns for README examples:
    * Single workflow return (lines 74-77)
    * Array return with concurrent (lines 117-122)
    * Manual parallel pattern (lines 156-158)
  - NOTE: Real examples to reference for README code samples
  - DEPENDENCIES: Task 2

Task 4: CREATE NEW @TASK SUBSECTION CONTENT
  - WRITE: "### @Task" heading (existing, keep)
  - WRITE: Enhanced description sentence
  - WRITE: "**Validation Behavior**" section (NEW - critical)
  - WRITE: "**Configuration Options**" table with name, concurrent
  - WRITE: "**How It Works**" section explaining duck-typing (NEW)
  - WRITE: "**Examples**" with progressive complexity:
    * Standard single workflow return
    * Multiple workflows with concurrent option
    * Mixed return (edge case)
    * Non-workflow return (edge case)
  - WRITE: "**Important Notes**" section
  - DEPENDENCIES: Task 3

Task 5: VERIFY MARKDOWN FORMATTING
  - CHECK: Proper heading levels (### @Task)
  - CHECK: Code fences use ```typescript
  - CHECK: Table formatting is correct
  - CHECK: Bold text with **text** syntax
  - CHECK: Inline code with `code` syntax
  - DEPENDENCIES: Task 4

Task 6: VALIDATE CODE EXAMPLES
  - VERIFY: All TypeScript code examples are syntactically correct
  - VERIFY: Examples match patterns from 06-concurrent-tasks.ts
  - VERIFY: @Task decorator syntax is correct
  - VERIFY: Comments in code examples are helpful
  - DEPENDENCIES: Task 5

Task 7: CROSS-REFERENCE WITH JSDOC
  - VERIFY: README content aligns with JSDoc from P1.M3.T2.S1
  - VERIFY: No contradictions between README and JSDoc
  - VERIFY: README is more user-friendly (less technical)
  - CONFIRM: Both documents explain lenient validation consistently
  - DEPENDENCIES: Task 6

Task 8: FINAL REVIEW
  - READ: Full updated @Task section in README
  - VERIFY: Lenient validation is clearly explained
  - VERIFY: Duck-typing behavior is documented
  - VERIFY: Examples show edge cases
  - VERIFY: Pattern matches @Step section structure
  - DEPENDENCIES: Task 7
```

### Implementation Patterns & Key Details

```markdown
====================================================================
PATTERN: README @Task Section Structure (Follow @Step from P1.M3.T1.S2)
====================================================================

REPLACE lines 155-162 with comprehensive section:

### @Task

Spawn and manage child workflows.

**Validation Behavior**: The decorator performs lenient validation - methods
returning non-Workflow objects are silently skipped rather than throwing errors.
This enables flexible method designs and duck-typing.

**Configuration Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom task name |
| `concurrent` | `boolean` | `false` | If `true`, automatically run returned workflows in parallel using `Promise.all()` |

**How It Works**:
- Workflow objects (with `id` property) are automatically attached as children
- Non-workflow objects are silently skipped (not attached)
- The original return value is always preserved
- Duck-typing is used: any object with an `id` property is treated as workflow-like

**Examples**:

```typescript
// Standard usage - return single workflow
@Task()
async createChild(): Promise<ChildWorkflow> {
  return new ChildWorkflow('child1', this);  // Attached as child
}

// Return multiple workflows
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> {
  return [
    new WorkerWorkflow('worker1', 100, this),  // Attached
    new WorkerWorkflow('worker2', 150, this),  // Attached
  ];  // Both run concurrently
}

// Mixed return - only workflows are attached
@Task()
async mixedReturn(): Promise<(Workflow | string)[]> {
  return [
    new ChildWorkflow('child1', this),  // Attached
    'some string',                       // Skipped (not a workflow)
    new ChildWorkflow('child2', this),  // Attached
  ];
}

// Non-workflow return - handled gracefully
@Task()
async returnsData(): Promise<string> {
  return 'just some data';  // Returned as-is, no attachment attempted
}
```

**Important Notes**:
- The decorator uses structural typing (duck-typing) via the `id` property check
- This enables working with workflow-like objects, not just `Workflow` class instances
- TypeScript compile-time type checking still catches obvious errors
- Use `concurrent: true` for automatic parallel execution of returned workflows

====================================================================
KEY PATTERNS TO FOLLOW
====================================================================

1. VALIDATION BEHAVIOR SECTION (NEW - critical addition)
   - Explicitly state "lenient validation"
   - Explain "silently skipped rather than throwing errors"
   - Mention "duck-typing" as enabling factor

2. TABLE FORMAT WITH DEFAULT COLUMN
   | Option | Type | Default | Description |
   |--------|------|---------|-------------|
   | concurrent | boolean | false | ... |

3. "HOW IT WORKS" SECTION (NEW - explains duck-typing)
   - Bullet points explaining attachment logic
   - Clarify what gets attached vs. what gets skipped
   - Explain return value preservation

4. PROGRESSIVE EXAMPLES
   - Level 1: Single workflow return (basic usage)
   - Level 2: Multiple workflows with concurrent option (common pattern)
   - Level 3: Mixed return (shows lenient validation in action)
   - Level 4: Non-workflow return (edge case, graceful handling)

5. IMPORTANT NOTES SECTION
   - Explain duck-typing with technical accuracy
   - Mention TypeScript compile-time checking
   - Document concurrent option behavior clearly

====================================================================
JSDOC TO README TRANSLATION GUIDE
====================================================================

FROM src/decorators/task.ts JSDoc (lines 53-64):
"The decorator uses lenient validation for return values:
- Workflow objects (with 'id' property) are automatically attached
- Non-workflow objects are silently skipped (not attached)
- The original return value is always preserved

This lenient approach enables:
- Duck-typing: Works with workflow-like objects, not just Workflow instances
- Flexible signatures: Methods can return any type without breaking
- Graceful handling: Edge cases (null, undefined, primitives) don't throw errors"

TO README.md user-friendly format:
"**Validation Behavior**: The decorator performs lenient validation - methods
returning non-Workflow objects are silently skipped rather than throwing errors.
This enables flexible method designs and duck-typing."

**How It Works**:
- Workflow objects (with `id` property) are automatically attached as children
- Non-workflow objects are silently skipped (not attached)
- The original return value is always preserved
- Duck-typing is used: any object with an `id` property is treated as workflow-like
```

### Integration Points

```yaml
NO NEW INTEGRATION POINTS:
  - This is a documentation-only change
  - No API changes
  - No behavior changes
  - No breaking changes

RELATED DOCUMENTATION:
  - src/decorators/task.ts: JSDoc from P1.M3.T2.S1 (already complete)
  - examples/06-concurrent-tasks.ts: Source of working code examples
  - docs/workflow.md: Detailed workflow documentation (out of scope)

DOCUMENTATION DEPENDENCY CHAIN:
  P1.M3.T2.S1: Add JSDoc to @Task decorator (COMPLETE)
    ↓
  P1.M3.T2.S2: Update README.md with @Task validation documentation (THIS TASK)

README SECTIONS AFFECTED:
  - Decorators (lines 114-175): @Task section (lines 155-162) is target
    → Expand to comprehensive section following @Step pattern
    → Add Validation Behavior section
    → Add Configuration Options table
    → Add How It Works section
    → Add Examples with edge cases
    → Add Important Notes
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Verify markdown syntax
npx markdownlint README.md 2>/dev/null || echo "No markdownlint - manual review"

# Manual markdown validation checks:
# 1. All code fences have proper closing ```
# 2. Tables have correct pipe | syntax
# 3. Headings use correct # ## ### levels
# 4. No malformed links

# View the updated @Task section
cat README.md | grep -A 50 "### @Task"
# Expected: Comprehensive @Task documentation with Validation Behavior section

# Verify validation behavior is documented
grep -n "lenient validation" README.md
# Expected: At least one result in @Task section

# Verify examples include edge cases
grep -n "Mixed return\|non-workflow" README.md
# Expected: Examples showing edge cases
```

### Level 2: Content Validation (Documentation Review)

```bash
# Verify all required elements are present
echo "Checking for required documentation elements..."

# Check for validation behavior statement
grep -q "lenient validation" README.md && echo "✓ Validation behavior stated" || echo "✗ Validation behavior NOT stated"

# Check for options table
grep -q "| Option | Type | Default |" README.md && echo "✓ Options table present" || echo "✗ Options table missing"

# Check for duck-typing explanation
grep -qi "duck-typing\|structural typing" README.md && echo "✓ Duck-typing explained" || echo "✗ Duck-typing NOT explained"

# Check for edge case examples
grep -q "Mixed return\|skipped" README.md && echo "✓ Edge case examples present" || echo "✗ Edge case examples missing"

# Expected output: All four checks pass
```

### Level 3: Code Example Validation

```bash
# Extract code examples from README and verify syntax
# This is a manual check - copy code examples and verify they work

# Run the concurrent tasks example to ensure patterns are valid
npm run start:concurrent
# Expected: Examples run successfully

# Verify new examples match existing patterns
# Compare README examples with 06-concurrent-tasks.ts patterns
# Expected: Patterns are similar and syntactically correct
```

### Level 4: Documentation Alignment Validation

```bash
# Verify consistency between README and JSDoc
echo "README validation behavior:"
grep -A 5 "Validation Behavior" README.md | head -6
echo ""
echo "JSDoc validation behavior:"
grep -A 10 "Validation Behavior" src/decorators/task.ts | head -11

# Expected: Both explain lenient validation consistently

# Verify README matches @Step pattern structure
echo "Checking @Task section structure..."
grep -q "### @Task" README.md && echo "✓ Has H3 heading"
grep -q "Configuration Options" README.md && echo "✓ Has options table section"
grep -q "How It Works" README.md && echo "✓ Has explanation section"
grep -q "Examples" README.md && echo "✓ Has examples section"

# Expected: All structural elements present
```

## Final Validation Checklist

### Technical Validation

- [ ] All validation levels completed successfully
- [ ] Markdown syntax is valid (no broken formatting)
- [ ] Code examples are valid TypeScript
- [ ] Table formatting is correct
- [ ] No broken links or references

### Feature Validation

- [ ] `@Task` section explicitly states lenient validation behavior
- [ ] Duck-typing behavior is explained clearly
- [ ] Code examples demonstrate standard usage (single workflow, multiple workflows)
- [ ] Code examples demonstrate edge cases (mixed returns, non-workflow returns)
- [ ] Configuration options table is present with correct defaults
- [ ] "How It Works" section explains attachment logic
- [ ] Examples are copy-pasteable and work correctly

### Documentation Quality Validation

- [ ] Follows README.md existing formatting patterns
- [ ] Matches @Step section structure from P1.M3.T1.S2
- [ ] Progressive examples (basic → concurrent → edge cases)
- [ ] Clear, concise language
- [ ] Technical terms (duck-typing) are explained
- [ ] No contradictions with JSDoc from P1.M3.T2.S1

### Integration & Readiness

- [ ] Consistent with src/decorators/task.ts JSDoc
- [ ] Matches patterns from examples/06-concurrent-tasks.ts
- [ ] Aligns with P1.M3.T2.S1 JSDoc documentation
- [ ] No contradictions across documentation
- [ ] Completes P1.M3.T2 task set

---

## Anti-Patterns to Avoid

- **Don't claim strict validation** - The implementation is lenient, document what actually happens
- **Don't use @throws tags** - The lenient approach explicitly doesn't throw errors
- **Don't criticize the design** - Present the rationale neutrally (duck-typing flexibility)
- **Don't forget edge case examples** - Must show what happens with non-workflow returns
- **Don't over-technicalize** - Keep README user-friendly, JSDoc is for technical details
- **Don't contradict JSDoc** - Ensure README and JSDoc tell the same story
- **Don't skip the "How It Works" section** - This explains the duck-typing behavior
- **Don't use complex tables** - Keep table simple: Option | Type | Default | Description
- **Don't modify concurrent behavior** - Only document what exists, don't change behavior
- **Don't break existing @Task examples** - Preserve current examples, expand with new ones

---

## Related Work Items

- **P1.M3.T1.S1**: Add JSDoc to @Step decorator trackTiming option - **COMPLETE** (pattern reference)
- **P1.M3.T1.S2**: Update README.md with @Step decorator timing documentation - **COMPLETE** (pattern reference)
- **P1.M3.T2.S1**: Add JSDoc to @Task decorator explaining validation behavior - **COMPLETE** (dependency)
- **P1.M3.T2.S2**: Update README.md with @Task validation behavior documentation - **THIS TASK**

---

## Confidence Score

**10/10** for one-pass implementation success likelihood

**Rationale**:
- Clear specification with exact line numbers
- Sibling PRP P1.M3.T2.S1 already complete (JSDoc added)
- P1.M3.T1.S2 provides proven pattern for README decorator documentation
- Working code examples available (06-concurrent-tasks.ts)
- No code changes required - documentation only
- Comprehensive validation approach
- Anti-patterns clearly documented

**Success Factors**:
- The task is straightforward documentation expansion
- JSDoc from P1.M3.T2.S1 provides authoritative content to translate
- @Step pattern (P1.M3.T1.S2) provides proven structure
- All edge cases are known and documented
- Examples can be adapted from existing codebase

---

## Appendices

### Appendix A: Current README @Task Section

```markdown
### @Task

Spawn and manage child workflows.

```typescript
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }
```
```

**Issue**: Minimal documentation doesn't explain validation behavior, duck-typing, or edge cases.

### Appendix B: JSDoc from P1.M3.T2.S1 (Source Content)

From `src/decorators/task.ts` lines 53-64:

```typescript
/**
 * Validation Behavior
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
 */
```

This content is translated to user-friendly README format in this PRP.

### Appendix C: Working Code Example Reference

From `examples/examples/06-concurrent-tasks.ts`:

```typescript
// Single worker creation (lines 74-77)
@Task()
async createWorker(config: { id: string; time: number }): Promise<WorkerWorkflow> {
  return new WorkerWorkflow(config.id, config.time, this);
}

// Concurrent workers with option (lines 117-122)
@Task({ concurrent: true })
async createAllWorkers(): Promise<WorkerWorkflow[]> {
  return this.workers.map(
    (config) => new WorkerWorkflow(config.id, config.time, this)
  );
}

// Fan-out pattern (lines 202-206)
@Task()
async createProcessor(item: string): Promise<WorkerWorkflow> {
  const time = 50 + Math.floor(Math.random() * 100);
  return new WorkerWorkflow(item, time, this);
}
```

These patterns can be referenced for README code examples.

### Appendix D: @Step Pattern Reference (P1.M3.T1.S2)

From README.md lines 116-154 (completed in P1.M3.T1.S2):

```markdown
### @Step

Emit lifecycle events and track step execution timing.

**Default Behavior**: Without any options, `@Step()` automatically tracks timing information.

```typescript
@Step()  // Timing tracked by default
async processData(): Promise<void> { }
```

**Configuration Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom step name |
| `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event. |
...etc

**Examples**:

```typescript
// Default behavior - timing tracked automatically
@Step()
async basicStep(): Promise<void> { }

// Disable timing for performance-critical code
@Step({ trackTiming: false })
async highFrequencyStep(): Promise<void> { }
```
```

This structure is followed for the @Task section expansion.

### Appendix E: Type Guard Implementation Details

From `src/decorators/task.ts` lines 91-102:

```typescript
for (const workflow of workflows) {
  // Type guard to check if it's a workflow
  if (workflow && typeof workflow === 'object' && 'id' in workflow) {
    const childWf = workflow as WorkflowClass;

    // Only attach if not already attached (parent not set by constructor)
    if (!childWf.parent) {
      childWf.parent = wf;
      wf.attachChild(childWf as unknown as WorkflowLike);
    }
  }
  // Non-matching objects are silently skipped (no else branch)
}
```

This type guard implements the lenient validation behavior documented in the PRP.

### Appendix F: Quick Reference Commands

```bash
# View current @Task section
sed -n '155,162p' README.md

# View JSDoc from P1.M3.T2.S1
sed -n '53,64p' src/decorators/task.ts

# View @Step pattern reference
sed -n '116,154p' README.md

# View working @Task examples
sed -n '74,77p;117,122p;156,158p;202,206p' examples/examples/06-concurrent-tasks.ts

# Run concurrent tasks example
npm run start:concurrent
```
