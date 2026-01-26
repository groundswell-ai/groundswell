# Product Requirement Prompt (PRP): P2.M2.T1.S4 - Write Tests for Session Persistence

**PRP ID**: P2.M2.T1.S4
**Parent Task**: P2.M2.T1 - Design Session Storage Abstraction Layer
**Related PRP**: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T1S3/PRP.md

---

## Goal

**Feature Goal**: Comprehensive test coverage for session persistence functionality in AnthropicProvider, verifying that FileSessionStore correctly persists session state across terminate/initialize cycles.

**Deliverable**: Extended test suite for session persistence covering success scenarios, failure scenarios, edge cases, and backward compatibility.

**Success Definition**:
- All test scenarios in this PRP pass with `uv run vitest run`
- Test coverage includes both FileSessionStore and MemorySessionStore behaviors
- Tests verify session state integrity across provider lifecycle (initialize → execute → terminate → re-initialize)
- Temporary test directories are properly cleaned up after each test
- Tests are self-contained and can run in parallel without interference

---

## User Persona

**Target User**: Development team requiring confidence that session persistence works correctly for production use.

**Use Case**: When a user creates a session with FileSessionStore, the session must persist across application restarts. Tests verify that:
1. Sessions are saved to disk during execution
2. Sessions can be restored after provider termination
3. Missing session files are handled gracefully
4. Default behavior (no store provided) uses in-memory storage

**Pain Points Addressed**:
- Data loss when provider restarts without persistence
- Unclear behavior when session files are missing or corrupted
- Risk of breaking backward compatibility with existing code

---

## Why

- **Business Value**: Session persistence enables long-running conversations to survive server restarts, improving user experience for multi-turn interactions.
- **Integration**: Extends existing session test suite (anthropic-provider-sessions.test.ts) with persistence-specific scenarios.
- **Problems Solved**: Verifies that the session persistence integration from P2.M2.T1.S3 works correctly under all conditions.

---

## What

### Success Criteria

- [ ] Tests verify FileSessionStore persists sessions across terminate → initialize cycles
- [ ] Tests verify sessions are saved to disk with correct JSON structure
- [ ] Tests verify sessions are restored correctly on re-initialization
- [ ] Tests handle missing session files gracefully (returns null/undefined)
- [ ] Tests verify default MemorySessionStore behavior when no store provided
- [ ] Tests clean up temporary directories after execution
- [ ] All tests pass independently and in parallel

### Test Scenarios

#### 1. Persistence Across Terminate/Initialize Cycles
- Create session with FileSessionStore
- Execute provider with sessionId
- Terminate provider
- Re-initialize with same FileSessionStore
- Verify session still exists with correct history

#### 2. Session State Integrity
- Create session and add multiple history entries
- Execute provider multiple times with same sessionId
- Terminate and re-initialize
- Verify all history entries are preserved
- Verify lastResult is preserved

#### 3. Missing Session File Handling
- Initialize with FileSessionStore pointing to empty directory
- Attempt to get non-existent session
- Verify returns undefined (not error)
- Attempt to delete non-existent session
- Verify returns false

#### 4. Default Store Behavior
- Initialize provider without sessionStore option
- Verify uses MemorySessionStore
- Create sessions and terminate
- Verify sessions are cleared (not persisted)

#### 5. Multiple Sessions Persistence
- Create multiple sessions with different IDs
- Add distinct history to each
- Terminate and re-initialize
- Verify all sessions are restored independently

#### 6. Session File Format Validation
- Persist session to disk
- Read raw JSON file
- Verify structure matches SessionState interface
- Verify proper JSON formatting (2-space indentation)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

Yes - this PRP provides:
- Exact file paths to existing test files
- Specific test patterns to follow
- Temporary directory management patterns
- File store testing best practices

### Documentation & References

```yaml
# MUST READ - Test Files to Reference
- file: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  why: Reference for existing session test patterns, describe blocks, beforeEach/afterEach patterns
  pattern: Test structure using Vitest, provider initialization patterns, session creation patterns
  gotcha: Uses ProviderRegistry._resetForTesting() for test isolation

- file: src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
  why: Reference for FileSessionStore test patterns, temporary directory management, cleanup patterns
  pattern: Uses rm() from fs/promises with recursive:true,force:true for cleanup
  gotcha: Already contains persistence tests - verify these meet requirements before adding new tests

- file: src/__tests__/unit/providers/session-store.test.ts
  why: Reference for SessionStore unit tests, FileSessionStore behavior verification
  pattern: Direct FileSessionStore instantiation with TEST_DIR constant
  gotcha: Uses afterEach with try/catch for cleanup to ignore errors

- file: src/__tests__/unit/utils/session-serialization.test.ts
  why: Reference for testing session serialization/deserialization edge cases
  pattern: Tests for circular references, special characters, unicode, deeply nested structures
  gotcha: Uses custom helper functions for creating mock SessionState

# MUST READ - Implementation Files
- file: src/providers/anthropic-provider.ts
  why: Reference for AnthropicProvider session methods (createSession, getSession, deleteSession)
  pattern: Session methods delegate to sessionStore, MemorySessionStore instanceof check in terminate()
  gotcha: terminate() only clears MemorySessionStore, leaves FileSessionStore intact

- file: src/providers/session-store.ts
  why: Reference for FileSessionStore implementation, file naming pattern ({sessionId}.json)
  pattern: Uses join(directory, `${sessionId}.json`) for file paths, atomic write pattern
  gotcha: FileSessionStore.createSession not needed - sessions created via save()

- file: src/types/providers.ts
  why: Reference for SessionState interface, ProviderOptions.sessionStore field
  pattern: SessionState has history: SDKUserMessage[], lastResult: SDKResultMessage | null
  gotcha: sessionStore is optional in ProviderOptions - defaults to MemorySessionStore

# EXTERNAL RESEARCH
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T1S3/research/external-storage-patterns.md
  why: Reference for file-based storage testing best practices, temporary directory patterns
  section: 6.7 Testing (lines 1214-1264)
  critical: Use in-memory mock stores for unit tests, real filesystem only for integration tests
```

### Current Codebase Tree

```bash
src/
├── __tests__/
│   └── unit/
│       └── providers/
│           ├── anthropic-provider-sessions.test.ts     # Existing session tests (743 lines)
│           ├── anthropic-provider-sessionstore.test.ts # SessionStore integration tests (609 lines)
│           └── session-store.test.ts                   # SessionStore unit tests (621 lines)
├── providers/
│   ├── anthropic-provider.ts                           # Provider with session methods
│   └── session-store.ts                                # SessionStore implementations
├── types/
│   └── providers.ts                                    # SessionState, ProviderOptions types
└── utils/
    └── session-serialization.ts                        # Serialization utilities
```

### Desired Codebase Tree (No New Files)

Tests should be added to existing file:

```bash
src/__tests__/unit/providers/
└── anthropic-provider-sessions.test.ts  # EXTEND this file with persistence tests
```

**Note**: The file `anthropic-provider-sessionstore.test.ts` already exists with comprehensive persistence tests. Before adding new tests, verify whether existing tests cover all scenarios in this PRP.

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: FileSessionStore uses atomic writes with temp files
// Pattern: write to {path}.tmp then rename to {path}
// This means test files may have .tmp suffix during writes

// CRITICAL: Temporary directory cleanup must use force:true
// Pattern: await rm(testDir, { recursive: true, force: true })
// Some tests may create subdirectories - force:true ignores errors

// CRITICAL: Test isolation requires unique directory per test suite
// Pattern: Use unique test directory name per file to avoid conflicts
// Example: './test-sessions-sessionstore' vs './test-sessions-persistence'

// CRITICAL: FileSessionStore.load() returns null for missing files (not undefined)
// Pattern: expect(await store.load('missing')).toBeNull()

// CRITICAL: getSession() converts null to undefined for consistency
// Pattern: return state ?? undefined (see anthropic-provider.ts:1147-1150)

// CRITICAL: MemorySessionStore clearing only happens in terminate()
// Pattern: if (this.sessionStore instanceof MemorySessionStore) await this.sessionStore.clear()

// CRITICAL: ProviderRegistry state must be reset between tests
// Pattern: ProviderRegistry._resetForTesting() in beforeEach

// CRITICAL: SDK initialization check required for session methods
// Pattern: if (!this.sdk) throw new Error("SDK not initialized")
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models. Tests use existing SessionState interface:

```typescript
interface SessionState {
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}
```

### Implementation Tasks

```yaml
Task 1: ANALYZE EXISTING TEST COVERAGE
  - REVIEW: src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
  - CHECK: Does "should persist sessions across terminate -> initialize cycles" test exist?
  - CHECK: Does "should NOT clear FileSessionStore sessions on terminate" test exist?
  - CHECK: Does "should restore session state including history" test exist?
  - DECIDE: Are additional tests needed or is coverage complete?

Task 2: CREATE TEST FILE EXTENSION (if needed)
  - EXTEND: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  - ADD: New describe block "Session Persistence with FileSessionStore (P2.M2.T1.S4)"
  - FOLLOW: Existing test patterns from lines 22-743
  - PLACEMENT: After existing describe blocks, before closing braces

Task 3: ADD PERSISTENCE TEST SCENARIOS
  - IMPLEMENT: "should persist sessions across terminate → initialize cycle"
  - IMPLEMENT: "should save session state to disk with correct structure"
  - IMPLEMENT: "should restore session with full history after restart"
  - IMPLEMENT: "should preserve lastResult across restart"
  - IMPLEMENT: "should handle missing session file gracefully"
  - IMPLEMENT: "should use MemorySessionStore by default"
  - NAMING: Follow pattern "should [expected behavior] when [condition]"
  - COVERAGE: Both success paths and error paths

Task 4: ADD TEMPORARY DIRECTORY MANAGEMENT
  - DECLARE: const TEST_DIR = './test-sessions-persistence' at top of describe block
  - IMPLEMENT: beforeEach with unique directory per test if needed
  - IMPLEMENT: afterEach with await rm(TEST_DIR, { recursive: true, force: true })
  - PATTERN: try/catch around cleanup to ignore errors
  - GOTCHA: Use unique directory name to avoid conflicts with other test files

Task 5: ADD MULTIPLE SESSION TESTS
  - IMPLEMENT: "should persist multiple independent sessions"
  - IMPLEMENT: "should maintain separate histories for each session"
  - IMPLEMENT: "should allow selective session deletion"
  - PATTERN: Create multiple sessions, verify independence
  - COVERAGE: Edge cases of concurrent session management

Task 6: ADD EDGE CASE TESTS
  - IMPLEMENT: "should handle session with large history"
  - IMPLEMENT: "should handle session with special characters in ID"
  - IMPLEMENT: "should handle corrupted session file gracefully"
  - PATTERN: Negative testing for error scenarios
  - COVERAGE: Boundary conditions and failure modes

Task 7: VERIFY BACKWARD COMPATIBILITY
  - IMPLEMENT: "should default to in-memory sessions when no store provided"
  - IMPLEMENT: "should clear sessions on terminate with default store"
  - IMPLEMENT: "should not break existing code that doesn't use sessionStore"
  - PATTERN: Test without FileSessionStore to verify default behavior
  - COVERAGE: Regression prevention for existing functionality

Task 8: RUN TESTS AND VALIDATE
  - EXECUTE: uv run vitest run src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  - VERIFY: All new tests pass
  - VERIFY: No existing tests are broken
  - VERIFY: Tests can run in parallel (vitest --threads)
  - VALIDATE: Coverage meets requirements
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Test structure for FileSessionStore persistence
describe('Session Persistence with FileSessionStore (P2.M2.T1.S4)', () => {
  const TEST_DIR = './test-sessions-persistence';
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    ProviderRegistry._resetForTesting();
  });

  afterEach(async () => {
    // CRITICAL: Always clean up temporary directories
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Test scenarios here...
});

// PATTERN 2: Persistence across terminate/initialize
it('should persist sessions across terminate → initialize cycle', async () => {
  const fileStore = new FileSessionStore(TEST_DIR);
  await provider.initialize({ sessionStore: fileStore });

  // Create session
  await provider.createSession('persistent-session');

  // Terminate provider
  await provider.terminate();

  // Re-initialize with same file store
  await provider.initialize({ sessionStore: fileStore });

  // Session should still exist
  const session = await provider.getSession('persistent-session');
  expect(session).toBeDefined();
  expect(session?.history).toEqual([]);
});

// PATTERN 3: Session state with history
it('should restore session with full history after restart', async () => {
  const fileStore = new FileSessionStore(TEST_DIR);
  await provider.initialize({ sessionStore: fileStore });

  // Create session and add history
  await provider.createSession('history-session');
  const session = await provider.getSession('history-session');

  if (session) {
    // Simulate adding history (would happen during execute())
    session.history.push({
      type: 'user',
      message: { content: 'Test message' },
      parent_tool_use_id: null,
      session_id: 'test-id',
    } as any);

    // CRITICAL: Must save back to store for FileSessionStore
    await fileStore.save('history-session', session);
  }

  // Terminate and re-initialize
  await provider.terminate();
  await provider.initialize({ sessionStore: fileStore });

  // Verify history is preserved
  const restored = await provider.getSession('history-session');
  expect(restored?.history).toHaveLength(1);
  expect(restored?.history[0].message.content).toBe('Test message');
});

// PATTERN 4: Missing file handling
it('should handle missing session file gracefully', async () => {
  const fileStore = new FileSessionStore(TEST_DIR);
  await provider.initialize({ sessionStore: fileStore });

  // Try to get non-existent session
  const session = await provider.getSession('does-not-exist');

  // Should return undefined (not throw)
  expect(session).toBeUndefined();
});

// PATTERN 5: Default store behavior
it('should default to in-memory sessions when no store provided', async () => {
  // No sessionStore in options
  await provider.initialize();

  await provider.createSession('memory-session');

  // Terminate should clear sessions
  await provider.terminate();

  // Session should be gone
  const session = await provider.getSession('memory-session');
  expect(session).toBeUndefined();
});
```

### Integration Points

```yaml
EXISTING_TEST_FILE:
  - file: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  - add: New describe block for persistence tests
  - import: Add FileSessionStore import if not present
  - pattern: Follow existing test structure and naming conventions

PROVIDER_OPTIONS:
  - field: sessionStore
  - type: SessionStore<SessionState> | undefined
  - default: undefined (uses MemorySessionStore)

FILESYSTEM:
  - temp_dir: './test-sessions-persistence'
  - cleanup: await rm(TEST_DIR, { recursive: true, force: true })
  - pattern: Use unique directory per test file
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after extending test file - fix before proceeding
uv run vitest run src/__tests__/unit/providers/anthropic-provider-sessions.test.ts --reporter=verbose

# Type checking
uv run tsc --noEmit

# Expected: All tests pass, no type errors
# If errors exist, READ output and fix before proceeding
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test session persistence specifically
uv run vitest run src/__tests__/unit/providers/anthropic-provider-sessions.test.ts -t "persist"

# Test all session-related tests
uv run vitest run src/__tests__/unit/providers/anthropic-provider-sessions.test.ts

# Test SessionStore integration
uv run vitest run src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts

# Expected: All tests pass
# If failing, debug root cause and fix implementation
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all provider tests
uv run vitest run src/__tests__/unit/providers/

# Run with coverage
uv run vitest run --coverage

# Run in parallel mode to test isolation
uv run vitest run --threads

# Expected: All tests pass in all modes
# Verify test isolation (no cross-test pollution)
```

### Level 4: File System Validation

```bash
# Verify temporary directory cleanup
ls -la test-sessions* 2>/dev/null || echo "No test directories (cleaned up correctly)"

# Verify session file format (manual inspection during test development)
cat test-sessions-persistence/*.json 2>/dev/null | jq . 2>/dev/null || echo "No session files to inspect"

# Expected:
# - No test directories remain after test completion
# - Session files (if inspected) have valid JSON structure
# - Files use .json extension with sessionId as filename
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All persistence test scenarios from Implementation Tasks pass
- [ ] Tests verify FileSessionStore behavior correctly
- [ ] Tests verify MemorySessionStore default behavior
- [ ] Temporary directories are cleaned up in afterEach
- [ ] Tests can run in parallel without interference
- [ ] No existing tests are broken by new tests

### Feature Validation

- [ ] Sessions persist across terminate → initialize cycles
- [ ] Session state (history, lastResult) is preserved correctly
- [ ] Missing session files return undefined gracefully
- [ ] Default MemorySessionStore clears on terminate
- [ ] Multiple sessions can be persisted independently
- [ ] All success criteria from "What" section met

### Code Quality Validation

- [ ] Tests follow existing patterns from anthropic-provider-sessions.test.ts
- [ ] Test naming follows "should [behavior] when [condition]" pattern
- [ ] Each test is independent and self-contained
- [ ] beforeEach/afterEach properly manage test state
- [ ] ProviderRegistry._resetForTesting() called for isolation
- [ ] Error scenarios tested with expected outcomes

### Documentation & Deployment

- [ ] Test file header comments reference P2.M2.T1.S4
- [ ] Complex test scenarios have explanatory comments
- [ ] Edge cases are documented in test descriptions
- [ ] Test cleanup is robust (force:true on rm)
- [ ] Tests serve as documentation for expected behavior

---

## Anti-Patterns to Avoid

- ❌ Don't create new test file - extend existing anthropic-provider-sessions.test.ts
- ❌ Don't use fixed directory paths like '/tmp/sessions' - use relative paths
- ❌ Don't forget cleanup in afterEach - test directories will accumulate
- ❌ Don't use sync file operations - all fs operations must be async
- ❌ Don't assume tests run sequentially - design for parallel execution
- ❌ Don't modify production code to make tests pass
- ❌ Don't skip testing error scenarios (missing files, corrupted data)
- ❌ Don't ignore cleanup errors - use force:true to handle gracefully
- ❌ Don't duplicate tests that already exist in anthropic-provider-sessionstore.test.ts
- ❌ Don't test implementation details - test observable behavior

---

## Test Coverage Verification

After implementation, verify coverage includes:

```typescript
// Scenarios that must be tested:
describe('Session Persistence with FileSessionStore', () => {
  // 1. Basic persistence
  it('should persist sessions across terminate → initialize cycle')
  it('should save session state to disk')

  // 2. State integrity
  it('should restore session with full history')
  it('should preserve lastResult across restart')

  // 3. Error handling
  it('should handle missing session file gracefully')
  it('should return undefined for non-existent session')

  // 4. Default behavior
  it('should use MemorySessionStore by default')
  it('should clear in-memory sessions on terminate')

  // 5. Multiple sessions
  it('should persist multiple independent sessions')
  it('should maintain separate session states')

  // 6. Edge cases
  it('should handle session with large history')
  it('should handle special characters in session ID')
});
```

---

## Confidence Score

**8/10** for one-pass implementation success

**Rationale**:
- Existing test patterns are well-established and consistent
- Test file structure is clear and follows conventions
- FileSessionStore implementation is straightforward
- Temporary directory management pattern is proven in existing tests
- **Risk**: Existing tests in anthropic-provider-sessionstore.test.ts may already cover most scenarios
- **Mitigation**: Task 1 (analyze existing coverage) will prevent duplicate work

**Validation**: The completed PRP enables an AI agent to implement comprehensive session persistence tests using only the PRP content and codebase access.

---

## Sources

- [Vitest Testing Best Practices](https://vitest.dev/guide/)
- [Node.js File System API](https://nodejs.org/api/fs.html)
- [express-session Store Pattern](https://github.com/expressjs/session)
- [Research Document](plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T1S3/research/external-storage-patterns.md)
