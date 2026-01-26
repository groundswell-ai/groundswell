# OpenCode Hook Adapter Research Notes

**Task:** P3.M2.T2.S1 - Implement buildOpenCodeHooks() adapter function
**Research Date:** 2026-01-25

---

## Key Findings

### OpenCode SDK Event System Architecture

1. **Server-Sent Events (SSE) Only**
   - OpenCode uses SSE for real-time updates, not callback hooks
   - Events are subscribed via `client.event.subscribe()`
   - Returns `AsyncIterable` event stream

2. **Available Event Types**
   - `message.part.updated` - Streaming text chunks (✅ supported)
   - `message.updated` - Complete message updates
   - `permission.updated`, `permission.replied`
   - `installation.updated`, `installation.update-available`
   - `server.instance.disposed`

3. **NO Tool Execution Events**
   - Tools execute server-side with no client-side visibility
   - No `toolStart` or `toolEnd` events
   - This is a fundamental architectural limitation

4. **No Session Lifecycle Events**
   - No events for session start/end
   - Session hooks must be called manually in execute()

### Hook Mapping Summary

| ProviderHookEvents | OpenCode Equivalent | Status |
|--------------------|---------------------|--------|
| `onToolStart` | None | ❌ Not supported |
| `onToolEnd` | None | ❌ Not supported |
| `onSessionStart` | None | ⚠️ Manual call |
| `onSessionEnd` | None | ⚠️ Manual call |
| `onStream` | `message.part.updated` | ✅ Supported via SSE |

### Current Implementation Analysis

**File:** `src/providers/opencode-provider.ts`

**Lines 311-333:** Current `buildOpenCodeHooks()` stub
```typescript
private buildOpenCodeHooks(hooks?: ProviderHookEvents): {
  onToolStart?: boolean;
  onToolEnd?: boolean;
  onStream?: boolean;
} {
  if (!hooks) {
    return {};
  }

  const config: Record<string, boolean> = {};

  if (hooks.onToolStart) {
    config.onToolStart = true;
  }
  if (hooks.onToolEnd) {
    config.onToolEnd = true;
  }
  if (hooks.onStream) {
    config.onStream = true;
  }

  return config;
}
```

**Issues with current stub:**
1. Returns flags for unsupported hooks (onToolStart, onToolEnd)
2. No documentation explaining limitations
3. Follows AnthropicProvider pattern too closely despite different architecture

**Lines 409:** Usage in execute()
```typescript
const hookConfig = this.buildOpenCodeHooks(hooks);
```

**Lines 415-453:** SSE event subscription and processing
```typescript
if (Object.keys(hookConfig).length > 0) {
  eventStreamResult = await this.client.event.subscribe();

  (async () => {
    try {
      for await (const event of eventStreamResult.stream) {
        if (hookConfig.onStream && event.type === "message.part.updated") {
          const part = event.properties?.part;
          if (part?.type === "text" && part.delta) {
            hooks.onStream(part.delta);
          }
        }
      }
    } catch (error) {
      console.warn("Event stream error:", error);
    }
  })();
}
```

**Session hook calls (manual):**
- Line 456: `if (hooks?.onSessionStart) await hooks.onSessionStart();`
- Line 484: `if (hooks?.onSessionEnd) await hooks.onSessionEnd(duration);`
- Line 527: `if (hooks?.onSessionEnd) await hooks.onSessionEnd(duration);`

### Reference Implementation: AnthropicProvider

**File:** `src/providers/anthropic-provider.ts`
**Lines 643-720:** `buildAgentSDKHooks()` implementation

**Key patterns to follow:**
1. Early return for undefined hooks
2. Clear JSDoc documentation
3. Type-safe mapping with conditional checks
4. Return type matches SDK expectations

**Differences from OpenCode:**
- Anthropic: Returns SDK hook callbacks with nested arrays
- OpenCode: Returns simple boolean configuration flags

### Test Pattern Reference

**File:** `src/__tests__/unit/providers/anthropic-provider-hooks.test.ts`

**Test structure:**
1. `describe()` blocks for each hook type
2. Test empty/undefined hooks
3. Test individual hooks with mock functions
4. Test parameter transformation
5. Test async vs sync hooks
6. Test return values

**Pattern to follow:**
```typescript
describe('OpenCodeProvider.buildOpenCodeHooks()', () => {
  let provider: OpenCodeProvider;

  beforeEach(async () => {
    provider = new OpenCodeProvider();
    await provider.initialize();
  });

  describe('empty/undefined hooks', () => {
    it('should return empty object when hooks is undefined', () => {
      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(undefined);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('onStream support', () => {
    it('should map onStream to SSE event subscription', () => {
      const hooks = { onStream: vi.fn() };
      // @ts-expect-error
      const result = provider.buildOpenCodeHooks(hooks);
      expect(result.onStream).toBe(true);
    });
  });

  describe('unsupported hooks', () => {
    it('should ignore onToolStart hook', () => {
      const hooks = { onToolStart: vi.fn() };
      // @ts-expect-error
      const result = provider.buildOpenCodeHooks(hooks);
      expect(result.onToolStart).toBeUndefined();
    });

    it('should ignore onToolEnd hook', () => {
      const hooks = { onToolEnd: vi.fn() };
      // @ts-expect-error
      const result = provider.buildOpenCodeHooks(hooks);
      expect(result.onToolEnd).toBeUndefined();
    });
  });
});
```

## Implementation Requirements

### Changes Needed

1. **Simplify return type**
   - Remove `onToolStart` and `onToolEnd` from return type
   - Keep only `onStream?: boolean`

2. **Add comprehensive JSDoc**
   - Explain adapter purpose
   - Document supported vs unsupported hooks
   - Reference architectural limitations

3. **No code changes to execute()**
   - Current SSE event handling is correct
   - Session hooks are already manually called

### Type Definitions

```typescript
// From src/types/providers.ts (lines 78-97)
interface ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number
  ) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;  // Sync - no Promise
}

// Adapter output type
type OpenCodeHookConfig = {
  onStream?: boolean;
};
```

### External Research Summary

**Hook Adapter Patterns:**
1. Event Publisher-Subscriber pattern for SSE integration
2. EventEmitter as intermediary between callbacks and events
3. Error isolation with try-catch blocks in event handlers
4. Type-safe event mapping with discriminated unions

**Best Practices:**
- Isolate hook errors - don't fail entire execution
- Log failures but continue normal flow
- Handle async/sync consistently with `Promise.resolve()`
- Use optional chaining to prevent undefined errors

## Sources

1. **OpenCode SDK Research:** `plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md`
2. **Type Definitions:** `src/types/providers.ts`
3. **Reference Implementation:** `src/providers/anthropic-provider.ts`
4. **Current Implementation:** `src/providers/opencode-provider.ts`
5. **Test Reference:** `src/__tests__/unit/providers/anthropic-provider-hooks.test.ts`

---

**End of Research Notes**
