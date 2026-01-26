# Product Requirement Prompt: Integrate SessionStore into AnthropicProvider

**PRP ID**: P2.M2.T1.S3
**Date**: 2026-01-26
**Status**: Ready for Implementation
**Points**: 2

---

## Goal

**Feature Goal**: Replace AnthropicProvider's private `Map<string, SessionState>` with pluggable `SessionStore<SessionState>` interface to enable persistent session storage across provider lifecycle (initialize/terminate).

**Deliverable**: Modified `AnthropicProvider` class with:
1. Constructor accepting optional `sessionStore` parameter (default: `MemorySessionStore`)
2. Session restoration in `initialize()` for non-memory stores
3. Session persistence in `terminate()` for non-memory stores
4. All session operations (`createSession`, `getSession`, `deleteSession`) delegating to `SessionStore` API

**Success Definition**:
- [ ] Backward compatibility maintained (no constructor params = memory store)
- [ ] `FileSessionStore` sessions persist across `terminate()` → `initialize()` cycles
- [ ] Custom `SessionStore` implementations work via constructor injection
- [ ] All existing tests pass without modification
- [ ] New tests for session persistence scenarios pass

---

## Why

### Business Value and User Impact
- **Session Persistence**: Users can maintain conversation state across application restarts
- **Scalability**: Distributed applications can use Redis/cloud storage for session sharing
- **Flexibility**: Custom storage backends (databases, cloud storage) can be plugged in
- **Migration Path**: Existing code continues working with in-memory storage

### Integration with Existing Features
- Builds on `SessionStore<T>` interface from **P2.M2.T1.S1**
- Uses `serializeSession`/`deserializeSession` from **P2.M2.T1.S2**
- Extends `ProviderOptions` configuration pattern
- Maintains backward compatibility with existing session API

### Problems This Solves
1. **Session Loss**: Sessions cleared on `terminate()` (line 225 in anthropic-provider.ts)
2. **No Persistence**: No way to save sessions to disk or external storage
3. **Tight Coupling**: Hard-coded `Map` storage prevents custom backends

---

## What

### User-Visible Behavior
1. **Default (No Change)**: `new AnthropicProvider()` uses in-memory sessions
2. **File Persistence**: `new AnthropicProvider({ sessionStore: new FileSessionStore('./sessions') })` saves sessions to disk
3. **Custom Store**: `new AnthropicProvider({ sessionStore: new CustomCloudStore() })` uses custom backend
4. **Session Restoration**: After `terminate()` → `initialize()`, persistent sessions are restored

### Technical Requirements
1. **Constructor Injection**: Accept `SessionStore<SessionState>` or config object
2. **Type Detection**: Distinguish `MemorySessionStore` from persistent stores
3. **Session Restoration**: Call `sessionStore.list()` and `sessionStore.load()` in `initialize()`
4. **Session Persistence**: Save all sessions via `sessionStore.save()` in `terminate()`
5. **API Delegation**: Replace `Map` operations with `SessionStore` method calls

### Success Criteria
- [ ] Constructor accepts optional `sessionStore` parameter
- [ ] `MemorySessionStore` is default when no parameter provided
- [ ] `initialize()` restores sessions from non-memory stores
- [ ] `terminate()` persists sessions to non-memory stores
- [ ] `createSession()` delegates to `sessionStore.save()` with idempotency
- [ ] `getSession()` delegates to `sessionStore.load()`
- [ ] `deleteSession()` delegates to `sessionStore.delete()`
- [ ] Backward compatibility: existing code works unchanged
- [ ] No breaking changes to `ProviderOptions` interface

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

✅ **YES** - This PRP provides:
- Exact file paths and line numbers for all modifications
- Complete API signatures for `SessionStore` interface
- Current `AnthropicProvider` implementation details
- Test patterns and validation commands
- External research on pluggable storage patterns
- Specific gotchas and constraints

### Documentation & References

```yaml
# MUST READ - Core Implementation Files
- file: src/providers/anthropic-provider.ts
  why: Target file for SessionStore integration
  pattern: Lines 145: private sessions Map, lines 1022-1051: session methods
  gotcha: SDK initialization checks required before session operations
  critical: terminate() at line 225 calls sessions.clear() - must be conditional

- file: src/providers/session-store.ts
  why: SessionStore interface and implementations
  pattern: Lines 29-79: SessionStore<T> interface definition
  pattern: Lines 93-132: MemorySessionStore implementation
  pattern: Lines 146-235: FileSessionStore implementation
  gotcha: All methods are async - must await operations
  critical: has() method checks for session existence

- file: src/utils/session-serialization.ts
  why: Serialization utilities for persistent stores
  pattern: serializeSession() at line 178, deserializeSession() at line 224
  gotcha: Throws SessionSerializationError with path context
  critical: Circular reference handling via WeakSet

- file: src/types/providers.ts
  why: Type definitions for ProviderOptions and SessionState
  pattern: Lines 36-51: ProviderOptions interface
  pattern: Lines 64-70: SessionState interface definition
  gotcha: SessionState uses SDK types from @anthropic-ai/claude-agent-sdk

# EXISTING TESTS - Follow These Patterns
- file: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  why: Existing session tests - must all pass
  pattern: beforeEach() with ProviderRegistry._resetForTesting() at line 28
  pattern: @ts-expect-error for private property access at line 41
  pattern: SDK initialization check tests at line 77
  critical: Test file uses describe blocks for logical grouping

- file: src/__tests__/unit/providers/session-store.test.ts
  why: SessionStore implementation tests
  pattern: CRUD operation testing for all store types
  pattern: Async/await patterns for all store operations
  gotcha: File-based tests need cleanup in afterEach()

# EXTERNAL RESEARCH - Pluggable Storage Patterns
- url: https://github.com/expressjs/session#session-store-implementation
  why: Express session store pattern - industry standard
  critical: Constructor injection with default MemoryStore
  critical: Store interface with get/set/destroy/all methods

- url: https://github.com/tj/connect-redis
  why: Redis store implementation reference
  pattern: Client injection in constructor
  pattern: Optional factory function pattern

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T1S3/research/external-storage-patterns.md
  why: Comprehensive research on pluggable storage patterns
  section: "Application to SessionStore Integration" (line 1500+)
  critical: Constructor injection + factory pattern recommendation
  critical: Mock store for testing example at line 1635

# CONFIGURATION
- file: vitest.config.ts
  why: Test runner configuration
  pattern: Test file pattern: *.test.ts
  gotcha: Use vi.clearAllMocks() in beforeEach for isolation

- file: package.json
  why: Test scripts and dependencies
  pattern: "test" script runs vitest
  pattern: "@anthropic-ai/claude-agent-sdk" is optional dependency
```

### Current Codebase Tree

```bash
src/
├── providers/
│   ├── anthropic-provider.ts       # TARGET FILE - SessionStore integration
│   ├── session-store.ts            # SessionStore<T> interface
│   ├── provider-registry.ts        # Provider lifecycle management
│   └── index.ts                    # Provider exports
├── types/
│   ├── providers.ts                # ProviderOptions, SessionState types
│   ├── agent.ts                    # AgentResponse type
│   └── index.ts
├── utils/
│   ├── session-serialization.ts    # serializeSession, deserializeSession
│   └── index.ts
└── __tests__/
    └── unit/
        └── providers/
            ├── anthropic-provider-sessions.test.ts  # Existing session tests
            └── session-store.test.ts                # SessionStore tests
```

### Desired Codebase Tree

```bash
# Modified files
src/providers/anthropic-provider.ts      # Add sessionStore parameter, update methods
src/types/providers.ts                   # Add sessionStore to ProviderOptions

# New files (in P2.M2.T1.S4)
src/__tests__/unit/providers/
  └── anthropic-provider-sessionstore.test.ts  # SessionStore integration tests
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: SessionStore methods are async - must await operations
// WRONG: this.sessionStore.save(id, state)
// RIGHT: await this.sessionStore.save(id, state)

// CRITICAL: SDK initialization check before any session operation
// PATTERN: if (!this.sdk) { throw new Error("SDK not initialized..."); }
// LOCATION: Lines 1024, 1072 in anthropic-provider.ts

// CRITICAL: Distinguish MemorySessionStore from persistent stores
// APPROACH 1: instanceof check (recommended)
//   if (!(this.sessionStore instanceof MemorySessionStore))
// APPROACH 2: Type guard property (more flexible)
//   if ('isPersistent' in this.sessionStore && this.sessionStore.isPersistent)

// CRITICAL: FileSessionStore needs JSON serialization
// USE: serializeSession() / deserializeSession() from utils
// HANDLES: Circular refs, functions, symbols, unknown types

// CRITICAL: Idempotency in createSession()
// CURRENT: Map.has() check at line 1030 prevents overwrite
// NEW: Use sessionStore.has() before sessionStore.save()

// CRITICAL: Session restoration in initialize()
// GOTCHA: Don't restore if already initialized (idempotency)
// PATTERN: if (this.sdk) { return; } at line 158

// CRITICAL: Session persistence in terminate()
// GOTCHA: Only persist for non-memory stores
// GOTCHA: Memory store clears sessions (line 225) - keep this behavior

// CRITICAL: Backward compatibility
// REQUIREMENT: new AnthropicProvider() works unchanged
// IMPLEMENTATION: Default parameter = new MemorySessionStore()

// CRITICAL: Type parameter for SessionStore
// TYPE: SessionStore<SessionState> not SessionStore
// SessionState defined at src/types/providers.ts:64-70

// CRITICAL: Private property access in tests
// PATTERN: @ts-expect-error before accessing private properties
// EXAMPLE: // @ts-expect-error - Testing private property
//          expect(provider.sessions.has('test')).toBe(true);
```

---

## Implementation Blueprint

### Data Models and Structures

**Type Extensions Required:**

```typescript
// src/types/providers.ts - Add to ProviderOptions interface
export interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  headers?: Record<string, string>;

  // NEW: Session store configuration
  sessionStore?: SessionStore<SessionState>;
}
```

**No new data models** - using existing:
- `SessionState` (src/types/providers.ts:64-70)
- `SessionStore<T>` (src/providers/session-store.ts:29-79)
- `MemorySessionStore<T>` (src/providers/session-store.ts:93-132)
- `FileSessionStore<T>` (src/providers/session-store.ts:146-235)

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/providers/anthropic-provider.ts - Add sessionStore Property
  - ADD: private sessionStore: SessionStore<SessionState> property (after line 145)
  - REMOVE: private sessions: Map<string, SessionState> at line 145
  - INITIALIZE: In property declaration with default MemorySessionStore
  - NAMING: sessionStore (camelCase, matches interface naming)
  - PLACEMENT: After mcpServerConfig property, before skillsPrompt

Task 2: MODIFY src/types/providers.ts - Extend ProviderOptions
  - ADD: sessionStore?: SessionStore<SessionState> to ProviderOptions interface
  - LOCATION: After headers field at line 50
  - TYPE: Optional property (undefined = use MemorySessionStore)
  - IMPORT: Add import for SessionStore from providers/session-store.ts

Task 3: MODIFY AnthropicProvider.initialize() - Restore Sessions
  - ADD: Session restoration logic after SDK import at line 178
  - CONDITION: Only if sessionStore is not MemorySessionStore
  - LOGIC:
    1. Check if this.sessionStore is not instanceof MemorySessionStore
    2. Call await this.sessionStore.list() to get session IDs
    3. For each ID, call await this.sessionStore.load(id)
    4. Restore sessions (store in cache or let sessionStore handle)
  - GOTCHA: Must be idempotent - check if already initialized
  - PATTERN: Follow SDK initialization idempotency at line 158

Task 4: MODIFY AnthropicProvider.terminate() - Persist Sessions
  - MODIFY: Line 225 - this.sessions.clear() conditional
  - CONDITION: Only clear if sessionStore is MemorySessionStore
  - LOGIC: For non-memory stores, sessions persist in store
  - PRESERVE: Existing cleanup for mcpServerConfig and skillsPrompt
  - GOTCHA: No need to explicitly save - FileSessionStore saves on each write

Task 5: MODIFY AnthropicProvider.createSession() - Delegate to SessionStore
  - REPLACE: Map operations at lines 1030-1035
  - DELEGATE: await this.sessionStore.save(sessionId, emptyState)
  - IDEMPOTENCY: Check await this.sessionStore.has(sessionId) first
  - PRESERVE: SDK initialization check at line 1024
  - SIGNATURE: Keep async (even though sync was ok for Map)

Task 6: MODIFY AnthropicProvider.getSession() - Delegate to SessionStore
  - REPLACE: Map.get() at line 1050
  - DELEGATE: await this.sessionStore.load(sessionId)
  - RETURN: Returns SessionState | null (convert null to undefined)
  - SIGNATURE: Must become async

Task 7: ADD AnthropicProvider.deleteSession() - New Method
  - IMPLEMENT: Delete session via sessionStore.delete()
  - DELEGATE: await this.sessionStore.delete(sessionId)
  - RETURN: boolean (true if deleted, false if not found)
  - LOCATION: After getSession() method, before execute()
  - SDK_CHECK: Must check SDK initialization first

Task 8: MODIFY AnthropicProvider.execute() - Update Session Access
  - UPDATE: Lines 276, 287, 496, 501 - getSession() calls
  - AWAIT: All getSession() calls now return Promise
  - UPDATE: Line 400 - session.history.push() direct mutation
  - GOTCHA: FileSessionStore returns copies - must save after mutation
  - CONSIDER: Save session after each message capture

Task 9: MODIFY AnthropicProvider.executeStreaming() - Update Session Access
  - UPDATE: Lines 496, 501 - getSession() calls (same as Task 8)
  - UPDATE: Lines 620, 627 - session.history and session.lastResult
  - AWAIT: All getSession() calls now return Promise
  - SAVE: Save session after mutations for persistent stores

Task 10: CREATE src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
  - IMPLEMENT: Integration tests for SessionStore
  - TEST: Backward compatibility (no params = MemorySessionStore)
  - TEST: FileSessionStore persistence across terminate/initialize
  - TEST: Custom SessionStore implementation
  - TEST: Session restoration logic in initialize()
  - FOLLOW: Pattern from existing anthropic-provider-sessions.test.ts
  - FIXTURES: MockSessionStore for isolated testing
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// PATTERN 1: Constructor Injection with Default
// ============================================================================
// Location: AnthropicProvider class properties (after line 145)

import { MemorySessionStore, type SessionStore } from './session-store.js';

export class AnthropicProvider implements Provider {
  // ... existing properties ...

  /**
   * Session storage backend
   *
   * Defaults to in-memory storage. Can be replaced with file-based,
   * Redis, or custom implementations via ProviderOptions.
   *
   * @internal
   */
  private sessionStore: SessionStore<SessionState> = new MemorySessionStore();
}

// ============================================================================
// PATTERN 2: Initialize with SessionStore from Options
// ============================================================================
// Location: New method or modify constructor (AnthropicProvider has no constructor)

// Option A: Add setSessionStore() method
export class AnthropicProvider implements Provider {
  /**
   * Configure session storage backend
   *
   * @param store - Session store instance (defaults to MemorySessionStore)
   *
   * @example
   * ```ts
   * const provider = new AnthropicProvider();
   * provider.setSessionStore(new FileSessionStore('./sessions'));
   * ```
   */
  setSessionStore(store: SessionStore<SessionState>): void {
    this.sessionStore = store;
  }
}

// Option B: Use initialize() options (RECOMMENDED - follows existing pattern)
async initialize(options?: ProviderOptions): Promise<void> {
  // ... existing SDK initialization ...

  // Configure session store if provided
  if (options?.sessionStore) {
    this.sessionStore = options.sessionStore;
  }

  // Restore sessions from persistent store
  if (!(this.sessionStore instanceof MemorySessionStore)) {
    const sessionIds = await this.sessionStore.list();
    // Sessions are already in store - no need to load into memory
    // Just verify store is accessible
  }
}

// ============================================================================
// PATTERN 3: Distinguish MemorySessionStore from Persistent Stores
// ============================================================================

// Approach 1: instanceof check (RECOMMENDED)
if (!(this.sessionStore instanceof MemorySessionStore)) {
  // This is a persistent store (File, Redis, custom)
  await this.restoreSessions();
}

// Approach 2: Type guard (for custom stores)
interface PersistentSessionStore<T> extends SessionStore<T> {
  isPersistent?: true;
}

if ('isPersistent' in this.sessionStore && this.sessionStore.isPersistent) {
  // This is a persistent store
}

// ============================================================================
// PATTERN 4: createSession() with Idempotency
// ============================================================================
// Location: Lines 1022-1036

async createSession(sessionId: string): Promise<void> {
  // PATTERN: SDK initialization check (line 1024)
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  // PATTERN: Idempotent operation - check existence first
  const exists = await this.sessionStore.has(sessionId);
  if (!exists) {
    // Create empty session state
    const emptyState: SessionState = {
      history: [],
      lastResult: null,
    };
    await this.sessionStore.save(sessionId, emptyState);
  }
  // If exists, do nothing (idempotent)
}

// ============================================================================
// PATTERN 5: getSession() with Async/Await
// ============================================================================
// Location: Lines 1049-1051

async getSession(sessionId: string): Promise<SessionState | undefined> {
  const state = await this.sessionStore.load(sessionId);
  // Convert null to undefined for consistency
  return state ?? undefined;
}

// ============================================================================
// PATTERN 6: deleteSession() - New Method
// ============================================================================
// Location: After getSession(), before execute()

async deleteSession(sessionId: string): Promise<boolean> {
  // PATTERN: SDK initialization check
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  return await this.sessionStore.delete(sessionId);
}

// ============================================================================
// PATTERN 7: terminate() with Conditional Clear
// ============================================================================
// Location: Lines 205-229

async terminate(): Promise<void> {
  // Idempotent check (line 208)
  if (this.sdk === null) {
    return;
  }

  // Clear SDK reference (line 216)
  this.sdk = null;

  // Clear MCP server config (line 219)
  this.mcpServerConfig = null;

  // Clear skills prompt (line 222)
  this.skillsPrompt = '';

  // MODIFIED: Conditional session clear (line 225)
  // Only clear in-memory sessions - persistent sessions stay in store
  if (this.sessionStore instanceof MemorySessionStore) {
    await this.sessionStore.clear();
  }
  // For persistent stores, sessions remain in storage
}

// ============================================================================
// PATTERN 8: execute() with Async Session Access
// ============================================================================
// Location: Lines 269-290 (session detection and retrieval)

// BEFORE (sync):
const session = this.getSession(sessionId);

// AFTER (async):
const session = await this.getSession(sessionId);

// GOTCHA: Session mutation for persistent stores
// FileSessionStore returns a COPY, not the original reference
// Must save after mutations:

if (message.type === "user" && session) {
  // Update local copy
  session.history.push(message as SDKUserMessage);

  // CRITICAL: Save back to store for persistent backends
  if (!(this.sessionStore instanceof MemorySessionStore)) {
    await this.sessionStore.save(sessionId, session);
  }
}
```

### Integration Points

```yaml
PROVIDER_OPTIONS:
  - file: src/types/providers.ts
  - add to: ProviderOptions interface (line 36)
  - pattern: "sessionStore?: SessionStore<SessionState>"
  - default: undefined (use MemorySessionStore)

EXPORTS:
  - file: src/providers/index.ts
  - add: Export SessionStore, MemorySessionStore, FileSessionStore
  - existing: Already exported at line 9

SERIALIZATION:
  - file: src/utils/index.ts
  - add: Export serializeSession, deserializeSession (already exported)
  - usage: FileSessionStore uses JSON.stringify (not serializeSession)
  - note: Manual serialization ok for now - P2.M2.T1.S4 will integrate

TEST_REGISTRY:
  - file: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  - modify: Add SessionStore integration tests
  - preserve: All existing tests must pass
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npm run check      # TypeScript type checking
npm run lint       # ESLint - auto-fix issues
npm run format     # Prettier - ensure consistent formatting

# Individual file checks
npx tsc --noEmit src/providers/anthropic-provider.ts
npx eslint src/providers/anthropic-provider.ts --fix
npx prettier --write src/providers/anthropic-provider.ts

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
# GOTCHA: TypeScript will error on async getSession() if execute() not updated
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as modified
npm test -- anthropic-provider-sessions.test.ts    # Existing tests - MUST ALL PASS
npm test -- session-store.test.ts                  # SessionStore tests

# Run new tests when created
npm test -- anthropic-provider-sessionstore.test.ts  # New integration tests

# Full provider test suite
npm test -- --run src/__tests__/unit/providers/

# Coverage validation (if coverage tools available)
npm run test:coverage

# Expected: All tests pass. If failing:
# 1. Check for missing await on async operations
# 2. Verify instanceof checks for MemorySessionStore
# 3. Ensure SessionStore methods are awaited
```

### Level 3: Integration Testing (System Validation)

```bash
# Test backward compatibility - default behavior unchanged
node -e "
import { AnthropicProvider } from './src/index.js';
const provider = new AnthropicProvider();
// Should use MemorySessionStore by default
console.log('Provider created successfully');
"

# Test FileSessionStore persistence
node -e "
import { AnthropicProvider, FileSessionStore } from './src/index.js';
import { rm } from 'fs/promises';

const store = new FileSessionStore('./test-sessions');
const provider = new AnthropicProvider();
provider.setSessionStore(store);

await provider.initialize();
provider.createSession('test-session-1');
await provider.terminate();

// Sessions should be in ./test-sessions/test-session-1.json
await rm('./test-sessions', { recursive: true, force: true });
console.log('FileSessionStore test passed');
"

# Test custom SessionStore implementation
node -e "
import { AnthropicProvider } from './src/index.js';

class CustomStore {
  constructor() { this.data = new Map(); }
  async save(id, state) { this.data.set(id, state); }
  async load(id) { return this.data.get(id) ?? null; }
  async delete(id) { return this.data.delete(id); }
  async list() { return Array.from(this.data.keys()); }
  async has(id) { return this.data.has(id); }
  async clear() { this.data.clear(); }
}

const provider = new AnthropicProvider();
provider.setSessionStore(new CustomStore());
await provider.initialize();
provider.createSession('custom-session');
console.log('Custom store test passed');
"

# Expected: All integration tests pass without errors
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Session Persistence Validation
# Test: Sessions survive terminate() -> initialize() cycle

cat > /tmp/test-persistence.mjs << 'EOF'
import { AnthropicProvider, FileSessionStore } from './dist/index.js';
import { readFile, unlink } from 'fs/promises';

async function test() {
  const store = new FileSessionStore('/tmp/test-sessions');
  const provider = new AnthropicProvider();
  provider.setSessionStore(store);

  // First lifecycle
  await provider.initialize();
  provider.createSession('persist-test');

  // Verify session exists
  const session1 = await provider.getSession('persist-test');
  console.log('Session before terminate:', session1 ? 'exists' : 'missing');

  await provider.terminate();

  // Verify session saved to disk
  const fileContent = await readFile('/tmp/test-sessions/persist-test.json', 'utf-8');
  console.log('File saved:', JSON.parse(fileContent));

  // Second lifecycle
  await provider.initialize();

  // Verify session restored
  const session2 = await provider.getSession('persist-test');
  console.log('Session after initialize:', session2 ? 'restored' : 'missing');

  await provider.terminate();
  await unlink('/tmp/test-sessions/persist-test.json');
}

test().catch(console.error);
EOF

node /tmp/test-persistence.mjs

# Expected output:
# Session before terminate: exists
# File saved: { history: [], lastResult: null }
# Session after initialize: restored
```

---

## Final Validation Checklist

### Technical Validation
- [ ] All 4 validation levels completed successfully
- [ ] All existing tests pass: `npm test -- anthropic-provider-sessions.test.ts`
- [ ] No TypeScript errors: `npm run check`
- [ ] No linting errors: `npm run lint`
- [ ] No formatting issues: `npm run format`

### Feature Validation
- [ ] Backward compatibility: `new AnthropicProvider()` works unchanged
- [ ] `FileSessionStore` sessions persist across terminate/initialize
- [ ] Custom `SessionStore` implementations work via `setSessionStore()`
- [ ] Session operations delegate to `SessionStore` API
- [ ] SDK initialization checks preserved
- [ ] Idempotency maintained in `createSession()`
- [ ] `getSession()` returns `undefined` for missing sessions (not `null`)

### Code Quality Validation
- [ ] Follows existing codebase patterns (SDK checks, error handling)
- [ ] File placement matches desired codebase tree
- [ ] Async/await used consistently for SessionStore operations
- [ ] InstanceOf checks used for MemorySessionStore detection
- [ ] No breaking changes to public API
- [ ] Private property access in tests uses `@ts-expect-error`

### Documentation & Deployment
- [ ] JSDoc comments added for new/modified methods
- [ ] Backward compatibility documented in code comments
- [ ] Session persistence behavior clearly documented
- [ ] Examples provided for FileSessionStore usage

---

## Anti-Patterns to Avoid

- ❌ **Don't make getSession() synchronous** - SessionStore.load() is async
- ❌ **Don't forget to await SessionStore operations** - All methods return Promises
- ❌ **Don't use Map operations** - Replace with SessionStore method calls
- ❌ **Don't break backward compatibility** - Default must be MemorySessionStore
- ❌ **Don't skip SDK initialization checks** - Required before session operations
- ❌ **Don't clear FileSessionStore in terminate()** - Sessions should persist
- ❌ **Don't mutate FileSessionStore results without saving** - Returns copies
- ❌ **Don't add sessionStore to constructor** - AnthropicProvider has no constructor
- ❌ **Don't change existing test behavior** - All existing tests must pass
- ❌ **Don't use type assertions** - Use instanceof for type narrowing

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Rationale**:
- ✅ Complete API documentation for SessionStore interface
- ✅ Exact line numbers and patterns for all modifications
- ✅ Comprehensive external research on pluggable storage patterns
- ✅ Existing test patterns clearly documented
- ✅ All gotchas and constraints identified
- ⚠️ Only uncertainty: Async migration of getSession() may affect execute() flow

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to:
1. Replace `Map` with `SessionStore` interface
2. Handle async operations correctly
3. Maintain backward compatibility
4. Pass all existing and new tests
