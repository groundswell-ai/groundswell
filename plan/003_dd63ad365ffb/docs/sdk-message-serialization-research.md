# SDK Message Serialization Research

**Research Date:** January 26, 2026
**Focus:** Serialization patterns for @anthropic-ai/claude-agent-sdk message types
**Purpose:** Understanding SDK message structures, circular reference issues, and best practices for serializing SDKUserMessage and SDKResultMessage

---

## Executive Summary

This research document consolidates findings on serialization patterns for `@anthropic-ai/claude-agent-sdk` message types, specifically `SDKUserMessage` and `SDKResultMessage`. The research covers SDK message type structures, potential serialization issues, external best practices, and recommended approaches for implementing robust serialization.

**Key Findings:**
1. **SDK Message Types are Plain Objects**: SDKUserMessage and SDKResultMessage are serializable TypeScript interfaces with no built-in circular references
2. **Nested API Message Types**: Both types contain nested Anthropic API message objects that require validation
3. **No Built-in Serialization**: The SDK does not provide built-in serialization methods - applications must implement their own
4. **Session Management Use Case**: Primary serialization use case is session persistence in storage backends
5. **Established Patterns**: Groundswell codebase has existing serialization patterns for handling circular references

---

## Table of Contents

1. [SDK Message Type Structures](#1-sdk-message-type-structures)
2. [Potential Serialization Issues](#2-potential-serialization-issues)
3. [External Documentation URLs](#3-external-documentation-urls)
4. [Best Practices for TypeScript Serialization](#4-best-practices-for-typescript-serialization)
5. [Recommended Serialization Approaches](#5-recommended-serialization-approaches)
6. [Code Examples](#6-code-examples)
7. [Known Issues and Gotchas](#7-known-issues-and-gotchas)

---

## 1. SDK Message Type Structures

### 1.1 SDKUserMessage Structure

**Location:** `/home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts` (lines 396-426)

```typescript
export type SDKUserMessage = SDKUserMessageContent & {
  uuid?: UUID;
  session_id: string;
};

type SDKUserMessageContent = {
  type: 'user';
  message: APIUserMessage;  // Nested Anthropic API message
  parent_tool_use_id: string | null;
  isSynthetic?: boolean;
  tool_use_result?: unknown;
};
```

**Key Properties:**
- `type`: Always 'user'
- `message`: Anthropic API UserMessage (from `@anthropic-ai/sdk/resources`)
- `parent_tool_use_id`: Reference to parent tool use (string or null)
- `isSynthetic`: Boolean flag for system-generated messages
- `tool_use_result`: Optional tool execution result
- `uuid`: Optional unique identifier
- `session_id`: Session identifier (required)

**Serialization Characteristics:**
- ✅ All properties are JSON-serializable primitives
- ✅ No circular references in base structure
- ⚠️ Nested `APIUserMessage` may contain complex content arrays
- ⚠️ `tool_use_result` is `unknown` type - requires validation

### 1.2 SDKResultMessage Structure

**Location:** `/home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts` (lines 441-474)

```typescript
export type SDKResultMessage = {
  type: 'result';
  subtype: 'success';
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  num_turns: number;
  result: string;
  total_cost_usd: number;
  usage: NonNullableUsage;
  modelUsage: {
    [modelName: string]: ModelUsage;
  };
  permission_denials: SDKPermissionDenial[];
  structured_output?: unknown;
  uuid: UUID;
  session_id: string;
} | {
  type: 'result';
  subtype: 'error_during_execution' | 'error_max_turns' | 'error_max_budget_usd' | 'error_max_structured_output_retries';
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  num_turns: number;
  total_cost_usd: number;
  usage: NonNullableUsage;
  modelUsage: {
    [modelName: string]: ModelUsage;
  };
  permission_denials: SDKPermissionDenial[];
  errors: string[];
  uuid: UUID;
  session_id: string;
};
```

**Key Properties (Success Variant):**
- `type`: Always 'result'
- `subtype': 'success' or error type
- `duration_ms`, `duration_api_ms`: Timing metrics
- `is_error`: Boolean error flag
- `num_turns`: Conversation turn count
- `result`: String result content
- `total_cost_usd`: Cost calculation
- `usage`: Token usage information
- `modelUsage`: Per-model usage metrics
- `permission_denials`: Array of permission denial records
- `structured_output`: Optional structured data (unknown type)
- `uuid`: Unique identifier
- `session_id`: Session identifier

**Serialization Characteristics:**
- ✅ All properties are JSON-serializable primitives
- ✅ Discriminated union (type-safe)
- ✅ No circular references
- ⚠️ `structured_output` is `unknown` type - requires validation
- ⚠️ `modelUsage` is dictionary with dynamic keys

### 1.3 Related SDK Types

**NonNullableUsage:**
```typescript
export type NonNullableUsage = {
  [K in keyof Usage]: NonNullable<Usage[K]>;
};

// Usage contains token counts
type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};
```

**ModelUsage:**
```typescript
export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
};
```

**SDKPermissionDenial:**
```typescript
export type SDKPermissionDenial = {
  tool_name: string;
  tool_use_id: string;
  tool_input: Record<string, unknown>;
};
```

---

## 2. Potential Serialization Issues

### 2.1 Circular Reference Analysis

**Finding:** ✅ **No circular references found in SDK message types**

Analysis of SDK type definitions shows:
- `SDKUserMessage` does not reference itself or `SDKResultMessage`
- `SDKResultMessage` does not reference `SDKUserMessage`
- Both types contain only primitive properties and nested API types
- No parent/child relationships between messages

**Conclusion:** Circular references are NOT a concern for SDK message serialization.

### 2.2 Non-Serializable Properties

**Finding:** ⚠️ **Potential issues with nested `unknown` types**

1. **`tool_use_result?: unknown`** in SDKUserMessage
   - Could contain non-serializable objects (functions, Symbols, etc.)
   - Requires runtime validation before serialization

2. **`structured_output?: unknown`** in SDKResultMessage
   - Could contain arbitrary data structures
   - May include circular references from application code
   - Requires sanitization before serialization

**Recommendation:** Implement custom replacer function to handle `unknown` fields.

### 2.3 API Message Content Complexity

**Finding:** ⚠️ **Nested `APIUserMessage` may contain complex content**

```typescript
type APIUserMessage = {
  role: 'user';
  content: string | Array<ContentBlock>;  // Can be complex array
};

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: ImageSource }
  | { type: 'tool_use'; ... }
  | { type: 'tool_result'; ... }
  | ... (10+ content block types)
```

**Potential Issues:**
- Image blocks may contain binary data (base64 or URLs)
- Tool results may contain nested objects
- Content blocks can be deeply nested arrays

**Recommendation:** Validate content block structure during serialization.

### 2.4 SessionState Aggregation

**Finding:** ⚠️ **SessionState aggregates messages into arrays**

```typescript
// From Groundswell SessionState interface
interface SessionState {
  history: SDKUserMessage[];  // Array of messages
  lastResult: SDKResultMessage | null;
}
```

**Serialization Considerations:**
- Arrays can grow large (memory concerns)
- No built-in deduplication
- All messages serialized together
- May hit JSON string length limits

**Recommendation:** Implement message pruning/compaction for long sessions.

---

## 3. External Documentation URLs

### 3.1 Official SDK Documentation

**Anthropic Agent SDK:**
- **NPM Package:** https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- **GitHub Repository:** https://github.com/anthropics/claude-agent-sdk-typescript
- **Messages API:** https://docs.anthropic.com/en/api/messages
- **Agent SDK Documentation:** https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk

**Anthropic TypeScript SDK:**
- **NPM Package:** https://www.npmjs.com/package/@anthropic-ai/sdk
- **GitHub Repository:** https://github.com/anthropics/anthropic-sdk-typescript
- **Type Definitions:** https://github.com/anthropics/anthropic-sdk-typescript/blob/main/src/resources/messages/messages.ts

### 3.2 TypeScript/JavaScript Serialization Resources

**MDN Documentation:**
- **JSON.stringify():** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
- **JSON.parse():** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
- **Structured Clone Algorithm:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm

**TypeScript Deep Dive:**
- **JSON Serialization:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#mapping-types
- **Type Guards:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

### 3.3 Serialization Libraries

**flatted** (Circular JSON):
- **NPM:** https://www.npmjs.com/package/flatted
- **GitHub:** https://github.com/WebReflection/flatted
- **Use Case:** Handling circular references in JSON

**superjson** (JavaScript Serialization):
- **NPM:** https://www.npmjs.com/package/superjson
- **GitHub:** https://github.com/blitz-js/superjson
- **Use Case:** Preserve JavaScript types during serialization

**json-stringify-safe** (Safe JSON stringify):
- **NPM:** https://www.npmjs.com/package/json-stringify-safe
- **GitHub:** https://github.com/moll/json-stringify-safe
- **Use Case:** Prevent circular reference errors

### 3.4 Groundswell Documentation

**Session Management:**
- **LLM SDK Session Best Practices:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/llm-sdk-session-management-best-practices.md`
- **Session Store Implementation:** `/home/dustin/projects/groundswell/src/providers/session-store.ts`

**Serialization Patterns:**
- **WorkflowEvent Serialization:** `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M1T2S1/research/02-workflowevent-serialization.md`
- **Cache Key Generation:** `/home/dustin/projects/groundswell/src/cache/cache-key.ts`

---

## 4. Best Practices for TypeScript Serialization

### 4.1 Type-Safe Serialization

**Pattern 1: Custom `toJSON()` Method**

```typescript
interface Serializable {
  toJSON(): unknown;
}

class SessionState implements Serializable {
  history: SDKUserMessage[];
  lastResult: SDKResultMessage | null;

  toJSON(): unknown {
    return {
      history: this.history.map(msg => sanitizeSDKUserMessage(msg)),
      lastResult: this.lastResult ? sanitizeSDKResultMessage(this.lastResult) : null,
    };
  }
}
```

**Pattern 2: Type Guard Validation**

```typescript
function isSDKUserMessage(obj: unknown): obj is SDKUserMessage {
  return (
    typeof obj === 'object' && obj !== null &&
    'type' in obj && obj.type === 'user' &&
    'session_id' in obj && typeof obj.session_id === 'string' &&
    'message' in obj && typeof obj.message === 'object'
  );
}

function safeParseUserMessage(json: string): SDKUserMessage | null {
  try {
    const parsed = JSON.parse(json);
    return isSDKUserMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
```

### 4.2 Handling Unknown Types

**Pattern 1: Replacer Function**

```typescript
function safeReplacer(key: string, value: unknown): unknown {
  // Handle unknown types
  if (key === 'tool_use_result' || key === 'structured_output') {
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (typeof value === 'symbol') {
      return '[Symbol]';
    }
    // Check for circular references
    if (typeof value === 'object' && value !== null) {
      if (this.has?.(value)) {
        return '[Circular]';
      }
      this.add?.(value);
    }
  }
  return value;
}

// Usage with WeakSet for cycle detection
const seen = new WeakSet();
JSON.stringify(message, function(key, value) {
  return safeReplacer.call(seen, key, value);
}, 2);
```

**Pattern 2: Schema Validation**

```typescript
import { z } from 'zod';

const ToolUseResultSchema = z.object({
  content: z.string(),
  isError: z.boolean().optional(),
});

function sanitizeUnknownField(value: unknown): unknown {
  const result = ToolUseResultSchema.safeParse(value);
  return result.success ? result.data : null;
}
```

### 4.3 Memory Management

**Pattern 1: Message Pruning**

```typescript
interface SessionState {
  history: SDKUserMessage[];
  maxHistorySize: number;
}

function pruneHistory(session: SessionState): void {
  if (session.history.length > session.maxHistorySize) {
    // Keep only the most recent messages
    session.history = session.history.slice(-session.maxHistorySize);
  }
}
```

**Pattern 2: Token-Based Pruning**

```typescript
function countTokens(message: SDKUserMessage): number {
  // Rough estimation: ~4 chars per token
  return JSON.stringify(message.message).length / 4;
}

function pruneByTokens(session: SessionState, maxTokens: number): void {
  let totalTokens = 0;
  const keepMessages: SDKUserMessage[] = [];

  // Iterate from newest to oldest
  for (let i = session.history.length - 1; i >= 0; i--) {
    const msg = session.history[i];
    const tokens = countTokens(msg);

    if (totalTokens + tokens <= maxTokens) {
      keepMessages.unshift(msg);
      totalTokens += tokens;
    } else {
      break;
    }
  }

  session.history = keepMessages;
}
```

---

## 5. Recommended Serialization Approaches

### 5.1 Direct JSON.stringify (Simple Use Case)

**Use When:**
- Messages contain only primitive data
- No custom objects in `unknown` fields
- Session history is small (< 100 messages)

**Implementation:**
```typescript
// Simple serialization
function serializeSession(session: SessionState): string {
  return JSON.stringify(session, null, 2);
}

// Simple deserialization
function deserializeSession(json: string): SessionState {
  return JSON.parse(json) as SessionState;
}
```

**Pros:**
- Simple, built-in
- Fast for small datasets
- Human-readable output

**Cons:**
- No validation
- Fails on circular references
- No handling of special types

### 5.2 Custom Replacer Function (Recommended)

**Use When:**
- Messages may contain circular references
- Unknown fields need sanitization
- Want to preserve as much data as possible

**Implementation:**
```typescript
function createSerializer() {
  const seen = new WeakSet();

  return function replacer(key: string, value: unknown): unknown {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return `[Circular:${key}]`;
      }
      seen.add(value);
    }

    // Handle functions
    if (typeof value === 'function') {
      return `[Function:${key}]`;
    }

    // Handle symbols
    if (typeof value === 'symbol') {
      return `[Symbol:${key}]`;
    }

    // Handle undefined
    if (value === undefined) {
      return null;
    }

    return value;
  };
}

function serializeSession(session: SessionState): string {
  return JSON.stringify(session, createSerializer(), 2);
}
```

**Pros:**
- Handles circular references
- Sanitizes special types
- Preserves most data

**Cons:**
- Slightly slower than direct JSON.stringify
- May lose some type information

### 5.3 Schema-Based Serialization (Production-Grade)

**Use When:**
- Type safety is critical
- Need to validate external data
- Building production applications

**Implementation:**
```typescript
import { z } from 'zod';

// Define Zod schemas for SDK types
const SDKUserMessageSchema = z.object({
  type: z.literal('user'),
  message: z.object({
    role: z.literal('user'),
    content: z.any(),
  }),
  parent_tool_use_id: z.string().nullable(),
  isSynthetic: z.boolean().optional(),
  tool_use_result: z.unknown().optional(),
  uuid: z.string().uuid().optional(),
  session_id: z.string(),
});

const SessionStateSchema = z.object({
  history: z.array(SDKUserMessageSchema),
  lastResult: z.any().nullable(), // Would need full schema
});

function serializeSession(session: SessionState): string {
  // Validate before serializing
  const validated = SessionStateSchema.parse(session);
  return JSON.stringify(validated, null, 2);
}

function deserializeSession(json: string): SessionState {
  const parsed = JSON.parse(json);
  return SessionStateSchema.parse(parsed);
}
```

**Pros:**
- Full type validation
- Runtime type checking
- Clear error messages
- Best for production

**Cons:**
- Requires maintaining schemas
- Slight performance overhead
- More verbose code

---

## 6. Code Examples

### 6.1 Session Store Serialization

**File:** `/home/dustin/projects/groundswell/src/providers/session-store.ts` (lines 161-176)

```typescript
// Current implementation - direct JSON.stringify
async save(sessionId: string, state: T): Promise<void> {
  await this.ensureDirectory();

  const path = this.getPath(sessionId);
  const json = JSON.stringify(state, null, 2);  // Direct serialization
  const tempPath = `${path}.tmp`;

  try {
    // Atomic write: temp file + rename
    await writeFile(tempPath, json, 'utf-8');
    await writeFile(path, json, 'utf-8');
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    throw new Error(`Failed to save session: ${err.message}`);
  }
}
```

**Issue:** No handling of circular references or special types.

**Recommended Improvement:**
```typescript
async save(sessionId: string, state: T): Promise<void> {
  await this.ensureDirectory();

  const path = this.getPath(sessionId);

  // Use custom replacer for safety
  const json = JSON.stringify(state, this.createReplacer(), 2);
  const tempPath = `${path}.tmp`;

  try {
    await writeFile(tempPath, json, 'utf-8');
    await writeFile(path, json, 'utf-8');
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    throw new Error(`Failed to save session: ${err.message}`);
  }
}

private createReplacer(): (key: string, value: unknown) => unknown {
  const seen = new WeakSet();

  return (key: string, value: unknown) => {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return `[Circular:${key}]`;
      }
      seen.add(value);
    }

    // Handle functions and symbols
    if (typeof value === 'function' || typeof value === 'symbol') {
      return undefined;
    }

    return value;
  };
}
```

### 6.2 Message Collection Pattern

**From:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/llm-sdk-session-management-best-practices.md` (lines 304-336)

```typescript
interface MessageCollector {
  collect(generator: AsyncGenerator<SDKMessage>): Promise<{
    userMessages: SDKUserMessage[];
    resultMessage: SDKResultMessage;
  }>;
}

class SDKMessageCollector implements MessageCollector {
  async collect(generator: AsyncGenerator<SDKMessage>) {
    const userMessages: SDKUserMessage[] = [];
    let resultMessage: SDKResultMessage | null = null;

    for await (const message of generator) {
      // Collect user messages for history
      if (message.type === 'user') {
        userMessages.push(message);
      }

      // Capture final result
      if (message.type === 'result') {
        resultMessage = message as SDKResultMessage;
      }
    }

    if (!resultMessage) {
      throw new Error('No result message received');
    }

    return { userMessages, resultMessage };
  }
}
```

### 6.3 Cache Key Generation Pattern

**From:** `/home/dustin/projects/groundswell/src/cache/cache-key.ts` (lines 77-107)

```typescript
/**
 * Safely stringify a value for cache key generation
 *
 * Handles circular references, functions, and other non-serializable values.
 */
export function safeStringify(value: unknown): string {
  const seen = new WeakSet();

  function stringifyHelper(val: unknown): string {
    if (val === null) {
      return 'null';
    }

    if (val === undefined) {
      return 'undefined';
    }

    if (typeof val === 'function') {
      return '[Function]';
    }

    if (typeof val === 'symbol') {
      return '[Symbol]';
    }

    if (typeof val === 'object') {
      if (seen.has(val as object)) {
        return '[Circular]';
      }
      seen.add(val as object);

      if (Array.isArray(val)) {
        return `[${val.map(stringifyHelper).join(',')}]`;
      }

      const entries = Object.entries(val as Record<string, unknown>);
      const mapped = entries.map(([k, v]) => `"${k}":${stringifyHelper(v)}`);
      return `{${mapped.join(',')}}`;
    }

    return String(val);
  }

  return stringifyHelper(value);
}
```

---

## 7. Known Issues and Gotchas

### 7.1 SDK-Specific Issues

**Issue 1: No Built-in Serialization**
- **Problem:** SDK does not provide `.toJSON()` or serialization methods
- **Impact:** Applications must implement custom serialization
- **Solution:** Use one of the recommended approaches above

**Issue 2: Unknown Type Fields**
- **Problem:** `tool_use_result` and `structured_output` are `unknown` type
- **Impact:** Could contain non-serializable data from application code
- **Solution:** Implement sanitization in replacer function

**Issue 3: Version Compatibility**
- **Problem:** SDK message types may change between versions
- **Impact:** Serialized messages may not deserialize with newer SDK versions
- **Solution:** Version your serialized data and handle migrations

### 7.2 TypeScript-Specific Issues

**Issue 1: Type Information Lost**
- **Problem:** JSON serialization loses TypeScript type information
- **Impact:** Deserialized data is `unknown` without type guards
- **Solution:** Use Zod schemas or type guards for validation

**Issue 2: Date Objects**
- **Problem:** Date objects serialized as strings, not Dates
- **Impact:** `instanceof Date` checks fail after deserialization
- **Solution:** Use ISO string format or custom date serialization

**Issue 3: Undefined vs Null**
- **Problem:** `undefined` becomes `null` in JSON
- **Impact:** Optional fields may lose distinction
- **Solution:** Use `null` for absent values consistently

### 7.3 Runtime Issues

**Issue 1: Circular Reference Errors**
- **Problem:** `JSON.stringify()` throws on circular references
- **Impact:** Session save fails with `TypeError`
- **Solution:** Use WeakSet-based replacer function

**Issue 2: Large Session Files**
- **Problem:** Session history grows unbounded
- **Impact:** File size and performance degradation
- **Solution:** Implement message pruning/compaction

**Issue 3: Memory Leaks**
- **Problem:** Holding references to old session objects
- **Impact:** Memory usage grows over time
- **Solution:** Implement TTL expiration and LRU eviction

### 7.4 Groundswell-Specific Issues

**Issue 1: SessionState Interface**
- **Location:** `/home/dustin/projects/groundswell/src/types/providers.ts` (lines 64-70)
- **Problem:** Aggregates arrays of SDK messages
- **Impact:** Serialization complexity increases with array size
- **Solution:** Implement pagination or chunking for large sessions

**Issue 2: FileSessionStore Implementation**
- **Location:** `/home/dustin/projects/groundswell/src/providers/session-store.ts` (lines 161-176)
- **Problem:** Uses direct `JSON.stringify()` without replacer
- **Impact:** Fails if session contains circular references
- **Solution:** Add custom replacer function to `save()` method

**Issue 3: No Validation on Deserialization**
- **Location:** `/home/dustin/projects/groundswell/src/providers/session-store.ts` (line 183)
- **Problem:** `JSON.parse()` returns `unknown` type
- **Impact:** Type safety violated at runtime
- **Solution:** Add Zod schema validation or type guards

---

## 8. Recommendations

### 8.1 Immediate Actions

1. **Add Custom Replacer to FileSessionStore**
   - Implement circular reference handling
   - Sanitize `unknown` type fields
   - Handle special types (functions, symbols)

2. **Add Validation to Session Store**
   - Implement Zod schemas for SDK message types
   - Validate on deserialization
   - Provide clear error messages

3. **Document Serialization Behavior**
   - Add JSDoc comments explaining serialization format
   - Document version compatibility
   - Provide migration guide for format changes

### 8.2 Long-Term Improvements

1. **Implement Message Pruning**
   - Add max history size to SessionState
   - Implement token-based pruning
   - Add compaction for long sessions

2. **Add Session Versioning**
   - Include version number in serialized format
   - Handle backward compatibility
   - Provide migration utilities

3. **Consider Binary Serialization**
   - Evaluate MessagePack for smaller size
   - Consider Protocol Buffers for performance
   - Benchmark vs JSON for large sessions

### 8.3 Testing Strategy

1. **Unit Tests for Serialization**
   - Test circular reference handling
   - Test unknown type sanitization
   - Test with realistic message payloads

2. **Integration Tests for Session Store**
   - Test save/load round-trip
   - Test with large session histories
   - Test concurrent access patterns

3. **Adversarial Tests**
   - Test with malicious payloads
   - Test with deeply nested structures
   - Test with memory exhaustion scenarios

---

## 9. Conclusion

### Summary

SDK message types (`SDKUserMessage` and `SDKResultMessage`) are **generally serializable** with the following considerations:

✅ **Good News:**
- No circular references in base message types
- All properties are JSON-serializable primitives
- Type definitions are clear and well-structured

⚠️ **Caveats:**
- `unknown` type fields require sanitization
- Nested `APIUserMessage` can be complex
- No built-in SDK serialization methods

### Recommended Approach

**For Groundswell SessionStore:**

1. **Use custom replacer function** in `FileSessionStore.save()`
2. **Add Zod schema validation** in `FileSessionStore.load()`
3. **Implement message pruning** for long sessions
4. **Add comprehensive tests** for serialization edge cases

**Code Pattern:**
```typescript
// Serialize with safety
function serializeSession(session: SessionState): string {
  return JSON.stringify(session, createSafeReplacer(), 2);
}

// Deserialize with validation
function deserializeSession(json: string): SessionState {
  const parsed = JSON.parse(json);
  return SessionStateSchema.parse(parsed);
}
```

### Final Notes

The SDK message types are well-designed for serialization, but applications must implement their own serialization logic with proper error handling and validation. The existing Groundswell codebase has good patterns for handling circular references (see `cache-key.ts`) that can be adapted for session serialization.

---

**Document Status:** ✅ COMPLETE
**Research Date:** January 26, 2026
**Version:** 1.0.0
**Maintainer:** Groundswell Development Team

---

**End of Document**
