# Provider Interface Reference (P1.M1.T1.S3)

## Main Provider Interface Definition

**File:** `/home/dustin/projects/groundswell/src/types/providers.ts` (lines 442-600)

```typescript
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```

## Related Type Definitions

### ProviderId (lines 8-10)
```typescript
export type ProviderId = 'anthropic' | 'opencode';
```

### ProviderCapabilities (lines 16-29)
```typescript
export interface ProviderCapabilities {
  mcp: boolean;           // MCP server connections
  skills: boolean;         // Skill loading
  lsp: boolean;           // Language Server Protocol integration
  streaming: boolean;     // Streaming responses
  sessions: boolean;       // Session-based state
  extendedThinking: boolean; // Extended thinking/reasoning
}
```

### ProviderOptions (lines 35-50)
```typescript
export interface ProviderOptions {
  endpoint?: string;      // API endpoint override
  apiKey?: string;        // API key (if not from environment)
  sessionId?: string;     // Session ID for session-based providers
  timeout?: number;       // Timeout in milliseconds
  headers?: Record<string, string>; // Custom headers
}
```

### ModelSpec (lines 150-157)
```typescript
export interface ModelSpec {
  provider: ProviderId;     // Provider identifier
  model: string;           // Model name (without provider prefix)
  raw: string;             // Original raw model string
}
```

### ToolExecutor (lines 167-169)
```typescript
export type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;
```

### Supporting Types from Other Files

#### Tool (from `src/types/sdk-primitives.ts`, lines 10-21)
```typescript
export interface Tool {
  name: string;                               // Tool name (must be unique)
  description: string;                        // Human-readable description
  input_schema: {                            // JSON Schema for inputs
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
```

#### MCPServer (from `src/types/sdk-primitives.ts`, lines 37-52)
```typescript
export interface MCPServer {
  name: string;           // Server name for identification
  version?: string;       // Server version (optional)
  transport: 'stdio' | 'inprocess'; // Transport type
  command?: string;       // Command to run for stdio transport
  args?: string[];        // Arguments for the command
  tools?: Tool[];         // Tools provided by this MCP server
  env?: Record<string, string>; // Environment variables
}
```

#### Skill (from `src/types/sdk-primitives.ts`, lines 58-63)
```typescript
export interface Skill {
  name: string;           // Skill name for identification
  path: string;           // Path to skill directory containing SKILL.md
}
```

## Export Summary

The types are exported from `/home/dustin/projects/groundswell/src/types/index.ts` (lines 27-44):

```typescript
export type {
  Provider,
  ProviderId,
  ProviderCapabilities,
  ProviderOptions,
  ProviderExecutionOptions,
  ProviderRequest,
  ProviderHookEvents,
  ToolExecutionRequest,
  ToolExecutionResult,
  ModelSpec,
  ToolExecutor,
  ProviderResult,
  ProviderResponseStatus,
  ProviderErrorDetails,
  ProviderResponseMetadata,
  GlobalProviderConfig,
} from './providers.js';
```

## Key Implementation Requirements

From the test file `/home/dustin/projects/groundswell/src/__tests__/unit/provider-interface.test.ts`, the interface enforces:

1. **Readonly Properties**: Both `id` and `capabilities` must be readonly
2. **6 Core Methods**: All providers must implement exactly 6 methods
3. **Generic execute Method**: The `execute<T>` method supports type-safe response handling
4. **Tool Execution**: Providers must delegate tool execution via the `ToolExecutor` callback
5. **AgentResponse Wrapper**: All executions return `AgentResponse<T>` (not raw `T`)

## Usage in ProviderRegistry

```typescript
// ProviderRegistry will store providers by their id
private providers: Map<ProviderId, Provider> = new Map();

// Provider registration uses provider.id as key
register(provider: Provider): void {
  this.providers.set(provider.id, provider);
}

// Provider lookup by id
get(id: ProviderId): Provider | undefined {
  return this.providers.get(id);
}
```
