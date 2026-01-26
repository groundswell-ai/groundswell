# Provider System Codebase Analysis

## Overview Document Location: `/home/dustin/projects/groundswell/docs/`

## Existing Documentation Pattern

### File: `docs/agent.md`
**Structure Analysis:**
- Title with brief description
- Table of Contents (auto-linked)
- Basic Usage section with executable TypeScript example
- Configuration section with interface definitions
- Configuration Priority explanation (numbered list)
- Executing Prompts section (prompt(), promptWithMetadata())
- Feature-specific sections (Reflection, Tools/MCP, Hooks, Caching)
- API Reference section with class/interface signatures
- **Cross-reference to examples** at the end

**Key Pattern Observations:**
1. Starts with **practical example** before theory
2. Uses **TypeScript code blocks** throughout
3. Includes **type definitions** inline
4. Explains **priority/cascade** with numbered lists
5. Has dedicated **API Reference** section at end
6. References example files: `See examples/08-sdk-features.ts`

## Provider System Source Files

### Core Types: `src/types/providers.ts`
**Key Interfaces:**
- `ProviderId = 'anthropic' | 'opencode'`
- `ProviderCapabilities` - 6 boolean flags
- `ProviderOptions` - endpoint, apiKey, sessionId, timeout, headers
- `ProviderRequest` - wraps prompt + options
- `ModelSpec` - parsed model with provider/model/raw
- `ToolExecutor` callback type
- `ProviderResult<T>` - discriminated union with status/data/error/metadata
- `GlobalProviderConfig` - defaultProvider + providerDefaults
- `Provider` interface - initialize, terminate, execute, registerMCPs, loadSkills, normalizeModel

### Provider Implementations:

#### `src/providers/anthropic-provider.ts` (1057 lines)
**Capabilities:** mcp, skills, lsp, streaming, sessions (via abstraction), extendedThinking
**SDK:** @anthropic-ai/claude-agent-sdk (lazy loaded)
**Key Features:**
- Session abstraction via in-memory Map
- MCPHandler integration
- Skills via system prompt injection
- Streaming support via executeStreaming()
- Hooks adapter: buildAgentSDKHooks()

**Internal State:**
- `sdk: typeof import("@anthropic-ai/claude-agent-sdk") | null`
- `mcpHandler: MCPHandler`
- `mcpServerConfig: McpServerConfig | null`
- `skillsPrompt: string`
- `sessions: Map<string, SessionState>`

#### `src/providers/opencode-provider.ts` (976 lines)
**Capabilities:** skills, streaming, sessions, extendedThinking (mcp=false, lsp=false - LLM-only mode)
**SDK:** @opencode-ai/sdk (lazy loaded)
**Key Features:**
- Full-stack mode (embedded server)
- Multi-provider support (75+ providers)
- LLM-only mode (NO client-side tool execution)
- SSE streaming support
- Skills via system prompt injection

**Internal State:**
- `sdk: typeof import("@opencode-ai/sdk") | null`
- `server: { url: string; close(): void } | null`
- `client: OpencodeClient | null`
- `skillsPrompt: string`

### Registry: `src/providers/provider-registry.ts` (601 lines)
**Pattern:** Singleton with getInstance()
**Key Methods:**
- `register(provider)` - store by provider.id
- `get(id)` - returns Provider | undefined
- `has(id)` - boolean check
- `initializeProvider(id, options?)` - with promise caching
- `initializeAll(config)` - parallel init with Promise.allSettled
- `getStatus(id)` - InitializationStatus enum
- `isReady(id)` - convenience check
- `terminateAll()` - cleanup all providers

**State Tracking:**
- `providers: Map<ProviderId, Provider>`
- `states: Map<ProviderId, ProviderInitState>`

### Configuration: `src/utils/provider-config.ts` (364 lines)
**Module-private variable pattern** - globalConfig not exported
**Functions:**
- `configureProviders(config)` - validates and stores
- `getGlobalProviderConfig()` - never returns null (has defaults)
- `resolveProviderConfig(global, agent..., prompt...)` - cascade logic

**Cascade Priority (highest to lowest):**
1. Prompt-level provider/options
2. Agent-level provider/options
3. Global provider defaults

### Agent Integration: `src/core/agent.ts`
**Provider Resolution:**
```typescript
// Lines 108-124
const globalConfig = getGlobalProviderConfig();
const resolved = resolveProviderConfig(
  globalConfig,
  this.providerId,
  this.providerOptions
);
const effectiveProvider = resolved.provider;
const providerInstance = registry.get(effectiveProvider);
```

**Tool Delegation:**
- `toolExecutor(req)` method (lines 171-199)
- Checks delegated MCPHandlers first, then main handler
- Converts to ToolExecutionResult format

## Architecture Diagram Components

**Layers (bottom to top):**
1. **Provider Interface** (`src/types/providers.ts`)
2. **Provider Implementations** (`src/providers/*.ts`)
3. **Provider Registry** (`src/providers/provider-registry.ts`)
4. **Configuration** (`src/utils/provider-config.ts`)
5. **Agent Integration** (`src/core/agent.ts`)

**Data Flow:**
```
Global Config → Agent Config → Prompt Config
      ↓              ↓              ↓
ProviderRegistry → Provider Instance → Provider.execute()
      ↓
MCPHandler (tool delegation)
```

## Key Implementation Patterns

1. **Lazy SDK Loading**: Dynamic import() in initialize()
2. **Promise Caching**: States Map prevents duplicate initialization
3. **Idempotent Operations**: initialize(), terminate() check state first
4. **Error Containment**: terminateAll() never throws
5. **Tool Naming**: serverName__toolName format (double underscore)
6. **Session Abstraction**: Anthropic SDK sessions via in-memory Map
7. **Cascade Resolution**: Nullish coalescing (??) for priority

## Testing Patterns

From test files examined:
- Unit tests in `src/__tests__/unit/providers/`
- Integration tests in `src/__tests__/integration/`
- Test utilities: `_resetForTesting()`, `_resetInitStateForTesting()`
- Mock patterns for SDK dependencies

## Documentation Best Practices Observed

1. **JSDoc with @example blocks** - Executable TypeScript examples
2. **@remarks tags** - Implementation notes and PRD references
3. **@internal tags** - Private API documentation
4. **@see tags** - Cross-references
5. **Code section comments** - `// === Section Name ===`
6. **PATTERN/GOTCHA/CRITICAL comments** - Inline guidance
