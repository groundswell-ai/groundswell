name: "PRP: P1.M1.T1.S1 - Research PRD specification for child() signature"
description: |

---

## Goal

**Feature Goal**: Document the PRD specification for WorkflowLogger.child() signature and create a comprehensive analysis comparing it with the current implementation.

**Deliverable**: Analysis document `plan/bugfix/architecture/logger_child_signature_analysis.md` containing:
- PRD specification details for child(meta: Partial<LogEntry>)
- Current implementation analysis of child(parentLogId: string)
- Detailed comparison of differences
- Migration recommendations and approach
- All existing call sites cataloged for impact analysis

**Success Definition**:
- Analysis document exists at specified path with all required sections
- All existing child() call sites are documented with their usage patterns
- Clear migration path is defined for future implementation work
- Document passes "No Prior Knowledge" test - enables implementer to understand complete context

## User Persona (if applicable)

**Target User**: Developer/Implementer (Subtask P1.M1.T1.S2 executor)

**Use Case**: Research phase before implementing the signature change migration

**User Journey**:
1. Read this PRP to understand the research scope
2. Use provided context files to understand PRD vs implementation
3. Catalog existing call sites and usage patterns
4. Document findings for implementation team
5. Create migration recommendations

**Pain Points Addressed**:
- Fragmented understanding of PRD requirements across multiple documents
- Unclear impact of signature change on existing code
- Need for comprehensive context before implementing breaking changes

## Why

- **Critical Bug Fix Foundation**: This research enables the critical signature mismatch fix (P1.M1.T1) which violates the public API contract
- **Impact Analysis**: Understanding all call sites is essential before implementing a breaking change
- **Migration Safety**: Proper research prevents unintended breaking of existing functionality
- **Documentation Alignment**: Ensures implementation matches PRD specification for long-term maintainability

## What

Research task to analyze and document the PRD specification for WorkflowLogger.child() method signature.

### Success Criteria

- [ ] Analysis document created at `plan/bugfix/architecture/logger_child_signature_analysis.md`
- [ ] PRD Section 12.1 specification documented with exact signature requirements
- [ ] Current implementation documented from src/core/logger.ts:84-86
- [ ] All existing child() call sites cataloged with file paths and line numbers
- [ ] Migration recommendations provided for backward compatibility
- [ ] Document passes "No Prior Knowledge" validation

## All Needed Context

### Context Completeness Check

_Before writing this PRP, I validated: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

### Documentation & References

```yaml
# MUST READ - PRD Specification
- url: file:///home/dustin/projects/groundswell/PRPs/PRDs/001-hierarchical-workflow-engine.md
  section: "Section 12.1 (lines 286-308)"
  why: PRD specification for child() signature - defines required API contract
  critical: PRD specifies `child(meta: Partial<LogEntry>): WorkflowLogger` which differs from current implementation

# MUST READ - Current Implementation
- file: src/core/logger.ts
  lines: "1-88 (complete file)"
  why: Complete WorkflowLogger implementation including child() method at lines 84-86
  pattern: Current signature is `child(parentLogId: string): WorkflowLogger`
  gotcha: Current implementation passes parentLogId to constructor but PRD shows constructor without it

# MUST READ - Type Definitions
- file: src/types/logging.ts
  lines: "1-25"
  why: LogEntry interface definition - required to understand Partial<LogEntry> type
  pattern: LogEntry has fields: id, workflowId, timestamp, level, message, data?, parentLogId?

# MUST READ - Architecture Documentation
- docfile: plan/bugfix/architecture/codebase_structure.md
  why: Documents WorkflowLogger location and current implementation details
  section: "WorkflowLogger class at src/core/logger.ts:84"

# MUST READ - Existing Test Patterns
- file: src/__tests__/adversarial/edge-case.test.ts
  lines: "90-110"
  why: Example of current child() usage pattern: `logger.child('parent-id-123')`
  pattern: String argument passed to child() method

# MUST READ - Test Framework Configuration
- file: package.json
  section: "scripts: test, test:watch"
  why: Verification commands - vitest is the testing framework used
  command: `npm test` runs `vitest run`

# MUST READ - Partial<> Usage Patterns
- file: src/types/reflection.ts
  lines: "100-120"
  why: Example of Partial<> pattern with default merging using spread operator
  pattern: `{ ...DEFAULT_CONFIG, ...partial }` for merging Partial objects

# MUST READ - Migration Context
- docfile: plan/bugfix/RESEARCH_SUMMARY.md
  why: Contains research notes about the signature mismatch issue
  section: "Signature Mismatch: child() method"
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── package.json                    # Test commands: npm test, npm run test:watch
├── PRPs/
│   └── PRDs/
│       └── 001-hierarchical-workflow-engine.md    # PRD Section 12.1 (lines 286-308)
├── plan/
│   └── bugfix/
│       ├── architecture/
│       │   ├── codebase_structure.md              # WorkflowLogger documentation
│       │   ├── concurrent_execution_best_practices.md
│       │   └── error_handling_patterns.md
│       ├── P1M1T1S1/                               # THIS WORK ITEM
│       │   └── research/                           # Research output directory
│       └── RESEARCH_SUMMARY.md                     # Existing research notes
├── src/
│   ├── core/
│   │   └── logger.ts                               # WorkflowLogger class (lines 84-86: child())
│   ├── types/
│   │   └── logging.ts                              # LogEntry interface
│   ├── __tests__/
│   │   ├── unit/                                   # Unit tests
│   │   └── adversarial/
│   │       ├── edge-case.test.ts                   # child() usage at line ~96
│   │       └── deep-analysis.test.ts               # child() usage at line ~61
│   └── utils/
│       └── id.ts                                   # generateId() utility
├── vitest.config.ts                # Vitest configuration
└── tsconfig.json                    # TypeScript configuration
```

### Desired Codebase Tree (After This Research Task)

```bash
plan/bugfix/
├── architecture/
│   └── logger_child_signature_analysis.md    # NEW: Main analysis output document
└── P1M1T1S1/
    ├── PRP.md                                 # THIS FILE: Product Requirement Prompt
    └── research/
        ├──prd_specification.md                # NEW: Extracted PRD Section 12.1 details
        ├──current_implementation.md           # NEW: Current implementation analysis
        ├──call_site_catalog.md                # NEW: All existing child() call sites
        └──migration_recommendations.md        # NEW: Recommended migration approach
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: TypeScript Partial<> type requires proper default merging
// Pattern from src/types/reflection.ts: { ...DEFAULT_CONFIG, ...partial }
// Wrong: direct assignment may leave undefined values
// Right: spread operator merging with defaults

// CRITICAL: PRD constructor differs from current implementation
// Current: new WorkflowLogger(node, observers, parentLogId?)
// PRD: new WorkflowLogger(node, observers) - no parentLogId parameter
// Migration must handle this discrepancy

// CRITICAL: Existing child() call sites use string argument
// Found in src/__tests__/adversarial/edge-case.test.ts:96
// Found in src/__tests__/adversarial/deep-analysis.test.ts:61
// Backward compatibility must be maintained

// CRITICAL: LogEntry.parentLogId is optional (undefined for root logs)
// Child logger entries MUST have parentLogId set
// This is how hierarchical logging is implemented

// CRITICAL: Vitest test framework uses import pattern
// import { describe, it, expect, beforeEach, afterEach } from 'vitest'
// Not jest - different mocking APIs (vi.spyOn, vi.fn, not jest.spyOn, jest.fn)
```

## Implementation Blueprint

### Research Output Structure

Create structured research documents under plan/bugfix/P1M1T1S1/research/:

```markdown
research/
├── prd_specification.md          # PRD Section 12.1 content
├── current_implementation.md     # src/core/logger.ts analysis
├── call_site_catalog.md          # All child() usage sites
└── migration_recommendations.md  # Proposed approach
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE plan/bugfix/P1M1T1S1/research/prd_specification.md
  - EXTRACT: Complete PRD Section 12.1 content from PRPs/PRDs/001-hierarchical-workflow-engine.md:286-308
  - DOCUMENT: Exact signature: child(meta: Partial<LogEntry>): WorkflowLogger
  - DOCUMENT: Constructor signature from PRD: new WorkflowLogger(node, observers)
  - DOCUMENT: LogEntry interface fields that can be partially specified
  - FORMAT: Markdown with code blocks for clarity
  - PLACEMENT: plan/bugfix/P1M1T1S1/research/

Task 2: CREATE plan/bugfix/P1M1T1S1/research/current_implementation.md
  - EXTRACT: Complete WorkflowLogger class from src/core/logger.ts:1-88
  - DOCUMENT: Current signature: child(parentLogId: string): WorkflowLogger
  - DOCUMENT: Current constructor: new WorkflowLogger(node, observers, parentLogId?)
  - DOCUMENT: How parentLogId flows through the log() method (lines 35-51)
  - DOCUMENT: The private emit() method pattern (lines 21-30)
  - FORMAT: Markdown with line number references
  - PLACEMENT: plan/bugfix/P1M1T1S1/research/

Task 3: CREATE plan/bugfix/P1M1T1S1/research/call_site_catalog.md
  - SEARCH: All occurrences of `.child(` in the codebase
  - DOCUMENT: Each call site with file path, line number, and usage pattern
  - CATEGORIZE: Test usage vs production usage
  - ANALYZE: How each call site would be affected by signature change
  - IDENTIFY: Backward compatibility requirements
  - FORMAT: Table format for easy reference
  - PLACEMENT: plan/bugfix/P1M1T1S1/research/

Task 4: CREATE plan/bugfix/P1M1T1S1/research/migration_recommendations.md
  - ANALYZE: Differences between PRD and implementation
  - PROPOSE: Backward compatibility approach (string shorthand for parentLogId)
  - REFERENCE: Partial<> usage patterns from src/types/reflection.ts
  - DOCUMENT: Recommended function signature using TypeScript overloads
  - IDENTIFY: Risks and mitigation strategies
  - PLACEMENT: plan/bugfix/P1M1T1S1/research/

Task 5: CREATE plan/bugfix/architecture/logger_child_signature_analysis.md
  - COMPILE: Consolidated analysis from all research documents
  - INCLUDE: Executive summary of findings
  - INCLUDE: PRD vs Implementation comparison table
  - INCLUDE: Complete call site catalog
  - INCLUDE: Migration recommendations
  - REFERENCE: All individual research documents
  - PLACEMENT: plan/bugfix/architecture/

Task 6: VERIFY plan/bugfix/P1M1T1S1/PRP.md completeness
  - VALIDATE: All context references are accurate and accessible
  - VALIDATE: File paths are correct
  - VALIDATE: "No Prior Knowledge" test would pass
  - UPDATE: Any missing context or unclear references
  - PLACEMENT: plan/bugfix/P1M1T1S1/
```

### Research Patterns & Key Details

```typescript
// Pattern 1: PRD Specification Extraction
// From PRPs/PRDs/001-hierarchical-workflow-engine.md:303-305
child(meta: Partial<LogEntry>): WorkflowLogger {
  return new WorkflowLogger(this.node, this.observers);
}
// NOTE: PRD constructor does NOT include parentLogId parameter

// Pattern 2: Current Implementation
// From src/core/logger.ts:84-86
child(parentLogId: string): WorkflowLogger {
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
// NOTE: Constructor receives parentLogId as third parameter

// Pattern 3: parentLogId Flow in LogEntry
// From src/core/logger.ts:45-48
if (this.parentLogId) {
  entry.parentLogId = this.parentLogId;
}
// CRITICAL: This is how hierarchical logging is implemented

// Pattern 4: Partial<> Merging Pattern (from codebase)
// From src/types/reflection.ts - createReflectionConfig function
export function createReflectionConfig(
  partial?: Partial<ReflectionConfig>
): ReflectionConfig {
  return {
    ...DEFAULT_REFLECTION_CONFIG,
    ...partial,
  };
}
// RECOMMENDED: Use this pattern for handling Partial<LogEntry>

// Pattern 5: Existing Call Site Pattern
// From src/__tests__/adversarial/edge-case.test.ts:96
const childLogger = this.logger.child('parent-id-123');
// BACKWARD COMPATIBILITY: Must support string argument as shorthand
```

### Integration Points

```yaml
PRD_DOCUMENT:
  - location: PRPs/PRDs/001-hierarchical-workflow-engine.md
  - section: "12.1 WorkflowLogger Skeleton"
  - lines: 286-308

TYPE_DEFINITIONS:
  - file: src/types/logging.ts
  - interface: LogEntry (lines 9-24)
  - fields: id, workflowId, timestamp, level, message, data?, parentLogId?

TEST_SITES:
  - src/__tests__/adversarial/edge-case.test.ts:96
  - src/__tests__/adversarial/deep-analysis.test.ts:61
  - dist/__tests__/unit/logging.test.js (HierarchicalLogger tests - different class)

ARCHITECTURE_DOCS:
  - plan/bugfix/architecture/codebase_structure.md
  - plan/bugfix/RESEARCH_SUMMARY.md
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Not applicable - this is a research task producing documentation
# No code compilation needed

# Verify markdown syntax if using linting tools
npx markdownlint plan/bugfix/P1M1T1S1/research/*.md --fix

# Expected: Zero markdown syntax errors
```

### Level 2: Document Completeness (Content Validation)

```bash
# Verify all required documents exist
ls -la plan/bugfix/P1M1T1S1/research/
# Expected output: prd_specification.md, current_implementation.md,
#                  call_site_catalog.md, migration_recommendations.md

# Verify main analysis document exists
ls -la plan/bugfix/architecture/logger_child_signature_analysis.md
# Expected: File exists

# Count words in each document (minimum thresholds)
wc -w plan/bugfix/P1M1T1S1/research/*.md
# Expected: Each document should have substantial content (>100 words)

# Verify document contains required sections
grep -E "### (PRD Specification|Current Implementation|Call Sites|Migration)" plan/bugfix/architecture/logger_child_signature_analysis.md
# Expected: All section headers found
```

### Level 3: Research Quality Validation (Accuracy Check)

```bash
# Verify PRD reference is accurate
grep -A 5 "child(meta: Partial" PRPs/PRDs/001-hierarchical-workflow-engine.md
# Expected: Shows child(meta: Partial<LogEntry>): WorkflowLogger

# Verify current implementation reference is accurate
grep -A 2 "child(parentLogId" src/core/logger.ts
# Expected: Shows child(parentLogId: string): WorkflowLogger

# Verify call sites are documented correctly
grep -r "\.child(" src/__tests__/ --include="*.ts"
# Expected: Matches documented call sites

# Verify LogEntry interface reference
grep -A 15 "interface LogEntry" src/types/logging.ts
# Expected: Shows all LogEntry fields including parentLogId
```

### Level 4: Context Completeness Validation ("No Prior Knowledge" Test)

```bash
# Test: Can someone new to the project understand the issue?
# Validation questions to answer:

# 1. What is the PRD specification?
cat plan/bugfix/P1M1T1S1/research/prd_specification.md
# Should clearly state: child(meta: Partial<LogEntry>): WorkflowLogger

# 2. What is the current implementation?
cat plan/bugfix/P1M1T1S1/research/current_implementation.md
# Should clearly state: child(parentLogId: string): WorkflowLogger

# 3. What code will be affected?
cat plan/bugfix/P1M1T1S1/research/call_site_catalog.md
# Should list all files and line numbers

# 4. How should migration be handled?
cat plan/bugfix/P1M1T1S1/research/migration_recommendations.md
# Should provide clear approach with backward compatibility

# 5. Is there a single comprehensive document?
cat plan/bugfix/architecture/logger_child_signature_analysis.md
# Should consolidate all findings with clear summary
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 research documents exist in plan/bugfix/P1M1T1S1/research/
- [ ] Main analysis document exists at plan/bugfix/architecture/logger_child_signature_analysis.md
- [ ] All file references in documents are accurate and accessible
- [ ] PRD specification is correctly extracted with line numbers
- [ ] Current implementation is correctly documented with line numbers
- [ ] All child() call sites are catalogued
- [ ] Migration recommendations include backward compatibility approach

### Research Quality Validation

- [ ] PRD specification section includes exact signature from Section 12.1
- [ ] Current implementation section includes complete child() method and constructor
- [ ] Call site catalog includes file paths, line numbers, and usage patterns
- [ ] Migration recommendations reference codebase patterns (Partial<> usage)
- [ ] Main analysis document consolidates all findings with executive summary
- [ ] Documents pass "No Prior Knowledge" test

### Documentation & Formatting

- [ ] All markdown files are properly formatted
- [ ] Code blocks have language identifiers (typescript, bash, etc.)
- [ ] File paths use absolute paths or clear relative paths from project root
- [ ] Line number references are accurate
- [ ] Tables (if any) are properly formatted

### Success Criteria Validation

- [ ] Analysis document exists at specified path
- [ ] PRD specification documented with exact signature requirements
- [ ] Current implementation documented from src/core/logger.ts
- [ ] All existing child() call sites cataloged
- [ ] Migration recommendations provided
- [ ] Document enables implementation without additional context

---

## Anti-Patterns to Avoid

- ❌ Don't assume prior knowledge - be explicit about all file locations and line numbers
- ❌ Don't skip cataloging call sites - every usage matters for migration planning
- ❌ Don't ignore backward compatibility - existing code must continue to work
- ❌ Don't omit line numbers - references must be precise
- ❌ Don't create research documents without cross-referencing - link related sections
- ❌ Don't forget the "No Prior Knowledge" test - imagine explaining to someone new
- ❌ Don't mix PRD content with implementation analysis - keep them separate
- ❌ Don't propose migration without understanding existing patterns - reference Partial<> usage from codebase
