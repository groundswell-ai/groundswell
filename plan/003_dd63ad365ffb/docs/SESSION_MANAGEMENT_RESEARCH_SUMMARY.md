# Session Management Research Summary

**Date:** January 25, 2026
**Purpose:** Summary of external and internal research on LLM SDK session management

---

## Research Overview

This document summarizes comprehensive research on session management in LLM SDKs, combining:

1. **External best practices** from official SDK documentation
2. **Internal codebase analysis** of Groundswell's existing patterns
3. **Anthropic Agent SDK** specific patterns and requirements
4. **Production-ready patterns** for memory management, thread safety, and monitoring

---

## Key Documents Created

### 1. Comprehensive Research Document
**Location:** `/home/dustin/projects/groundswell/research/llm-sdk-session-management-best-practices.md`

**Contents:**
- External documentation URLs for Anthropic, OpenAI, Vercel AI SDK, LangChain
- Session continuation patterns with AsyncGenerator
- Message history update strategies
- Common pitfalls and anti-patterns
- Production-ready implementations (LRU, TTL, thread-safe, distributed)
- Monitoring and health check patterns

### 2. Quick Reference Guide
**Location:** `/home/dustin/projects/groundswell/research/llm-sdk-session-quick-reference.md`

**Contents:**
- Copy-paste ready code patterns
- Common pitfalls with code examples
- Essential documentation URLs
- Key takeaways

### 3. Existing Research Documents
**Location:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/`

**Documents:**
- `session-management-best-practices.md` - LangChain, Vercel AI SDK patterns
- `anthropic-sdk-session-patterns.md` - Anthropic SDK deep dive
- `codebase-session-patterns.md` - Groundswell internal patterns

---

## External Best Practices Summary

### Session Continuation Patterns

**Anthropic SDK (Stateless Design):**
```typescript
// Key Pattern: continue flag + streamInput()
const query = sdk.query({
  prompt: '',
  options: { continue: true }
});

// CRITICAL: Must stream history
await query.streamInput(historyGenerator);
await query.streamInput(newMessageGenerator);
```

**OpenAI SDK (Full History):**
```typescript
// Key Pattern: Include full message history
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    ...history,  // Full conversation history
    { role: 'user', content: newPrompt }
  ]
});
```

**Vercel AI SDK (React Hooks):**
```typescript
// Key Pattern: Automatic state management
const { messages, input, handleSubmit } = useChat({
  api: '/api/chat',
  initialMessages: []
});
```

### AsyncGenerator Streaming Patterns

**Best Practices:**
1. **Always consume full generator** - Never abandon mid-iteration
2. **Use try/finally** - Ensure cleanup with `generator.return?()`
3. **Implement timeouts** - Wrap generators with timeout protection
4. **Handle backpressure** - Use bounded queues for memory management

**Example:**
```typescript
async function safeConsume<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  try {
    for await (const item of gen) {
      results.push(item);
    }
  } finally {
    await gen.return?.();
  }
  return results;
}
```

### Message History Management

**Collection Pattern:**
```typescript
async function collectMessages(
  query: AsyncGenerator<SDKMessage>
): Promise<{
  userMessages: SDKUserMessage[];
  resultMessage: SDKResultMessage;
}> {
  const userMessages: SDKUserMessage[] = [];
  let resultMessage: SDKResultMessage | null = null;

  for await (const message of query) {
    if (message.type === 'user') {
      userMessages.push(message);
    }
    if (message.type === 'result') {
      resultMessage = message as SDKResultMessage;
    }
  }

  return { userMessages, resultMessage };
}
```

**Update Pattern:**
```typescript
// Atomic update
session.history.push(...userMessages);
session.lastResult = resultMessage;
session.metadata.updatedAt = new Date();
```

### Memory Management Strategies

**LRU Cache:**
```typescript
class LRUSessionManager {
  private cache = new Map<string, SessionState>();

  get(sessionId: string): SessionState | undefined {
    const value = this.cache.get(sessionId);
    if (value) {
      // Re-insert to mark as recently used
      this.cache.delete(sessionId);
      this.cache.set(sessionId, value);
    }
    return value;
  }
}
```

**TTL Expiration:**
```typescript
class TTLSessionManager {
  private sessions: Map<string, { session: SessionState; expiresAt: number }>();

  get(sessionId: string): SessionState | undefined {
    const entry = this.sessions.get(sessionId);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    // Extend TTL on access
    entry.expiresAt = Date.now() + this.ttl;
    return entry.session;
  }
}
```

**History Pruning:**
```typescript
// Window-based pruning
function pruneHistory(session: SessionState, maxSize: number): void {
  if (session.history.length > maxSize) {
    session.history = session.history.slice(-maxSize);
  }
}

// Token-based pruning
function pruneByTokens(session: SessionState, maxTokens: number): void {
  let totalTokens = 0;
  const keepMessages: SDKUserMessage[] = [];

  for (let i = session.history.length - 1; i >= 0; i--) {
    const tokens = JSON.stringify(session.history[i].message).length / 4;
    if (totalTokens + tokens <= maxTokens) {
      keepMessages.unshift(session.history[i]);
      totalTokens += tokens;
    } else {
      break;
    }
  }

  session.history = keepMessages;
}
```

---

## Internal Codebase Analysis

### Existing Session Storage (AnthropicProvider)

**Current Implementation:**
```typescript
export class AnthropicProvider implements Provider {
  private sessions: Map<string, SessionState> = new Map();

  createSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        history: [],
        lastResult: null,
      });
    }
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }
}

interface SessionState {
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}
```

**Key Patterns Observed:**
1. **Idempotent operations** - `createSession()` checks before creating
2. **Map-based storage** - Efficient O(1) lookup
3. **Simple interface** - `createSession()` and `getSession()` methods
4. **Cleanup in terminate()** - `sessions.clear()` called on termination

### Codebase Patterns

**ProviderRegistry State Management:**
- Uses `Map<ProviderId, Provider>` for efficient lookup
- Idempotent initialization with promise caching
- Proper cleanup patterns in `terminateAll()`

**MCPHandler State Management:**
- Multiple Maps for different concerns
- Namespace-based key management (`serverName__toolName`)
- Clean separation of concerns

**Cache System:**
- Complex Map structure with Set values
- Synchronized cleanup across data structures
- Size-based eviction for memory management

---

## Common Pitfalls to Avoid

### 1. AsyncGenerator Pitfalls

**❌ Not Awaiting streamInput():**
```typescript
// WRONG
query.streamInput(historyStream);

// CORRECT
await query.streamInput(historyStream);
```

**❌ Abandoning Generators:**
```typescript
// WRONG
const first = await generator.next();
return first.value;

// CORRECT
try {
  for await (const item of generator) {
    // Process
  }
} finally {
  await generator.return?.();
}
```

**❌ Awaiting the Generator:**
```typescript
// WRONG
for await (const msg of await query) { }

// CORRECT
for await (const msg of query) { }
```

### 2. Session State Pitfalls

**❌ Race Conditions:**
```typescript
// WRONG - No locking
session.history.push(message1);
session.history.push(message2);

// CORRECT - Use mutex
await mutex.runExclusive(() => {
  session.history.push(message1);
  session.history.push(message2);
});
```

**❌ Memory Leaks:**
```typescript
// WRONG - Unbounded growth
session.history.push(...newMessages);

// CORRECT - Prune history
if (session.history.length > MAX_HISTORY) {
  session.history = session.history.slice(-MAX_HISTORY);
}
```

**❌ Message Order:**
```typescript
// WRONG - May lose order
Promise.all([
  appendMessage(msg1),
  appendMessage(msg2)
]);

// CORRECT - Preserve order
await appendMessage(msg1);
await appendMessage(msg2);
```

### 3. SDK-Specific Pitfalls

**Anthropic SDK:**
```typescript
// PITFALL: continue: true without streamInput()
const query = sdk.query({
  prompt: newPrompt,
  options: { continue: true }
  // Missing streamInput()!
});

// CORRECT: Always stream history
const query = sdk.query({
  prompt: '',
  options: { continue: true }
});
await query.streamInput(historyGenerator);
await query.streamInput(newMessageGenerator);
```

**OpenAI SDK:**
```typescript
// PITFALL: Missing history
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: newPrompt }  // No history!
  ]
});

// CORRECT: Include full history
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    ...history,  // Full conversation history
    { role: 'user', content: newPrompt }
  ]
});
```

---

## Production Considerations

### Distributed Session Storage

**Redis Pattern:**
```typescript
class RedisSessionManager implements SessionManager {
  private client: Redis;

  async create(sessionId: string): Promise<SessionState> {
    const session = { sessionId, history: [], metadata: {} };
    await this.client.setEx(
      `session:${sessionId}`,
      3600,  // 1 hour TTL
      JSON.stringify(session)
    );
    return session;
  }

  async get(sessionId: string): Promise<SessionState | undefined> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : undefined;
  }
}
```

### Thread Safety

**Mutex Pattern:**
```typescript
import { Mutex } from 'async-mutex';

class ThreadSafeSessionManager {
  private sessions = new Map<string, SessionState>();
  private mutex = new Mutex();

  async update(sessionId: string, updates: Partial<SessionState>): Promise<void> {
    await this.mutex.runExclusive(() => {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Not found');
      Object.assign(session, updates);
    });
  }
}
```

### Monitoring

**Metrics Collection:**
```typescript
interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  averageHistoryLength: number;
  averageTurnCount: number;
  totalCostUsd: number;
}

async function getMetrics(manager: SessionManager): Promise<SessionMetrics> {
  const sessions = manager.list();
  const now = new Date();

  const activeSessions = sessions.filter(s => {
    const inactiveTime = now.getTime() - s.metadata.lastAccessed.getTime();
    return inactiveTime < 3600000;  // Active within last hour
  });

  return {
    totalSessions: sessions.length,
    activeSessions: activeSessions.length,
    averageHistoryLength: sessions.reduce((sum, s) => sum + s.history.length, 0) / sessions.length || 0,
    averageTurnCount: sessions.reduce((sum, s) => sum + s.metadata.turnCount, 0) / sessions.length || 0,
    totalCostUsd: sessions.reduce((sum, s) => sum + s.metadata.totalCostUsd, 0)
  };
}
```

---

## Recommended Implementation Strategy

### Phase 1: Core Session Storage (✅ Complete)
- [x] Implement `Map<string, SessionState>` storage
- [x] Add `createSession()` and `getSession()` methods
- [x] Implement cleanup in `terminate()`
- [x] Update `capabilities.sessions` to `true`

### Phase 2: Execute() Integration (Next)
- [ ] Modify `execute()` to check for `sessionId` in options
- [ ] Implement session continuation with `continue: true`
- [ ] Stream history via `streamInput()` when continuing
- [ ] Update session history after each execution
- [ ] Handle session creation for new sessionIds

### Phase 3: Memory Management (Future)
- [ ] Implement LRU eviction strategy
- [ ] Add TTL-based expiration
- [ ] Implement history pruning (window or token-based)
- [ ] Add session monitoring and metrics

### Phase 4: Production Readiness (Future)
- [ ] Implement thread-safe operations with mutex
- [ ] Add Redis backing for distributed scenarios
- [ ] Implement health checks and monitoring
- [ ] Add session migration and persistence

---

## Documentation URLs

### Official SDK Documentation

**Anthropic:**
- NPM: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- GitHub: https://github.com/anthropics/claude-agent-sdk-typescript
- API: https://docs.anthropic.com/en/api/messages
- Agent SDK: https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk

**OpenAI:**
- API: https://platform.openai.com/docs/api-reference
- Chat: https://platform.openai.com/docs/api-reference/chat/create
- SDK: https://github.com/openai/openai-node

**Vercel AI SDK:**
- Concepts: https://sdk.vercel.ai/docs/ai-sdk-core/concepts
- useChat: https://sdk.vercel.ai/docs/ai-sdk-core/reference/use-chat
- Streaming: https://sdk.vercel.ai/docs/ai-sdk-core/reference/stream-text

**LangChain:**
- Memory: https://js.langchain.com/docs/concepts/#memory
- Implementation: https://github.com/langchain-ai/langchainjs/blob/main/langchain/src/memory/memory_base.ts
- Conversation: https://js.langchain.com/docs/modules/memory/

### TypeScript/JavaScript Resources

**AsyncGenerator:**
- MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator
- AsyncIterator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols
- TypeScript: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-6.html#asynchronousiterable

**Session Libraries:**
- express-session: https://github.com/expressjs/session
- connect-redis: https://github.com/tj/connect-redis
- lru-cache: https://github.com/isaacs/node-lru-cache
- node-cache: https://github.com/node-cache/node-cache

**Best Practices:**
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Node.js Memory: https://nodejs.org/en/docs/guides/simple-profiling/
- V8 GC: https://v8.dev/blog/trash-talk

---

## Key Takeaways

### Session Management
1. **Stateless SDKs** require application-side session management
2. **Continue flag** (Anthropic) or **full history** (OpenAI) for continuation
3. **streamInput()** is critical when using `continue: true`
4. **Validate message types** before appending to history

### AsyncGenerator Patterns
1. **Always consume full generator** or explicitly close
2. **Use try/finally** for proper cleanup
3. **Implement timeouts** for long-running operations
4. **Handle backpressure** with bounded queues

### Memory Management
1. **LRU eviction** for in-memory storage
2. **TTL expiration** with periodic cleanup
3. **History pruning** (window or token-based)
4. **WeakMap** for garbage-collected metadata

### Production Readiness
1. **Distributed storage** (Redis) for production
2. **Thread safety** with mutex for concurrent access
3. **Monitoring** of session metrics
4. **Health checks** for orphaned/expensive sessions

---

## References

### Internal Documents
- `/home/dustin/projects/groundswell/research/llm-sdk-session-management-best-practices.md`
- `/home/dustin/projects/groundswell/research/llm-sdk-session-quick-reference.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/session-management-best-practices.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/anthropic-sdk-session-patterns.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/codebase-session-patterns.md`
- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-sessions.test.ts`

### External Resources
See Section "Documentation URLs" above for complete list.

---

**Document Status:** ✅ COMPLETE
**Date:** January 25, 2026
**Version:** 1.0.0

---

**End of Document**
