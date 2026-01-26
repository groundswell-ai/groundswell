# Codebase Patterns Reference

## Registry Singleton Pattern

### From: `/home/dustin/projects/groundswell/src/providers/provider-registry.ts`

```typescript
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<ProviderId, Provider> = new Map();
  private states: Map<ProviderId, ProviderInitState> = new Map();

  private constructor() {
    // Empty constructor for singleton
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }
}
```

### Usage Pattern

```typescript
// Get singleton instance
const registry = ProviderRegistry.getInstance();

// Use registry methods
const provider = registry.get('anthropic');

// Multiple calls return same instance
const registry1 = ProviderRegistry.getInstance();
const registry2 = ProviderRegistry.getInstance();
// registry1 === registry2 (true)
```

## Constructor Pattern with Optional Config

### From: `/home/dustin/projects/groundswell/src/core/agent.ts`

```typescript
export class Agent {
  private readonly config: AgentConfig;
  private readonly model: string;
  private readonly providerId?: ProviderId;
  private readonly providerOptions?: ProviderOptions;

  constructor(config: AgentConfig = {}) {
    this.id = generateId();
    this.name = config.name ?? 'Agent';
    this.config = config;
    this.model = config.model ?? 'claude-sonnet-4-20250514';

    // Store provider configuration from AgentConfig
    this.providerId = config.provider;
    this.providerOptions = config.providerOptions;

    // Initialize MCP handler
    this.mcpHandler = new MCPHandler();

    // Register MCP servers
    if (config.mcps) {
      for (const mcp of config.mcps) {
        if (mcp instanceof MCPHandler) {
          this.mcpHandlers.push(mcp);
        }
        this.mcpHandler.registerServer(mcp);
      }
    }
  }
}
```

### Pattern Characteristics

1. **Default parameter**: `config: AgentConfig = {}`
2. **Nullish coalescing for defaults**: `config.name ?? 'Agent'`
3. **Direct assignment**: `this.config = config;`
4. **Optional config stored**: `this.providerId = config.provider;` (may be undefined)
5. **Conditional initialization**: `if (config.mcps)` for optional features

## Error Handling Patterns

### Pattern A: Check and Throw Error

From `provider-registry.ts` (Lines 286-289):

```typescript
public async initializeProvider(id: ProviderId, options?: ProviderOptions): Promise<void> {
  const provider = this.get(id);
  if (!provider) {
    throw new Error(`Provider '${id}' is not registered`);
  }
  // ... rest of method
}
```

### Pattern B: Descriptive Error Messages with Context

```typescript
// Session not found
if (!session) {
  throw new Error(`Session ${sessionId} not found`);
}

// Node not found
if (!node) {
  throw new Error(`Node not found: ${targetId}`);
}

// Parent not found
if (!parent) {
  throw new Error(`Parent node '${event.parentId}' not found in nodeMap`);
}

// File not found
if (err.code === 'ENOENT') {
  throw new Error(`Event history file not found: ${path}`);
}
```

### Error Message Format

1. **Template literal with backticks**: `` `Entity '${id}' is not registered` ``
2. **Includes identifier**: Always include the missing identifier in the message
3. **Descriptive verb**: "not found", "not registered", "not found in"
4. **Single quotes around identifier**: `('${id}')` for clarity

## Private Field Naming Conventions

### Pattern: No Underscore Prefix (CamelCase)

From `src/core/agent.ts`:
```typescript
private readonly config: AgentConfig;
private readonly mcpHandler: MCPHandler;
private readonly mcpHandlers: MCPHandler[];
private readonly model: string;
private readonly providerId?: ProviderId;
private readonly providerOptions?: ProviderOptions;
```

From `src/providers/anthropic-provider.ts`:
```typescript
private sdk: typeof import("@anthropic-ai/claude-agent-sdk") | null = null;
private mcpHandler: MCPHandler = new MCPHandler();
private mcpServerConfig: import("@anthropic-ai/claude-agent-sdk").McpServerConfig | null = null;
private skillsPrompt: string = '';
private sessions: Map<string, SessionState> = new Map();
```

### Convention

**Main source files**: Use `camelCase` WITHOUT underscore prefix
- `private provider: Provider;` ✅
- `private _provider: Provider;` ❌ (only in plan documents, not source)

## Import Patterns

### ES Module Imports with .js Extension

```typescript
// Type imports
import type { Provider, ProviderId, ProviderOptions } from '../types/providers.js';

// Value imports
import { ProviderRegistry } from '../providers/index.js';
import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';

// Mixed imports (types and values)
import type { AgentConfig, PromptOverrides } from '../types/index.js';
import { MCPHandler } from './mcp-handler.js';
import { generateId } from '../utils/id.js';
```

### Key Rules

1. **Always use .js extension**: ES module requirement
2. **Type-only imports**: Use `import type { ... }` for type-only imports
3. **Relative paths**: Use `../` to navigate up directories
4. **Consistent style**: One import per line or grouped by source

## Nullish Coalescing Pattern

### From: `src/core/agent.ts` and other files

```typescript
// CORRECT: Use ?? for default values
this.name = config.name ?? 'Agent';
this.model = config.model ?? 'claude-sonnet-4-20250514';

// WRONG: Don't use || for defaults
this.name = config.name || 'Agent'; // Breaks with empty string ''
```

### Why `??` instead of `||`?

- `??` only treats `null` and `undefined` as missing
- `||` treats all falsy values as missing (`0`, `''`, `false`)

Example:
```typescript
const config = { timeout: 0 };

// Using || (WRONG)
const timeout = config.timeout || 30000; // timeout = 30000 (incorrect!)

// Using ?? (CORRECT)
const timeout = config.timeout ?? 30000; // timeout = 0 (correct!)
```

## Conditional Initialization Pattern

### From: `src/core/agent.ts`

```typescript
// Initialize MCP handler
this.mcpHandler = new MCPHandler();

// Register MCP servers
if (config.mcps) {
  for (const mcp of config.mcps) {
    // If the MCP is already an MCPHandler instance, store it directly
    if (mcp instanceof MCPHandler) {
      this.mcpHandlers.push(mcp);
    }
    // Always register with main handler for tool discovery
    this.mcpHandler.registerServer(mcp);
  }
}
```

### Pattern Characteristics

1. **Initialize required objects first**: `this.mcpHandler = new MCPHandler();`
2. **Check for optional features**: `if (config.mcps)`
3. **Type checking**: `mcp instanceof MCPHandler`
4. **Preserve existing logic**: Don't modify when adding new code
