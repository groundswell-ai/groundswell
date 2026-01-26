# Anthropic Agent SDK Session and Message Continuation Patterns Research

**Research Date:** January 25, 2026
**SDK Version:** 0.1.77
**Package:** @anthropic-ai/claude-agent-sdk
**Purpose:** Research session storage implementation for AnthropicProvider

---

## Executive Summary

The Anthropic Agent SDK provides **stateless** session management with explicit continuation mechanisms. Unlike native session providers (like OpenCode), the SDK requires application-side session storage and explicit message history passing via `continue: true` and `streamInput()` patterns.

**Key Findings:**
1. **No Native Sessions**: SDK is stateless by design with auto-cleanup
2. **Continue Flag**: `options.continue: true` enables session resumption
3. **streamInput() Method**: Primary mechanism for multi-turn conversations
4. **Message Types**: Well-defined `SDKUserMessage` and `SDKResultMessage` structures
5. **Session Hooks**: `SessionStart` hook with `source: 'resume'` indicates continuation
6. **V2 API Unstable**: `unstable_v2_createSession()` exists but is marked unstable

---

## Table of Contents

1. [SDK Message Type Structures](#1-sdk-message-type-structures)
2. [The `continue: true` Pattern](#2-the-continue-true-pattern)
3. [Message History Management](#3-message-history-management)
4. [Session Continuation Mechanisms](#4-session-continuation-mechanisms)
5. [Code Examples](#5-code-examples)
6. [Implementation Strategy for AnthropicProvider](#6-implementation-strategy-for-anthropicprovider)
7. [Documentation Links](#7-documentation-links)

---

## 1. SDK Message Type Structures

### 1.1 SDKUserMessage

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts` (lines 396-417)

```typescript
type SDKUserMessageContent = {
    type: 'user';
    message: APIUserMessage;          // The actual message content
    parent_tool_use_id: string | null; // For tool result responses
    isSynthetic?: boolean;             // System-generated vs user input
    tool_use_result?: unknown;         // Tool result if responding to tool
};

export type SDKUserMessage = SDKUserMessageContent & {
    uuid?: UUID;           // Unique message identifier
    session_id: string;    // Session this message belongs to
};
```

**Key Characteristics:**
- Every user message has a `session_id` for tracking
- `parent_tool_use_id` links tool results to tool uses
- `isSynthetic` distinguishes user messages from system-generated ones
- `tool_use_result` contains formatted tool output for display

### 1.2 SDKResultMessage

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts` (lines 441-474)

```typescript
// Success result message
export type SDKResultMessage = {
    type: 'result';
    subtype: 'success';
    duration_ms: number;
    duration_api_ms: number;
    is_error: boolean;
    num_turns: number;              // Number of conversation turns
    result: string;                 // Final text result
    total_cost_usd: number;
    usage: NonNullableUsage;        // Token usage details
    modelUsage: {
        [modelName: string]: ModelUsage;
    };
    permission_denials: SDKPermissionDenial[];
    structured_output?: unknown;    // JSON schema output
    uuid: UUID;
    session_id: string;
} | {
    // Error result message
    type: 'result';
    subtype: 'error_during_execution' | 'error_max_turns' |
             'error_max_budget_usd' | 'error_max_structured_output_retries';
    duration_ms: number;
    duration_api_ms: number;
    is_error: boolean;
    num_turns: number;
    total_cost_usd: number;
    usage: NonNullableUsage;
    modelUsage: { [modelName: string]: ModelUsage };
    permission_denials: SDKPermissionDenial[];
    errors: string[];
    uuid: UUID;
    session_id: string;
};
```

**Key Characteristics:**
- Dual type: success or error subtypes
- `num_turns` tracks conversation depth
- `structured_output` for JSON schema responses
- Always includes `session_id` for tracking
- Token usage broken down by model

### 1.3 SDKMessage Union Type

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts` (line 553)

```typescript
export type SDKMessage =
    | SDKAssistantMessage      // Assistant responses with tool uses
    | SDKUserMessage           // User messages
    | SDKUserMessageReplay     // Replay acknowledgments
    | SDKResultMessage         // Final results (success or error)
    | SDKSystemMessage         // System initialization messages
    | SDKPartialAssistantMessage  // Streaming partial responses
    | SDKCompactBoundaryMessage  // Compaction boundaries
    | SDKStatusMessage         // Status updates
    | SDKHookResponseMessage   // Hook responses
    | SDKToolProgressMessage   // Tool execution progress
    | SDKAuthStatusMessage;    // Authentication status
```

---

## 2. The `continue: true` Pattern

### 2.1 Options Interface

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts` (lines 76-154)

```typescript
export type Options = {
    // ... other options

    // Session Management
    continue?: boolean;              // Resume previous session
    resume?: string;                  // Resume from specific session ID
    resumeSessionAt?: string;         // Resume from specific message
    forkSession?: boolean;            // Fork current session
    persistSession?: boolean;         // Enable session persistence
    maxTurns?: number;                // Maximum conversation turns
    maxBudgetUsd?: number;            // Maximum cost in USD

    // ... other options
};
```

### 2.2 How `continue: true` Works

**Purpose:** Signal to the SDK that this query should continue from a previous session state.

**Behavior:**
1. SDK expects `streamInput()` to be called with message history
2. `SessionStart` hook fires with `source: 'resume'`
3. Conversation context maintained across `streamInput()` calls
4. Session persistence enabled via `persistSession: true`

**Critical Note:** `continue: true` ALONE does not restore history. You must also call `query.streamInput()` with the previous messages.

---

## 3. Message History Management

### 3.1 streamInput() Method

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts` (lines 176-181)

```typescript
interface Query extends AsyncGenerator<SDKMessage, void> {
    /**
     * Stream input messages to the query.
     * Used internally for multi-turn conversations.
     *
     * @param stream - Async iterable of user messages to send
     */
    streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void>;
}
```

**Key Characteristics:**
- Only available during active query execution
- Accepts async iterable of `SDKUserMessage` objects
- Used for sending additional user messages during multi-turn conversations
- Primary mechanism for maintaining conversation history

### 3.2 Building Message History

**Pattern:**

```typescript
// First turn - no history
const firstQuery = query({
    prompt: "What files are in the current directory?",
    options: { model: 'claude-sonnet-4-5-20250929' }
});

// Collect messages from first turn
const messages: SDKUserMessage[] = [];
for await (const msg of firstQuery) {
    if (msg.type === 'user') {
        messages.push(msg);
    }
}

// Second turn - with history
const secondQuery = query({
    prompt: "",  // Empty prompt, history via streamInput
    options: {
        model: 'claude-sonnet-4-5-20250929',
        continue: true  // Signal continuation
    }
});

// Stream the history
await secondQuery.streamInput(
    async function* () {
        for (const msg of messages) {
            yield msg;
        }
    }()
);

// Stream the new user message
await secondQuery.streamInput(
    async function* () {
        yield {
            type: 'user',
            message: { content: "Now read the README.md file" },
            parent_tool_use_id: null,
            session_id: secondQuerySessionId
        };
    }()
);
```

### 3.3 SessionState Structure

**Recommended implementation for AnthropicProvider:**

```typescript
interface SessionState {
    sessionId: string;
    history: SDKUserMessage[];      // All user messages in order
    lastResult: SDKResultMessage;   // Most recent result
    createdAt: Date;
    updatedAt: Date;
    turnCount: number;              // Number of conversation turns
}
```

---

## 4. Session Continuation Mechanisms

### 4.1 SessionStart Hook Sources

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts` (lines 219-222)

```typescript
export type SessionStartHookInput = BaseHookInput & {
    hook_event_name: 'SessionStart';
    source: 'startup' | 'resume' | 'clear' | 'compact';
};
```

**Source Values:**
- `startup`: New session started
- `resume`: Session resumed from previous state (with `continue: true`)
- `clear`: Session cleared/reset
- `compact`: Session compacted (old messages removed)

### 4.2 V2 API (Unstable)

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts` (lines 184-227)

```typescript
/**
 * V2 API - UNSTABLE
 * Create a persistent session for multi-turn conversations.
 */
export interface SDKSession {
    /** Unique session identifier */
    readonly sessionId: string;

    /** Send a message to the agent */
    send(message: string | SDKUserMessage): Promise<void>;

    /** Stream messages from the agent */
    stream(): AsyncGenerator<SDKMessage, void>;

    /** Close the session */
    close(): void;

    /** Async disposal support */
    [Symbol.asyncDispose](): Promise<void>;
}

export interface SDKSessionOptions {
    model?: string;
    systemPrompt?: string;
    // ... other options
}

// Function to create session (UNSTABLE)
export declare function unstable_v2_createSession(
    options: SDKSessionOptions
): Promise<SDKSession>;
```

**⚠️ WARNING:** This API is marked UNSTABLE and should not be used in production.

### 4.3 unstable_v2_prompt() Function

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts` (lines 36-56)

```typescript
/**
 * V2 API - UNSTABLE
 * Simplified prompt interface for quick interactions.
 * Automatically manages session creation and cleanup.
 */
export declare function unstable_v2_prompt(
    message: string,
    options: SDKSessionOptions
): Promise<SDKResultMessage>;
```

---

## 5. Code Examples

### 5.1 Basic Stateless Query (No Session)

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const q = query({
    prompt: 'What files are in the current directory?',
    options: {
        model: 'claude-sonnet-4-5-20250929'
    }
});

for await (const message of q) {
    if (message.type === 'result') {
        console.log('Result:', message.result);
    }
}
// Auto-cleanup happens here
```

### 5.2 Multi-Turn Conversation with History

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Session state (in-memory)
const sessionHistory: SDKUserMessage[] = [];
let currentSessionId: string = '';

async function sendPrompt(prompt: string, isContinuation = false) {
    const q = query({
        prompt: isContinuation ? '' : prompt,
        options: {
            model: 'claude-sonnet-4-5-20250929',
            continue: isContinuation
        }
    });

    // Stream history if continuing
    if (isContinuation && sessionHistory.length > 0) {
        await q.streamInput(
            async function* () {
                for (const msg of sessionHistory) {
                    yield msg;
                }
            }()
        );
    }

    // Stream new user message if not continuation
    if (!isContinuation) {
        await q.streamInput(
            async function* () {
                yield {
                    type: 'user',
                    message: { content: prompt },
                    parent_tool_use_id: null,
                    session_id: currentSessionId
                };
            }()
        );
    }

    // Collect response
    for await (const message of q) {
        if (message.type === 'user') {
            sessionHistory.push(message);
            if (!currentSessionId) {
                currentSessionId = message.session_id;
            }
        }

        if (message.type === 'result') {
            console.log('Response:', message.result);
            return message;
        }
    }
}

// First turn
await sendPrompt('List TypeScript files');

// Second turn (continues conversation)
await sendPrompt('Now read the first one', true);
```

### 5.3 Session Abstraction Layer

```typescript
class AnthropicProvider implements Provider {
    private sessions: Map<string, SessionState> = new Map();

    private createSession(sessionId: string): SessionState {
        return {
            sessionId,
            history: [],
            lastResult: null as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            turnCount: 0
        };
    }

    private getSession(sessionId: string): SessionState | undefined {
        return this.sessions.get(sessionId);
    }

    async execute(request: ProviderRequest): Promise<AgentResponse> {
        const { sessionId, prompt } = request;

        // Get or create session
        let session: SessionState;
        if (sessionId) {
            session = this.getSession(sessionId) || this.createSession(sessionId);
            this.sessions.set(sessionId, session);
        } else {
            // Generate new session ID
            const newSessionId = crypto.randomUUID();
            session = this.createSession(newSessionId);
            this.sessions.set(newSessionId, session);
        }

        // Build query
        const isContinuation = session.history.length > 0;
        const q = this.sdk!.query({
            prompt: isContinuation ? '' : prompt,
            options: {
                ...this.sdkOptions,
                continue: isContinuation
            }
        });

        // Stream history if continuing
        if (isContinuation) {
            await q.streamInput(
                async function* () {
                    for (const msg of session.history) {
                        yield msg;
                    }
                }()
            );
        }

        // Stream new user message
        if (!isContinuation) {
            await q.streamInput(
                async function* () {
                    yield {
                        type: 'user',
                        message: { content: prompt },
                        parent_tool_use_id: null,
                        session_id: session.sessionId
                    };
                }()
            );
        }

        // Process response
        for await (const message of q) {
            if (message.type === 'user') {
                session.history.push(message);
            }

            if (message.type === 'result') {
                session.lastResult = message;
                session.turnCount++;
                session.updatedAt = new Date();

                return this.buildAgentResponse(message);
            }
        }

        throw new Error('No result message received');
    }
}
```

### 5.4 Session with Hooks

```typescript
const q = query({
    prompt: 'Analyze the codebase',
    options: {
        model: 'claude-sonnet-4-5-20250929',
        continue: false,
        hooks: {
            SessionStart: [{
                hooks: [async (input) => {
                    if (input.source === 'resume') {
                        console.log('Resuming session:', input.session_id);
                    } else if (input.source === 'startup') {
                        console.log('Starting new session:', input.session_id);
                    }
                    return { continue: true };
                }]
            }],
            SessionEnd: [{
                hooks: [async (input) => {
                    console.log('Session ended:', input.session_id, 'Reason:', input.reason);
                    return { continue: true };
                }]
            }]
        }
    }
});

for await (const message of q) {
    // Process messages
}
```

---

## 6. Implementation Strategy for AnthropicProvider

### 6.1 Session Storage Schema

```typescript
interface SessionState {
    sessionId: string;
    history: SDKUserMessage[];
    lastResult?: SDKResultMessage;
    createdAt: Date;
    updatedAt: Date;
    turnCount: number;
    totalCostUsd: number;
}

// In-memory storage (can be extended to Redis/DB)
class SessionStore {
    private sessions: Map<string, SessionState> = new Map();

    create(sessionId: string): SessionState {
        const session: SessionState = {
            sessionId,
            history: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            turnCount: 0,
            totalCostUsd: 0
        };
        this.sessions.set(sessionId, session);
        return session;
    }

    get(sessionId: string): SessionState | undefined {
        return this.sessions.get(sessionId);
    }

    update(sessionId: string, updates: Partial<SessionState>): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.assign(session, updates, { updatedAt: new Date() });
        }
    }

    delete(sessionId: string): void {
        this.sessions.delete(sessionId);
    }
}
```

### 6.2 Modified execute() Method

```typescript
async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
): Promise<AgentResponse<T>> {
    // Session resolution
    const sessionId = request.options.sessionId || crypto.randomUUID();
    let session = this.sessionStore.get(sessionId);

    if (!session) {
        session = this.sessionStore.create(sessionId);
    }

    const isContinuation = session.history.length > 0;

    // Build SDK options
    const sdkOptions = {
        model: request.options.model,
        systemPrompt: request.options.systemPrompt,
        continue: isContinuation,
        // ... other options
    };

    // Create query
    const q = this.sdk!.query({
        prompt: isContinuation ? '' : request.prompt,
        options: sdkOptions
    });

    // Stream history if continuing
    if (isContinuation) {
        await q.streamInput(
            async function* historyStream() {
                for (const msg of session.history) {
                    yield msg;
                }
            }()
        );
    }

    // Stream new user message
    if (!isContinuation) {
        await q.streamInput(
            async function* newMessageStream() {
                yield {
                    type: 'user',
                    message: { content: request.prompt },
                    parent_tool_use_id: null,
                    session_id: sessionId
                };
            }()
        );
    }

    // Process messages
    let resultMessage: SDKResultMessage | null = null;
    let toolCallCount = 0;

    for await (const message of q) {
        if (message.type === 'assistant') {
            // Count tool uses
            const content = message.message?.content;
            if (Array.isArray(content)) {
                for (const block of content) {
                    if (block.type === 'tool_use') {
                        toolCallCount++;
                    }
                }
            }
        }

        if (message.type === 'user') {
            // Add to history
            session.history.push(message);
        }

        if (message.type === 'result') {
            resultMessage = message as SDKResultMessage;
            session.lastResult = resultMessage;
            session.turnCount++;
            session.totalCostUsd += resultMessage.total_cost_usd;
            session.updatedAt = new Date();
        }
    }

    // Build response
    if (!resultMessage) {
        throw new Error('No result message received');
    }

    return this.buildAgentResponse(resultMessage, sessionId);
}
```

### 6.3 Session Management Methods

```typescript
class AnthropicProvider implements Provider {
    private sessionStore = new SessionStore();

    /**
     * Create a new session
     */
    createSession(sessionId?: string): string {
        const id = sessionId || crypto.randomUUID();
        this.sessionStore.create(id);
        return id;
    }

    /**
     * Get session information
     */
    getSession(sessionId: string): SessionState | undefined {
        return this.sessionStore.get(sessionId);
    }

    /**
     * Delete a session
     */
    deleteSession(sessionId: string): void {
        this.sessionStore.delete(sessionId);
    }

    /**
     * List all active sessions
     */
    listSessions(): SessionState[] {
        return Array.from(this.sessionStore.sessions.values());
    }
}
```

---

## 7. Documentation Links

### 7.1 Official Documentation

**Note:** Web search tools are currently experiencing rate limits. Based on local SDK analysis and package metadata:

- **NPM Package:** https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- **GitHub Repository:** https://github.com/anthropics/claude-agent-sdk-typescript
- **Anthropic Messages API:** https://docs.anthropic.com/en/api/messages
- **Agent SDK Documentation:** https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk (likely URL)

### 7.2 Local Documentation

**Installed SDK Location:**
```
/home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/
```

**Key Files:**
- `entrypoints/agentSdkTypes.d.ts` - Public API exports
- `entrypoints/sdk/coreTypes.d.ts` - Core message types (SDKUserMessage, SDKResultMessage)
- `entrypoints/sdk/runtimeTypes.d.ts` - Runtime types (Query, Options, SDKSession)
- `entrypoints/sdk/controlTypes.d.ts` - Control message types
- `package.json` - Package metadata and version

### 7.3 Groundswell Integration

**Files:**
- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` - Provider implementation
- `/home/dustin/projects/groundswell/src/core/agent.ts` - Agent wrapper around SDK
- `/home/dustin/projects/groundswell/src/core/mcp-handler.ts` - MCP server management

**Related Research:**
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/anthropic_agent_sdk_query_research.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/agent-query-pattern.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/decisions.md`

---

## 8. Key Takeaways

### 8.1 Session Management

1. **Stateless by Design**: SDK does not maintain session state automatically
2. **Application Responsibility**: Must store and manage `SDKUserMessage[]` history
3. **Continue Flag**: `continue: true` signals SDK to expect `streamInput()` with history
4. **Session Hooks**: Use `SessionStart` hook with `source: 'resume'` to detect continuation

### 8.2 Message History

1. **Type Safety**: All messages are strongly typed (`SDKUserMessage`, `SDKResultMessage`)
2. **Session Tracking**: Every message includes `session_id` for correlation
3. **Tool Results**: Tool responses sent as synthetic user messages with `tool_use_result`
4. **Ordering**: Messages must be streamed in correct order via `streamInput()`

### 8.3 Implementation Best Practices

1. **Session Store**: Use in-memory Map for development, extend to Redis/DB for production
2. **Session IDs**: Use UUID v4 for unique session identifiers
3. **Memory Management**: Implement session TTL and max history size limits
4. **Error Handling**: Check `resultMessage.subtype` for errors, handle `error_max_turns`
5. **Cost Tracking**: Accumulate `total_cost_usd` across turns for budget management

### 8.4 Gotchas to Avoid

1. **Don't Forget streamInput()**: Setting `continue: true` without streaming history will fail
2. **Don't Ignore Session IDs**: Always use the `session_id` from first user message
3. **Don't Assume Native Sessions**: SDK is stateless, must implement session storage
4. **Don't Use unstable_v2 API**: V2 session API is marked unstable, use V1 `query()` pattern
5. **Don't Lose Message Order**: History must be streamed in exact original order

---

## 9. References

### 9.1 Type Definitions

**SDKUserMessage** (coreTypes.d.ts:396-417)
```typescript
export type SDKUserMessage = {
    type: 'user';
    message: APIUserMessage;
    parent_tool_use_id: string | null;
    isSynthetic?: boolean;
    tool_use_result?: unknown;
    uuid?: UUID;
    session_id: string;
};
```

**SDKResultMessage** (coreTypes.d.ts:441-474)
```typescript
export type SDKResultMessage = {
    type: 'result';
    subtype: 'success' | 'error_during_execution' | 'error_max_turns' |
             'error_max_budget_usd' | 'error_max_structured_output_retries';
    duration_ms: number;
    num_turns: number;
    result: string;
    structured_output?: unknown;
    usage: NonNullableUsage;
    total_cost_usd: number;
    session_id: string;
    // ... other fields
};
```

**Options** (runtimeTypes.d.ts:76-154)
```typescript
export type Options = {
    continue?: boolean;
    resume?: string;
    resumeSessionAt?: string;
    persistSession?: boolean;
    maxTurns?: number;
    maxBudgetUsd?: number;
    // ... other options
};
```

**Query.streamInput()** (runtimeTypes.d.ts:176-181)
```typescript
interface Query extends AsyncGenerator<SDKMessage, void> {
    streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void>;
}
```

### 9.2 Task Context

From `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/tasks.json` (P2.M2.T1):

**P2.M2.T1.S1: Implement session storage in AnthropicProvider**
- Status: Researching
- Context: "From decisions.md Decision 2 - Session abstraction provides consistent API across providers. Anthropic SDK uses continue: true for state."

**P2.M2.T1.S2: Modify execute() to support sessions**
- Status: Planned
- Context: "From external_dependencies.md - SDK supports continue: true option to resume session. Session abstraction wraps this."

---

**Document Status:** ✅ COMPLETE
**SDK Version:** 0.1.77
**Last Updated:** January 25, 2026
**Maintainer:** Groundswell Development Team

---

**End of Document**
