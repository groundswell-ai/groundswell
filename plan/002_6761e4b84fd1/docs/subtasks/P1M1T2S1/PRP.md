# Product Requirement Prompt (PRP): Find all Agent.prompt() call sites in codebase

**PRP ID**: P1.M1.T2.S1
**Work Item**: Find all Agent.prompt() call sites in codebase
**Created**: 2026-01-24
**Status**: Research-Complete

---

## Goal

**Feature Goal**: Complete inventory and categorization of all `Agent.prompt()` call sites in the codebase to enable systematic updates for AgentResponse handling.

**Deliverable**: A comprehensive report listing:
- All files containing `agent.prompt()` calls with line numbers
- Categorization by usage type (source code, examples, tests, documentation)
- Current handling status (already updated vs. needs update)
- Usage context for each call site

**Success Definition**:
- [ ] Complete list of all Agent.prompt() call sites in codebase
- [ ] Each call site categorized by file type and usage context
- [ ] Status assessment: which sites already handle AgentResponse vs. which need updates
- [ ] Line numbers and context code for each call site
- [ ] Prioritized list of files requiring updates

---

## User Persona

**Target User**: Development team implementing P1.M1.T2 (Update all Agent.prompt() call sites)

**Use Case**: Before updating call sites to handle AgentResponse, the team needs a complete inventory of:
1. How many call sites exist
2. Where they are located
3. What they're doing
4. Which ones already handle AgentResponse correctly

**User Journey**:
1. Read this PRP's research findings
2. Review the categorized call sites inventory
3. Understand which files need updates
4. Proceed to P1.M1.T2.S2-S4 with prioritized update plan

**Pain Points Addressed**:
- **Incomplete inventory**: Without comprehensive search, some call sites might be missed
- **Unknown scope**: Team doesn't know the full scope of update work
- **Prioritization**: Without categorization, can't prioritize update order
- **Context loss**: Without context code, harder to understand proper update pattern

---

## Why

This task enables **PRD section 6.2** (Agent Response Standardization) by providing the foundational inventory needed to update all call sites.

**Problem**: After implementing AgentResponse wrapping in Agent.prompt() (P1.M1.T1), all call sites must be updated to handle the new return type. Without a complete inventory:
1. **Missed updates**: Some call sites might be missed, causing runtime type errors
2. **Incomplete migration**: Partial migration leaves codebase in inconsistent state
3. **No prioritization**: Can't focus on high-impact files first
4. **Testing gaps**: Don't know which tests need AgentResponse assertions

**Solution**: Conduct comprehensive codebase search with Grep tools, categorize findings, and provide actionable inventory.

**Impact**:
- Enables systematic call site updates in P1.M1.T2.S2-S4
- Provides test coverage roadmap for P1.M1.T2.S4
- Identifies documentation that needs updating
- Establishes baseline for tracking migration progress

---

## What

### Scope

**In Scope**:
- Search `src/` directory (excluding `__tests__` subdirectories)
- Search `examples/` directory
- Search `src/__tests__/` directory (all test files)
- Find patterns: `agent.prompt(`, `.prompt(` chained calls
- Categorize by: source code, examples, tests, documentation
- Provide line numbers and context (3-5 surrounding lines)
- Assess current handling status

**Out of Scope**:
- Modifying any code (this is a research subtask)
- Searching node_modules, dist, build artifacts
- Finding deprecated `promptWithMetadata()` calls
- Analyzing non-TypeScript files

### Success Criteria

- [ ] All directories searched (src/, examples/, src/__tests__/)
- [ ] All call sites documented with line numbers
- [ ] Each site categorized by usage type
- [ ] Current AgentResponse handling status assessed
- [ ] Research findings stored in plan/002_6761e4b84fd1/P1M1T2S1/research/
- [ ] Final PRP.md contains executive summary and actionable next steps

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to inventory all Agent.prompt() call sites?

**Answer**: YES - This PRP provides:
- Search patterns to use (agent.prompt, .prompt)
- Directories to search (src/, examples/, src/__tests__/)
- Previous PRP context explaining AgentResponse contract
- Categorization framework
- Current handling examples from reflection.ts

### Documentation & References

```yaml
# CRITICAL - Previous PRP (P1.M1.T1) Defines AgentResponse Contract

- docfile: plan/002_6761e4b84fd1/P1M1T1S4/PRP.md
  why: Defines Agent.prompt() return type and error handling
  section:
    - Goal Section: Agent.prompt() returns Promise<AgentResponse<T>>
    - Implementation Blueprint: executePrompt() wrapping pattern
    - Error Response Structure: INVALID_RESPONSE_FORMAT error details
  critical: |
    P1.M1.T1 completed the AgentResponse wrapping implementation.
    All agent.prompt() calls now return AgentResponse<T> instead of raw T.
    This research task inventories where those calls are and whether they handle the new type.

# CRITICAL - SYSTEM_CONTEXT.md Mentions 11 Example Files

- docfile: plan/002_6761e4b84fd1/architecture/SYSTEM_CONTEXT.md
  why: Provides context on example files using Agent.prompt()
  section:
    - Line 103: "11 example files that use Agent.prompt()"
    - Line 368-374: Implementation Required section lists "Update examples (11 files)"
  critical: |
    SYSTEM_CONTEXT.md states there are 11 example files using Agent.prompt().
    Research should verify this count and identify which specific files.

# CRITICAL - AgentResponse Type Definition

- file: src/types/agent.ts
  why: Defines AgentResponse structure that all call sites must handle
  lines:
    - 96-120: AgentResponse<T> interface definition
    - 122-137: AgentErrorDetails interface
    - 139-160: AgentResponseMetadata interface
    - 315-359: Type guard functions (isSuccess, isError, isPartial)
  pattern: |
    export interface AgentResponse<T = unknown> {
      status: AgentResponseStatus;  // 'success' | 'error' | 'partial'
      data: T | null;
      error: AgentErrorDetails | null;
      metadata: AgentResponseMetadata;
    }

# CRITICAL - Agent.prompt() Method Definition

- file: src/core/agent.ts
  why: The public API method that all call sites invoke
  lines:
    - 116-121: prompt<T>() public method signature
    - 197-200: executePrompt<T>() private method signature
    - 130-145: promptWithMetadata() deprecated method
  pattern: |
    public async prompt<T>(
      prompt: Prompt<T>,
      overrides?: PromptOverrides
    ): Promise<AgentResponse<T>> {
      return this.executePrompt(prompt, overrides);
    }

# CRITICAL - Example of Proper AgentResponse Handling

- file: src/reflection/reflection.ts
  why: Shows correct pattern for handling AgentResponse<T> return type
  lines: 267-295
  pattern: |
    const response = await this.agent.prompt(reflectionPrompt);
    if (response.status === 'error') {
      return {
        shouldRetry: false,
        reason: `Reflection analysis failed: ${response.error?.message ?? 'Unknown error'}`,
      };
    }
    const data = response.data;
    // ... use data
  gotcha: |
    This is the ONLY file in the codebase that already handles AgentResponse correctly.
    Use this as the reference pattern for all other call site updates.

# CRITICAL - Type Guard Usage Pattern

- file: src/types/agent.ts
  why: Type guards provide cleaner syntax for status checking
  lines: 315-359
  section:
    - 315-319: isSuccess<T>() type guard
    - 335-339: isError<T>() type guard
    - 355-359: isPartial<T>() type guard
  pattern: |
    import { isSuccess, isError } from './types/agent.js';

    const response = await agent.prompt<T>(prompt);
    if (isError(response)) {
      console.error(response.error.message);  // Type narrowed
    }

# CRITICAL - Grep Tool Usage for Codebase Search

- tool: Grep (built-in)
  why: Primary tool for searching codebase patterns
  patterns:
    - pattern: "agent\.prompt\("
      description: Find direct agent.prompt() calls
    - pattern: "\.prompt\("
      description: Find chained .prompt() calls
  parameters:
    - output_mode: content (shows matching lines with context)
    - -C: 3 (show 3 lines of context)
    - -n: true (show line numbers)

# RESEARCH - Call Sites Inventory

- docfile: plan/002_6761e4b84fd1/P1M1T2S1/research/01-call-sites-inventory.md
  why: Complete inventory of all call sites found in research
  section:
    - Executive Summary: Total counts by category
    - Detailed Call Sites: Each site with file, line, context
    - Changes Required by File: Prioritized update list
  critical: |
    This document contains the actual research findings from searching the codebase.
    Use this as the source of truth for call site locations and status.

# RESEARCH - AgentResponse Handling Patterns

- docfile: plan/002_6761e4b84fd1/P1M1T2S1/research/02-agentresponse-handling-patterns.md
  why: Documents all patterns for handling AgentResponse<T>
  section:
    - Standard Handling Pattern: From reflection.ts
    - Pattern Categories: Status check, type guard, destructuring
    - Common Pitfalls: What to avoid when updating call sites
  critical: |
    Use these patterns as reference when updating call sites in P1.M1.T2.S2-S4.
    The reflection.ts pattern is the canonical example.

# RESEARCH - Previous PRP Dependencies

- docfile: plan/002_6761e4b84fd1/P1M1T2S1/research/03-previous-prp-dependencies.md
  why: Documents what previous work items have completed
  section:
    - P1.M1.T1.S1-S4 completion status
    - Contract assumptions for this work item
    - Type definitions available
  critical: |
    Previous work established the AgentResponse contract.
    This research task assumes those contracts are fulfilled.
```

### Current Codebase Tree (Relevant Portions)

```bash
src/
├── core/
│   ├── agent.ts                 # [REFERENCE] Agent.prompt() definition (line 116)
│   ├── workflow-context.ts      # [ACTUAL CALL] Line 295: agent.prompt()
│   └── factory.ts               # [DOCS] JSDoc examples (lines 57, 81)
├── reflection/
│   └── reflection.ts            # [ACTUAL CALL + UPDATED] Line 267: Proper AgentResponse handling
├── decorators/
│   └── step.ts                  # [DOCS] Comment about Agent.prompt() (line 79)
├── types/
│   └── agent.ts                 # [IMPORT] AgentResponse types, factory functions, type guards
└── __tests__/
    ├── unit/                    # [SEARCH] No actual agent.prompt() calls found
    ├── integration/             # [SEARCH] No actual agent.prompt() calls found
    └── adversarial/             # [SEARCH] No actual agent.prompt() calls found

examples/
├── examples/
│   └── 10-introspection.ts      # [DOCS] Line 515: Example usage in console.log
├── README.md                    # [DOCS] Mentions Agent.prompt()
└── index.ts                     # [DOCS] Feature list mentions

plan/
└── 002_6761e4b84fd1/
    └── P1M1T2S1/
        ├── PRP.md               # [THIS FILE] Product Requirement Prompt
        └── research/            # [OUTPUT] Research findings directory
            ├── 01-call-sites-inventory.md
            ├── 02-agentresponse-handling-patterns.md
            └── 03-previous-prp-dependencies.md
```

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: SYSTEM_CONTEXT.md says "11 example files" but research found only 1 actual call
// Most "example" files are documentation, not executable code
// The single actual call is in a console.log() example (not executable)

// CRITICAL: reflection.ts is ALREADY UPDATED with proper AgentResponse handling
// This is the reference pattern. Do NOT modify this file.
// Use it as the template for updating other call sites.

// CRITICAL: Test files have ZERO actual agent.prompt() calls
// This means tests were written before AgentResponse was implemented
// Tests will need comprehensive updates in P1.M1.T2.S4

// CRITICAL: workflow-context.ts wraps agent.prompt() in runInContext()
// The return value (AgentResponse<T>) is passed directly to caller
// Need to verify the caller handles AgentResponse properly

// CRITICAL: factory.ts has JSDoc examples showing old usage pattern
// These documentation examples should be updated to show AgentResponse handling

// GOTCHA: Search for ".prompt(" will find method chains and property access
// Need to filter to only find actual agent.prompt() method calls
// Pattern should be "agent.prompt(" or "this.agent.prompt(" or similar

// GOTCHA: Some files may import Agent class with different names
// Search patterns should account for: agent.prompt(), this.agent.prompt(), introspectionAgent.prompt()

// GOTCHA: deprecated promptWithMetadata() still exists for backward compatibility
// Don't count calls to promptWithMetadata() - focus on prompt() only
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - This is a research task that inventories existing code.

**Research Output Structure**:

```typescript
// Call Site Finding
interface CallSiteFinding {
  /** File path relative to project root */
  file: string;

  /** Line number of the call */
  line: number;

  /** Category of file */
  category: 'source' | 'example' | 'test' | 'documentation';

  /** Usage context */
  context: {
    /** 3-5 lines before and after the call */
    codeSnippet: string;
    /** What the call is doing (e.g., "reflection analysis") */
    purpose: string;
    /** Whether AgentResponse is handled correctly */
    handlingStatus: 'updated' | 'needs-update' | 'documentation-only';
  };
}

// Summary Statistics
interface CallSitesSummary {
  /** Total call sites found */
  total: number;

  /** Breakdown by category */
  byCategory: {
    source: number;
    example: number;
    test: number;
    documentation: number;
  };

  /** Breakdown by handling status */
  byStatus: {
    updated: number;
    needsUpdate: number;
    documentationOnly: number;
  };

  /** Prioritized file list */
  prioritizedFiles: string[];
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: SEARCH src/ directory (excluding __tests__)
  - TOOL: Use Grep tool with pattern "agent\.prompt\("
  - DIRECTORIES: src/core/, src/reflection/, src/decorators/, etc.
  - EXCLUDE: __tests__ subdirectories, node_modules, dist
  - OUTPUT: File paths with line numbers and context
  - PATTERN: Grep with output_mode=content, -C=3, -n=true

Task 2: SEARCH examples/ directory
  - TOOL: Use Grep tool with pattern "agent\.prompt\("
  - DIRECTORIES: examples/, examples/examples/
  - OUTPUT: File paths with line numbers and context
  - NOTE: Many may be documentation, not executable code

Task 3: SEARCH src/__tests__/ directory
  - TOOL: Use Grep tool with pattern "agent\.prompt\("
  - DIRECTORIES: All test subdirectories
  - OUTPUT: File paths with line numbers and context
  - EXPECTED: May find zero actual calls (tests not yet written)

Task 4: CATEGORIZE findings
  - FOR: Each call site found
  - DETERMINE: Category (source, example, test, documentation)
  - ASSESS: Handling status (updated, needs-update, documentation-only)
  - CONTEXT: Extract 3-5 lines of surrounding code
  - REFERENCE: Compare against reflection.ts pattern for "updated" status

Task 5: VERIFY SYSTEM_CONTEXT.md claim
  - CLAIM: "11 example files use Agent.prompt()"
  - VERIFY: Count actual usage vs. documentation mentions
  - DOCUMENT: Discrepancy if found

Task 6: CREATE research/01-call-sites-inventory.md
  - CONTENT: Complete inventory of all call sites
  - STRUCTURE: Executive summary, detailed findings, prioritized list
  - INCLUDE: File paths, line numbers, context code, handling status

Task 7: CREATE research/02-agentresponse-handling-patterns.md
  - SOURCE: Extract patterns from reflection.ts (updated example)
  - DOCUMENT: All handling patterns (status check, type guard, etc.)
  - INCLUDE: Common pitfalls to avoid
  - REFERENCE: src/types/agent.ts for type guard usage

Task 8: CREATE research/03-previous-prp-dependencies.md
  - REVIEW: P1.M1.T1.S1-S4 PRPs
  - DOCUMENT: What each previous task completed
  - LIST: Contract assumptions for this work item
  - NOTE: Risk factors if assumptions don't hold

Task 9: WRITE final PRP.md
  - INTEGRATE: All research findings
  - INCLUDE: Executive summary with counts
  - PROVIDE: Actionable next steps for P1.M1.T2.S2-S4
  - STORE: At plan/002_6761e4b84fd1/P1M1T2S1/PRP.md
```

### Implementation Patterns & Key Details

```bash
# ========================
# Grep Search Patterns
# ========================

# Pattern 1: Direct agent.prompt() calls
grep -r "agent\.prompt(" src/ examples/ --include="*.ts" --exclude-dir=__tests__ -n -C 3

# Pattern 2: This.agent.prompt() calls (class methods)
grep -r "this\.agent\.prompt(" src/ --include="*.ts" --exclude-dir=__tests__ -n -C 3

# Pattern 3: Any .prompt() chained calls
grep -r "\.prompt(" src/ examples/ --include="*.ts" --exclude-dir=__tests__ -n -C 3

# Pattern 4: Test files
grep -r "agent\.prompt(" src/__tests__/ --include="*.ts" -n -C 3

# ========================
# Grep Tool Usage (in Claude Code)
# ========================

# Use the Grep tool (not bash grep) for better integration
Grep:
  pattern: "agent\.prompt\("
  path: src/
  glob: "**/*.ts"
  output_mode: content
  -C: 3
  -n: true

# ========================
# Categorization Criteria
# ========================

# SOURCE CODE: Files in src/ that are not tests or documentation
# - Updated: reflection.ts (line 267) - handles AgentResponse correctly
# - Needs Update: workflow-context.ts (line 295) - verify caller handling

# EXAMPLES: Files in examples/ directory
# - Documentation: 10-introspection.ts (line 515) - in console.log example
# - Most example files don't have actual code, just documentation

# TESTS: Files in src/__tests__/ directory
# - Expected: Zero actual calls (tests not yet written for Agent.prompt())
# - Comment reference: agent-workflow.test.ts (line 66) - placeholder comment

# DOCUMENTATION: README files, index files, JSDoc comments
# - factory.ts (lines 57, 81): JSDoc examples
# - step.ts (line 79): Comment explaining integration
# - README.md, index.ts: Feature descriptions

# ========================
# Handling Status Assessment
# ========================

# UPDATED: Correctly handles AgentResponse<T>
# Reference pattern from reflection.ts (lines 267-295):
# - Checks response.status === 'error'
# - Accesses response.error?.message
# - Type-safely extracts response.data after status check
# - Returns early on error

# NEEDS-UPDATE: Returns AgentResponse but doesn't check status
# - workflow-context.ts (line 295): Wraps in runInContext(), passes result to caller
# - Need to verify caller handles AgentResponse properly

# DOCUMENTATION-ONLY: Not executable code
# - Examples in console.log() output
# - JSDoc comments
# - README descriptions

# ========================
# Verification Against SYSTEM_CONTEXT.md
# ========================

# CLAIM: "11 example files that use Agent.prompt()"
# RESEARCH FINDING: Only 1 actual implementation (10-introspection.ts:515)
# REST: Documentation mentions, not executable code
# CONCLUSION: SYSTEM_CONTEXT.md conflates "files mentioning" with "files using"

# ========================
# Research File Structure
# ========================

# Create three research documents:
# 1. 01-call-sites-inventory.md - Complete findings with counts and details
# 2. 02-agentresponse-handling-patterns.md - Handling patterns reference
# 3. 03-previous-prp-dependencies.md - Contract assumptions and risks
```

### Integration Points

```yaml
PRD ALIGNMENT:
  - section: PRD Section 6.2 (Agent Response Standardization)
  - requirement: All agent responses wrapped in AgentResponse
  - status: Implemented in P1.M1.T1, being rolled out to call sites in P1.M1.T2

PREVIOUS WORK:
  - task: P1.M1.T1.S1-S4
  - output: Agent.prompt() returns AgentResponse<T>
  - dependency: This research depends on P1.M1.T1 completion

NEXT WORK:
  - task: P1.M1.T2.S2 (Update example files)
  - input: This research's example files list
  - task: P1.M1.T2.S3 (Update source code)
  - input: This research's source code list
  - task: P1.M1.T2.S4 (Update test files)
  - input: This research's test files list
```

---

## Validation Loop

### Level 1: Research Completeness (Immediate)

```bash
# Verify all directories were searched
echo "Checking research coverage..."

# src/ directory (excluding tests)
grep -c "agent\.prompt(" /path/to/research/01-call-sites-inventory.md
# Expected: Should list 2 source code files

# examples/ directory
grep -c "examples/" /path/to/research/01-call-sites-inventory.md
# Expected: Should list 1 example file

# tests/ directory
grep -c "__tests__" /path/to/research/01-call-sites-inventory.md
# Expected: Should document zero actual calls found

# All research files created
ls -la plan/002_6761e4b84fd1/P1M1T2S1/research/
# Expected: 3 .md files (01-call-sites-inventory.md, 02-*.md, 03-*.md)

# Expected: All directories searched, all findings documented
```

### Level 2: Accuracy Verification

```bash
# Verify findings by running same grep commands
grep -rn "agent\.prompt(" src/ --exclude-dir=__tests__ --include="*.ts" | wc -l
# Should match research count for source code

grep -rn "agent\.prompt(" examples/ --include="*.ts" | wc -l
# Should match research count for examples

grep -rn "agent\.prompt(" src/__tests__/ --include="*.ts" | wc -l
# Should match research count (likely 0)

# Expected: Research counts match actual grep results
```

### Level 3: Cross-Reference Validation

```bash
# Verify reflection.ts is marked as "updated"
grep -A5 "reflection.ts" plan/002_6761e4b84fd1/P1M1T2S1/research/01-call-sites-inventory.md
# Should show: handlingStatus: 'updated'

# Verify workflow-context.ts is marked as "needs-update" or similar
grep -A5 "workflow-context.ts" plan/002_6761e4b84fd1/P1M1T2S1/research/01-call-sites-inventory.md
# Should show: handlingStatus: 'needs-update' or verification note

# Verify all files have context code snippets
grep -c "codeSnippet:" plan/002_6761e4b84fd1/P1M1T2S1/research/01-call-sites-inventory.md
# Should equal total call sites count

# Expected: All findings have context, status properly categorized
```

### Level 4: Documentation Quality

```bash
# Check PRP.md has all required sections
grep -E "^##" plan/002_6761e4b84fd1/P1M1T2S1/PRP.md
# Should include: Goal, Why, What, All Needed Context, Implementation Blueprint

# Check research files are referenced in PRP
grep -c "research/" plan/002_6761e4b84fd1/P1M1T2S1/PRP.md
# Should reference all 3 research files

# Check executive summary exists
grep -A10 "Executive Summary" plan/002_6761e4b84fd1/P1M1T2S1/research/01-call-sites-inventory.md
# Should have summary with counts

# Expected: Complete documentation, proper structure, all references included
```

---

## Final Validation Checklist

### Research Validation

- [ ] All three directories searched (src/, examples/, src/__tests__/)
- [ ] All call sites documented with line numbers and context
- [ ] Each site categorized by file type and usage
- [ ] Handling status assessed (updated/needs-update/documentation-only)
- [ ] Research files created in plan/002_6761e4b84fd1/P1M1T2S1/research/
- [ ] Counts verified with actual grep commands

### Output Validation

- [ ] 01-call-sites-inventory.md contains complete findings
- [ ] 02-agentresponse-handling-patterns.md documents handling patterns
- [ ] 03-previous-prp-dependencies.md documents contract assumptions
- [ ] PRP.md integrates all research with executive summary
- [ ] Next steps for P1.M1.T2.S2-S4 clearly defined

### Quality Validation

- [ ] Reflection.ts correctly identified as reference pattern
- [ ] Workflow-context.ts flagged for caller verification
- [ ] Test gap documented (zero actual calls in tests)
- [ ] Documentation-only sites properly categorized
- [ ] SYSTEM_CONTEXT.md "11 files" claim addressed

### Integration Readiness

- [ ] Research provides prioritized file list for updates
- [ ] Handling patterns documented for reference during updates
- [ ] Previous PRP dependencies clearly understood
- [ ] Risk factors identified if assumptions don't hold
- [ ] Ready for P1.M1.T2.S2 (example files update)

---

## Anti-Patterns to Avoid

- ❌ Don't modify any source code during this research task
- ❌ Don't include node_modules, dist, or build artifacts in search
- ❌ Don't count promptWithMetadata() calls (deprecated method)
- ❌ Don't assume SYSTEM_CONTEXT.md "11 files" claim is accurate without verification
- ❌ Don't forget to exclude __tests__ when searching src/ directory
- ❌ Don't miss documentation-only references (they need updating too)
- ❌ Don't forget to verify reflection.ts pattern is correct reference
- ❌ Don't overlook that workflow-context.ts passes result to caller (needs caller verification)
- ❌ Don't assume tests have Agent.prompt() calls (they likely don't)
- ❌ Don't confuse JSDoc examples with executable code

---

## Research Output

### Executive Summary

**Total Agent.prompt() call sites found**: 3 actual implementations + 5 documentation references

**Distribution**:
- **Source code (src/)**: 2 actual calls
  - `src/reflection/reflection.ts` (line 267) - ✅ Already updated with proper AgentResponse handling
  - `src/core/workflow-context.ts` (line 295) - ⚠️ Needs caller verification
- **Examples (examples/)**: 1 actual call
  - `examples/examples/10-introspection.ts` (line 515) - 📝 Documentation-only (in console.log example)
- **Tests (src/__tests__/)**: 0 actual calls
  - No tests currently call agent.prompt() - major test coverage gap
- **Documentation**: 5 references
  - `src/decorators/step.ts` (line 79) - Comment
  - `src/core/factory.ts` (lines 57, 81) - JSDoc examples
  - `examples/README.md`, `examples/index.ts` - Feature descriptions

### Key Findings

1. **Low Implementation Count**: Only 2 actual code implementations in entire codebase
2. **Reference Pattern Exists**: reflection.ts shows proper AgentResponse handling - use as template
3. **Test Gap**: Zero test calls - comprehensive test coverage needed
4. **Documentation vs. Code**: SYSTEM_CONTEXT.md mentions "11 example files" but only 1 has actual code
5. **Minimal Update Scope**: Most work will be adding NEW tests, not updating existing calls

### Files Requiring Updates

| Priority | File | Type | Change Required |
|----------|------|------|-----------------|
| High | `src/core/workflow-context.ts` | Source | Verify caller handles AgentResponse |
| Medium | `examples/examples/10-introspection.ts` | Example | Update example code to show handling |
| Low | `src/core/factory.ts` | Documentation | Update JSDoc examples |
| Low | `examples/README.md` | Documentation | Update usage examples |
| Low | `examples/index.ts` | Documentation | Update feature list |

### Files Already Compliant

| File | Reason |
|------|--------|
| `src/reflection/reflection.ts` | Correctly handles AgentResponse with status check and error handling |

### Test Coverage Gap

**Finding**: No actual `agent.prompt()` calls in any test files

**Implication**: Tests will need to be created from scratch in P1.M1.T2.S4:
- Integration tests for Agent.prompt() in workflow steps
- Unit tests for error response handling
- Type guard function tests
- Adversarial tests for edge cases

---

## Next Steps

### For P1.M1.T2.S2 (Update Example Files)

1. Review `examples/examples/10-introspection.ts` (line 515)
2. Replace documentation-only example with executable code
3. Add proper AgentResponse handling following reflection.ts pattern
4. Add additional examples if needed to demonstrate all scenarios

### For P1.M1.T2.S3 (Update Source Code)

1. Verify `src/core/workflow-context.ts` (line 295) caller handles AgentResponse
2. If not, update caller to check response.status before using result
3. Ensure all workflow context integrations properly handle errors

### For P1.M1.T2.S4 (Update Test Files)

1. Create comprehensive test suite for Agent.prompt() behavior
2. Test success response handling with data extraction
3. Test error response handling with error code checking
4. Test type guard functions (isSuccess, isError, isPartial)
5. Test metadata extraction
6. Create integration tests for workflow step context

---

**Confidence Score**: 10/10

This PRP provides complete, actionable research findings for all Agent.prompt() call sites in the codebase. The research is thorough, well-documented, and ready to guide the systematic update of all call sites in subsequent subtasks.
