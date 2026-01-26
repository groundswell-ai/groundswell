# LLM SDK Session Management Best Practices Research

**Research Date:** January 25, 2026
**Focus:** External best practices for session continuation in LLM SDKs, AsyncGenerator streaming patterns, and conversation state management
**Purpose:** Comprehensive guide for implementing robust session management in LLM provider abstractions

---

## Executive Summary

This document consolidates external best practices for session management in LLM SDKs, with special focus on streaming patterns using AsyncGenerator, conversation history management, and common pitfalls to avoid when managing conversation state.

**Key Findings:**
1. **Stateless SDK Pattern**: Most LLM SDKs (Anthropic, OpenAI) are stateless by design, requiring application-side session management
2. **AsyncGenerator Streaming**: Proper handling of streaming responses is critical for memory management and session continuity
3. **Message History Appending**: Consistent patterns for adding messages to session history after each execution
4. **Memory Leak Prevention**: Critical strategies for preventing unbounded growth in session storage
5. **Thread Safety**: Considerations for concurrent session access in production environments

---

## Table of Contents

1. [External Documentation URLs](#1-external-documentation-urls)
2. [Session Continuation with AsyncGenerator Patterns](#2-session-continuation-with-asyncgenerator-patterns)
3. [Patterns for Updating Session History](#3-patterns-for-updating-session-history)
4. [Common Pitfalls to Avoid](#4-common-pitfalls-to-avoid)
5. [Implementation Best Practices](#5-implementation-best-practices)
6. [Production Considerations](#6-production-considerations)

---

## 1. External Documentation URLs

### 1.1 Official SDK Documentation

**Anthropic Agent SDK:**
- **NPM Package:** https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- **GitHub Repository:** https://github.com/anthropics/claude-agent-sdk-typescript
- **Messages API:** https://docs.anthropic.com/en/api/messages
- **Agent SDK Documentation:** https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk

**OpenAI SDK:**
- **Documentation:** https://platform.openai.com/docs/api-reference
- **Chat Completion API:** https://platform.openai.com/docs/api-reference/chat/create
- **Node.js SDK:** https://github.com/openai/openai-node

**Vercel AI SDK:**
- **Core Concepts:** https://sdk.vercel.ai/docs/ai-sdk-core/concepts
- **useChat Hook:** https://sdk.vercel.ai/docs/ai-sdk-core/reference/use-chat
- **Stream Processing:** https://sdk.vercel.ai/docs/ai-sdk-core/reference/stream-text

**LangChain:**
- **Memory Concepts:** https://js.langchain.com/docs/concepts/#memory
- **Memory Base Implementation:** https://github.com/langchain-ai/langchainjs/blob/main/langchain/src/memory/memory_base.ts
- **Conversation Buffer Memory:** https://js.langchain.com/docs/modules/memory/

### 1.2 TypeScript/JavaScript Resources

**AsyncGenerator Pattern:**
- **MDN AsyncGenerator:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator
- **AsyncIterator Protocol:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols
- **TypeScript AsyncIterable:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-6.html#asynchronousiterable

**Session Management Libraries:**
- **express-session:** https://github.com/expressjs/session (Express session middleware)
- **connect-redis:** https://github.com/tj/connect-redis (Redis session store)
- **node-cache:** https://github.com/node-cache/node-cache (Simple in-memory cache)
- **lru-cache:** https://github.com/isaacs/node-lru-cache (LRU cache implementation)

**Best Practice Articles:**
- **OWASP Session Management:** https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **Node.js Memory Leaks:** https://nodejs.org/en/docs/guides/simple-profiling/
- **V8 Garbage Collection:** https://v8.dev/blog/trash-talk

---

## 2. Session Continuation with AsyncGenerator Patterns

### 2.1 Understanding AsyncGenerator in LLM Context

AsyncGenerator is the standard pattern for streaming LLM responses. It provides an async iterator that yields chunks of the response as they're generated.

**Basic Pattern:**
```typescript
async function* streamLLMResponse(
  client: LLMClient,
  prompt: string
): AsyncGenerator<string, void, unknown> {
  const response = await client.stream(prompt);

  for await (const chunk of response) {
    yield chunk.content;
  }
}
```

### 2.2 Session Continuation Pattern

**Key Principle:** Stateless SDKs require explicit message history to be sent with each continuation request.

**Anthropic SDK Pattern:**
```typescript
interface SessionState {
  sessionId: string;
  history: SDKUserMessage[];
  lastResult?: SDKResultMessage;
}

async function continueSession(
  client: AnthropicClient,
  session: SessionState,
  newPrompt: string
): Promise<AsyncGenerator<SDKMessage>> {
  // Create query with continue flag
  const query = client.createQuery({
    prompt: '',  // Empty for continuation
    options: { continue: true }
  });

  // CRITICAL: Stream history via streamInput()
  await query.streamInput(
    async function* historyStream() {
      for (const msg of session.history) {
        yield msg;
      }
    }()
  );

  // Stream new user message
  await query.streamInput(
    async function* newMessageStream() {
      yield {
        type: 'user',
        message: { content: newPrompt },
        parent_tool_use_id: null,
        session_id: session.sessionId
      };
    }()
  );

  return query;
}
```

**OpenAI SDK Pattern:**
```typescript
async function continueSessionOpenAI(
  client: OpenAIClient,
  messages: ChatMessage[],
  newMessage: string
): AsyncStream {
  return await client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      ...messages,  // Full history
      { role: 'user', content: newMessage }
    ],
    stream: true
  });
}
```

### 2.3 Best Practices for AsyncGenerator Streaming

**1. Always Consume the Full Generator:**
```typescript
// GOOD: Consume entire generator
async function processResponse(generator: AsyncGenerator<Message>) {
  const messages: Message[] = [];

  try {
    for await (const msg of generator) {
      messages.push(msg);
    }
  } finally {
    // Ensure cleanup even if iteration fails
    await generator.return?.();
  }

  return messages;
}

// BAD: Abandoning generator mid-stream
async function badPattern(generator: AsyncGenerator<Message>) {
  const first = await generator.next();
  return first.value;
  // Generator not fully consumed - potential resource leak!
}
```

**2. Handle Backpressure:**
```typescript
class BoundedQueue<T> {
  private queue: T[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  async push(item: T): Promise<void> {
    while (this.queue.length >= this.maxSize) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.queue.push(item);
  }

  async *consume(): AsyncGenerator<T> {
    while (this.queue.length > 0) {
      yield this.queue.shift()!;
    }
  }
}
```

**3. Timeout Protection:**
```typescript
async function withTimeout<T>(
  generator: AsyncGenerator<T>,
  timeoutMs: number
): Promise<T[]> {
  const results: T[] = [];
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );

  try {
    for await (const item of Promise.race([
      generator,
      timeoutPromise
    ])) {
      results.push(item);
    }
  } catch (error) {
    await generator.return?.();
    throw error;
  }

  return results;
}
```

### 2.4 Error Recovery Patterns

**Retry Logic with Session Preservation:**
```typescript
async function resilientExecute(
  client: LLMClient,
  session: SessionState,
  prompt: string,
  maxRetries = 3
): Promise<LLMResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await continueSession(client, session, prompt);

      // Collect messages for session history
      const newMessages: SDKUserMessage[] = [];
      let result: SDKResultMessage | null = null;

      for await (const msg of response) {
        if (msg.type === 'user') {
          newMessages.push(msg);
        }
        if (msg.type === 'result') {
          result = msg;
        }
      }

      // Update session history
      session.history.push(...newMessages);
      session.lastResult = result;

      return result!;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

---

## 3. Patterns for Updating Session History

### 3.1 Message Collection Pattern

**Pattern 1: Collect During Iteration**
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

**Pattern 2: Post-Processing**
```typescript
async function executeAndUpdateSession(
  client: LLMClient,
  session: SessionState,
  prompt: string
): Promise<SDKResultMessage> {
  // Execute query
  const query = await client.createQuery({
    prompt,
    options: { continue: session.history.length > 0 }
  });

  // Collect all messages
  const allMessages: SDKMessage[] = [];
  for await (const msg of query) {
    allMessages.push(msg);
  }

  // Filter and update session
  const userMessages = allMessages.filter(
    (msg): msg is SDKUserMessage => msg.type === 'user'
  );
  const resultMessage = allMessages.find(
    (msg): msg is SDKResultMessage => msg.type === 'result'
  );

  if (!resultMessage) {
    throw new Error('No result message');
  }

  // Update session state
  session.history.push(...userMessages);
  session.lastResult = resultMessage;

  return resultMessage;
}
```

### 3.2 Message Type Handling

**User Messages:**
```typescript
interface SDKUserMessage {
  type: 'user';
  message: APIUserMessage;
  parent_tool_use_id: string | null;
  isSynthetic?: boolean;
  tool_use_result?: unknown;
  uuid?: string;
  session_id: string;
}

// Always append user messages to history
function updateUserHistory(
  session: SessionState,
  message: SDKUserMessage
): void {
  session.history.push(message);
}
```

**Tool Result Messages:**
```typescript
// Tool results are synthetic user messages
function handleToolResult(
  session: SessionState,
  toolUseId: string,
  result: unknown
): void {
  const syntheticMessage: SDKUserMessage = {
    type: 'user',
    message: {
      role: 'user',
      content: []  // Tool result format
    },
    parent_tool_use_id: toolUseId,
    isSynthetic: true,
    tool_use_result: result,
    session_id: session.sessionId
  };

  session.history.push(syntheticMessage);
}
```

**Result Messages:**
```typescript
interface SDKResultMessage {
  type: 'result';
  subtype: 'success' | 'error_during_execution' | 'error_max_turns';
  result: string;
  structured_output?: unknown;
  usage: NonNullableUsage;
  total_cost_usd: number;
  num_turns: number;
  session_id: string;
}

// Update session with result metadata
function updateSessionResult(
  session: SessionState,
  result: SDKResultMessage
): void {
  session.lastResult = result;
  // Don't add result messages to history - they're terminal
}
```

### 3.3 Session Update Strategy

**Atomic Updates:**
```typescript
class SessionManager {
  private sessions: Map<string, SessionState>;
  private lock: AsyncMutex;

  async updateSession(
    sessionId: string,
    updates: Partial<SessionState>
  ): Promise<void> {
    await this.lock.runExclusive(async () => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Atomic update
      Object.assign(session, updates, {
        updatedAt: new Date()
      });
    });
  }

  async appendMessages(
    sessionId: string,
    messages: SDKUserMessage[]
  ): Promise<void> {
    await this.lock.runExclusive(async () => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Append all messages atomically
      session.history.push(...messages);
      session.updatedAt = new Date();
    });
  }
}
```

**Transaction Pattern:**
```typescript
class SessionTransaction {
  private session: SessionState;
  private pendingHistory: SDKUserMessage[] = [];

  constructor(session: SessionState) {
    this.session = session;
  }

  addMessage(message: SDKUserMessage): void {
    this.pendingHistory.push(message);
  }

  commit(): void {
    this.session.history.push(...this.pendingHistory);
    this.session.updatedAt = new Date();
    this.pendingHistory = [];
  }

  rollback(): void {
    this.pendingHistory = [];
  }
}
```

### 3.4 History Pruning Strategy

**Window-Based Pruning:**
```typescript
interface SessionState {
  sessionId: string;
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

**Token-Based Pruning:**
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

**Summary-Based Pruning:**
```typescript
async function summarizeOldMessages(
  session: SessionState,
  llmClient: LLMClient
): Promise<void> {
  if (session.history.length <= 10) {
    return;  // Not enough messages to summarize
  }

  // Split into old and recent messages
  const oldMessages = session.history.slice(0, -5);
  const recentMessages = session.history.slice(-5);

  // Generate summary
  const summaryPrompt = `
    Summarize the following conversation history:
    ${JSON.stringify(oldMessages)}

    Provide a concise summary that captures the key context.
  `;

  const summary = await llmClient.generate(summaryPrompt);

  // Create synthetic summary message
  const summaryMessage: SDKUserMessage = {
    type: 'user',
    message: {
      role: 'user',
      content: `[SUMMARY] ${summary}`
    },
    parent_tool_use_id: null,
    isSynthetic: true,
    session_id: session.sessionId
  };

  // Replace old messages with summary
  session.history = [summaryMessage, ...recentMessages];
}
```

---

## 4. Common Pitfalls to Avoid

### 4.1 AsyncGenerator Pitfalls

**Pitfall 1: Not Awaiting streamInput()**
```typescript
// BAD: Forgetting to await streamInput()
const query = client.createQuery({ options: { continue: true } });
query.streamInput(historyStream);  // Missing await!

// GOOD: Always await streamInput()
const query = client.createQuery({ options: { continue: true } });
await query.streamInput(historyStream);
```

**Pitfall 2: Abandoning Generators**
```typescript
// BAD: Not consuming the entire generator
const response = client.streamCompletion();
const firstChunk = await response.next();
// Generator abandoned - potential resource leak

// GOOD: Always consume fully or explicitly close
const response = client.streamCompletion();
try {
  for await (const chunk of response) {
    // Process chunk
  }
} finally {
  await response.return?.();
}
```

**Pitfall 3: Mixing Async/Await with For-Await**
```typescript
// BAD: Incorrect pattern
for await (const msg of await query) {  // Don't await the generator!
  // Process
}

// GOOD: Correct pattern
for await (const msg of query) {  // Query returns generator directly
  // Process
}
```

### 4.2 Session State Pitfalls

**Pitfall 1: Race Conditions**
```typescript
// BAD: Concurrent updates without locking
async function updateSession1(session: SessionState) {
  session.history.push(message1);
}
async function updateSession2(session: SessionState) {
  session.history.push(message2);
}
// If run concurrently, messages may be lost

// GOOD: Use mutex for concurrent access
class ThreadSafeSession {
  private lock = new Mutex();

  async addMessage(message: SDKUserMessage): Promise<void> {
    await this.lock.runExclusive(() => {
      this.session.history.push(message);
    });
  }
}
```

**Pitfall 2: Memory Leaks from Unbounded History**
```typescript
// BAD: Never pruning history
session.history.push(...newMessages);  // Grows indefinitely

// GOOD: Implement max history size
if (session.history.length > MAX_HISTORY) {
  session.history = session.history.slice(-MAX_HISTORY);
}
```

**Pitfall 3: Losing Message Order**
```typescript
// BAD: Messages may arrive out of order
Promise.all([
  appendMessage(session, msg1),
  appendMessage(session, msg2)
]);

// GOOD: Preserve order with sequential execution
await appendMessage(session, msg1);
await appendMessage(session, msg2);
```

### 4.3 Error Handling Pitfalls

**Pitfall 1: Swallowing Errors**
```typescript
// BAD: Not propagating errors
try {
  for await (const msg of query) {
    session.history.push(msg);
  }
} catch (error) {
  console.error(error);
  // Session state may be inconsistent
}

// GOOD: Proper error recovery
try {
  for await (const msg of query) {
    session.history.push(msg);
  }
} catch (error) {
  // Rollback partial updates
  session.history = previousHistory;
  throw error;
}
```

**Pitfall 2: Not Validating Message Types**
```typescript
// BAD: Assuming all messages are valid
session.history.push(message as SDKUserMessage);

// GOOD: Validate before adding
if (message.type === 'user') {
  session.history.push(message as SDKUserMessage);
}
```

### 4.4 SDK-Specific Pitfalls

**Anthropic SDK:**
```typescript
// PITFALL: Setting continue: true without streaming history
const query = sdk.query({
  prompt: newPrompt,
  options: { continue: true }
  // Missing streamInput() call!
});

// CORRECT: Always stream history when using continue: true
const query = sdk.query({
  prompt: '',
  options: { continue: true }
});
await query.streamInput(historyGenerator);
await query.streamInput(newMessageGenerator);
```

**OpenAI SDK:**
```typescript
// PITFALL: Not including full message history
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: newPrompt }  // Missing history!
  ]
});

// CORRECT: Include full conversation history
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    ...history,  // Full history
    { role: 'user', content: newPrompt }
  ]
});
```

---

## 5. Implementation Best Practices

### 5.1 Session Lifecycle Management

**Interface Definition:**
```typescript
interface SessionManager {
  create(sessionId: string): SessionState;
  get(sessionId: string): SessionState | undefined;
  update(sessionId: string, updates: Partial<SessionState>): void;
  delete(sessionId: string): void;
  list(): SessionState[];
  prune(sessionId: string, maxSize: number): void;
}

interface SessionState {
  sessionId: string;
  history: SDKUserMessage[];
  lastResult?: SDKResultMessage;
  metadata: SessionMetadata;
}

interface SessionMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastAccessed: Date;
  turnCount: number;
  totalCostUsd: number;
}
```

**Implementation:**
```typescript
class MapSessionManager implements SessionManager {
  private sessions: Map<string, SessionState> = new Map();

  create(sessionId: string): SessionState {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    const session: SessionState = {
      sessionId,
      history: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessed: new Date(),
        turnCount: 0,
        totalCostUsd: 0
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  get(sessionId: string): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata.lastAccessed = new Date();
    }
    return session;
  }

  update(sessionId: string, updates: Partial<SessionState>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    Object.assign(session, updates, {
      metadata: {
        ...session.metadata,
        updatedAt: new Date()
      }
    });
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  list(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  prune(sessionId: string, maxSize: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.history.length > maxSize) {
      session.history = session.history.slice(-maxSize);
      session.metadata.updatedAt = new Date();
    }
  }
}
```

### 5.2 LRU Cache Implementation

```typescript
class LRUSessionManager implements SessionManager {
  private cache: LRUCache<string, SessionState>;
  private maxSessions: number;

  constructor(maxSessions: number = 1000) {
    this.maxSessions = maxSessions;
    this.cache = new LRUCache(maxSessions);
  }

  create(sessionId: string): SessionState {
    const session: SessionState = {
      sessionId,
      history: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessed: new Date(),
        turnCount: 0,
        totalCostUsd: 0
      }
    };

    this.cache.set(sessionId, session);
    return session;
  }

  get(sessionId: string): SessionState | undefined {
    const session = this.cache.get(sessionId);
    if (session) {
      session.metadata.lastAccessed = new Date();
    }
    return session;
  }

  update(sessionId: string, updates: Partial<SessionState>): void {
    const session = this.cache.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    Object.assign(session, updates, {
      metadata: {
        ...session.metadata,
        updatedAt: new Date()
      }
    });

    // Re-insert to update LRU order
    this.cache.set(sessionId, session);
  }

  delete(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  list(): SessionState[] {
    return Array.from(this.cache.values());
  }

  prune(sessionId: string, maxSize: number): void {
    const session = this.cache.get(sessionId);
    if (!session) {
      return;
    }

    if (session.history.length > maxSize) {
      session.history = session.history.slice(-maxSize);
      session.metadata.updatedAt = new Date();
      this.cache.set(sessionId, session);
    }
  }
}
```

### 5.3 TTL-Based Session Expiration

```typescript
interface TTLSessionState extends SessionState {
  expiresAt: Date;
}

class TTLSessionManager implements SessionManager {
  private sessions: Map<string, TTLSessionState> = new Map();
  private ttl: number;  // Time to live in milliseconds
  private cleanupInterval: NodeJS.Timeout;

  constructor(ttl: number = 3600000, cleanupIntervalMs: number = 300000) {
    this.ttl = ttl;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  create(sessionId: string): SessionState {
    const now = new Date();
    const session: TTLSessionState = {
      sessionId,
      history: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        lastAccessed: now,
        turnCount: 0,
        totalCostUsd: 0
      },
      expiresAt: new Date(now.getTime() + this.ttl)
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  get(sessionId: string): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.delete(sessionId);
      return undefined;
    }

    // Update access time and extend TTL
    session.metadata.lastAccessed = new Date();
    session.expiresAt = new Date(Date.now() + this.ttl);

    return session;
  }

  update(sessionId: string, updates: Partial<SessionState>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    Object.assign(session, updates, {
      metadata: {
        ...session.metadata,
        updatedAt: new Date()
      },
      expiresAt: new Date(Date.now() + this.ttl)
    });
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  list(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  prune(sessionId: string, maxSize: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.history.length > maxSize) {
      session.history = session.history.slice(-maxSize);
      session.metadata.updatedAt = new Date();
    }
  }

  private cleanup(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.delete(sessionId);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }
}
```

### 5.4 Thread-Safe Session Manager

```typescript
import { Mutex } from 'async-mutex';

class ThreadSafeSessionManager implements SessionManager {
  private sessions: Map<string, SessionState> = new Map();
  private mutex: Mutex = new Mutex();

  async create(sessionId: string): Promise<SessionState> {
    return await this.mutex.runExclusive(() => {
      if (this.sessions.has(sessionId)) {
        throw new Error(`Session ${sessionId} already exists`);
      }

      const session: SessionState = {
        sessionId,
        history: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessed: new Date(),
          turnCount: 0,
          totalCostUsd: 0
        }
      };

      this.sessions.set(sessionId, session);
      return session;
    });
  }

  async get(sessionId: string): Promise<SessionState | undefined> {
    return await this.mutex.runExclusive(() => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.metadata.lastAccessed = new Date();
      }
      return session;
    });
  }

  async update(sessionId: string, updates: Partial<SessionState>): Promise<void> {
    await this.mutex.runExclusive(() => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      Object.assign(session, updates, {
        metadata: {
          ...session.metadata,
          updatedAt: new Date()
        }
      });
    });
  }

  async appendMessages(
    sessionId: string,
    messages: SDKUserMessage[]
  ): Promise<void> {
    await this.mutex.runExclusive(() => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      session.history.push(...messages);
      session.metadata.updatedAt = new Date();
      session.metadata.turnCount += messages.length;
    });
  }

  async delete(sessionId: string): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.sessions.delete(sessionId);
    });
  }

  async list(): Promise<SessionState[]> {
    return await this.mutex.runExclusive(() => {
      return Array.from(this.sessions.values());
    });
  }

  async prune(sessionId: string, maxSize: number): Promise<void> {
    await this.mutex.runExclusive(() => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return;
      }

      if (session.history.length > maxSize) {
        session.history = session.history.slice(-maxSize);
        session.metadata.updatedAt = new Date();
      }
    });
  }
}
```

---

## 6. Production Considerations

### 6.1 Distributed Session Storage

**Redis-Backed Sessions:**
```typescript
import { createClient } from 'redis';

class RedisSessionManager implements SessionManager {
  private client: ReturnType<typeof createClient>;
  private ttl: number;

  constructor(redisUrl: string, ttl: number = 3600000) {
    this.client = createClient({ url: redisUrl });
    this.ttl = ttl;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async create(sessionId: string): Promise<SessionState> {
    const session: SessionState = {
      sessionId,
      history: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessed: new Date(),
        turnCount: 0,
        totalCostUsd: 0
      }
    };

    await this.client.setEx(
      `session:${sessionId}`,
      this.ttl / 1000,
      JSON.stringify(session)
    );

    return session;
  }

  async get(sessionId: string): Promise<SessionState | undefined> {
    const data = await this.client.get(`session:${sessionId}`);
    if (!data) {
      return undefined;
    }

    const session = JSON.parse(data) as SessionState;

    // Update access time
    session.metadata.lastAccessed = new Date();
    await this.client.setEx(
      `session:${sessionId}`,
      this.ttl / 1000,
      JSON.stringify(session)
    );

    return session;
  }

  async update(sessionId: string, updates: Partial<SessionState>): Promise<void> {
    const current = await this.get(sessionId);
    if (!current) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated = {
      ...current,
      ...updates,
      metadata: {
        ...current.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    await this.client.setEx(
      `session:${sessionId}`,
      this.ttl / 1000,
      JSON.stringify(updated)
    );
  }

  async delete(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  async list(): Promise<SessionState[]> {
    const keys = await this.client.keys('session:*');
    const sessions: SessionState[] = [];

    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        sessions.push(JSON.parse(data));
      }
    }

    return sessions;
  }

  async prune(sessionId: string, maxSize: number): Promise<void> {
    const current = await this.get(sessionId);
    if (!current) {
      return;
    }

    if (current.history.length > maxSize) {
      current.history = current.history.slice(-maxSize);
      await this.update(sessionId, current);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}
```

### 6.2 Session Persistence

**Database-Backed Sessions:**
```typescript
import { Pool } from 'pg';

interface SessionRow {
  session_id: string;
  history: JSON;
  last_result: JSON;
  metadata: JSON;
  created_at: Date;
  updated_at: Date;
}

class DatabaseSessionManager implements SessionManager {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async create(sessionId: string): Promise<SessionState> {
    const session: SessionState = {
      sessionId,
      history: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessed: new Date(),
        turnCount: 0,
        totalCostUsd: 0
      }
    };

    await this.pool.query(
      `INSERT INTO sessions (session_id, history, last_result, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        JSON.stringify(session.history),
        null,
        JSON.stringify(session.metadata),
        session.metadata.createdAt,
        session.metadata.updatedAt
      ]
    );

    return session;
  }

  async get(sessionId: string): Promise<SessionState | undefined> {
    const result = await this.pool.query<SessionRow>(
      'SELECT * FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      sessionId: row.session_id,
      history: row.history as unknown as SDKUserMessage[],
      lastResult: row.last_result as unknown as SDKResultMessage,
      metadata: row.metadata as unknown as SessionMetadata
    };
  }

  async update(sessionId: string, updates: Partial<SessionState>): Promise<void> {
    const current = await this.get(sessionId);
    if (!current) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated = {
      ...current,
      ...updates,
      metadata: {
        ...current.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    await this.pool.query(
      `UPDATE sessions
       SET history = $1, last_result = $2, metadata = $3, updated_at = $4
       WHERE session_id = $5`,
      [
        JSON.stringify(updated.history),
        JSON.stringify(updated.lastResult),
        JSON.stringify(updated.metadata),
        updated.metadata.updatedAt,
        sessionId
      ]
    );
  }

  async delete(sessionId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM sessions WHERE session_id = $1',
      [sessionId]
    );
  }

  async list(): Promise<SessionState[]> {
    const result = await this.pool.query<SessionRow>(
      'SELECT * FROM sessions ORDER BY updated_at DESC'
    );

    return result.rows.map(row => ({
      sessionId: row.session_id,
      history: row.history as unknown as SDKUserMessage[],
      lastResult: row.last_result as unknown as SDKResultMessage,
      metadata: row.metadata as unknown as SessionMetadata
    }));
  }

  async prune(sessionId: string, maxSize: number): Promise<void> {
    const current = await this.get(sessionId);
    if (!current) {
      return;
    }

    if (current.history.length > maxSize) {
      current.history = current.history.slice(-maxSize);
      await this.update(sessionId, current);
    }
  }
}
```

### 6.3 Monitoring and Observability

**Session Metrics:**
```typescript
interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  averageHistoryLength: number;
  averageTurnCount: number;
  totalCostUsd: number;
}

class SessionMonitor {
  constructor(private manager: SessionManager) {}

  async getMetrics(): Promise<SessionMetrics> {
    const sessions = this.manager.list();
    const now = new Date();

    const activeSessions = sessions.filter(s => {
      const lastAccess = s.metadata.lastAccessed;
      const inactiveTime = now.getTime() - lastAccess.getTime();
      return inactiveTime < 3600000;  // Active within last hour
    });

    const totalHistoryLength = sessions.reduce(
      (sum, s) => sum + s.history.length,
      0
    );

    const totalTurns = sessions.reduce(
      (sum, s) => sum + s.metadata.turnCount,
      0
    );

    const totalCost = sessions.reduce(
      (sum, s) => sum + s.metadata.totalCostUsd,
      0
    );

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      expiredSessions: sessions.length - activeSessions.length,
      averageHistoryLength: sessions.length > 0
        ? totalHistoryLength / sessions.length
        : 0,
      averageTurnCount: sessions.length > 0
        ? totalTurns / sessions.length
        : 0,
      totalCostUsd: totalCost
    };
  }

  async logMetrics(): Promise<void> {
    const metrics = await this.getMetrics();
    console.log('[Session Metrics]', JSON.stringify(metrics, null, 2));
  }
}
```

### 6.4 Health Checks

```typescript
class SessionHealthChecker {
  constructor(private manager: SessionManager) {}

  async checkHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: SessionMetrics;
  }> {
    const issues: string[] = [];
    const sessions = this.manager.list();

    // Check for sessions with excessive history
    for (const session of sessions) {
      if (session.history.length > 1000) {
        issues.push(
          `Session ${session.sessionId} has excessive history: ${session.history.length}`
        );
      }
    }

    // Check for orphaned sessions
    const now = new Date();
    for (const session of sessions) {
      const lastAccess = session.metadata.lastAccessed;
      const inactiveTime = now.getTime() - lastAccess.getTime();
      if (inactiveTime > 86400000) {  // 24 hours
        issues.push(
          `Session ${session.sessionId} is inactive: ${Math.round(inactiveTime / 3600000)}h`
        );
      }
    }

    // Check for high cost sessions
    for (const session of sessions) {
      if (session.metadata.totalCostUsd > 10) {
        issues.push(
          `Session ${session.sessionId} has high cost: $${session.metadata.totalCostUsd.toFixed(2)}`
        );
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => {
          const inactiveTime = now.getTime() - s.metadata.lastAccessed.getTime();
          return inactiveTime < 3600000;
        }).length,
        expiredSessions: 0,
        averageHistoryLength: sessions.reduce((sum, s) => sum + s.history.length, 0) / sessions.length || 0,
        averageTurnCount: sessions.reduce((sum, s) => sum + s.metadata.turnCount, 0) / sessions.length || 0,
        totalCostUsd: sessions.reduce((sum, s) => sum + s.metadata.totalCostUsd, 0)
      }
    };
  }
}
```

---

## 7. Key Takeaways

### 7.1 Session Management

1. **Stateless SDK Pattern**: Most LLM SDKs are stateless - implement application-side session management
2. **Continue Flag**: Use `continue: true` (Anthropic) or full message history (OpenAI) for session continuation
3. **streamInput() Critical**: For Anthropic SDK, always call `streamInput()` with history when using `continue: true`
4. **Message Type Safety**: Validate message types before appending to session history

### 7.2 AsyncGenerator Best Practices

1. **Always Consume Fully**: Never abandon an AsyncGenerator mid-iteration - consume fully or explicitly close
2. **Error Handling**: Wrap iteration in try/finally and call `generator.return?()` for cleanup
3. **Timeout Protection**: Implement timeout wrappers for long-running generators
4. **Backpressure Management**: Use bounded queues to prevent memory issues

### 7.3 Memory Management

1. **LRU Eviction**: Implement LRU cache for in-memory session storage
2. **TTL Expiration**: Use time-based expiration with periodic cleanup
3. **History Pruning**: Implement window-based or token-based pruning for conversation history
4. **WeakMap for Metadata**: Use WeakMap for metadata that should be garbage collected

### 7.4 Production Readiness

1. **Distributed Storage**: Use Redis or database-backed storage for production
2. **Thread Safety**: Implement mutex-based locking for concurrent access
3. **Monitoring**: Track session metrics (count, history length, cost)
4. **Health Checks**: Implement periodic health checks for orphaned or expensive sessions

### 7.5 Common Pitfalls to Avoid

1. **Not Awaiting streamInput()**: Always await `streamInput()` calls
2. **Abandoning Generators**: Consume entire generator or explicitly close
3. **Race Conditions**: Use mutex for concurrent session access
4. **Memory Leaks**: Implement max history size and TTL expiration
5. **Message Order**: Preserve message order when appending to history
6. **Error Recovery**: Implement proper rollback on partial updates

---

## 8. References

### 8.1 Groundswell Codebase Research

- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/session-management-best-practices.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/anthropic-sdk-session-patterns.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/codebase-session-patterns.md`
- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-sessions.test.ts`

### 8.2 External Documentation

See Section 1 for complete list of external documentation URLs.

---

**Document Status:** ✅ COMPLETE
**Research Date:** January 25, 2026
**Version:** 1.0.0
**Maintainer:** Groundswell Development Team

---

**End of Document**
