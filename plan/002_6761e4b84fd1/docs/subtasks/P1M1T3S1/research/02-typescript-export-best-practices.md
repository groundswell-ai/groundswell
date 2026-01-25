# TypeScript Export Best Practices for Public APIs

## Source

- TypeScript Handbook - Modules: https://www.typescriptlang.org/docs/handbook/modules.html
- Type-Only Imports and Exports: https://www.typescriptlang.org/docs/handbook/2/typeof-operators.html#type-only-imports-and-exports
- Community best practices for library public API design

## Key Patterns

### 1. Type-Only Exports for Types

Use `export type` for pure type definitions (interfaces, type aliases):

```typescript
// ✅ GOOD - Type-only export
export type { AgentResponse, AgentErrorDetails } from './types.js';

// ⚠️ LESS IDEAL - Regular export for types only
export { AgentResponse, AgentErrorDetails } from './types.js';
```

**Benefits:**
- Better tree-shaking (type exports are removed at compile time)
- Prevents accidental runtime use
- Makes intent clear (this is a type, not a value)

### 2. Explicit Named Exports (Not Wildcard)

```typescript
// ✅ GOOD - Explicit exports
export type { AgentResponse, AgentErrorDetails, AgentResponseMetadata } from './agent.js';
export { createSuccessResponse, createErrorResponse } from './agent.js';

// ⚠️ AVOID - Wildcard exports (can cause naming conflicts)
export * from './agent.js';
```

### 3. Grouped Exports by Category

Organize exports logically in the main index.ts:

```typescript
// ============================================================================
// Types (Type-Only Exports)
// ============================================================================
export type {
  WorkflowStatus,
  WorkflowNode,
  LogLevel,
  LogEntry,
  AgentConfig,
  PromptOverrides,
} from './types/index.js';

// ============================================================================
// Agent Response Types (Type-Only Exports)
// ============================================================================
export type {
  AgentResponseStatus,
  AgentResponse,
  AgentErrorDetails,
  AgentResponseMetadata,
  SuccessResponse,
  ErrorResponse,
  PartialResponse,
} from './types/index.js';

// ============================================================================
// Core Classes
// ============================================================================
export { Agent } from './core/agent.js';
export { Prompt } from './core/prompt.js';

// ============================================================================
// Factory Functions
// ============================================================================
export { createSuccessResponse, createErrorResponse, createPartialResponse } from './types/index.js';

// ============================================================================
// Type Guards
// ============================================================================
export { isSuccess, isError, isPartial } from './types/index.js';

// ============================================================================
// Constants
// ============================================================================
export { AGENT_ERROR_CODES } from './types/index.js';
```

### 4. Consistent Extension Usage

Always use `.js` extensions in import paths for ES modules:

```typescript
// ✅ GOOD - .js extension
export type { AgentResponse } from './types/index.js';

// ⚠️ AVOID - No extension or .ts extension
export type { AgentResponse } from './types/index';
export type { AgentResponse } from './types/index.ts';
```

### 5. Re-export Patterns

**Barrel file pattern (index.ts re-exports from submodules):**

```typescript
// src/types/index.ts - Type barrel
export type { AgentResponse } from './agent.js';

// src/index.ts - Main entry point re-exports from barrel
export type { AgentResponse } from './types/index.js';
```

## Gotchas to Avoid

### 1. Circular Dependencies

```typescript
// ⚠️ BAD - Creates circular dependency
// a/index.ts
export * from '../b/types.js';

// b/index.ts
export * from '../a/types.js';
```

### 2. Exporting Internal Implementation

```typescript
// ⚠️ BAD - Exports internal utilities
export * from './internal/utils.js';

// ✅ GOOD - Export only public API
export { Agent, createAgent } from './public/index.js';
```

### 3. Mixed Type/Value Exports Without Clarity

```typescript
// ⚠️ CONFUSING - Is AgentResponse a type or a value?
export { AgentResponse } from './types.js';

// ✅ CLEAR - Type-only export for types
export type { AgentResponse } from './types.js';
```

## Application to AgentResponse Exports

Based on these best practices, here's the recommended addition to `src/index.ts`:

```typescript
// In the "Types" section (around line 26-30):
export type {
  // ... existing types ...
  AgentConfig,
  PromptOverrides,
  // ADD: AgentResponse types
  AgentResponseStatus,
  AgentResponse,
  AgentErrorDetails,
  AgentResponseMetadata,
  SuccessResponse,
  ErrorResponse,
  PartialResponse,
} from './types/index.js';

// In a new "Type Guards" section (after factory functions):
export {
  AGENT_ERROR_CODES,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  isSuccess,
  isError,
  isPartial,
} from './types/index.js';
```

**Key points:**
1. Use `export type` for pure types (AgentResponse interfaces)
2. Use regular `export` for runtime values (constants, functions)
3. Group related exports together
4. Add clear section comments
5. Maintain alphabetical ordering within each group
