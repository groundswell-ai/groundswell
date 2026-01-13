# Product Requirement Prompt (PRP): Audit Bug Fixes for Breaking Changes

**PRP ID**: P1.M4.T3.S1
**Work Item**: Audit bug fixes for breaking changes
**Created**: 2026-01-12
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Conduct a comprehensive audit of all bug fixes implemented in P1.M1 (Critical), P1.M2 (Major), and P1.M3 (Minor) to identify breaking changes, assess severity, and document mitigation strategies with migration paths where applicable.

**Deliverable**: Breaking changes audit report at `plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T3S1/BREAKING_CHANGES_AUDIT.md` containing:
- Complete inventory of all bug fixes with breaking change classification
- Severity assessment for each breaking change (Critical/High/Medium/Low)
- Mitigation strategies and migration paths for breaking changes
- Verification that backward compatibility claims are accurate

**Success Definition**:
- Every bug fix is audited against public API surface
- Breaking changes are identified with specific code references
- Non-breaking changes are explicitly documented with justification
- Report enables informed decisions about version bump requirements
- All findings are cross-referenced with test pass validation

---

## User Persona

**Target User**: Project maintainers and release managers who need to:
- Determine appropriate semantic version bump (PATCH vs MINOR vs MAJOR)
- Communicate breaking changes to users
- Provide migration guidance for affected code
- Make release readiness decisions

**Use Case**: Final validation step before release to ensure no unexpected breaking changes impact users.

**User Journey**:
1. Maintainer opens BREAKING_CHANGES_AUDIT.md to review audit results
2. Maintainer scans for any Critical or High severity breaking changes
3. For breaking changes found, maintainer reviews mitigation strategies
4. Maintainer uses findings to determine version bump (semver compliance)
5. Maintainer incorporates findings into changelog and release notes

**Pain Points Addressed**:
- **Unclear impact**: Without audit, breaking changes may surprise users post-release
- **Version uncertainty**: Maintainer doesn't know if version should be 0.0.3 or 0.1.0
- **Migration gaps**: Users need clear guidance when breaking changes occur
- **Trust erosion**: Undocumented breaking changes damage user trust

---

## Why

**Business value and user impact**:
- Comprehensive breaking change audit prevents user-facing regressions
- Clear severity classification enables appropriate version bumping
- Migration strategies reduce support burden and user frustration
- Proper documentation maintains trust through transparency

**Integration with existing features**:
- Builds upon bug fix implementations from P1.M1, P1.M2, P1.M3
- Cross-references test suite validation from P1.M4.T1
- Complements bug fix summary documentation from P1.M4.T2
- Informs backward compatibility test requirements for P1.M4.T3.S2

**Problems this solves and for whom**:
- **For maintainers**: Clear decision framework for version bumping
- **For users**: Transparent communication about breaking changes
- **For QA**: Validation that claimed backward compatibility is accurate
- **For documentation**: Source of truth for migration guide content

---

## What

Conduct a systematic audit of all bug fixes and create a markdown report with the following structure:

### Report Structure

```markdown
# Breaking Changes Audit Report - Version 0.0.3

## Executive Summary
[Overall assessment: breaking changes found, severity distribution, version recommendation]

## Methodology
[Audit process: public API surface identification, breaking change criteria, severity assessment]

## P1.M1 - Critical Fixes Audit
### WorkflowLogger.child() Signature Fix
[API impact assessment, breaking change determination, severity, mitigation]

## P1.M2 - Major Fixes Audit
### Promise.allSettled for Concurrent Tasks
[API impact assessment, breaking change determination, severity, mitigation]

### ErrorMergeStrategy Implementation
[API impact assessment, breaking change determination, severity, mitigation]

### trackTiming Default Documentation
[API impact assessment, breaking change determination, severity, mitigation]

## P1.M3 - Minor Fixes Audit
### Console.error to Logger Replacement
[API impact assessment, breaking change determination, severity, mitigation]

### Tree Debugger Optimization
[API impact assessment, breaking change determination, severity, mitigation]

### Workflow Name Validation
[API impact assessment, breaking change determination, severity, mitigation]

### isDescendantOf Public API
[API impact assessment, breaking change determination, severity, mitigation]

## Summary of Findings
### Breaking Changes Inventory
[Table of all breaking changes with severity and migration required]

### Non-Breaking Changes Justification
[Table of non-breaking changes with justification]

## Version Recommendation
[Semantic versioning analysis with recommended version bump]

## Migration Guide
[Step-by-step migration for any breaking changes]

## References
[Links to implementations, tests, and related documentation]
```

### Success Criteria

- [ ] Report created at specified path with complete structure
- [ ] All 11 bug fixes audited (1 Critical + 3 Major + 4 Minor + 1 Major doc)
- [ ] Public API surface clearly defined with src/index.ts as source
- [ ] Each fix classified as Breaking or Non-Breaking with justification
- [ ] Breaking changes include severity assessment (Critical/High/Medium/Low)
- [ ] Breaking changes include mitigation strategy and migration path
- [ ] Non-breaking changes include backward compatibility justification
- [ ] Version recommendation provided with semver reasoning
- [ ] All file references use absolute paths with line numbers

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test passed**: This PRP provides complete context including:
- Exact public API surface definition from src/index.ts
- Breaking change criteria from semver.org and TypeScript best practices
- All bug fix implementation locations with specific line numbers
- Test validation results proving backward compatibility
- Severity assessment framework with decision trees
- Migration patterns from existing CHANGELOG.md

### Documentation & References

```yaml
# MUST READ - Breaking change standards
- url: https://semver.org/spec/v2.0.0.html
  why: Definitive specification for what constitutes breaking changes
  section: Section 2 (Summary) - MAJOR version increments for incompatible API changes
  critical: "Breaking change: A change that breaks existing code or changes behavior in an incompatible way"

- url: https://semver.org/spec/v2.0.0.html#spec-item-8
  why: Specific definition of MAJOR version increment criteria
  critical: "MAJOR version when you make incompatible API changes"

# MUST READ - TypeScript breaking changes
- url: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes
  why: TypeScript-specific breaking change patterns (type narrowing, overload changes, etc.)
  critical: Function signature changes can be breaking even with overloads if behavior differs

# MUST READ - Project public API
- file: /home/dustin/projects/groundswell/src/index.ts
  why: Complete public API surface - only exports listed here are public APIs
  pattern: All public classes, types, functions, decorators
  critical: Breaking changes can ONLY occur to items exported from this file

# CRITICAL - Bug fix implementations to audit
- file: /home/dustin/projects/groundswell/src/core/logger.ts
  why: WorkflowLogger.child() signature change - function overloads for backward compatibility
  lines: 98-111
  public_api: Yes - WorkflowLogger is exported from src/index.ts
  audit_focus: Does child() overload pattern truly maintain backward compatibility?

- file: /home/dustin/projects/groundswell/src/decorators/task.ts
  why: Promise.allSettled replacement for concurrent tasks - behavior change
  lines: 112-142
  public_api: Yes - Task decorator is exported from src/index.ts
  audit_focus: Does Promise.allSettled behavior change break existing error handling expectations?

- file: /home/dustin/projects/groundswell/src/types/decorators.ts
  why: TaskOptions interface - errorMergeStrategy property added
  lines: 25-32
  public_api: Yes - TaskOptions type is exported from src/index.ts
  audit_focus: Adding optional properties to interfaces is non-breaking (additive change)

- file: /home/dustin/projects/groundswell/src/utils/workflow-error-utils.ts
  why: mergeWorkflowErrors utility function - new public API
  lines: 23-56
  public_api: Yes - mergeWorkflowErrors is exported from src/index.ts
  audit_focus: New public function is additive (non-breaking)

- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Multiple fixes - name validation, isDescendantOf public API
  lines: 98-107, 201-219
  public_api: Yes - Workflow class is exported from src/index.ts
  audit_focus: Constructor validation may throw for previously accepted inputs (potentially breaking)
  audit_focus: isDescendantOf made public is additive (non-breaking)

- file: /home/dustin/projects/groundswell/src/decorators/step.ts
  why: trackTiming default behavior documentation only
  lines: 94-101
  public_api: Yes - Step decorator is exported from src/index.ts
  audit_focus: Documentation-only change is non-breaking (behavior unchanged)

- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: console.error to logger replacement
  lines: 426, 444
  public_api: No - internal implementation detail
  audit_focus: Implementation-only change is non-breaking

- file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
  why: Tree debugger performance optimization
  lines: 65-84, 92-117
  public_api: Yes - WorkflowTreeDebugger is exported from src/index.ts
  audit_focus: Performance optimization without API changes is non-breaking

# VERIFICATION DOCUMENTS - For validation
- file: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M1T1S4/VERIFICATION_REPORT.md
  why: Proof that child() signature change maintains backward compatibility
  critical: All 361 tests pass with zero code modifications required

- file: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T1S1/TEST_EXECUTION_REPORT.md
  why: Full test suite validation proving no regressions
  critical: 100% test pass rate confirms backward compatibility

# PROJECT DOCUMENTATION
- file: /home/dustin/projects/groundswell/CHANGELOG.md
  why: Project's changelog with migration guide patterns
  pattern: Use for migration guide template and breaking change documentation format
  gotcha: Version 0.0.2 attachChild() behavior change has detailed migration guide

- file: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/prd_snapshot.md
  why: PRD specification for original behavior that bugs violated
  critical: Bug fixes that correct PRD violations are NOT breaking (old behavior was buggy)
```

### Current Codebase tree

```bash
# Relevant portion for audit output
plan/
└── 001_d3bb02af4886/
    └── bugfix/
        └── 001_e8e04329daf3/
            └── P1M4T3S1/
                ├── PRP.md                          # This file
                └── BREAKING_CHANGES_AUDIT.md       # OUTPUT: Audit report

# Source files to audit
src/
├── index.ts                     # Public API surface definition
├── core/
│   ├── logger.ts                # WorkflowLogger.child() signature (lines 98-111)
│   └── workflow.ts              # Name validation (98-107), isDescendantOf (201-219)
├── decorators/
│   ├── step.ts                  # trackTiming default (94-101)
│   └── task.ts                  # Promise.allSettled (112-142)
├── types/
│   └── decorators.ts            # TaskOptions.errorMergeStrategy (25-32)
├── utils/
│   └── workflow-error-utils.ts  # mergeWorkflowErrors (23-56)
└── debugger/
    └── tree-debugger.ts         # Optimization (65-84, 92-117)
```

### Desired Codebase tree with files to be added

```bash
plan/
└── 001_d3bb02af4886/
    └── bugfix/
        └── 001_e8e04329daf3/
            └── P1M4T3S1/
                ├── PRP.md                          # This file
                └── BREAKING_CHANGES_AUDIT.md       # OUTPUT: Comprehensive breaking changes audit report
```

### Known Gotchas of our codebase & Library Quirks

```markdown
# CRITICAL: Breaking Change Criteria for This Project

# Breaking changes are ONLY changes to PUBLIC API (exports from src/index.ts)
# Internal implementation changes are NEVER breaking changes

# Public API Surface:
# - All classes, functions, types exported from src/index.ts
# - Method signatures of exported classes
# - Properties of exported interfaces/types
# - Decorator behavior and options
# - Observable event types and structures

# NOT Breaking Changes:
# - Internal refactoring (private methods, helpers)
# - Performance optimizations that don't change behavior
# - Bug fixes that align behavior with documented/PRD specification
# - Adding new optional properties to interfaces
# - Adding new exported functions/classes
# - Making private methods public (additive)
# - Documentation-only changes

# BREAKING CHANGE PATTERNS:

# 1. Function/Method Signature Changes
# - Removing parameters or making them required
# - Changing parameter types (narrowing)
# - Changing return types
# - Reordering parameters

# 2. Interface/Type Changes
# - Removing properties from interfaces
# - Making optional properties required
# - Changing property types (narrowing)
# - Removing exported types entirely

# 3. Behavioral Changes
# - Changing default values that affect behavior
# - Modifying error handling in breaking ways
# - Changing validation rules (tightening)
# - Changing observable event structures

# 4. Removal Changes
# - Removing exported functions/classes/methods
# - Removing decorator options
# - Removing event types

# SEMVER GUIDANCE:
# - MAJOR: Any breaking change to public API
# - MINOR: Additive changes only (backward compatible)
# - PATCH: Bug fixes (backward compatible)

# GOTCHA: Version 0.x.x special rules
# According to semver, anything < 1.0.0 may have breaking changes
# However, this project should still document breaking changes for user trust

# GOTCHA: Function overloads
# WorkflowLogger.child() uses overloads for backward compatibility
# This is NON-BREAKING if all existing call patterns still work
# Verify by checking: do all existing tests pass without modification?

# GOTCHA: Constructor validation
# Workflow name validation rejects previously accepted inputs
# This IS POTENTIALLY BREAKING if users relied on empty/invalid names
# However: empty names don't make sense, likely fixing undefined behavior
# Classification: Low severity breaking change (fixing undefined behavior)

# GOTCHA: Promise.allSettled vs Promise.all
# Key difference: allSettled waits for ALL promises to complete
# Default behavior throws first error (backward compatible)
# This is NON-BREAKING because default behavior unchanged

# GOTCHA: Bug fixes correcting PRD violations
# If old behavior violated PRD specification, it was a bug
# Fixing bugs is NOT a breaking change (old behavior was wrong)
# Exception: if users rely on buggy behavior, document impact

# GOTCHA: Test suite validation
# 100% test pass rate STRONGLY suggests no breaking changes
# But tests may not cover all real-world usage patterns
# Audit should verify this by analyzing API surface, not just test results
```

---

## Implementation Blueprint

### Data models and structure

No data models needed - this is pure analysis and documentation.

The audit report uses a structured markdown format:

```markdown
# Breaking Change Audit Entry Template

## [Bug Fix Name]

### Public API Impact
**File**: `path/to/file.ts:##-##`
**Exported**: Yes/No - [Explain what is exported and how]
**Public API Element**: [Class.method / Interface / Function / Decorator]

### Breaking Change Assessment
**Classification**: BREAKING / NON-BREAKING
**Severity**: Critical / High / Medium / Low / N/A (for non-breaking)

### Reasoning
[Explain why this is or isn't a breaking change with specific references]

### Migration Required
**Yes/No**: [If yes, provide migration steps]

### Mitigation Strategy
[For breaking changes: how users can migrate their code]
[For non-breaking changes: why existing code continues to work]

### Verification
**Test Coverage**: [Reference to test files proving backward compatibility]
**Manual Verification**: [Commands to verify if needed]
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: DEFINE public API surface from src/index.ts
  - READ: /home/dustin/projects/groundswell/src/index.ts
  - EXTRACT: Complete list of all exported classes, functions, types, decorators
  - CATALOG: Each public API element with its source file
  - OUTPUT: Public API inventory table

Task 2: AUDIT P1.M1 - Critical Fixes (1 fix)
  - ANALYZE: WorkflowLogger.child() signature change
  - VERIFY: Function overload pattern maintains backward compatibility
  - CHECK: All 20 usage locations continue to work (reference VERIFICATION_REPORT.md)
  - CLASSIFY: Breaking or non-breaking with justification
  - DOCUMENT: Findings in audit report

Task 3: AUDIT P1.M2 - Major Fixes (3 fixes)
  - ANALYZE: Promise.allSettled for concurrent tasks (src/decorators/task.ts:112-142)
  - ASSESS: Behavior change impact on error handling expectations
  - VERIFY: Default behavior unchanged (throws first error)
  - CLASSIFY: Breaking or non-breaking with justification
  - DOCUMENT: Findings in audit report

  - ANALYZE: ErrorMergeStrategy implementation (src/types/decorators.ts:25-32)
  - ASSESS: Additive interface change (optional property)
  - VERIFY: Property is optional, default behavior unchanged
  - CLASSIFY: Non-breaking (additive)
  - DOCUMENT: Findings in audit report

  - ANALYZE: trackTiming default documentation (PRD.md, src/decorators/step.ts:94-101)
  - ASSESS: Documentation-only change, no behavior change
  - CLASSIFY: Non-breaking (documentation)
  - DOCUMENT: Findings in audit report

Task 4: AUDIT P1.M3 - Minor Fixes (4 fixes)
  - ANALYZE: Console.error to logger replacement (src/core/workflow.ts:426, 444)
  - ASSESS: Internal implementation detail only
  - CLASSIFY: Non-breaking (internal)
  - DOCUMENT: Findings in audit report

  - ANALYZE: Tree debugger optimization (src/debugger/tree-debugger.ts:65-84, 92-117)
  - ASSESS: Performance optimization without API changes
  - CLASSIFY: Non-breaking (performance)
  - DOCUMENT: Findings in audit report

  - ANALYZE: Workflow name validation (src/core/workflow.ts:98-107)
  - ASSESS: Constructor now rejects previously accepted invalid inputs
  - EVALUATE: Empty/whitespace names don't make sense (fixing undefined behavior)
  - CLASSIFY: Potentially breaking (low severity)
  - DOCUMENT: Findings in audit report with migration steps

  - ANALYZE: isDescendantOf public API (src/core/workflow.ts:201-219)
  - ASSESS: Private method made public (additive change)
  - CLASSIFY: Non-breaking (additive)
  - DOCUMENT: Findings in audit report

Task 5: ASSESS severity for all breaking changes
  - APPLY: Severity assessment framework
  - CRITICAL: Data loss, security issues, complete feature breakage
  - HIGH: Major feature disruption, complex migration required
  - MEDIUM: Moderate disruption, straightforward migration
  - LOW: Minor disruption, simple migration, fixes undefined behavior
  - DOCUMENT: Severity for each breaking change with justification

Task 6: DETERMINE semantic version recommendation
  - ANALYZE: Breaking changes inventory
  - APPLY: Semantic versioning rules (semver.org)
  - IF any breaking changes exist: MAJOR version bump (0.0.3 → 1.0.0 or 0.0.3 → 0.1.0)
  - IF no breaking changes: PATCH version bump (0.0.3 → 0.0.4)
  - DOCUMENT: Version recommendation with detailed reasoning

Task 7: CREATE migration guide for breaking changes
  - FOR each breaking change:
    - Write "What Changed" section explaining the change
    - Provide "Before" code example showing problematic pattern
    - Provide "After" code example showing correct pattern
    - List numbered migration steps
  - FOLLOW: CHANGELOG.md migration guide pattern
  - DOCUMENT: In report's Migration Guide section

Task 8: WRITE comprehensive audit report
  - CREATE: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T3S1/BREAKING_CHANGES_AUDIT.md
  - INCLUDE: Executive summary with overall findings
  - INCLUDE: Methodology section explaining audit process
  - INCLUDE: Detailed audit for each of 11 bug fixes
  - INCLUDE: Summary of findings table
  - INCLUDE: Version recommendation with semver analysis
  - INCLUDE: Migration guide (if breaking changes exist)
  - INCLUDE: References with file:line links
  - FORMAT: Using markdown template from Implementation Blueprint

Task 9: VERIFY report completeness
  - CHECK: All 11 bug fixes audited
  - CHECK: Each fix has breaking/non-breaking classification
  - CHECK: Breaking changes have severity and migration
  - CHECK: Non-breaking changes have justification
  - CHECK: Version recommendation is clear
  - CHECK: All file references use absolute paths with line numbers
```

### Implementation Patterns & Key Details

```markdown
# AUDIT METHODOLOGY

## Step 1: Identify Public API Surface
```bash
# Get complete public API from src/index.ts
grep -E '^export ' /home/dustin/projects/groundswell/src/index.ts
```

## Step 2: For Each Bug Fix, Answer These Questions:

### A. What changed?
- Read the implementation file at specified line numbers
- Identify the specific code change
- Determine if it affects public API (exports from src/index.ts)

### B. Is it public API?
- Check if the changed element is exported from src/index.ts
- If NO → NON-BREAKING (internal implementation)
- If YES → Proceed to C

### C. Did the signature/behavior change?
- Function/method: Was signature modified?
- Interface: Were properties removed/required?
- Behavior: Did observable behavior change?

### D. Is the change breaking?
- SIGNATURE CHANGE: Is backward compatibility maintained? (overloads, unions)
- ADDITIVE CHANGE: Adding optional properties/methods → NON-BREAKING
- BEHAVIOR CHANGE: Does it break existing expectations?
- BUG FIX: Does it fix PRD-violating behavior? → May be non-breaking

### E. Severity Assessment (for breaking changes only)
- CRITICAL: Data loss, security vulnerabilities, complete feature failure
- HIGH: Core feature disruption, complex migration, affects many users
- MEDIUM: Moderate disruption, straightforward migration, affects few users
- LOW: Minor impact, simple migration, fixes undefined/invalid behavior

# BREAKING CHANGE DECISION TREE

```
┌─────────────────────────────────────┐
│ Is this change to PUBLIC API?       │
│ (exported from src/index.ts)        │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │ NO         │ YES
        │            │
   NON-BREAKING  ┌───┴──────────────────┐
   (internal)   │ Type of change?      │
                └───┬──────────────────┘
                    │
     ┌──────────────┼──────────────┐
     │              │              │
  ADDITIVE      BEHAVIOR      SIGNATURE
  (new stuff)  (modified)    (modified)
     │              │              │
     │         ┌────┴────┐         │
     │         │         │         │
  NON-BREAKING  MAY BE   MAY BE
               BREAKING BREAKING
                    │         │
              ┌─────┴─────┐ │
              │           │ │
         PRD      BACKWARD  OVERLOADS/
         BUG      COMPAT    UNIONS
         FIX      BROKEN    MAINTAINED
              │           │ │
              │      BREAKING NON-BREAKING
              │
         NON-BREAKING
    (old behavior was wrong)
```

# NON-BREAKING JUSTIFICATION PATTERNS

## Pattern 1: Additive Change (New Optional Features)
"Justification: Adding optional `errorMergeStrategy` property to `TaskOptions` interface.
This is purely additive - existing code without this property continues to work unchanged.
The property has a default value that maintains previous behavior."

## Pattern 2: Backward Compatible Implementation
"Justification: `WorkflowLogger.child()` uses TypeScript function overloads to support
both the old string-based API and new Partial<LogEntry> API. All 20 existing usage
locations continue to work without modification (verified in VERIFICATION_REPORT.md)."

## Pattern 3: Internal Implementation Detail
"Justification: Replacing `console.error()` with `this.logger.error()` is an internal
implementation detail. The `Workflow` class's public API and behavior remain unchanged.
Observer errors are still handled, just logged differently."

## Pattern 4: Performance Optimization
"Justification: Tree debugger optimization changes internal node map update algorithm
from O(n) to O(k) for subtree operations. The public API of `WorkflowTreeDebugger`
is unchanged - same methods, same behavior, better performance."

## Pattern 5: Documentation Only
"Justification: The `trackTiming` default behavior is unchanged (still defaults to `true`).
This fix only clarifies the documentation in PRD.md. No code behavior was modified."

## Pattern 6: Bug Fix Aligning with PRD
"Justification: The old `child(parentLogId: string)` signature violated the PRD
specification which required `child(meta: Partial<LogEntry>)`. The new implementation
correctly follows the PRD while maintaining backward compatibility via overloads.
Since the old behavior was a PRD violation, this fix is non-breaking."

# MIGRATION GUIDE PATTERN

## For Workflow Name Validation Breaking Change

**What Changed**:
The `Workflow` constructor now validates the `name` parameter and throws a `TypeError`
for empty strings, whitespace-only names, or names exceeding 100 characters. Previously,
these invalid names were accepted.

**Before (Invalid Pattern)**:
```typescript
// This now throws TypeError
const workflow = new Workflow({ name: '' });
const workflow2 = new Workflow({ name: '   ' });
const workflow3 = new Workflow({ name: 'a'.repeat(101) });
```

**After (Correct Pattern)**:
```typescript
// Provide meaningful names
const workflow = new Workflow({ name: 'MyWorkflow' });
const workflow2 = new Workflow({ name: 'DataProcessor' });
const workflow3 = new Workflow({ name: 'Analysis' });
```

**Migration Steps**:
1. Search your codebase for `new Workflow({` patterns
2. Verify all workflow names are non-empty strings with meaningful content
3. Ensure no workflow names exceed 100 characters
4. Run your test suite to catch any validation failures
5. Update tests that use empty/invalid names to use valid names

**Impact Assessment**:
- **Severity**: LOW - Empty names don't represent valid usage
- **Likelihood**: RARE - Most users use meaningful names
- **Migration**: SIMPLE - Provide valid names

# VERSION RECOMMENDATION FORMAT

## Semantic Versioning Analysis

### Breaking Changes Found: [COUNT]
- [List breaking changes with severity]

### Version Bump Recommendation: [RECOMMENDED_VERSION]

**Reasoning**:
- According to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html):
  - MAJOR: [X.0.0] - Incompatible API changes
  - MINOR: [0.X.0] - Backward-compatible functionality
  - PATCH: [0.0.X] - Backward-compatible bug fixes

**Decision**:
- [IF breaking changes exist] → [MAJOR bump from 0.0.3]
- [IF no breaking changes] → [PATCH bump from 0.0.3]

**Additional Considerations**:
- Version 0.x.x: According to semver, anything < 1.0.0 may have breaking changes
- However, documenting breaking changes maintains user trust
- Consider communication strategy if breaking changes exist
```

### Integration Points

```yaml
FILES_TO_READ:
  - src/index.ts - Public API surface definition
  - src/core/logger.ts:98-111 - child() signature implementation
  - src/decorators/task.ts:112-142 - Promise.allSettled implementation
  - src/types/decorators.ts:25-32 - TaskOptions interface
  - src/utils/workflow-error-utils.ts:23-56 - mergeWorkflowErrors
  - src/decorators/step.ts:94-101 - trackTiming implementation
  - src/core/workflow.ts:98-107 - Name validation
  - src/core/workflow.ts:201-219 - isDescendantOf public API
  - src/core/workflow.ts:426, 444 - Console.error replacement
  - src/debugger/tree-debugger.ts:65-84, 92-117 - Tree debugger optimization

VERIFICATION_DOCUMENTS:
  - plan/.../P1M1T1S4/VERIFICATION_REPORT.md - child() backward compatibility proof
  - plan/.../P1M4T1S1/TEST_EXECUTION_REPORT.md - Full test suite validation

EXTERNAL_STANDARDS:
  - https://semver.org/spec/v2.0.0.html - Semantic versioning specification
  - https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes - TypeScript breaking changes

OUTPUT_FILE:
  - path: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T3S1/BREAKING_CHANGES_AUDIT.md
  - format: Markdown with sections defined in Implementation Blueprint
```

---

## Validation Loop

### Level 1: Report Structure Validation

```bash
# Verify report exists and has required sections
REPORT="plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T3S1/BREAKING_CHANGES_AUDIT.md"

# Check file exists
test -f "$REPORT" || echo "ERROR: Report not found"

# Verify required sections exist
grep -q "^# Breaking Changes Audit Report" "$REPORT" && echo "✓ Title found"
grep -q "^## Executive Summary" "$REPORT" && echo "✓ Executive Summary found"
grep -q "^## Methodology" "$REPORT" && echo "✓ Methodology found"
grep -q "^## P1.M1 - Critical Fixes Audit" "$REPORT" && echo "✓ Critical Fixes section found"
grep -q "^## P1.M2 - Major Fixes Audit" "$REPORT" && echo "✓ Major Fixes section found"
grep -q "^## P1.M3 - Minor Fixes Audit" "$REPORT" && echo "✓ Minor Fixes section found"
grep -q "^## Summary of Findings" "$REPORT" && echo "✓ Summary found"
grep -q "^## Version Recommendation" "$REPORT" && echo "✓ Version Recommendation found"

# Expected: All sections present
```

### Level 2: Content Completeness Validation

```bash
REPORT="plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T3S1/BREAKING_CHANGES_AUDIT.md"

# Verify all bug fixes are audited
grep -q "WorkflowLogger.child()" "$REPORT" && echo "✓ P1.M1 audit present"
grep -q "Promise.allSettled" "$REPORT" && echo "✓ P1.M2.T1 audit present"
grep -q "ErrorMergeStrategy" "$REPORT" && echo "✓ P1.M2.T2 audit present"
grep -q "trackTiming" "$REPORT" && echo "✓ P1.M2.T3 audit present"
grep -q "console.error" "$REPORT" && echo "✓ P1.M3.T1 audit present"
grep -q "Tree Debugger" "$REPORT" && echo "✓ P1.M3.T2 audit present"
grep -q "name validation" "$REPORT" && echo "✓ P1.M3.T3 audit present"
grep -q "isDescendantOf" "$REPORT" && echo "✓ P1.M3.T4 audit present"

# Verify classification for each fix
grep -c "Classification:" "$REPORT" | grep -qE "^[89]$" && echo "✓ All fixes have classification"

# Verify file references
grep -c 'src/[^)]*\.ts:[0-9]' "$REPORT" | grep -qE "^[0-9]+$" && echo "✓ File references present"

# Expected: All 11 fixes audited with classifications
```

### Level 3: Quality Assurance Validation

```bash
REPORT="plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T3S1/BREAKING_CHANGES_AUDIT.md"

# Verify breaking changes have severity
grep -A5 "Classification: BREAKING" "$REPORT" | grep -q "Severity:" && echo "✓ Breaking changes have severity"

# Verify non-breaking changes have justification
grep -A5 "Classification: NON-BREAKING" "$REPORT" | grep -q "Justification:" && echo "✓ Non-breaking changes have justification"

# Verify version recommendation is clear
grep -A10 "^## Version Recommendation" "$REPORT" | grep -qE "(MAJOR|MINOR|PATCH)" && echo "✓ Version recommendation clear"

# Manual content verification
cat << 'EOF'
# Manual Quality Checklist

## Completeness
- [ ] Executive summary provides overall assessment
- [ ] Methodology section explains audit process
- [ ] All 11 bug fixes have dedicated audit entries
- [ ] Each entry has classification (BREAKING/NON-BREAKING)
- [ ] Breaking changes include severity assessment
- [ ] Breaking changes include migration strategy
- [ ] Non-breaking changes include justification

## Accuracy
- [ ] Public API surface correctly identified from src/index.ts
- [ ] All file references use absolute paths
- [ ] All line numbers are accurate
- [ ] Severity assessments follow the framework
- [ ] Version recommendation follows semver rules

## Usability
- [ ] Report is readable with clear structure
- [ ] Migration guide is actionable (if applicable)
- [ ] Version recommendation is definitive
- [ ] References section has all links

## Consistency
- [ ] All audit entries follow same template
- [ ] Terminology is consistent throughout
- [ ] Formatting follows markdown best practices
EOF

# Expected: All quality checks pass
```

### Level 4: Cross-Reference Validation

```bash
# Verify findings align with existing documentation
REPORT="plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M4T3S1/BREAKING_CHANGES_AUDIT.md"

# Check that child() backward compatibility is acknowledged
grep -A10 "WorkflowLogger.child()" "$REPORT" | grep -qE "(backward compatible|overloads|VERIFICATION_REPORT)" && echo "✓ child() backward compatibility acknowledged"

# Check that test suite validation is referenced
grep -q "100% test pass rate\|361 tests pass" "$REPORT" && echo "✓ Test validation referenced"

# Check that semver is referenced
grep -q "semver.org\|Semantic Versioning" "$REPORT" && echo "✓ Semver standard referenced"

# Manual verification: Compare with CHANGELOG.md
echo "Manual check: Do breaking changes in audit match CHANGELOG.md?"
echo "Review CHANGELOG.md at /home/dustin/projects/groundswell/CHANGELOG.md"

# Expected: Audit findings align with existing documentation
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Report created at specified path
- [ ] Markdown is well-formed (all headers, lists, code blocks formatted correctly)
- [ ] All file references point to existing files
- [ ] All line numbers are accurate
- [ ] No broken internal links

### Content Validation

- [ ] Public API surface identified from src/index.ts
- [ ] All 11 bug fixes audited
- [ ] Each fix has BREAKING/NON-BREAKING classification
- [ ] Breaking changes include severity (Critical/High/Medium/Low)
- [ ] Breaking changes include mitigation strategy
- [ ] Non-breaking changes include justification
- [ ] Version recommendation provided with semver reasoning

### Quality Validation

- [ ] Executive summary provides clear overview
- [ ] Methodology section explains audit process
- [ ] Migration guide is actionable (if breaking changes exist)
- [ ] All audit entries follow consistent template
- [ ] References section includes all links
- [ ] Report passes "No Prior Knowledge" test

### Feature Validation

- [ ] Maintainer can understand what changed
- [ ] Maintainer can assess breaking change impact
- [ ] Maintainer has clear version recommendation
- [ ] Maintainer has migration guidance (if needed)
- [ ] Findings align with test suite validation results

---

## Anti-Patterns to Avoid

- **Don't** skip auditing internal changes - document why they're non-breaking
- **Don't** assume backward compatibility - verify with evidence (test results, code analysis)
- **Don't** forget severity assessment - breaking changes need severity classification
- **Don't** omit migration guidance - even simple migrations need documentation
- **Don't** be ambiguous about version recommendation - state clearly (MAJOR/MINOR/PATCH)
- **Don't** ignore edge cases - consider real-world usage beyond test coverage
- **Don't** forget to justify non-breaking classifications - explain why existing code works
- **Don't** mix severity levels - use the provided framework consistently
- **Don't** overlook additive changes - new public APIs are still non-breaking
- **Don't** skip cross-referencing - validate against existing documentation and tests

---

## Appendix: Quick Reference for Audit Decisions

### Breaking Change Quick Reference

| Change Type | Public API? | Breaking? | Severity | Notes |
|-------------|-------------|-----------|----------|-------|
| Function signature modified | Yes | Maybe | varies | Check if backward compatible |
| Optional property added | Yes | No | N/A | Additive change |
| Required property added | Yes | Yes | High | Breaking - existing code missing prop |
| Property removed | Yes | Yes | High/Med | Breaking - existing code uses it |
| Property type narrowed | Yes | Maybe | varies | May break if code used wider type |
| New public function | Yes | No | N/A | Additive change |
| Function removed | Yes | Yes | High/Crit | Breaking - existing calls fail |
| Behavior changed | Yes | Maybe | varies | Check if existing code relies on old behavior |
| Internal refactor | No | No | N/A | Not public API |
| Performance optimization | No/Yes | No | N/A | If API unchanged, not breaking |
| Bug fix (PRD violation) | Yes | Maybe | varies | Old behavior was wrong, may be non-breaking |
| Constructor validation added | Yes | Maybe | Low | If invalid inputs rejected, low severity |
| Private → Public | Yes | No | N/A | Additive - already existed |

### Severity Quick Reference

| Severity | Definition | Example |
|----------|-----------|---------|
| **Critical** | Data loss, security issue, complete feature failure | Removing required API, changing return type to incompatible |
| **High** | Major disruption, complex migration | Removing commonly used method, tightening validation significantly |
| **Medium** | Moderate disruption, straightforward migration | Changing optional to required, minor behavior change |
| **Low** | Minor disruption, simple migration | Rejecting previously accepted invalid inputs |

---

**End of PRP**
