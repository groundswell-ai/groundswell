# TypeScript Best Practices Research

## Union Types vs Enums

### When to Use Union Types
The codebase already follows excellent patterns using string literal unions:
- `LogLevel = 'debug' | 'info' | 'warn' | 'error'`
- `WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'`

**Recommendation**: Use string literal union for `ProviderId`

```typescript
// ✅ GOOD: String literal union for small sets (2-6 values)
export type ProviderId = 'anthropic' | 'opencode';
```

### Gotchas to Avoid

```typescript
// ❌ GOTCHA: String unions don't prevent typos at runtime
function handleProvider(provider: string) {
  if (provider === 'anthhropic') {  // Typo! TypeScript won't catch runtime checks
    // ...
  }
}

// ✅ SOLUTION: Use type annotation
function handleProvider(provider: ProviderId) {
  // TypeScript enforces valid values
}
```

## Interface Naming Conventions

The codebase follows these patterns:
- **PascalCase** for all types and interfaces
- **Id suffix** for identifier unions: `WorkflowStatus`, `LogLevel`
- **Capability suffix** for feature flag interfaces: `StateFieldMetadata`

## Boolean Flag Patterns

From `src/types/agent.ts`:
```typescript
export interface AgentConfig {
  /** Enable reflection capability for this agent */
  enableReflection?: boolean;
  /** Enable caching of prompt responses */
  enableCache?: boolean;
}
```

**Pattern**: Use `enable` prefix for feature flags, `is`/`has`/`can` for state flags

For `ProviderCapabilities`, the PRD specifies lowercase property names without prefixes:
```typescript
export interface ProviderCapabilities {
  mcp: boolean;
  skills: boolean;
  lsp: boolean;
  streaming: boolean;
  sessions: boolean;
  extendedThinking: boolean;
}
```

## Readonly Properties

From `src/types/workflow-context.ts`:
```typescript
export interface WorkflowContext {
  /** Unique ID of this workflow */
  readonly workflowId: string;
  /** Parent workflow ID if nested */
  readonly parentWorkflowId?: string;
}
```

**Pattern**: Use `readonly` for immutable properties

## JSDoc Documentation Patterns

From `src/types/agent.ts`:
```typescript
/**
 * Response wrapper for agent execution results
 *
 * ## PRD 6.4 Response Requirements
 *
 * All AgentResponse instances MUST satisfy:
 * - Strict JSON (PRD 6.4.1): Must be parseable by `JSON.parse()`
 * - No Prose Wrapping (PRD 6.4.2): No markdown code blocks
 * - Consistent Structure (PRD 6.4.3): Must conform to this interface
 *
 * @template T - The type of data returned on success
 * @see {@link SuccessResponse}, {@link ErrorResponse}
 */
export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}
```

**Pattern**: Use structured JSDoc with:
- Summary line
- Detailed description with section headers (`##`)
- `@template` for generics
- `@see` for related types

## TypeScript 5.x Features to Consider

### `const` Type Parameters (TS 5.0)
```typescript
// For inferred literal types
function createProvider<const T extends ProviderId>(id: T) {
  return { id, capabilities: {} };
}
const provider = createProvider('anthropic');
// Type: { id: 'anthropic'; capabilities: {} }
```

### Module Resolution
The project uses `"moduleResolution": "bundler"` which requires `.js` extensions in imports.

## Sources

### Official TypeScript Documentation
- [TypeScript Handbook - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Handbook - Unions and Intersection Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [TypeScript 5.0 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/)
- [TypeScript 5.8 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)

### Community Resources
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Effective TypeScript](https://effectivetypescript.com/) by Dan Vanderkam
