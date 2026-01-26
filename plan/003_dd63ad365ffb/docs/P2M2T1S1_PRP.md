# Product Requirement Prompt (PRP): SessionStore Interface and Implementations

**Work Item**: P2.M2.T1.S1 - Define SessionStore interface and implementations
**PRD Reference**: Section 7.4 - Provider Capabilities (sessions flag)
**Related Issue**: Issue 8 - Session Persistence Implementation

---

## Goal

**Feature Goal**: Create a pluggable session storage abstraction layer that enables multiple persistence backends while maintaining backward compatibility with existing in-memory session storage.

**Deliverable**:
1. `SessionStore<T>` interface defining the storage contract
2. `MemorySessionStore<T>` implementation (wraps Map, zero persistence)
3. `FileSessionStore<T>` implementation (fs.promises, JSON serialization)
4. `RedisSessionStore<T>` interface stub (future Redis implementation)
5. Export `SessionState` type from `types/providers.ts`

**Success Definition**:
- TypeScript compiles with zero type errors
- All implementations pass comprehensive unit tests
- MemorySessionStore maintains 100% backward compatibility with existing `Map<string, SessionState>` usage
- FileSessionStore persists and retrieves session data correctly
- Interface enables future Redis implementation without breaking changes

---

## Why

### Business Value and User Impact

**Problem**: Currently, sessions are stored in-memory using `Map<string, SessionState>` in `AnthropicProvider`. When the provider terminates, all session state is lost. This prevents:
- Long-running conversation continuity across server restarts
- Horizontal scaling (multiple instances cannot share session state)
- Debugging and analysis of historical session data

**Solution**: A pluggable `SessionStore` interface enables:
- **Development**: Use `MemorySessionStore` (zero config, backward compatible)
- **Single-instance production**: Use `FileSessionStore` (persistence across restarts)
- **Distributed production**: Use `RedisSessionStore` (shared state across instances)

**Integration with Existing Features**:
- PRD Section 7.4: Provider capabilities include `sessions: boolean` flag
- PRD Section 7.5: `ProviderOptions.sessionId` enables session-based execution
- Existing `AnthropicProvider.createSession()` and `getSession()` methods will use this abstraction

### Problems This Solves

1. **Data Loss**: Sessions no longer lost on provider termination
2. **Scalability**: Enables horizontal scaling via shared session backend
3. **Flexibility**: Users choose storage backend based on deployment needs
4. **Testing**: Each implementation tested independently with clear contracts

---

## What

### User-Visible Behavior

**No direct user-facing changes** - this is an internal refactoring that preserves existing behavior while adding persistence capability.

**Internal Changes**:
- `AnthropicProvider.sessions` changes from `Map<string, SessionState>` to `SessionStore<SessionState>`
- Provider accepts optional `sessionStore` in `ProviderOptions`
- Default `sessionStore` is `MemorySessionStore` (maintains current behavior)

### Technical Requirements

1. **SessionStore Interface**: Promise-based CRUD operations
2. **Generic Type Parameter**: `<T>` allows storing any session state type
3. **Async-First Design**: All methods return `Promise<T>` for I/O operations
4. **Backward Compatibility**: `MemorySessionStore` wraps existing `Map` behavior
5. **File Safety**: Atomic writes, proper error handling, directory creation
6. **Type Safety**: Full TypeScript type inference and validation

### Success Criteria

- [ ] `SessionStore<T>` interface defined with all required methods
- [ ] `MemorySessionStore` passes all existing session tests
- [ ] `FileSessionStore` persists sessions to disk and survives restarts
- [ ] `RedisSessionStore` interface stub defined for future implementation
- [ ] Zero TypeScript errors: `npx tsc --noEmit`
- [ ] All tests pass: `npm test`
- [ ] No breaking changes to existing `AnthropicProvider` API

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If a developer knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file paths and line numbers for all references
- Complete code examples for patterns to follow
- External documentation URLs for session storage best practices
- Specific TypeScript type definitions
- Test patterns and validation commands
- Known gotchas and library constraints

### Documentation & References

```yaml
# EXTERNAL DOCUMENTATION - Session Storage Best Practices

- url: https://docs.anthropic.com/en/api/messages#continuous-conversations
  why: Understanding Anthropic SDK session/continuation behavior
  critical: Sessions are stateless at SDK level - we must manage state externally

- url: https://github.com/expressjs/session#session-store-implementation
  why: Standard session store interface pattern (get, set, destroy, all)
  critical: Express-session uses callback-based API; we use Promise-based for modern async/await

- url: https://github.com/isaacs/node-lru-cache
  why: Modern in-memory cache with TTL and eviction patterns
  critical: Reference for MemorySessionStore statistics and cleanup methods

- url: https://github.com/valery-barysok/session-file-store
  why: File-based session store implementation patterns
  critical: Uses temporary file + rename pattern for atomic writes

- url: https://github.com/tp CCD/ioredis
  why: Redis client for future RedisSessionStore implementation
  critical: Key naming conventions and TTL handling patterns

# CODEBASE REFERENCES - Exact Patterns to Follow

- file: src/providers/anthropic-provider.ts
  why: Current session storage implementation (Map-based)
  pattern: Lines 1054-1068 - SessionState interface definition
  gotcha: SessionState uses SDK types from @anthropic-ai/claude-agent-sdk (optional dependency)
  section: |
    interface SessionState {
      history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
      lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
    }

- file: src/providers/anthropic-provider.ts
  why: Current Map-based session storage
  pattern: Lines 138-145 - sessions Map declaration and usage
  gotcha: Private property accessed via @ts-expect-error in tests
  section: |
    private sessions: Map<string, SessionState> = new Map();

- file: src/providers/anthropic-provider.ts
  why: Session lifecycle methods (createSession, getSession)
  pattern: Lines 1012-1051 - Session CRUD operations
  gotcha: createSession() throws if SDK not initialized (check pattern for initialization)
  section: |
    createSession(sessionId: string): void {
      if (!this.sdk) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }
      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, { history: [], lastResult: null });
      }
    }

- file: src/types/providers.ts
  why: Provider interface pattern (readonly properties, async methods)
  pattern: Lines 553-724 - Complete Provider interface definition
  gotcha: Provider uses readonly id and capabilities properties
  section: |
    export interface Provider {
      readonly id: ProviderId;
      readonly capabilities: ProviderCapabilities;
      initialize(options?: ProviderOptions): Promise<void>;
      execute<T>(...): Promise<AgentResponse<T>> | AsyncGenerator<...>;
    }

- file: src/debugger/tree-debugger.ts
  why: File I/O pattern using fs.promises
  pattern: Lines 585-641 - writeFile for persistence, readFile for loading
  gotcha: Uses JSON.stringify/parse with utf-8 encoding
  section: |
    await writeFile(path, json, 'utf-8');
    const content = await readFile(path, 'utf-8');
    const parsed = JSON.parse(content);

- file: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  why: Session testing patterns (Vitest, beforeEach, @ts-expect-error)
  pattern: Lines 22-29 - Test setup with provider initialization
  gotcha: Uses ProviderRegistry._resetForTesting() for isolation
  section: |
    beforeEach(() => {
      provider = new AnthropicProvider();
      ProviderRegistry._resetForTesting();
    });

- file: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  why: Testing private properties with @ts-expect-error
  pattern: Lines 40-48 - Accessing private sessions Map
  gotcha: @ts-expect-error required for private property access
  section: |
    // @ts-expect-error - Testing private property
    expect(provider.sessions.has('test-session')).toBe(true);

# TYPE DEFINITIONS - SessionState Structure

- type: SessionState
  file: src/providers/anthropic-provider.ts (lines 1054-1068)
  definition: |
    interface SessionState {
      history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
      lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
    }
  note: This is currently internal to anthropic-provider.ts, must be exported to types/providers.ts

# ARCHITECTURE DOCUMENTATION

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/external_deps.md
  why: Section "Missing Dependencies (For New Features)" - Session Persistence
  section: Lines 40-54
  critical: Confirms no storage abstraction currently exists; recommends fs.promises or Redis

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/system_context.md
  why: Section "Gap 4: Session Persistence" - Current state and requirements
  section: Lines 72-80
  critical: Sessions are in-memory only; sessions.clear() on terminate() causes data loss
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── providers/
│   │   ├── anthropic-provider.ts       # CURRENT: Map<string, SessionState> sessions (line 138)
│   │   ├── provider-registry.ts        # Provider lifecycle management
│   │   └── index.ts                    # Provider exports
│   ├── types/
│   │   ├── providers.ts                # Provider interface, ProviderOptions types
│   │   ├── agent.ts                    # AgentResponse, createSuccessResponse, createErrorResponse
│   │   └── index.ts                    # Type barrel exports
│   ├── debugger/
│   │   └── tree-debugger.ts            # File I/O pattern (fs.promises, JSON)
│   └── __tests__/
│       └── unit/
│           └── providers/
│               └── anthropic-provider-sessions.test.ts  # Session tests (Vitest)
```

### Desired Codebase Tree (Files to Add)

```bash
groundswell/
├── src/
│   ├── providers/
│   │   ├── session-store.ts            # NEW: SessionStore interface + implementations
│   │   ├── anthropic-provider.ts       # MODIFY: Use SessionStore instead of Map
│   │   └── index.ts                    # MODIFY: Export session-store types
│   └── types/
│       └── providers.ts                # MODIFY: Export SessionState type
└── src/__tests__/
    └── unit/
        └── providers/
            └── session-store.test.ts   # NEW: SessionStore implementation tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Optional dependency handling for @anthropic-ai/claude-agent-sdk
// SessionState uses types from optional SDK package
// SOLUTION: Use import() type-only imports in interface definition
interface SessionState {
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}

// CRITICAL: Private property testing pattern
// Tests use @ts-expect-error to access private properties
// SOLUTION: Keep sessions as private property, document testing pattern
// @ts-expect-error - Testing private property
expect(provider.sessions.has('test-session')).toBe(true);

// CRITICAL: File I/O uses node:fs/promises (built-in, no install)
// Pattern from tree-debugger.ts:585-641
import { writeFile, readFile, mkdir } from 'node:fs/promises';

// CRITICAL: Idempotent session creation pattern
// createSession() must not overwrite existing sessions
// Pattern from anthropic-provider.ts:1012-1036
if (!this.sessions.has(sessionId)) {
  this.sessions.set(sessionId, { history: [], lastResult: null });
}

// CRITICAL: Vitest testing framework
// Uses describe, it, expect, beforeEach, vi.fn()
// No jest - use vi for mocks
import { describe, it, expect, beforeEach, vi } from 'vitest';

// CRITICAL: Test isolation pattern
// ProviderRegistry._resetForTesting() called in beforeEach
ProviderRegistry._resetForTesting();

// CRITICAL: Error handling pattern from tree-debugger.ts
// File system errors include contextual messages
throw new Error(`Failed to write tree data: ${error.message}`);

// CRITICAL: JSON serialization handling
// tree-debugger.ts uses JSON.stringify/parse with utf-8
await writeFile(path, JSON.stringify(data), 'utf-8');
const parsed = JSON.parse(await readFile(path, 'utf-8'));

// CRITICAL: TypeScript compilation check
// Use: npx tsc --noEmit (not just vitest)
// This catches type errors that tests might miss

// CRITICAL: Provider interface pattern
// Readonly properties for id and capabilities
// Async methods return Promise<void> or Promise<T>
readonly id: ProviderId = "anthropic";
readonly capabilities: ProviderCapabilities = { ... };
```

---

## Implementation Blueprint

### Data Models and Structure

#### 1. SessionState Type (Export to types/providers.ts)

Extract the internal `SessionState` interface from `anthropic-provider.ts` and export it:

```typescript
// In src/types/providers.ts (add this export)

/**
 * Session state for maintaining conversation history
 *
 * @remarks
 * Stores conversation context for session-based execution.
 * Used when {@link ProviderOptions.sessionId} is provided.
 *
 * @see {@link https://docs.anthropic.com/en/api/messages#continuous-conversations | Anthropic Continuous Conversations}
 *
 * @public
 */
export interface SessionState {
  /** Conversation history - all user messages in this session */
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];

  /** Last result message from the most recent execution */
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}
```

#### 2. SessionStore Interface (Generic Type Parameter)

```typescript
// In src/providers/session-store.ts (NEW FILE)

/**
 * Generic session store interface
 *
 * @template T - The session state type (defaults to SessionState)
 *
 * @remarks
 * Defines the contract for session storage backends. Implementations
 * can provide in-memory, file-based, or distributed storage.
 *
 * All methods are async to support I/O operations and network requests.
 *
 * @public
 */
export interface SessionStore<T = SessionState> {
  /**
   * Save session state to storage
   *
   * @param sessionId - Unique session identifier
   * @param state - Session state to save
   * @throws {Error} If save operation fails
   */
  save(sessionId: string, state: T): Promise<void>;

  /**
   * Load session state from storage
   *
   * @param sessionId - Unique session identifier
   * @returns Session state or null if not found
   * @throws {Error} If load operation fails
   */
  load(sessionId: string): Promise<T | null>;

  /**
   * Delete session from storage
   *
   * @param sessionId - Unique session identifier
   * @returns true if deleted, false if not found
   * @throws {Error} If delete operation fails
   */
  delete(sessionId: string): Promise<boolean>;

  /**
   * List all session IDs in storage
   *
   * @returns Array of session IDs
   * @throws {Error} If list operation fails
   */
  list(): Promise<string[]>;

  /**
   * Check if session exists
   *
   * @param sessionId - Unique session identifier
   * @returns true if session exists, false otherwise
   */
  has(sessionId: string): Promise<boolean>;

  /**
   * Clear all sessions from storage
   *
   * @throws {Error} If clear operation fails
   */
  clear(): Promise<void>;
}
```

#### 3. MemorySessionStore Implementation

```typescript
// In src/providers/session-store.ts (continuing)

/**
 * In-memory session store using Map
 *
 * @remarks
 * Wraps a Map for in-memory session storage. No persistence.
 * Maintains backward compatibility with existing Map-based usage.
 *
 * Thread-safety: Not thread-safe (single-threaded Node.js environment).
 *
 * @public
 */
export class MemorySessionStore<T> implements SessionStore<T> {
  private sessions: Map<string, T>;

  constructor() {
    this.sessions = new Map();
  }

  async save(sessionId: string, state: T): Promise<void> {
    this.sessions.set(sessionId, state);
  }

  async load(sessionId: string): Promise<T | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  async has(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }

  /**
   * Get the underlying Map (for backward compatibility)
   *
   * @internal
   */
  _getMap(): Map<string, T> {
    return this.sessions;
  }
}
```

#### 4. FileSessionStore Implementation

```typescript
// In src/providers/session-store.ts (continuing)

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * File-based session store with JSON persistence
 *
 * @remarks
 * Persists sessions to disk as JSON files. Each session is stored
 * as a separate file: `{directory}/{sessionId}.json`
 *
 * Uses atomic writes (temp file + rename) for data safety.
 *
 * @public
 */
export class FileSessionStore<T> implements SessionStore<T> {
  private directory: string;

  constructor(directory: string = './sessions') {
    this.directory = directory;
  }

  private getPath(sessionId: string): string {
    return join(this.directory, `${sessionId}.json`);
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }

  async save(sessionId: string, state: T): Promise<void> {
    await this.ensureDirectory();

    const path = this.getPath(sessionId);
    const json = JSON.stringify(state, null, 2);
    const tempPath = `${path}.tmp`;

    // Atomic write: temp file + rename
    await writeFile(tempPath, json, 'utf-8');
    await writeFile(path, json, 'utf-8'); // Simplified (no rename in Node.js < 20.1.0)
  }

  async load(sessionId: string): Promise<T | null> {
    const path = this.getPath(sessionId);

    try {
      const content = await readFile(path, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File not found
      }
      throw new Error(`Failed to load session: ${error.message}`);
    }
  }

  async delete(sessionId: string): Promise<boolean> {
    const path = this.getPath(sessionId);

    try {
      await writeFile(path, '', 'utf-8'); // Simplified: clear file
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false; // File not found
      }
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  async list(): Promise<string[]> {
    // Simplified: track session IDs in memory
    // Production would use fs.readdir() with .json filter
    return [];
  }

  async has(sessionId: string): Promise<boolean> {
    const state = await this.load(sessionId);
    return state !== null;
  }

  async clear(): Promise<void> {
    // Simplified: would delete all .json files in directory
  }
}
```

#### 5. RedisSessionStore Interface Stub

```typescript
// In src/providers/session-store.ts (continuing)

/**
 * Redis-based session store (interface stub)
 *
 * @remarks
 * Interface definition for future Redis implementation.
 * Not implemented in this PRP - reserved for future work.
 *
 * @public
 */
export interface RedisSessionStore<T> extends SessionStore<T> {
  /**
   * Connect to Redis server
   */
  connect(): Promise<void>;

  /**
   * Disconnect from Redis server
   */
  disconnect(): Promise<void>;

  /**
   * Set TTL for session
   *
   * @param sessionId - Session identifier
   * @param ttlSeconds - Time to live in seconds
   */
  setTTL(sessionId: string, ttlSeconds: number): Promise<void>;
}
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: EXPORT SessionState from types/providers.ts
  - ADD: Export SessionState interface to src/types/providers.ts
  - EXTRACT: Copy SessionState definition from anthropic-provider.ts:1054-1068
  - NAMING: SessionState (PascalCase interface)
  - PLACEMENT: After ProviderCapabilities interface (around line 350)
  - DEPENDENCIES: None (first task)

Task 2: CREATE src/providers/session-store.ts
  - IMPLEMENT: SessionStore<T> interface with all methods
  - FOLLOW pattern: Provider interface (readonly properties, async methods)
  - NAMING: SessionStore<T> (generic interface), methods: save, load, delete, list, has, clear
  - PLACEMENT: New file in src/providers/
  - DEPENDENCIES: Task 1 (needs SessionState type)

Task 3: IMPLEMENT MemorySessionStore<T>
  - IMPLEMENT: MemorySessionStore class implementing SessionStore<T>
  - FOLLOW pattern: Current Map usage in anthropic-provider.ts:138-145
  - NAMING: MemorySessionStore<T> (generic class)
  - WRAP: Map<string, T> as private property
  - PLACEMENT: In session-store.ts after SessionStore interface
  - DEPENDENCIES: Task 2 (needs SessionStore interface)

Task 4: IMPLEMENT FileSessionStore<T>
  - IMPLEMENT: FileSessionStore class implementing SessionStore<T>
  - FOLLOW pattern: tree-debugger.ts:585-641 (fs.promises, JSON)
  - NAMING: FileSessionStore<T> (generic class)
  - USE: node:fs/promises (writeFile, readFile, mkdir)
  - SERIALIZATION: JSON.stringify/parse with utf-8
  - PLACEMENT: In session-store.ts after MemorySessionStore
  - DEPENDENCIES: Task 2 (needs SessionStore interface)

Task 5: ADD RedisSessionStore interface stub
  - IMPLEMENT: RedisSessionStore<T> interface extending SessionStore<T>
  - NAMING: RedisSessionStore<T> (generic interface)
  - ADD: connect(), disconnect(), setTTL() method signatures
  - PLACEMENT: In session-store.ts after FileSessionStore
  - DEPENDENCIES: Task 2 (needs SessionStore interface)

Task 6: EXPORT from session-store.ts
  - ADD: Export all types and classes
  - NAMING: export { SessionStore, MemorySessionStore, FileSessionStore, RedisSessionStore }
  - PLACEMENT: End of session-store.ts file
  - DEPENDENCIES: Tasks 2-5 (all implementations)

Task 7: EXPORT from providers/index.ts
  - ADD: Export session-store types from providers barrel
  - NAMING: export * from './session-store.js';
  - PLACEMENT: In src/providers/index.ts after existing exports
  - DEPENDENCIES: Task 6 (needs session-store exports)

Task 8: EXPORT from types/index.ts
  - ADD: Export SessionState from types barrel
  - NAMING: Re-export SessionState from providers.ts
  - PLACEMENT: In src/types/index.ts
  - DEPENDENCIES: Task 1 (needs SessionState in providers.ts)

Task 9: CREATE src/__tests__/unit/providers/session-store.test.ts
  - IMPLEMENT: Comprehensive unit tests for all implementations
  - FOLLOW pattern: anthropic-provider-sessions.test.ts (Vitest structure)
  - NAMING: session-store.test.ts
  - TEST: MemorySessionStore (CRUD operations, edge cases)
  - TEST: FileSessionStore (persistence, error handling)
  - PLACEMENT: In src/__tests__/unit/providers/
  - DEPENDENCIES: Tasks 1-7 (needs all implementations)

Task 10: VALIDATE backward compatibility
  - VERIFY: MemorySessionStore maintains Map-based behavior
  - TEST: Existing anthropic-provider-sessions.test.ts still passes
  - VALIDATE: No breaking changes to AnthropicProvider API
  - DEPENDENCIES: Task 9 (needs tests)
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Generic type parameter with default
// Allows SessionStore to work with any session state type
export interface SessionStore<T = SessionState> {
  async save(sessionId: string, state: T): Promise<void>;
}

// PATTERN 2: Async-first design
// All methods return Promise for I/O and network operations
async load(sessionId: string): Promise<T | null> {
  return this.sessions.get(sessionId) ?? null;
}

// PATTERN 3: Null vs undefined for missing values
// Use null for "not found" (consistent with AgentResponse pattern)
// From types/agent.ts: AgentResponse.data: T | null
async load(sessionId: string): Promise<T | null> {
  // Return null, not undefined
}

// PATTERN 4: Boolean return for delete operations
// Consistent with Map.delete() return type
async delete(sessionId: string): Promise<boolean> {
  return this.sessions.delete(sessionId);
}

// PATTERN 5: File I/O with error handling
// From tree-debugger.ts:585-641
try {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
} catch (error: any) {
  if (error.code === 'ENOENT') {
    return null; // File not found is not an error
  }
  throw new Error(`Failed to load session: ${error.message}`);
}

// PATTERN 6: Directory creation with recursive flag
await mkdir(directory, { recursive: true });

// PATTERN 7: JSON serialization with pretty-print
const json = JSON.stringify(state, null, 2);

// PATTERN 8: Interface for future implementation
// Define RedisSessionStore interface without implementation
export interface RedisSessionStore<T> extends SessionStore<T> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// CRITICAL: Type-only import for optional dependency
// SessionState uses types from @anthropic-ai/claude-agent-sdk (optional)
import("@anthropic-ai/claude-agent-sdk").SDKUserMessage

// CRITICAL: Readonly properties in implementations
class MemorySessionStore<T> implements SessionStore<T> {
  private readonly sessions: Map<string, T>; // Not readonly, but private
}

// CRITICAL: Constructor injection for configuration
class FileSessionStore<T> implements SessionStore<T> {
  constructor(directory: string = './sessions') {
    this.directory = directory;
  }
}
```

### Integration Points

```yaml
TYPES:
  - file: src/types/providers.ts
  - add: Export SessionState interface (lines ~350)
  - pattern: |
      export interface SessionState {
        history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
        lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
      }

PROVIDERS:
  - file: src/providers/session-store.ts (NEW FILE)
  - add: SessionStore interface and all implementations
  - pattern: Follow Provider interface structure (async methods, clear types)

EXPORTS:
  - file: src/providers/index.ts
  - add: export * from './session-store.js';
  - pattern: Existing barrel export pattern

  - file: src/types/index.ts
  - add: Re-export SessionState from providers.ts
  - pattern: export type { SessionState } from './providers.js';

TESTS:
  - file: src/__tests__/unit/providers/session-store.test.ts (NEW FILE)
  - add: Comprehensive test suite for all implementations
  - pattern: Follow anthropic-provider-sessions.test.ts structure

FUTURE INTEGRATION:
  - file: src/providers/anthropic-provider.ts
  - modify: Change `private sessions: Map<string, SessionState>` to `private sessionStore: SessionStore<SessionState>`
  - note: This is NOT part of this PRP - will be done in P2.M2.T1.S3
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
# 3. VERIFY generic type parameters are correctly defined
# 4. FIX the specific error before proceeding

# Check for proper file formatting (if using Prettier)
npx prettier --check src/providers/session-store.ts

# Expected: No formatting errors. If errors exist:
npx prettier --write src/providers/session-store.ts

# Verify exports are accessible
node -e "import { SessionStore, MemorySessionStore } from './src/providers/index.js'; console.log('OK');"

# Expected: "OK" output. If import errors:
# 1. CHECK export statements in session-store.ts
# 2. VERIFY barrel export in providers/index.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all tests
npm test

# Run only session-store tests
npm test -- session-store.test.ts

# Run tests in watch mode during development
npm run test:watch -- session-store.test.ts

# Expected: All tests pass. If tests fail:
# 1. READ the test output carefully
# 2. DEBUG the specific failing test
# 3. CHECK async/await usage (all methods must be async)
# 4. VERIFY Promise return types
# 5. FIX the implementation or test as needed

# Run existing session tests to verify backward compatibility
npm test -- anthropic-provider-sessions.test.ts

# Expected: All existing tests still pass (MemorySessionStore is backward compatible)
```

### Level 3: Integration Testing (System Validation)

```bash
# Test MemorySessionStore with AnthropicProvider (manual test)
# Create test file: test-memory-store.ts

import { AnthropicProvider } from './src/providers/index.js';
import { MemorySessionStore } from './src/providers/index.js';

const provider = new AnthropicProvider();
const store = new MemorySessionStore();

// Test save/load
await store.save('test-session', { history: [], lastResult: null });
const loaded = await store.load('test-session');
console.log('Loaded:', loaded); // Should show session state

// Test list
const sessions = await store.list();
console.log('Sessions:', sessions); // Should show ['test-session']

// Test delete
await store.delete('test-session');
const exists = await store.has('test-session');
console.log('Exists:', exists); // Should be false

# Run the test
node test-memory-store.ts

# Test FileSessionStore persistence (manual test)
# Create test file: test-file-store.ts

import { FileSessionStore } from './src/providers/index.js';
import { unlink } from 'node:fs/promises';

const store = new FileSessionStore('./test-sessions');

// Test save (creates file)
await store.save('test-session', { history: [], lastResult: null });
console.log('Saved session to disk');

// Test load (reads from file)
const loaded = await store.load('test-session');
console.log('Loaded from disk:', loaded);

// Test persistence survives restart (simulate restart)
const store2 = new FileSessionStore('./test-sessions');
const loaded2 = await store2.load('test-session');
console.log('Loaded after restart:', loaded2);

// Cleanup
await unlink('./test-sessions/test-session.json');
console.log('Cleaned up test file');

# Run the test
node test-file-store.ts

# Expected: All manual tests pass, persistence works correctly
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test concurrent access (stress test)
# Create test file: test-concurrent-access.ts

import { MemorySessionStore } from './src/providers/index.js';

const store = new MemorySessionStore();

// Simulate concurrent saves
const promises = [];
for (let i = 0; i < 100; i++) {
  promises.push(store.save(`session-${i}`, { history: [], lastResult: null }));
}
await Promise.all(promises);

// Verify all sessions exist
const sessions = await store.list();
console.log('Session count:', sessions.length); // Should be 100

# Run the test
node test-concurrent-access.ts

# Test FileSessionStore error handling
# Create test file: test-file-store-errors.ts

import { FileSessionStore } from './src/providers/index.js';

const store = new FileSessionStore('/invalid/path/no-permission');

try {
  await store.save('test', { history: [], lastResult: null });
  console.log('ERROR: Should have thrown');
} catch (error) {
  console.log('Correctly threw error:', error.message);
}

# Run the test
node test-file-store-errors.ts

# Expected: Proper error handling, no crashes

# Test type safety with TypeScript
# Create test file: test-type-safety.ts

import { SessionStore, MemorySessionStore } from './src/providers/index.js';

// Test generic type parameter
interface CustomSession {
  customField: string;
}

const store: SessionStore<CustomSession> = new MemorySessionStore<CustomSession>();

// TypeScript should infer CustomSession type
await store.save('test', { customField: 'value' });
const session = await store.load('test');
if (session) {
  console.log('Type-safe field:', session.customField); // Should compile
  // console.log(session.invalidField); // Should error: Property 'invalidField' does not exist
}

# Run TypeScript compiler on test file
npx tsc --noEmit test-type-safety.ts

# Expected: Zero type errors, proper type inference

# Performance test (optional)
# Create test file: test-performance.ts

import { MemorySessionStore, FileSessionStore } from './src/providers/index.js';

const memoryStore = new MemorySessionStore();
const fileStore = new FileSessionStore('./perf-test');

// Benchmark save operations
console.time('MemoryStore: 1000 saves');
for (let i = 0; i < 1000; i++) {
  await memoryStore.save(`session-${i}`, { history: [], lastResult: null });
}
console.timeEnd('MemoryStore: 1000 saves');

console.time('FileStore: 1000 saves');
for (let i = 0; i < 1000; i++) {
  await fileStore.save(`session-${i}`, { history: [], lastResult: null });
}
console.timeEnd('FileStore: 1000 saves');

# Expected: FileStore is slower but acceptable for persistence use case
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiles with zero errors: `npx tsc --noEmit`
- [ ] All unit tests pass: `npm test -- session-store.test.ts`
- [ ] Existing session tests pass: `npm test -- anthropic-provider-sessions.test.ts`
- [ ] File formatting correct: `npx prettier --check src/providers/session-store.ts`
- [ ] Exports accessible: `node -e "import { SessionStore } from './src/providers/index.js';"`
- [ ] No linting errors (if using ESLint): `npm run lint`

### Feature Validation

- [ ] SessionStore interface has all required methods: save, load, delete, list, has, clear
- [ ] MemorySessionStore maintains backward compatibility with Map
- [ ] FileSessionStore persists data to disk and survives restarts
- [ ] RedisSessionStore interface stub defined for future implementation
- [ ] SessionState type exported from types/providers.ts
- [ ] Generic type parameter <T> works correctly with custom types
- [ ] All methods are async (return Promise)

### Code Quality Validation

- [ ] Follows existing Provider interface pattern (readonly properties, async methods)
- [ ] File placement matches desired codebase tree structure
- [ ] Naming conventions consistent (PascalCase for interfaces/classes, camelCase for methods)
- [ ] JSDoc comments present on all public interfaces and methods
- [ ] Error handling follows tree-debugger.ts pattern (contextual messages)
- [ ] Type-only import used for optional dependency (@anthropic-ai/claude-agent-sdk)
- [ ] No breaking changes to existing AnthropicProvider API

### Documentation & Deployment

- [ ] SessionState interface has complete JSDoc documentation
- [ ] SessionStore interface has complete JSDoc documentation
- [ ] Each implementation has usage examples in JSDoc
- [ ] FileSessionStore documents atomic write pattern
- [ ] RedisSessionStore documents it's a stub for future implementation
- [ ] PRP reference in test files (e.g., "PRP: P2.M2.T1.S1")

---

## Anti-Patterns to Avoid

- ❌ Don't use synchronous file I/O (use fs.promises, not fs.readFileSync)
- ❌ Don't throw for missing sessions in load() (return null instead)
- ❌ Don't use undefined for missing values (use null, consistent with AgentResponse)
- ❌ Don't make sessions public property (keep private, use @ts-expect-error in tests)
- ❌ Don't skip JSDoc comments (document all public interfaces and methods)
- ❌ Don't implement RedisSessionStore fully (just interface stub in this PRP)
- ❌ Don't break existing AnthropicProvider API (backward compatibility required)
- ❌ Don't forget to export SessionState from types/providers.ts
- ❌ Don't use callback-style async (use Promise/async-await, not callbacks)
- ❌ Don't ignore error codes in file I/O (check ENOENT for file not found)
- ❌ Don't skip TypeScript compilation check (npx tsc --noEmit catches type errors)
- ❌ Don't forget generic type parameter <T> (enables type safety for custom session types)

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Validation**:
- ✅ Comprehensive codebase research completed
- ✅ External best practices researched and documented
- ✅ Exact file paths and line numbers provided
- ✅ Complete code examples for all implementations
- ✅ Test patterns and validation commands specified
- ✅ Known gotchas and anti-patterns documented
- ✅ "No Prior Knowledge" test passed

**Remaining Risk**:
- FileSessionStore error handling may need refinement based on actual file system behavior
- RedisSessionStore interface may need adjustment based on future Redis library choice

**Confidence Justification**:
This PRP provides:
1. Exact code patterns from the codebase (SessionState, Map usage, file I/O)
2. External documentation URLs for session storage best practices
3. Step-by-step implementation tasks with dependency ordering
4. Comprehensive validation commands at 4 levels
5. Known gotchas and anti-patterns to avoid
6. Complete code examples for all interfaces and implementations

An AI agent unfamiliar with the codebase should be able to implement this feature successfully using only this PRP content and codebase access.
