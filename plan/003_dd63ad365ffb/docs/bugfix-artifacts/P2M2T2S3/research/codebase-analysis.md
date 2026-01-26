# Codebase Analysis: Session Persistence Implementation

**Date:** January 26, 2026
**Purpose:** Analyze existing session persistence implementation for documentation

---

## Session Persistence Architecture

### Core Files

**SessionStore Interface and Implementations**
- File: `src/providers/session-store.ts`
- Components:
  - `SessionStore<T>` interface with CRUD operations
  - `MemorySessionStore<T>` - In-memory Map-based storage
  - `FileSessionStore<T>` - JSON file persistence with atomic writes
  - `RedisSessionStore<T>` - Interface stub (future work)

**Session State Types**
- File: `src/types/providers.ts`
- Type: `SessionState`
  - `history: SDKUserMessage[]` - Conversation history
  - `lastResult: SDKResultMessage | null` - Last response
  - `createdAt: number` - Creation timestamp
  - `lastAccessedAt: number` - Last access timestamp

**Session Serialization**
- File: `src/utils/session-serialization.ts`
- Utilities:
  - `serializeSession()` - Safe JSON serialization
  - `deserializeSession()` - Safe deserialization with validation
  - `SessionSerializationError` - Custom error with context

**Provider Integration**
- File: `src/providers/anthropic-provider.ts`
- Key methods:
  - `createSession(sessionId)` - Create new session
  - `getSession(sessionId)` - Retrieve session state
  - `deleteSession(sessionId)` - Remove session
  - Session restoration in `initialize()`
  - Session persistence in `terminate()`

**Configuration Options**
- File: `src/types/providers.ts`
- Interface: `ProviderOptions`
  - `sessionStore?: SessionStore<SessionState>` - Direct injection
  - `sessionPersistence?: 'memory' | 'file' | 'redis'` - Declarative config
  - `sessionTtl?: number` - Time-to-live in milliseconds
  - `sessionPath?: string` - Directory for file storage

---

## Session Lifecycle Flow

### 1. Session Creation
```
Agent.prompt() with sessionId
  → Provider.execute() checks options.sessionId
  → If session not found, createSession() called
  → New SessionState created with timestamps
```

### 2. Session Usage (Continuation)
```
Provider.execute() with existing sessionId
  → getSession() retrieves session
  → History streamed to SDK via streamInput()
  → New messages accumulated
  → Session state updated
```

### 3. Session Persistence
```
After execute() completes
  → For non-memory stores, session.save() called
  → Atomic write to storage (file temp + rename)
  → Timestamps updated (lastAccessedAt)
```

### 4. Session Restoration
```
Provider.initialize()
  → For persistent stores, load existing sessions
  → Session state deserialized
  → Timestamps validated (legacy sessions handled)
```

### 5. Session Cleanup
```
TTL Expiration:
  → Lazy: On load, check expiration
  → Active: deleteExpired() method
  → Automatic: Called during initialize()

Provider Termination:
  → Memory: sessions.clear()
  → File: Sessions persist on disk
  → All: SessionStore reference cleared
```

---

## Configuration Priority

```
1. sessionStore (direct injection) - HIGHEST
2. sessionPersistence (declarative)
3. MemorySessionStore (default) - LOWEST
```

**Example:**
```typescript
// Direct injection
{ sessionStore: new CustomStore() }

// Declarative
{ sessionPersistence: 'file', sessionPath: './sessions' }

// Default
{} // Uses MemorySessionStore
```

---

## Key Implementation Patterns

### 1. Pluggable Architecture
- SessionStore interface allows custom implementations
- Generic type `<T>` for different session state types
- Dependency injection via ProviderOptions

### 2. Backward Compatibility
- Legacy sessions without timestamps get them on load
- Graceful handling of missing fields
- Safe deserialization with validation

### 3. Atomic Operations
- File writes use temp file + rename pattern
- Prevents corruption from concurrent writes
- Safe for multi-process scenarios

### 4. Timestamp Management
- Automatic tracking (createdAt, lastAccessedAt)
- Used for TTL calculation (sliding window)
- 60-second clock skew tolerance

### 5. Error Resilience
- Graceful degradation on storage failures
- SessionSerializationError with detailed context
- File corruption handled during cleanup

---

## TTL and Expiration

### Configuration
```typescript
sessionTtl: number  // milliseconds
```

### Behavior
- **Sliding Window**: TTL based on lastAccessedAt, not createdAt
- **Clock Skew**: 60-second tolerance prevents premature expiration
- **Zero/Negative TTL**: Disables expiration

### Cleanup Strategies
1. **Lazy**: Check expiration on load (getSession)
2. **Active**: deleteExpired() method for explicit cleanup
3. **Automatic**: Called during provider initialize()

### Edge Cases
- Legacy sessions without timestamps → Add timestamps on load
- Clock synchronization issues → 60s buffer
- Zero/negative TTL → No expiration
- Corrupted session files → Gracefully handled

---

## Storage Backend Differences

| Feature | Memory | File | Redis (future) |
|---------|--------|------|----------------|
| Persistence | No | Yes | Yes |
| Speed | Fast | Medium | Fast |
| Scalability | Single-process | Multi-process | Distributed |
| TTL Support | Manual | Built-in | Native |
| Atomic Writes | N/A | Yes | Yes |
| Cleanup | Manual | Built-in | Native |

---

## Session Serialization

### Serialization (save)
```typescript
serializeSession(sessionState)
  → Circular reference handling (WeakSet)
  → Functions → "[Function:name]"
  → Symbols → "[Symbol:description]"
  → Pretty JSON with 2-space indent
```

### Deserialization (load)
```typescript
deserializeSession(json)
  → SessionState structure validation
  → Type checking for required properties
  → Legacy session compatibility
```

### Error Handling
```typescript
try {
  const session = deserializeSession(data);
} catch (error) {
  // SessionSerializationError with:
  // - Path to error location
  // - Invalid value
  // - Expected type
}
```

---

## Testing Coverage

### Test Files
- `src/__tests__/unit/providers/session-store.test.ts` - Core functionality
- `src/__tests__/unit/providers/session-store-ttl.test.ts` - TTL behavior
- `src/__tests__/unit/providers/anthropic-provider-sessions.test.ts` - Integration
- `src/__tests__/unit/providers/anthropic-provider-sessionconfig.test.ts` - Configuration
- `src/__tests__/unit/utils/session-serialization.test.ts` - Serialization

### Test Categories
- CRUD operations (save, load, delete, list, has, clear)
- TTL behavior (expiration, timestamp updates, cleanup)
- Provider integration (create, retrieve, delete)
- Configuration (storage backends, options)
- Serialization (round-trip safety, error handling)
- Persistence (file operations, atomic writes, recovery)

---

## Documentation Gaps Identified

### Current docs/providers.md Coverage
- ✅ Basic session creation and continuation
- ✅ Session ID propagation via cascade
- ✅ getSession() method for retrieving state
- ❌ Session persistence configuration
- ❌ TTL and cleanup behavior
- ❌ Storage backend differences
- ❌ Migration from in-memory to persistent
- ❌ Session lifecycle details
- ❌ Session serialization internals

### What Needs to be Documented
1. **Session Persistence Section**
   - Configuration options (sessionPersistence, sessionTtl, sessionPath)
   - Storage backend comparison
   - File-based persistence setup
   - Redis backend (when implemented)

2. **Session Lifecycle Deep Dive**
   - Visual diagram of lifecycle
   - Timestamp management
   - Restoration on provider initialize
   - Persistence on provider terminate

3. **TTL and Expiration**
   - Configuration examples
   - Cleanup strategies (lazy, active, automatic)
   - Clock skew handling
   - Edge cases

4. **Migration Guide**
   - From in-memory to file-based
   - From file to Redis (future)
   - Configuration changes required
   - Data migration steps

5. **Best Practices**
   - When to use each backend
   - TTL configuration guidelines
   - Error handling patterns
   - Performance considerations

---

## References

### Internal Files
- `src/providers/session-store.ts` - SessionStore interface and implementations
- `src/types/providers.ts` - SessionState and ProviderOptions
- `src/utils/session-serialization.ts` - Serialization utilities
- `src/providers/anthropic-provider.ts` - Provider integration
- `examples/providers/05-provider-sessions.ts` - Usage examples

### Test Files
- `src/__tests__/unit/providers/session-store.test.ts`
- `src/__tests__/unit/providers/session-store-ttl.test.ts`
- `src/__tests__/unit/providers/anthropic-provider-sessions.test.ts`

### Related Documentation
- `plan/003_dd63ad365ffb/docs/SESSION_MANAGEMENT_RESEARCH_SUMMARY.md`
- `docs/providers.md` - Current provider documentation

---

**Document Status:** COMPLETE
