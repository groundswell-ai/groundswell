# Product Requirement Prompt (PRP): Audit state-changing methods in Workflow class

---

## Goal

**Feature Goal**: Audit all state-changing methods in the Workflow class and document their current `treeUpdated` event emission status.

**Deliverable**: A comprehensive audit document at `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md` listing all methods that modify workflow state (status, stateSnapshot, children array, parent reference, logs array) with their current `treeUpdated` emission status (YES/NO/PARTIAL).

**Success Definition**:
- [ ] Audit document created at the specified path
- [ ] All state-changing methods in Workflow class identified
- [ ] Each method documented with:
  - Method name and line number
  - State properties modified
  - Current `treeUpdated` emission status (YES/NO/PARTIAL)
  - Exact line number where `treeUpdated` is emitted (or should be)
- [ ] Methods categorized by emission consistency
- [ ] Specific recommendations for missing emissions
- [ ] Code snippets included for each method showing current implementation
- [ ] Research summaries referenced in appendix

---

## User Persona

**Target User**: Implementation agent for P2.M3.T1.S2 ("Add treeUpdated emission to missing methods") and P2.M3.T1.S3 ("Write integration tests for tree update consistency").

**Use Case**: The implementation agent needs a complete inventory of which methods currently emit `treeUpdated` events and which methods should but don't. This audit serves as the foundation for adding the missing event emissions.

**User Journey**:
1. Read the audit document to understand current state
2. Identify methods missing `treeUpdated` emissions
3. Implement missing emissions in order of priority
4. Write tests to verify emissions work correctly
5. Validate the fix resolves PRD Issue #6

**Pain Points Addressed**:
- **Information Gap**: No single document lists all state-changing methods and their emission status
- **Context Loss**: Original research findings scattered across multiple files
- **Incomplete Analysis**: Need comprehensive method-by-method breakdown with line numbers
- **Implementation Risk**: Without audit, implementer may miss critical methods or add redundant emissions

---

## Why

**Business Value and User Impact**:
- Resolves PRD Issue #6 ("Missing TreeUpdated Event on State Changes") - a MAJOR severity issue
- Restores "1:1 Tree Mirror" guarantee (PRD Section 21)
- Ensures TreeDebugger receives accurate real-time updates
- Prevents observer notification gaps that cause stale UI state

**Integration with Existing Features**:
- Builds on existing event system (src/types/events.ts)
- Fixes observer pattern inconsistencies (src/debugger/tree-debugger.ts)
- Enables future P2.M3.T1.S3 integration tests
- Completes Phase 2 milestone (P2.M3: "Tree Update Event Consistency")

**Problems Solved**:
- **Inconsistent Notifications**: Observers miss tree structure changes
- **Stale Debugger State**: TreeDebugger doesn't reflect current workflow topology
- **Broken Invariant**: 1:1 tree mirror guarantee violated
- **Test Coverage Gaps**: No tests verify consistent event emission

---

## What

**User-Visible Behavior and Technical Requirements**:

This PRP is a **RESEARCH and AUDIT task**. No code modifications are made. The deliverable is documentation only.

**Scope of Audit**:

1. **Target File**: `src/core/workflow.ts` (Workflow base class)

2. **State Properties to Track**:
   - `status` - Current execution status (idle, running, completed, failed)
   - `stateSnapshot` - Serialized workflow state
   - `children` - Array of child Workflow instances
   - `parent` - Reference to parent Workflow
   - `logs` - Array of log entries (via node.logs)

3. **Methods to Audit**:
   - All public and private methods in Workflow class
   - Constructor
   - Methods that directly modify state properties
   - Methods that indirectly modify state via helper calls

4. **Audit Output Format**:
   ```markdown
   # treeUpdated Event Emission Audit

   ## Executive Summary
   [Summary of findings]

   ## Methods by Emission Status

   ### Currently Emitting treeUpdated
   [List of methods with YES status]

   ### Missing treeUpdated Emission
   [List of methods with NO status]

   ### Partial/Complex Cases
   [List of methods with PARTIAL status]

   ## Detailed Method Analysis
   [One section per method with code snippets]

   ## Recommendations
   [Prioritized list of fixes]
   ```

**Success Criteria**:
- [ ] Audit document is complete and accurate
- [ ] Every state-changing method is documented
- [ ] Line numbers are precise and verified
- [ ] Code snippets are current with codebase
- [ ] Recommendations are actionable for next task
- [ ] Research findings from subtasks are referenced

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to complete this audit successfully?

**Answer**: YES - This PRP provides:
- Complete research findings from 4 parallel research agents
- Specific file paths and line numbers to audit
- Clear definitions of what constitutes a state change
- Expected output format with examples
- Reference to PRD Issue #6 for business context
- Observer pattern documentation for understanding impact

---

### Documentation & References

```yaml
# MUST READ - Core source files for audit
- file: src/core/workflow.ts
  why: Target file for audit - contains all state-changing methods
  pattern: Workflow class methods that modify status, children, parent, stateSnapshot, logs
  critical: This is the ONLY file to audit - scope is limited to this class

- file: src/types/events.ts
  why: treeUpdated event type definition
  pattern: Discriminated union with treeUpdated event structure
  critical: Event payload is `{ type: 'treeUpdated'; root: WorkflowNode }`
  line: 25

- file: src/types/workflow.ts
  why: WorkflowNode and WorkflowStatus type definitions
  pattern: Interface definitions for workflow state structure
  critical: Understanding what properties constitute "state"

- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/prd_snapshot.md
  why: PRD Issue #6 description - the bug this audit addresses
  section: Lines 282-322 (Issue 6: Missing TreeUpdated Event on State Changes)
  critical: Defines expected behavior and impact

# MUST READ - Observer pattern context
- file: src/debugger/tree-debugger.ts
  why: Primary consumer of treeUpdated events - shows why emissions matter
  pattern: Observes workflow events, rebuilds tree on treeUpdated
  line: 164 (treeUpdated case handler)

- file: src/debugger/event-replayer.ts
  why: Shows event categorization and replay logic
  pattern: Structural events vs state events vs metadata events
  line: 25-27 (event categorization comment)

# MUST READ - Research findings from parallel agents
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/state-changing-methods-analysis.md
  why: Comprehensive analysis of all state-changing methods with line numbers
  section: Executive Summary, Detailed Analysis tables
  critical: Lists all 12 methods with current emission status

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/treeupdated-event-patterns.md
  why: Complete inventory of treeUpdated emission and consumption locations
  section: Event Emission Locations, Missing Emissions
  critical: Identifies where emissions exist and where they're missing

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/observer-patterns-analysis.md
  why: Observer interface and event flow documentation
  section: Event Flow diagrams, Tree Change Notifications
  critical: Explains how onTreeChanged() relates to treeUpdated

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/tree-mirroring-invariant.md
  why: 1:1 tree mirror invariant definition and impact analysis
  section: Currently treeUpdated is emitted correctly, Missing treeUpdated emission
  critical: Defines the invariant being violated

# EXTERNAL RESEARCH - Event emission patterns (if needed)
- url: https://en.wikipedia.org/wiki/Observer_pattern
  why: Observer pattern fundamentals for understanding notification consistency
  critical: Subject.notifyObservers() should be called after every state change
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts              # TARGET FILE - Workflow class to audit
│   ├── logger.ts                # WorkflowLogger (read-only context)
│   └── workflow-context.ts      # WorkflowContextImpl (step() method context)
├── types/
│   ├── events.ts                # treeUpdated event type definition
│   ├── workflow.ts              # WorkflowNode, WorkflowStatus types
│   └── index.ts                 # WorkflowObserver interface
├── debugger/
│   ├── tree-debugger.ts         # Primary treeUpdated consumer
│   └── event-replayer.ts        # Event replay with treeUpdated handling
└── __tests__/
    └── integration/
        └── tree-mirroring.test.ts  # Tree invariant tests

plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/
├── architecture/
│   └── tree-update-audit.md     # OUTPUT FILE - Create audit here
└── P2M3T1S1/
    └── research/                # Research findings directory
        ├── state-changing-methods-analysis.md
        ├── treeupdated-event-patterns.md
        ├── observer-patterns-analysis.md
        └── tree-mirroring-invariant.md
```

---

### Known Gotchas of Our Codebase & Library Quirks

```markdown
# CRITICAL: Workflow class state change patterns

# 1. Dual Tree Structure (1:1 Mirror Invariant)
# The Workflow class maintains TWO parallel trees that must stay synchronized:
# - Workflow Tree: Workflow instances with parent/children references
# - Node Tree: WorkflowNode objects with parent/children references
# Whenever one tree changes, the other must be updated, AND treeUpdated must be emitted

# 2. treeUpdated Event Payload Difference
# All events use { type, node } EXCEPT treeUpdated which uses { type, root }
# treeUpdated payload: { type: 'treeUpdated'; root: WorkflowNode }
# This is because treeUpdated signals changes to the ENTIRE tree, not just one node

# 3. Event Emission via emitEvent() Helper
# treeUpdated is emitted by calling: this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })
# The emitEvent() method (line 431) handles observer notification
# PATTERN: Always use getRoot().node for the root parameter

# 4. Current treeUpdated Emission Locations (ONLY 2)
# Line 778: setStatus() method - emits treeUpdated after status change
# Line 473: snapshotState() method - emits treeUpdated after snapshot
# NO other methods currently emit treeUpdated

# 5. Structural Events vs treeUpdated
# attachChild() emits 'childAttached' event (line 368)
# detachChild() emits 'childDetached' event (line 421)
# BUT neither emits 'treeUpdated' - THIS IS THE BUG
# Structural changes should trigger BOTH specific event AND treeUpdated

# 6. Observer Notification Flow
# emitEvent() → observers.onEvent() → if structural event → observers.onTreeChanged()
# onTreeChanged() is called for childAttached/childDetached/treeUpdated
# BUT only if emitEvent() is actually called for treeUpdated

# 7. State Changes Outside Workflow Class
# WorkflowContextImpl.step() creates step nodes and modifies parent.children
# This is in src/core/workflow-context.ts, NOT in workflow.ts
# Scope for this audit is ONLY src/core/workflow.ts - do NOT audit workflow-context.ts

# 8. Constructor Event Emission
# Constructor calls attachChild() if parent provided (line 144)
# This means treeUpdated is emitted transitively via attachChild()
# Audit should document this as indirect emission

# 9. restartStep() Method (Line 509)
# Calls snapshotState() internally (line 548)
# treeUpdated is emitted transitively via snapshotState()
# Audit should document this as indirect emission

# 10. runFunctional() Method (Line 810)
# Calls setStatus() multiple times (lines 816, 828, 836)
# treeUpdated is emitted transitively via setStatus()
# Audit should document this as indirect emission
```

---

## Implementation Blueprint

### Audit Methodology

**Step 1: Identify All State-Changing Methods**

For each method in the Workflow class, determine if it modifies:
1. `this.status` property
2. `this.node.status` property
3. `this.node.stateSnapshot` property
4. `this.children` array
5. `this.parent` reference
6. `this.children[].node.parent` references
7. `this.node.children` array
8. `this.node.events` array
9. `this.node.logs` array

**Step 2: Determine treeUpdated Emission Status**

For each state-changing method, check:
- Does it call `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })`?
- Is the call in the correct location (after state change)?
- Is the emission conditional or unconditional?

**Step 3: Categorize Emission Status**

- **YES**: Method directly emits treeUpdated
- **NO**: Method does NOT emit treeUpdated (missing emission)
- **INDIRECT**: Method calls another method that emits treeUpdated
- **PARTIAL**: Method has conditional emission or emits in some branches but not others

**Step 4: Document Each Method**

For each method, include:
- Method signature
- Line number
- State properties modified
- Current emission status
- Code snippet showing emission (or lack thereof)
- Recommendation if status is NO or PARTIAL

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ RESEARCH FINDINGS
  - READ: All 4 research files in plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/
  - EXTRACT: List of all state-changing methods identified by researchers
  - VERIFY: Line numbers match current codebase
  - CROSS-REFERENCE: Findings from multiple researchers

Task 2: AUDIT WORKFLOW CLASS METHODS
  - TARGET: src/core/workflow.ts
  - SCAN: Every method in Workflow class (lines 62-855)
  - IDENTIFY: Methods that modify status, stateSnapshot, children, parent, logs, events
  - DOCUMENT: Each method with line number and state changes
  - CATEGORIZE: Emission status (YES/NO/INDIRECT/PARTIAL)

Task 3: CREATE AUDIT DOCUMENT
  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
  - STRUCTURE: Executive summary → Methods by status → Detailed analysis → Recommendations
  - INCLUDE: Code snippets for each method
  - REFERENCE: Research files in appendix

Task 4: VERIFY COMPLETENESS
  - CHECK: All research findings incorporated
  - CHECK: Every state-changing method documented
  - CHECK: Line numbers are accurate
  - CHECK: Recommendations are actionable
  - VALIDATE: Audit document against PRD Issue #6 requirements
```

---

### Implementation Patterns & Key Details

```markdown
# Audit Document Structure Template

## Executive Summary
- Total state-changing methods: X
- Methods currently emitting treeUpdated: Y (Z%)
- Methods missing treeUpdated: N
- Priority recommendations (top 3)

## Methods by Emission Status

### Currently Emitting treeUpdated (Direct)
| Method | Line | State Changes | Emission Line |
|--------|------|---------------|---------------|

### Emitting treeUpdated (Indirect)
| Method | Line | State Changes | Via Method | Emission Line |
|--------|------|---------------|------------|---------------|

### Missing treeUpdated Emission
| Method | Line | State Changes | Severity | Recommendation |
|--------|------|---------------|----------|----------------|

### Complex/Partial Cases
| Method | Line | State Changes | Notes | Recommendation |
|--------|------|---------------|-------|----------------|

## Detailed Method Analysis

### Method: methodName
**Location**: Line X
**State Changes**: [list properties modified]
**Current Emission Status**: YES/NO/INDIRECT/PARTIAL

**Code Snippet**:
```typescript
// method code showing current implementation
```

**Analysis**:
[Explanation of current behavior]

**Recommendation**:
[Specific action needed, if any]

## Recommendations

### Priority 1: Critical Missing Emissions
[Methods that MUST emit treeUpdated]

### Priority 2: Consider Adding Emissions
[Methods that SHOULD emit treeUpdated for consistency]

### Priority 3: Code Quality Improvements
[Optional improvements for better patterns]

## Appendix: Research References
- state-changing-methods-analysis.md
- treeupdated-event-patterns.md
- observer-patterns-analysis.md
- tree-mirroring-invariant.md
```

---

## Validation Loop

### Level 1: Document Structure (Immediate Feedback)

```bash
# Verify audit document was created
ls -la plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md

# Check document has required sections
grep -q "Executive Summary" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
grep -q "Methods by Emission Status" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
grep -q "Detailed Method Analysis" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
grep -q "Recommendations" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md

# Expected: Document exists with all required sections
```

### Level 2: Content Completeness (Audit Validation)

```bash
# Count methods documented
grep -c "### Method:" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md

# Verify each method has required fields
# For each method section, check for:
# - Location line
# - State Changes list
# - Current Emission Status
# - Code Snippet

# Expected: At least 10 state-changing methods documented with all fields
```

### Level 3: Cross-Reference Validation (Research Verification)

```bash
# Verify research files are referenced
grep -q "state-changing-methods-analysis.md" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
grep -q "treeupdated-event-patterns.md" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
grep -q "observer-patterns-analysis.md" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
grep -q "tree-mirroring-invariant.md" plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md

# Expected: All research files referenced in appendix
```

### Level 4: Line Number Verification (Accuracy Check)

```bash
# Verify a sample of line numbers match actual code
# Example: Check setStatus line number
sed -n '775p' src/core/workflow.ts | grep -q "setStatus"

# Example: Check snapshotState line number
sed -n '452p' src/core/workflow.ts | grep -q "snapshotState"

# Example: Check attachChild line number
sed -n '334p' src/core/workflow.ts | grep -q "attachChild"

# Example: Check detachChild line number
sed -n '397p' src/core/workflow.ts | grep -q "detachChild"

# Expected: All line numbers in audit match actual code
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Audit document created at correct path
- [ ] Document contains all required sections
- [ ] All state-changing methods documented
- [ ] Line numbers verified against source code
- [ ] Code snippets are accurate and current
- [ ] Emission status correctly categorized
- [ ] Recommendations are specific and actionable

### Content Validation

- [ ] Executive summary provides clear overview
- [ ] Methods organized by emission status
- [ ] Each method has complete documentation
- [ ] Missing emissions clearly identified
- [ ] Priority recommendations included
- [ ] Research files properly referenced
- [ ] Appendices provide supporting context

### Readiness for Next Task

- [ ] Audit provides complete inventory for P2.M3.T1.S2
- [ ] Implementer can identify all missing emissions
- [ ] Recommendations include specific line numbers to modify
- [ ] Document explains WHY emissions are missing
- [ ] Context from all 4 research agents incorporated

---

## Anti-Patterns to Avoid

- ❌ Don't modify source code - this is AUDIT ONLY
- ❌ Don't audit files outside src/core/workflow.ts
- ❌ Don't include WorkflowContextImpl in audit (separate file)
- ❌ Don't skip methods with indirect emissions (document as INDIRECT)
- ❌ Don't forget to include constructor in audit
- ❌ Don't omit line numbers or code snippets
- ❌ Don't categorize emissions incorrectly (direct vs indirect)
- ❌ Don't miss state changes in node.properties vs workflow.properties
- ❌ Don't forget that children and node.children must stay in sync
- ❌ Don't ignore the 1:1 tree mirror invariant context
- ❌ Don't create recommendations that duplicate existing emissions
- ❌ Don't reference research files without reading them first

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Clear deliverable (audit document at specific path)
- ✅ Complete research from 4 parallel agents available
- ✅ Scope limited to single file (src/core/workflow.ts)
- ✅ No code modifications required (documentation-only task)
- ✅ Clear output format with template provided
- ✅ Specific validation commands included
- ✅ All line numbers and context pre-researched

**Validation**: The completed audit document will enable the P2.M3.T1.S2 implementation agent to add missing `treeUpdated` emissions with complete confidence that all cases have been identified and prioritized correctly.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
