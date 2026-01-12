# ULTRATHINK Plan: P1.M2.T3.S1 PRP Structure

## PRP Purpose
Create a Product Requirement Prompt for the research task: "Locate PRD section for @Step decorator options"

## Key Insight
This is a **PURE RESEARCH task** - no code changes, only documentation location and analysis.

## Template Section Planning

### Goal Section
- **Feature Goal**: Locate and document the exact location of PRD Section 8.1 (@Step Decorator Options) and the trackTiming option
- **Deliverable**: Research report with exact file path, line numbers, and documentation gap analysis
- **Success Definition**: Exact location identified, trackTiming default value status confirmed, documentation gap documented

### User Persona
- **Target User**: Documentation maintainer / Developer needing to update PRD
- **Use Case**: Need to find where in the PRD to add the trackTiming default value documentation
- **Pain Points**: PRD is large, default value is not explicitly documented, implementation shows default=true but PRD doesn't state it

### Why Section
- Documentation gap causes confusion about default behavior
- Implementation uses `!== false` pattern (defaults to true) but PRD doesn't specify
- Next subtask (P1.M2.T3.S2) needs this location to update the PRD

### What Section
- User-visible: Research findings with file paths and line numbers
- Success Criteria:
  - [ ] Exact file path for PRD Section 8.1 identified
  - [ ] Line number for trackTiming documented
  - [ ] Documentation gap confirmed
  - [ ] Research files stored

### All Needed Context
#### Documentation & References
```yaml
# MUST READ - Key files for PRD location
- file: PRD.md
  lines: 177-189
  why: Contains Section 8.1 @Step Decorator Options definition
  pattern: TypeScript interface StepOptions with trackTiming?: boolean
  gotcha: Default value NOT documented in PRD, only in type definitions

- file: src/types/decorators.ts
  lines: 6-17
  why: Contains JSDoc comment showing "Track and emit step duration (default: true)"
  pattern: JSDoc comments above interface properties
  gotcha: PRD doesn't match this JSDoc documentation

- file: src/decorators/step.ts
  lines: 94-101
  why: Contains implementation showing default behavior: if (opts.trackTiming !== false)
  pattern: Negation pattern means default is true
  gotcha: Default behavior is opt-out, not opt-in

- file: README.md
  lines: 129-136
  why: User-facing table correctly shows trackTiming default: true
  pattern: Markdown table with Default column
  gotcha: User docs are correct, PRD is incomplete

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T3S1/research/PRD_LOCATION_ANALYSIS.md
  why: Detailed analysis of PRD location and documentation gap
  section: Conclusion

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T3S1/research/DECORATOR_DOCUMENTATION_PATTERNS.md
  why: External research on documentation best practices
  section: Recommended Patterns for Groundswell PRD

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T3S1/research/CODEBASE_INVENTORY.md
  why: Complete inventory of all trackTiming references
  section: Summary Table
```

### Implementation Blueprint
Since this is a research task:
- No data models needed
- No implementation tasks needed
- Only research and documentation activities

### Implementation Tasks (Research-Focused)
```yaml
Task 1: LOCATE PRD Section 8.1
  - FIND: File path /home/dustin/projects/groundswell/PRD.md
  - READ: Lines 177-189 for @Step Decorator Options
  - IDENTIFY: Line 183 containing trackTiming?: boolean
  - CONFIRM: Default value is NOT documented in PRD

Task 2: VERIFY Implementation Default
  - READ: src/decorators/step.ts line 94
  - ANALYZE: if (opts.trackTiming !== false) pattern
  - CONFIRM: Default is true (opt-out, not opt-in)

Task 3: COMPARE Documentation Sources
  - CHECK: src/types/decorators.ts JSDoc comment
  - CHECK: README.md table documentation
  - CONFIRM: Type defs and README correctly show default: true
  - IDENTIFY: PRD is the only source missing this information

Task 4: CREATE Research Report
  - WRITE: Research findings to research/ subdirectory
  - DOCUMENT: Exact file paths, line numbers, documentation gap
  - PROVIDE: Recommendations for PRD update (for S2)
```

### Validation Loop (Research-Specific)
```bash
# Level 1: Research Completeness
ls plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T3S1/research/
# Expected: 3 research files created

# Level 2: Location Verification
grep -n "trackTiming" PRD.md
# Expected: Line 183 shows trackTiming?: boolean

# Level 3: Documentation Gap Confirmation
grep -A2 -B2 "trackTiming" PRD.md | grep -i "default"
# Expected: No results (confirms gap exists)

# Level 4: Implementation Verification
grep "trackTiming !== false" src/decorators/step.ts
# Expected: Line 94 confirms default is true
```

### Final Validation Checklist
- [ ] PRD Section 8.1 location documented: PRD.md lines 177-189
- [ ] trackTiming line number documented: Line 183
- [ ] Documentation gap confirmed (no default value in PRD)
- [ ] Implementation default verified: true (via !== false pattern)
- [ ] Research files stored in P1M2T3S1/research/
- [ ] Next task (S2) has clear location for PRD update

## Confidence Score
**10/10** - This is straightforward research with clear deliverables and existing documentation to verify against.
