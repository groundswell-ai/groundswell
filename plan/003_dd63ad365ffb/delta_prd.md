# **Delta PRD: Agent SDK Provider System**

**Session:** 003_dd63ad365ffb
**Base PRD Version:** 1.0 → 1.1
**Change Type:** Major Feature Addition
**Size:** Medium-to-Large (266 new lines)

---

## **1. Summary**

The PRD has been updated from version 1.0 to 1.1 with one significant addition: **Section 7 - Agent SDK Provider System**. This is a new major feature that adds multi-provider support to Groundswell, enabling users to choose between Anthropic's official Agent SDK and the OpenCode Agent SDK (which supports 75+ providers including OpenAI, Ollama, Google, etc.).

**Previous Session (002) completed:**
- Agent Response standardization (Section 6 in original PRD)
- All interfaces, decorators, and base class skeletons remain unchanged

**New in this session:**
- Complete multi-provider abstraction layer
- Cascading configuration system
- Model specification parsing with provider qualification
- Feature parity requirements across providers

---

## **2. What Changed**

### **2.1 New Section 7: Agent SDK Provider System**

A completely new section (266 lines) defining:

| Component | Description |
|-----------|-------------|
| `ProviderId` type | Union of `'anthropic'` | `'opencode'` |
| `Provider` interface | Abstraction layer for all providers |
| `ProviderCapabilities` | Feature matrix (MCP, skills, LSP, streaming, sessions, extended thinking) |
| `ProviderOptions` | Per-provider configuration (endpoint, API key, timeout, headers) |
| `GlobalProviderConfig` | Top-level configuration with `configureProviders()` |
| `ModelSpec` | Parsed model specification with provider qualification |
| Tool execution delegation | Tools executed locally via MCPHandler regardless of provider |
| Hook adaptation | Groundswell hooks mapped to provider-specific events |
| LSP integration | Language Server Protocol support for both providers |

### **2.2 Version Bump**

- **Version 1.0** → **Version 1.1**
- Acceptance criteria updated to include "multi-provider Agent SDK support with cascading configuration"

### **2.3 Section Renumbering**

All sections after #7 shifted down by one number (7→8, 8→9, etc.). No content changes in these sections.

---

## **3. Technical Requirements**

### **3.1 Provider Interface (NEW)**

```ts
export type ProviderId = 'anthropic' | 'opencode';

export interface ProviderCapabilities {
  mcp: boolean;              // MCP server connections
  skills: boolean;           // Skill loading
  lsp: boolean;              // Language Server Protocol integration
  streaming: boolean;        // Streaming responses
  sessions: boolean;         // Session-based state
  extendedThinking: boolean; // Extended thinking/reasoning
}

export interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T>(
    request: ProviderRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```

### **3.2 Configuration Cascade (NEW)**

```
GlobalProviderConfig (default level)
    ↓
AgentConfig.provider / AgentConfig.providerOptions
    ↓
PromptOverrides.provider / PromptOverrides.providerOptions
    ↓
Prompt-level overrides
```

First defined value wins (null-coalescing resolution).

### **3.3 Model Specification (NEW)**

Two formats supported:

| Format | Example | Behavior |
|--------|---------|----------|
| Plain | `claude-sonnet-4-20250514` | Uses default/global provider |
| Qualified | `anthropic/claude-opus-4-20250514` | Explicit provider selection |

```ts
export interface ModelSpec {
  provider: ProviderId;
  model: string;
  raw: string;
}
```

### **3.4 Feature Parity Matrix (NEW)**

| Capability | Anthropic SDK | OpenCode SDK |
|------------|--------------|--------------|
| MCP | ✓ (via MCPHandler) | ✓ (native) |
| Skills | ✓ (system prompt) | ✓ (native `/skills`) |
| LSP | ✓ (MCP plugins) | ✓ (explicit `lsp` tool) |
| Streaming | ✓ (message) | ✓ (SSE) |
| Sessions | ✗ (stateless) | ✓ |
| Extended Thinking | ✗ | ✓ |

---

## **4. Implementation Requirements**

### **4.1 Core Provider Abstraction**

Create provider system at `src/core/providers/`:

```
src/core/providers/
├── index.ts                    # Public exports
├── provider.ts                 # Provider interface + types
├── provider-config.ts          # Global configuration + cascade
├── provider-registry.ts        # Provider instance registry
├── anthropic/
│   ├── index.ts
│   ├── anthropic-provider.ts   # Anthropic SDK implementation
│   └── hooks-adapter.ts        # Hook mapping
└── opencode/
    ├── index.ts
    ├── opencode-provider.ts    # OpenCode SDK implementation
    └── hooks-adapter.ts        # Hook mapping
```

### **4.2 AgentConfig Extensions**

Extend existing `AgentConfig` interface:

```ts
export interface AgentConfig {
  // ... existing fields ...

  /** Provider to use (inherits from global if not specified) */
  provider?: ProviderId;

  /** Provider-specific options */
  providerOptions?: ProviderOptions;

  /** Model specification (supports "provider/model" format) */
  model?: string;
}
```

### **4.3 Tool Execution Delegation**

All providers delegate tool execution to local MCPHandler:

```ts
export interface ToolExecutionRequest {
  name: string;     // Tool name (may be namespaced: "server__tool")
  input: unknown;
}

export interface ToolExecutionResult {
  content: string | unknown;
  isError: boolean;
}
```

### **4.4 Hook Adaptation**

Map existing `AgentHooks` to provider-specific events:

```ts
export interface ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;
}
```

---

## **5. Design Decisions Required**

### **5.1 OpenCode SDK Integration**

**Question:** How does the OpenCode Agent SDK integrate?

**Action:** Research OpenCode SDK API, installation, and configuration patterns.

### **5.2 Session State Management**

**Question:** OpenCode supports sessions; Anthropic SDK does not. How should we handle this capability difference?

**Options:**
1. Expose sessions only when using OpenCode provider
2. Implement session abstraction layer for Anthropic (in-memory)
3. Document sessions as OpenCode-only feature

### **5.3 Provider Installation**

**Question:** Should OpenCode SDK be:
- **Required dependency** (always installed)
- **Optional dependency** (user installs if needed)
- **Peer dependency** (user provides version)

### **5.4 MCPHandler Integration**

**Current state:** MCPHandler exists at `src/core/mcp-handler.ts` (per previous session research).

**Decision needed:** Does MCPHandler need modifications to support provider registration, or can providers call it directly?

---

## **6. Migration Notes**

### **6.1 Breaking Changes**

None expected for existing users. Default provider should remain Anthropic.

### **6.2 Default Behavior**

If no provider is specified:
- **Current behavior:** Use Anthropic SDK directly
- **New behavior:** Use Anthropic provider (via abstraction layer)

This should be transparent to existing code.

### **6.3 Examples to Update**

All example files should demonstrate:
1. Default usage (no provider specified - uses Anthropic)
2. Explicit Anthropic provider
3. OpenCode provider with multi-provider models

---

## **7. Success Criteria**

1. **Both providers work:** Anthropic and OpenCode can execute prompts
2. **Feature parity:** MCP tools, skills, hooks work on both
3. **Configuration cascade:** Global → Agent → Prompt overrides work
4. **Model parsing:** `provider/model` and plain model formats work
5. **Backward compatibility:** Existing code continues to work without changes
6. **LSP integration:** Both providers support code intelligence features
7. **AgentResponse compliance:** Provider abstraction doesn't break JSON response contract

---

## **8. Open Questions**

1. **OpenCode SDK source:** Is `opencode-agent-sdk` on npm? What's the exact package name?
2. **Session handling strategy:** See 5.2 above
3. **Dependency strategy:** See 5.3 above
4. **Capability detection:** How do we detect provider capabilities at runtime?
5. **Error code mapping:** Should providers normalize error codes, or keep native codes?

---

## **9. Priority Matrix**

| Feature | Priority | Dependencies |
|---------|----------|--------------|
| Provider interface & types | P0 | None |
| Anthropic provider implementation | P0 | Interface |
| OpenCode provider implementation | P0 | Interface + SDK research |
| Configuration cascade | P0 | None |
| Model spec parsing | P0 | None |
| AgentConfig extensions | P0 | None |
| Tool execution delegation | P1 | MCPHandler |
| Hook adaptation | P1 | Existing hooks |
| LSP integration | P2 | Both providers |
| Session abstraction | P3 | Decision on 5.2 |

---

## **10. References**

### **Previous Session Research (Relevant)**

- `plan/002_6761e4b84fd1/architecture/EXTERNAL_DEPENDENCIES.md` - Anthropic SDK usage patterns
- `plan/002_6761e4b84fd1/architecture/SYSTEM_CONTEXT.md` - Current Agent implementation
- `plan/002_6761e4b84fd1/docs/migration-guide-agent-response.md` - AgentResponse patterns

### **New Research Needed**

1. OpenCode Agent SDK documentation
2. OpenCode installation and configuration
3. OpenCode MCP integration patterns
4. OpenCode skills system
5. Session state management patterns

---

## **11. Implementation Estimate**

**Scope:** Medium-to-large feature

**Estimated Phases:** 1-2 phases
**Estimated Milestones:** 2-3 milestones

**Rationale:** This is a substantial architectural addition involving:
- New abstraction layer with 2 implementations
- Configuration system with cascade logic
- Model specification parsing
- Integration with existing MCPHandler
- Hook adaptation layer
- Example updates and documentation

However, it's **self-contained** and doesn't modify existing workflow/observer systems.
