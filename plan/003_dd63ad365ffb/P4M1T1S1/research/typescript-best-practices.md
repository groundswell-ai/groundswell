# TypeScript Best Practices Research

## TypeScript Interface Extension Patterns

### 1. Optional Fields with `?` Modifier

**Best Practice**: Use the `?` modifier for optional properties (NOT `Partial<T>`)

```typescript
// ✅ CORRECT - Codebase pattern
export interface AgentConfig {
  /** Human-readable name for the agent */
  name?: string;
}

// ❌ AVOID - Don't use Partial for interface fields
export interface AgentConfig extends Partial<BaseConfig> {
  // ...
}
```

### 2. Import Statement Format

**ES Modules Require `.js` Extension**:

```typescript
// ✅ CORRECT - ES module import with .js extension
import type { ProviderId, ProviderOptions } from './providers.js';

// ❌ WRONG - Missing .js extension (will cause module resolution error)
import type { ProviderId, ProviderOptions } from './providers';
```

**Type-Only Imports**:

```typescript
// ✅ CORRECT - Use `import type` for type-only imports
import type { ProviderId, ProviderOptions } from './providers.js';

// ⚠️ AVOID - Regular import for types (works but less clear)
import { ProviderId, ProviderOptions } from './providers.js';
```

### 3. Extending Interfaces

**Append New Fields (Don't Modify Existing)**:

```typescript
// ✅ CORRECT - Append new fields at the end
export interface AgentConfig {
  // Existing fields...
  name?: string;
  system?: string;

  // New fields appended
  provider?: ProviderId;
  providerOptions?: ProviderOptions;
}

// ❌ AVOID - Don't reorder or modify existing fields
export interface AgentConfig {
  provider?: ProviderId;  // Moved to top - breaks compatibility
  name?: string;  // Reordered
}
```

### 4. JSDoc Documentation Standards

**Multi-Line Documentation**:

```typescript
/**
 * Provider to use for this agent
 *
 * Overrides the global default provider configured via
 * `configureProviders()`. If not specified, uses the global
 * default provider.
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * Priority order for provider resolution (highest to lowest):
 * 1. Prompt-level provider override (highest)
 * 2. AgentConfig.provider (this field)
 * 3. GlobalProviderConfig.defaultProvider (lowest)
 *
 * @example <caption>Explicit Anthropic provider</caption>
 * ```ts
 * const config: AgentConfig = {
 *   provider: 'anthropic'
 * };
 * ```
 *
 * @see {@link GlobalProviderConfig} for global provider configuration
 */
provider?: ProviderId;
```

**Key Elements**:
- `/** */` for multi-line JSDoc (not `/* */`)
- First line: Brief summary
- Following paragraphs: Detailed description
- `##` headings for sections
- `@example <caption>Description>` for examples
- `@see` for cross-references

### 5. Union Types for Provider Selection

```typescript
// ✅ CORRECT - Union type with string literals
export type ProviderId = 'anthropic' | 'opencode';

// Type safety: compiler enforces valid values
const provider1: ProviderId = 'anthropic';  // ✅ Valid
const provider2: ProviderId = 'invalid';    // ❌ Type error
```

### 6. Configuration Object Patterns

**Optional Chaining for Nested Access**:

```typescript
// Accessing nested optional properties
const timeout = globalConfig.providerDefaults?.[provider]?.timeout;

// Instead of
const timeout = globalConfig.providerDefaults && globalConfig.providerDefaults[provider] && globalConfig.providerDefaults[provider].timeout;
```

**Nullish Coalescing for Defaults**:

```typescript
// Using ?? for null/undefined checks (not ||)
const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;

// ?? only checks null/undefined (preserves 0, false, '')
// || checks all falsy values
```

## TypeScript Handbook References

### Interfaces
- **URL**: https://www.typescriptlang.org/docs/handbook/2/interfaces.html
- **Section**: Optional Properties
- **Key Point**: Use `?` modifier for optional properties

### Utility Types
- **URL**: https://www.typescriptlang.org/docs/handbook/utility-types.html
- **Relevant Types**: `Partial<T>`, `Omit<T, K>`, `Pick<T, K>`
- **Note**: Codebase doesn't use `Partial<T>` for interface fields

### Module Resolution
- **URL**: https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-formats
- **Key Point**: ES modules require `.js` extension in import paths

### Type-Only Imports
- **URL**: https://www.typescriptlang.org/docs/handbook/modules/reference.html#type-only-imports-and-exports
- **Key Point**: Use `import type` to prevent runtime imports

## JSDoc Best Practices

### TSDoc Standard
- **URL**: https://tsdoc.org/
- **Standard**: TSDoc is the documentation standard for TypeScript

### Recommended Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `@param` | Document parameters | `@param name - Description` |
| `@returns` | Document return value | `@returns The result` |
| `@example` | Provide usage example | `@example <caption>Desc</caption>` |
| `@see` | Cross-reference | `@see {@link OtherType}` |
| `@template` | Document generics | `@template T - Type parameter` |
| `@default` | Document default value | `@default "claude-sonnet-4"` |
| `@remarks` | Additional notes | Implementation details |

### Code Blocks in JSDoc

```typescript
/**
 * @example <caption>Basic usage</caption>
 * ```ts
 * const config: AgentConfig = {
 *   provider: 'anthropic'
 * };
 * ```
 */
```

## Common TypeScript Patterns in This Codebase

### 1. Discriminated Unions

```typescript
export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
}

// Type narrowing with discriminator
if (response.status === 'success') {
  // TypeScript knows: data is T, error is null
  console.log(response.data);
}
```

### 2. Type Guards

```typescript
export function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

// Usage
if (isSuccess(response)) {
  // TypeScript narrows type to SuccessResponse<T>
}
```

### 3. Readonly Properties

```typescript
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
}

// TypeScript prevents modification
provider.id = 'other';  // ❌ Type error: Cannot assign to 'id'
```

### 4. Generic Type Parameters

```typescript
export interface Provider {
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}
```

## Anti-Patterns to Avoid

### ❌ Don't Use `any`

```typescript
// ❌ AVOID
function process(config: any) { }

// ✅ CORRECT
function process(config: unknown) { }
// Or use specific type
function process(config: AgentConfig) { }
```

### ❌ Don't Use Empty Interfaces

```typescript
// ❌ AVOID - Empty interface provides no value
interface EmptyConfig extends BaseConfig { }

// ✅ CORRECT - Use type alias or directly extend
type EmptyConfig = BaseConfig;
```

### ❌ Don't Use Optional Chaining for Required Fields

```typescript
// ❌ AVOID
interface Config {
  required?: string;  // Marked optional but actually required
}

// ✅ CORRECT
interface Config {
  required: string;  // No ? - truly required
}
```

## Compilation Verification

```bash
# Type checking without compilation
npx tsc --noEmit

# With pretty error messages
npx tsc --noEmit --pretty

# Check specific file
npx tsc --noEmit src/types/agent.ts

# Full project check
npx tsc --noEmit
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TSDoc Standard](https://tsdoc.org/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [TypeScript Style Guide](https://github.com/planningcenter/typescript-style-guide)
- [Microsoft TypeScript GitHub](https://github.com/microsoft/TypeScript)
