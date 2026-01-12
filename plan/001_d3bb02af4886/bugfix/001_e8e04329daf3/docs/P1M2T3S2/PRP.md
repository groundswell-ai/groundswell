# Product Requirement Prompt (PRP) - P1.M2.T3.S2

**PRP ID**: P1.M2.T3.S2
**Work Item Title**: Update PRD to state trackTiming defaults to true
**Created**: 2025-01-12
**Scope**: Documentation Update - Single File Edit

---

## Goal

**Feature Goal**: Update PRD Section 8.1 to explicitly document that `trackTiming` defaults to `true`, resolving the documentation gap identified in Issue 4.

**Deliverable**: Updated `PRD.md` file with explicit default value documentation for the `trackTiming` option in the `@Step` decorator.

**Success Definition**: The PRD Section 8.1 explicitly states that `trackTiming` defaults to `true`, matching the implementation behavior in `src/decorators/step.ts:94` where the code uses `if (opts.trackTiming !== false)`.

## User Persona

**Target User**: Developers and maintainers of the Groundswell workflow engine who reference the PRD for understanding decorator behavior.

**Use Case**: When implementing or debugging `@Step` decorators, developers need to understand the default behavior of timing tracking without diving into source code.

**User Journey**:
1. Developer reads PRD Section 8.1 to understand `@Step` decorator options
2. Developer sees `trackTiming?: boolean` with explicit default value
3. Developer understands timing is tracked by default without explicit configuration
4. Developer confidently implements steps knowing the default behavior

**Pain Points Addressed**:
- **Documentation Uncertainty**: Developers must examine source code to determine default behavior
- **Inconsistency**: TypeScript JSDoc says "default: true" but PRD is silent
- **Implementation-Documentation Mismatch**: The `!== false` pattern implies `true` default but isn't documented

## Why

- **Accuracy**: The implementation uses `if (opts.trackTiming !== false)` which means the default is `true`, but this is not documented in the PRD
- **Consistency**: The TypeScript JSDoc in `src/types/decorators.ts:11` correctly states "default: true" but the PRD does not
- **Developer Experience**: Explicit defaults reduce cognitive load and prevent misunderstandings about default behavior
- **Issue Resolution**: This directly addresses Issue 4 which identified this documentation gap

## What

Update the PRD Section 8.1 to add explicit default value documentation for `trackTiming` option.

### Success Criteria

- [ ] PRD Section 8.1 explicitly states `trackTiming` defaults to `true`
- [ ] Documentation format follows existing PRD patterns (e.g., ErrorMergeStrategy default format)
- [ ] No other changes to Section 8.1 content (minimal, focused edit)
- [ ] PRD markdown formatting remains valid

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:
- Exact file path and line numbers
- Current content of Section 8.1
- Implementation code showing the `!== false` pattern
- Type definition with existing JSDoc default
- Documentation pattern from ErrorMergeStrategy
- Precise edit instructions with before/after examples

### Documentation & References

```yaml
# MUST READ - Critical Implementation Context
- file: /home/dustin/projects/groundswell/PRD.md
  lines: 177-196
  why: Target file for edit - Section 8.1 @Step() Decorator definition
  pattern: TypeScript interface definition without default values
  gotcha: PRD uses markdown code blocks with language identifiers (```ts)

- file: /home/dustin/projects/groundswell/src/decorators/step.ts
  lines: 92-101
  why: Implementation showing `!== false` pattern confirming default is `true`
  pattern: if (opts.trackTiming !== false) { ... emit timing event ... }
  gotcha: This "opt-out" pattern means timing is enabled by default

- file: /home/dustin/projects/groundswell/src/types/decorators.ts
  lines: 6-17
  why: Type definition with JSDoc showing "default: true" already documented
  pattern: /** Track and emit step duration (default: true) */
  gotcha: JSDoc correctly documents default but PRD does not

- file: /home/dustin/projects/groundswell/PRD.md
  section: Section 10 - ErrorMergeStrategy (approximately line 256)
  why: Reference pattern for documenting defaults in PRD
  pattern: "Default: **disabled** → first error wins (race is preserved)."
  gotcha: Uses bold formatting with arrow for explanation

- file: /home/dustin/projects/groundswell/README.md
  lines: ~130-135
  why: User-facing documentation showing table format with defaults
  pattern: | `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event... |
  gotcha: README has correct default but PRD doesn't
```

### Current Codebase Tree (Relevant Portion)

```bash
groundswell/
├── PRD.md                                    # TARGET FILE - Line 183: trackTiming?: boolean;
├── README.md                                 # Line ~132: Shows default: true in table
├── plan/
│   └── 001_d3bb02af4886/
│       └── bugfix/
│           └── 001_e8e04329daf3/
│               └── P1M2T3S2/
│                   └── PRP.md                # THIS FILE
└── src/
    ├── decorators/
    │   └── step.ts                           # Line 94: if (opts.trackTiming !== false)
    └── types/
        └── decorators.ts                     # Line 11: JSDoc says "default: true"
```

### Desired Codebase Tree (No New Files)

```bash
# No structural changes - only content modification to existing PRD.md
groundswell/
├── PRD.md                                    # MODIFIED: Line 183 updated with default value
└── ... (no other changes)
```

### Known Gotchas of our codebase & Library Quirks

```markdown
# CRITICAL: PRD formatting conventions
# - Section headers use double asterisks: ## **8.1 @Step() Decorator**
# - Code blocks use ts language identifier: ```ts
# - Default values are documented using bold with arrow pattern
# - The PRD is the single source of truth for API contracts

# CRITICAL: trackTiming implementation pattern
# The code uses `if (opts.trackTiming !== false)` which means:
# - undefined !== false → true (timing tracked)
# - true !== false → true (timing tracked)
# - false !== false → false (timing NOT tracked)
# This confirms the default is TRUE (opt-out pattern)

# CRITICAL: Existing documentation inconsistency
# - src/types/decorators.ts JSDoc: CORRECTLY states "default: true"
# - README.md table: CORRECTLY shows default: true
# - PRD.md Section 8.1: MISSING default value (this is the bug)

# CRITICAL: Edit scope
# - ONLY modify the trackTiming line in PRD.md Section 8.1
# - DO NOT modify other options (name, snapshotState, logStart, logFinish)
# - DO NOT modify implementation code or type definitions
# - This is a documentation-only fix
```

## Implementation Blueprint

### Data Models and Structure

No new data models. This is a documentation update to existing interface definition in PRD.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY PRD.md Section 8.1 Content
  - LOCATE: PRD.md lines 177-196
  - READ: Current Section 8.1 @Step() Decorator content
  - CONFIRM: trackTiming appears at line 183 as "trackTiming?: boolean;"
  - VERIFY: No default value currently documented
  - DEPENDENCIES: None

Task 2: VERIFY Implementation Pattern
  - READ: src/decorators/step.ts lines 92-101
  - CONFIRM: if (opts.trackTiming !== false) pattern
  - UNDERSTAND: This means default is true (opt-out, not opt-in)
  - REFERENCE: Type definition JSDoc at src/types/decorators.ts:11
  - DEPENDENCIES: Task 1

Task 3: DETERMINE Documentation Format
  - REFERENCE: PRD Section 10 ErrorMergeStrategy default format
  - PATTERN: "Default: **disabled** → first error wins (race is preserved)."
  - CHOOSE: Inline comment format for interface definition
  - FORMAT: "trackTiming?: boolean; // Default: true - Track and emit step duration"
  - DEPENDENCIES: Task 1, Task 2

Task 4: EDIT PRD.md Section 8.1
  - OPEN: /home/dustin/projects/groundswell/PRD.md
  - FIND: Line 183 containing "trackTiming?: boolean;"
  - REPLACE: With inline default documentation
  - OPTIONS:
    Option A (Inline Comment): "trackTiming?: boolean; // Default: true"
    Option B (JSDoc Style): Add /** Track and emit step duration (default: true) */ above line
    Option C (Table Format): Convert entire section to table (out of scope)
  - SELECT: Option A - Minimal change, follows TypeScript comment style
  - PRESERVE: All other Section 8.1 content unchanged
  - DEPENDENCIES: Task 3

Task 5: VALIDATE Markdown Formatting
  - VERIFY: PRD.md renders correctly with edit
  - CHECK: Code block formatting maintained
  - CONFIRM: No broken markdown syntax
  - DEPENDENCIES: Task 4

Task 6: VERIFY Cross-Reference Consistency
  - CONFIRM: PRD now matches src/types/decorators.ts JSDoc
  - CONFIRM: PRD now matches README.md table documentation
  - CONFIRM: PRD now matches implementation behavior
  - DEPENDENCIES: Task 5
```

### Implementation Patterns & Key Details

```markdown
# EDIT LOCATION
File: /home/dustin/projects/groundswell/PRD.md
Line: 183 (approximately)
Section: 8.1 @Step() Decorator

# BEFORE (Current State)
```ts
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;
  logStart?: boolean;
  logFinish?: boolean;
}
```

# AFTER (Desired State) - Option A: Inline Comment
```ts
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;  // Default: true - Track and emit step duration
  logStart?: boolean;
  logFinish?: boolean;
}
```

# ALTERNATIVE - Option B: JSDoc Style (matches src/types/decorators.ts)
```ts
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  /** Track and emit step duration (default: true) */
  trackTiming?: boolean;
  logStart?: boolean;
  logFinish?: boolean;
}
```

# RECOMMENDED: Option A (Inline Comment)
# - Minimal change
# - Follows TypeScript inline comment convention
# - Easily scannable
# - Matches the pattern used for ErrorMergeStrategy elsewhere in PRD

# IMPLEMENTATION GOTCHA
# The PRD uses ```ts code blocks, not ```typescript
# Ensure code block language identifier remains "ts"
```

### Integration Points

```yaml
NO INTEGRATION POINTS:
  - This is a standalone documentation edit
  - No code changes required
  - No test changes required
  - No configuration changes required
  - No build/deploy impact

CROSS-REFERENCE CONSISTENCY:
  - src/types/decorators.ts:11 already has correct JSDoc
  - README.md already shows correct default in table
  - This edit brings PRD in line with existing documentation
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Verify PRD.md is valid markdown after edit
# No build process for documentation
# Manual verification of markdown syntax

# Expected: No markdown rendering errors, code blocks display correctly
```

### Level 2: Content Validation (Documentation Accuracy)

```bash
# Read the edited Section 8.1
cat /home/dustin/projects/groundswell/PRD.md | sed -n '177,196p'

# Verify trackTiming line includes default documentation
grep -n "trackTiming" /home/dustin/projects/groundswell/PRD.md | grep -i "default.*true"

# Cross-reference with implementation
grep -A2 "trackTiming !== false" /home/dustin/projects/groundswell/src/decorators/step.ts

# Cross-reference with type definition
grep -B1 "trackTiming" /home/dustin/projects/groundswell/src/types/decorators.ts | grep "default: true"

# Expected: All three sources now agree that default is true
```

### Level 3: Consistency Validation (Cross-Reference Check)

```bash
# Extract trackTiming documentation from all sources
echo "=== PRD.md ===" && grep "trackTiming" /home/dustin/projects/groundswell/PRD.md
echo "=== decorators.ts ===" && grep -A1 "trackTiming" /home/dustin/projects/groundswell/src/types/decorators.ts
echo "=== step.ts ===" && grep "trackTiming !== false" /home/dustin/projects/groundswell/src/decorators/step.ts
echo "=== README.md ===" && grep -A1 "trackTiming" /home/dustin/projects/groundswell/README.md | head -2

# Expected: All sources consistently indicate default: true
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Developer Experience Validation
# Simulate developer reading PRD to understand default behavior

# Search PRD for "trackTiming" and check if default is visible
grep -C5 "trackTiming" /home/dustin/projects/groundswell/PRD.md | head -20

# Verify the documentation is scannable (not buried)
# Verify it follows existing PRD patterns
# Verify it matches the ErrorMergeStrategy documentation style

# Expected: Default value is immediately visible when reading Section 8.1
```

## Final Validation Checklist

### Technical Validation

- [ ] PRD.md edited at correct line (approximately line 183)
- [ ] trackTiming now includes "Default: true" documentation
- [ ] Markdown formatting is valid (code blocks render correctly)
- [ ] No unintended changes to other lines in Section 8.1

### Feature Validation

- [ ] PRD explicitly states trackTiming defaults to true
- [ ] Documentation matches implementation `!== false` pattern
- [ ] Documentation matches src/types/decorators.ts JSDoc
- [ ] Documentation matches README.md table
- [ ] Issue 4 bug report is resolved (documentation gap closed)

### Code Quality Validation

- [ ] Edit follows existing PRD documentation patterns
- [ ] Minimal change principle respected (only trackTiming line modified)
- [ ] No code changes (documentation-only fix)
- [ ] No test changes required (behavior unchanged)

### Documentation & Deployment

- [ ] Change is self-documenting (default value visible in PRD)
- [ ] No migration required (documentation only)
- [ ] No breaking changes (API behavior unchanged)
- [ ] Git commit message clearly describes documentation update

---

## Anti-Patterns to Avoid

- **Don't** modify other option definitions (name, snapshotState, logStart, logFinish) - out of scope
- **Don't** convert entire section to table format - that's a separate task
- **Don't** modify implementation code - this is documentation-only
- **Don't** add tests - behavior is unchanged, only documentation is corrected
- **Don't** use verbose language - keep inline comment concise
- **Don't** add JSDoc if inline comment is sufficient - choose one format and stick with it
- **Don't** modify the Section 8.1 header or responsibilities section - only the interface definition

---

## Confidence Score

**9/10** - One-pass implementation success likelihood

**Reasoning**:
- Single file edit with clear location
- Minimal scope (one line change)
- Extensive context provided (implementation, type definition, documentation patterns)
- Clear before/after examples
- No code complexity or dependencies
- No risk of breaking existing functionality

**Risk Mitigation**:
- The only risk is choosing the wrong documentation format (inline comment vs JSDoc)
- Both formats are acceptable; inline comment is recommended for minimal change
- Either format successfully addresses Issue 4

---

## Appendix: Issue 4 Context

**Issue 4**: "trackTiming should be documented as defaulting to true"

**Problem Statement**:
The PRD Section 8.1 shows `trackTiming?: boolean` without indicating the default value. However, the implementation in `src/decorators/step.ts:94` uses `if (opts.trackTiming !== false)`, which clearly indicates the default is `true` (timing is tracked unless explicitly disabled).

**Impact**:
Developers reading the PRD cannot determine the default behavior without examining source code, creating unnecessary friction and potential confusion.

**Root Cause**:
When the `@Step` decorator was initially documented, the default value was omitted from the PRD while the type definition JSDoc and README were correctly updated.

**Solution**:
Add explicit default value documentation to PRD Section 8.1 to align with:
1. Implementation behavior (`!== false` pattern)
2. Type definition JSDoc (`src/types/decorators.ts:11`)
3. User-facing documentation (`README.md`)

**References**:
- Bug Report: Issue 4 (internal issue tracker)
- Related: P1.M2.T3 - Document trackTiming Default Value in PRD
- Prerequisite: P1.M2.T3.S1 - Locate PRD section for @Step decorator options (COMPLETE)
