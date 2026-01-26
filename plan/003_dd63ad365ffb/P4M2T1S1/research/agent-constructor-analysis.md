# Agent Constructor Analysis

## File Location
`/home/dustin/projects/groundswell/src/core/agent.ts`

## Current Implementation (Lines 98-124)

```typescript
constructor(config: AgentConfig = {}) {
  this.id = generateId();
  this.name = config.name ?? 'Agent';
  this.config = config;
  this.model = config.model ?? 'claude-sonnet-4-20250514';

  // Store provider configuration from AgentConfig
  // Full provider resolution (global + agent + prompt) happens later during execution
  this.providerId = config.provider;
  this.providerOptions = config.providerOptions;

  // Initialize MCP handler
  this.mcpHandler = new MCPHandler();

  // Register MCP servers
  if (config.mcps) {
    for (const mcp of config.mcps) {
      // If the MCP is already an MCPHandler instance, store it directly
      // for delegated tool execution (preserves registered executors)
      if (mcp instanceof MCPHandler) {
        this.mcpHandlers.push(mcp);
      }
      // Always register with main handler for tool discovery
      this.mcpHandler.registerServer(mcp);
    }
  }
}
```

## Key Findings

1. **Constructor signature unchanged**: `constructor(config: AgentConfig = {})` - must preserve for backward compatibility

2. **Provider fields already stored** (from P4.M1.T1.S2):
   - `this.providerId = config.provider;`
   - `this.providerOptions = config.providerOptions;`
   - These are available for use in provider resolution

3. **Comment indicates deferred resolution**: "Full provider resolution (global + agent + prompt) happens later during execution"
   - This PRP implements the "agent + global" part of the resolution
   - Prompt-level override will be added in later task (P4.M3.T1)

4. **MCP handler initialization must be preserved**: Lines 109-123 should not be modified

5. **No provider instance field exists yet**: This PRP will add `this.provider: Provider`

## Private Fields (Lines 70-92)

```typescript
public readonly id: string;
public readonly name: string;
private readonly config: AgentConfig;
private readonly mcpHandler: MCPHandler;
private readonly mcpHandlers: MCPHandler[] = [];
private readonly model: string;
private readonly providerId?: ProviderId;           // From P4.M1.T1.S2
private readonly providerOptions?: ProviderOptions; // From P4.M1.T1.S2
```

## Pattern Notes

1. **No underscore prefix**: Private fields use `this.field` not `this._field`
2. **Readonly modifier**: All private fields use `readonly` to prevent reassignment
3. **Optional fields marked with `?`**: `providerId?` and `providerOptions?` are optional

## Import Statements (Lines 8-50)

Relevant existing imports:
```typescript
// Lines 39-38: Type imports for provider-related types
import type { ProviderId, ProviderOptions } from '../types/providers.js';
```

## What This PRP Needs to Add

1. **New imports** (after line 50):
   ```typescript
   import { ProviderRegistry } from '../providers/index.js';
   import type { Provider } from '../types/providers.js';
   import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';
   ```

2. **New private field** (after line 92):
   ```typescript
   private readonly provider: Provider;
   ```

3. **New constructor logic** (after line 107, before line 109):
   ```typescript
   // Resolve effective provider using configuration cascade
   const globalConfig = getGlobalProviderConfig();
   const resolved = resolveProviderConfig(
     globalConfig,
     this.providerId,
     this.providerOptions
   );
   const effectiveProvider = resolved.provider;

   // Get provider instance from registry
   const registry = ProviderRegistry.getInstance();
   const providerInstance = registry.get(effectiveProvider);
   if (!providerInstance) {
     throw new Error(`Provider '${effectiveProvider}' is not registered`);
   }
   this.provider = providerInstance;
   ```
