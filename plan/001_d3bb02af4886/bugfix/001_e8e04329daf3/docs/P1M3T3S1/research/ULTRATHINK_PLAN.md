# ULTRATHINK PRP Writing Plan

## Research Summary Complete ✓

### Research Files Created:
1. `research/codebase_workflow_name_analysis.md` - Current implementation state, test evidence, patterns
2. `research/external_best_practices.md` - Industry standards (Kubernetes, Airflow, AWS, etc.)
3. `research/validation_patterns.md` - Codebase validation patterns and test patterns

### Key Findings:

**Current State:**
- Empty strings accepted (test in edge-case.test.ts:107-117 proves this)
- No validation exists in Workflow constructor (src/core/workflow.ts:83-108)
- Whitespace-only strings accepted
- Default falls back to class name when undefined

**Issue 8 Context:**
- Minor severity
- "Should probably be non-empty string"
- Two options: validate OR document that empty names are valid
- This is a DECISION task - the output is documentation of requirements

**Codebase Patterns:**
- Validation uses `throw new Error()` with descriptive messages
- Tests use regex matching: `expect(() => ...).toThrow(/pattern/i)`
- No custom error classes - standard `Error`
- Error messages include values in quotes

**External Best Practices:**
- All workflow engines validate names
- Common rules: non-empty, no spaces, length limits
- AWS/Airflow pattern: alphanumeric + hyphens/underscores
- Recommended for Groundswell: minimal validation (non-empty after trim)

---

## PRP Section-by-Section Structure Plan

### Section 1: Goal
**Content to Fill:**
- **Feature Goal:** Determine and document workflow name validation requirements
- **Deliverable:** Decision document with validation rules (if chosen) OR documentation that empty names are valid
- **Success Definition:** Clear decision documented with rationale, ready for P1.M3.T3.S2 implementation

**Information Sources:**
- Issue 8 description from TEST_RESULTS.md
- P1.M3.T3 task description from bug_fix_tasks.json

### Section 2: User Persona (if applicable)
**Content to Fill:**
- This is an internal bug fix task - no end user persona
- Target: Development team implementing validation
- Consider whether to skip or adapt this section

### Section 3: Why
**Content to Fill:**
- Business value: Prevent confusing workflow names in tree debugger
- User impact: Empty names provide no useful information in UI
- Integration with Issue 8 bug fix
- Problems solved: Confusion from empty/whitespace names

### Section 4: What
**Content to Fill:**
- Research task: analyze PRD, review examples, consult with team
- Decision on: validation OR document empty names as valid
- If validation: specify exact rules (non-empty? whitespace? length?)
- Output: decision document with rationale

**Success Criteria:**
- [ ] Decision documented with clear rationale
- [ ] If validation chosen: exact rules specified
- [ ] If no validation: documentation explaining why
- [ ] Ready for implementation in P1.M3.T3.S2

### Section 5: All Needed Context (CRITICAL - Context Completeness)

#### 5.1 Documentation & References (YAML)
**Files to Include:**
```yaml
- file: plan/001_d3bb02af4886/TEST_RESULTS.md
  why: Contains Issue 8 bug report with expected vs actual behavior
  section: Lines 196-217 (Issue 8 section)
  critical: Shows empty string is currently accepted but "should probably be non-empty"

- file: plan/001_d3bb02af4886/bug_fix_tasks.json
  why: Contains P1.M3.T3 task description and subtasks
  section: Lines 301-338
  critical: Shows this is S1 (research) before S2 (implementation)

- file: PRD.md
  why: Check if PRD specifies workflow name requirements
  section: Section 3.1 - WorkflowNode Interface (lines 56-72)
  critical: PRD only specifies `name: string` with no validation requirements

- file: src/core/workflow.ts
  why: Current implementation with no validation
  section: Lines 83-108 (constructor)
  pattern: Note how name is set without validation
  gotcha: Both class-based and functional constructor patterns

- file: src/__tests__/adversarial/edge-case.test.ts
  why: Current test explicitly verifies empty names work
  section: Lines 107-117
  critical: Will need modification if validation is added

- file: src/__tests__/unit/workflow.test.ts
  why: Examples of name testing patterns
  section: Lines 20-28
  pattern: Tests for default class name and custom name

- docfile: research/external_best_practices.md
  why: Industry standards for workflow name validation
  section: Recommendation for Groundswell section

- docfile: research/validation_patterns.md
  why: Codebase validation patterns to follow
  section: Implementation Recommendations section

- docfile: research/codebase_workflow_name_analysis.md
  why: Complete analysis of current state
  section: Validation Decision Point section
```

#### 5.2 Current Codebase Tree
**Need to run:**
```bash
tree -L 3 -I 'node_modules|dist|build' /home/dustin/projects/groundswell
```

#### 5.3 Desired Codebase Tree (for this task)
Since this is a research task, the only output is the decision document:
```bash
plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T3S1/
├── PRP.md                          # This PRP
├── research/                       # Created during research phase
│   ├── codebase_workflow_name_analysis.md
│   ├── external_best_practices.md
│   └── validation_patterns.md
└── DECISION.md                     # OUTPUT: Decision document with rationale
```

#### 5.4 Known Gotchas
```typescript
// CRITICAL: Two constructor patterns exist
// 1. Class-based: new Workflow('name')
// 2. Functional: new Workflow({ name: 'name' }, executor)
// Validation must handle both

// CRITICAL: Current test expects empty names to work
// File: src/__tests__/adversarial/edge-case.test.ts:107-117
// If validation added, this test must be updated

// CRITICAL: Undefined names fall back to class name
// This is desired behavior - only validate non-undefined strings

// CRITICAL: No validation patterns exist for strings in codebase
// Must establish first pattern for string validation
```

### Section 6: Implementation Blueprint

#### 6.1 Data Models and Structure
**For this research task:** No data models - output is documentation

#### 6.2 Implementation Tasks (ordered by dependencies)
```yaml
Task 1: REVIEW PRD.md for workflow name requirements
  - READ: Section 3.1 - WorkflowNode Interface
  - CHECK: Any validation rules specified
  - DOCUMENT: Findings (none currently specified)

Task 2: ANALYZE existing workflow name examples
  - SEARCH: Codebase for workflow instantiations
  - CATALOG: Common naming patterns (PascalCase, descriptive, etc.)
  - CHECK: Any empty name examples beyond test
  - DOCUMENT: Pattern analysis

Task 3: RESEARCH external best practices (COMPLETED)
  - REVIEW: Industry standards (Kubernetes, Airflow, AWS)
  - IDENTIFY: Common validation rules
  - STORE: In research/external_best_practices.md

Task 4: MAKE DECISION on validation approach
  - EVALUATE: Arguments for validation (confusion, industry standard)
  - EVALUATE: Arguments against (backward compatibility, permissiveness)
  - DECIDE: Add validation OR document empty names as valid
  - IF VALIDATION: Specify exact rules (non-empty? trim? length?)
  - DOCUMENT: Decision with rationale

Task 5: CREATE DECISION.md document
  - INCLUDE: Decision (validate or not)
  - INCLUDE: Rationale (why this decision)
  - IF VALIDATION: Include exact rules to implement
  - IF NO VALIDATION: Include why empty names are acceptable
  - REFERENCE: Issue 8, PRD sections, external research
```

#### 6.3 Implementation Patterns & Key Details
**For research task:**
```typescript
// Decision document structure
## Decision
[CHOSEN APPROACH]

## Rationale
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

## Validation Rules (if applicable)
- Rule 1: [specific rule]
- Rule 2: [specific rule]
- Rule 3: [specific rule]

## References
- Issue 8: [findings]
- PRD Section 3.1: [findings]
- External research: [summary]
- Codebase patterns: [summary]

## Next Steps
- P1.M3.T3.S2: Implement validation in constructor
- P1.M3.T3.S3: Add/update tests
```

#### 6.4 Integration Points
```yaml
NO INTEGRATION:
  - This is pure research/documentation task
  - No code changes in this subtask
  - Output feeds into P1.M3.T3.S2 implementation

RELATED TASKS:
  - P1.M3.T3.S2: Will use decision to implement validation
  - P1.M3.T3.S3: Will create tests based on validation rules
```

### Section 7: Validation Loop

#### 7.1 Level 1: Syntax & Style
**For research task:**
```bash
# Not applicable - no code generated
# DECISION.md should be well-formatted markdown
```

#### 7.2 Level 2: Unit Tests
**For research task:**
```bash
# Not applicable - no code to test
# Decision should be reviewed by team
```

#### 7.3 Level 3: Integration Testing
**For research task:**
```bash
# Verify decision is documented
cat plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T3S1/DECISION.md

# Should contain clear decision and rationale
# If validation: should contain exact rules
```

#### 7.4 Level 4: Creative & Domain-Specific Validation
**For research task:**
```bash
# Review by project lead or team
# Verify decision aligns with project goals
# Check if implementation requirements are clear
```

### Section 8: Final Validation Checklist

#### Technical Validation
- [ ] Decision document created at specified path
- [ ] All research files present in research/ subdirectory
- [ ] Decision includes clear rationale
- [ ] References to Issue 8, PRD, and external research included

#### Feature Validation
- [ ] Decision addresses Issue 8 concern
- [ ] Rationale is well-reasoned and complete
- [ ] If validation: rules are specific and implementable
- [ ] If no validation: justification is clear

#### Code Quality Validation
- [ ] Decision document is well-structured markdown
- [ ] Research documents follow clear organization
- [ ] All references include specific line numbers/sections

#### Documentation & Deployment
- [ ] Decision ready for P1.M3.T3.S2 implementation
- [ ] Research findings documented for future reference
- [ ] External best practices catalogued

### Section 9: Anti-Patterns to Avoid
- ❌ Don't make implementation changes in this subtask (that's P1.M3.T3.S2)
- ❌ Don't skip documenting rationale - team needs to understand why
- ❌ Don't ignore external research - industry standards matter
- ❌ Don't forget backward compatibility implications
- ❌ Don't leave decision ambiguous - must be clear yes/no on validation

---

## Pre-Writing Validation

### Context Completeness Check ✅

**"No Prior Knowledge" Test:**
If someone knew nothing about this codebase, would they have everything needed?

- [x] Issue 8 context - YES (TEST_RESULTS.md reference)
- [x] Current implementation - YES (src/core/workflow.ts lines)
- [x] Existing test behavior - YES (edge-case.test.ts reference)
- [x] Codebase validation patterns - YES (validation_patterns.md)
- [x] External best practices - YES (external_best_practices.md)
- [x] PRD requirements - YES (PRD.md reference)

### Information Density Standards
- [x] All YAML references include specific file paths and line numbers
- [x] Research files include specific code snippets
- [x] External research includes URLs and specific patterns
- [x] Implementation tasks reference exact locations

---

## Ready to Write PRP ✅

All research complete. All findings documented. Structure planned.

Next: Write the PRP.md file following this plan.
