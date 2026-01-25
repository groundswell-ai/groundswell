# Groundswell Multi-Provider System - Implementation Plan

**PRD Version:** 1.1
**Plan ID:** 003_dd63ad365ffb
**Status:** Research Complete, Ready for Implementation
**Created:** 2026-01-25

## Overview

This plan implements the **Multi-Provider Agent SDK System** defined in PRD Section 7. The goal is to enable Groundswell to support multiple AI provider SDKs (Anthropic, OpenCode, and 75+ additional providers via OpenCode) with a unified interface and cascading configuration.

### Current Status

**Research Phase:** ✅ Complete

**Implementation Ready:** ✅ Yes

**Critical Dependencies:** OpenCode SDK verification required (web research after Feb 1, 2026)

## What's Already Implemented

The following PRD sections are **FULLY IMPLEMENTED** in the codebase:

- ✅ **Section 1-6:** Overview, Architecture, Core Data Model, Logging/Events, Error Model, Agent Response
- ✅ **Section 8-16:** Snapshot System, Observers, Decorators, Restart Semantics, Tree Debugger, Base Classes, Examples

**What Needs Implementation:**

- ⚠️ **Section 7:** Multi-Provider Agent SDK System (this plan)

## Plan Structure

```
plan/003_dd63ad365ffb/
├── README.md                    # This file
├── tasks.json                   # Complete task breakdown (5 Phases, 15 Milestones, 50+ Subtasks)
└── architecture/
    ├── system_context.md        # Current codebase state and tech stack
    ├── external_dependencies.md # Anthropic SDK, OpenCode SDK (to be verified), MCP, Decorators
    ├── implementation_patterns.md # Architectural patterns and best practices
    └── decisions.md             # Architectural decisions and open questions
```

## Implementation Phases

### Phase 1: Multi-Provider Foundation (P1)
**Goal:** Establish provider abstraction layer and type system
**Timeline:** ~1 week

**Milestones:**
1. Provider Type System (interfaces, types)
2. Global Provider Configuration (cascade logic)
3. Provider Registry (singleton lifecycle)

**Key Deliverables:**
- `src/types/providers.ts` - All provider interfaces
- `src/core/providers/provider-config.ts` - Global configuration
- `src/core/providers/model-spec.ts` - Model specification utilities
- `src/core/providers/provider-registry.ts` - Provider registry

### Phase 2: Anthropic Provider Implementation (P2)
**Goal:** Refactor existing Anthropic SDK integration into Provider pattern
**Timeline:** ~1 week

**Milestones:**
1. Anthropic Provider Core (wrapper around existing SDK)
2. Session Abstraction (in-memory sessions to match OpenCode)

**Key Deliverables:**
- `src/core/providers/anthropic/anthropic-provider.ts` - Anthropic provider
- `src/core/providers/anthropic/hooks-adapter.ts` - SDK hooks adapter

### Phase 3: OpenCode Provider Implementation (P3)
**Goal:** Implement OpenCode provider with multi-provider support
**Timeline:** ~1-2 weeks (depends on SDK verification)

**Milestones:**
1. OpenCode SDK Verification (research package, document API)
2. OpenCode Provider Core (conditional on SDK availability)

**Key Deliverables:**
- OpenCode SDK documentation (if package exists)
- `src/core/providers/opencode/opencode-provider.ts` - OpenCode provider
- `src/core/providers/opencode/hooks-adapter.ts` - Hooks adapter

**Status:** ⚠️ **BLOCKED** until OpenCode SDK is verified or alternative chosen

### Phase 4: Agent Integration (P4)
**Goal:** Integrate provider system into existing Agent class
**Timeline:** ~1 week

**Milestones:**
1. AgentConfig Extension (add provider fields)
2. Provider Execution Integration (refactor Agent.prompt())
3. Prompt-Level Overrides (support provider/model switching)

**Key Deliverables:**
- Updated `AgentConfig` interface
- Refactored `Agent.prompt()` and `Agent.stream()`
- Configuration cascade fully functional

### Phase 5: Testing & Documentation (P5)
**Goal:** Comprehensive tests and documentation
**Timeline:** ~1 week

**Milestones:**
1. Unit Tests (provider types, registry, Anthropic provider)
2. Integration Tests (agent-provider integration)
3. Documentation (API reference, usage examples)

**Key Deliverables:**
- `/tests/providers/` - Complete test suite
- `/docs/providers.md` - Provider system documentation
- `/examples/providers/` - Usage examples

## Architecture Decisions

### ✅ Decided

1. **Session Management** (Decision 2)
   - **Choice:** Implement session abstraction layer
   - **Rationale:** Consistent API across providers, better UX

2. **Dependency Strategy** (Decision 3)
   - **Choice:** Required dependency (if OpenCode SDK is public)
   - **Rationale:** Simpler DX, type safety guaranteed

3. **Capability Detection** (Decision 4)
   - **Choice:** Static declaration in interface
   - **Rationale:** Simple, type-safe, no async overhead

4. **Error Normalization** (Decision 5)
   - **Choice:** Hybrid approach (normalized + native codes)
   - **Rationale:** Consistency + full context

5. **Model Specification** (Decision 6)
   - **Choice:** Follow PRD specification exactly
   - **Rationale:** `provider/model` format, parseModelSpec() implementation

6. **Provider Lifecycle** (Decision 7)
   - **Choice:** Singleton registry pattern
   - **Rationale:** Shared instances, centralized init

### ⚠️ Open Decisions

1. **OpenCode SDK Strategy** (Decision 1)
   - **Status:** Awaiting web research (Feb 1, 2026) or maintainer contact
   - **Options:** A) Public package exists, B) Private package, C) Use alternative (LangChain.js)
   - **Deadline:** Before Phase 3 begins

2. **Testing Strategy for OpenCode** (Decision 8)
   - **Status:**倾向于 Mock SDK → Conditional tests
   - **Action:** Implement mocks initially, transition to conditional tests when SDK available

## Key Files Reference

### New Files to Create

```
src/types/providers.ts                 # Provider type definitions
src/core/providers/
├── index.ts                           # Public exports
├── provider-config.ts                 # Global configuration
├── provider-registry.ts               # Provider registry
├── model-spec.ts                      # Model specification
├── anthropic/
│   ├── index.ts
│   ├── anthropic-provider.ts
│   └── hooks-adapter.ts
└── opencode/
    ├── index.ts
    ├── opencode-provider.ts
    └── hooks-adapter.ts

tests/providers/
├── model-spec.test.ts
├── provider-config.test.ts
├── provider-registry.test.ts
└── anthropic/
    └── anthropic-provider.test.ts

docs/providers.md                      # Provider system docs
examples/providers/                    # Usage examples
```

### Existing Files to Modify

```
src/types/agent.ts                     # Extend AgentConfig
src/core/agent.ts                      # Integrate provider system
package.json                           # Add opencode-agent-sdk (if public)
tsconfig.json                          # No changes needed (already configured)
```

## Getting Started

### For Implementers

1. **Read Architecture Docs:**
   - `architecture/system_context.md` - Understand what exists
   - `architecture/external_dependencies.md` - Learn SDK APIs
   - `architecture/implementation_patterns.md` - Follow patterns
   - `architecture/decisions.md` - Review decisions

2. **Start Implementation:**
   - Phase 1 is **ready to begin** immediately
   - Follow `tasks.json` for exact subtask breakdown
   - Each subtask has `context_scope` with input/output contracts

3. **Testing Strategy:**
   - Write tests alongside implementation (TDD implied)
   - All subtasks assume "write failing test → implement → pass test"
   - Use Vitest framework (already configured)

### For Reviewers

1. **Review Task Breakdown:** Open `tasks.json` to see complete hierarchy
2. **Check Dependencies:** Each subtask lists dependencies (must complete in order)
3. **Validate Context:** Each subtask has detailed `context_scope` explaining contracts

## Story Points Summary

| Phase | Total SP | Estimated Duration |
|-------|----------|-------------------|
| P1: Foundation | 18 SP | ~1 week |
| P2: Anthropic | 16 SP | ~1 week |
| P3: OpenCode | 10 SP | ~1-2 weeks (blocked) |
| P4: Integration | 10 SP | ~1 week |
| P5: Testing/Docs | 12 SP | ~1 week |
| **Total** | **66 SP** | **~5-6 weeks** |

**Note:** Story points are estimates assuming 1 SP = ~2-4 hours of focused work.

## Success Criteria

✅ **Phase 1 Complete:** Type system compiles, tests pass
✅ **Phase 2 Complete:** Anthropic provider wraps existing SDK, all tests pass
✅ **Phase 3 Complete:** OpenCode provider implements (or alternative chosen)
✅ **Phase 4 Complete:** Agent uses providers, configuration cascade works
✅ **Phase 5 Complete:** Full test coverage, documentation published

**Overall Success:** User can configure providers globally, override at agent/prompt level, and switch between Anthropic and OpenCode seamlessly.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenCode SDK doesn't exist publicly | HIGH | Use alternative (LangChain.js, Vercel AI SDK) |
| OpenCode SDK is private package | MEDIUM | Contact maintainers for access/docs |
| Session abstraction leakage | MEDIUM | Document as abstraction layer, test thoroughly |
| Configuration cascade complexity | LOW | Comprehensive tests, clear documentation |
| Provider incompatibilities | MEDIUM | Define clear Provider interface, validate early |

## Next Steps

1. ✅ **Research Complete** - Architecture documented
2. 🔄 **Resolve OpenCode SDK** - Web search or maintainer contact
3. ⏳ **Begin Phase 1** - Start with type system (ready to begin)
4. ⏳ **Update PRD** - If OpenCode SDK alternative needed

## Contact & Resources

- **PRD:** `/PRD.md` (Section 7: Multi-Provider Agent SDK System)
- **Existing Code:** `/src/core/agent.ts` (current Anthropic integration)
- **Tests:** `/tests/` (Vitest configuration)
- **Docs:** `/docs/` (existing documentation)

---

**Last Updated:** 2026-01-25
**Plan Status:** Ready for Implementation (Phase 1 unblocked)
