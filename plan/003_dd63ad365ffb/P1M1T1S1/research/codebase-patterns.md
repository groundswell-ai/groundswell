# Codebase Pattern Research

## Type File Organization

### Current Directory Structure
```
src/types/
├── agent.ts           (AgentConfig, AgentResponse, etc.)
├── workflow.ts        (WorkflowStatus, WorkflowNode)
├── logging.ts         (LogLevel, LogEntry)
├── error.ts           (WorkflowError)
├── error-strategy.ts  (ErrorMergeStrategy)
├── events.ts          (WorkflowEvent)
├── observer.ts        (WorkflowObserver)
├── snapshot.ts        (SerializedWorkflowState)
├── decorators.ts      (StepOptions, TaskOptions)
├── prompt.ts          (PromptConfig)
├── reflection.ts      (ReflectionConfig, ReflectionAPI)
├── sdk-primitives.ts  (Tool, MCPServer, Skill, etc.)
└── index.ts           (barrel exports)
```

### Pattern: Union Type Definition
**File**: `src/types/logging.ts:4`
```typescript
/**
 * Log severity levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

**Pattern: WorkflowStatus**
**File**: `src/types/workflow.ts:4-9`
```typescript
/**
 * Workflow status representing the current execution state
 */
export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

### Pattern: Interface with Boolean Flags
**File**: `src/types/sdk-primitives.ts:37-52`
```typescript
/**
 * MCP Server configuration
 * Supports stdio and inprocess transports
 */
export interface MCPServer {
  /** Server name for identification */
  name: string;
  /** Server version (optional) */
  version?: string;
  /** Transport type */
  transport: 'stdio' | 'inprocess';
  /** Command to run for stdio transport */
  command?: string;
  /** Arguments for the command */
  args?: string[];
  /** Tools provided by this MCP server */
  tools?: Tool[];
  /** Environment variables for the MCP process */
  env?: Record<string, string>;
}
```

### Pattern: Barrel Export
**File**: `src/types/index.ts:1-4`
```typescript
// Core types
export type { WorkflowStatus, WorkflowNode } from './workflow.js';
export type { LogLevel, LogEntry } from './logging.js';
export type { SerializedWorkflowState, StateFieldMetadata } from './snapshot.js';
export type { WorkflowError } from './error.js';
```

## Key Conventions to Follow

1. **Union Type Format**: Use multi-line format with pipe (`|`) prefix for readability
2. **JSDoc Comments**: Every type and interface has a descriptive JSDoc comment
3. **Property Documentation**: Each interface property has a `/** */` comment
4. **Optional Properties**: Marked with `?` suffix
5. **Import Extensions**: Use `.js` extensions for all imports
6. **Export Pattern**: Add to `src/types/index.ts` with grouped, commented sections

## Existing Agent/Provider Architecture

### Agent Class Location
**File**: `src/core/agent.ts`
- Currently tightly coupled to Anthropic SDK
- Uses `@anthropic-ai/claude-agent-sdk` directly
- No provider abstraction layer exists yet

### AgentConfig Interface
**File**: `src/types/agent.ts:13-50`
```typescript
export interface AgentConfig {
  /** Human-readable name for the agent */
  name?: string;
  /** System prompt for the agent */
  system?: string;
  /** Model identifier (default: claude-sonnet-4-20250514) */
  model?: string;
  /** Tools to register with the agent */
  tools?: Tool[];
  /** MCP servers to connect to */
  mcps?: MCPServer[];
  /** Skills to load */
  skills?: Skill[];
  /** Enable reflection capability for this agent */
  enableReflection?: boolean;
  /** Enable caching of prompt responses */
  enableCache?: boolean;
}
```

### MCP Handler
**File**: `src/core/mcp-handler.ts`
- Supports `stdio` and `inprocess` transports
- Already transport-agnostic (good foundation for multi-provider)

## TypeScript Configuration

**File**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "useDefineForClassFields": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

## Files to Modify for P1M1T1S1

1. **Create**: `src/types/providers.ts` - New file for provider types
2. **Modify**: `src/types/index.ts` - Add provider type exports

## Related Future Files (Not Created in This Task)

Based on the PRD, these files will be created in later tasks:
- `src/types/providers.ts` - Provider options, request, result interfaces
- `src/providers/provider-registry.ts` - Provider registry singleton
- `src/providers/anthropic-provider.ts` - Anthropic provider implementation
- `src/providers/opencode-provider.ts` - OpenCode provider implementation
