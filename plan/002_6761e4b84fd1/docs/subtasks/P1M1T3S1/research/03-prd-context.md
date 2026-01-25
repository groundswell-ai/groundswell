# PRD Context for Subtask P1.M1.T3.S1

## Overall Project: Groundswell

**Groundswell** is a hierarchical workflow orchestration engine with full observability and tree debugging capabilities.

## Phase 1: Agent Response Standardization

**Goal**: Implement PRD requirement "All agent responses MUST be valid JSON" conforming to the AgentResponse interface.

**Why This Is Critical**: This is the ONLY critical gap identified in the PRD analysis. The current implementation returns raw data from `Agent.prompt()`, but the PRD mandates structured JSON responses.

## Milestone 1.1: Core AgentResponse Implementation

**Description**: Implement AgentResponse wrapping in Agent class and update type system.

### Task T1: Update Agent.prompt() to return AgentResponse<T> ✅ COMPLETE
- **S1**: Read and analyze current Agent.prompt() implementation
- **S2**: Create AgentResponse factory helper functions
- **S3**: Refactor Agent.prompt() to wrap responses in AgentResponse
- **S4**: Add INVALID_RESPONSE_FORMAT error handling

**Status**: All subtasks complete. Agent.prompt() now returns `Promise<AgentResponse<T>>`.

### Task T2: Update all Agent.prompt() call sites to handle AgentResponse ✅ COMPLETE
- **S1**: Find all Agent.prompt() call sites in codebase
- **S2**: Update example files (01-11) to handle AgentResponse
- **S3**: Update source code prompt() call sites
- **S4**: Update test files to assert on AgentResponse

**Status**: All subtasks complete. All call sites updated with proper status checking.

### Task T3: Update AgentResponse type definitions and exports ⏳ IN PROGRESS

**Description**: Ensure AgentResponse types are properly exported and documented for public API.

#### Subtask S1: Verify AgentResponse types are exported from index.ts (Current Task)

**CONTRACT DEFINITION** (from work item):
1. **RESEARCH NOTE**: Public API exports are in `src/index.ts` per SYSTEM_CONTEXT.md.
2. **INPUT**: `src/types/agent.ts` (AgentResponse definitions), `src/index.ts` (exports).
3. **LOGIC**: Read `src/index.ts` to verify `AgentResponse`, `AgentResponseStatus`, `AgentErrorDetails`, `AgentResponseMetadata` are all exported. If missing, add exports.
4. **OUTPUT**: All AgentResponse types exported from main index.ts for public consumption.

**Current Status**: Researching (1 point)

#### Subtask S2: Add JSDoc comments to AgentResponse types

**Status**: Planned (1 point)

## Dependencies

### Upstream Dependencies (Already Complete)
- **P1.M1.T1**: Agent.prompt() now returns `AgentResponse<T>`
- **P1.M1.T2**: All call sites updated to handle AgentResponse

### Downstream Dependencies (Waiting on This Task)
- **P1.M1.T3.S2**: JSDoc comments (next subtask)
- **P1.M2.T1**: Zod schema validation (next milestone)
- **P1.M3.T1**: Documentation and migration guide

## Key Files and Their Status

| File | Path | Status |
|------|------|--------|
| PRD Snapshot | `/prd_snapshot.md` | Contains AgentResponse requirements |
| Delta PRD | `/delta_prd.md` | Details AgentResponse model changes |
| Tasks JSON | `/tasks.json` | Task breakdown and status |
| System Context | `/architecture/SYSTEM_CONTEXT.md` | System architecture |
| Agent Types | `/src/types/agent.ts` | ✅ AgentResponse definitions |
| Types Index | `/src/types/index.ts` | ✅ Exports AgentResponse types |
| Main Index | `/src/index.ts` | ✅ Re-exports via types barrel |
| Agent Core | `/src/core/agent.ts` | ✅ Returns AgentResponse<T> |

## Success Criteria

This subtask is complete when:
1. ✅ All AgentResponse types are identified and verified
2. ✅ Export chain is validated (agent.ts → types/index.ts → index.ts)
3. ✅ Documentation of current export state
4. ✅ Any missing exports are added (if needed)

## Next Steps (After S1)

**P1.M1.T3.S2**: Add JSDoc comments to AgentResponse types
- Document each type's purpose and usage
- Add examples for public API consumers
- Ensure compatibility with TypeScript IDE features
