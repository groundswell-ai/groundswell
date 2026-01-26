# LLM SDK Session Management - Quick Reference

**Quick reference guide for session management patterns in LLM SDKs**

---

## Critical Patterns (Copy-Paste Ready)

### 1. Session Continuation with AsyncGenerator

```typescript
// Anthropic SDK Pattern
async function continueSession(
  client: AnthropicClient,
  session: SessionState,
  newPrompt: string
): Promise<AsyncGenerator<SDKMessage>> {
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

### 2. Safe AsyncGenerator Consumption

```typescript
async function consumeGenerator<T>(
  generator: AsyncGenerator<T>
): Promise<T[]> {
  const results: T[] = [];

  try {
    for await (const item of generator) {
      results.push(item);
    }
  } finally {
    // Ensure cleanup even if iteration fails
    await generator.return?.();
  }

  return results;
}
```

### 3. Message Collection Pattern

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

  if (!resultMessage) {
    throw new Error('No result message received');
  }

  return { userMessages, resultMessage };
}
```

### 4. Session Update Pattern

```typescript
async function executeAndUpdateSession(
  client: LLMClient,
  session: SessionState,
  prompt: string
): Promise<SDKResultMessage> {
  const query = await continueSession(client, session, prompt);
  const { userMessages, resultMessage } = await collectMessages(query);

  // Update session state
  session.history.push(...userMessages);
  session.lastResult = resultMessage;
  session.metadata.updatedAt = new Date();
  session.metadata.turnCount += userMessages.length;

  return resultMessage;
}
```

### 5. LRU Session Storage

```typescript
class LRUSessionManager {
  private cache = new Map<string, SessionState>();
  private maxSessions: number;

  constructor(maxSessions: number = 1000) {
    this.maxSessions = maxSessions;
  }

  get(sessionId: string): SessionState | undefined {
    const value = this.cache.get(sessionId);
    if (value !== undefined) {
      // Re-insert to mark as recently used
      this.cache.delete(sessionId);
      this.cache.set(sessionId, value);
    }
    return value;
  }

  set(sessionId: string, session: SessionState): void {
    if (this.cache.size >= this.maxSessions) {
      // Remove first (least recently used)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(sessionId, session);
  }
}
```

### 6. Thread-Safe Session Manager

```typescript
import { Mutex } from 'async-mutex';

class ThreadSafeSessionManager {
  private sessions = new Map<string, SessionState>();
  private mutex = new Mutex();

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
    });
  }
}
```

### 7. History Pruning

```typescript
function pruneHistory(session: SessionState, maxSize: number): void {
  if (session.history.length > maxSize) {
    session.history = session.history.slice(-maxSize);
    session.metadata.updatedAt = new Date();
  }
}

// Token-based pruning
function pruneByTokens(session: SessionState, maxTokens: number): void {
  let totalTokens = 0;
  const keepMessages: SDKUserMessage[] = [];

  for (let i = session.history.length - 1; i >= 0; i--) {
    const msg = session.history[i];
    const tokens = JSON.stringify(msg.message).length / 4;

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

---

## Common Pitfalls (Don't Do This)

### ❌ Pitfall 1: Not Awaiting streamInput()

```typescript
// WRONG
query.streamInput(historyStream);

// CORRECT
await query.streamInput(historyStream);
```

### ❌ Pitfall 2: Abandoning Generators

```typescript
// WRONG
const first = await generator.next();
return first.value;  // Generator abandoned!

// CORRECT
try {
  for await (const item of generator) {
    // Process
  }
} finally {
  await generator.return?.();
}
```

### ❌ Pitfall 3: Forgetting History with continue: true

```typescript
// WRONG
const query = sdk.query({
  prompt: newPrompt,
  options: { continue: true }
  // Missing streamInput() with history!
});

// CORRECT
const query = sdk.query({
  prompt: '',
  options: { continue: true }
});
await query.streamInput(historyGenerator);
await query.streamInput(newMessageGenerator);
```

### ❌ Pitfall 4: Race Conditions

```typescript
// WRONG - Concurrent updates
Promise.all([
  session.history.push(msg1),
  session.history.push(msg2)
]);

// CORRECT - Sequential updates
await mutex.runExclusive(async () => {
  session.history.push(msg1);
  session.history.push(msg2);
});
```

---

## Essential Documentation URLs

**Anthropic:**
- NPM: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- GitHub: https://github.com/anthropics/claude-agent-sdk-typescript
- API: https://docs.anthropic.com/en/api/messages

**OpenAI:**
- API: https://platform.openai.com/docs/api-reference
- SDK: https://github.com/openai/openai-node

**Vercel AI SDK:**
- Concepts: https://sdk.vercel.ai/docs/ai-sdk-core/concepts
- Streaming: https://sdk.vercel.ai/docs/ai-sdk-core/reference/stream-text

**LangChain:**
- Memory: https://js.langchain.com/docs/concepts/#memory
- Implementation: https://github.com/langchain-ai/langchainjs/blob/main/langchain/src/memory/memory_base.ts

---

## Key Takeaways

1. **Always await streamInput()** when using `continue: true`
2. **Consume full AsyncGenerator** or explicitly close with `return?()`
3. **Validate message types** before appending to history
4. **Implement LRU/TTL** to prevent memory leaks
5. **Use mutex for thread safety** in concurrent scenarios
6. **Monitor session metrics** (count, history length, cost)

---

**See full document:** `/home/dustin/projects/groundswell/research/llm-sdk-session-management-best-practices.md`
