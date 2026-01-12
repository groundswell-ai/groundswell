# PRP: Locate PRD Section for @Step Decorator Options (P1.M2.T3.S1)

---

## Goal

**Feature Goal**: Locate and document the exact location of PRD Section 8.1 (@Step Decorator Options) containing the trackTiming option specification.

**Deliverable**: Research report identifying the exact file path (`PRD.md`), line numbers (177-189), and specific line (183) for the trackTiming option, along with confirmation of the documentation gap.

**Success Definition**: The exact location of @Step decorator options in the PRD is documented, the documentation gap (missing default value for trackTiming) is confirmed, and research findings are stored for the next subtask (P1.M2.T3.S2) to use when updating the PRD.

## User Persona

**Target User**: Documentation maintainer / Developer responsible for updating PRD documentation

**Use Case**: Need to find where in the PRD to add the trackTiming default value documentation as part of fixing Issue 4 from the bug report

**User Journey**:
1. Receive task to locate PRD Section 8.1 for @Step decorator options
2. Search codebase for PRD files containing @Step decorator documentation
3. Identify exact file path and line numbers for trackTiming option
4. Verify implementation behavior to confirm default value
5. Document findings for next task (S2) to update PRD

**Pain Points Addressed**:
- PRD is a large file (500+ lines) - difficult to locate specific sections manually
- Documentation gap causes confusion about default behavior (implementation defaults to true but PRD doesn't state it)
- Next task (S2) needs precise location information to make the update efficiently

## Why

- **Documentation Quality**: The PRD should match the implementation - currently it doesn't explicitly state the trackTiming default value
- **Developer Experience**: Developers reading the PRD should understand default behavior without digging into source code
- **Bug Fix Context**: Part of Issue 4 from the bug report - "trackTiming should be documented as defaulting to true"
- **Dependency for S2**: This research task provides the exact location needed for P1.M2.T3.S2 to update the PRD

## What

This is a **pure research task** with no code changes. The deliverable is a research report documenting:

1. Exact location of PRD Section 8.1 (@Step Decorator Options)
2. Line number for trackTiming option
3. Confirmation that default value is NOT documented in PRD
4. Verification that implementation defaults to true
5. Comparison with other documentation sources (README, type definitions)

### Success Criteria

- [ ] Exact file path for PRD Section 8.1 identified: `/home/dustin/projects/groundswell/PRD.md`
- [ ] Line numbers for @Step Decorator Options documented: lines 177-189
- [ ] Specific line for trackTiming documented: line 183
- [ ] Documentation gap confirmed: PRD shows `trackTiming?: boolean` without default value
- [ ] Implementation default verified: code uses `if (opts.trackTiming !== false)` meaning default is true
- [ ] Research findings stored in `P1M2T3S1/research/` subdirectory
- [ ] Clear path provided for next task (S2) to update the PRD

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validated: "If someone knew nothing about this codebase, would they have everything needed to locate the PRD section and document the findings?"_

**Answer**: YES - The PRD location is exact, implementation details are provided, and external research patterns are documented.

### Documentation & References

```yaml
# MUST READ - PRD Location (Primary Target)
- file: /home/dustin/projects/groundswell/PRD.md
  lines: 177-189
  why: Contains Section 8.1 @Step Decorator Options definition with trackTiming option
  pattern: TypeScript interface StepOptions with all 5 options
  gotcha: Default value NOT documented in PRD - only shows "trackTiming?: boolean"
  critical: This is the file that needs to be updated in subtask S2

# MUST READ - Type Definition (Has Default Value in JSDoc)
- file: /home/dustin/projects/groundswell/src/types/decorators.ts
  lines: 6-17
  why: Contains JSDoc comment showing "Track and emit step duration (default: true)"
  pattern: JSDoc comments above interface properties document behavior
  gotcha: Type definitions are correct but PRD doesn't match this documentation
  critical: Confirms that the default value should be documented as true

# MUST READ - Implementation (Confirms Default Behavior)
- file: /home/dustin/projects/groundswell/src/decorators/step.ts
  lines: 94-101
  why: Contains implementation showing default behavior with negation pattern
  pattern: "if (opts.trackTiming !== false)" means default is true
  gotcha: This is an "opt-out" pattern - timing is tracked unless explicitly disabled
  critical: Implementation proof that default is true

# MUST READ - User Documentation (Correctly Documents Default)
- file: /home/dustin/projects/groundswell/README.md
  lines: 129-136
  why: User-facing table correctly shows trackTiming default: true
  pattern: Markdown table with columns: Option | Type | Default | Description
  gotcha: User docs are correct, PRD is the only source missing this information
  critical: Shows how default values should be documented

# Research Files (Stored During This Task)
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T3S1/research/PRD_LOCATION_ANALYSIS.md
  why: Detailed analysis of PRD location, current content, and documentation gap
  section: Conclusion (has exact file path and line numbers)

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T3S1/research/DECORATOR_DOCUMENTATION_PATTERNS.md
  why: External research on documentation best practices for default values
  section: Recommended Patterns for Groundswell PRD

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T3S1/research/CODEBASE_INVENTORY.md
  why: Complete inventory of all trackTiming references across the codebase
  section: Summary Table (shows PRD is only file without default value)

# External Documentation References
- url: https://jsdoc.app/
  why: JSDoc @default tag is industry standard for documenting default values
  critical: Shows TypeScript/JSDoc patterns for default value documentation
```

### Current Codebase tree (relevant portion)

```bash
groundswell/
├── PRD.md                                    # MAIN TARGET - Section 8.1 @Step Decorator Options (lines 177-189)
├── README.md                                 # User docs with correct default value table (lines 129-136)
├── src/
│   ├── types/
│   │   └── decorators.ts                     # StepOptions interface with JSDoc showing default: true (lines 6-17)
│   └── decorators/
│       └── step.ts                           # Implementation: if (opts.trackTiming !== false) (line 94)
└── plan/
    └── 001_d3bb02af4886/
        └── bugfix/
            └── 001_e8e04329daf3/
                └── P1M2T3S1/
                    ├── PRP.md                # This file
                    └── research/
                        ├── PRD_LOCATION_ANALYSIS.md
                        ├── DECORATOR_DOCUMENTATION_PATTERNS.md
                        ├── CODEBASE_INVENTORY.md
                        └── ULTRATHINK_PRP_PLAN.md
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: PRD.md uses a simple TypeScript interface format
// The interface definition doesn't include inline comments for default values
// This is different from src/types/decorators.ts which has JSDoc comments

// CURRENT PRD FORMAT (lines 177-189):
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;  // ❌ No default value documented
  logStart?: boolean;
  logFinish?: boolean;
}

// GOTCHA: The implementation uses negation pattern
// if (opts.trackTiming !== false) means default is TRUE, not undefined
// This is an "opt-out" pattern - feature is enabled by default
```

## Implementation Blueprint

### Data models and structure

This is a research task - no data models needed.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: LOCATE PRD Section 8.1 (@Step Decorator Options)
  - FIND: File path /home/dustin/projects/groundswell/PRD.md
  - READ: Lines 177-189 for @Step Decorator Options section
  - IDENTIFY: Line 183 containing "trackTiming?: boolean"
  - CONFIRM: Default value is NOT documented in PRD (only shows optional boolean)
  - OUTPUT: Note exact file path and line numbers for next task

Task 2: VERIFY Implementation Default Behavior
  - READ: src/decorators/step.ts at line 94
  - ANALYZE: "if (opts.trackTiming !== false)" pattern
  - CONFIRM: Default is TRUE (this is an opt-out pattern, not opt-in)
  - UNDERSTAND: Timing is tracked unless user explicitly sets trackTiming: false
  - OUTPUT: Document implementation behavior for PRD update

Task 3: COMPARE All Documentation Sources
  - CHECK: src/types/decorators.ts lines 11-12 (JSDoc says "default: true")
  - CHECK: README.md lines 129-136 (table shows default: true)
  - IDENTIFY: PRD is the ONLY source missing this information
  - OUTPUT: Documentation gap analysis showing inconsistency

Task 4: CREATE Research Report Files
  - WRITE: PRD_LOCATION_ANALYSIS.md with exact file paths and line numbers
  - WRITE: CODEBASE_INVENTORY.md with all trackTiming references
  - WRITE: DECORATOR_DOCUMENTATION_PATTERNS.md with best practices
  - STORE: All files in P1M2T3S1/research/ subdirectory
  - OUTPUT: Research documentation for next task to reference

Task 5: DOCUMENT Findings for Next Task (S2)
  - PROVIDE: Exact location (PRD.md, line 183) for PRD update
  - RECOMMEND: Documentation pattern to use (inline comment or JSDoc)
  - OUTPUT: Clear guidance for P1.M2.T3.S2 to update PRD efficiently
```

### Implementation Patterns & Key Details

```typescript
// KEY FINDING: Implementation uses negation pattern
// File: src/decorators/step.ts, Line 94

if (opts.trackTiming !== false) {
  wf.emitEvent({
    type: 'stepEnd',
    node: wf.node,
    step: stepName,
    duration,
  });
}

// PATTERN: "!== false" means default is TRUE
// Timing is tracked unless explicitly disabled
// This is an "opt-out" pattern, not "opt-in"

// DOCUMENTATION PATTERN from src/types/decorators.ts:
/** Track and emit step duration (default: true) */
trackTiming?: boolean;

// DOCUMENTATION PATTERN from README.md (table format):
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event |

// RECOMMENDED PRD UPDATE (for S2 to implement):
// Option 1 - Inline comment:
// trackTiming?: boolean;  // default: true

// Option 2 - JSDoc-style comment:
// /** Track and emit step duration (default: true) */
// trackTiming?: boolean;
```

### Integration Points

```yaml
NEXT_TASK (P1.M2.T3.S2):
  - will_use: This research report
  - needs: Exact location (PRD.md line 183)
  - action: Update PRD to add "default: true" documentation
  - guidance: Use inline comment or JSDoc-style comment pattern

DOCUMENTATION ECOSYSTEM:
  - PRD.md: Missing default value (needs update in S2)
  - src/types/decorators.ts: Has JSDoc with default (correct)
  - README.md: Has table with default (correct)
  - Implementation: Uses !== false pattern (confirms default is true)
```

## Validation Loop

### Level 1: Research Completeness (Immediate Feedback)

```bash
# Verify research files were created
ls -la plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T3S1/research/

# Expected output:
# PRD_LOCATION_ANALYSIS.md
# DECORATOR_DOCUMENTATION_PATTERNS.md
# CODEBASE_INVENTORY.md
# ULTRATHINK_PRP_PLAN.md

# Verify PRD location
grep -n "trackTiming" PRD.md

# Expected: Line 183 shows "trackTiming?: boolean"
```

### Level 2: Location Verification (Confirm PRD Section)

```bash
# Read PRD Section 8.1 to verify content
sed -n '177,189p' PRD.md

# Expected output: Section 8.1 @Step() Decorator with StepOptions interface
# Should show trackTiming?: boolean on line 183
```

### Level 3: Documentation Gap Confirmation

```bash
# Confirm default value is NOT in PRD
grep -A2 -B2 "trackTiming" PRD.md | grep -i "default"

# Expected: No results (confirms documentation gap exists)

# Verify implementation has default behavior
grep "trackTiming !== false" src/decorators/step.ts

# Expected: Line 94 shows the negation pattern
```

### Level 4: Cross-Reference Verification

```bash
# Verify type definitions have default value
grep -A1 "Track and emit step duration" src/types/decorators.ts

# Expected: Shows "(default: true)" in JSDoc comment

# Verify README has default value
sed -n '129,136p' README.md

# Expected: Table showing trackTiming | boolean | true
```

## Final Validation Checklist

### Research Validation

- [ ] All 4 research files created in P1M2T3S1/research/
- [ ] PRD location documented: `/home/dustin/projects/groundswell/PRD.md`
- [ ] PRD line numbers documented: 177-189 for Section 8.1
- [ ] trackTiming specific line documented: Line 183
- [ ] Documentation gap confirmed: PRD doesn't show default value
- [ ] Implementation default verified: true (via !== false pattern)

### Documentation Quality

- [ ] Research files provide clear guidance for next task (S2)
- [ ] Recommended documentation patterns provided for PRD update
- [ ] All file paths are exact and verifiable
- [ ] Line numbers are accurate and tested

### Handoff Quality

- [ ] P1.M2.T3.S2 has everything needed to update PRD
- [ ] Exact update location specified (PRD.md line 183)
- [ ] Recommended format provided (inline or JSDoc comment)
- [ ] External best practices documented for reference

---

## Anti-Patterns to Avoid

- ❌ Don't modify PRD.md in this task (that's S2's job)
- ❌ Don't assume line numbers without verifying with actual file reads
- ❌ Don't skip verifying the implementation behavior
- ❌ Don't forget to store research findings for the next task
- ❌ Don't confuse opt-out (default true) vs opt-in (default false) patterns
- ❌ Don't overlook that README already correctly documents this - PRD is the gap

---

## Confidence Score

**10/10** - This is straightforward research with clear deliverables. The exact file path, line numbers, and documentation gap are easily verifiable. All context is provided for the next task to update the PRD efficiently.

## Success Metrics

**Completion**: When P1.M2.T3.S2 receives this research report and can immediately update PRD.md line 183 to add "default: true" documentation.

**Validation**: Run `grep -A2 -B2 "trackTiming" PRD.md` after S2 completes to verify default value is documented.
