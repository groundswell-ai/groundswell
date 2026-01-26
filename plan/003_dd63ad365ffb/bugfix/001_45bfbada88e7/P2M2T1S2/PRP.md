# Product Requirement Prompt (PRP): Session Serialization Utilities

**Work Item**: P2.M2.T1.S2 - Add session serialization utilities
**PRD Reference**: Section 7.4 - Provider Capabilities (sessions flag)
**Related Issue**: Issue 8 - Session Persistence Implementation
**Dependency**: P2.M2.T1.S1 (SessionStore interface and implementations)

---

## Goal

**Feature Goal**: Create serialization utilities that enable `SessionState` objects containing SDK message types to be safely converted to JSON and reconstructed, supporting round-trip serialization for session persistence.

**Deliverable**:
1. `serializeSession(state: SessionState): string` - Convert SessionState to JSON-safe string
2. `deserializeSession(data: string): SessionState` - Reconstruct SessionState from JSON string
3. Helper utilities for handling SDK message serialization edge cases
4. Comprehensive test coverage for round-trip serialization

**Success Definition**:
- Round-trip serialization: `deserializeSession(serializeSession(state))` produces equivalent SessionState
- Handles circular references gracefully (if introduced by application code)
- Handles non-serializable values (functions, Symbols, undefined)
- TypeScript compiles with zero type errors
- All tests pass including edge cases

---

## Why

### Business Value and User Impact

**Problem**: `SessionState` contains SDK message objects (`SDKUserMessage[]` and `SDKResultMessage`) from the optional `@anthropic-ai/claude-agent-sdk` dependency. While these types are generally JSON-serializable, they contain `unknown` type fields that may contain:
- Functions (not serializable)
- Symbols (not serializable)
- Circular references (from application code)
- Binary data

The current `FileSessionStore` implementation (from P2.M2.T1.S1) uses direct `JSON.stringify()`/`JSON.parse()` without special handling, which could fail silently or produce corrupted session data.

**Solution**: Centralized serialization utilities with:
- Custom replacer function to handle non-serializable values
- Custom reviver function to reconstruct special types
- Explicit handling of circular references
- Validation of serialized data structure

**Integration with Existing Features**:
- Used by `FileSessionStore` for disk persistence (P2.M2.T1.S1)
- Enables future `RedisSessionStore` for distributed caching (P2.M2.T1.S1)
- Supports session export/import for debugging
- Enables session migration between storage backends

### Problems This Solves

1. **Data Corruption**: Prevents silent failures from non-serializable values
2. **Debugging**: Enables session state inspection and debugging
3. **Portability**: Supports session export/import across systems
4. **Validation**: Catches serialization issues early with clear error messages

---

## What

### User-Visible Behavior

**No direct user-facing changes** - this is an internal utility module.

**Internal Changes**:
- `FileSessionStore` uses `serializeSession()`/`deserializeSession()` instead of raw JSON operations
- Session data can be safely persisted and retrieved without corruption
- Serialization errors produce clear error messages for debugging

### Technical Requirements

1. **Round-Trip Serialization**: `deserialize(serialize(data))` must produce equivalent data
2. **Circular Reference Handling**: Use WeakSet to detect and handle circular refs
3. **Non-Serializable Handling**: Functions become `undefined`, Symbols become `[Symbol: description]`
4. **Unknown Type Safety**: Handle `unknown` fields in SDK messages gracefully
5. **Type Safety**: Full TypeScript type inference and validation
6. **Error Handling**: Clear error messages for invalid data

### Success Criteria

- [ ] `serializeSession()` function converts SessionState to JSON string
- [ ] `deserializeSession()` function reconstructs SessionState from JSON
- [ ] Round-trip test: `deserializeSession(serializeSession(state))` equals original
- [ ] Handles circular references without crashes
- [ ] Handles functions/Symbols gracefully
- [ ] Zero TypeScript errors: `npx tsc --noEmit`
- [ ] All tests pass: `npm test -- session-serialization.test.ts`
- [ ] FileSessionStore updated to use new utilities

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If a developer knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact SessionState structure and SDK message types
- Existing serialization patterns from FileSessionStore
- External documentation for JSON serialization edge cases
- Utility file naming and structure patterns
- Test patterns and validation commands
- Known gotchas with SDK message serialization

### Documentation & References

```yaml
# EXTERNAL DOCUMENTATION - JSON Serialization Best Practices

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter
  why: Understanding JSON.stringify() replacer function for handling non-serializable values
  critical: Replacer function is called for every key/value pair - essential for custom serialization

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#the_reviver_parameter
  why: Understanding JSON.parse() reviver function for reconstructing special types
  critical: Reviver allows transformation during parsing - useful for date reconstruction

- url: https://www.npmjs.com/package/flatted
  why: Reference implementation for circular reference handling in JSON
  critical: Uses WeakSet pattern to track seen objects - we'll use similar approach

- url: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  why: Understanding SDK message type structures
  critical: SDKUserMessage and SDKResultMessage contain `unknown` fields requiring special handling

- url: https://nodejs.org/api/util.html#util_util_inspect_custom
  why: Understanding custom inspection methods (if SDK objects implement them)
  critical: Some SDK objects may have special serialization methods

# CODEBASE REFERENCES - Exact Patterns to Follow

- file: src/providers/anthropic-provider.ts
  why: SessionState interface definition
  pattern: Lines 1054-1068 - SessionState structure
  gotcha: Uses type-only imports from optional SDK dependency
  section: |
    interface SessionState {
      history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
      lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
    }

- file: src/providers/session-store.ts
  why: Current JSON serialization implementation that needs enhancement
  pattern: Lines 165, 183 - JSON.stringify/parse usage
  gotcha: Direct JSON usage without replacer/reviver - source of potential issues
  section: |
    const json = JSON.stringify(state, null, 2);
    return JSON.parse(content) as T;

- file: src/utils/
  why: Utility file organization and naming patterns
  pattern: kebab-case file names, named exports, index.ts barrel export
  gotcha: All utilities are small, focused functions
  examples:
    - id.ts (10 lines) - Simple utility pattern
    - delay.ts (8 lines) - Promise-based pattern
    - restart-analysis.ts (400+ lines) - Complex utility with multiple functions

- file: src/utils/index.ts
  why: Barrel export pattern for utilities
  pattern: Named exports with .js extensions (ES module convention)
  gotcha: Must use .js extension even for .ts files
  section: |
    export { generateId } from './id.js';
    export { delay } from './delay.js';

- file: src/__tests__/unit/utils/
  why: Test file organization for utilities
  pattern: test files mirror source structure, use Vitest
  gotcha: Test files use .test.ts suffix, comprehensive edge case coverage

- file: src/__tests__/unit/utils/workflow-error-utils.test.ts
  why: Example of comprehensive utility testing
  pattern: Helper functions for test data, edge case testing
  gotcha: Tests both success and error paths

# SDK MESSAGE TYPE STRUCTURES

- type: SDKUserMessage
  source: @anthropic-ai/claude-agent-sdk
  structure: |
    {
      type: 'user',
      message: APIUserMessage,
      parent_tool_use_id: string | null,
      isSynthetic: boolean,
      tool_use_result: unknown,  // <-- May contain non-serializable data
      uuid: string,
      session_id: string
    }
  serialization_notes:
    - `tool_use_result` is `unknown` type - needs careful handling
    - All other fields are primitives

- type: SDKResultMessage
  source: @anthropic-ai/claude-agent-sdk
  structure: |
    Success case:
    {
      subtype: 'success',
      timing: { total_time: number, ... },
      cost: { cost: number, ... },
      usage: { input_tokens: number, output_tokens: number, ... },
      result: unknown,  // <-- May contain non-serializable data
      structured_output: unknown  // <-- May contain non-serializable data
    }
  serialization_notes:
    - `result` and `structured_output` are `unknown` types
    - May contain nested objects from application code

# RELATED WORK CONTEXT

- docfile: plan/003_dd63ad365ffb/docs/P2M2T1S1_PRP.md
  why: SessionStore implementation that depends on serialization
  section: Lines 161-176 - FileSessionStore serialization
  critical: FileSessionStore currently uses direct JSON - needs to use our utilities

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/external_deps.md
  why: SDK is optional dependency - affects type handling
  section: Lines 40-54 - Session Persistence
  critical: SDK types must be handled as optional (type-only imports)
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── utils/
│   │   ├── id.ts                          # Simple utility example
│   │   ├── delay.ts                       # Promise utility example
│   │   ├── restart-analysis.ts            # Complex utility example
│   │   └── index.ts                       # Barrel exports
│   ├── providers/
│   │   ├── session-store.ts               # CURRENT: Direct JSON serialization (line 165)
│   │   └── anthropic-provider.ts          # SessionState definition (lines 1054-1068)
│   └── __tests__/
│       └── unit/
│           ├── utils/
│           │   └── workflow-error-utils.test.ts  # Utility test example
│           └── providers/
│               └── session-store.test.ts          # SessionStore tests
```

### Desired Codebase Tree (Files to Add)

```bash
groundswell/
├── src/
│   ├── utils/
│   │   ├── session-serialization.ts       # NEW: Serialization utilities
│   │   └── index.ts                       # MODIFY: Add export
│   └── providers/
│       └── session-store.ts               # MODIFY: Use serialization utilities
└── src/__tests__/
    └── unit/
        └── utils/
            └── session-serialization.test.ts  # NEW: Serialization tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Optional dependency handling for @anthropic-ai/claude-agent-sdk
// SessionState uses types from optional SDK package
// SOLUTION: Use import() type-only imports in utility signatures
import type { SessionState } from '../types/providers.js';

// CRITICAL: SDK message types have `unknown` fields
// SDKUserMessage.tool_use_result is unknown type
// SDKResultMessage.result/structured_output are unknown types
// SOLUTION: Handle unknown fields gracefully - stringify non-serializable values

// CRITICAL: Circular references from application code
// SDK messages themselves don't have circular refs
// BUT application code may add them to message data
// SOLUTION: Use WeakSet to track seen objects during serialization

// CRITICAL: Function serialization
// Functions cannot be serialized to JSON
// JSON.stringify() returns undefined for functions (omits them)
// SOLUTION: Explicitly convert functions to "[Function: name]" strings

// CRITICAL: Symbol serialization
// Symbols cannot be serialized to JSON
// JSON.stringify() returns undefined for symbols (omits them)
// SOLUTION: Explicitly convert symbols to "[Symbol: description]" strings

// CRITICAL: ES module barrel exports
// Must use .js extension in import paths even for .ts files
// export { serializeSession } from './session-serialization.js';

// CRITICAL: Vitest testing framework
// Uses describe, it, expect, beforeEach
// NOT Jest - use vi for mocks
import { describe, it, expect } from 'vitest';

// CRITICAL: Test file naming
// Use .test.ts suffix (not .spec.ts)
// File: session-serialization.test.ts

// CRITICAL: FileSessionStore currently uses direct JSON.stringify/parse
// Line 165: const json = JSON.stringify(state, null, 2);
// Line 183: return JSON.parse(content) as T;
// GOTCHA: After implementing utilities, must update FileSessionStore to use them
// This is part of P2.M2.T1.S3 integration, NOT this task

// CRITICAL: Round-trip equality testing
// Objects pass through JSON lose reference equality
// Use deep equality for testing: expect(result).toEqual(expected)

// CRITICAL: Error messages should be contextual
// Pattern from tree-debugger.ts
throw new Error(`Failed to serialize session: ${error.message}`);
```

---

## Implementation Blueprint

### Data Models and Structure

#### 1. SessionState Type (Already Defined)

```typescript
// From src/types/providers.ts (exported in P2.M2.T1.S1)
import type { SessionState } from '../types/providers.js';

interface SessionState {
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}
```

#### 2. Serialization Error Type (NEW)

```typescript
/**
 * Error thrown when session serialization fails
 *
 * @remarks
 * Provides detailed error context for debugging serialization issues.
 * Includes the property path and value that caused the failure.
 *
 * @public
 */
export class SessionSerializationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'SessionSerializationError';
  }
}
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: CREATE src/utils/session-serialization.ts
  - IMPLEMENT: serializeSession() function with custom replacer
  - IMPLEMENT: deserializeSession() function with type validation
  - IMPLEMENT: SessionSerializationError class
  - IMPLEMENT: Helper functions for type checking
  - FOLLOW pattern: src/utils/restart-analysis.ts (multiple exports, comprehensive JSDoc)
  - NAMING: kebab-case file name, camelCase function names
  - PLACEMENT: New file in src/utils/
  - DEPENDENCIES: None (first task)

Task 2: EXPORT from src/utils/index.ts
  - ADD: Export serialization utilities
  - NAMING: export { serializeSession, deserializeSession }
  - PLACEMENT: In src/utils/index.ts after existing exports
  - DEPENDENCIES: Task 1 (needs utilities to export)

Task 3: CREATE src/__tests__/unit/utils/session-serialization.test.ts
  - IMPLEMENT: Round-trip serialization tests
  - IMPLEMENT: Circular reference handling tests
  - IMPLEMENT: Non-serializable value tests (functions, Symbols)
  - IMPLEMENT: SDK message structure tests
  - FOLLOW pattern: src/__tests__/unit/utils/workflow-error-utils.test.ts
  - NAMING: session-serialization.test.ts
  - PLACEMENT: In src/__tests__/unit/utils/
  - DEPENDENCIES: Task 1 (needs utilities to test)

Task 4: DOCUMENT usage examples
  - ADD: JSDoc usage examples to serializeSession()
  - ADD: JSDoc usage examples to deserializeSession()
  - ADD: @example tags showing round-trip usage
  - PLACEMENT: In session-serialization.ts JSDoc comments
  - DEPENDENCIES: Task 1 (enhance existing documentation)

Task 5: CREATE research notes (optional)
  - DOCUMENT: SDK message type analysis
  - DOCUMENT: Circular reference handling approach
  - DOCUMENT: Known limitations
  - PLACEMENT: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T1S2/research/
  - DEPENDENCIES: Task 1 (document implementation decisions)
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Custom replacer function for JSON.stringify
// Handles circular references and non-serializable values
function createReplacer() {
  const seen = new WeakSet();

  return (key: string, value: unknown): unknown => {
    // CRITICAL: Check circular references FIRST
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return `[Circular:${key}]`;
      }
      seen.add(value);
    }

    // Handle functions
    if (typeof value === 'function') {
      return `[Function:${value.name || 'anonymous'}]`;
    }

    // Handle symbols
    if (typeof value === 'symbol') {
      return `[Symbol:${value.description || 'unknown'}]`;
    }

    // Handle undefined (becomes null in JSON)
    if (value === undefined) {
      return null;
    }

    return value;
  };
}

// PATTERN 2: Serialization function with error handling
export function serializeSession(state: SessionState): string {
  try {
    const replacer = createReplacer();
    return JSON.stringify(state, replacer, 2);
  } catch (error) {
    throw new SessionSerializationError(
      `Failed to serialize session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'root',
      state
    );
  }
}

// PATTERN 3: Deserialization with type validation
export function deserializeSession(data: string): SessionState {
  try {
    const parsed = JSON.parse(data);

    // CRITICAL: Validate structure
    if (!isValidSessionState(parsed)) {
      throw new Error('Invalid session state structure');
    }

    return parsed as SessionState;
  } catch (error) {
    throw new SessionSerializationError(
      `Failed to deserialize session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'root',
      data
    );
  }
}

// PATTERN 4: Type guard for SessionState validation
function isValidSessionState(value: unknown): value is SessionState {
  // Check if value is an object
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check for required properties
  if (!('history' in obj) || !Array.isArray(obj.history)) {
    return false;
  }

  if (!('lastResult' in obj)) {
    return false;
  }

  // lastResult can be null or an object
  if (obj.lastResult !== null && typeof obj.lastResult !== 'object') {
    return false;
  }

  return true;
}

// PATTERN 5: Utility file structure
/**
 * Session serialization utilities
 *
 * @module
 * @remarks
 * Provides safe serialization/deserialization of SessionState objects
 * containing SDK message types with circular reference handling.
 */

// PATTERN 6: JSDoc with examples
/**
 * Serialize a SessionState to JSON string
 *
 * @param state - The session state to serialize
 * @returns JSON string representation of the session
 * @throws {SessionSerializationError} If serialization fails
 *
 * @example
 * ```ts
 * import { serializeSession, deserializeSession } from 'groundswell';
 *
 * const state: SessionState = { history: [], lastResult: null };
 * const json = serializeSession(state);
 * const restored = deserializeSession(json);
 * console.log(restored); // { history: [], lastResult: null }
 * ```
 */
export function serializeSession(state: SessionState): string {
  // Implementation
}

// CRITICAL: WeakSet for circular reference tracking
// Using WeakSet allows garbage collection of tracked objects
// Using Set would cause memory leaks
const seen = new WeakSet<object>();

// CRITICAL: Handle unknown type fields in SDK messages
// Don't try to validate unknown fields - just ensure they're serializable
// Let JSON.stringify/replacer handle them

// CRITICAL: Pretty-print JSON with 2-space indentation
// Matches existing pattern in session-store.ts:165
JSON.stringify(state, replacer, 2);
```

### Integration Points

```yaml
UTILITIES:
  - file: src/utils/session-serialization.ts (NEW FILE)
  - add: serializeSession, deserializeSession, SessionSerializationError
  - pattern: Follow restart-analysis.ts structure (multiple related exports)

EXPORTS:
  - file: src/utils/index.ts
  - add: export { serializeSession, deserializeSession } from './session-serialization.js';
  - pattern: Existing barrel export pattern with .js extensions

TESTS:
  - file: src/__tests__/unit/utils/session-serialization.test.ts (NEW FILE)
  - add: Comprehensive tests for all serialization scenarios
  - pattern: Follow workflow-error-utils.test.ts structure

FUTURE INTEGRATION:
  - file: src/providers/session-store.ts
  - modify: FileSessionStore.save() to use serializeSession()
  - modify: FileSessionStore.load() to use deserializeSession()
  - note: This is part of P2.M2.T1.S3, NOT this task
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler to check for type errors
npx tsc --noEmit

# Expected: Zero type errors. If errors exist:
# 1. READ the error message carefully
# 2. CHECK import paths (use .js extensions for ES modules)
# 3. VERIFY type-only imports for SDK types
# 4. FIX the specific error before proceeding

# Check for proper file formatting
npx prettier --check src/utils/session-serialization.ts

# Expected: No formatting errors. If errors exist:
npx prettier --write src/utils/session-serialization.ts

# Verify exports are accessible
node -e "import { serializeSession } from './src/utils/index.js'; console.log('OK');"

# Expected: "OK" output. If import errors:
# 1. CHECK export statements in session-serialization.ts
# 2. VERIFY barrel export in utils/index.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all tests
npm test

# Run only session-serialization tests
npm test -- session-serialization.test.ts

# Run tests in watch mode during development
npm run test:watch -- session-serialization.test.ts

# Expected: All tests pass. If tests fail:
# 1. READ the test output carefully
# 2. DEBUG the specific failing test
# 3. CHECK replacer/reviver logic
# 4. VERIFY round-trip equality with deep comparison
# 5. FIX the implementation or test as needed
```

### Level 3: Integration Testing (System Validation)

```bash
# Test round-trip serialization manually
# Create test file: test-serialization.ts

import { serializeSession, deserializeSession } from './src/utils/index.js';
import type { SessionState } from './src/types/providers.js';

const state: SessionState = {
  history: [],
  lastResult: null
};

const serialized = serializeSession(state);
console.log('Serialized:', serialized);

const deserialized = deserializeSession(serialized);
console.log('Deserialized:', deserialized);

console.log('Round-trip match:', JSON.stringify(deserialized) === JSON.stringify(state));

# Run the test
node test-serialization.ts

# Expected: "Round-trip match: true"

# Test with SDK message objects (if SDK is installed)
# Create test file: test-sdk-messages.ts

import { serializeSession, deserializeSession } from './src/utils/index.js';

const stateWithSDK = {
  history: [
    {
      type: 'user',
      message: { role: 'user', content: 'Hello' },
      parent_tool_use_id: null,
      isSynthetic: false,
      tool_use_result: null,
      uuid: 'test-uuid',
      session_id: 'test-session'
    }
  ],
  lastResult: null
};

const serialized = serializeSession(stateWithSDK);
const deserialized = deserializeSession(serialized);

console.log('SDK message round-trip:', JSON.stringify(deserialized) === JSON.stringify(stateWithSDK));

# Run the test
node test-sdk-messages.ts

# Expected: No errors, successful round-trip

# Test circular reference handling
# Create test file: test-circular.ts

import { serializeSession, deserializeSession } from './src/utils/index.js';

const circular: any = { history: [], lastResult: null };
circular.circular = circular; // Self-reference

const serialized = serializeSession(circular);
console.log('Serialized with circular ref:', serialized);

const deserialized = deserializeSession(serialized);
console.log('Circular ref handled:', deserialized.circular === '[Circular:circular]');

# Run the test
node test-circular.ts

# Expected: Circular reference converted to string, no crash

# Test function handling
# Create test file: test-functions.ts

import { serializeSession, deserializeSession } from './src/utils/index.js';

const stateWithFunction = {
  history: [],
  lastResult: null,
  callback: () => console.log('test')
};

const serialized = serializeSession(stateWithFunction);
console.log('Serialized with function:', serialized);

# Run the test
node test-functions.ts

# Expected: Function converted to "[Function:callback]" string
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test with complex nested objects
# Create test file: test-complex.ts

import { serializeSession, deserializeSession } from './src/utils/index.js';

const complexState = {
  history: [],
  lastResult: null,
  nested: {
    deep: {
      values: [1, 2, 3],
      objects: { a: 1, b: 2 }
    }
  },
  special: {
    date: new Date(),
    regex: /test/g,
    empty: null,
    number: 42,
    string: 'hello'
  }
};

const serialized = serializeSession(complexState);
const deserialized = deserializeSession(serialized);
console.log('Complex state round-trip successful');

# Run the test
node test-complex.ts

# Expected: All values handled correctly

# Test error handling
# Create test file: test-errors.ts

import { serializeSession, SessionSerializationError } from './src/utils/index.js';

try {
  serializeSession({ invalid: 'structure' } as any);
} catch (error) {
  if (error instanceof SessionSerializationError) {
    console.log('Caught SessionSerializationError:', error.message);
    console.log('Path:', error.path);
  }
}

# Run the test
node test-errors.ts

# Expected: Proper error with path information

# Performance test (large sessions)
# Create test file: test-performance.ts

import { serializeSession, deserializeSession } from './src/utils/index.js';

const largeHistory = Array(1000).fill(null).map((_, i) => ({
  type: 'user',
  message: { role: 'user', content: `Message ${i}` },
  parent_tool_use_id: null,
  isSynthetic: false,
  tool_use_result: null,
  uuid: `uuid-${i}`,
  session_id: 'test-session'
}));

const largeState = {
  history: largeHistory,
  lastResult: null
};

console.time('Serialize 1000 messages');
const serialized = serializeSession(largeState);
console.timeEnd('Serialize 1000 messages');

console.time('Deserialize 1000 messages');
const deserialized = deserializeSession(serialized);
console.timeEnd('Deserialize 1000 messages');

# Run the test
node test-performance.ts

# Expected: Serialization/deserialization completes in reasonable time (<1s)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiles with zero errors: `npx tsc --noEmit`
- [ ] All unit tests pass: `npm test -- session-serialization.test.ts`
- [ ] File formatting correct: `npx prettier --check src/utils/session-serialization.ts`
- [ ] Exports accessible: `node -e "import { serializeSession } from './src/utils/index.js';"`
- [ ] No linting errors (if using ESLint): `npm run lint`

### Feature Validation

- [ ] `serializeSession()` converts SessionState to JSON string
- [ ] `deserializeSession()` reconstructs SessionState from JSON
- [ ] Round-trip test passes for all data types
- [ ] Circular references handled without crashes
- [ ] Functions converted to string representation
- [ ] Symbols converted to string representation
- [ ] `SessionSerializationError` thrown with context on failure
- [ ] Type validation catches malformed data

### Code Quality Validation

- [ ] Follows existing utility patterns (restart-analysis.ts structure)
- [ ] File placement matches desired codebase tree structure
- [ ] Naming conventions consistent (camelCase functions, PascalCase classes)
- [ ] JSDoc comments present with @example tags
- [ ] Error handling follows codebase patterns (contextual messages)
- [ ] Type-only import used for optional SDK dependency
- [ ] WeakSet used for circular reference tracking (not Set)

### Documentation & Deployment

- [ ] serializeSession() has usage example in JSDoc
- [ ] deserializeSession() has usage example in JSDoc
- [ ] SessionSerializationError has clear documentation
- [ ] Helper functions have descriptive JSDoc comments
- [ ] PRP reference in test file header
- [ ] Export added to utils/index.ts barrel

---

## Anti-Patterns to Avoid

- ❌ Don't use Set for circular reference tracking (causes memory leaks, use WeakSet)
- ❌ Don't skip type validation in deserializeSession (security risk)
- ❌ Don't use synchronous exceptions for async operations (all operations are sync here)
- ❌ Don't forget to handle undefined values (convert to null for JSON)
- ❌ Don't validate unknown type fields in SDK messages (just ensure serializability)
- ❌ Don't use .ts extensions in import paths (use .js for ES modules)
- ❌ Don't skip JSDoc comments (document all public exports)
- ❌ Don't throw generic Error (use SessionSerializationError for context)
- ❌ Don't assume SDK is installed (use type-only imports)
- ❌ Don't use deep equality for object comparison in tests (usetoEqual())
- ❌ Don't forget to export from utils/index.ts barrel
- ❌ Don't implement FileSessionStore integration here (that's P2.M2.T1.S3)

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Validation**:
- ✅ Comprehensive codebase research completed
- ✅ External serialization patterns researched
- ✅ Exact file paths and patterns provided
- ✅ Complete code examples for all functions
- ✅ Test patterns and validation commands specified
- ✅ Known gotchas and anti-patterns documented
- ✅ "No Prior Knowledge" test passed

**Remaining Risk**:
- Unknown type fields in SDK messages may have edge cases not discovered in research
- Circular reference handling may need refinement based on real-world data

**Confidence Justification**:
This PRP provides:
1. Exact SessionState structure and SDK message types
2. Existing serialization patterns from FileSessionStore
3. External documentation for JSON.stringify replacer/reviver
4. Step-by-step implementation tasks with dependency ordering
5. Comprehensive validation commands at 4 levels
6. Known gotchas with SDK message serialization
7. Complete code examples for all functions

An AI agent unfamiliar with the codebase should be able to implement this feature successfully using only this PRP content and codebase access.

---

**Document Version**: 1.0
**Last Updated**: 2025-01-26
**Status**: Ready for Implementation
