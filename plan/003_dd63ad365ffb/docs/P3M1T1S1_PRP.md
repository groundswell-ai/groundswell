# Product Requirement Prompt (PRP): Implement Session Storage in AnthropicProvider

**Work Item:** P2.M2.T1.S1
**Title:** Implement session storage in AnthropicProvider
**Points:** 1
**Status:** Ready for Implementation

---

## Goal

**Feature Goal**: Add in-memory session storage to `AnthropicProvider` to enable session-based conversations, providing consistent API across providers despite Anthropic SDK's stateless nature.

**Deliverable**: Enhanced `AnthropicProvider` class with:
- Private `sessions: Map<sessionId, SessionState>` storage
- `SessionState` interface containing `history: SDKUserMessage[]` and `lastResult: SDKResultMessage`
- `createSession(sessionId)` method to create new session state
- `getSession(sessionId)` method to retrieve state or return `undefined`
- Update `capabilities.sessions` from `false` to `true`
- Clear sessions in `terminate()` method

**Success Definition**:
- Session storage compiles without TypeScript errors
- `createSession()` creates new empty session state
- `getSession()` returns state for existing sessions, `undefined` for non-existent
- `terminate()` clears all session storage
- Unit tests verify session lifecycle operations
- `capabilities.sessions` is `true` (enables session feature flag)

---

## User Persona

**Target User**: Groundswell developers implementing multi-provider session support. This is the foundation for P2.M2.T1.S2 (modify execute() to support sessions).

**Use Case**: Anthropic SDK is stateless (no native sessions), but Groundswell requires consistent session API across providers. This abstraction layer stores conversation history in-memory to enable multi-turn conversations.

**User Journey**:
1. Developer calls `provider.createSession('my-session')` to initialize session storage
2. Developer calls `provider.getSession('my-session')` to retrieve session state
3. In P2.M2.T1.S2: `execute()` method will use this storage for `continue: true` conversations
4. `terminate()` method automatically clears all sessions

**Pain Points Addressed**:
- **Inconsistent provider APIs**: Anthropic has no native sessions, OpenCode does
- **Stateless SDK limitation**: Anthropic SDK requires explicit message history management
- **API parity**: Sessions should work the same regardless of provider choice

---

## Why

- **Session abstraction (Decision 2)**: Provides consistent API across providers despite Anthropic's stateless design
- **Foundation for P2.M2.T1.S2**: Session storage is prerequisite for modifying `execute()` to support `sessionId` in requests
- **Provider parity**: Aligns Anthropic provider with OpenCode's native session capabilities
- **User experience**: Developers shouldn't need to know about provider-specific session differences

---

## What

### SessionState Interface Definition

```typescript
/**
 * Session state for maintaining conversation history
 *
 * Stores the conversation context for session-based execution.
 * Used when request.options.sessionId is provided.
 *
 * @internal
 */
interface SessionState {
  /** Conversation history - all user messages in this session */
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];

  /** Last result message from the most recent execution */
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}
```

### Private Storage Field

```typescript
/**
 * Session storage for multi-turn conversations
 *
 * Maps session IDs to their conversation state. Enables session-based
 * execution despite Anthropic SDK's stateless design.
 *
 * @internal
 */
private sessions: Map<string, SessionState> = new Map();
```

### Public Methods

```typescript
/**
 * Create a new session with the specified ID
 *
 * Initializes empty session state for the given session ID.
 * If session already exists, this is a no-op (idempotent).
 *
 * @param sessionId - Unique identifier for the session
 * @throws {Error} If SDK is not initialized
 * @remarks
 * Session will be used when execute() receives matching sessionId in options.
 */
createSession(sessionId: string): void {
  // PATTERN: SDK initialization check (follow execute() pattern at lines 219-223)
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  // PATTERN: Idempotent operation (follow initialize() pattern)
  // Only create if doesn't exist
  if (!this.sessions.has(sessionId)) {
    this.sessions.set(sessionId, {
      history: [],
      lastResult: null,
    });
  }
}

/**
 * Get session state for the specified ID
 *
 * Retrieves the current session state including conversation history
 * and last result. Returns undefined if session doesn't exist.
 *
 * @param sessionId - Session identifier to retrieve
 * @returns Session state or undefined if not found
 * @remarks
 * This is a read-only operation - does not modify session state.
 */
getSession(sessionId: string): SessionState | undefined {
  return this.sessions.get(sessionId);
}
```

### Capability Update

```typescript
// Update capabilities.sessions from false to true
readonly capabilities: ProviderCapabilities = {
  mcp: true,
  skills: true,
  lsp: true,
  streaming: true,
  sessions: true,  // CHANGED: Was false, now true
  extendedThinking: true,
} satisfies ProviderCapabilities;
```

### Terminate Method Update

```typescript
async terminate(): Promise<void> {
  // ... existing code ...

  // NEW: Clear session storage
  this.sessions.clear();
}
```

### Success Criteria

- [ ] `SessionState` interface defined with `history` and `lastResult` fields
- [ ] `private sessions: Map<string, SessionState>` field added
- [ ] `createSession(sessionId)` method implemented
- [ ] `getSession(sessionId)` method implemented
- [ ] `capabilities.sessions` changed from `false` to `true`
- [ ] `terminate()` method updated to clear sessions
- [ ] Unit tests verify all session operations
- [ ] TypeScript compilation succeeds

---

## All Needed Context

### Context Completeness Check

**Question**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact `SessionState` interface structure with SDK message types
- Precise method signatures and implementation patterns
- File location and placement (`src/providers/anthropic-provider.ts`)
- Test patterns with specific assertions
- Integration with existing codebase patterns (Map storage, idempotent operations)
- Common gotchas and anti-patterns to avoid

---

### Documentation & References

```yaml
# MUST READ - Current AnthropicProvider Implementation
- file: src/providers/anthropic-provider.ts
  why: Complete provider implementation showing existing patterns for private fields, idempotent operations, and cleanup
  critical: Lines 59-93 show readonly properties, lines 145-184 show initialize() pattern, lines 194-215 show terminate() pattern
  pattern: private fields, SDK initialization checks, idempotent operations, cleanup in terminate()

# MUST READ - Provider Interface with Session Support
- file: src/types/providers.ts
  why: ProviderOptions.sessionId already exists in the interface - this implementation fulfills that contract
  critical: Lines 82-123 define ProviderOptions with optional sessionId field
  pattern: sessionId?: string in ProviderOptions, sessionId?: string in ProviderExecutionOptions

# MUST READ - Decision 2: Session Abstraction Layer
- file: plan/003_dd63ad365ffb/docs/architecture/decisions.md
  why: Architectural decision that defines session abstraction approach
  critical: Lines 49-115 (Decision 2: Session Management Approach)
  pattern: Session abstraction in provider adapter, Map<sessionId, SessionState> storage

# MUST READ - Implementation Patterns for Idempotent Operations
- file: src/providers/anthropic-provider.ts
  why: Shows exact pattern for idempotent initialization and cleanup
  critical: Lines 147-149 (initialize idempotent check), lines 197-199 (terminate idempotent check)
  pattern: if (this.sdk) { return; } for idempotent operations

# MUST READ - Test Patterns for Private State Testing
- file: src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
  why: Shows how to test private properties using @ts-expect-error
  critical: Lines 35-36, 43-44 show private property access pattern
  pattern: // @ts-expect-error - Testing private property

# MUST READ - Test Patterns for State Management
- file: src/__tests__/unit/providers/anthropic-provider-terminate.test.ts
  why: Shows how to test state clearing and idempotent behavior
  critical: Lines 32-46 (state change verification), lines 74-95 (idempotent behavior)
  pattern: expect(provider.sdk).toBeNull() after termination

# MUST READ - Anthropic SDK Session Research
- docfile: plan/003_dd63ad365ffb/P2M2T1S1/research/anthropic-sdk-session-patterns.md
  why: Complete research on SDK message types and continuation patterns
  section: "1. SDK Message Type Structures" (lines 36-131)
  critical: SDKUserMessage has session_id field, SDKResultMessage structure for lastResult

# MUST READ - Codebase Session Patterns Research
- docfile: plan/003_dd63ad365ffb/P2M2T1S1/research/codebase-session-patterns.md
  why: Shows existing Map-based state storage patterns in codebase
  section: "1. Existing Session/State Management Patterns"
  critical: ProviderRegistry uses Map<ProviderId, Provider>, MCPHandler uses Maps for tools

# MUST READ - Session Management Best Practices
- docfile: plan/003_dd63ad365ffb/P2M2T1S1/research/session-management-best-practices.md
  why: Industry best practices for session storage, memory management, and cleanup
  section: "2. TypeScript Code Examples for Session Management" (line 142+)
  critical: LRU cache patterns, TTL expiration, thread-safe operations

# MUST READ - Test Patterns for Session Storage
- docfile: plan/003_dd63ad365ffb/P2M2T1S1/research/test-patterns.md
  why: Specific test patterns for Map-based storage and lifecycle testing
  section: "4. Map Usage Testing Patterns" (lines 67-89)
  critical: Map.has(), Map.get(), Map.size() testing patterns

# REFERENCE - Anthropic SDK Message Types
- url: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  why: SDK package documentation with type definitions
  section: "SDKUserMessage" and "SDKResultMessage" types
  critical: SDKUserMessage.session_id, SDKResultMessage with subtype and usage

# REFERENCE - TypeScript Map Documentation
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  why: Complete Map API reference for session storage operations
  section: "Methods" - has(), get(), set(), delete(), clear()
  critical: Map.set() returns the Map object, Map.has() for existence checks
```

---

### Current Codebase Tree

```bash
src/
├── providers/
│   ├── provider-registry.ts          # Singleton registry (Map-based state pattern)
│   ├── anthropic-provider.ts         # [MODIFY] Add session storage
│   └── __tests__/
│       └── providers/
│           ├── anthropropic-provider-initialize.test.ts
│           ├── anthropropic-provider-terminate.test.ts
│           └── ...
├── types/
│   ├── providers.ts                  # ProviderOptions.sessionId already defined
│   ├── sdk-primitives.ts             # Tool, MCPServer, Skill types
│   └── agent.ts                      # AgentResponse<T> type
└── core/
    └── mcp-handler.ts                # Example of Map-based state management
```

---

### Desired Codebase Tree (After This Subtask)

```bash
src/
├── providers/
│   ├── provider-registry.ts          # Existing - no changes
│   ├── anthropic-provider.ts         # [MODIFY] Add sessions field, createSession(), getSession(), update capabilities
│   └── __tests__/
│       └── providers/
│           ├── anthropropic-provider-initialize.test.ts  # Existing
│           ├── anthropropic-provider-terminate.test.ts   # Existing
│           ├── anthropropic-provider-sessions.test.ts    # [NEW] Session storage tests
│           └── ...
```

**Modified Files:**
- `src/providers/anthropic-provider.ts` - Add session storage, methods, and capability update

**New Files:**
- `src/__tests__/unit/providers/anthropic-provider-sessions.test.ts` - Session storage unit tests

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use typeof import() for SDK message types
// SDKUserMessage and SDKResultMessage are from @anthropic-ai/claude-agent-sdk
// Must use import() type pattern for accuracy
type SessionState = {
  history: typeof import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
  lastResult: typeof import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
};
// WRONG: history: any[]; (loses type safety)
// WRONG: history: SDKUserMessage[]; (SDKUserMessage not in scope)

// CRITICAL: Initialize Map in field declaration, not constructor
private sessions: Map<string, SessionState> = new Map();
// WRONG: private sessions: Map<string, SessionState>; then this.sessions = new Map() in constructor
// WHY: Fields are initialized in declaration order, consistent with existing patterns (mcpHandler, skillsPrompt)

// CRITICAL: Idempotent createSession() - check before creating
if (!this.sessions.has(sessionId)) {
  this.sessions.set(sessionId, { history: [], lastResult: null });
}
// WRONG: Always set() (overwrites existing session state)
// PATTERN: Follow initialize() idempotent check at lines 147-149

// CRITICAL: SDK initialization check in public methods
if (!this.sdk) {
  throw new Error("SDK not initialized. Call initialize() first.");
}
// PATTERN: Follow execute() pattern at lines 219-223
// WHY: Public methods should fail gracefully if SDK not loaded

// CRITICAL: Return undefined (not null) for missing sessions
getSession(sessionId: string): SessionState | undefined {
  return this.sessions.get(sessionId);  // Returns undefined if not found
}
// WRONG: Return null for missing sessions
// WHY: Map.get() returns undefined by default, consistent with Map semantics

// CRITICAL: Clear sessions in terminate() after SDK null check
async terminate(): Promise<void> {
  if (this.sdk === null) {
    return;
  }
  this.sdk = null;
  this.mcpServerConfig = null;
  this.skillsPrompt = '';
  this.sessions.clear();  // Add after existing cleanup
}

// CRITICAL: Update capabilities.sessions from false to true
// This is a semantic change - sessions are now supported
readonly capabilities: ProviderCapabilities = {
  // ... other capabilities
  sessions: true,  // CHANGED from false
  // ...
};

// GOTCHA: SessionState.lastResult can be null
// New sessions start with null lastResult
interface SessionState {
  history: SDKUserMessage[];
  lastResult: SDKResultMessage | null;  // Null until first execution
}

// GOTCHA: createSession() is synchronous (no async)
// Session storage is in-memory Map operation
createSession(sessionId: string): void {
  // Synchronous operation
}
// WRONG: async createSession(sessionId: string): Promise<void>

// PATTERN: Use Map.has() before get() when you need to distinguish missing from undefined value
if (this.sessions.has(sessionId)) {
  const state = this.sessions.get(sessionId)!;  // Non-null assertion safe
  // ...
}

// GOTCHA: Map.set() returns the Map (chainable)
this.sessions.set(sessionId, state).set(sessionId2, state2);
// But prefer separate statements for clarity

// PATTERN: Follow existing private field naming
private sessions: Map<string, SessionState>;  // camelCase, private
// NOT: private _sessions, private sessionMap, private Sessions

// GOTCHA: SessionState is internal (@internal JSDoc)
// Not exported from module, used only within AnthropicProvider
/**
 * @internal
 */
interface SessionState { ... }
```

---

## Implementation Blueprint

### Data Models and Structure

**New Type: SessionState**
```typescript
/**
 * Session state for maintaining conversation history
 *
 * Stores the conversation context for session-based execution.
 * Used when request.options.sessionId is provided.
 *
 * @internal
 */
interface SessionState {
  /** Conversation history - all user messages in this session */
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];

  /** Last result message from the most recent execution */
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}
```

**Storage Field:**
```typescript
private sessions: Map<string, SessionState> = new Map();
```

---

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: ADD SessionState interface to AnthropicProvider
  - DEFINE: SessionState interface with history and lastResult fields
  - TYPE: history as SDKUserMessage[], lastResult as SDKResultMessage | null
  - USE: typeof import() pattern for SDK message types
  - PLACE: After private field declarations, before method implementations
  - LOCATION: src/providers/anthropic-provider.ts (around line 135, after skillsPrompt field)
  - JSDOC: Add @internal tag (internal to provider implementation)

Task 2: ADD private sessions field to AnthropicProvider
  - DECLARE: private sessions: Map<string, SessionState> = new Map();
  - INITIALIZE: In field declaration (not constructor)
  - PLACE: After skillsPrompt field (line 134), before initialize() method
  - LOCATION: src/providers/anthropic-provider.ts (around line 135)
  - PATTERN: Follow existing private field pattern (sdk, mcpHandler, mcpServerConfig, skillsPrompt)

Task 3: UPDATE capabilities.sessions from false to true
  - CHANGE: sessions: false → sessions: true
  - VERIFY: Update JSDoc comment for sessions capability
  - PLACE: In capabilities property declaration (line 89)
  - LOCATION: src/providers/anthropic-provider.ts (line 89)
  - JSDOC: Update to reflect session support via abstraction layer

Task 4: IMPLEMENT createSession() method
  - SIGNATURE: createSession(sessionId: string): void
  - BODY: SDK initialization check, idempotent has() check, set() if not exists
  - PLACE: After loadSkills() method (around line 497)
  - LOCATION: src/providers/anthropic-provider.ts
  - PATTERN: Follow initialize() idempotent check (lines 147-149)
  - ERROR: Throw "SDK not initialized" if !this.sdk

Task 5: IMPLEMENT getSession() method
  - SIGNATURE: getSession(sessionId: string): SessionState | undefined
  - BODY: Return this.sessions.get(sessionId)
  - PLACE: After createSession() method
  - LOCATION: src/providers/anthropic-provider.ts
  - PATTERN: Simple getter, read-only operation
  - RETURN: undefined if not found (Map.get() default behavior)

Task 6: MODIFY terminate() to clear sessions
  - FIND: terminate() method (line 194-215)
  - ADD: this.sessions.clear() after this.skillsPrompt = '' (line 211)
  - PLACE: After existing cleanup, before method end
  - LOCATION: src/providers/anthropic-provider.ts (line 212)
  - PATTERN: Follow existing cleanup pattern (mcpServerConfig, skillsPrompt)

Task 7: CREATE unit tests in anthropic-provider-sessions.test.ts
  - CREATE: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  - IMPLEMENT: Test 1 - createSession() creates new session state
  - IMPLEMENT: Test 2 - createSession() is idempotent (no overwrite)
  - IMPLEMENT: Test 3 - getSession() returns state for existing session
  - IMPLEMENT: Test 4 - getSession() returns undefined for non-existent session
  - IMPLEMENT: Test 5 - terminate() clears all sessions
  - IMPLEMENT: Test 6 - createSession() throws when SDK not initialized
  - IMPLEMENT: Test 7 - capabilities.sessions is true
  - FOLLOW: Pattern from anthropic-provider-initialize.test.ts
  - USE: @ts-expect-error for private sessions field access

Task 8: RUN validation commands
  - EXEC: npm run lint (TypeScript compilation check)
  - EXEC: npm test -- src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  - VERIFY: No TypeScript errors
  - VERIFY: All tests pass
  - FIX: Any type errors or test failures
```

---

### Implementation Patterns & Key Details

```typescript
// ========================================
// PATTERN 1: SessionState Interface Definition
// ========================================

/**
 * Session state for maintaining conversation history
 *
 * Stores the conversation context for session-based execution.
 * Used when request.options.sessionId is provided.
 *
 * @internal
 */
interface SessionState {
  /** Conversation history - all user messages in this session */
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];

  /** Last result message from the most recent execution */
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}

// KEY: Use typeof import() for SDK types to avoid import at top of file
// KEY: Mark as @internal (implementation detail, not public API)
// KEY: lastResult can be null (new sessions haven't executed yet)

// ========================================
// PATTERN 2: Private Field Initialization
// ========================================

export class AnthropicProvider implements Provider {
  // ... existing private fields ...

  /**
   * Session storage for multi-turn conversations
   *
   * Maps session IDs to their conversation state. Enables session-based
   * execution despite Anthropic SDK's stateless design.
   *
   * @internal
   */
  private sessions: Map<string, SessionState> = new Map();

  // KEY: Initialize Map in field declaration (not constructor)
  // KEY: Follow existing pattern from mcpHandler, skillsPrompt
  // KEY: Mark as @internal (private implementation detail)

// ========================================
// PATTERN 3: SDK Initialization Check
// ========================================

  /**
   * Create a new session with the specified ID
   *
   * Initializes empty session state for the given session ID.
   * If session already exists, this is a no-op (idempotent).
   *
   * @param sessionId - Unique identifier for the session
   * @throws {Error} If SDK is not initialized
   */
  createSession(sessionId: string): void {
    // PATTERN: SDK initialization check (follow execute() pattern)
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initialize() first.");
    }

    // PATTERN: Idempotent operation (follow initialize() pattern)
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        history: [],
        lastResult: null,
      });
    }
  }

// KEY: Always check this.sdk before public method operations
// KEY: Use Map.has() to check existence before set()
// KEY: Initialize with empty history and null lastResult

// ========================================
// PATTERN 4: Simple Getter Method
// ========================================

  /**
   * Get session state for the specified ID
   *
   * Retrieves the current session state including conversation history
   * and last result. Returns undefined if session doesn't exist.
   *
   * @param sessionId - Session identifier to retrieve
   * @returns Session state or undefined if not found
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

// KEY: Simple getter - just return Map.get() result
// KEY: Return type includes undefined (Map.get() default)
// KEY: No SDK check needed for read-only operation

// ========================================
// PATTERN 5: Cleanup in terminate()
// ========================================

  async terminate(): Promise<void> {
    // ... existing cleanup code ...

    // Clear session storage
    this.sessions.clear();

    // KEY: Add after existing cleanup (mcpServerConfig, skillsPrompt)
    // KEY: Use Map.clear() for efficient cleanup
    // KEY: No null check needed - clear() on empty Map is safe

// ========================================
// PATTERN 6: Capabilities Update
// ========================================

  readonly capabilities: ProviderCapabilities = {
    /** MCP server connections via createSdkMcpServer */
    mcp: true,
    /** Skill loading via system prompt */
    skills: true,
    /** LSP integration via MCP plugins */
    lsp: true,
    /** Streaming response support */
    streaming: true,
    /** Session-based state (via abstraction layer) */
    sessions: true,  // CHANGED: Was false, now true
    /** Extended thinking via maxThinkingTokens */
    extendedThinking: true,
  } satisfies ProviderCapabilities;

// KEY: Update sessions capability to reflect new feature
// KEY: Update JSDoc to indicate "via abstraction layer"
// KEY: Keep satisfies ProviderCapabilities for type safety

// ========================================
// GOTCHA: Idempotent createSession()
// ========================================

// WRONG: Always overwrites existing session
createSession(sessionId: string): void {
  this.sessions.set(sessionId, { history: [], lastResult: null });
}

// RIGHT: Check before creating (idempotent)
createSession(sessionId: string): void {
  if (!this.sessions.has(sessionId)) {
    this.sessions.set(sessionId, { history: [], lastResult: null });
  }
}

// WHY: Calling createSession() twice shouldn't lose conversation history

// ========================================
// GOTCHA: Return Type for getSession()
// ========================================

// WRONG: Returns null for missing sessions
getSession(sessionId: string): SessionState | null {
  return this.sessions.get(sessionId) ?? null;
}

// RIGHT: Returns undefined for missing sessions
getSession(sessionId: string): SessionState | undefined {
  return this.sessions.get(sessionId);
}

// WHY: Map.get() returns undefined by default - consistent with Map semantics
// ALSO: TypeScript's optional chaining works better with undefined

// ========================================
// GOTCHA: SDK Type Import Pattern
// ========================================

// WRONG: Import at top level (circular dependency risk)
import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';

interface SessionState {
  history: SDKUserMessage[];
}

// RIGHT: Use typeof import() in interface
interface SessionState {
  history: typeof import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
}

// WHY: Lazy type evaluation, avoids top-level import dependency
```

---

### Integration Points

```yaml
CAPABILITIES:
  - update: src/providers/anthropic-provider.ts
  - line: 89
  - change: sessions: false → sessions: true
  - reason: Reflect session support via abstraction layer

TERMINATE:
  - update: src/providers/anthropic-provider.ts
  - method: terminate()
  - add: this.sessions.clear()
  - place: After this.skillsPrompt = '' (line 211)
  - reason: Clear all session state on provider termination

PROVIDEROPTIONS:
  - exists: src/types/providers.ts
  - field: ProviderOptions.sessionId?: string
  - usage: Already exists - this implementation fulfills that contract
  - note: P2.M2.T1.S2 will use this with session storage

EXECUTE_METHOD:
  - future: P2.M2.T1.S2 will modify execute()
  - will_use: this.sessions.get(request.options.sessionId)
  - will_use: this.createSession() for new sessions
  - note: This subtask creates storage, next subtask uses it
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run lint

# Expected: Zero TypeScript errors
# If errors exist, check:
# - SessionState interface uses typeof import() pattern correctly
# - sessions field is private with correct type
# - createSession() and getSession() signatures are correct
# - capabilities.sessions is updated to true

# Run specific file check
npx tsc --noEmit src/providers/anthropic-provider.ts

# Expected: Clean compilation with no errors
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Run session storage tests
npm test -- src/__tests__/unit/providers/anthropic-provider-sessions.test.ts

# Expected: All tests pass
# Test coverage:
# - createSession() creates new session with empty state
# - createSession() is idempotent (doesn't overwrite existing)
# - getSession() returns state for existing session
# - getSession() returns undefined for non-existent session
# - terminate() clears all session storage
# - createSession() throws when SDK not initialized
# - capabilities.sessions is true

# Run all provider tests to ensure no regressions
npm test -- src/__tests__/unit/providers/

# Expected: All existing tests still pass
# No test failures introduced by changes
```

---

### Level 3: Interface Compliance Validation

```bash
# Test that AnthropicProvider still implements Provider interface
# Create temporary test file: test-session-interface.ts

import { AnthropicProvider } from './src/providers/anthropic-provider.js';
import type { Provider } from './src/types/providers.js';

// Type check: AnthropicProvider should be assignable to Provider
const provider: Provider = new AnthropicProvider();

// Verify new methods exist
expect(provider.createSession).toBeDefined();
expect(provider.getSession).toBeDefined();

// Verify capabilities updated
expect(provider.capabilities.sessions).toBe(true);

# Run: npx tsc --noEmit test-session-interface.ts

# Expected: Successful compilation
# If errors: Check method signatures match interface
```

---

### Level 4: Integration Validation

```bash
# Test session storage with provider lifecycle
# Create integration test: test-session-lifecycle.ts

import { AnthropicProvider } from './src/providers/anthropic-provider.js';

const provider = new AnthropicProvider();

// Initialize provider
await provider.initialize();

// Create session
provider.createSession('test-session');

// Verify session exists
const state = provider.getSession('test-session');
console.log('Session state:', state);  // Should have empty history, null lastResult

// Terminate provider
await provider.terminate();

// Verify sessions cleared
const afterTerminate = provider.getSession('test-session');
console.log('After terminate:', afterTerminate);  // Should be undefined

# Expected: All operations succeed
# If errors: Check session storage and cleanup logic
```

---

### Level 5: Memory Management Validation

```bash
# Test that sessions don't cause memory leaks
# Create test: test-session-memory.ts

import { AnthropicProvider } from './src/providers/anthropic-provider.js';

const provider = new AnthropicProvider();
await provider.initialize();

// Create many sessions
for (let i = 0; i < 1000; i++) {
  provider.createSession(`session-${i}`);
}

// @ts-expect-error - Testing private property
const sizeBefore = provider.sessions.size;
console.log('Sessions before:', sizeBefore);  // Should be 1000

// Terminate should clear all
await provider.terminate();

// @ts-expect-error - Testing private property
const sizeAfter = provider.sessions.size;
console.log('Sessions after:', sizeAfter);  // Should be 0

# Expected: Sessions cleared completely
# If sizeAfter > 0: Check terminate() cleanup logic
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npm run lint`
- [ ] `SessionState` interface defined with correct types
- [ ] `private sessions: Map<string, SessionState>` field exists
- [ ] `createSession(sessionId: string): void` method implemented
- [ ] `getSession(sessionId: string): SessionState | undefined` method implemented
- [ ] `capabilities.sessions` changed from `false` to `true`
- [ ] `terminate()` clears session storage
- [ ] All imports use .js extensions for ES modules

### Feature Validation

- [ ] `createSession()` creates empty session state (history: [], lastResult: null)
- [ ] `createSession()` is idempotent (no overwrite on duplicate calls)
- [ ] `getSession()` returns `SessionState` for existing sessions
- [ ] `getSession()` returns `undefined` for non-existent sessions
- [ ] `terminate()` clears all sessions (`sessions.size === 0` after)
- [ ] `createSession()` throws when SDK not initialized
- [ ] `capabilities.sessions` is `true`

### Code Quality Validation

- [ ] Follows existing codebase patterns (private fields, idempotent operations)
- [ ] Naming conventions match (camelCase methods, private fields)
- [ ] JSDoc comments on all public members
- [ ] `@internal` tag on SessionState interface
- [ ] No anti-patterns used (see below)

### Test Validation

- [ ] Unit test file created: `anthropic-provider-sessions.test.ts`
- [ ] All tests pass: `npm test -- anthropic-provider-sessions.test.ts`
- [ ] Test coverage includes:
  - [ ] Session creation and retrieval
  - [ ] Idempotent behavior
  - [ ] Missing session handling
  - [ ] Termination cleanup
  - [ ] SDK initialization check
  - [ ] Capabilities verification
- [ ] No existing tests broken by changes

---

## Anti-Patterns to Avoid

- ❌ **Don't initialize Map in constructor**
  - Wrong: `private sessions: Map<string, SessionState>;` then `this.sessions = new Map()` in constructor
  - Right: `private sessions: Map<string, SessionState> = new Map();`
  - Why: Existing pattern initializes in field declaration (mcpHandler, skillsPrompt)

- ❌ **Don't make createSession() async**
  - Wrong: `async createSession(sessionId: string): Promise<void>`
  - Right: `createSession(sessionId: string): void`
  - Why: Map operations are synchronous, no async needed

- ❌ **Don't return null for missing sessions**
  - Wrong: `getSession(): SessionState | null`
  - Right: `getSession(): SessionState | undefined`
  - Why: Map.get() returns undefined, consistent with Map semantics

- ❌ **Don't overwrite existing sessions in createSession()**
  - Wrong: Always call `this.sessions.set(sessionId, state)`
  - Right: Check `if (!this.sessions.has(sessionId))` before creating
  - Why: Idempotent - calling twice shouldn't lose conversation history

- ❌ **Don't forget SDK initialization check in createSession()**
  - Wrong: No check for `this.sdk` before creating session
  - Right: `if (!this.sdk) { throw new Error(...); }`
  - Why: Public methods should validate SDK state

- ❌ **Don't use top-level imports for SDK types**
  - Wrong: `import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'`
  - Right: `typeof import("@anthropic-ai/claude-agent-sdk").SDKUserMessage`
  - Why: Lazy type evaluation, avoids circular dependency

- ❌ **Don't forget to update capabilities.sessions**
  - Wrong: Leave `sessions: false` in capabilities
  - Right: Change to `sessions: true`
  - Why: Reflects new feature availability to users

- ❌ **Don't forget to clear sessions in terminate()**
  - Wrong: Only clear sdk, mcpServerConfig, skillsPrompt
  - Right: Also clear `this.sessions.clear()`
  - Why: Prevent memory leaks from orphaned sessions

- ❌ **Don't use @ts-expect-error in production code**
  - Only use `@ts-expect-error` in tests for private property access
  - Never use in implementation files

- ❌ **Don't create public session storage field**
  - Wrong: `public sessions: Map<string, SessionState>`
  - Right: `private sessions: Map<string, SessionState>`
  - Why: Session storage is internal implementation detail

---

## Research Summary

This PRP is based on comprehensive research across four key areas:

### 1. Codebase Analysis
- **Files Analyzed**: src/providers/anthropic-provider.ts, src/providers/provider-registry.ts, src/core/mcp-handler.ts
- **Key Findings**:
  - Existing Map-based state patterns (ProviderRegistry, MCPHandler)
  - Idempotent operation patterns (initialize, terminate)
  - Private field initialization in declaration
  - Cleanup patterns in terminate() method

### 2. Anthropic SDK Research
- **Documentation**: NPM package, GitHub repository, local node_modules
- **Key Findings**:
  - SDK is stateless by design
  - `continue: true` flag for session resumption
  - `SDKUserMessage` with session_id field
  - `SDKResultMessage` for storing last execution result

### 3. Test Pattern Research
- **Files Analyzed**: anthropic-provider-initialize.test.ts, anthropic-provider-terminate.test.ts
- **Key Findings**:
  - `@ts-expect-error` for private property access
  - State verification across method calls
  - Idempotent behavior testing
  - Lifecycle testing patterns

### 4. External Best Practices Research
- **Topics**: Session management patterns, memory leak prevention, Map usage
- **Key Findings**:
  - LRU cache patterns for memory management
  - TTL-based expiration strategies
  - Thread-safe operations for concurrent access
  - Session ID generation best practices

---

## Confidence Score

**One-Pass Implementation Success Likelihood: 10/10**

**Justification**:
- ✅ Complete AnthropicProvider implementation already exists
- ✅ Clear patterns for Map-based state management in codebase
- ✅ Idempotent operation patterns well-established
- ✅ Test patterns documented and verified
- ✅ SDK message types researched and understood
- ✅ Integration points clearly defined
- ✅ No external dependencies to install
- ✅ Comprehensive anti-patterns and gotchas documented
- ✅ Simple, focused scope (1 point subtask)

**Validation**: An AI agent unfamiliar with Groundswell can implement this session storage successfully using only this PRP content, existing codebase patterns, and the comprehensive research documentation.

---

## Appendix: Complete Implementation Reference

```typescript
/**
 * Anthropic provider implementation
 *
 * ## Session Management
 *
 * Sessions provide consistent API across providers despite Anthropic SDK's
 * stateless design. Session storage maintains conversation history for
 * multi-turn conversations.
 *
 * @remarks
 * P2.M2.T1.S1: Session storage implementation
 * P2.M2.T1.S2: execute() modification to use sessions
 */
export class AnthropicProvider implements Provider {
  // ... existing properties ...

  /**
   * Session storage for multi-turn conversations
   *
   * Maps session IDs to their conversation state. Enables session-based
   * execution despite Anthropic SDK's stateless design.
   *
   * @internal
   */
  private sessions: Map<string, SessionState> = new Map();

  // ... existing methods ...

  /**
   * Create a new session with the specified ID
   *
   * Initializes empty session state for the given session ID.
   * If session already exists, this is a no-op (idempotent).
   *
   * @param sessionId - Unique identifier for the session
   * @throws {Error} If SDK is not initialized
   * @remarks
   * Session will be used when execute() receives matching sessionId in options.
   */
  createSession(sessionId: string): void {
    // PATTERN: SDK initialization check
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initialize() first.");
    }

    // PATTERN: Idempotent operation
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        history: [],
        lastResult: null,
      });
    }
  }

  /**
   * Get session state for the specified ID
   *
   * Retrieves the current session state including conversation history
   * and last result. Returns undefined if session doesn't exist.
   *
   * @param sessionId - Session identifier to retrieve
   * @returns Session state or undefined if not found
   * @remarks
   * This is a read-only operation - does not modify session state.
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }
}

/**
 * Session state for maintaining conversation history
 *
 * Stores the conversation context for session-based execution.
 * Used when request.options.sessionId is provided.
 *
 * @internal
 */
interface SessionState {
  /** Conversation history - all user messages in this session */
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];

  /** Last result message from the most recent execution */
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}
```

---

**PRP Version**: 1.0
**Created**: January 25, 2026
**For**: Subtask P2.M2.T1.S1 - Implement session storage in AnthropicProvider
**Plan**: 003_dd63ad365ffb - Multi-Provider Agent SDK Support
