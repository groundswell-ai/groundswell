# Bug Fix Planning - Hierarchical Workflow Engine

## Executive Summary

This document summarizes the bug fix planning process for the Hierarchical Workflow Engine. A comprehensive analysis was conducted, resulting in a structured backlog of fixes prioritized by severity and impact.

## Planning Process

### 1. Research Phase ✅

Two specialized research agents were spawned to analyze the codebase:

**Agent 1: Architecture Exploration**
- Mapped core workflow engine structure
- Identified all decorator implementations
- Located event system and error handling code
- Found specific file paths and line numbers for all issues
- **Output**: `plan_bugfix/architecture/ANALYSIS_PRD_VS_IMPLEMENTATION.md`

**Agent 2: PRD Compliance Analysis**
- Compared PRD requirements against implementation
- Verified all 10 issues mentioned in bug report
- Distinguished real gaps from design decisions
- Prioritized fixes by severity
- **Output**: `plan_bugfix/architecture/GAP_ANALYSIS_SUMMARY.md`

### 2. Documentation Phase ✅

Created comprehensive system documentation:

**System Context Document** (`plan_bugfix/architecture/system_context.md`)
- Architecture diagram and component overview
- Data flow documentation
- Type system reference
- Implementation patterns and guidelines
- Critical constraints and security considerations
- Reference implementations for common tasks

### 3. Decomposition Phase ✅

Created structured bug fix backlog:

**Bug Fix Tasks** (`./bug_fix_tasks.json`)
- 1 Phase: "Bug Fix Phase - Critical Issues"
- 3 Milestones organized by theme
- 7 Tasks with clear scope
- 29 Subtasks (0.5-2 SP each)
- Every subtask includes detailed `context_scope` contract

## Issues Summary

### Critical Issues Fixed in Backlog

#### Milestone 1: Error Handling & State Capture Fixes
1. **Empty state/logs in functional workflow errors** (Issue #2)
   - Impact: Error introspection doesn't work for functional workflows
   - Files: `src/core/workflow.ts`, `src/core/workflow-context.ts`
   - Subtasks: 8 (4 for workflow.ts, 4 for workflow-context.ts)

#### Milestone 2: Tree Structure & Event System Fixes
2. **Missing treeUpdated event emission** (Issue #1)
   - Impact: Tree debugger doesn't update on status changes
   - Files: `src/core/workflow.ts`
   - Subtasks: 4

3. **No cycle detection** (Issue #4)
   - Impact: DoS vulnerability, infinite loops possible
   - Files: `src/core/workflow.ts`
   - Subtasks: 4

4. **No duplicate attachment prevention** (Issue #7)
   - Impact: Inconsistent state, memory leaks
   - Files: `src/core/workflow.ts`
   - Subtasks: 2

#### Milestone 3: Documentation & Minor Improvements
5. **Missing trackTiming default documentation** (Issue #6)
   - Impact: Unexpected performance overhead
   - Files: `src/decorators/step.ts`, `README.md`
   - Subtasks: 2

6. **Lenient @Task validation not documented** (Issue #5)
   - Impact: Developer confusion
   - Files: `src/decorators/task.ts`, `README.md`
   - Subtasks: 2

### Issues Not Included in Backlog

**Issue #3: Error Merge Strategy Not Implemented**
- Status: Type exists but unused
- Severity: Major, but requires feature development
- Decision: Deferred to future enhancement phase
- Rationale: PRD specifies this is optional (default: disabled)

**Issue #8: parentLogId Underutilized**
- Status: Feature exists but not exposed
- Severity: Minor
- Decision: Deferred to feature enhancement
- Rationale: Would require tree debugger UI changes

**Issue #9: Steps Not in Tree Structure**
- Status: Intentional design decision
- Severity: Minor
- Decision: No fix needed
- Rationale: Steps are events, not tree nodes (by design)

**Issue #10: Edge Case Test Bugs**
- Status: File doesn't exist
- Severity: N/A
- Decision: Not applicable
- Rationale: `src/__tests__/unit/edge-cases.test.ts` does not exist in codebase

## Backlog Structure

### Phase 1: Bug Fix Phase - Critical Issues

**Milestone 1.1: Error Handling & State Capture Fixes**
- Task 1.1.1: Fix Workflow.runFunctional() error handler (4 subtasks)
- Task 1.1.2: Fix WorkflowContext error handlers (4 subtasks)

**Milestone 1.2: Tree Structure & Event System Fixes**
- Task 1.2.1: Add cycle detection (4 subtasks)
- Task 1.2.2: Emit treeUpdated events (4 subtasks)
- Task 1.2.3: Prevent duplicate attachments (2 subtasks)

**Milestone 1.3: Documentation & Minor Improvements**
- Task 1.3.1: Document trackTiming default (2 subtasks)
- Task 1.3.2: Document @Task validation behavior (2 subtasks)

## Story Points Summary

| Milestone | Tasks | Subtasks | Total SP |
|-----------|-------|----------|----------|
| M1: Error Handling | 2 | 8 | 10 SP |
| M2: Tree Structure | 3 | 10 | 12 SP |
| M3: Documentation | 2 | 4 | 4 SP |
| **TOTAL** | **7** | **22** | **26 SP** |

Note: Original count said 29 subtasks, but actual JSON has 22. Let me recount...

Actually recounting from JSON:
- M1.T1: 4 subtasks (S1-S4)
- M1.T2: 4 subtasks (S1-S4)
- M2.T1: 4 subtasks (S1-S4)
- M2.T2: 4 subtasks (S1-S4)
- M2.T3: 2 subtasks (S1-S2)
- M3.T1: 2 subtasks (S1-S2)
- M3.T2: 2 subtasks (S1-S2)
Total: 22 subtasks, 26 story points

## Implementation Guidelines

### For PRP Agents (Product Requirement Prompt)

When implementing subtasks from this backlog:

1. **READ the `context_scope`** - It contains the contract definition
   - INPUT: What data/interfaces are available
   - LOGIC: What exactly to implement
   - OUTPUT: What interface/function to expose
   - MOCKING: What services to mock for isolation

2. **FOLLOW existing patterns** - Reference implementations in:
   - `plan_bugfix/architecture/system_context.md` section "Reference Implementations"
   - `src/decorators/step.ts` lines 109-134 (error handling)
   - `src/decorators/step.ts` lines 94-101 (event emission)

3. **WRITE tests first** - Every subtask ending in S4 (test subtask):
   - Creates failing test first
   - Implements code to pass test
   - Verifies no regressions
   - Test locations: `src/__tests__/unit/` or `src/__tests__/integration/`

4. **MAINTAIN type safety**:
   - No `as any` casts
   - Use proper type assertions
   - Follow existing type guard patterns

5. **EMIT events** - State changes must emit events:
   - Use `this.emitEvent({ type: '...', ... })`
   - Notify observers of changes
   - Follow existing event patterns

## Dependency Flow

```
P1.M1.T1.S1 ──┐
P1.M1.T1.S2 ◄─┤
P1.M1.T1.S3 ◄─┤
P1.M1.T1.S4 ◄─┘

P1.M1.T2.S1 ──┐
P1.M1.T2.S2 ◄─┤
P1.M1.T2.S3 ◄─┤
P1.M1.T2.S4 ◄─┘

P1.M2.T1.S1 ──┐
P1.M2.T1.S2 ◄─┤
P1.M2.T1.S3 ◄─┤
P1.M2.T1.S4 ◄─┘

P1.M2.T2.S1 ──┐
P1.M2.T2.S2 ◄─┤
P1.M2.T2.S3 ◄─┤
P1.M2.T2.S4 ◄─┘

P1.M2.T3.S1 ──┐
P1.M2.T3.S2 ◄─┘

P1.M3.T1.S1 ──┐
P1.M3.T1.S2 ◄─┘

P1.M3.T2.S1 ──┐
P1.M3.T2.S2 ◄─┘
```

## Quality Standards

### Definition of Done
Every subtask is complete when:
1. ✅ Code implements the `context_scope` LOGIC exactly
2. ✅ Tests pass (or test written for test subtasks)
3. ✅ TypeScript compiles with no errors
4. ✅ No existing tests broken
5. ✅ Follows architectural patterns from system_context.md

### Code Review Checklist
- [ ] Implements contract from `context_scope`
- [ ] Uses existing patterns (no new inventions)
- [ ] Type-safe (no `as any`)
- [ ] Tests added (for implementation subtasks)
- [ ] Events emitted (if state changes)
- [ ] Observer-safe (errors caught)
- [ ] Documentation updated (if needed)

## Risk Mitigation

### High-Risk Areas
1. **Cycle Detection Changes** (P1.M2.T1)
   - Risk: Breaking existing circular references (if any exist)
   - Mitigation: Comprehensive test coverage, graceful error messages

2. **Event Emission Changes** (P1.M2.T2)
   - Risk: Performance impact from extra events
   - Mitigation: Events are already emitted, just adding missing ones

3. **Error Handler Changes** (P1.M1.T1, P1.M1.T2)
   - Risk: Breaking existing error handling flows
   - Mitigation: Follow existing @Step pattern exactly

### Rollback Strategy
Each subtask is independently revertable:
- Git revert by commit
- No breaking changes to public APIs
- All changes are additive or bug fixes only

## Success Metrics

### Completion Criteria
Phase 1 is complete when:
- ✅ All 22 subtasks marked "Complete"
- ✅ All tests pass (existing + new)
- ✅ TypeScript compilation succeeds
- ✅ No regressions in existing functionality
- ✅ Documentation updated for behavioral changes

### Quality Metrics
- Test coverage maintained or improved
- Zero TypeScript errors
- All 154 existing tests still passing
- New tests added for all fixes
- Documentation updated for user-facing changes

## Next Steps

1. **PRP Agents** should process `bug_fix_tasks.json` sequentially
2. Start with **P1.M1** (Error Handling) - highest priority
3. Each subtask's `context_scope` provides complete implementation contract
4. Reference `plan_bugfix/architecture/system_context.md` for patterns
5. Report completion status back to project tracking

## Contact & Support

**Architecture Documentation**: `plan_bugfix/architecture/`
- `system_context.md` - Component overview and patterns
- `GAP_ANALYSIS_SUMMARY.md` - Issue prioritization and fix snippets
- `ANALYSIS_PRD_VS_IMPLEMENTATION.md` - Detailed PRD vs implementation gap analysis

**Task Backlog**: `./bug_fix_tasks.json`
- Complete JSON structure with all subtasks
- Each subtask has detailed `context_scope` contract
- Dependencies explicitly defined

**Original Bug Report**: `TEST_RESULTS.md`
- Full analysis of 10 issues
- Test results and coverage analysis
- Recommendations and priority assessments

---

**Planning Completed**: 2026-01-10
**Planned By**: Lead Technical Architect & Project Management Synthesizer
**Status**: Ready for Implementation
**Estimated Effort**: 26 Story Points (approximately 2-3 weeks for 1 developer)
