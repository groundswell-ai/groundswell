# Optional Field Extension Patterns in Codebase

## Overview

Research on how optional fields are added to existing interfaces in the Groundswell codebase.

## Pattern 1: TaskOptions Extension (Most Similar)

**File**: `src/types/decorators.ts`

```typescript
export interface TaskOptions {
  /** Custom task name (defaults to method name) */
  name?: string;

  /** If true, run returned workflows concurrently */
  concurrent?: boolean;

  /** Strategy for merging errors from concurrent task execution */
  errorMergeStrategy?: ErrorMergeStrategy;
}
```

**Key Points**:
- Optional field added with `?` suffix
- Clear JSDoc explaining purpose
- Import ErrorMergeStrategy type from error-strategy.ts

## Pattern 2: ProviderOptions Extension (Comprehensive Example)

**File**: `src/types/providers.ts`

```typescript
export interface ProviderOptions {
  /** API endpoint override */
  endpoint?: string;

  /** API key (if not from environment) */
  apiKey?: string;

  /** Session ID for session-based providers */
  sessionId?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Custom headers */
  headers?: Record<string, string>;

  /** Session store for persistent session storage */
  sessionStore?: import("../providers/session-store.js").SessionStore<SessionState>;

  /** Session persistence type */
  sessionPersistence?: 'memory' | 'file' | 'redis';

  /** Session time-to-live in milliseconds */
  sessionTtl?: number;

  /** Directory path for file-based session storage */
  sessionPath?: string;
}
```

**Key Points**:
- Multiple optional fields
- Union types for specific values ('memory' | 'file' | 'redis')
- Import statements can be inline for optional dependencies
- Detailed JSDoc with examples

## Pattern 3: AgentConfig Extension

**File**: `src/types/agent.ts`

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

  /** Model identifier for LLM inference */
  model?: string;

  /** Maximum tokens for responses */
  maxTokens?: number;

  /** Temperature for response generation */
  temperature?: number;

  /** Provider to use for this agent */
  provider?: ProviderId;

  /** Provider-specific options for this agent */
  providerOptions?: ProviderOptions;
}
```

**Key Points**:
- Boolean flags use clear naming (enableReflection, enableCache)
- Complex types as optional fields (hooks, tools, mcps)
- Related options grouped (provider, providerOptions)

## JSDoc Patterns

### Simple Optional Field

```typescript
/** Human-readable workflow name */
name?: string;
```

### Optional Field with Default

```typescript
/**
 * Model identifier for LLM inference
 *
 * @default "claude-sonnet-4-20250514"
 */
model?: string;
```

### Optional Field with Detailed Documentation

```typescript
/**
 * Session persistence type
 *
 * @remarks
 * Use 'file' for persistent storage across restarts. Mutually exclusive with
 * sessionStore property.
 *
 * When specified, a SessionStore instance will be created automatically.
 * Provide sessionStore directly for custom store implementations.
 *
 * @example
 * ```ts
 * // Easy configuration - file persistence
 * { sessionPersistence: 'file' }
 *
 * // Full configuration - custom path and TTL
 * {
 *   sessionPersistence: 'file',
 *   sessionPath: '/tmp/sessions',
 *   sessionTtl: 3600000
 * }
 *
 * // Direct injection - custom store
 * { sessionStore: new CustomStore() }
 * ```
 */
sessionPersistence?: 'memory' | 'file' | 'redis';
```

### Optional Field with "Disabled" Default (Relevant Pattern)

```typescript
/**
 * Enable error merging (default: false, first error wins)
 */
enabled: boolean;
```

**Note**: In ErrorMergeStrategy, `enabled` is required (not optional) but defaults to false behavior. For WorkflowConfig, we make the entire field optional to default to disabled.

## Import Patterns

### Type Import from Same Directory

```typescript
import type { ErrorMergeStrategy } from './error-strategy.js';
```

### Type Import from Different Directory

```typescript
import type { ErrorMergeStrategy } from '../types/error-strategy.js';
```

### Inline Import for Optional Dependencies

```typescript
sessionStore?: import("../providers/session-store.js").SessionStore<SessionState>;
```

**Note**: For WorkflowConfig, use standard import since error-strategy.ts is always available.

## Default Value Handling Patterns

### Nullish Coalescing for Simple Defaults

```typescript
this.name = config.name ?? 'Agent';
this.model = config.model ?? 'claude-sonnet-4-20250514';
```

### Conditional for Boolean Flags

```typescript
this.config.enableReflection ? { enabled: true } : undefined
```

### Undefined as Default for Optional Objects

```typescript
// When field is optional and undefined is valid default
this.config.errorMergeStrategy // Can be undefined
```

## Testing Patterns for Optional Fields

### Test Field Omission (Default Behavior)

```typescript
it('should use default value when field is omitted', () => {
  const config: WorkflowConfig = {};
  const wf = new Workflow(config);
  expect(wf.config.errorMergeStrategy).toBeUndefined();
});
```

### Test Field Provision

```typescript
it('should accept field when provided', () => {
  const config: WorkflowConfig = {
    errorMergeStrategy: { enabled: true }
  };
  const wf = new Workflow(config);
  expect(wf.config.errorMergeStrategy?.enabled).toBe(true);
});
```

### Test Type Safety

```typescript
it('should compile with optional field', () => {
  const config1: WorkflowConfig = {}; // No error
  const config2: WorkflowConfig = { name: 'Test' }; // No error
  const config3: WorkflowConfig = {
    errorMergeStrategy: { enabled: true }
  }; // No error
});
```

## Anti-Patterns to Avoid

### Don't Make Optional Field Required

```typescript
// ❌ WRONG - Breaking change
export interface WorkflowConfig {
  errorMergeStrategy: ErrorMergeStrategy; // Required!
}

// ✅ CORRECT - Non-breaking
export interface WorkflowConfig {
  errorMergeStrategy?: ErrorMergeStrategy; // Optional
}
```

### Don't Use Complex Default Logic in Type Definition

```typescript
// ❌ WRONG - Types can't have executable logic
export interface WorkflowConfig {
  errorMergeStrategy?: ErrorMergeStrategy = { enabled: false };
}

// ✅ CORRECT - Handle defaults in implementation
// In workflow.ts:
const strategy = this.config.errorMergeStrategy ?? { enabled: false };
```

### Don't Forget Type Import

```typescript
// ❌ WRONG - Type not imported
export interface WorkflowConfig {
  errorMergeStrategy?: ErrorMergeStrategy; // Error: Cannot find name
}

// ✅ CORRECT - Import the type
import type { ErrorMergeStrategy } from './error-strategy.js';

export interface WorkflowConfig {
  errorMergeStrategy?: ErrorMergeStrategy;
}
```

## Application to P2.M4.T1.S1

For adding `errorMergeStrategy` to WorkflowConfig:

1. Add import: `import type { ErrorMergeStrategy } from './error-strategy.js';`
2. Add field: `errorMergeStrategy?: ErrorMergeStrategy;`
3. Add JSDoc: `/** Strategy for merging multiple errors (default: undefined = first error wins) */`
4. Follow existing field ordering (name, enableReflection, autoValidateResponses, errorMergeStrategy)
5. No implementation changes needed (that's P2.M4.T1.S2)
