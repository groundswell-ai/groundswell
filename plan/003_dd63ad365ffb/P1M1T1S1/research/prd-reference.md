# PRD Section 7 Reference

## Provider System Specification

### Section 7.1 - Supported Providers

| Provider | SDK | Description |
|----------|-----|-------------|
| `anthropic` | Anthropic Agent SDK (`claude-agent-sdk`) | Claude models via Anthropic's official Agent SDK |
| `opencode` | OpenCode Agent SDK | Multi-provider support (Anthropic, OpenAI, Ollama, 75+ providers) |

### Section 7.2 - ProviderId Type

**PRD Line 264-266**:
```typescript
export type ProviderId = 'anthropic' | 'opencode';
```

### Section 7.3 - Provider Interface

**PRD Lines 272-290**:
```typescript
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

### Section 7.4 - ProviderCapabilities

**PRD Lines 294-303**:
```typescript
export interface ProviderCapabilities {
  mcp: boolean;              // MCP server connections
  skills: boolean;           // Skill loading
  lsp: boolean;              // Language Server Protocol integration
  streaming: boolean;        // Streaming responses
  sessions: boolean;         // Session-based state
  extendedThinking: boolean; // Extended thinking/reasoning
}
```

### Capability Matrix

**PRD Lines 305-313**:

| Capability | Anthropic SDK | OpenCode SDK |
|------------|--------------|--------------|
| MCP | ✓ (via MCPHandler) | ✓ (native) |
| Skills | ✓ (system prompt) | ✓ (native `/skills`) |
| LSP | ✓ (MCP plugins) | ✓ (explicit `lsp` tool) |
| Streaming | ✓ (message) | ✓ (SSE) |
| Sessions | ✗ (stateless) | ✓ |
| Extended Thinking | ✗ | ✓ |

## Task P1M1T1S1 Scope

This task defines **only**:
1. `ProviderId` union type
2. `ProviderCapabilities` interface

Future tasks will define:
- P1M1T1S2: `ProviderOptions` and `ProviderRequest` interfaces
- P1M1T1S3: `Provider` interface with core methods
- P1M1T1S4: `ToolExecutionRequest`, `ToolExecutionResult`, `ProviderHookEvents`
- P1M1T1S5: `ProviderResult`, `ModelSpec`, `GlobalProviderConfig`

## PRD Reference Locations

- **ProviderId**: PRD.md, lines 264-266
- **ProviderCapabilities**: PRD.md, lines 294-313
- **Capability Matrix**: PRD.md, lines 305-313
- **Provider Interface**: PRD.md, lines 272-290
