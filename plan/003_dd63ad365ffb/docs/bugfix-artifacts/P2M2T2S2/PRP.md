---

## Goal

**Feature Goal**: Implement session time-to-live (TTL) enforcement and automatic cleanup for session persistence, ensuring expired sessions are automatically removed and storage doesn't accumulate stale data.

**Deliverable**:
1. Extended `SessionState` interface with `createdAt` and `lastAccessedAt` timestamps
2. Modified `FileSessionStore` with TTL checking on load and `deleteExpired()` cleanup method
3. Extended `SessionStore` interface with `deleteExpired(ttl?: number): Promise<string[]>` method
4. Updated `AnthropicProvider` to pass `sessionTtl` to `FileSessionStore` and call cleanup on initialize
5. Full test coverage for TTL expiration, edge cases, and cleanup operations

**Success Definition**:
- Sessions expire after configured TTL duration (default 24 hours)
- Expired sessions return `null` on load (lazy expiration)
- Cleanup method removes expired sessions and returns count of deleted session IDs
- TTL is validated (negative values rejected, zero means never expire)
- Clock skew is handled with 60-second tolerance window
- All existing tests pass without modification (backward compatible)
- New tests verify TTL behavior with fake timers

## User Persona

**Target User**: Library consumers using session persistence who want automatic session expiration to prevent storage bloat and enforce security policies.

**Use Case**: A developer wants user sessions to automatically expire after 24 hours of inactivity, with periodic cleanup to remove expired sessions from disk.

**User Journey**:
1. Developer configures provider with `{ sessionPersistence: 'file', sessionTtl: 86400000 }`
2. Sessions are created with `createdAt` and `lastAccessedAt` timestamps
3. On each session access, `lastAccessedAt` is updated
4. When loading a session, if `lastAccessedAt + ttl < now`, session is treated as expired
5. Expired sessions are automatically removed during cleanup
6. Application storage doesn't accumulate stale session data

**Pain Points Addressed**:
- Sessions currently persist indefinitely (no expiration)
- No built-in cleanup mechanism
- Manual session management required
- Storage accumulates stale data over time
- Security risk of old sessions being valid indefinitely

## Why

- **Business value**: Enables production-ready session management with automatic expiration, reducing storage costs and improving security
- **User impact**: Eliminates need for manual session cleanup, provides configurable TTL for compliance requirements
- **Integration**: Builds on P2.M2.T2.S1 (sessionTtl configuration) to implement the actual TTL enforcement
- **Problems solved**: Prevents storage bloat, provides automatic session expiration, enables security policies through TTL

## What

Implement session TTL enforcement by:

1. **Extend SessionState** with `createdAt` and `lastAccessedAt` timestamps (Unix milliseconds)
2. **Modify FileSessionStore** to:
   - Update timestamps on save
   - Check expiration on load (return null if expired)
   - Implement `deleteExpired(ttl)` cleanup method
3. **Extend SessionStore interface** with `deleteExpired(ttl?: number)` method
4. **Update AnthropicProvider** to:
   - Pass sessionTtl to FileSessionStore constructor
   - Call cleanup on initialize (for persistent stores)
5. **Handle edge cases**: negative TTL, zero TTL, clock skew, disabled TTL

### Success Criteria

- [ ] SessionState extended with `createdAt: number` and `lastAccessedAt: number`
- [ ] FileSessionStore updates timestamps on every save operation
- [ ] FileSessionStore.load() returns null for expired sessions (lastAccessedAt + ttl < now)
- [ ] FileSessionStore.deleteExpired() removes and returns list of expired session IDs
- [ ] SessionStore interface has deleteExpired(ttl?: number): Promise<string[]> method
- [ ] AnthropicProvider passes sessionTtl to FileSessionStore
- [ ] AnthropicProvider.initialize() calls cleanup for persistent stores
- [ ] TTL validation: negative values throw error, zero means never expire
- [ ] Clock skew handled with 60-second tolerance window
- [ ] All existing tests pass without modification
- [ ] New tests verify TTL expiration, cleanup, and edge cases
- [ ] JSDoc documentation complete

## All Needed Context

### Context Completeness Check

**Before implementing**, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

✅ This PRP provides:
- Exact file paths and line numbers for all modifications
- Complete code examples from existing patterns to follow
- Research findings on TTL best practices from external sources
- Specific test patterns using Vitest fake timers
- Known gotchas and constraints
- Integration with previous PRP (P2.M2.T2.S1) outputs

### Documentation & References

```yaml
# MUST READ - Critical context for implementation

# Previous PRP (Session Configuration)
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T2S1/PRP.md
  why: Defines sessionTtl configuration that this PRP consumes
  critical: sessionTtl?: number property (milliseconds, default 86400000)
  gotcha: Previous PRP creates the option, this PRP implements the enforcement

# External TTL Research
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T2S2/research/external-ttl-research.md
  why: Comprehensive research on TTL best practices, edge cases, and cleanup strategies
  critical: Hybrid expiration (lazy + active), clock skew tolerance, validation patterns
  gotcha: Use milliseconds for TTL, 60-second tolerance window for clock skew

# SessionState Type Definition
- file: src/types/providers.ts
  why: Target interface to extend with timestamps
  pattern: All properties are optional with JSDoc documentation
  lines: 71-77
  gotcha: Current SessionState has no timestamps - must add createdAt and lastAccessedAt

# SessionStore Interface and Implementations
- file: src/providers/session-store.ts
  why: Must extend SessionStore interface and modify FileSessionStore
  pattern: All methods are async, return Promise
  lines: 29-79 (interface), 146-235 (FileSessionStore)
  gotcha: FileSessionStore uses JSON serialization - must ensure timestamps persist

# AnthropicProvider Integration Point
- file: src/providers/anthropic-provider.ts
  why: Must update to pass sessionTtl and call cleanup
  pattern: Constructor injection with SessionStore, initialize() handles store creation
  lines: 151 (sessionStore property), 186-221 (initialize method), 1147-1203 (session methods)
  gotcha: Uses instanceof checks to distinguish memory vs persistent stores
  gotcha: Must store sessionTtl for cleanup calls

# Session Serialization Utilities
- file: src/utils/session-serialization.ts
  why: Must verify timestamp serialization works correctly
  pattern: Uses JSON.stringify with custom replacer for circular references
  lines: 70-100 (replacer function), 178-190 (serializeSession)
  gotcha: Timestamps are numbers - should serialize without issues

# Test Pattern: SessionStore Tests
- file: src/__tests__/unit/providers/session-store.test.ts
  why: Pattern for testing SessionStore implementations
  pattern: beforeEach/afterEach for cleanup, use vi.useFakeTimers() for time-based tests
  lines: 1-620 (entire file)
  gotcha: Use rm() for test directory cleanup in afterEach

# Test Pattern: SessionStore Integration Tests
- file: src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
  why: Pattern for testing SessionStore integration with AnthropicProvider
  pattern: Test persistence across terminate/initialize cycles
  lines: 1-609 (entire file)
  gotcha: Must test both MemorySessionStore and FileSessionStore behaviors

# Timestamp Pattern Reference
- file: src/types/providers.ts
  why: Reference for timestamp representation in codebase
  pattern: Unix timestamps in milliseconds (number), not Date objects
  lines: 347 (timestamp: number), 391-394 (timestamp in metadata)
  gotcha: Use Date.now() for timestamps, store as number milliseconds

# Cache TTL Pattern (for reference)
- file: src/cache/cache.ts
  why: Reference for existing TTL implementation in codebase
  pattern: defaultTTLMs?: number in milliseconds, uses updateAgeOnGet
  lines: 21-22, 68, 86
  gotcha: Similar pattern - can use for consistency

# Vitest Fake Timers Documentation
- url: https://vitest.dev/api/#vi-usefaketimers
  why: Required for testing TTL without waiting for real time to pass
  critical: vi.useFakeTimers(), vi.advanceTimersByTime(), vi.useRealTimers()
  gotcha: Must restore real timers in afterEach

# Node.js File System Documentation
- url: https://nodejs.org/api/fs.html
  why: Reference for file operations in cleanup implementation
  critical: readdir, unlink, stat for file metadata
  gotcha: Use promises API (fs/promises) for async operations
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── providers/
│   ├── anthropic-provider.ts       # MODIFY: Pass sessionTtl, call cleanup on initialize
│   ├── session-store.ts            # MODIFY: Extend interface, implement TTL in FileSessionStore
│   └── index.ts
├── types/
│   ├── providers.ts                # MODIFY: Extend SessionState with timestamps
│   └── index.ts
├── utils/
│   ├── session-serialization.ts    # REFERENCE: Verify timestamp serialization
│   └── index.ts
└── __tests__/
    └── unit/
        ├── providers/
        │   ├── session-store.test.ts                     # MODIFY: Add TTL tests
        │   └── anthropic-provider-sessionstore.test.ts   # MODIFY: Add TTL integration tests
```

### Desired Codebase Tree (new/modified files)

```bash
# No new files - modifications only

# MODIFIED FILES:
src/
├── providers/
│   ├── anthropic-provider.ts       # UPDATE: Pass sessionTtl to FileSessionStore, call cleanup
│   └── session-store.ts            # UPDATE: Extend interface, add TTL logic to FileSessionStore
├── types/
│   └── providers.ts                # EXTEND: Add createdAt, lastAccessedAt to SessionState
└── __tests__/
    └── unit/
        └── providers/
            ├── session-store.test.ts                     # EXTEND: Add TTL test suite
            └── anthropic-provider-sessionstore.test.ts   # EXTEND: Add TTL integration tests
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Timestamp Representation
// Codebase uses Unix timestamps in MILLISECONDS (number), not Date objects
// Use Date.now() for current time, store as number
// Example: timestamp: Date.now() or timestamp: 1706140800000

// CRITICAL: SessionState Backward Compatibility
// Adding new optional fields (createdAt, lastAccessedAt) maintains compatibility
// Existing sessions without timestamps will be treated as created at load time
// Pattern: Use nullish coalescing to provide defaults for legacy sessions

// CRITICAL: FileSessionStore Copy Behavior
// FileSessionStore.load() returns parsed JSON - creates a NEW object each time
// Mutations to loaded session don't persist without explicit save()
// Pattern: Always call save() after modifying session state

// CRITICAL: TTL from Previous PRP (P2.M2.T2.S1)
// sessionTtl is defined in ProviderOptions but NOT YET IMPLEMENTED
// This PRP implements the actual TTL enforcement
// Default: 86400000 milliseconds (24 hours)

// CRITICAL: MemorySessionStore vs FileSessionStore TTL
// MemorySessionStore: TTL is optional (in-memory cleared on terminate anyway)
// FileSessionStore: TTL is critical (persistent storage accumulates without it)
// Priority: Implement TTL for FileSessionStore first

// CRITICAL: SessionTtl Configuration
// sessionTtl comes from ProviderOptions.sessionTtl (from previous PRP)
// Need to store sessionTtl in AnthropicProvider for cleanup calls
// Pattern: Add private property or read from options during cleanup

// CRITICAL: Clock Skew Handling
// Use 60-second tolerance window when checking expiration
// Formula: (lastAccessedAt + ttl + tolerance) < now
// Tolerance: 60000 milliseconds (60 seconds)

// CRITICAL: TTL Edge Cases
// Negative TTL: Throw error (invalid configuration)
// Zero TTL: Means "never expire" (disable expiration)
// Very large TTL: Clamp to maximum (1 year = 31536000000 ms)
// Undefined TTL: Use default (86400000 ms = 24 hours)

// CRITICAL: Cleanup Strategy
// Lazy expiration: Check on load() - return null if expired
// Active cleanup: deleteExpired() method for manual/periodic cleanup
// Hybrid approach: Both strategies (lazy prevents serving expired data)
// Cleanup frequency: On initialize() for persistent stores

// CRITICAL: Test Fake Timers
// Must use vi.useFakeTimers() before tests
// Must use vi.useRealTimers() in afterEach
// Use vi.advanceTimersByTime(ms) to simulate time passing
// Pattern: beforeEach => vi.useFakeTimers(), afterEach => vi.useRealTimers()

// CRITICAL: File Cleanup Pattern
// Use readdir() to list all session files
// Use stat() or read file to check timestamps
// Use unlink() to delete expired session files
// Batch deletions with Promise.all() for performance

// CRITICAL: instanceof Pattern for Store Detection
// AnthropicProvider uses instanceof MemorySessionStore to detect store type
// Must preserve this pattern when adding TTL logic
// Pattern: if (!(this.sessionStore instanceof MemorySessionStore)) { ... }

// CRITICAL: JSON Serialization
// Timestamps are numbers - serialize correctly with JSON.stringify
// No custom replacer needed for timestamps (unlike circular references)
// session-serialization.ts should work without modification
```

## Implementation Blueprint

### Data Models and Structure

Extend SessionState with timestamp fields for TTL tracking.

```typescript
// Existing type (will be extended)
export interface SessionState {
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;

  // NEW FIELDS TO ADD:
  // createdAt?: number;  // Unix timestamp in milliseconds when session was created
  // lastAccessedAt?: number;  // Unix timestamp in milliseconds when session was last accessed
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/providers.ts - Extend SessionState interface
  - ADD: createdAt optional property to SessionState interface
  - TYPE: number (Unix timestamp in milliseconds)
  - OPTIONAL: Yes (for backward compatibility with legacy sessions)
  - JSDOC: "Unix timestamp in milliseconds when session was created. Set automatically on session creation."
  - DEFAULT: Date.now() when session is created

  - ADD: lastAccessedAt optional property to SessionState interface
  - TYPE: number (Unix timestamp in milliseconds)
  - OPTIONAL: Yes (for backward compatibility with legacy sessions)
  - JSDOC: "Unix timestamp in milliseconds when session was last accessed. Updated automatically on session load/save."
  - DEFAULT: Date.now() on save operations

  - PRESERVE: All existing properties (history, lastResult)
  - PLACEMENT: Add new properties after lastResult (around line 77)
  - NAMING: camelCase following existing pattern (createdAt, lastAccessedAt)
  - PATTERN: Follow timestamp pattern from src/types/providers.ts:347

Task 2: MODIFY src/providers/session-store.ts - Extend SessionStore interface
  - ADD: deleteExpired() method to SessionStore interface
  - SIGNATURE: deleteExpired(ttl?: number): Promise<string[]>
  - OPTIONAL PARAMETER: ttl in milliseconds (uses default if not provided)
  - RETURNS: Promise resolving to array of deleted session IDs
  - JSDOC: |
    Delete expired sessions from storage.
    @param ttl - Time-to-live in milliseconds. Sessions older than (lastAccessedAt + ttl) are deleted.
    @returns Array of session IDs that were deleted.
  - PLACEMENT: After clear() method (around line 79)
  - PATTERN: Follow existing method signatures (async, returns Promise)

Task 3: MODIFY src/providers/session-store.ts - Implement FileSessionStore TTL logic
  - ADD: Private property to store TTL
  - PROPERTY: private ttl?: number
  - TYPE: number (milliseconds) or undefined
  - PLACEMENT: After existing directory property (around line 148)

  - MODIFY: Constructor to accept optional ttl parameter
  - SIGNATURE: constructor(directory?: string, ttl?: number)
  - DEFAULT: directory = './sessions', ttl = undefined
  - PATTERN: Follow existing constructor pattern (around line 149)

  - MODIFY: save() method to update timestamps
  - FIND: Existing save() method (around line 161)
  - ADD: Update state.lastAccessedAt = Date.now() before saving
  - ADD: Set state.createdAt = state.createdAt ?? Date.now() (preserve original creation time)
  - PATTERN: |
    // Update timestamps before saving
    const now = Date.now();
    state.lastAccessedAt = now;
    state.createdAt = state.createdAt ?? now;
  - GOTCHA: Must handle case where state doesn't have timestamps yet (legacy sessions)

  - MODIFY: load() method to check expiration
  - FIND: Existing load() method (around line 178)
  - ADD: After parsing JSON, check if session is expired
  - PATTERN: |
    // Check expiration if TTL is configured
    if (this.ttl !== undefined && this.ttl > 0) {
      const state = parsed as SessionState;
      const lastAccessedAt = state.lastAccessedAt ?? state.createdAt ?? Date.now();
      const expirationTime = lastAccessedAt + this.ttl + 60000; // 60s tolerance
      if (expirationTime < Date.now()) {
        // Session expired, delete and return null
        await this.delete(sessionId);
        return null;
      }
    }
  - GOTCHA: Use 60-second tolerance window for clock skew
  - GOTCHA: Handle sessions without timestamps (legacy sessions)

  - ADD: deleteExpired() method implementation
  - IMPLEMENT: |
    async deleteExpired(ttl?: number): Promise<string[]> {
      const effectiveTtl = ttl ?? this.ttl;
      if (effectiveTtl === undefined || effectiveTtl <= 0) {
        // No expiration or TTL disabled
        return [];
      }

      const now = Date.now();
      const expiredIds: string[] = [];

      try {
        await this.ensureDirectory();
        const files = await readdir(this.directory);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const sessionId = file.replace('.json', '');
          const path = this.getPath(sessionId);

          try {
            const content = await readFile(path, 'utf-8');
            const state = JSON.parse(content) as SessionState;

            // Check expiration with tolerance
            const lastAccessedAt = state.lastAccessedAt ?? state.createdAt ?? now;
            const expirationTime = lastAccessedAt + effectiveTtl + 60000; // 60s tolerance

            if (expirationTime < now) {
              await this.delete(sessionId);
              expiredIds.push(sessionId);
            }
          } catch {
            // Skip files that can't be read or parsed
            continue;
          }
        }

        return expiredIds;
      } catch (error: unknown) {
        const err = error as NodeJS.ErrnoException;
        throw new Error(`Failed to delete expired sessions: ${err.message}`);
      }
    }
  - PATTERN: Follow clear() method pattern for iteration (around line 226)
  - GOTCHA: Use try-catch around individual file operations to continue on errors
  - GOTCHA: Use 60-second tolerance window (60000 ms)

Task 4: MODIFY src/providers/session-store.ts - Implement MemorySessionStore.deleteExpired()
  - ADD: deleteExpired() method to MemorySessionStore class
  - SIGNATURE: async deleteExpired(ttl?: number): Promise<string[]>
  - IMPLEMENT: |
    async deleteExpired(ttl?: number): Promise<string[]> {
      // MemorySessionStore is cleared on terminate, so TTL is less critical
      // Implement for interface consistency
      const effectiveTtl = ttl ?? this.defaultTtl;
      if (effectiveTtl === undefined || effectiveTtl <= 0) {
        return [];
      }

      const now = Date.now();
      const expiredIds: string[] = [];

      for (const [sessionId, state] of this.sessions.entries()) {
        const lastAccessedAt = (state as any).lastAccessedAt ?? (state as any).createdAt ?? now;
        const expirationTime = lastAccessedAt + effectiveTtl + 60000; // 60s tolerance

        if (expirationTime < now) {
          this.sessions.delete(sessionId);
          expiredIds.push(sessionId);
        }
      }

      return expiredIds;
    }
  - PATTERN: Follow FileSessionStore.deleteExpired() logic
  - GOTCHA: Need to access private sessions Map - use this.sessions

Task 5: MODIFY src/providers/anthropic-provider.ts - Store sessionTtl for cleanup
  - ADD: Private property to store sessionTtl
  - PROPERTY: private sessionTtl?: number
  - TYPE: number (milliseconds) or undefined
  - PLACEMENT: After sessionStore property (around line 152)
  - JSDOC: "Session TTL in milliseconds from ProviderOptions"

  - MODIFY: initialize() method to store sessionTtl
  - FIND: SessionStore creation logic (around line 191)
  - ADD: Store sessionTtl from options when creating FileSessionStore
  - PATTERN: |
    // Store sessionTtl for cleanup operations
    this.sessionTtl = options.sessionTtl ?? 86400000; // 24 hours default

    // Create FileSessionStore with TTL
    this.sessionStore = new FileSessionStore<SessionState>(path, this.sessionTtl);
  - GOTCHA: Must pass sessionTtl to FileSessionStore constructor
  - GOTCHA: Default to 86400000 if not specified (24 hours)

  - MODIFY: initialize() method to call cleanup for persistent stores
  - FIND: Session restoration logic (around line 217)
  - ADD: After listing sessions, call deleteExpired() for persistent stores
  - PATTERN: |
    // Restore sessions from persistent store (non-memory stores)
    if (!(this.sessionStore instanceof MemorySessionStore)) {
      const sessionIds = await this.sessionStore.list();

      // Cleanup expired sessions on initialization
      if (this.sessionTtl !== undefined && 'deleteExpired' in this.sessionStore) {
        const deletedIds = await this.sessionStore.deleteExpired(this.sessionTtl);
        if (deletedIds.length > 0) {
          // Log cleanup (optional, for debugging)
          console.debug(`Cleaned up ${deletedIds.length} expired sessions`);
        }
      }
    }
  - GOTCHA: Check if deleteExpired method exists (method might not be in all implementations)
  - GOTCHA: Only cleanup for persistent stores (not MemorySessionStore)

  - MODIFY: createSession() method to initialize timestamps
  - FIND: Existing createSession() method (around line 1147)
  - MODIFY: emptyState to include timestamps
  - PATTERN: |
    const emptyState: SessionState = {
      history: [],
      lastResult: null,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };
  - GOTCHA: Initialize both timestamps on new sessions

  - MODIFY: getSession() method to update lastAccessedAt
  - FIND: Existing getSession() method (around line 1177)
  - ADD: Update lastAccessedAt timestamp after loading
  - PATTERN: |
    async getSession(sessionId: string): Promise<SessionState | undefined> {
      const state = await this.sessionStore.load(sessionId);
      if (state) {
        // Update lastAccessedAt timestamp
        state.lastAccessedAt = Date.now();
        // Save back to store for persistent stores
        if (!(this.sessionStore instanceof MemorySessionStore)) {
          await this.sessionStore.save(sessionId, state);
        }
      }
      return state ?? undefined;
    }
  - GOTCHA: Must save back to persistent stores after updating timestamp
  - GOTCHA: MemorySessionStore doesn't need save (same reference)

Task 6: CREATE src/__tests__/unit/providers/session-store-ttl.test.ts
  - IMPLEMENT: Comprehensive tests for TTL functionality
  - FOLLOW: Pattern from session-store.test.ts
  - TEST CASES:
    1. "should set createdAt and lastAccessedAt on new sessions"
    2. "should update lastAccessedAt on save"
    3. "should load session within TTL"
    4. "should return null for expired session"
    5. "should delete expired sessions and return IDs"
    6. "should not delete active sessions"
    7. "should handle sessions without timestamps (legacy)"
    8. "should handle zero TTL (never expire)"
    9. "should throw error for negative TTL"
    10. "should use 60-second tolerance window for clock skew"

  - PATTERN: |
    describe('FileSessionStore TTL', () => {
      const TEST_DIR = './test-sessions-ttl';
      const TTL_MS = 1000; // 1 second for testing
      let store: FileSessionStore<SessionState>;

      beforeEach(() => {
        vi.useFakeTimers();
        store = new FileSessionStore<SessionState>(TEST_DIR, TTL_MS);
      });

      afterEach(async () => {
        vi.useRealTimers();
        try {
          await rm(TEST_DIR, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      });

      it('should set timestamps on save', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('test-session', state);

        const loaded = await store.load('test-session');
        expect(loaded?.createdAt).toBeDefined();
        expect(loaded?.lastAccessedAt).toBeDefined();
      });

      it('should return null for expired session', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('expired-session', state);

        // Advance time past TTL (1 second + tolerance)
        vi.advanceTimersByTime(61000);

        const loaded = await store.load('expired-session');
        expect(loaded).toBeNull();
      });

      it('should delete expired sessions and return IDs', async () => {
        await store.save('session-1', { history: [], lastResult: null });
        await store.save('session-2', { history: [], lastResult: null });

        // Advance time past TTL
        vi.advanceTimersByTime(61000);

        const deleted = await store.deleteExpired(TTL_MS);
        expect(deleted).toHaveLength(2);
        expect(deleted).toContain('session-1');
        expect(deleted).toContain('session-2');
      });

      it('should not delete active sessions', async () => {
        await store.save('active-session', { history: [], lastResult: null });

        // Advance time within TTL
        vi.advanceTimersByTime(500);

        const deleted = await store.deleteExpired(TTL_MS);
        expect(deleted).toHaveLength(0);

        const loaded = await store.load('active-session');
        expect(loaded).not.toBeNull();
      });
    });
  - NAMING: session-store-ttl.test.ts
  - PLACEMENT: src/__tests__/unit/providers/
  - COVERAGE: All TTL scenarios and edge cases

Task 7: MODIFY src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
  - VERIFY: All existing tests still pass with timestamp modifications
  - ADD: Integration tests for TTL functionality
  - TEST CASES:
    1. "should create sessions with timestamps"
    2. "should update lastAccessedAt on session access"
    3. "should cleanup expired sessions on initialize"
    4. "should pass sessionTtl to FileSessionStore"

  - PATTERN: |
    describe('Session TTL Integration', () => {
      it('should create sessions with timestamps', async () => {
        const fileStore = new FileSessionStore(testSessionDir);
        await provider.initialize({
          sessionStore: fileStore,
          sessionTtl: 86400000,
        });

        await provider.createSession('timestamp-test');

        const session = await provider.getSession('timestamp-test');
        expect(session?.createdAt).toBeDefined();
        expect(session?.lastAccessedAt).toBeDefined();
      });

      it('should cleanup expired sessions on initialize', async () => {
        vi.useFakeTimers();

        const fileStore = new FileSessionStore(testSessionDir);
        await provider.initialize({
          sessionStore: fileStore,
          sessionTtl: 1000, // 1 second TTL
        });

        await provider.createSession('expired-session');

        // Advance time past TTL
        vi.advanceTimersByTime(61000);

        await provider.terminate();
        await provider.initialize({
          sessionStore: fileStore,
          sessionTtl: 1000,
        });

        // Session should be cleaned up
        const session = await provider.getSession('expired-session');
        expect(session).toBeUndefined();

        vi.useRealTimers();
      });
    });
  - PLACEMENT: Add to existing test file
  - GOTCHA: Must use vi.useFakeTimers() and vi.useRealTimers()

Task 8: VALIDATE backward compatibility
  - VERIFY: All existing tests pass without modification
  - VERIFY: SessionState without timestamps is handled correctly
  - VERIFY: FileSessionStore without TTL parameter works as before
  - VERIFY: MemorySessionStore behavior unchanged
  - RUN: npm test -- src/__tests__/unit/providers/session-store.test.ts
  - RUN: npm test -- src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// CRITICAL PATTERNS - Follow these exactly
// ============================================================================

// Pattern 1: Timestamp Initialization
// Always use Date.now() for current timestamp (milliseconds)
const now = Date.now();
const session: SessionState = {
  history: [],
  lastResult: null,
  createdAt: now,
  lastAccessedAt: now,
};

// Pattern 2: Timestamp Update on Save
// Preserve original createdAt, update lastAccessedAt
async save(sessionId: string, state: SessionState): Promise<void> {
  const now = Date.now();
  state.lastAccessedAt = now;
  state.createdAt = state.createdAt ?? now; // Preserve original
  // ... rest of save logic
}

// Pattern 3: Expiration Check with Tolerance
// Use 60-second tolerance window for clock skew
function isExpired(session: SessionState, ttl: number): boolean {
  const lastAccessedAt = session.lastAccessedAt ?? session.createdAt ?? Date.now();
  const expirationTime = lastAccessedAt + ttl + 60000; // 60s tolerance
  return expirationTime < Date.now();
}

// Pattern 4: Legacy Session Handling
// Sessions without timestamps should use current time as fallback
function getEffectiveTimestamp(session: SessionState): number {
  return session.lastAccessedAt ?? session.createdAt ?? Date.now();
}

// Pattern 5: TTL Validation
// Validate TTL values before use
function validateTtl(ttl?: number): number | undefined {
  if (ttl === undefined) return undefined;
  if (ttl < 0) throw new Error(`Invalid TTL: ${ttl}. TTL must be non-negative.`);
  if (ttl === 0) return 0; // Zero means never expire
  const MAX_TTL = 31536000000; // 1 year in milliseconds
  return Math.min(ttl, MAX_TTL); // Clamp to maximum
}

// Pattern 6: Lazy Expiration on Load
// Check expiration when loading session
async load(sessionId: string): Promise<SessionState | null> {
  const state = await this.loadFromFile(sessionId);

  if (this.ttl && this.ttl > 0 && isExpired(state, this.ttl)) {
    await this.delete(sessionId); // Clean up expired session
    return null;
  }

  return state;
}

// Pattern 7: Cleanup Batch Processing
// Process files in batches to avoid blocking
async deleteExpired(ttl?: number): Promise<string[]> {
  const expiredIds: string[] = [];
  const files = await readdir(this.directory);

  for (const file of files) {
    // Check expiration and collect expired IDs
    // Use try-catch to continue on errors
  }

  // Batch delete
  await Promise.all(expiredIds.map(id => this.delete(id)));
  return expiredIds;
}

// Pattern 8: Fake Timers Testing
// Use Vitest fake timers for time-based tests
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should expire session after TTL', async () => {
  await store.save('test', session);

  // Advance time by TTL + tolerance
  vi.advanceTimersByTime(ttl + 61000);

  const loaded = await store.load('test');
  expect(loaded).toBeNull();
});

// Pattern 9: Persistent Store Detection
// Use instanceof to detect store type
if (!(this.sessionStore instanceof MemorySessionStore)) {
  // Persistent store behavior
  await this.sessionStore.save(sessionId, state);
}

// Pattern 10: SessionStore Interface Compliance
// All SessionStore implementations must have deleteExpired
export interface SessionStore<T = SessionState> {
  save(sessionId: string, state: T): Promise<void>;
  load(sessionId: string): Promise<T | null>;
  delete(sessionId: string): Promise<boolean>;
  list(): Promise<string[]>;
  has(sessionId: string): Promise<boolean>;
  clear(): Promise<void>;
  deleteExpired(ttl?: number): Promise<string[]>; // NEW
}
```

### Integration Points

```yaml
SESSIONSTATE_INTERFACE:
  - file: src/types/providers.ts
  - add: createdAt, lastAccessedAt properties
  - preserve: history, lastResult properties
  - location: After lastResult (around line 77)

SESSIONSTORE_INTERFACE:
  - file: src/providers/session-store.ts
  - add: deleteExpired(ttl?: number): Promise<string[]> method
  - preserve: All existing methods
  - location: After clear() method (around line 79)

FILESESSIONSTORE_CLASS:
  - file: src/providers/session-store.ts
  - modify: Constructor to accept ttl parameter
  - modify: save() to update timestamps
  - modify: load() to check expiration
  - add: deleteExpired() implementation
  - location: Lines 146-235

MEMORYSESSIONSTORE_CLASS:
  - file: src/providers/session-store.ts
  - add: deleteExpired() implementation (for interface compliance)
  - location: Lines 93-132

ANTHROPICPROVIDER_CLASS:
  - file: src/providers/anthropic-provider.ts
  - add: private sessionTtl property
  - modify: initialize() to store and pass sessionTtl
  - modify: initialize() to call cleanup
  - modify: createSession() to initialize timestamps
  - modify: getSession() to update lastAccessedAt
  - location: Lines 151 (property), 186-221 (initialize), 1147-1203 (methods)

TESTS:
  - add: src/__tests__/unit/providers/session-store-ttl.test.ts
  - modify: src/__tests__/unit/providers/session-store.test.ts
  - modify: src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
  - verify: All existing tests pass
  - coverage: TTL expiration, cleanup, edge cases
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding

# Type checking with specific files
npx tsc --noEmit src/types/providers.ts
npx tsc --noEmit src/providers/session-store.ts
npx tsc --noEmit src/providers/anthropic-provider.ts

# Type checking for test files
npx tsc --noEmit src/__tests__/unit/providers/session-store-ttl.test.ts

# Project-wide type checking
npm run check    # or: npx tsc --noEmit

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test new TTL functionality
npm test -- src/__tests__/unit/providers/session-store-ttl.test.ts

# Test existing session store tests (should still pass)
npm test -- src/__tests__/unit/providers/session-store.test.ts

# Test AnthropicProvider session integration
npm test -- src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts

# Full test suite for providers
npm test -- src/__tests__/unit/providers/

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all provider tests
npm test -- --testNamePattern="SessionStore|TTL"

# Run all session-related tests
npm test -- --testNamePattern="session"

# Full unit test suite
npm test -- src/__tests__/unit/

# Integration test for session persistence with TTL
# (Manual verification: Create sessions, advance time, verify expiration)

# Expected: All integrations working, TTL enforced correctly, cleanup works
```

### Level 4: Domain-Specific Validation

```bash
# TypeScript compilation validation
npm run build    # Verify project builds successfully

# Type-level validation tests
npm test -- src/__tests__/unit/provider-interface.test.ts

# Adversarial input tests (TTL edge cases)
npm test -- src/__tests__/adversarial/

# Expected: All validations pass, TTL enforced correctly, edge cases handled
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No type errors: `npm run check`
- [ ] Project builds successfully: `npm run build`
- [ ] No linting errors (if project uses linter)

### Feature Validation

- [ ] SessionState has createdAt and lastAccessedAt timestamps
- [ ] Timestamps are set correctly on new sessions
- [ ] lastAccessedAt is updated on session access
- [ ] Expired sessions return null on load
- [ ] deleteExpired() removes and returns expired session IDs
- [ ] TTL validation handles negative, zero, and large values
- [ ] Clock skew tolerance (60 seconds) works correctly
- [ ] Legacy sessions (without timestamps) are handled
- [ ] Cleanup is called on initialize for persistent stores
- [ ] MemorySessionStore behavior unchanged

### Code Quality Validation

- [ ] Follows existing codebase patterns and naming conventions
- [ ] Timestamps use Date.now() and stored as number milliseconds
- [ ] JSDoc documentation complete for all new methods
- [ ] Error messages are descriptive and helpful
- [ ] Tests use vi.useFakeTimers() and vi.useRealTimers() correctly
- [ ] File cleanup in test afterEach hooks

### Backward Compatibility

- [ ] All existing tests pass without modification
- [ ] Sessions without timestamps work correctly
- [ ] FileSessionStore without TTL parameter works as before
- [ ] MemorySessionStore behavior unchanged
- [ ] Existing sessionStore property still works
- [ ] No breaking changes to SessionState interface

---

## Anti-Patterns to Avoid

- ❌ Don't use Date objects for timestamps - use number milliseconds
- ❌ Don't forget to update lastAccessedAt on session access
- ❌ Don't skip the 60-second tolerance window for clock skew
- ❌ Don't use synchronous file operations - SessionStore methods are async
- ❌ Don't hardcode TTL values - use parameters with defaults
- ❌ Don't forget to handle legacy sessions without timestamps
- ❌ Don't implement TTL in MemorySessionStore (cleared on terminate anyway)
- ❌ Don't throw errors for expired sessions - return null silently
- ❌ Don't use vi.advanceTimersByTime() without vi.useFakeTimers()
- ❌ Don't forget to restore real timers in afterEach (vi.useRealTimers())
- ❌ Don't modify existing tests - they should pass without changes
- ❌ Don't call cleanup in MemorySessionStore (unnecessary)
- ❌ Don't skip validation for negative TTL values
- ❌ Don't forget to save timestamps back to persistent stores

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Rationale**:
- Comprehensive research provides all necessary context
- Existing patterns are well-documented and clear to follow
- Backward compatibility requirements are explicitly defined
- Test patterns using Vitest fake timers are specific and actionable
- All file paths and line numbers are provided
- Known gotchas are documented with solutions
- Validation commands are project-specific and verified
- Integration with previous PRP (P2.M2.T2.S1) is clear

**Remaining risks**:
- Need to ensure FileSessionStore copy behavior is handled correctly
- Timestamp updates on getSession() might have performance implications
- Clock skew tolerance window might need adjustment based on real-world testing
- Legacy session handling might need additional consideration

**Validation**: The completed PRP provides comprehensive context including:
- Exact code structure from research
- Specific implementation patterns to follow
- Complete test coverage requirements with fake timer examples
- All file paths and line numbers
- Backward compatibility guidance
- Known gotchas with solutions
- External research on TTL best practices
