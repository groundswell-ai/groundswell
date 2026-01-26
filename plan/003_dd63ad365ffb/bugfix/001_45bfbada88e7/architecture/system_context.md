# Hierarchical Workflow Engine - System Context

## Architecture Overview

The Groundswell Hierarchical Workflow Engine is a sophisticated TypeScript-based system for building hierarchical, event-driven AI agent workflows with multi-provider LLM support.

## Core Architectural Patterns

### 1. Workflow System
- **Base Class**: `Workflow` class (`src/core/workflow.ts`)
- **Execution Models**: Class-based (subclass with `run()`) and Functional (executor pattern)
- **Hierarchy**: Parent-child relationships with tree mirroring
- **State Management**: ObservedState decorator for state snapshots
- **Decorators**:
  - `@Step()` - Wraps individual workflow steps
  - `@Task()` - Manages child workflow spawning
  - `@ObservedState()` - Marks fields for state snapshots

### 2. Provider System
- **Provider Interface**: Unified abstraction for LLM providers (`src/types/providers.ts`)
- **Implementations**:
  - `AnthropicProvider` - Full-featured with MCP, LSP, sessions
  - `OpenCodeProvider` - LLM-only mode (no MCP/LSP)
- **Registry**: Singleton pattern for provider lifecycle management
- **Capabilities**: Static capability flags (mcp, skills, lsp, streaming, sessions, extendedThinking)

### 3. Error Handling
- **WorkflowError**: Rich error context with state and logs
- **Error Merge Strategy**: Aggregates concurrent task failures
- **Propagation**: Hierarchical bubbling through workflow tree
- **Reflection System**: AI-powered error analysis and retry (NOT traditional restart)

### 4. Agent System
- **Agent Class**: Multi-provider LLM prompt execution
- **Response Validation**: Zod schema validation for AgentResponse
- **Tool Execution**: MCP delegation
- **Configuration Cascade**: Global → Agent → Prompt levels

## Critical Architectural Gaps

### Gap 1: Restart Logic (CRITICAL)
**PRD Requirement**: Section 11 - "Restart Semantics"
- Parent workflows analyze child errors and decide restart
- Retry logic with configurable limits
- State restoration from snapshots

**Current State**: NO traditional restart mechanisms exist
- Only reflection-based retry (different from restart)
- No step-level restart capability
- No checkpoint/resume functionality
- No persistent state across restarts

### Gap 2: Workflow-Level Validation (CRITICAL)
**PRD Requirement**: Section 6.6 - "Validation"
- Workflows validate AgentResponse schema before processing
- Invalid responses emit `invalidResponse` event
- `INVALID_RESPONSE_FORMAT` error code

**Current State**: Only agent-level validation exists
- `Agent.validateResponse()` method exists
- No workflow-level validation when agents used in workflows
- No automatic workflow-level error handling

### Gap 3: Provider Type Mismatch (MAJOR)
**PRD Requirement**: Section 7.3 - "Provider Interface"
- Provider interface returns `ProviderResult<T>`

**Current State**: Actual implementations return `AgentResponse<T>`
- Type system inconsistency
- `ProviderResult` is unused
- Breaks polymorphic usage

### Gap 4: Session Persistence (MAJOR)
**PRD Requirement**: Section 7.4 - "Capabilities"
- Sessions persist across provider lifecycle

**Current State**: Sessions are in-memory only
- `sessions.clear()` called on terminate()
- No persistence mechanism
- Sessions lost on provider restart

## Test Suite Status

### Coverage Summary
- **Total Test Files**: 73
- **Total Test Lines**: 23,583
- **Test Pass Rate**: ~95%
- **PRD Coverage**: 85-90%

### Critical Test Gaps
1. **Restart Logic**: ZERO test coverage
2. **Workflow-Level Validation**: Only agent-level tests
3. **Session Persistence**: Tests verify lack of persistence
4. **OpenCode Capabilities**: Tests document limitations

## Key Design Decisions

### 1. Event-Driven Architecture
- All workflow interactions emit events
- Observers attach to root workflows only
- Multiple event types (lifecycle, agent, tool, reflection, cache)

### 2. Reflection-Based Recovery
- AI-powered error analysis
- Distinguishes transient vs fundamental errors
- Generates revised prompts for retry
- NOT a replacement for traditional restart logic

### 3. Provider Abstraction
- Unified interface for multiple LLM providers
- Static capability declaration
- No runtime capability discovery
- No feature negotiation

### 4. Hierarchical Composition
- Workflows can contain other workflows
- Parent-child relationships with tree mirroring
- Cycle detection prevention
- 1:1 tree mirror guarantee

## File Structure Reference

```
src/
├── core/
│   ├── workflow.ts          # Workflow base class
│   ├── agent.ts             # Agent class
│   ├── context.ts           # Workflow execution context
│   └── mcp-handler.ts       # MCP tool delegation
├── providers/
│   ├── provider-registry.ts # Provider lifecycle management
│   ├── anthropic-provider.ts # Anthropic implementation
│   └── opencode-provider.ts  # OpenCode implementation (LLM-only)
├── decorators/
│   ├── step.ts              # @Step decorator
│   ├── task.ts              # @Task decorator
│   └── observed-state.ts    # @ObservedState decorator
├── types/
│   ├── workflow.ts          # Workflow interfaces
│   ├── agent.ts             # Agent types
│   ├── providers.ts         # Provider interfaces
│   └── error.ts             # Error types
└── utils/
    ├── workflow-error-utils.ts # Error merging
    └── reflection.ts        # Reflection system
```

## Implementation Priorities

### Phase 1: Critical (Block Release)
1. Implement traditional restart logic (separate from reflection)
2. Add workflow-level AgentResponse validation
3. Decide on OpenCode provider future (implement, document, or remove)

### Phase 2: Major (Next Release)
4. Fix Provider interface type mismatch
5. Implement session persistence
6. Extend error merge strategy to workflow level
7. Ensure treeUpdated event consistency

### Phase 3: Minor (Polish)
8. Add provider capability query helpers
9. Improve JSDoc clarity
10. Add workflow name security validation
11. Implement workflow event replay
