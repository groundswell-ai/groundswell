# JSDoc Patterns in Groundswell Codebase

## Summary

This document catalogs the JSDoc patterns and conventions used throughout the Groundswell codebase for documenting default parameter values. These patterns inform the PRP for updating the `trackTiming` JSDoc.

## Patterns Found

### 1. Inline Default in Property Description (Most Common Pattern)

**File**: `src/types/decorators.ts`
**Lines 13, 19, 21, 23**

```typescript
/** Track and emit step duration (default: true) */
trackTiming?: boolean;

/** If true, step can be restarted on failure (default: false) */
restartable?: boolean;

/** Maximum number of retry attempts (default: 3) */
maxRetries?: number;

/** Delay between retry attempts in milliseconds (default: 1000) */
retryDelayMs?: number;
```

**Pattern**: `(default: value)` parenthetical notation in the description.

### 2. "Default:" Prefix in Description

**File**: `src/types/providers.ts`
**Lines 91-92, 102-103**

```typescript
* Sessions expire after this duration. Default: 86400000 (24 hours).
```

**Pattern**: `Default: value` with additional context in description.

### 3. @default Tag (Standard JSDoc)

**File**: `src/types/agent.ts`
**Line 84**

```typescript
* @default "claude-sonnet-4-20250514"
```

**Pattern**: Standard `@default` tag with exact value.

### 4. "defaults to" Phrasing

**File**: `src/utils/agent-validation.ts`
**Line 48**

```typescript
* @param dataSchema - The Zod schema for the response data (defaults to z.unknown())
```

**File**: `src/core/workflow.ts`
**Line 104**

```typescript
* @param name Human-readable name (defaults to class name)
```

**Pattern**: `defaults to value` phrasing in descriptions.

### 5. @param with Default in Description

**File**: `src/types/agent.ts`
**Line 730**

```typescript
* @param recoverable - Whether the error is recoverable (default: false)
```

**File**: `src/utils/model-spec.ts`
**Line 67**

```typescript
* @param defaultProvider - Default provider to use when none specified (default: 'anthropic')
```

**Pattern**: `(default: value)` in @param description.

### 6. Default Value in JSON Schema Descriptions

**File**: `src/tools/introspection.ts`
**Lines 119, 158, 162**

```typescript
description: 'Maximum ancestors to return (default: all)',
description: 'Specific node ID to inspect (default: most recent)',
description: 'Number of prior outputs to return (default: 1)',
```

**Pattern**: `(default: value)` for schema property descriptions.

### 7. Default with Behavioral Context

**File**: `src/types/error-strategy.ts`
**Line 7**

```typescript
/** Enable error merging (default: false, first error wins) */
enabled: boolean;
```

**Pattern**: Default value plus explanation of default behavior.

## Recommended Pattern for trackTiming Update

Based on the codebase analysis, the most common and clearest pattern for boolean defaults in property descriptions is:

```typescript
/** Track and emit step duration (default: true, tracked unless explicitly set to false) */
trackTiming?: boolean;
```

This pattern:
1. Uses the common `(default: true)` notation
2. Adds clarifying text about the "opt-out" behavior
3. Follows the pattern seen in `error-strategy.ts` line 7 (default value plus behavioral context)

## Files Analyzed

1. `src/types/decorators.ts` - StepOptions interface
2. `src/types/providers.ts` - Provider configuration
3. `src/types/agent.ts` - Agent types
4. `src/types/error-strategy.ts` - Error strategy types
5. `src/utils/agent-validation.ts` - Validation utilities
6. `src/core/workflow.ts` - Workflow class
7. `src/utils/model-spec.ts` - Model specification
8. `src/tools/introspection.ts` - Introspection tools
9. `src/types/reflection.ts` - Reflection types
