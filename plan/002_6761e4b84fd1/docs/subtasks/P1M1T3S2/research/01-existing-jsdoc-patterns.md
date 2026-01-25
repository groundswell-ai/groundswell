# Existing JSDoc Comment Patterns and Documentation Conventions Research

## Overview

This document catalogs the existing JSDoc comment patterns and documentation conventions found in the Groundswell codebase, providing a foundation for adding comprehensive documentation to AgentResponse types.

## Key Findings

### 1. JSDoc Comment Style Conventions

The codebase uses a consistent but basic JSDoc style:

**Basic Interface Documentation** (from `src/types/agent.ts`, lines 9-11):
```typescript
/**
 * Configuration for creating an Agent instance
 * All Anthropic SDK properties pass through unchanged
 */
export interface AgentConfig { ... }
```

**Template Documentation** (from `src/types/prompt.ts`):
```typescript
/**
 * Configuration for creating a Prompt instance
 * @template T The expected response type (inferred from responseFormat)
 */
export interface PromptConfig<T> { ... }
```

### 2. Method Documentation Patterns

**Basic Method Documentation** (from `src/core/agent.ts`):
```typescript
/**
 * Execute a prompt and return validated response
 * @param prompt Prompt to execute
 * @param overrides Optional overrides for this execution
 * @returns AgentResponse containing validated response or error
 */
async prompt<T>(prompt: string, overrides?: PromptOverrides): Promise<AgentResponse<T>>
```

### 3. @example Tags with Code Blocks

The codebase has excellent examples of @example usage in factory functions:

**Success Response Example** (from `src/types/agent.ts`, lines 208-214):
```typescript
/**
 * Creates a success response with data and metadata.
 *
 * @param data - The response data
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse
 *
 * @example
 * ```ts
 * const response = createSuccessResponse(
 *   { result: 'success' },
 *   { agentId: 'agent-123', timestamp: Date.now() }
 * );
 * ```
 */
```

**Type Guard Example** (from `src/types/agent.ts`, lines 308-313):
```typescript
/**
 * Type guard for success responses.
 * Narrows the type to SuccessResponse<T> where data is T (not null).
 *
 * @example
 * ```ts
 * if (isSuccess(response)) {
 *   console.log(response.data); // TypeScript knows data is T
 * }
 * ```
 */
```

### 4. Property Documentation Patterns

**Single-line Property Comments** (from `src/types/sdk-primitives.ts`):
```typescript
export interface Tool {
  /** Tool name (must be unique within an agent) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
}
```

### 5. Discriminated Union Documentation

**Status Type as Discriminant** (from `src/types/agent.ts`, lines 96-100):
```typescript
/**
 * Status of an agent response
 * Used as discriminant for type narrowing
 */
export type AgentResponseStatus = 'success' | 'error' | 'partial';
```

## Patterns for AgentResponse Types

The AgentResponse types demonstrate the most comprehensive JSDoc patterns in the codebase:

1. **Template Documentation**: Uses `@template` for generic types
2. **Discriminated Union Documentation**: Clearly explains the status discriminant
3. **Factory Function Documentation**: Complete with `@param`, `@returns`, and `@example`
4. **Type Guard Documentation**: Explains type narrowing behavior with examples
5. **Error Code Documentation**: Constants with SCREAMING_SNAKE_CASE convention

## Recommendations

Based on existing patterns, comprehensive JSDoc for AgentResponse should include:

1. **Interface-Level Documentation**: Description of purpose, template information, and cross-references
2. **Property Documentation**: Clear descriptions of each property's purpose and constraints
3. **Usage Examples**: Type narrowing, error handling, and metadata access patterns
4. **Cross-references**: `@see` tags to related types and utilities
5. **PRD Compliance**: Explicit references to PRD section 6 requirements

## Codebase Files with Excellent JSDoc Examples

| File | Lines | Content |
|------|-------|---------|
| `src/types/agent.ts` | 96-359 | AgentResponse types with factory functions and type guards |
| `src/types/sdk-primitives.ts` | 11-50 | Interface properties with inline comments |
| `src/core/agent.ts` | 110-160 | Method documentation with parameters and returns |
| `src/types/workflow-context.ts` | 98-106 | Multi-line descriptions with usage context |
| `src/types/prompt.ts` | 10-12 | Template documentation |
