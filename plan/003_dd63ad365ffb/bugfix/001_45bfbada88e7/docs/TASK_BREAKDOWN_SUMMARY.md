# Task Breakdown Summary

## Project: Hierarchical Workflow Engine Bug Fixes

**PRD Analysis**: Comprehensive bug report identifying 12 issues across critical (3), major (5), and minor (4) severity levels
**Test Coverage**: 85-90% complete with 400+ tests across 73 test files
**Implementation Status**: Core functionality well-implemented but critical gaps prevent PRD compliance

---

## Research Completed

### 1. Architecture Analysis (Agent: ae58f62)
- **Workflow System**: Explored core classes, decorators, state management, observer pattern
- **Provider System**: Analyzed AnthropicProvider, OpenCodeProvider, registry lifecycle
- **Error Handling**: Documented WorkflowError types, merge strategy, propagation patterns
- **Agent System**: Examined Agent class, response validation, reflection system
- **Critical Finding**: **No traditional restart logic exists** - only reflection-based retry

### 2. Test Coverage Analysis (Agent: a12ed16)
- **Total Test Files**: 73 (unit, integration, adversarial)
- **Test Lines**: 23,583
- **Pass Rate**: ~95%
- **Critical Gaps**:
  - Restart logic: **ZERO** test coverage
  - Workflow-level validation: Only agent-level tests
  - Session persistence: Tests verify lack of persistence
  - OpenCode capabilities: Tests document limitations

### 3. Provider System Deep Dive (Agent: a3a5796)
- **OpenCode Provider**: LLM-only mode, no MCP/LSP despite PRD requirements
- **Type Mismatch**: Provider interface promises `ProviderResult<T>` but implementations return `AgentResponse<T>`
- **Session Management**: In-memory only, cleared on terminate()
- **Capability Detection**: Static flags, no runtime helpers

---

## Architecture Documentation Created

### Files in `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/`:

1. **system_context.md**
   - Architecture overview and patterns
   - Critical architectural gaps analysis
   - File structure reference
   - Implementation priorities

2. **external_deps.md**
   - Current dependency assessment
   - Missing dependencies for new features
   - Dependency health analysis
   - Recommendations for new development

3. **restart_logic_analysis.md**
   - PRD requirements vs current state
   - Detailed architecture for implementation
   - Phased approach (4-7 weeks total effort)
   - Interaction with existing systems
   - Risks and mitigations

---

## Task Breakdown Created

### File: `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/tasks.json`

**Structure**: 3 Phases → 8 Milestones → 23 Tasks → 80+ Subtasks

#### Phase 1: Critical Bug Fixes - Block Release
**Milestone 1.1**: Traditional Restart Logic Implementation (4 tasks)
- Add restart configuration to @Step decorator
- Implement error analysis utility
- Add workflow-level restart methods
- Implement parent-driven restart pattern

**Milestone 1.2**: Workflow-Level Agent Response Validation (2 tasks)
- Add validateAgentResponse method
- Integrate validation into workflow execution

**Milestone 1.3**: OpenCode Provider Decision (1 task)
- Decision analysis: Document vs Implement vs Remove

#### Phase 2: Major Issues - Next Release
**Milestone 2.1**: Provider Interface Type Consistency
- Align Provider interface with implementations

**Milestone 2.2**: Session Persistence Implementation (2 tasks)
- Design session storage abstraction
- Add configuration and lifecycle management

**Milestone 2.3**: Tree Update Event Consistency
- Audit and fix treeUpdated emission

**Milestone 2.4**: Workflow-Level Error Merge Strategy
- Extend error merge from @Task to workflow level

#### Phase 3: Minor Issues - Polish
**Milestone 3.1**: Documentation and DX Improvements (3 tasks)
- Add provider capability helpers
- Improve JSDoc clarity
- Add workflow name security validation

**Milestone 3.2**: AgentResponse Schema Strengthening
- Create discriminated union for type safety

**Milestone 3.3**: Event Replay System
- Implement event history and replay

---

## Subtask Specification Standards

Every subtask includes:

1. **CONTRACT DEFINITION** with strict requirements:
   - **RESEARCH NOTE**: References to architecture documents
   - **INPUT**: Specific data structures from dependencies
   - **LOGIC**: Step-by-step implementation instructions
   - **OUTPUT**: Precise deliverable specification

2. **Story Points**: Realistic estimates (0.5, 1, or 2 SP)

3. **Dependencies**: Explicit dependency chains

4. **Context Scope**: Instructions for developer working in isolation

---

## Key Implementation Insights

### Restart Logic (Critical)
- **Current**: Only reflection-based retry exists
- **Required**: Traditional restart with state restoration
- **Effort**: 4-7 weeks
- **Files**: `src/decorators/step.ts`, `src/core/workflow.ts`, `src/utils/restart-analysis.ts` (NEW)

### Provider Type Mismatch (Major)
- **Current**: Interface says `ProviderResult<T>`, code returns `AgentResponse<T>`
- **Fix**: Update interface to match reality, deprecate `ProviderResult`
- **Effort**: 2-3 hours

### Session Persistence (Major)
- **Current**: In-memory Map, cleared on terminate()
- **Required**: Persistent storage (file/Redis)
- **Effort**: 1-2 weeks
- **Files**: `src/providers/session-store.ts` (NEW), `src/providers/anthropic-provider.ts`

### OpenCode Provider (Critical Decision)
- **Current**: LLM-only mode, no MCP/LSP despite PRD requirements
- **Options**:
  - A) Document limitations (1-2 days)
  - B) Implement full support (4-6 weeks)
  - C) Remove provider (1 week)

---

## Testing Strategy

### New Test Files Required:
- `src/__tests__/unit/decorators/step-restart.test.ts`
- `src/__tests__/unit/restart-analysis.test.ts`
- `src/__tests__/unit/workflow-restart.test.ts`
- `src/__tests__/unit/workflow-validation.test.ts`
- `src/__tests__/integration/parent-restart-decisions.test.ts`
- `src/__tests__/integration/agent-validation.test.ts`
- `src/__tests__/unit/workflow-error-merge.test.ts`
- `src/__tests__/unit/event-replay.test.ts`

### Test Patterns to Follow:
- AAA (Arrange-Act-Assert) pattern
- Helper functions for test workflow creation
- Event observer setup for verification
- Mock external dependencies (SDK, file system)

---

## Risk Assessment

### High Risk Items:
1. **Restart Logic**: Complex state restoration, potential for infinite loops
2. **OpenCode Provider**: Architectural mismatch, SDK limitations
3. **Session Persistence**: Serialization complexity, data corruption risk

### Mitigation Strategies:
1. **Restart**: Opt-in by default, max retry limits, circuit breakers
2. **OpenCode**: Decision document before implementation
3. **Sessions**: Extensive testing, graceful degradation, backup strategies

---

## Recommendations

### Immediate Actions (Phase 1):
1. ✅ **COMPLETED**: Research and analysis
2. ✅ **COMPLETED**: Task breakdown
3. **NEXT**: Implement restart logic (P1.M1)
4. **PARALLEL**: Decide OpenCode provider future (P1.M3)

### Success Criteria:
- ✅ All critical issues (Phase 1) resolved
- ✅ Traditional restart logic implemented and tested
- ✅ Workflow-level validation in place
- ✅ Provider type consistency fixed
- ✅ OpenCode provider decision executed

### Timeline Estimates:
- **Phase 1**: 6-9 weeks (Critical - must complete)
- **Phase 2**: 4-6 weeks (Major - next release)
- **Phase 3**: 2-3 weeks (Minor - polish)

**Total**: 12-18 weeks for full PRD compliance

---

## Next Steps

1. **Review** this task breakdown with engineering/product leadership
2. **Prioritize** Phase 1 tasks for immediate implementation
3. **Assign** subtasks to developers based on expertise
4. **Track** progress using task IDs (P1.M1.T1.S1, etc.)
5. **Update** task statuses as work progresses

---

**Files Created**:
- ✅ `./plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/tasks.json` (COMPREHENSIVE TASK BREAKDOWN)
- ✅ `./plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/system_context.md`
- ✅ `./plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/external_deps.md`
- ✅ `./plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md`
- ✅ `./plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/TASK_BREAKDOWN_SUMMARY.md` (THIS FILE)

**Research Agents Deployed**:
- ✅ Agent ae58f62: Architecture mapping
- ✅ Agent a12ed16: Test coverage analysis
- ✅ Agent a3a5796: Provider system deep dive

**Status**: 🟢 COMPLETE - Ready for implementation planning
