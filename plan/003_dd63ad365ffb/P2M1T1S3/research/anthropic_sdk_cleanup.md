# Anthropic SDK Cleanup Requirements Research

## Executive Summary

The `@anthropic-ai/claude-agent-sdk` (v0.1.77) is **primarily stateless** for the standard `query()` API used by Groundswell. The SDK does **NOT** require explicit cleanup for normal usage. The recommended implementation for `AnthropicProvider.terminate()` is to simply clear the SDK module reference.

## SDK Architecture Analysis

### 1. Standard Query API (Stateless)

The `query()` function is the primary API used by Groundswell:

```typescript
export interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
  // NOTE: No close/cleanup/terminate methods
}
```

**Key Characteristics**:
- Creates new transport connections per query
- Auto-cleans up resources when async iteration completes
- No singleton or connection pooling
- No explicit cleanup methods

### 2. SDKSession V2 API (Requires Cleanup)

The unstable V2 SDK Session API has different requirements:

```typescript
export interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  stream(): AsyncGenerator<SDKMessage, void>;
  close(): void;  // Cleanup method
  [Symbol.asyncDispose](): Promise<void>;  // Async cleanup
}
```

**Note**: Groundswell does NOT use this API (tracked in tasks.json for future consideration).

### 3. Transport Interface (Internal)

The internal Transport interface has a close method:

```typescript
export interface Transport {
  write(data: string): void | Promise<void>;
  close(): void;  // Managed internally by SDK
  isReady(): boolean;
  readMessages(): AsyncGenerator<StdoutMessage, void, unknown>;
}
```

**Note**: This is managed internally by the SDK, not exposed to users.

## Cleanup Requirements by Feature

| Feature | Cleanup Required? | Method |
|---------|-------------------|--------|
| **Standard `query()`** | ❌ No | Auto-cleanup on completion |
| **V2 `SDKSession`** | ✅ Yes | `close()` or `Symbol.asyncDispose` |
| **MCP SDK Servers** | ❓ Unknown | Check MCP SDK docs |
| **Custom process spawn** | ✅ Yes | User-managed |

## Groundswell Integration Analysis

### Current Implementation

**File**: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`

```typescript
export class AnthropicProvider implements Provider {
  /**
   * Anthropic SDK module (lazy loaded)
   * @internal
   */
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;

  async initialize(options?: ProviderOptions): Promise<void> {
    // Idempotent check
    if (this.sdk) {
      return;
    }

    // Dynamic import
    this.sdk = await import('@anthropic-ai/claude-agent-sdk');
    // ... validation
  }

  async terminate(): Promise<void> {
    // TODO: Implement in P2.M1.T1.S3
  }
}
```

### Integration Points

1. **SDK Loading**: Dynamic import in `initialize()`
2. **API Usage**: Standard `query()` (not SDKSession)
3. **Resource Management**: Each `execute()` call creates new Query that auto-cleans
4. **State Management**: ProviderRegistry tracks initialization externally

## Recommended Implementation

```typescript
async terminate(): Promise<void> {
  // Idempotent check: if SDK is already null, return immediately
  if (this.sdk === null) {
    return;
  }

  // Clear SDK reference to allow garbage collection
  this.sdk = null;

  // No other cleanup needed - SDK is stateless and manages its own resources
  // All Query objects have already completed and auto-cleaned up
}
```

### Rationale

1. **Satisfies Provider interface contract**: Returns Promise<void>
2. **Idempotent**: Safe to call multiple times (matches initialize() pattern)
3. **Allows GC**: Clears SDK module reference for garbage collection
4. **No false security**: Empty implementation would be misleading
5. **Minimal overhead**: Simple null check and assignment
6. **No throws**: Never throws errors (same as initialize() re-entry)

## Documentation Sources

### Official Resources

- **NPM**: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- **GitHub**: https://github.com/anthropics/claude-agent-sdk-typescript
- **Docs**: https://platform.claude.com/docs/en/agent-sdk/overview

### Local Installation

- **Version**: 0.1.77
- **Entry Point**: `sdk.mjs`
- **Type Definitions**: `sdk.d.ts`
- **Location**: `node_modules/@anthropic-ai/claude-agent-sdk/`

## Testing Recommendations

### Test Cases

1. **Idempotent Behavior**: Safe to call terminate() multiple times
2. **SDK Cleared**: Verify `this.sdk` is null after termination
3. **Registry Integration**: Works with ProviderRegistry.terminateAll()
4. **Re-initialization**: Can re-initialize after termination

### Test Pattern

```typescript
describe('terminate()', () => {
  it('should clear SDK reference', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    await provider.terminate();

    // @ts-expect-error - Testing private property
    expect(provider.sdk).toBeNull();
  });

  it('should be idempotent', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    await provider.terminate();
    await provider.terminate(); // Should not throw

    // @ts-expect-error - Testing private property
    expect(provider.sdk).toBeNull();
  });
});
```

## Best Practices Summary

1. **Do**: Clear SDK reference (`this.sdk = null`)
2. **Do**: Add idempotent check (`if (this.sdk === null) return`)
3. **Don't**: Call any SDK cleanup methods (none exist for query API)
4. **Don't**: Close connections (SDK manages internally)
5. **Don't**: Track internal initialization state (ProviderRegistry manages)
6. **Do**: Document why cleanup is minimal (SDK is stateless)
