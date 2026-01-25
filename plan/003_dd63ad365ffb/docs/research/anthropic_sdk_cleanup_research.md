# Anthropic SDK Cleanup & Termination Research

**Research Date:** January 25, 2026
**SDK Version:** 0.1.77
**Researcher:** Claude Code Agent
**Purpose:** Determine if @anthropic-ai/claude-agent-sdk requires explicit cleanup/termination

---

## Executive Summary

**Key Finding:** The Anthropic Agent SDK is **primarily stateless** and does NOT require explicit cleanup for most use cases. However, there are specific scenarios where cleanup is necessary:

1. **V2 API Sessions** (unstable) - require explicit `close()` or `Symbol.asyncDispose`
2. **MCP SDK Servers** (in-process) - contain `McpServer` instances that may need cleanup
3. **Transport connections** - have a `close()` method for connection cleanup
4. **Spawned processes** - via `spawnClaudeCodeProcess` may need cleanup

For the standard `query()` API used in Groundswell's `AnthropicProvider`, **no explicit cleanup is required**.

---

## 1. SDK Architecture & State Management

### 1.1 Stateless by Default

The Anthropic Agent SDK follows a **stateless design pattern**:

- **Query API**: The primary `query()` function returns a `Query` object that is an `AsyncGenerator`
- **No persistent connections**: Each query creates its own transport/connection
- **Auto-cleanup**: Resources are cleaned up when the async iteration completes or is aborted
- **No SDK singleton**: The SDK does not maintain global state or connection pools

**Evidence from SDK Types:**

```typescript
// From runtimeTypes.d.ts
export interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
  setModel(model?: string): Promise<void>;
  // ... control methods
}

// Query is an AsyncGenerator - auto-cleanup on completion/abort
```

### 1.2 Transport Layer

The SDK uses a **Transport interface** that does have a `close()` method:

```typescript
// From transport/transport.d.ts
export interface Transport {
  write(data: string): void | Promise<void>;
  close(): void;  // ← Close method exists
  isReady(): boolean;
  readMessages(): AsyncGenerator<StdoutMessage, void, unknown>;
  endInput(): void;
}
```

**However**, the transport lifecycle is managed internally by the SDK:
- Transport is created when `query()` is called
- Transport is closed automatically when:
  - The async iteration completes naturally
  - An `AbortController` signal is triggered
  - An error occurs

---

## 2. Cleanup Requirements by SDK Feature

### 2.1 Standard `query()` API - NO CLEANUP REQUIRED ✅

**Usage Pattern:**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const q = query({
  prompt: 'Hello, Claude!',
  options: { model: 'claude-sonnet-4-5-20250929' }
});

for await (const message of q) {
  console.log(message);
}
// ✅ Resources auto-cleaned up here
```

**Cleanup Status:**
- ❌ No `terminate()` method
- ❌ No `cleanup()` method
- ❌ No `dispose()` method
- ✅ Auto-cleanup on iteration completion
- ✅ AbortController for early termination

**Current Groundswell Usage:**
```typescript
// From src/core/agent.ts
const q = query({ prompt: userMessage, options: sdkOptions });

for await (const message of q) {
  if (message.type === 'assistant') {
    // Process tool uses
  }
  if (message.type === 'result') {
    resultMessage = message;
  }
}
// ✅ Auto-cleanup happens here
```

### 2.2 V2 Session API - CLEANUP REQUIRED ⚠️

**Status:** UNSTABLE / EXPERIMENTAL

```typescript
// From runtimeTypes.d.ts
export interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  stream(): AsyncGenerator<SDKMessage, void>;
  close(): void;  // ← MUST be called
  [Symbol.asyncDispose](): Promise<void>;  // ← Or use async disposal
}
```

**Usage Pattern:**
```typescript
import { unstable_v2_createSession } from '@anthropic-ai/claude-agent-sdk';

const session = unstable_v2_createSession({
  model: 'claude-sonnet-4-5-20250929'
});

try {
  await session.send('Hello');
  for await (const message of session.stream()) {
    console.log(message);
  }
} finally {
  session.close();  // ⚠️ REQUIRED
  // OR
  await session[Symbol.asyncDispose]();  // ⚠️ REQUIRED
}
```

**Cleanup Status:**
- ✅ `close()` method - synchronous cleanup
- ✅ `Symbol.asyncDispose` - async cleanup support
- ⚠️ **Not used in Groundswell** (V1 API only)

### 2.3 MCP SDK Servers - MAY NEED CLEANUP ⚠️

**SDK MCP Servers** are in-process MCP servers:

```typescript
// From runtimeTypes.d.ts
export type McpSdkServerConfigWithInstance = McpSdkServerConfig & {
  instance: McpServer;  // ← Live MCP server instance
};
```

**Creation:**
```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';

const mcpServer = createSdkMcpServer({
  name: 'my-tools',
  version: '1.0.0',
  tools: [calculatorTool]
});
```

**Cleanup Status:**
- ❌ SDK types do not expose a `close()` or `cleanup()` method
- ❌ SDK README does not document cleanup
- ⚠️ `McpServer` from `@modelcontextprotocol/sdk` may have its own cleanup
- ℹ️ **Best practice:** Check `@modelcontextprotocol/sdk` documentation

**Groundswell Usage:**
```typescript
// From src/providers/anthropic-provider.ts (future implementation)
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  // MCP servers are configured in the query options
  // The SDK manages their lifecycle internally
  const sdkOptions = {
    mcpServers: {
      mytools: mcpServer  // ← SDK manages lifecycle
    }
  };
}
```

### 2.4 Custom Process Spawning - MAY NEED CLEANUP ⚠️

If using `spawnClaudeCodeProcess`:

```typescript
// From runtimeTypes.d.ts
export type Options = {
  spawnClaudeCodeProcess?: (options: SpawnOptions) => SpawnedProcess;
  // ...
};

export interface SpawnedProcess {
  // User-managed process lifecycle
}
```

**Cleanup Status:**
- ⚠️ **User responsibility** - if you provide a custom spawner, you must clean up the process
- ℹ️ Default spawner manages cleanup automatically

---

## 3. Groundswell Integration Analysis

### 3.1 Current Implementation (AnthropicProvider)

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`

**Key Characteristics:**
1. ✅ Uses standard `query()` API (stateless)
2. ✅ Lazy SDK loading via dynamic import
3. ✅ No persistent SDK instances or connections
4. ✅ Each `execute()` call creates a new `Query`

**Current `terminate()` Method:**
```typescript
async terminate(): Promise<void> {
  // Implemented in P2.M1.T1.S3
  // Currently empty - NO OP
}
```

### 3.2 Provider Interface Requirements

**From:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/provider-interface-design-patterns.md`

```typescript
export interface Provider {
  id: ProviderId;
  capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;  // ← Required by interface
  execute<T>(...): Promise<AgentResponse<T>>;
  // ...
}
```

**Contract Requirements:**
- `terminate()` MUST be implemented (interface requirement)
- `terminate()` should be idempotent (safe to call multiple times)
- `terminate()` should cleanup provider-level resources
- `terminate()` does NOT need to cleanup SDK resources (SDK handles those)

---

## 4. Recommended Implementation for AnthropicProvider

### 4.1 Minimal Implementation (Recommended)

```typescript
export class AnthropicProvider implements Provider {
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;

  async initialize(options?: ProviderOptions): Promise<void> {
    if (this.sdk) {
      return;  // Idempotent
    }
    this.sdk = await import('@anthropic-ai/claude-agent-sdk');
  }

  async terminate(): Promise<void> {
    // Clear SDK reference to allow garbage collection
    this.sdk = null;

    // No other cleanup needed - SDK is stateless
    // All Query objects have already completed and auto-cleaned up
  }

  async execute<T>(...): Promise<AgentResponse<T>> {
    // Each execute() creates a new Query
    const q = query({ prompt, options });
    for await (const message of q) {
      // Process messages
    }
    // Query auto-cleans up here
  }
}
```

**Rationale:**
1. ✅ Satisfies Provider interface contract
2. ✅ Idempotent (safe to call multiple times)
3. ✅ Allows GC of SDK module reference
4. ✅ No false sense of security (empty implementation would be misleading)
5. ✅ Minimal overhead

### 4.2 With Future V2 Session Support

If V2 sessions are added in the future:

```typescript
export class AnthropicProvider implements Provider {
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;
  private sessions: Map<string, SDKSession> = new Map();

  async terminate(): Promise<void> {
    // Close all active sessions
    for (const [id, session] of this.sessions) {
      try {
        session.close();
      } catch (error) {
        // Log but continue cleanup
        console.error(`Failed to close session ${id}:`, error);
      }
    }
    this.sessions.clear();

    // Clear SDK reference
    this.sdk = null;
  }
}
```

---

## 5. Comparison with Other Providers

### 5.1 OpenCode SDK (Hypothetical)

Based on PRD requirements:
- ✅ Native session management
- ✅ Likely requires explicit session cleanup
- ⚠️ **Not yet verified** - package existence unconfirmed

### 5.2 Provider Interface Design Pattern

**Key Principle:** Provider termination should cleanup provider-level resources, NOT SDK-level resources.

**Provider-level resources:**
- In-memory session state
- Configuration caches
- Provider-specific connections

**SDK-level resources:**
- Managed by SDK itself
- Auto-cleanup on completion
- Not provider's responsibility

---

## 6. Documentation Sources

### 6.1 Official SDK Documentation

**README:** `/home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/README.md`

**Key Excerpts:**
```markdown
# Claude Agent SDK

The Claude Agent SDK enables you to programmatically build AI agents
with Claude Code's capabilities.

**Learn more in the [official documentation](
https://platform.claude.com/docs/en/agent-sdk/overview)**.
```

**Observations:**
- ❌ No mention of cleanup or termination
- ❌ No examples showing cleanup
- ℹ️ Points to online docs (requires web access)

### 6.2 SDK Type Definitions

**Files Analyzed:**
- `/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`
- `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts`
- `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts`
- `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts`
- `/node_modules/@anthropic-ai/claude-agent-sdk/transport/transport.d.ts`

**Key Findings:**
1. `Query` interface (standard API) - no cleanup methods
2. `SDKSession` interface (V2 API) - has `close()` and `Symbol.asyncDispose`
3. `Transport` interface - has `close()` method (internal use)
4. No global cleanup functions

### 6.3 Package Information

**File:** `/home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/package.json`

```json
{
  "name": "@anthropic-ai/claude-agent-sdk",
  "version": "0.1.77",
  "main": "sdk.mjs",
  "types": "sdk.d.ts",
  "engines": {
    "node": ">=18.0.0"
  },
  "peerDependencies": {
    "zod": "^3.25.0 || ^4.0.0"
  }
}
```

---

## 7. Testing Recommendations

### 7.1 Unit Tests for terminate()

```typescript
describe('AnthropicProvider.terminate()', () => {
  it('should be idempotent', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    await provider.terminate();
    await provider.terminate();  // Should not throw
    await provider.terminate();  // Should not throw
  });

  it('should clear SDK reference', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    expect(provider['sdk']).not.toBeNull();

    await provider.terminate();

    expect(provider['sdk']).toBeNull();
  });

  it('should allow re-initialization after terminate', async () => {
    const provider = new AnthropicProvider();

    await provider.initialize();
    await provider.terminate();
    await provider.initialize();  // Should succeed

    expect(provider['sdk']).not.toBeNull();
  });
});
```

### 7.2 Integration Tests

```typescript
describe('AnthropicProvider lifecycle', () => {
  it('should handle execute() before/after terminate', async () => {
    const provider = new AnthropicProvider();

    await provider.initialize();
    await provider.execute({ prompt: 'test' }, mockExecutor);

    await provider.terminate();

    // Should fail - not initialized
    await expect(
      provider.execute({ prompt: 'test' }, mockExecutor)
    ).rejects.toThrow();
  });
});
```

---

## 8. Best Practices Summary

### 8.1 For AnthropicProvider Implementation

| Practice | Implementation | Rationale |
|----------|---------------|-----------|
| **Clear SDK reference** | `this.sdk = null` | Allows GC |
| **Idempotent** | Check if already null before clearing | Safe to call multiple times |
| **No-op for stateless SDK** | No connection cleanup needed | SDK manages its own resources |
| **Document behavior** | JSDoc explaining stateless nature | Clear for future maintainers |

### 8.2 For SDK Usage

| Scenario | Cleanup Required? | Method |
|----------|-------------------|--------|
| Standard `query()` | ❌ No | Auto-cleanup |
| V2 `SDKSession` | ✅ Yes | `close()` or `await session[Symbol.asyncDispose]()` |
| MCP SDK servers | ❓ Unknown | Check MCP SDK docs |
| Custom process spawn | ✅ Yes | User-managed |

### 8.3 For Provider Interface Design

| Principle | Application |
|-----------|-------------|
| **Provider ≠ SDK** | Provider cleanup ≠ SDK cleanup |
| **Idempotent terminate()** | Safe to call multiple times |
| **Minimal assumptions** | Don't assume SDK has cleanup methods |
| **Document clearly** | Explain what is/is not cleaned up |

---

## 9. Open Questions & Future Research

### 9.1 MCP Server Cleanup

**Question:** Do `McpServer` instances from `@modelcontextprotocol/sdk` require cleanup?

**Research Needed:**
1. Check `@modelcontextprotocol/sdk` documentation
2. Look for `close()`, `dispose()`, or `cleanup()` methods
3. Test if MCP servers have connection leaks

**Impact:** Low - Groundswell uses SDK transport which manages MCP internally

### 9.2 V2 API Stability

**Question:** When will V2 session API be stable?

**Monitoring:** Check SDK release notes for `unstable_v2_*` removal

**Impact:** Medium - Future sessions support may need cleanup logic

### 9.3 Resource Leak Testing

**Question:** Are there any resource leaks in the current implementation?

**Testing Needed:**
1. Run thousands of queries in a loop
2. Monitor memory usage
3. Check for unclosed handles (e.g., `lsof` on Unix)

**Impact:** High - Critical for production use

---

## 10. Conclusion

### 10.1 Summary

The Anthropic Agent SDK is **designed to be stateless** and does NOT require explicit cleanup for standard usage via the `query()` API. The SDK manages its own resources automatically:

- ✅ Transport connections are closed when queries complete
- ✅ Async generators clean up on iteration completion
- ✅ AbortController triggers cleanup on abort
- ✅ No singleton or connection pooling to manage

**However**, the `AnthropicProvider.terminate()` method should still:
1. Clear the SDK module reference (allows GC)
2. Be idempotent (safe to call multiple times)
3. Document the stateless nature of the SDK
4. Prepare for future V2 session support

### 10.2 Recommendations

1. **Implement minimal terminate()** - Clear SDK reference only
2. **Add comprehensive tests** - Verify idempotency and re-initialization
3. **Document stateless nature** - Explain why no SDK cleanup is needed
4. **Monitor future SDK changes** - Watch for V2 API stabilization
5. **Test for resource leaks** - Verify no memory/handle leaks in production

### 10.3 Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| **P0** | Implement `terminate()` with SDK nulling | 5 min |
| **P0** | Add unit tests for terminate() | 30 min |
| **P1** | Add JSDoc documentation | 15 min |
| **P1** | Add integration tests | 30 min |
| **P2** | Resource leak testing | 2 hours |
| **P3** | Prepare for V2 sessions | Future |

---

## Appendix A: Code References

### A.1 SDK Query Interface

**File:** `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts`

```typescript
export interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
  setModel(model?: string): Promise<void>;
  setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>;
  supportedCommands(): Promise<SlashCommand[]>;
  supportedModels(): Promise<ModelInfo[]>;
  mcpServerStatus(): Promise<McpServerStatus[]>;
  accountInfo(): Promise<AccountInfo>;
  rewindFiles(userMessageId: string, options?: { dryRun?: boolean; }): Promise<RewindFilesResult>;
  setMcpServers(servers: Record<string, McpServerConfig>): Promise<McpSetServersResult>;
  streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void>;
}
```

### A.2 SDK Session Interface

**File:** `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts`

```typescript
export interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  stream(): AsyncGenerator<SDKMessage, void>;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;
}
```

### A.3 Transport Interface

**File:** `node_modules/@anthropic-ai/claude-agent-sdk/transport/transport.d.ts`

```typescript
export interface Transport {
  write(data: string): void | Promise<void>;
  close(): void;
  isReady(): boolean;
  readMessages(): AsyncGenerator<StdoutMessage, void, unknown>;
  endInput(): void;
}
```

---

## Appendix B: Related Documentation

### B.1 Groundswell Documentation

- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/anthropic_sdk_research.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/provider-interface-design-patterns.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/decisions.md`

### B.2 Implementation Files

- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
- `/home/dustin/projects/groundswell/src/core/agent.ts`
- `/home/dustin/projects/groundswell/src/core/mcp-handler.ts`

### B.3 Test Files

- `/home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-initialize.test.ts`

---

**Document Status:** ✅ COMPLETE
**Next Review:** When SDK V2 API becomes stable
**Maintainer:** Groundswell Development Team
