# PRP: Update README.md with @Step Decorator Timing Documentation (P1.M3.T1.S2)

---

## Goal

**Feature Goal**: Add clear documentation to README.md explaining the `trackTiming` option in the `@Step` decorator, including its default behavior of `true` and how to disable it.

**Deliverable**: Updated README.md with a new section or expanded @Step documentation that explains:
- `trackTiming` defaults to `true` (timing is tracked by default)
- How to disable timing with `@Step({ trackTiming: false })`
- When/why developers might want to disable timing tracking
- Code example showing both enabled and disabled states

**Success Definition**: README.md contains explicit documentation of `trackTiming` default behavior with working code examples that can be copied and pasted.

## User Persona

**Target User**: Developer/Library Consumer who uses the `@Step` decorator in their workflow classes and references the README.md for usage examples.

**Use Case**: When a developer reads the README to understand decorator options, they need to see:
1. What the default behavior is (timing on by default)
2. How to override the default (timing off)
3. When/why to disable timing

**User Journey**:
1. Developer installs groundswell and opens README.md
2. Developer reads the "Decorators" section to understand @Step usage
3. Developer sees current example: `@Step({ trackTiming: true, snapshotState: true })`
4. Developer is unclear: Is `trackTiming: true` the default, or is this example explicitly enabling it?
5. Developer reads new documentation explaining default is `true` and sees example of disabling it

**Pain Points Addressed**:
- README examples show `trackTiming: true` explicitly, suggesting it might be required
- No documentation explains the default behavior
- No example shows `trackTiming: false` to disable timing
- Unclear whether omitting the option enables or disables timing
- No guidance on when/why to disable timing (performance considerations)

## Why

- **Completes P1.M3.T1**: P1.M3.T1.S1 added JSDoc to the type definition; P1.M3.T1.S2 adds user-facing README documentation
- **User Experience**: README is the first place developers look; type definitions are secondary
- **Reduces Confusion**: Current example `@Step({ trackTiming: true })` suggests explicit opt-in rather than default-on
- **Performance Guidance**: Developers need to know when disabling timing is appropriate
- **Best Practices**: Following research from Pino, Node Cache, and other libraries - default-enabled performance features should clearly document the default AND the trade-off
- **Gap Resolution**: Addresses lack of user-facing documentation for `trackTiming` default behavior

## What

Update README.md to document the `trackTiming` option's default behavior and usage.

### Current README.md Decorators Section (Lines 114-131)

```markdown
## Decorators

```typescript
// Emit lifecycle events and track timing
@Step({ trackTiming: true, snapshotState: true })
async processData(): Promise<void> { }

// Spawn and manage child workflows
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }

// Mark fields for state snapshots
@ObservedState()
progress: number = 0;

@ObservedState({ redact: true })  // Shown as '***'
apiKey: string = 'secret';
```
```

### Required Changes

**Option 1: Add dedicated @Step section with full documentation (RECOMMENDED)**

Add a new subsection after "Decorators" heading:

```markdown
## Decorators

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
| `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event. Set to `false` to eliminate timing overhead. |
| `snapshotState` | `boolean` | `false` | Capture state snapshot after step completion |
| `logStart` | `boolean` | `false` | Log message at step start |
| `logFinish` | `boolean` | `false` | Log message at step end (includes duration) |

**Examples**:

```typescript
// Default behavior - timing tracked automatically
@Step()
async basicStep(): Promise<void> { }

// Disable timing for performance-critical code
@Step({ trackTiming: false })
async highFrequencyStep(): Promise<void> { }

// Full configuration
@Step({ trackTiming: true, snapshotState: true, logStart: true })
async monitoredStep(): Promise<void> { }
```

**Performance Note**: Timing tracking has minimal overhead. Disable `trackTiming` only in performance-critical code paths with high-frequency execution.

### @Task

[Keep existing @Task documentation]

### @ObservedState

[Keep existing @ObservedState documentation]
```

**Option 2: Minimal update to existing section**

Replace the current decorators section with:

```typescript
// @Step: Emit lifecycle events (timing tracked by default)
@Step({ trackTiming: true, snapshotState: true })
async processData(): Promise<void> { }

// Disable timing for performance-critical code
@Step({ trackTiming: false })
async fastStep(): Promise<void> { }

// @Task: Spawn and manage child workflows
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }

// @ObservedState: Mark fields for state snapshots
@ObservedState()
progress: number = 0;

@ObservedState({ redact: true })  // Shown as '***'
apiKey: string = 'secret';
```

### Success Criteria

- [ ] README.md explicitly states `trackTiming` defaults to `true`
- [ ] README.md includes example showing `@Step({ trackTiming: false })`
- [ ] README.md explains when/why to disable timing
- [ ] Code examples are valid TypeScript and can be copied/pasted
- [ ] Updated README.md renders correctly as markdown
- [ ] All existing README examples still work

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:
- Exact line numbers of current @Step documentation in README
- Multiple options for the update (recommended vs minimal)
- Complete before/after examples
- Research from popular libraries on documenting default behavior
- Existing codebase patterns to follow
- Validation commands

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- file: README.md
  why: TARGET FILE - Contains decorators section requiring update
  pattern: Lines 114-131 contain current decorators section
  line_range: 114-131
  critical: Lines 117-119 show current @Step example that needs context

- file: README.md
  why: TARGET FILE - Contains Quick Start section with @Step usage
  pattern: Lines 17-43 show @Step in Quick Start with trackTiming: true
  line_range: 17-43
  critical: Line 24 shows @Step({ trackTiming: true, snapshotState: true })
  note: This example reinforces the confusion - explicitly showing trackTiming: true

- file: src/types/decorators.ts
  why: SOURCE OF TRUTH - StepOptions interface with JSDoc from P1.M3.T1.S1
  pattern: Lines 4-15 show StepOptions interface with "(default: true)" for trackTiming
  line_range: 4-15
  critical: Line 10 contains updated JSDoc: "Track and emit step duration (default: true)"

- file: src/decorators/step.ts
  why: IMPLEMENTATION PROOF - Shows trackTiming default is true
  pattern: Line 94 shows `if (opts.trackTiming !== false)` proving default is true
  line_range: 88-101
  critical: The condition !== false means default is true

- file: examples/examples/02-decorator-options.ts
  why: EXAMPLE CODE - Contains working @Step examples with all options
  pattern: Lines 60-74 show stepWithTiming and stepWithSnapshot examples
  line_range: 60-96
  critical: Shows real usage patterns that can be referenced for README examples

- file: plan/bugfix/P1M3T1S1/PRP.md
  why: SIBLING PRP - Completed JSDoc documentation for trackTiming default
  pattern: Shows the pattern for documenting default values
  section: "Goal" and "Implementation Patterns & Key Details"
  reference: P1.M3.T1.S1 added "(default: true)" to JSDoc in src/types/decorators.ts

# EXTERNAL RESEARCH - Best practices from popular libraries

- docfile: plan/bugfix/P1M3T1S2/research/timing_documentation_patterns.md
  why: RESEARCH FINDINGS - Comprehensive patterns from Pino, Node Cache for documenting timing defaults
  section: "Recommended Documentation Pattern for trackTiming Option"
  critical: Shows how popular libraries document default-enabled performance features

- docfile: plan/bugfix/P1M3T1S2/research/decorator_readme_patterns.md
  why: RESEARCH FINDINGS - TypeScript decorator documentation patterns
  section: "Key Findings" and "Groundswell-Specific Examples"
  critical: Table format with Default column is the recommended pattern

# URL REFERENCES - For additional context (if needed)

- url: https://github.com/pinojs/pino/blob/master/docs/api.md
  why: Pino logger docs - excellent example of documenting timing/timestamp defaults
  section: "enabled" and "timestamp" options
  pattern: Shows explicit "Default: true" and performance considerations

- url: https://github.com/node-cache/node-cache/blob/master/README.md
  why: Node Cache - shows performance trade-off documentation
  section: "Options" with useClones documentation
  pattern: Shows inline *(default: `true`)* with performance explanation

- url: https://github.com/typestack/class-validator
  why: class-validator - extensive decorator options documentation
  note: Reference for table-based documentation of decorators
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── README.md                # TARGET FILE - User-facing documentation
├── docs/
│   ├── workflow.md          # Contains detailed decorator documentation
│   ├── agent.md
│   └── prompt.md
├── examples/
│   └── examples/
│       └── 02-decorator-options.ts  # Working decorator examples
├── plan/
│   └── bugfix/
│       ├── P1M3T1S1/        # Sibling PRP - JSDoc completed
│       └── P1M3T1S2/        # THIS PRP LOCATION
└── src/
    ├── decorators/
    │   └── step.ts          # Implementation with !== false proving default=true
    └── types/
        └── decorators.ts    # StepOptions interface with updated JSDoc
```

### Desired Codebase Tree (No new files - modification only)

```bash
# No new files created - this is a documentation-only change
# Modified: README.md (lines 114-131 or addition of new @Step subsection)
```

### Known Gotchas of Our Codebase & Library Quirks

```markdown
# CRITICAL: The Quick Start section (lines 17-43) also shows @Step with trackTiming: true
# This reinforces the confusion - make sure both sections are consistent

# Current Quick Start example (line 24):
# @Step({ trackTiming: true, snapshotState: true })
# This should remain as-is (it's a valid example), but the new documentation should clarify
# that trackTiming: true is the DEFAULT, not an explicit opt-in

# CRITICAL: README.md uses code fence format ```typescript not ```
# Preserve this format for all code examples

# CRITICAL: The existing decorators section (lines 114-131) uses a compact format
# Consider whether to expand into subsections OR add inline comments
# Option 1 (Recommended): Add dedicated @Step, @Task, @ObservedState subsections
# Option 2 (Minimal): Add inline comments to existing examples

# GOTCHA: README has TWO places showing @Step with trackTiming: true
# 1. Quick Start (line 24) - shows explicit trackTiming: true
# 2. Decorators section (line 117) - shows explicit trackTiming: true
# Both are valid examples but create confusion about default behavior
# Solution: Add clear documentation explaining default is true

# CRITICAL: Follow existing README formatting patterns
# - H2 ## for major sections
# - H3 ### for subsections (if using Option 1)
# - Code fences with ```typescript
# - Bold text for emphasis
# - Tables for options (recommended)

# GOTCHA: docs/workflow.md also contains decorator documentation
# Lines 114-244 in docs/workflow.md have detailed @Step information
# But README is the primary user-facing document
# Consider whether docs/workflow.md also needs updating (out of scope for this PRP)

# CRITICAL: The trackTiming default IS true, proven by implementation
# In src/decorators/step.ts line 94:
# if (opts.trackTiming !== false) { ... }
# This condition means: if trackTiming is undefined (not set), it is treated as true

# CRITICAL: Performance overhead is MINIMAL for timing tracking
# Date.now() calls at start/end of step - ~0.01ms overhead
# Only disable in extreme performance scenarios (1000+ steps/second)
# Document this appropriately - don't overstate the performance concern

# GOTCHA: Example file 02-decorator-options.ts shows both patterns
# Lines 70-74: @Step({ trackTiming: true }) - explicit true
# But this is just demonstration, not requirement
# Use this file as reference for valid code patterns

# CRITICAL: P1.M3.T1.S1 (sibling PRP) already added JSDoc "(default: true)"
# This PRP completes the documentation by adding user-facing README docs
# The two PRPs work together to fully document the default behavior

# STYLE: Use inclusive language
# "timing is tracked by default" instead of "you must explicitly enable"
# "disable timing with trackTiming: false" instead of "opt-out of timing"

# CRITICAL: Validate markdown renders correctly
# GitHub-flavored markdown
# Proper code fence syntax
# Table formatting if using tables
```

## Implementation Blueprint

### Data Models and Structure

This task modifies README.md documentation - no new data models needed.

**Key Documentation Structure**:
```markdown
## Decorators
├── @Step (NEW SUBSECTION - Option 1)
│   ├── Default Behavior
│   ├── Configuration Options Table
│   ├── Examples (progressive complexity)
│   └── Performance Note
├── @Task (existing or new subsection)
└── @ObservedState (existing or new subsection)
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: REVIEW CURRENT README STRUCTURE
  - READ: README.md lines 1-219 (full document)
  - IDENTIFY: Current decorators section at lines 114-131
  - IDENTIFY: Quick Start @Step example at lines 17-43
  - DECIDE: Use Option 1 (full subsection) or Option 2 (minimal update)
  - DEPENDENCIES: None

Task 2: VERIFY JSDOC COMPLETION FROM P1.M3.T1.S1
  - READ: src/types/decorators.ts line 10
  - VERIFY: JSDoc contains "(default: true)" for trackTiming
  - CONFIRM: Sibling PRP P1.M3.T1.S1 is complete
  - DEPENDENCIES: Task 1

Task 3: DETERMINE UPDATE APPROACH
  - DECISION: Option 1 (Recommended) - Add dedicated @Step subsection
  - ALTERNATIVE: Option 2 - Minimal inline comment update
  - CONSIDER: Maintain README consistency with existing sections
  - DEPENDENCIES: Task 2

Task 4: CREATE NEW @STEP SUBSECTION CONTENT (Option 1)
  - WRITE: "### @Step" heading after "## Decorators"
  - WRITE: Description sentence about default behavior
  - WRITE: Default behavior code example
  - WRITE: Configuration options table with Default column
  - WRITE: Progressive code examples (default, disabled, full config)
  - WRITE: Performance note
  - DEPENDENCIES: Task 3

Task 5: UPDATE EXISTING DECORATORS SECTION (Option 2 Alternative)
  - PRESERVE: Existing code fence with examples
  - ADD: Inline comments explaining default behavior
  - ADD: Example showing @Step({ trackTiming: false })
  - ADD: Performance consideration comment
  - DEPENDENCIES: Task 3

Task 6: VERIFY MARKDOWN FORMATTING
  - CHECK: Proper heading levels (## Decorators, ### @Step)
  - CHECK: Code fences use ```typescript
  - CHECK: Table formatting is correct (if using tables)
  - CHECK: No broken links or references
  - DEPENDENCIES: Task 4 OR Task 5

Task 7: VALIDATE CODE EXAMPLES
  - VERIFY: All TypeScript code examples are syntactically correct
  - VERIFY: Examples match patterns from examples/02-decorator-options.ts
  - VERIFY: @Step decorator syntax is correct
  - DEPENDENCIES: Task 6

Task 8: CROSS-REFERENCE WITH QUICK START
  - VERIFY: Quick Start example (line 24) is consistent with new docs
  - CONSIDER: Whether Quick Start needs clarification comment
  - DECISION: Keep Quick Start as-is OR add inline comment
  - DEPENDENCIES: Task 7

Task 9: FINAL REVIEW
  - READ: Full updated README.md
  - VERIFY: trackTiming default is clearly stated
  - VERIFY: Example showing trackTiming: false is present
  - VERIFY: Performance guidance is included
  - DEPENDENCIES: Task 8
```

### Implementation Patterns & Key Details

```markdown
====================================================================
OPTION 1: DEDICATED @STEP SUBSECTION (RECOMMENDED)
====================================================================

REPLACE lines 114-131 with:

## Decorators

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
| `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event. Set to `false` to eliminate timing overhead. |
| `snapshotState` | `boolean` | `false` | Capture state snapshot after step completion |
| `logStart` | `boolean` | `false` | Log message at step start |
| `logFinish` | `boolean` | `false` | Log message at step end (includes duration) |

**Examples**:

```typescript
// Default behavior - timing tracked automatically
@Step()
async basicStep(): Promise<void> { }

// Disable timing for performance-critical code
@Step({ trackTiming: false })
async highFrequencyStep(): Promise<void> { }

// Full configuration
@Step({ trackTiming: true, snapshotState: true, logStart: true })
async monitoredStep(): Promise<void> { }
```

**Performance Note**: Timing tracking has minimal overhead. Disable `trackTiming` only in performance-critical code paths with high-frequency execution.

### @Task

Spawn and manage child workflows.

```typescript
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }
```

### @ObservedState

Mark fields for state snapshots.

```typescript
@ObservedState()
progress: number = 0;

@ObservedState({ redact: true })  // Shown as '***'
apiKey: string = 'secret';
```

====================================================================
OPTION 2: MINIMAL INLINE UPDATE
====================================================================

REPLACE lines 117-119 with:

```typescript
// @Step: Emit lifecycle events (timing tracked by default)
@Step({ trackTiming: true, snapshotState: true })
async processData(): Promise<void> { }

// Disable timing for performance-critical code
@Step({ trackTiming: false })
async fastStep(): Promise<void> { }

// @Task: Spawn and manage child workflows
```

====================================================================
KEY PATTERNS TO FOLLOW
====================================================================

1. DEFAULT BEHAVIOR STATEMENT
   - "timing tracked by default"
   - "automatically tracks timing"
   - NOT: "you must explicitly enable timing"

2. TABLE FORMAT WITH DEFAULT COLUMN
   | Option | Type | Default | Description |
   |--------|------|---------|-------------|
   | trackTiming | boolean | true | ... |

3. PROGRESSIVE EXAMPLES
   - Level 1: @Step() with no options (shows default)
   - Level 2: @Step({ trackTiming: false }) (shows override)
   - Level 3: @Step({ ... multiple options ... }) (shows full config)

4. PERFORMANCE GUIDANCE
   - State overhead is minimal
   - Only disable in performance-critical scenarios
   - Don't overstate the performance concern

====================================================================
RESEARCH-BASED BEST PRACTICES
====================================================================

From Pino Logger (https://github.com/pinojs/pino):
- Explicit "Default: true" statement
- Caution notes for performance implications
- Clear inverse phrasing ("Set to false to disable")

From Node Cache (https://github.com/node-cache/node-cache):
- Inline *(default: `true`)* notation
- Note sections explaining when to use each option
- Performance vs simplicity trade-off clearly articulated

Recommended for Groundswell:
- Combine both patterns
- Table with Default column for quick reference
- Inline text explanation with example code
- Performance note that's honest but not alarmist
```

### Integration Points

```yaml
NO NEW INTEGRATION POINTS:
  - This is a documentation-only change
  - No API changes
  - No behavior changes
  - No breaking changes

RELATED DOCUMENTATION:
  - src/types/decorators.ts: JSDoc from P1.M3.T1.S1 (already completed)
  - examples/02-decorator-options.ts: Source of working code examples
  - docs/workflow.md: Detailed workflow documentation (out of scope)

DOCUMENTATION DEPENDENCY CHAIN:
  P1.M3.T1.S1: Add JSDoc to StepOptions.trackTiming (COMPLETE)
    ↓
  P1.M3.T1.S2: Update README.md with @Step timing documentation (THIS TASK)
    ↓
  P1.M3.T2.S1: Add JSDoc to @Task decorator (FUTURE)
  P1.M3.T2.S2: Update README.md with @Task documentation (FUTURE)

README SECTIONS AFFECTED:
  - Quick Start (line 24): Shows @Step with trackTiming: true
    → Consider adding inline comment: "// trackTiming is true by default"
  - Decorators (lines 114-131): Target section for update
    → Either replace with subsections OR add inline documentation
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

# View the updated README
cat README.md | grep -A 20 "## Decorators"
# Expected: Updated decorators section with @Step documentation

# Verify trackTiming documentation is present
grep -n "trackTiming" README.md
# Expected: Multiple occurrences, including documentation of default

# Verify default behavior is explicitly stated
grep -n "default" README.md | grep -i timing
# Expected: At least one result showing "trackTiming" with "default" or "true"
```

### Level 2: Content Validation (Documentation Review)

```bash
# Verify all required elements are present
echo "Checking for required documentation elements..."

# Check for explicit default statement
grep -q "trackTiming.*default.*true" README.md && echo "✓ Default stated" || echo "✗ Default NOT stated"

# Check for example showing trackTiming: false
grep -q "trackTiming.*false" README.md && echo "✓ Disable example present" || echo "✗ Disable example missing"

# Check for performance guidance
grep -qi "performance" README.md && echo "✓ Performance note present" || echo "✗ Performance note missing"

# Expected output: All three checks pass
```

### Level 3: Code Example Validation

```bash
# Extract code examples from README and verify syntax
# This is a manual check - copy code examples and verify they work

# Run the decorator options example to ensure patterns are valid
npm run start:decorators
# Expected: Examples run successfully

# Verify new examples match existing patterns
diff <(grep -A 3 "@Step({ trackTiming: false })" README.md) <(grep -A 3 "@Step({ trackTiming:" examples/examples/02-decorator-options.ts | head -4)
# Expected: Patterns are similar (not exact match expected)
```

### Level 4: Documentation Render Validation

```bash
# If GitHub CLI is available, preview markdown rendering
# Otherwise, manual visual review required

# Open README in markdown preview (VS Code or similar)
# Verify:
# 1. Table formatting renders correctly
# 2. Code blocks have proper syntax highlighting
# 3. Headings are visually distinct
# 4. No formatting issues

# Manual checklist:
echo "Visual Rendering Checklist:"
echo "- [ ] @Step subsection is visually distinct"
echo "- [ ] Table columns align properly"
echo "- [ ] Code examples have syntax highlighting"
echo "- [ ] Bold text renders correctly"
echo "- [ ] No broken lines or formatting issues"
```

### Level 5: Cross-Reference Validation

```bash
# Verify consistency across all documentation locations

# Check README vs type definition JSDoc
echo "README states trackTiming default:"
grep "trackTiming" README.md | grep -i "default\|true"
echo ""
echo "Type definition JSDoc states:"
grep "trackTiming" src/types/decorators.ts

# Expected: Both indicate default is true

# Check README vs implementation
echo "Implementation proof:"
grep -B 2 -A 2 "trackTiming !== false" src/decorators/step.ts

# Expected: !== false confirms default is true
```

## Final Validation Checklist

### Technical Validation

- [ ] All validation levels completed successfully
- [ ] Markdown syntax is valid (no broken formatting)
- [ ] Code examples are valid TypeScript
- [ ] Table formatting is correct (if using tables)
- [ ] No broken links or references

### Feature Validation

- [ ] `trackTiming` default is explicitly stated as `true`
- [ ] Example showing `@Step({ trackTiming: false })` is present
- [ ] Documentation explains when/why to disable timing
- [ ] Performance guidance is included
- [ ] Examples are copy-pasteable and work correctly
- [ ] Consistent with JSDoc from P1.M3.T1.S1

### Documentation Quality Validation

- [ ] Follows README.md existing formatting patterns
- [ ] Progressive examples (default → disabled → full config)
- [ ] Clear, concise language
- [ ] No jargon without explanation
- [ ] Performance note is honest but not alarmist

### Integration Validation

- [ ] Consistent with Quick Start example (line 24)
- [ ] Consistent with src/types/decorators.ts JSDoc
- [ ] Matches patterns from examples/02-decorator-options.ts
- [ ] No contradictions across documentation

---

## Anti-Patterns to Avoid

- ❌ **Don't suggest timing is opt-in** - Current examples show `trackTiming: true` which implies opt-in, clarify this is the default
- ❌ **Don't overstate performance impact** - Timing overhead is minimal (~0.01ms), don't alarm users
- ❌ **Don't use complex tables** - Keep table simple: Option | Type | Default | Description
- ❌ **Don't forget the disable example** - Must show `@Step({ trackTiming: false })`
- ❌ **Don't modify Quick Start unnecessarily** - That example is fine as-is, focus on Decorators section
- ❌ **Don't break existing links** - If docs/workflow.md references specific lines, be aware (though likely no hard links)
- ❌ **Don't use markdown raw HTML** - Stick to standard markdown syntax
- ❌ **Don't add examples that don't work** - All code must be valid TypeScript
- ❌ **Don't forget to cross-reference** - Ensure consistency with JSDoc from P1.M3.T1.S1
- ❌ **Don't skip validation** - Even documentation changes need verification

---

## Related Work Items

- **P1.M3.T1.S1**: Add JSDoc to @Step decorator trackTiming option - **COMPLETE** (dependency)
- **P1.M3.T1.S2**: Update README.md with @Step decorator timing documentation - **THIS TASK**
- **P1.M3.T2.S1**: Add JSDoc to @Task decorator explaining validation behavior - Future
- **P1.M3.T2.S2**: Update README.md with @Task validation behavior documentation - Future

---

## Confidence Score

**9/10** for one-pass implementation success likelihood

**Justification**:
- Clear before/after specification with two implementation options
- Sibling PRP P1.M3.T1.S1 already completed (JSDoc added)
- Research from popular libraries provides proven patterns
- Existing code examples (02-decorator-options.ts) can be referenced
- No code changes required - documentation only
- Multiple validation approaches available

**Risk Factors**:
- Decision between Option 1 (subsection) vs Option 2 (minimal update) requires judgment
- Maintaining consistency with existing README style
- Ensuring Quick Start and Decorators sections are aligned

**Mitigation**: PRP provides both Option 1 and Option 2 with clear recommendations. Option 1 (dedicated subsection) follows research from popular libraries and provides the most comprehensive documentation. The implementation tasks include decision points with clear criteria.

---

## Appendices

### Appendix A: Current README Decorators Section

```markdown
## Decorators

```typescript
// Emit lifecycle events and track timing
@Step({ trackTiming: true, snapshotState: true })
async processData(): Promise<void> { }

// Spawn and manage child workflows
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }

// Mark fields for state snapshots
@ObservedState()
progress: number = 0;

@ObservedState({ redact: true })  // Shown as '***'
apiKey: string = 'secret';
```
```

**Issue**: The comment "Emit lifecycle events and track timing" doesn't clarify whether `trackTiming: true` is required or the default.

### Appendix B: Current README Quick Start Example

```markdown
class DataProcessor extends Workflow {
  @ObservedState()
  progress = 0;

  @Step({ trackTiming: true, snapshotState: true })
  async process(): Promise<string[]> {
    this.progress = 100;
    return ['item1', 'item2', 'item3'];
  }
  ...
}
```

**Issue**: Shows explicit `trackTiming: true` without noting it's the default, reinforcing confusion.

### Appendix C: Working Code Example Reference

From `examples/examples/02-decorator-options.ts`:

```typescript
// Step with timing tracking
@Step({ trackTiming: true })
async stepWithTiming(): Promise<void> {
  this.currentPhase = 'timed';
  await sleep(200); // Longer delay to show timing
}

// Step with ALL options enabled
@Step({
  name: 'FullyConfiguredStep',
  snapshotState: true,
  trackTiming: true,
  logStart: true,
  logFinish: true,
})
async fullyConfiguredStep(): Promise<void> {
  this.currentPhase = 'fully-configured';
  this.itemsProcessed = 100;
  await sleep(100);
}
```

This file can be used as reference for valid code patterns.

### Appendix D: Research Summary

**Key Findings from Popular Libraries**:

1. **Pino Logger** - Uses explicit "Default: true" statements and Caution notes for performance
2. **Node Cache** - Uses inline *(default: `true`)* with performance vs simplicity trade-offs
3. **Best Practice** - Combine table format with Default column AND inline text explanation

**Recommended Pattern for Groundswell**:
- Table with Default column for quick reference
- Progressive code examples (default → disabled → full config)
- Honest but not alarmist performance note
- Clear "disabled by default" vs "opt-out" language

### Appendix E: Quick Reference Commands

```bash
# View current decorators section
sed -n '114,131p' README.md

# View current Quick Start @Step example
sed -n '17,43p' README.md

# Verify JSDoc from P1.M3.T1.S1 is complete
grep -A 1 "trackTiming" src/types/decorators.ts

# Check all trackTiming occurrences in README
grep -n "trackTiming" README.md

# Run decorator examples to verify patterns work
npm run start:decorators
```
