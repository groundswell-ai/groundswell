# AgentConfig Interface Analysis

## Current Structure (from `/src/types/agent.ts`)

```typescript
export interface AgentConfig {
  /** Human-readable name for the agent */
  name?: string;

  /** System prompt for the agent */
  system?: string;

  /** Tools available to the agent */
  tools?: Tool[];

  /** MCP servers to connect */
  mcps?: MCPServer[];

  /** Skills to load */
  skills?: Skill[];

  /** Lifecycle hooks */
  hooks?: AgentHooks;

  /** Environment variables for agent execution */
  env?: Record<string, string>;

  /** Enable reflection capability for this agent */
  enableReflection?: boolean;

  /** Enable caching of prompt responses */
  enableCache?: boolean;

  /** Model to use (defaults to claude-sonnet-4-20250514) */
  model?: string;

  /** Maximum tokens for responses */
  maxTokens?: number;

  /** Temperature for response generation */
  temperature?: number;
}
```

## Dependencies

```typescript
import type { Tool, MCPServer, Skill, AgentHooks, TokenUsage } from './sdk-primitives.js';
import { z } from 'zod';
```

## Related Types in Same File

- **PromptOverrides Interface** (lines 55-91) - Allows prompt-level overrides of AgentConfig properties
- **AgentResponse System** (lines 101-832) - Comprehensive response handling system

## Key Observations

1. **All fields are optional** - Uses `?` modifier consistently
2. **JSDoc pattern**: `/** Description */` format
3. **Naming**: camelCase, descriptive names
4. **Placement**: This file is in `/src/types/agent.ts`
5. **Exports**: AgentConfig is exported and re-exported from `/src/types/index.ts` and `/src/index.ts`

## Fields to Add

1. `provider?: ProviderId` - Provider selection override
2. `providerOptions?: ProviderOptions` - Provider-specific configuration
3. Update `model` field JSDoc - Document `provider/model` format support

## Import Statement to Add

```typescript
import type { ProviderId, ProviderOptions } from './providers.js';
```

Placement: After existing `import type { Tool, MCPServer, Skill, AgentHooks, TokenUsage } from './sdk-primitives.js';`
