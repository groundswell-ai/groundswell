# System Context & Current State

## Project Overview

**Project:** Groundswell - Hierarchical Workflow Orchestraton Engine
**Version:** 0.0.4 (mature, actively developed)
**Repository:** /home/dustin/projects/groundswell
**TypeScript:** 5.2+ with strict mode
**Node.js:** 20+ (current: v25.2.1)

## Current Implementation Status

### ✅ Already Implemented

The following features from the PRD are **ALREADY FULLY IMPLEMENTED**:

#### 1. Core Workflow System (`/src/core/workflow.ts`)
- Hierarchical workflows with parent-child relationships
- Event system with perfect tree mirroring
- State observation and snapshotting
- Base `Workflow` class with decorator support
- Observer pattern for real-time updates

#### 2. Decorators (`/src/decorators/`)
- **@Step()** - Method decorator for workflow steps with timing, logging, and state snapshots
- **@Task()** - Method decorator for spawning child workflows
- **@ObservedState()** - Property decorator for state field tracking

#### 3. Logger System (`/src/core/logger.ts`)
- `WorkflowLogger` class with debug, info, warn, error levels
- Parent-child logger relationships
- Event emission to observers

#### 4. Agent System (`/src/core/agent.ts`)
- Lightweight wrapper around Anthropic Agent SDK
- Tool invocation and caching with LRU strategy
- Hook system for custom behavior (preToolUse, postToolUse, etc.)
- **AgentResponse** implementation with strict JSON validation (PRD Section 6)
- Type-safe prompts with Zod validation

#### 5. MCP Integration (`/src/core/mcp-handler.ts`)
- `MCPHandler` class for MCP server management
- Tool registration and execution (inprocess and stdio transports)
- Tool executor registration pattern
- Conversion to Agent SDK MCP server format

#### 6. Event System
- Complete `WorkflowEvent` union type implementation
- Observer interface with onLog, onEvent, onStateUpdated, onTreeChanged
- Perfect tree mirroring (logs/events match execution tree)

#### 7. Error Model
- `WorkflowError` interface with state snapshots and logs
- Error introspection with full child state visibility
- Error context preservation

#### 8. Tree Debugger (`/src/core/tree-debugger.ts`)
- `WorkflowTreeDebugger` class
- Real-time tree visualization
- Event subscription via Observable pattern
- Terminal output formatting

### 🔄 Partial Implementation

#### Provider System (Multi-Provider Support)

**Status:** Partially implemented - Anthropic SDK only

**Current State:**
- Fully implemented Anthropic SDK integration
- `@anthropic-ai/claude-agent-sdk` v0.1.77 installed
- Complete MCP integration via Agent SDK
- Tool execution, hooks, and streaming working

**Missing (Per PRD Section 7):**
- OpenCode SDK integration
- Provider abstraction layer (`Provider` interface)
- Global provider configuration cascade
- Provider-qualified model specification (`provider/model` format)
- Model spec parsing and normalization
- Session management abstraction
- Capability detection system
- Provider registry

### ❌ Not Implemented

#### Provider Abstraction (NEW - PRD Section 7)

The PRD introduces a comprehensive multi-provider system that needs to be built from scratch:

**Components Needed:**
1. **Provider Interface** (`src/core/providers/provider.ts`)
   - `Provider` interface with capabilities
   - `ProviderCapabilities` type
   - `ProviderOptions` type
   - `ProviderRequest`, `ProviderResult` types
   - `ToolExecutionRequest`, `ToolExecutionResult` types

2. **Global Configuration** (`src/core/providers/provider-config.ts`)
   - `configureProviders()` function
   - `GlobalProviderConfig` interface
   - Configuration cascade logic (global → agent → prompt)

3. **Provider Registry** (`src/core/providers/provider-registry.ts`)
   - Singleton registry for provider instances
   - Provider lifecycle management
   - Capability detection

4. **Anthropic Provider Implementation** (`src/core/providers/anthropic/`)
   - Adapter wrapping existing Agent SDK integration
   - Hook mapping from `AgentHooks` to `ProviderHookEvents`
   - MCP integration via existing MCPHandler
   - Session abstraction (in-memory for Anthropic)

5. **OpenCode Provider Implementation** (`src/core/providers/opencode/`)
   - Full provider implementation
   - Multi-provider support (75+ providers)
   - Native sessions
   - Extended thinking support
   - LSP tool integration

6. **Model Specification** (`src/core/providers/model-spec.ts`)
   - `parseModelSpec()` function
   - `formatModelForProvider()` function
   - Provider-qualified model string parsing

7. **Agent Integration Updates**
   - Extend `AgentConfig` with provider options
   - Modify agent initialization to use providers
   - Support for prompt-level provider overrides

8. **Type Definitions** (`src/types/providers.ts`)
   - All provider-related interfaces
   - Provider IDs union type
   - Capability types

## Tech Stack Details

### Build System
- **TypeScript:** 5.2+ with strict mode
- **Target:** ES2022
- **Module:** ES2022 with bundler resolution
- **Output:** `/dist` directory with declarations and source maps

### Testing
- **Framework:** Vitest (not Jest)
- **Location:** `/tests` directory
- **Coverage:** Comprehensive (19+ test files)

### Terminal UI
- **Framework:** Ink (React for CLI)
- **React Version:** 19.0.0
- **Usage:** Tree debugger visualization

### Dependencies

**Production:**
- `@anthropic-ai/claude-agent-sdk` v0.1.77
- `@types/react` v19.0.6
- `ink` v4.4.1
- `react` v19.0.0
- `zod` v3.25.76
- `zod-to-json-schema` v3.25.1
- `lru-cache` v11.0.2
- `eventemitter3` v5.0.1 (likely for Observable pattern)

**Development:**
- `typescript` v5.7.3
- `vitest` v3.0.5
- `tsx` v4.19.2
- `@vitest/ui` v3.0.5

## Architectural Patterns

### Decorator Implementation
- **Standard:** Stage 3 decorators (NOT experimental)
- **Pattern:** WeakMap-based metadata storage per prototype
- **Context:** `ClassMethodDecoratorContext` and `ClassFieldDecoratorContext`
- **Best Practice:** Regular functions for method wrappers (not arrow functions)

### MCP Integration
- **Transport:** stdio and inprocess
- **Tool Naming:** `serverName__toolName` format
- **Execution:** Local via `MCPHandler.executeTool()`
- **SDK Conversion:** `MCPHandler.toAgentSDKServer()` for Agent SDK integration

### Event Flow
```
Workflow (root)
  ├─ emits events to WorkflowObserver[]
  ├─ maintains WorkflowNode tree
  └─ WorkflowLogger writes to node.logs

WorkflowTreeDebugger
  └─ subscribes to root workflow events
      └─ receives real-time updates
```

### Configuration Cascade (Planned)
```
GlobalProviderConfig.configureProviders()
    ↓
AgentConfig.provider / AgentConfig.providerOptions
    ↓
PromptOverrides.provider / PromptOverrides.providerOptions
    ↓
Prompt-level overrides (call-specific)
```

## Key Files Reference

| File Path | Purpose |
|-----------|---------|
| `/src/core/workflow.ts` | Base Workflow class, event system |
| `/src/core/agent.ts` | Agent class with Anthropic SDK integration |
| `/src/core/mcp-handler.ts` | MCP server management |
| `/src/core/logger.ts` | WorkflowLogger implementation |
| `/src/core/tree-debugger.ts` | Tree visualization and debugging |
| `/src/decorators/step.ts` | @Step decorator |
| `/src/decorators/task.ts` | @Task decorator |
| `/src/decorators/observed-state.ts` | @ObservedState decorator |
| `/src/types/workflow.ts` | WorkflowNode, WorkflowEvent, LogEntry types |
| `/src/types/agent.ts` | AgentConfig, AgentResponse types |
| `/src/types/decorators.ts` | Decorator option types |

## Open Questions (From Research)

### OpenCode SDK
1. **What is the exact npm package name?**
   - Candidates: `@opencode-ai/sdk`, `opencode-agent-sdk`, `@opencodehq/agent-sdk`
   - **Action Required:** Web search after rate limit reset

2. **Is OpenCode SDK a real public package?**
   - May be custom/private
   - **Action Required:** Verify with project maintainers

3. **Dependency Strategy:**
   - Required dependency (always installed)?
   - Optional dependency (user installs)?
   - Peer dependency (user provides version)?
   - **Action Required:** Decision needed

### Session Management
1. **Should we implement session abstraction for Anthropic?**
   - Option 1: In-memory session wrapper
   - Option 2: Document as OpenCode-only feature
   - **Action Required:** Decision needed

### Capability Detection
1. **How to detect provider capabilities at runtime?**
   - Static declaration per provider?
   - Dynamic feature testing?
   - **Action Required:** Implementation decision

### Error Code Mapping
1. **Should providers normalize error codes?**
   - Keep native provider codes?
   - Map to Groundswell-standard codes?
   - **Action Required:** Implementation decision

## Conclusion

The Groundswell project is a **mature, production-ready workflow orchestration engine** with comprehensive features already implemented. The primary task for this PRD is implementing the **multi-provider system** (PRD Section 7), which involves:

1. Creating a provider abstraction layer
2. Implementing OpenCode provider support
3. Refactoring existing Anthropic integration into the provider pattern
4. Adding global configuration cascade
5. Implementing model specification parsing

All other PRD sections (1-6, 8-16) are already fully implemented in the codebase.
