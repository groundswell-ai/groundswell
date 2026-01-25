# AnthropicProvider Implementation Patterns

## Source: src/providers/anthropic-provider.ts

### 1. AnthropicProvider Class Structure

**Lines 52-260**: Complete class structure implementing Provider interface

```typescript
export class AnthropicProvider implements Provider {
  // Readonly properties per interface
  readonly id: ProviderId = 'anthropic';

  readonly capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: false,
    extendedThinking: true,
  };

  // Private SDK field for lazy loading
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;

  // Six required methods
  async initialize(options?: ProviderOptions): Promise<void> { /* ... */ }
  async terminate(): Promise<void> { /* ... */ }
  async execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents): Promise<AgentResponse<T>> { /* ... */ }
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> { /* ... */ }
  async loadSkills(skills: Skill[]): Promise<void> { /* ... */ }
  normalizeModel(model: string): ModelSpec { /* ... */ }
}
```

### 2. initialize() Implementation Pattern

**Lines 107-143**: SDK initialization with idempotent check

```typescript
async initialize(options?: ProviderOptions): Promise<void> {
  // Idempotent check: if SDK is already loaded, return immediately
  if (this.sdk) {
    return;
  }

  // Dynamic import of the Anthropic SDK for lazy loading
  try {
    this.sdk = await import('@anthropic-ai/claude-agent-sdk');
  } catch (error) {
    throw new Error(
      `Failed to load @anthropic-ai/claude-agent-sdk: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Validate import succeeded
  if (!this.sdk) {
    throw new Error('Failed to load @anthropic-ai/claude-agent-sdk: Import returned null');
  }

  // Note: Options stored for later use in execute()
  // SDK client creation happens when execute() is called
}
```

**Key Patterns**:
- **Idempotent check** - Returns immediately if already initialized
- **Lazy SDK loading** - Uses dynamic import (`await import()`)
- **Error handling** - Wraps import in try/catch with descriptive error messages
- **No internal state flag** - Uses `this.sdk` as initialization flag

### 3. terminate() Implementation Pattern

**Lines 154-169**: SDK cleanup with idempotent check

```typescript
async terminate(): Promise<void> {
  // Idempotent check: if SDK is already null, return immediately
  if (this.sdk === null) {
    return;
  }

  // Clear SDK reference to allow garbage collection
  this.sdk = null;
}
```

**Key Patterns**:
- **Idempotent check** - Follows same pattern as `initialize()`
- **Simple cleanup** - Only sets `this.sdk = null` (SDK is stateless)
- **No throws** - No return value or error conditions
- **GOTCHA comments** - Self-documenting critical assumptions

### 4. normalizeModel() Implementation

**Lines 246-259**: Model validation and delegation

```typescript
normalizeModel(model: string): ModelSpec {
  // Delegate to existing utility function
  const spec = parseModelSpec(model, 'anthropic');

  // Provider-specific validation
  if (spec.provider !== this.id) {
    throw new Error(
      `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider. ` +
      `Use ProviderRegistry.get('${spec.provider}') instead.`
    );
  }

  return spec;
}
```

**Key Patterns**:
- **Delegation** - Uses `parseModelSpec()` utility for parsing
- **Validation** - Ensures provider matches current provider (`this.id`)
- **Error handling** - Clear error message directing to correct provider
- **Synchronous** - No async/await pattern needed

### 5. Existing execute() Stub

**Lines 181-188**: Current placeholder implementation

```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents
): Promise<AgentResponse<T>> {
  // Implemented in P2.M1.T1.S5-S6
  return {} as AgentResponse<T>;
}
```

**Status**: Currently returns empty stub - implementation pending for P2.M1.T1.S5-S6

### 6. Error Handling Patterns

**Key Pattern**: Use try/catch with descriptive error messages

```typescript
try {
  this.sdk = await import('@anthropic-ai/claude-agent-sdk');
} catch (error) {
  throw new Error(
    `Failed to load @anthropic-ai/claude-agent-sdk: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
}
```

### 7. JSDoc Documentation Pattern

**Lines 1-36**: Comprehensive JSDoc for class and methods

```typescript
/**
 * Anthropic provider implementation
 *
 * Wraps the @anthropic-ai/claude-agent-sdk to provide Anthropic Claude
 * model access through the unified Provider interface.
 *
 * ## Capabilities
 *
 * - **MCP**: Model Context Protocol integration via createSdkMcpServer
 * - **Skills**: System prompt-based skill loading
 * ...
 *
 * @example
 * ```ts
 * import { AnthropicProvider } from 'groundswell';
 * const provider = new AnthropicProvider();
 * await provider.initialize({ apiKey: 'sk-...' });
 * ```
 *
 * @see {@link https://docs.anthropic.com/en/api/messages | Anthropic Messages API}
 */
```

### 8. Type Import Pattern

**Lines 38-50**: Organized type imports

```typescript
import type {
  Provider,
  ProviderId,
  ProviderCapabilities,
  ProviderOptions,
  ProviderRequest,
  ToolExecutor,
  ProviderHookEvents,
  ModelSpec,
} from '../types/providers.js';
import type { AgentResponse } from '../types/agent.js';
import type { Tool, MCPServer, Skill } from '../types/sdk-primitives.js';
import { parseModelSpec } from '../utils/model-spec.js';
```

### 9. SDK Access Pattern

**Private SDK Field** (Line 96):
```typescript
private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;
```

**Access Pattern**:
```typescript
// Check if SDK is loaded
if (!this.sdk) {
  throw new Error('SDK not initialized');
}

// Use SDK methods
const result = await this.sdk.someMethod();
```

### 10. Async/Await Patterns

**All provider methods follow consistent patterns**:
- `initialize()`, `terminate()`, `execute()`, `registerMCPs()`, `loadSkills()` return `Promise<void>` or `Promise<T>`
- `normalizeModel()` is synchronous
- All async methods use `async/await` syntax
- Error handling with try/catch blocks where appropriate
