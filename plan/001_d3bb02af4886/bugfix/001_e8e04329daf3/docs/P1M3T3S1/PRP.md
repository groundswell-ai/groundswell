# Product Requirement Prompt (PRP): Determine Workflow Name Validation Requirements

## Goal

**Feature Goal**: Research and document a decision on whether workflow names should be validated, and if so, specify exact validation rules.

**Deliverable**: A `DECISION.md` document containing:
1. Clear decision (validate vs. document empty names as valid)
2. Rationale supporting the decision
3. If validation is chosen: exact validation rules to implement
4. References to Issue 8, PRD requirements, and external research

**Success Definition**:
- Decision document exists at `plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T3S1/DECISION.md`
- Decision is unambiguous (either "add validation with these rules" or "empty names are valid because...")
- Rationale is well-reasoned and references research findings
- P1.M3.T3.S2 implementation team can proceed without additional clarification

## Why

**Business Value and User Impact**:
- Issue 8 identified that empty workflow names (`''`) are currently accepted but provide no useful information
- Empty names appear as blank entries in the tree debugger, creating confusion
- Workflow names are the primary identifier for users viewing workflow structures

**Integration with Existing Features**:
- Part of P1.M3 bug fix task: "Add Workflow Name Validation"
- Precedes P1.M3.T3.S2 (implementation) and P1.M3.T3.S3 (testing)
- Affects `src/core/workflow.ts` constructor where names are set

**Problems This Solves**:
- Resolves Issue 8 ambiguity: are empty names a bug or a feature?
- Establishes clear standards for workflow naming
- Provides implementation guidance for validation rules (if chosen)

## What

This is a **research and decision-making task**. No code changes are made in this subtask.

### Research Activities

1. **Review PRD Documentation**: Check if workflow name requirements are specified
2. **Analyze Codebase Patterns**: Catalog existing workflow name usage patterns
3. **Research External Standards**: Review industry best practices for workflow name validation
4. **Evaluate Trade-offs**: Consider arguments for and against validation

### Decision Required

Choose between:

**Option A: Add Validation**
- Reject empty string names (`''`)
- Reject whitespace-only names (`'   '`)
- Optionally: Add length limits, character restrictions

**Option B: Document Empty Names as Valid**
- Explicitly document that empty names are acceptable
- Explain use cases for empty names
- Update Issue 8 as "won't fix - working as intended"

### Success Criteria

- [ ] Decision documented in `DECISION.md`
- [ ] Rationale includes consideration of Issue 8, PRD requirements, and external research
- [ ] If Option A: Exact validation rules specified (non-empty? trim? length? characters?)
- [ ] If Option B: Clear justification for why empty names are valid
- [ ] References to all research sources included

## All Needed Context

### Context Completeness Check

_Before proceeding, validate: "If someone knew nothing about this codebase, would they have everything needed to make this decision?"_

**Answer**: Yes - this PRP includes Issue 8 context, current implementation state, test evidence, external best practices, and codebase validation patterns.

### Documentation & References

```yaml
# MUST READ - Issue 8 Bug Report
- file: plan/001_d3bb02af4886/TEST_RESULTS.md
  why: Contains Issue 8 bug report with expected vs actual behavior
  section: Lines 196-217 (Issue 8: No Validation of Workflow Name)
  critical: Shows empty strings are accepted but "should probably be non-empty"
  content: |
    Issue 8 states: "Empty string workflow names are accepted: const wf = new Workflow('');"
    Suggested fix: "Add validation to reject empty or whitespace-only names, OR document that empty names are valid."

# MUST READ - Task Description
- file: plan/001_d3bb02af4886/bug_fix_tasks.json
  why: Contains P1.M3.T3 task description and subtask breakdown
  section: Lines 301-338 (P1.M3.T3: Add Workflow Name Validation)
  critical: Shows S1 is research, S2 is implementation, S3 is testing

# MUST READ - PRD WorkflowNode Definition
- file: PRD.md
  why: Check if PRD specifies workflow name validation requirements
  section: Section 3.1 - WorkflowNode Interface (lines 56-72)
  gotcha: PRD only specifies `name: string` with NO validation requirements

# MUST READ - Current Implementation (No Validation)
- file: src/core/workflow.ts
  why: See how workflow names are currently set without validation
  section: Lines 83-108 (Workflow constructor)
  pattern: Note two constructor patterns (class-based and functional)
  gotcha: Empty strings are accepted, undefined falls back to class name
  code_snippet: |
    // Line 94-96: Class-based pattern
    this.config = { name: name ?? this.constructor.name };

    // Line 101: Node name fallback
    name: this.config.name ?? this.constructor.name,
    // NO VALIDATION HERE - empty strings pass through

# MUST READ - Current Test Expects Empty Names
- file: src/__tests__/adversarial/edge-case.test.ts
  why: Current test explicitly verifies empty names work
  section: Lines 107-117 (empty string name test)
  critical: If validation is added, this test MUST be updated to expect error
  code_snippet: |
    it('should handle empty string workflow name', async () => {
      const workflow = new TestWorkflow('');
      expect(workflow.node.name).toBe('');  // Currently passes
      await workflow.run();
    });

# REFERENCE - Existing Name Test Patterns
- file: src/__tests__/unit/workflow.test.ts
  why: Examples of how workflow name tests are structured
  section: Lines 20-28 (default and custom name tests)
  pattern: Tests for default class name and custom name assignment

# RESEARCH - External Best Practices
- docfile: research/external_best_practices.md
  why: Industry standards for workflow name validation (Kubernetes, Airflow, AWS, etc.)
  section: Recommendation for Groundswell (bottom of document)
  summary: |
    All major workflow engines validate names:
    - Kubernetes: 1-253 chars, lowercase alphanumeric + hyphens/dots
    - Airflow: alphanumeric + underscores, no spaces
    - AWS Step Functions: 1-80 chars, alphanumeric + hyphens/underscores
    Recommended: Minimal validation (non-empty after trim, max 100 chars)

# RESEARCH - Codebase Validation Patterns
- docfile: research/validation_patterns.md
  why: Existing validation patterns in the codebase to follow
  section: Implementation Recommendations
  summary: |
    - Use throw new Error() with descriptive messages
    - Include invalid value in quotes in error message
    - Tests use regex: expect(() => ...).toThrow(/pattern/i)
    - No custom error classes - standard Error

# RESEARCH - Current Implementation Analysis
- docfile: research/codebase_workflow_name_analysis.md
  why: Complete analysis of current state and common naming patterns
  section: Validation Decision Point
  summary: |
    Common patterns found:
    - PascalCase class names: DataProcessingWorkflow
    - PascalCase string names: 'DataProcessor'
    - Descriptive names: 'Parent', 'Child', 'Worker'
    - Sequential names: 'Workflow-1', 'child-1-0'
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── plan/
│   └── 001_d3bb02af4886/
│       ├── bug_fix_tasks.json          # Task P1.M3.T3 description
│       └── TEST_RESULTS.md             # Issue 8 bug report
├── PRD.md                              # WorkflowNode interface definition
├── src/
│   ├── core/
│   │   └── workflow.ts                 # Workflow constructor (lines 83-108)
│   ├── types/
│   │   └── workflow.ts                 # WorkflowNode interface (line 24)
│   └── __tests__/
│       ├── unit/
│       │   └── workflow.test.ts        # Name test patterns (lines 20-28)
│       └── adversarial/
│           └── edge-case.test.ts       # Empty name test (lines 107-117)
```

### Desired Codebase Tree (This Task Output)

```bash
plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T3S1/
├── PRP.md                              # This PRP document
├── research/                           # Research findings (created)
│   ├── codebase_workflow_name_analysis.md
│   ├── external_best_practices.md
│   ├── validation_patterns.md
│   └── ULTRATHINK_PLAN.md
└── DECISION.md                         # OUTPUT: Decision document with rationale
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Two constructor patterns exist in Workflow class
// Pattern 1: Class-based
new Workflow('CustomName')           // name is string
new Workflow()                        // name is undefined, falls back to class name

// Pattern 2: Functional
new Workflow({ name: 'Workflow' }, executor)  // config object with name
new Workflow({ }, executor)                    // name undefined, falls back to class name

// IMPLICATION: Validation must handle both patterns, AFTER config is normalized

// CRITICAL: Current test expects empty names to work
// File: src/__tests__/adversarial/edge-case.test.ts:107-117
// If validation is chosen, this test MUST be updated to expect error instead of success

// CRITICAL: Undefined vs Empty String
// Undefined names → fall back to class name (DESIRED BEHAVIOR - preserve)
// Empty string names → currently accepted, but provides no useful information
// Validation should ONLY apply when name is explicitly provided as non-empty string

// CRITICAL: Trim behavior decision needed
// If validation chosen: should names be trimmed?
// Options:
//   1. Reject whitespace-only: '   ' → error
//   2. Auto-trim: '   Name   ' → 'Name'
//   3. Preserve whitespace: accept as-is

// GOTCHA: No existing string validation patterns in codebase
// This would be the FIRST string validation in the project
// Must establish consistent pattern for future string validations
```

## Implementation Blueprint

### Data Models and Structure

**N/A** - This is a research task. Output is markdown documentation, not code.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: REVIEW PRD.md Section 3.1 - WorkflowNode Interface
  - READ: PRD.md lines 56-72
  - CHECK: Any validation rules specified for workflow names
  - FINDING: PRD specifies `name: string` with NO validation requirements
  - OUTPUT: Document PRD findings

Task 2: ANALYZE existing workflow name examples in codebase
  - SEARCH: src/ directory for workflow instantiations
  - CATALOG: Common naming patterns (PascalCase, descriptive, sequential)
  - CHECK: Any production code using empty names (beyond test)
  - OUTPUT: Pattern analysis summary

Task 3: REVIEW Issue 8 bug report context
  - READ: plan/001_d3bb02af4886/TEST_RESULTS.md lines 196-217
  - UNDERSTAND: Current behavior (empty names accepted)
  - NOTE: Suggested fix (validate OR document as valid)
  - OUTPUT: Issue 8 summary

Task 4: CONSIDER external best practices (ALREADY RESEARCHED)
  - REVIEW: research/external_best_practices.md
  - FINDING: All major workflow engines validate names (Kubernetes, Airflow, AWS)
  - COMMON RULES: Non-empty, no spaces, length limits
  - OUTPUT: External research summary

Task 5: EVALUATE trade-offs and make decision
  - ARGUMENTS FOR VALIDATION:
    - Empty names provide no useful information
    - Confusing in tree debugger (shows blank entries)
    - Industry standard (all major engines validate)
    - Issue 8 suggests this is a bug, not feature
  - ARGUMENTS AGAINST VALIDATION:
    - Current test explicitly verifies empty names work
    - May be intentionally permissive for flexibility
    - Backward compatibility concern
  - DECISION: Choose Option A (validate) or Option B (document as valid)
  - OUTPUT: Clear decision statement

Task 6: SPECIFY validation rules (if Option A chosen)
  - RULE 1: Non-empty after trim? (recommended: YES)
  - RULE 2: Maximum length? (recommended: 100 chars for reasonable limit)
  - RULE 3: Character restrictions? (recommended: NO - allow any printable chars)
  - RULE 4: Trim behavior? (recommended: NO - reject whitespace-only, don't auto-trim)
  - OUTPUT: Exact validation rules for P1.M3.T3.S2 implementation

Task 7: CREATE DECISION.md document
  - INCLUDE: Decision (Option A or B)
  - INCLUDE: Rationale (3-5 bullet points explaining reasoning)
  - INCLUDE: Validation rules (if Option A)
  - INCLUDE: References to Issue 8, PRD, external research
  - INCLUDE: Next steps for P1.M3.T3.S2 and P1.M3.T3.S3
  - OUTPUT: DECISION.md at specified path
```

### Implementation Patterns & Key Details

```markdown
# Decision Document Structure (for DECISION.md)

## Decision
[CHOSEN OPTION: Add Validation / Document Empty Names as Valid]

## Rationale
1. [Reason 1 - reference Issue 8, PRD, or external research]
2. [Reason 2 - reference codebase patterns or user impact]
3. [Reason 3 - reference external best practices or project goals]
4. [Reason 4 - reference backward compatibility or future considerations]
5. [Reason 5 - reference specific evidence from research]

## Validation Rules (if applicable)
- Non-empty: Workflow names must contain at least one non-whitespace character
- Maximum length: 100 characters
- Character set: Any printable ASCII characters (no restriction)
- Trim behavior: Whitespace-only names rejected, no auto-trim
- Error message: "Workflow name cannot be empty or whitespace only"

## Examples of Valid/Invalid Names
Valid:
- 'MyWorkflow'
- 'Data Processing Workflow'
- 'Workflow-123'
- 'test_workflow'

Invalid:
- '' (empty string)
- '   ' (whitespace only)
- Names exceeding 100 characters

## References
- Issue 8: plan/001_d3bb02af4886/TEST_RESULTS.md lines 196-217
- PRD Section 3.1: PRD.md lines 56-72
- External research: research/external_best_practices.md
- Codebase patterns: research/validation_patterns.md

## Next Steps
- P1.M3.T3.S2: Implement validation in src/core/workflow.ts constructor
- P1.M3.T3.S3: Add tests for validation, update edge-case.test.ts:107-117
```

### Integration Points

```yaml
NO CODE CHANGES:
  - This is pure research/documentation task
  - No integration with codebase in this subtask

OUTPUT CONSUMERS:
  - P1.M3.T3.S2: Will use decision to implement validation
  - P1.M3.T3.S3: Will create tests based on validation rules

RELATED FILES (if validation chosen):
  - MODIFY: src/core/workflow.ts (add validation in constructor)
  - MODIFY: src/__tests__/adversarial/edge-case.test.ts (update empty name test)
  - ADD: src/__tests__/unit/workflow-name-validation.test.ts (new validation tests)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Not applicable - no code generated in this subtask
# DECISION.md should be well-formatted markdown
cat plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T3S1/DECISION.md
# Should contain: Decision, Rationale, Rules (if applicable), References
```

### Level 2: Unit Tests (Component Validation)

```bash
# Not applicable - no code to test in this subtask
# Decision should be reviewed by team or project lead

# Manual review checklist:
- [ ] Decision is unambiguous (clear yes/no on validation)
- [ ] Rationale is complete and well-reasoned
- [ ] If validation: rules are specific and implementable
- [ ] If no validation: justification is clear and convincing
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify decision document exists and is complete
ls -la plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T3S1/DECISION.md

# Check document contains required sections
grep -q "## Decision" DECISION.md
grep -q "## Rationale" DECISION.md
grep -q "## References" DECISION.md

# Expected: All sections present, document is well-structured
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Review by project stakeholders

# Questions to validate:
1. Does this decision align with project goals?
2. Is the rationale convincing to the implementation team?
3. Are the validation rules (if any) clear enough to implement?
4. Does this decision properly address Issue 8?
5. Are backward compatibility implications considered?

# Validation command:
cat plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T3S1/DECISION.md
# Review content with above questions in mind
```

## Final Validation Checklist

### Technical Validation

- [ ] Decision document created at correct path
- [ ] All research files present in research/ subdirectory
- [ ] Decision includes clear rationale with references
- [ ] References include specific line numbers/sections

### Feature Validation

- [ ] Decision addresses Issue 8 concern explicitly
- [ ] Rationale considers PRD requirements (or lack thereof)
- [ ] Rationale references external best practices
- [ ] If validation chosen: rules are specific and implementable
- [ ] If no validation chosen: justification is clear

### Code Quality Validation

- [ ] Decision document follows clear structure
- [ ] Research documents are well-organized
- [ ] All file references include specific paths
- [ ] All code snippets include line numbers

### Documentation & Deployment

- [ ] Decision ready for P1.M3.T3.S2 implementation team
- [ ] Research findings documented for future reference
- [ ] External best practices catalogued in research/
- [ ] Next steps clearly specified

## Anti-Patterns to Avoid

- ❌ **Don't make implementation changes in this subtask** - that's P1.M3.T3.S2
- ❌ **Don't skip documenting rationale** - team needs to understand the decision
- ❌ **Don't ignore external research** - industry standards provide valuable context
- ❌ **Don't forget backward compatibility** - consider impact on existing code
- ❌ **Don't leave decision ambiguous** - must be clear yes/no on validation with specific rules
- ❌ **Don't skip referencing Issue 8** - this is the origin of the task
- ❌ **Don't forget about the existing test** - edge-case.test.ts:107-117 will need updating if validation is added
- ❌ **Don't overlook the two constructor patterns** - class-based and functional must both be handled

---

## Confidence Score

**One-Pass Implementation Success Likelihood: 9/10**

**Rationale**:
- All context gathered and documented (Issue 8, PRD, codebase patterns, external research)
- Research files provide comprehensive reference material
- Decision framework is clear (Option A vs Option B)
- Implementation tasks are well-defined and ordered
- Validation checklist covers all aspects
- Only uncertainty: team preference on validation strictness (may require consultation)

**To achieve 10/10**: Consult with team/project lead on validation approach before finalizing decision.
