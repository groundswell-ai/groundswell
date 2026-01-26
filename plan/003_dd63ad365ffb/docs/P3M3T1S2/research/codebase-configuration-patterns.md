# Codebase Configuration Patterns Analysis

## Executive Summary

This document analyzes the configuration patterns in the Groundswell codebase to inform the implementation of event history configuration (P3.M3.T1.S2).

## Key Findings

### 1. WorkflowConfig Pattern

**File**: `src/types/workflow-context.ts` (lines 145-189)

```typescript
export interface WorkflowConfig {
  /** Human-readable workflow name */
  name?: string;

  /** Enable reflection for this workflow */
  enableReflection?: boolean;

  /** Automatically validate AgentResponse results after agent.prompt() calls */
  autoValidateResponses?: boolean;

  /**
   * Strategy for merging multiple errors
   * @remarks
   * When provided, enables workflow-level error merge for multiple failures.
   * Default: undefined (first error wins behavior).
   */
  errorMergeStrategy?: ErrorMergeStrategy;
}
```

**Pattern Characteristics**:
- Uses optional properties with `?` suffix
- Clear JSDoc with examples
- Supports complex nested configuration objects
- Boolean flags use `enable*` prefix
- Numeric limits use `max*` prefix
- Time-based values use `*Ms` suffix (milliseconds)

### 2. Similar Configuration Patterns

#### StepOptions Pattern (`src/types/decorators.ts`)
```typescript
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;
  restartable?: boolean;
  maxRetries?: number;        // Numeric limit
  retryDelayMs?: number;      // Time-based (ms)
}
```

#### ProviderOptions Pattern (`src/types/providers.ts`)
```typescript
export interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  sessionPersistence?: 'memory' | 'file' | 'redis';
  sessionTtl?: number;        // Time-based (ms)
}
```

#### CacheConfig Pattern (`src/cache/cache.ts`)
```typescript
export interface CacheConfig {
  maxItems?: number;          // Count limit
  maxSizeBytes?: number;      // Size limit
  defaultTTLMs?: number;      // Time-based (ms)
}
```

### 3. Default Value Patterns

#### Constructor Pattern (`src/core/workflow.ts`)
```typescript
constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>) {
  // Parse overloaded arguments
  if (typeof name === 'object' && name !== null) {
    // Functional pattern: constructor(config, executor)
    this.config = name;
    this.executor = parentOrExecutor as WorkflowExecutor<T>;
    this.parent = null;
  } else {
    // Class-based pattern: constructor(name, parent)
    this.config = { name: name ?? this.constructor.name };
    this.parent = (parentOrExecutor as Workflow) ?? null;
  }
  // ...
}
```

#### Usage in Code (`src/core/workflow.ts`)
```typescript
// Boolean flag check
if (this.config.enableReflection) {
  // Enable reflection
}

// Optional nested object with defaults
if (this.config.errorMergeStrategy?.enabled) {
  // Merge errors
  const mergedError = this.config.errorMergeStrategy?.combine
    ? this.config.errorMergeStrategy.combine(this.collectedErrors)
    : mergeWorkflowErrors(this.collectedErrors, ...);
}
```

### 4. JSDoc Pattern Template

```typescript
/**
 * Feature configuration description
 *
 * @remarks
 * Additional context about when and how to use this feature.
 * Default: undefined (default behavior description).
 *
 * @example
 * ```ts
 * // Basic usage with default settings
 * const config: WorkflowConfig = {
 *   name: 'MyWorkflow',
 *   feature: { enabled: true }
 * };
 *
 * // Advanced usage with custom settings
 * const config: WorkflowConfig = {
 *   name: 'MyWorkflow',
 *   feature: {
 *     enabled: true,
 *     maxItems: 1000,
 *     maxAgeMs: 3600000
 *   }
 * };
 * ```
 */
```

### 5. Naming Conventions

| Concept | Pattern | Example |
|---------|---------|---------|
| Boolean enable flag | `enable*` | `enableReflection`, `enableCache` |
| Boolean feature flag | `auto*` or `*` | `autoValidateResponses`, `restartable` |
| Numeric count limit | `max*` | `maxRetries`, `maxItems`, `maxTokens` |
| Numeric size limit | `maxSize*` | `maxSizeBytes` |
| Time duration | `*Ms` | `retryDelayMs`, `sessionTtl`, `defaultTTLMs` |
| Timeout | `timeout` | `timeout` |

### 6. Workflow Constructor Overload Pattern

The Workflow class supports two patterns:

**Class-based pattern:**
```typescript
class MyWorkflow extends Workflow {
  async run() { /* ... */ }
}
const workflow = new MyWorkflow('MyWorkflow', parentWorkflow);
```

**Functional pattern:**
```typescript
const workflow = new Workflow({
  name: 'MyWorkflow',
  enableReflection: true
}, async (ctx) => {
  await ctx.step('step1', async () => { /* ... */ });
});
```

### 7. Integration with Existing Event System

**Event Storage (from P3.M3.T1.S1 PRP):**
- Private field: `#eventHistory: WorkflowEvent[]`
- Events pushed in `emitEvent()` method (line 498 in workflow.ts)
- Events stored before observer notification

**Event Types (from `src/types/events.ts`):**
- Most events do NOT have timestamps
- Only timestamped events: `stepRetry`, `stepRestarted`, `invalidResponse`
- For time-based filtering, need to add timestamps to events or use a different approach

### 8. Recommendations for Event History Configuration

Based on the codebase patterns:

1. **Interface Name**: `EventHistoryConfig`
2. **Property Name in WorkflowConfig**: `eventHistory?: EventHistoryConfig`
3. **Property Naming**:
   - `enabled?: boolean` (not `enableEventHistory`)
   - `maxEvents?: number` (count limit, not `maxItems`)
   - `maxAgeMs?: number` (time-based limit)
4. **Default Values**:
   - `enabled: false` (disabled by default)
   - `maxEvents: 1000`
   - `maxAgeMs: 3600000` (1 hour)
5. **JSDoc**: Follow the comprehensive template with examples

### 9. Implementation Considerations

**From P3.M3.T1.S1 PRP:**
- Event history is already implemented with `#eventHistory` field
- Events are unbounded (no limits yet)
- Need to add conditional storage based on `enabled` flag
- Need to implement trimming based on `maxEvents` and `maxAgeMs`

**Key Constraint**: Most WorkflowEvent types don't have timestamps. For `maxAgeMs` filtering:
- Option A: Add timestamp to all events (breaking change)
- Option B: Track event insertion time separately
- Option C: Use a different approach (only trim by count, or add metadata wrapper)

**Recommended Approach**: Track insertion time separately in a parallel array or use a metadata wrapper for event history entries.
