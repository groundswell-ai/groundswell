# Groundswell Codebase Session Management Research

## 1. Existing Session/State Management Patterns

### ProviderRegistry State Management
- Uses `Map<ProviderId, Provider>` for efficient provider lookup
- Centralized state management with initialization tracking using `Map<ProviderId, ProviderInitState>`
- Idempotent operations with promise caching
- Proper cleanup patterns in `terminateAll()` using `Map.clear()`

### MCPHandler State Management
- Multiple Maps for different concerns: `servers`, `registeredTools`, `toolExecutors`
- Clean separation of concerns with clear ownership
- Namespace-based key management (`serverName__toolName`)

### Cache System State Management
- Complex Map structure with Set values for prefix indexing: `Map<string, Set<string>>`
- Synchronized cleanup across multiple data structures
- Memory-efficient with size-based eviction

## 2. Current AnthropicProvider State Handling

The AnthropicProvider currently has these private state fields:
- `sdk: typeof import("@anthropic-ai/claude-agent-sdk") | null = null` (nullable SDK reference)
- `mcpHandler: MCPHandler = new MCPHandler()` (MCP management)
- `mcpServerConfig: McpServerConfig | null = null` (MCP configuration)
- `skillsPrompt: string = ''` (skills storage)

Key patterns observed:
- Idempotent operations with null checks
- Lazy initialization with promise caching
- Explicit session capability flag set to `false`

## 3. ProviderOptions.sessionId Current Usage

The `sessionId` is already defined in:
- `ProviderOptions.sessionId?: string` (ignored by Anthropic per comments)
- `ProviderExecutionOptions.sessionId?: string` (available but unused)
- Comments indicate Anthropic provider ignores session IDs due to stateless API

## 4. Private State Field Patterns

The codebase shows consistent patterns:
- `private readonly` for immutable configuration
- `private` for mutable state
- `private readonly` with null for optional state
- State interfaces with metadata
- Idempotent operations with early returns

## 5. Existing Cleanup/Termination Patterns

Key patterns from `anthropic-provider.ts`:
- Idempotent cleanup with null checks (`if (this.sdk === null) { return; }`)
- Clear references for garbage collection (`this.sdk = null`)
- Coordinated cleanup across multiple data structures
- No return value needed for `Promise<void>` methods

## 6. Key Insights for Session Implementation

Based on the research, session storage in AnthropicProvider should:

1. **Use Map for Session Storage**: `Map<string, SessionState>` following existing patterns
2. **Follow Idempotent Initialization**: Check for existing sessions before creating new ones
3. **Implement Proper Cleanup**: Clear session state in `terminate()` method
4. **Support Concurrent Sessions**: Map-based approach allows multiple sessions
5. **Update Capability Flag**: Change `sessions: false` to `sessions: true`

## 7. Integration Points Ready for Use

- `ProviderOptions.sessionId`: Already available in interfaces
- `ProviderRequest.options.sessionId`: Available in execute() requests
- `ProviderHookEvents`: Session hooks already defined (onSessionStart, onSessionEnd)
- Capabilities system already exists

## 8. Test Patterns Observed

From existing test files:
- Use `@ts-expect-error` to access private properties for testing
- Test state changes across method calls
- Verify idempotent behavior (safe to call multiple times)
- Test with null/undefined states
- Lifecycle testing (initialize, execute, terminate)
