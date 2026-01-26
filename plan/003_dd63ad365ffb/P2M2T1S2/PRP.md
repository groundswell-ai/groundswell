# PRP: Modify AnthropicProvider execute() to Support Sessions

## Goal

**Feature Goal**: Enable session-based execution in AnthropicProvider by modifying the `execute()` method to use the SDK's `continue: true` option with `streamInput()` for conversation history continuity.

**Deliverable**: Modified `AnthropicProvider.execute()` method that:
1. Detects `request.options.sessionId` and retrieves session state
2. Builds `streamInput` from session history for continuation
3. Calls SDK `query()` with `options.continue = true` for existing sessions
4. Appends new user messages and assistant response to session history after execution
5. Returns session-aware results maintaining conversation context

**Success Definition**:
- `execute()` method handles both new and existing sessions
- Session history is streamed via `streamInput()` when `sessionId` provided
- New messages are appended to session history after execution
- `lastResult` is updated with latest execution result
- All existing tests pass plus new session-based execution tests

## Why

- **Multi-Turn Conversations**: Users need to maintain conversation context across multiple prompt executions
- **Session Abstraction**: Anthropic SDK is stateless; sessions must be managed at the provider abstraction layer
- **SDK Continue Pattern**: The SDK provides `continue: true` option but requires explicit `streamInput()` with history
- **Prerequisite for Agent Integration**: Phase 4 (Agent Integration) requires session-capable providers for multi-turn agent conversations

## What

Modify `AnthropicProvider.execute()` to support session-based execution using the SDK's continuation mechanism.

### Success Criteria

- [ ] `execute()` checks `request.options.sessionId` and retrieves session state
- [ ] For existing sessions with history, sets `sdkOptions.continue = true`
- [ ] Calls `query.streamInput()` with session history before new prompt
- [ ] Captures new user messages and appends to `session.history`
- [ ] Updates `session.lastResult` with latest execution result
- [ ] All existing `execute()` tests continue to pass (backward compatibility)
- [ ] New tests cover session continuation scenarios

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

- **Where code lives**: `src/providers/anthropic-provider.ts` lines 243-382 (execute() method)
- **Session storage**: Already implemented in P2.M2.T1.S1 (lines 136-144, 716-745)
- **SDK continue pattern**: Requires both `continue: true` option AND `streamInput()` with history
- **Message types**: `SDKUserMessage` for history, `SDKResultMessage` for results
- **Test patterns**: `src/__tests__/unit/providers/anthropic-provider.test.ts` for reference

### Documentation & References

```yaml
# MUST READ - Work Item Contract
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/prd_snapshot.md
  why: Contains the exact contract definition for P2.M2.T1.S2
  section: "P2.M2.T1.S2: Modify execute() to support sessions"
  critical: Defines INPUT (sessionId), LOGIC (streamInput, continue option), OUTPUT (session-based execution)

# MUST READ - External Dependencies (SDK continue option)
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  why: Documents SDK's continue: true option and streamInput() API
  section: "Options Type" (lines 66-89), "V2 Session API" (lines 261-298)
  critical: continue option alone doesn't work - must also call streamInput() with history

# MUST READ - Session Storage Implementation (P2.M2.T1.S1)
- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Shows createSession(), getSession(), and SessionState interface
  section: lines 136-144 (sessions Map), lines 716-745 (session methods), lines 756-762 (SessionState interface)
  pattern: Map.has() for existence checks, Map.get() for retrieval, history accumulation pattern

# MUST READ - SDK continue option research
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/anthropic-sdk-session-patterns.md
  why: Complete research on SDK's continue option with streamInput() patterns
  section: "Continue Option Pattern", "streamInput Method", "Session Implementation Example"
  critical: continue: true requires AsyncIterable<SDKUserMessage> via streamInput()

# MUST READ - Session management best practices
- docfile: /home/dustin/projects/groundswell/research/llm-sdk-session-management-best-practices.md
  why: Production-ready patterns for session continuation with AsyncGenerator
  section: "Session Continuation Pattern", "Message Collection Pattern", "Atomic Update Pattern"
  critical: Always consume full generator, proper error handling, session update patterns

# MUST READ - Codebase session patterns
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/codebase-session-patterns.md
  why: Analysis of existing session management patterns in the codebase
  section: "SessionState Interface", "Map Usage Patterns", "Message Accumulation"
  critical: SessionState.history type is SDKUserMessage[], lastResult is SDKResultMessage | null

# MUST READ - Existing execute() implementation
- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Current execute() implementation to modify for session support
  section: lines 243-382 (complete execute() method)
  pattern: SDK initialization check, model resolution, sdkOptions construction, query() call, message iteration

# MUST READ - Test patterns for execute()
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider.test.ts
  why: Shows testing patterns for provider methods, including execute() setup
  section: lines 114-128 (execute() method signature test)
  pattern: Mock tool executor, initialize before execute, Promise<AgentResponse<T>> assertion

# EXTERNAL RESEARCH - SDK documentation
- url: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  why: Official package documentation for SDK continue option
  critical: continue: boolean option in Options interface

- url: https://github.com/anthropics/claude-agent-sdk-typescript
  why: Source code for SDK query() and streamInput() implementation
  critical: streamInput() signature and usage patterns

- url: https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk
  why: Official Anthropic Agent SDK documentation
  critical: Session management patterns and examples
```

### Current Codebase Tree

```bash
src/
├── providers/
│   ├── anthropic-provider.ts     (TARGET: Modify execute() method, lines 243-382)
│   │   ├── sessions: Map<string, SessionState>  (line 144) - Session storage
│   │   ├── execute() method      (lines 243-382) - TO MODIFY
│   │   ├── createSession()       (lines 716-730) - Session creation
│   │   ├── getSession()          (lines 743-754) - Session retrieval
│   │   └── SessionState interface (lines 756-762) - history: SDKUserMessage[], lastResult
│   └── provider-registry.ts      (Provider registry for session-aware providers)
├── types/
│   ├── providers.ts              (ProviderRequest.options.sessionId: string)
│   └── agent.ts                  (AgentResponse type)
├── __tests__/
│   └── unit/providers/
│       ├── anthropic-provider.test.ts          (Existing tests)
│       └── anthropic-provider-sessions.test.ts (Session storage tests - P2.M2.T1.S1)
└── core/
    └── mcp-handler.ts            (MCP integration, unchanged)
```

### Desired Codebase Tree (After Implementation)

```bash
# No new files - modifications to existing files only

src/
├── providers/
│   ├── anthropic-provider.ts     (MODIFIED: execute() with session support)
│   │   └── execute()             (NEW: Session detection, streamInput, history update)
│   └── provider-registry.ts      (unchanged)
├── __tests__/
│   └── unit/providers/
│       ├── anthropic-provider.test.ts              (MODIFIED: Add session tests)
│       └── anthropic-provider-sessions.test.ts    (MODIFIED: Add execute() session tests)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: SDK continue: true alone is NOT sufficient
// You MUST also call streamInput() with the session history
// WRONG:
const q = sdk.query({ prompt: newPrompt, options: { continue: true } });
// RIGHT:
const q = sdk.query({ prompt: '', options: { continue: true } });
await q.streamInput(async function* () {
  for (const msg of session.history) {
    yield msg;
  }
}());

// CRITICAL: SDKUserMessage structure for streaming
// Each message must have: type, message, parent_tool_use_id, session_id
type SDKUserMessage = {
  type: 'user';
  message: APIUserMessage;
  parent_tool_use_id: string | null;
  session_id: string;
  isSynthetic?: boolean;
  tool_use_result?: unknown;
  uuid?: string;
};

// CRITICAL: streamInput() returns Promise<void> - MUST await
// WRONG:
q.streamInput(historyGenerator);
// RIGHT:
await q.streamInput(historyGenerator);

// CRITICAL: Continue uses empty prompt, new message uses streamInput too
// For continuation (existing session):
// - prompt: '' (empty string)
// - options.continue: true
// - streamInput() with history FIRST, then streamInput() with new message

// CRITICAL: Capture user messages during iteration
// SDK returns user messages with session_id - these must be appended to history
for await (const message of query) {
  if (message.type === 'user') {
    session.history.push(message);  // CRITICAL: Accumulate for next turn
  }
  if (message.type === 'result') {
    session.lastResult = message;   // CRITICAL: Store for metadata
  }
}

// CRITICAL: Use typeof import() pattern for SDK types (not top-level imports)
// FROM: src/providers/anthropic-provider.ts line 103
private sdk: typeof import("@anthropic-ai/claude-agent-sdk") | null = null;

// CRITICAL: SessionState.history is SDKUserMessage[] from SDK types
interface SessionState {
  history: typeof import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
  lastResult: typeof import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}

// CRITICAL: Map.has() for idempotent session checks (from createSession pattern)
if (!this.sessions.has(sessionId)) {
  // Only create if doesn't exist
}

// CRITICAL: SDK initialization check pattern (from existing execute())
if (!this.sdk) {
  throw new Error("SDK not initialized. Call initialize() first.");
}

// CRITICAL: Query returns AsyncGenerator, not Promise
// Do NOT await the query() call itself
const queryResult = this.sdk.query({ ... });  // NO await
for await (const message of queryResult) { ... }  // Iterate directly

// CRITICAL: First user message contains session_id
// Save this for subsequent streamInput() calls
let firstUserMessage: SDKUserMessage | null = null;
for await (const message of queryResult) {
  if (message.type === 'user' && !firstUserMessage) {
    firstUserMessage = message;
    session.history.push(message);
  }
}
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// SessionState interface (already exists in anthropic-provider.ts:756-762)
interface SessionState {
  /** Conversation history - all user messages in this session */
  history: typeof import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];

  /** Last result message from the most recent execution */
  lastResult: typeof import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}

// SDKUserMessage structure (from @anthropic-ai/claude-agent-sdk)
type SDKUserMessage = {
  type: 'user';
  message: APIUserMessage;           // { content: string | ContentBlock[] }
  parent_tool_use_id: string | null; // Links to tool use if responding
  session_id: string;                // Session identifier
  isSynthetic?: boolean;             // System-generated flag
  tool_use_result?: unknown;         // Tool result if applicable
  uuid?: string;                     // Unique message ID
};

// SDKResultMessage structure (from @anthropic-ai/claude-agent-sdk)
type SDKResultMessage = {
  type: 'result';
  subtype: 'success' | 'error_during_execution' | 'error_max_turns';
  result: string;
  structured_output?: unknown;
  usage: { input_tokens: number; output_tokens: number };
  duration_ms: number;
  num_turns: number;
  total_cost_usd: number;
  uuid: string;
  session_id: string;
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY execute() method - Session detection and retrieval
  - LOCATION: src/providers/anthropic-provider.ts, execute() method (after line 249)
  - ADD: Session detection logic after SDK initialization check
  - IMPLEMENT: Extract sessionId from request.options.sessionId
  - IMPLEMENT: Retrieve session using this.getSession(sessionId)
  - IMPLEMENT: Determine isContinuation flag (session exists && history.length > 0)
  - PATTERN: Follow existing getSession() pattern (lines 743-754)
  - GOTCHA: sessionId is optional - handle undefined case (no session = new conversation)

Task 2: MODIFY execute() method - Build SDK options with continue flag
  - LOCATION: src/providers/anthropic-provider.ts, sdkOptions construction (lines 267-295)
  - MODIFY: Add continue: isContinuation to sdkOptions
  - MODIFY: For continuation, set prompt to '' (empty string)
  - PATTERN: Follow existing options spread pattern (lines 267-295)
  - GOTCHA: Continue flag alone is insufficient - must also use streamInput()

Task 3: MODIFY execute() method - Stream session history via streamInput()
  - LOCATION: src/providers/anthropic-provider.ts, after query() call (after line 304)
  - ADD: Conditional streamInput() call for continuation
  - IMPLEMENT: Async generator function yielding session.history messages
  - IMPLEMENT: await queryResult.streamInput(historyGenerator)
  - PATTERN: Follow research pattern from llm-sdk-session-management-best-practices.md
  - CRITICAL: MUST await streamInput() - it returns Promise<void>
  - GOTCHA: streamInput() requires AsyncIterable<SDKUserMessage>, use async function*

Task 4: MODIFY execute() method - Stream new user message
  - LOCATION: src/providers/anthropic-provider.ts, after history streaming
  - ADD: streamInput() call for new user message (non-continuation only)
  - IMPLEMENT: Yield SDKUserMessage with type, message, parent_tool_use_id, session_id
  - PATTERN: Follow SDKUserMessage structure from research
  - GOTCHA: For continuation, new message also goes via streamInput(), not prompt

Task 5: MODIFY execute() method - Capture and append user messages to history
  - LOCATION: src/providers/anthropic-provider.ts, message iteration loop (lines 314-333)
  - MODIFY: Add message.type === 'user' check in iteration
  - IMPLEMENT: Push user messages to session.history array
  - IMPLEMENT: Save first user message for session_id reference
  - PATTERN: Follow message iteration pattern (lines 314-333)
  - GOTCHA: Only append user messages, not assistant or result messages

Task 6: MODIFY execute() method - Update lastResult and handle new sessions
  - LOCATION: src/providers/anthropic-provider.ts, after resultMessage capture (line 331)
  - MODIFY: Set session.lastResult = resultMessage when capturing result
  - IMPLEMENT: Handle new session creation if sessionId provided but session doesn't exist
  - PATTERN: Follow getSession() pattern, call createSession() if needed
  - GOTCHA: Create session only after successful first execution

Task 7: CREATE tests for session-based execution
  - LOCATION: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
  - IMPLEMENT: Test suite for execute() with sessionId
  - IMPLEMENT: Test continuation with existing history
  - IMPLEMENT: Test new session creation via execute()
  - IMPLEMENT: Test history accumulation across multiple turns
  - FOLLOW pattern: anthropic-provider-sessions.test.ts existing patterns
  - COVERAGE: Happy path, edge cases (no sessionId, empty history, single turn)
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Session detection and retrieval
// Location: execute() method, after SDK initialization check
// ============================================================

async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  // Existing SDK check
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  // NEW: Session detection
  const sessionId = request.options.sessionId;
  let session: SessionState | undefined;
  let isContinuation = false;

  if (sessionId) {
    session = this.getSession(sessionId);

    // Check if this is a continuation (existing history)
    if (session && session.history.length > 0) {
      isContinuation = true;
    }
  }

  // ... rest of method
}

// ============================================================
// PATTERN 2: SDK options with continue flag
// Location: execute() method, sdkOptions construction
// ============================================================

const sdkOptions = {
  model: modelSpec.model,
  systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt),

  // NEW: Add continue flag for session continuation
  ...(isContinuation && { continue: true }),

  // Existing options...
  ...(request.options.tools && request.options.tools.length > 0 && {
    allowedTools: request.options.tools.map((t) => t.name),
  }),
  // ... rest of options
};

// ============================================================
// PATTERN 3: Stream history via streamInput()
// Location: execute() method, after query() call
// ============================================================

const queryResult = this.sdk.query({
  prompt: isContinuation ? '' : request.prompt,  // Empty prompt for continuation
  options: sdkOptions,
});

// NEW: Stream history if continuing
if (isContinuation && session) {
  await queryResult.streamInput(
    async function* historyStream() {
      for (const msg of session.history) {
        yield msg;
      }
    }()
  );
}

// NEW: Stream new user message
// For continuation: new message via streamInput
// For new session: already in prompt above, but could also use streamInput
if (isContinuation && session) {
  await queryResult.streamInput(
    async function* newMessageStream() {
      // Need to yield a proper SDKUserMessage
      // Note: session_id will be assigned by SDK on first message
      yield {
        type: 'user',
        message: { content: request.prompt },
        parent_tool_use_id: null,
        session_id: '',  // SDK will assign proper session_id
      };
    }()
  );
}

// ============================================================
// PATTERN 4: Capture and append user messages
// Location: execute() method, message iteration loop
// ============================================================

let resultMessage: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null = null;
let toolCallCount = 0;
let currentSessionId: string | undefined;  // NEW: Track session_id

for await (const message of queryResult) {
  // Existing tool counting
  if (message.type === "assistant") {
    const content = message.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") {
          toolCallCount++;
        }
      }
    }
  }

  // NEW: Capture user messages and append to history
  if (message.type === "user" && session) {
    session.history.push(message);

    // Save session_id from first user message
    if (!currentSessionId) {
      currentSessionId = message.session_id;
    }
  }

  // Existing result capture
  if (message.type === "result") {
    resultMessage = message as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;

    // NEW: Update session lastResult
    if (session) {
      session.lastResult = resultMessage;
    }
  }
}

// ============================================================
// PATTERN 5: Handle new session creation
// Location: execute() method, after successful execution
// ============================================================

// After message iteration completes
if (sessionId && !session && resultMessage) {
  // Session was requested but didn't exist - create it now
  this.createSession(sessionId);
  const newSession = this.getSession(sessionId);

  if (newSession && currentSessionId) {
    // The SDK created the session, add the user message we captured
    // We need to reconstruct the user message from the iteration
    // In practice, the messages were already captured above
  }
}

// ============================================================
// COMPLETE INTEGRATED EXAMPLE
// Showing all patterns together
// ============================================================

async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  // Session detection
  const sessionId = request.options.sessionId;
  let session: SessionState | undefined;
  let isContinuation = false;

  if (sessionId) {
    session = this.getSession(sessionId);
    if (session && session.history.length > 0) {
      isContinuation = true;
    }
  }

  // Model resolution
  const modelSpec = this.normalizeModel(
    request.options.model ?? "claude-sonnet-4-20250514",
  );

  // SDK hooks
  const sdkHooks = this.buildAgentSDKHooks(hooks);

  // SDK options with continue flag
  const sdkOptions = {
    model: modelSpec.model,
    systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt),
    ...(isContinuation && { continue: true }),  // NEW
    ...(request.options.tools && request.options.tools.length > 0 && {
      allowedTools: request.options.tools.map((t) => t.name),
    }),
    ...(this.mcpServerConfig && {
      mcpServers: {
        "groundswell-mcp": this.mcpServerConfig,
      },
    }),
    ...(Object.keys(sdkHooks).length > 0 && {
      hooks: sdkHooks,
    }),
  };

  const startTime = Date.now();

  // Query with empty prompt for continuation
  const queryResult = this.sdk.query({
    prompt: isContinuation ? '' : request.prompt,  // MODIFIED
    options: sdkOptions,
  });

  // NEW: Stream history for continuation
  if (isContinuation && session) {
    await queryResult.streamInput(
      async function* historyStream() {
        for (const msg of session.history) {
          yield msg;
        }
      }()
    );

    // NEW: Stream new user message
    await queryResult.streamInput(
      async function* newMessageStream() {
        yield {
          type: 'user',
          message: { content: request.prompt },
          parent_tool_use_id: null,
          session_id: session.history[0]?.session_id ?? '',
        };
      }()
    );
  }

  // Message iteration with history accumulation
  let resultMessage: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null = null;
  let toolCallCount = 0;

  for await (const message of queryResult) {
    if (message.type === "assistant") {
      const content = message.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_use") {
            toolCallCount++;
          }
        }
      }
    }

    // NEW: Append user messages to session history
    if (message.type === "user" && session) {
      session.history.push(message);
    }

    if (message.type === "result") {
      resultMessage = message as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;

      // NEW: Update session lastResult
      if (session) {
        session.lastResult = resultMessage;
      }
    }
  }

  // Rest of method unchanged...
  const duration = Date.now() - startTime;

  if (!resultMessage) {
    return createErrorResponse(
      "INVALID_RESPONSE_FORMAT",
      "No result message received from Agent SDK",
      { duration },
      false
    ) as AgentResponse<T>;
  }

  // ... rest of error handling and response construction
}
```

### Integration Points

```yaml
FILES_TO_MODIFY:
  - modify: src/providers/anthropic-provider.ts
    location: execute() method (lines 243-382)
    changes:
      - Add session detection after SDK check (after line 252)
      - Add continue flag to sdkOptions (line 267-295)
      - Add streamInput() call for history (after line 307)
      - Add user message capture in iteration (line 314-333)
      - Add lastResult update (after line 331)
      - Handle new session creation (after iteration)

  - modify: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
    changes:
      - Add describe block for "execute() with sessions"
      - Test continuation with existing history
      - Test new session creation
      - Test history accumulation
      - Test lastResult update

NO_CHANGES_TO:
  - src/types/providers.ts (sessionId already in ProviderOptions)
  - src/providers/provider-registry.ts
  - src/core/mcp-handler.ts
  - Other provider implementations
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each modification - fix before proceeding
npx tsc --noEmit src/providers/anthropic-provider.ts

# Type check the entire project
npm run build

# Expected: Zero TypeScript errors
# Common errors to watch for:
# - "Property 'history' does not exist on 'SessionState | undefined'" - use optional chaining
# - "Argument of type 'AsyncGenerator' is not assignable to parameter of type 'AsyncIterable'" - wrap in async function*()
# - "Cannot invoke type that has no call signature" - check streamInput() await
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing session tests (should still pass)
npm test -- src/__tests__/unit/providers/anthropic-provider-sessions.test.ts

# Run existing provider tests (backward compatibility)
npm test -- src/__tests__/unit/providers/anthropic-provider.test.ts

# Run all provider tests
npm test -- src/__tests__/unit/providers/

# Expected: All existing tests pass, new session tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Build the project
npm run build

# Test session-based execution manually
node -e "
import { AnthropicProvider } from './dist/providers/anthropic-provider.js';

async function test() {
  const provider = new AnthropicProvider();
  await provider.initialize();

  // Create session
  provider.createSession('test-session');

  // First execution
  const toolExecutor = async () => ({ content: 'test', isError: false });
  const result1 = await provider.execute(
    { prompt: 'Hello', options: { sessionId: 'test-session' } },
    toolExecutor
  );

  console.log('First execution:', result1.status);

  // Check session has history
  const session = provider.getSession('test-session');
  console.log('Session history length:', session?.history.length);

  // Second execution (continuation)
  const result2 = await provider.execute(
    { prompt: 'Continue', options: { sessionId: 'test-session' } },
    toolExecutor
  );

  console.log('Second execution:', result2.status);
  console.log('Session history length after:', session?.history.length);
}

test().catch(console.error);
"

# Expected: Both executions succeed, history grows from 1 to 2 messages
```

### Level 4: Session-Specific Validation

```bash
# Verify session state updates
node -e "
import { AnthropicProvider } from './dist/providers/anthropic-provider.js';

async function testSessionState() {
  const provider = new AnthropicProvider();
  await provider.initialize();

  const sessionId = 'state-test';
  provider.createSession(sessionId);

  // Execute with session
  const toolExecutor = async () => ({ content: 'result', isError: false });
  const result = await provider.execute(
    { prompt: 'Test prompt', options: { sessionId } },
    toolExecutor
  );

  const session = provider.getSession(sessionId);

  // Validations
  console.log('History has user message:', session?.history.length === 1);
  console.log('User message type:', session?.history[0]?.type === 'user');
  console.log('Last result exists:', session?.lastResult !== null);
  console.log('Last result type:', session?.lastResult?.type === 'result');
  console.log('Session ID matches:', session?.history[0]?.session_id != null);
}

testSessionState().catch(console.error);
"

# Expected output:
# History has user message: true
# User message type: true
# Last result exists: true
# Last result type: true
# Session ID matches: true

# Verify continuation behavior
node -e "
import { AnthropicProvider } from './dist/providers/anthropic-provider.js';

async function testContinuation() {
  const provider = new AnthropicProvider();
  await provider.initialize();

  const sessionId = 'continuation-test';
  provider.createSession(sessionId);

  const toolExecutor = async () => ({ content: 'result', isError: false });

  // First turn
  await provider.execute(
    { prompt: 'First message', options: { sessionId } },
    toolExecutor
  );

  const session1 = provider.getSession(sessionId);
  console.log('After first turn - history length:', session1?.history.length);

  // Second turn (continuation)
  await provider.execute(
    { prompt: 'Second message', options: { sessionId } },
    toolExecutor
  );

  const session2 = provider.getSession(sessionId);
  console.log('After second turn - history length:', session2?.history.length);
  console.log('History preserved:', session2?.history.length === 2);
}

testContinuation().catch(console.error);
"

# Expected output:
# After first turn - history length: 1
# After second turn - history length: 2
# History preserved: true
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] All existing tests pass (backward compatibility maintained)
- [ ] New session-based execution tests pass

### Feature Validation

- [ ] `execute()` detects `sessionId` from `request.options.sessionId`
- [ ] Existing sessions are retrieved via `getSession()`
- [ ] `continue: true` is set in sdkOptions for continuation
- [ ] `streamInput()` is called with session history for continuation
- [ ] User messages from SDK response are appended to `session.history`
- [ ] `session.lastResult` is updated with latest `SDKResultMessage`
- [ ] New sessions can be created via `execute()` with sessionId
- [ ] Multiple-turn conversations maintain context
- [ ] Session state persists across `execute()` calls

### Code Quality Validation

- [ ] Follows existing execute() method patterns
- [ ] Uses typeof import() pattern for SDK types
- [ ] Proper async/await for streamInput() calls
- [ ] Idempotent session checking (Map.has() pattern)
- [ ] SDK initialization check before session operations
- [ ] Error handling for undefined sessions
- [ ] No memory leaks (generators properly consumed)

### Documentation & Testing

- [ ] Code comments explain session flow
- [ ] Tests cover continuation scenario
- [ ] Tests cover new session creation
- [ ] Tests verify history accumulation
- [ ] Tests verify lastResult updates
- [ ] No breaking changes to existing API

## Anti-Patterns to Avoid

- ❌ **Don't set `continue: true` without `streamInput()`** - Both are required for continuation
- ❌ **Don't forget to await `streamInput()`** - It returns Promise<void>, not void
- ❌ **Don't use prompt for new messages in continuation** - Use `streamInput()` for both history and new message
- ❌ **Don't ignore user messages in iteration** - Must append to `session.history`
- ❌ **Don't skip `lastResult` update** - Needed for metadata and tracking
- ❌ **Don't use top-level imports for SDK types** - Use `typeof import()` pattern
- ❌ **Don't assume session exists** - Always check `getSession()` result
- ❌ **Don't create sessions unconditionally** - Only create when `sessionId` provided
- ❌ **Don't abandon AsyncGenerators** - Always consume full generator or close explicitly
- ❌ **Don't modify session history order** - Messages must remain in chronological order
- ❌ **Don't append non-user messages to history** - Only `type === 'user'` messages
- ❌ **Don't break backward compatibility** - Existing no-session behavior must work unchanged

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Validation**:
- Comprehensive research on SDK continue option and streamInput() patterns
- Existing session storage implementation (P2.M2.T1.S1) provides foundation
- Clear contract definition in work item description
- External best practices research provides production-ready patterns
- All codebase patterns analyzed and documented

**Risk Factors**:
- **Medium**: SDK's streamInput() API is nuanced and requires precise AsyncGenerator usage
- **Low**: Session state management already implemented and tested
- **Low**: Backward compatibility risk is low (sessionId is optional)

**Mitigation**:
- Comprehensive test coverage for continuation scenarios
- Step-by-step implementation tasks with clear patterns
- External research documentation for reference
- Existing test patterns to follow

---

## Appendix: Quick Reference Commands

```bash
# Development workflow
npm run build              # Build project
npm run test              # Run all tests
npm test -- anthropic-provider.test.ts  # Specific test file

# Type checking
npx tsc --noEmit          # Check types without emit
npx tsc --noEmit src/providers/anthropic-provider.ts  # Specific file

# Validation
npm test -- anthropic-provider-sessions.test.ts  # Session tests
node -e "<test-script>"   # Manual validation
```
