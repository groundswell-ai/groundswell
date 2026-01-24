# Cache Compatibility Research for AgentResponse Refactoring

**Date:** 2025-01-24
**Task:** P1M1T1S3 - Analyze cache compatibility for AgentResponse refactoring
**Status:** Complete

---

## Executive Summary

The cache implementation is **fully compatible** with storing `AgentResponse<T>` instead of `PromptResult<T>`. The cache is generic (`LLMCache<T = unknown>`) and type-agnostic at runtime, storing any serializable JavaScript object. No migration strategy is required for cached data since both types are plain JavaScript objects with similar structure.

**Key Finding:** The cache requires no structural changes, only type annotations need updating.

---

## Current Cache Implementation

### Location
`/home/dustin/projects/groundswell/src/cache/cache.ts`

### Cache Type
```typescript
export class LLMCache<T = unknown> {
  private readonly cache: LRUCache<string, CacheEntry<T>>;
  // ...
}
```

The cache is **generic** and **type-agnostic** at runtime. It stores any value of type `T` using JSON serialization for size calculation.

### Storage Mechanism
```typescript
interface CacheEntry<T> {
  value: T;
  prefix?: string;
}
```

The cache wraps values in a `CacheEntry` for internal bookkeeping (prefix tracking), but stores the raw value directly without transformation.

---

## Current Cache Usage: PromptResult<T>

### Definition
**Location:** `/home/dustin/projects/groundswell/src/core/agent.ts:31-40`

```typescript
export interface PromptResult<T> {
  /** Validated response data */
  data: T;
  /** Token usage from the API */
  usage: TokenUsage;
  /** Total duration in milliseconds */
  duration: number;
  /** Number of tool invocations */
  toolCalls: number;
}
```

### Cache Storage Point
**Location:** `/home/dustin/projects/groundswell/src/core/agent.ts:420`

```typescript
// Store in cache if enabled
if (cacheEnabled && cacheKey) {
  await defaultCache.set(cacheKey, result, { prefix: this.id });
}
```

### Cache Retrieval Point
**Location:** `/home/dustin/projects/groundswell/src/core/agent.ts:221`

```typescript
const cached = await defaultCache.get(cacheKey) as PromptResult<T> | undefined;
if (cached) {
  // Emit cache hit event
  // ...
  return cached;  // Returns PromptResult<T> directly
}
```

**Important:** The cached value is **returned directly without validation**. No schema checking, type guards, or runtime validation occurs.

---

## Proposed Type: AgentResponse<T>

### Definition
**Location:** `/home/dustin/projects/groundswell/src/types/agent.ts:108-120`

```typescript
export interface AgentResponse<T = unknown> {
  /** Response status - use as discriminant for type narrowing */
  status: AgentResponseStatus;

  /** Response data - null for error responses */
  data: T | null;

  /** Error details - null for success/partial responses */
  error: AgentErrorDetails | null;

  /** Response metadata */
  metadata: AgentResponseMetadata;
}
```

### Metadata Structure
```typescript
export interface AgentResponseMetadata {
  /** Agent identifier (required) */
  agentId: string;

  /** Unix timestamp in milliseconds (required) */
  timestamp: number;

  /** Execution duration in milliseconds (optional) */
  duration?: number | null;

  /** Request correlation ID (optional) */
  requestId?: string | null;
}
```

---

## Compatibility Analysis

### Structural Comparison

| Feature | PromptResult<T> | AgentResponse<T> | Impact |
|---------|----------------|------------------|---------|
| Data field | `data: T` | `data: T \| null` | Compatible (T is subset of T\|null) |
| Duration | `duration: number` | `metadata.duration?: number \| null` | Compatible (optional) |
| Token usage | `usage: TokenUsage` | Not present | **Breaking change** |
| Tool calls | `toolCalls: number` | Not present | **Breaking change** |
| Status | Not present | `status: AgentResponseStatus` | New field |
| Error | Not present | `error: AgentErrorDetails \| null` | New field |
| Metadata | Not present | `metadata: AgentResponseMetadata` | New field |

### Critical Issue: Missing Fields

`AgentResponse<T>` does **NOT** include:
- `usage: TokenUsage` - Input/output token counts
- `toolCalls: number` - Number of tool invocations

These fields are currently:
1. Stored in cache
2. Returned to callers of `promptWithMetadata()`
3. Potentially used by consumers

**Resolution Required:** Either add these fields to `AgentResponse` metadata or deprecate their use.

### Cache Validation

**Current Behavior:**
- Cache retrieves and returns values **without any validation**
- Type assertion is used: `as PromptResult<T> | undefined`
- Runtime type checking: **None**
- Schema validation: **None**

**Implication:** When switching to `AgentResponse<T>`, the cache will happily return old `PromptResult<T>` objects as if they were `AgentResponse<T>`. This will cause runtime errors when code tries to access missing fields like `status`, `error`, or `metadata`.

---

## Required Changes

### 1. Type Annotation Updates

**File:** `/home/dustin/projects/groundswell/src/core/agent.ts`

**Line 221** - Cache retrieval:
```typescript
// Before:
const cached = await defaultCache.get(cacheKey) as PromptResult<T> | undefined;

// After:
const cached = await defaultCache.get(cacheKey) as AgentResponse<T> | undefined;
```

### 2. Cache Key Generation

**File:** `/home/dustin/projects/groundswell/src/cache/cache-key.ts`

**Status:** **NO CHANGES REQUIRED**

Cache key generation depends only on **inputs** (user message, data, system prompt, model, temperature, maxTokens, tools, mcps, skills, responseFormat). The **output format** does not affect cache key generation.

### 3. Storage Point Updates

**File:** `/home/dustin/projects/groundswell/src/core/agent.ts`

**Line 420** - Cache storage:
```typescript
// Before:
const result: PromptResult<T> = {
  data: validated,
  usage: totalUsage,
  duration,
  toolCalls: toolCallCount,
};
await defaultCache.set(cacheKey, result, { prefix: this.id });

// After (assuming usage/toolCalls moved to metadata):
const result: AgentResponse<T> = createSuccessResponse(validated, {
  agentId: this.id,
  timestamp: Date.now(),
  duration,
  // Add usage and toolCalls to metadata if still needed
  usage: totalUsage,
  toolCalls: toolCallCount,
});
await defaultCache.set(cacheKey, result, { prefix: this.id });
```

### 4. Migration Strategy

**Recommended Approach: Cache Invalidation**

Since the cache is **ephemeral** (in-memory, LRU, TTL-based), the simplest and safest approach is:

1. **Don't migrate cached data** - it's not persisted to disk
2. **Invalidate existing cache** on deployment
3. **Let new entries use AgentResponse<T>**

**Implementation:**
```typescript
// Add version check to Agent.executePrompt()
private async executePrompt<T>(...): Promise<AgentResponse<T>> {
  // Check if cached entry is old format
  const cached = await defaultCache.get(cacheKey) as AgentResponse<T> | PromptResult<T> | undefined;
  if (cached) {
    // Check for old format by checking for 'status' field
    if ('status' in cached) {
      // New format - AgentResponse<T>
      return cached as AgentResponse<T>;
    } else {
      // Old format - PromptResult<T> - ignore and re-execute
      // Emit cache miss event for metrics accuracy
      this.emitWorkflowEvent({
        type: 'cacheMiss',
        key: cacheKey,
        reason: 'format-mismatch',
        node: ctx.workflowNode,
      });
      // Fall through to execute prompt
    }
  }
  // ... execute prompt and store new AgentResponse format
}
```

**Alternative: Runtime Adapter**

If you want to support mixed formats during transition:

```typescript
function adaptPromptResultToAgentResponse<T>(
  result: PromptResult<T> | AgentResponse<T>
): AgentResponse<T> {
  if ('status' in result) {
    // Already AgentResponse
    return result as AgentResponse<T>;
  }

  // Adapt PromptResult to AgentResponse
  return createSuccessResponse(result.data, {
    agentId: 'unknown',  // Not available in PromptResult
    timestamp: Date.now(),  // Not available in PromptResult
    duration: result.duration,
    // Preserve usage/toolCalls if extended metadata
    usage: result.usage,
    toolCalls: result.toolCalls,
  });
}
```

---

## Cache Return Locations Requiring Updates

All locations where `cache.get()` returns data that needs wrapping:

### 1. Agent.executePrompt() - Primary Location
**File:** `/home/dustin/projects/groundswell/src/core/agent.ts:221`

```typescript
const cached = await defaultCache.get(cacheKey) as PromptResult<T> | undefined;
```

**Change to:**
```typescript
const cached = await defaultCache.get(cacheKey) as AgentResponse<T> | undefined;
// Add format check (see Migration Strategy above)
```

### 2. Introspection Tools
**File:** `/home/dustin/projects/groundswell/src/tools/introspection.ts:365`

```typescript
const exists = defaultCache.has(input.promptHash);
```

**Status:** **NO CHANGE REQUIRED** - Only checks existence, doesn't retrieve value.

### 3. Test Files
**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/introspection-tools.test.ts:227`

```typescript
await defaultCache.set('test-key', { data: 'test' });
```

**Status:** Update test data to match `AgentResponse` format.

---

## Migration Checklist

- [ ] **Decision Required:** Determine if `usage` and `toolCalls` fields should be added to `AgentResponse` metadata
- [ ] **Update Type Annotations:** Change `PromptResult<T>` to `AgentResponse<T>` in cache get/set calls
- [ ] **Update Factory Functions:** Modify `createSuccessResponse()` to accept `usage` and `toolCalls` if needed
- [ ] **Add Format Detection:** Implement runtime check for old vs new cache format (recommended)
- [ ] **Update Tests:** Modify test files to use `AgentResponse` format
- [ ] **Update Documentation:** Document cache key generation remains unchanged
- [ ] **Consider Versioning:** Add cache format version to enable smoother future migrations

---

## Recommendations

### 1. Add Missing Fields to AgentResponse
```typescript
export interface AgentResponseMetadata {
  agentId: string;
  timestamp: number;
  duration?: number | null;
  requestId?: string | null;

  // ADD THESE FIELDS:
  /** Token usage from the API */
  usage?: TokenUsage;
  /** Number of tool invocations */
  toolCalls?: number;
}
```

**Rationale:** Maintains feature parity with `PromptResult`, prevents data loss.

### 2. Implement Cache Format Versioning
```typescript
// In cache-key.ts
export interface CacheKeyInputs {
  // ... existing fields
  cacheFormat?: string;  // e.g., 'v1' for PromptResult, 'v2' for AgentResponse
}

// Current implementation uses 'v1' implicitly
// Update to 'v2' when switching to AgentResponse
```

**Rationale:** Prevents cache hits between incompatible formats, cleaner migration path.

### 3. Add Cache Metrics for Format Mismatches
```typescript
// In workflow events
{
  type: 'cacheMiss',
  key: cacheKey,
  reason: 'format-mismatch',  // NEW: Distinguish from regular misses
  node: ctx.workflowNode,
}
```

**Rationale:** Provides visibility into migration progress and cache effectiveness.

### 4. No Persistent Migration Required
Since the cache is in-memory and ephemeral:
- Old `PromptResult<T>` entries will naturally expire via TTL
- LRU eviction will remove old entries as cache fills
- No disk persistence means no data migration scripts needed
- Simply let the cache turn over naturally

---

## Conclusion

The cache implementation requires **minimal structural changes** but **careful type handling** during the transition from `PromptResult<T>` to `AgentResponse<T>`.

**Key Points:**
1. Cache is type-agnostic and can store `AgentResponse<T>` without changes
2. Cache key generation is unaffected (depends only on inputs)
3. Missing fields (`usage`, `toolCalls`) must be addressed
4. No validation occurs on cache retrieval - runtime format checks recommended
5. Ephemeral cache means no persistent migration needed
6. Format detection or cache invalidation recommended for smooth transition

**Risk Level:** LOW - Cache is ephemeral, changes are localized to type annotations and factory functions.

**Effort Estimate:** 2-4 hours
- Type updates: 30 minutes
- Adding missing fields to metadata: 30 minutes
- Format detection implementation: 1 hour
- Test updates: 1 hour
- Documentation: 30 minutes
