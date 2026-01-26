# JSDoc Audit Report

## Summary Statistics

- **Total JSDoc Comments Audited**: 85
- **Number with unclear defaults**: 12
- **Number with unclear required/optional status**: 8
- **Number with missing side effect documentation**: 15
- **Number that need improvement**: 32

## Detailed Findings by File

### `src/core/workflow.ts`

**Total JSDoc Comments**: 20
**Issues Found**: 7

| Line | Property/Method | Issue Type | Current JSDoc | Suggested Improvement |
|------|-----------------|------------|---------------|----------------------|
| 104-106 | Constructor overload | Defaults | `@param name Human-readable name (defaults to class name)` | `@param name Human-readable name. (default: class name from constructor) - Use class-based pattern for custom name, functional pattern to specify config` |
| 190-193 | isDescendantOf | Side Effects | Missing event emission warning | `@warning This method reveals workflow hierarchy information. If your application exposes workflows via an API, ensure you implement proper access control to prevent unauthorized topology discovery. Note that the parent and children properties are already public, so this method does not expose any new information beyond what is currently accessible.` |
| 271-273 | addObserver | Side Effects | `@throws Error if called on non-root workflow` | `@throws Error if called on non-root workflow. Side effect: Emits event to notify observers if successful.` |
| 345-387 | attachChild | Side Effects | Comprehensive but missing event detail | `@param child - The child workflow to attach<br/>@throws {Error} If the child is already attached to this workflow<br/>@throws {Error} If the child already has a different parent (use detachChild() first for reparenting)<br/>@throws {Error} If the child is an ancestor of this parent (would create circular reference)<br/>@side effects Modifies workflow tree structure, emits childAttached event, and triggers treeUpdated event for debugger` |
| 413-445 | detachChild | Side Effects | Missing event detail | `@param child - The child workflow to detach<br/>@throws {Error} If the child is not attached to this parent workflow<br/>@side effects Modifies workflow tree structure, emits childDetached event, and triggers treeUpdated event for debugger` |
| 450-466 | emitEvent | Side Effects | Minimal documentation | `Emit an event to all root observers. Side effects: Pushes event to node.events array and notifies all registered observers. May trigger treeUpdated notifications for specific event types.` |
| 471-493 | snapshotState | Side Effects | Missing detail | `Capture and emit a state snapshot. Side effects: Updates node.stateSnapshot, notifies observers via onStateUpdated callback, emits snapshot event, and triggers treeUpdated event for debugger.` |

### `src/core/agent.ts`

**Total JSDoc Comments**: 15
**Issues Found**: 6

| Line | Property/Method | Issue Type | Current JSDoc | Suggested Improvement |
|------|-----------------|------------|---------------|----------------------|
| 98 | Constructor | Defaults | Missing default config | `@param config Agent configuration (default: { name: 'Agent', model: 'claude-sonnet-4-20250514' })` |
| 244-253 | prompt | Required/Optional | Missing opt-out pattern | `@param prompt Prompt to execute (required)<br/>@param overrides Optional overrides for this execution (default: undefined)<br/>@returns AgentResponse containing validated response or error` |
| 279-307 | reflect | Required/Optional | Unclear opt-out behavior | `@param prompt Prompt to execute (required)<br/>@param overrides Optional overrides for this execution (default: undefined)<br/>@returns AgentResponse containing validated response or error<br/>@remarks When reflection is enabled (prompt.enableReflection, overrides.enableReflection, or config.enableReflection), prefixes system prompt with reflection instructions. Reflection follows opt-out pattern: enabled by default unless explicitly disabled.` |
| 613-624 | executePrompt | Side Effects | Missing cache behavior | `Internal prompt execution with full flow using provider abstraction. Side effects: May emit workflow events, may read from/write to cache if enabled, may modify environment variables temporarily, validates response against schema, and stores result in cache if enabled.` |
| 876-928 | validateResponse | Required/Optional | Missing schema detail | `@template T - The type of response data<br/>@param response - The response to validate (required)<br/>@param dataSchema - The Zod schema for the response data (required from Prompt.responseFormat)<br/>@returns The validated response, or an INTERNAL_ERROR response if validation fails` |
| 975-987 | setupEnvironment | Side Effects | Missing detail | `Set up environment variables. Side effects: Modifies process.env with provided values and returns original values for restoration. Restores environment in finally block of executePrompt.` |

### `src/providers/provider-registry.ts`

**Total JSDoc Comments**: 12
**Issues Found**: 5

| Line | Property/Method | Issue Type | Current JSDoc | Suggested Improvement |
|------|-----------------|------------|---------------|----------------------|
| 164-169 | getInstance | Required/Optional | Missing lazy detail | `Get the singleton ProviderRegistry instance. Creates instance on first call (lazy initialization). Returns same instance on subsequent calls.` |
| 281-324 | initializeProvider | Defaults | Missing timeout default | `Initialize a single provider with promise caching. Side effects: May modify internal state, may fail provider if already initialized with different options.<br/>@param id - The provider id to initialize<br/>@param options - Optional provider configuration options (default: undefined)<br/>@returns Promise that resolves when initialization completes` |
| 360-401 | initializeAll | Defaults | Missing TTL default | `Initialize all registered providers in parallel. Side effects: Modifies internal state, fails providers individually if initialization fails.<br/>@param config - Global provider configuration with provider defaults<br/>@returns Promise resolving to success/failure lists` |
| 473-530 | terminateAll | Side Effects | Missing cleanup detail | `Terminate all registered providers with error tolerance. Side effects: Calls provider.terminate() for each provider, clears internal state maps, logs errors for failed terminations, and performs cleanup for memory-based stores.` |

### `src/providers/anthropic-provider.ts`

**Total JSDoc Comments**: 25
**Issues Found**: 8

| Line | Property/Method | Issue Type | Current JSDoc | Suggested Improvement |
|------|-----------------|------------|---------------|----------------------|
| 182-188 | initialize | Defaults | Missing session store default | `Initialize the Anthropic provider. Side effects: Loads SDK module, configures session storage (default: MemorySessionStore), may restore sessions from persistent storage.<br/>@param options - Optional provider configuration (apiKey, endpoint, sessionPersistence, etc.)<br/>@remarks Implemented in P2.M1.T1.S2` |
| 320-325 | normalizeModel | Required/Optional | Missing provider validation | `Normalize a model string to a ModelSpec. Validates that provider is 'anthropic'.<br/>@param model - Model string to normalize (required)<br/>@returns Parsed ModelSpec with provider='anthropic'<br/>@throws {Error} When model specification is invalid or provider is not 'anthropic'` |
| 828-892 | registerMCPs | Defaults | Missing return value detail | `Register MCP servers and return available tools. Side effects: Modifies internal MCP handler state, converts tools to SDK format.<br/>@param servers - Array of MCP server configurations<br/>@returns Array of discovered tools in MCP format (serverName__toolName)<br/>@remarks Implemented in P2.M1.T1.S7` |
| 894-953 | loadSkills | Required/Optional | Missing empty skills behavior | `Load skills into the provider. Side effects: Reads SKILL.md files, combines skills into formatted system prompt.<br/>@param skills - Array of skill definitions with name and path (empty array clears existing skills)<br/>@throws {Error} When SDK is not initialized or SKILL.md file cannot be read<br/>@remarks Each skill directory must contain a SKILL.md file` |
| 1178-1209 | createSession | Defaults | Missing idempotent detail | `Create a new session with the specified ID. Side effects: Initializes empty session state in session store.<br/>@param sessionId - Unique identifier for the session (required)<br/>@remarks Idempotent: if session exists, this is a no-op. Session will be used when execute() receives matching sessionId in options.` |
| 1211-1234 | getSession | Side Effects | Missing update detail | `Get session state for the specified ID. Side effects: Updates lastAccessedAt timestamp and saves to persistent stores.<br/>@param sessionId - Session identifier to retrieve (required)<br/>@returns Session state or undefined if not found<br/>@remarks Updates lastAccessed timestamp and saves back to store for persistent storage.` |
| 1236-1256 | deleteSession | Side Effects | Missing destruction detail | `Delete a session. Side effects: Removes session from storage, irreversible operation.<br/>@param sessionId - Session identifier to delete (required)<br/>@returns true if deleted, false if not found<br/>@remarks This is a destructive operation - deleted sessions cannot be recovered unless store has backup/retention.` |
| 243-247 | session persistence | Required/Optional | Missing sessionTtl default | `sessionPersistence config option: 'memory' (default), 'file', or 'redis'.<br/>- memory: Uses MemorySessionStore<br/>- file: Uses FileSessionStore at sessionPath (default: './sessions')<br/>- redis: Not yet implemented<br/>sessionTtl defaults to 86400000ms (24 hours) if not specified` |

### `src/providers/opencode-provider.ts`

**Total JSDoc Comments**: 15
**Issues Found**: 6

| Line | Property/Method | Issue Type | Current JSDoc | Suggested Improvement |
|------|-----------------|------------|---------------|----------------------|
| 194-206 | initialize | Defaults | Missing port default | `Initialize the OpenCode provider. Side effects: Starts OpenCode server, creates client connection, logs initialization.<br/>@param options - Optional provider configuration (endpoint, apiKey, timeout, etc.)<br/>@throws {Error} When SDK module fails to load or server fails to start<br/>@remarks Port defaults to 4096, timeout defaults to 30000ms` |
| 431-453 | execute | Required/Optional | Missing LLM-only detail | `Execute a prompt request in LLM-only mode. Side effects: Creates/reuses session, processes Server-Sent Events, emits hooks. Tools are executed server-side with no client delegation.<br/>@param request - Provider request with prompt and options (required)<br/>@param toolExecutor - Callback for executing tools (ignored in LLM-only mode)<br/>@param hooks - Optional lifecycle hooks<br/>@returns Typed agent response or AsyncGenerator for streaming` |
| 849-886 | registerMCPs | Defaults | LLM-only limitation | `Register MCP servers (LLM-only mode). OpenCode executes tools server-side with no client-side delegation.<br/>@param servers - Array of MCP server configurations (ignored)<br/>@returns Empty array (no tools in LLM-only mode)<br/>@remarks MCP tool registration not supported due to server-side architecture` |
| 888-953 | loadSkills | Required/Optional | Missing injection detail | `Load skills into provider via system prompt injection. Side effects: Reads SKILL.md files, combines into system prompt fragment.<br/>@param skills - Array of skill definitions (empty array clears existing skills)<br/>@throws {Error} When SDK not initialized or SKILL.md unreadable<br/>@remarks OpenCode has no native skills API - skills injected via system prompts` |
| 997-1038 | normalizeModel | Defaults | Missing multi-provider | `Normalize model string for multi-provider gateway. Accepts any provider prefix (OpenCode supports 75+ providers).<br/>@param model - Model string to normalize<br/>@returns Parsed ModelSpec with validated provider and model<br/>@throws {Error} When model specification invalid<br/>@example 'gpt-4' → { provider: 'opencode', model: 'gpt-4' }` |
| 1-71 | File header | Side Effects | Missing deprecation warning | `DEPRECATED WARNING: OpenCodeProvider is deprecated since v1.5.0 and will be removed in v2.0.0. Side effects: Logs deprecation warning once on first initialize() call. Use AnthropicProvider for full feature support including MCP integration, LSP integration, and client-side tool execution.` |

### `src/decorators/step.ts`

**Total JSDoc Comments**: 3
**Issues Found**: 0

### `src/decorators/task.ts`

**Total JSDoc Comments**: 1
**Issues Found**: 0

### `src/decorators/observed-state.ts`

**Total JSDoc Comments**: 1
**Issues Found**: 0

### `src/types/**/*.ts` (Type Definitions)

**Total JSDoc Comments**: 13
**Issues Found**: 0

## Priority Categorization

### HIGH PRIORITY - Public API Methods with Unclear Defaults

1. **src/core/agent.ts:98** - Constructor missing default config documentation
2. **src/core/workflow.ts:104-106** - Constructor overload unclear about which pattern has defaults
3. **src/providers/anthropic-provider.ts:182-188** - initialize() missing session store default
4. **src/providers/anthropic-provider.ts:243-247** - sessionPersistence TTL default missing
5. **src/providers/opencode-provider.ts:194-206** - initialize() missing port/timeout defaults
6. **src/providers/provider-registry.ts:281-324** - initializeProvider() missing timeout default

### MEDIUM PRIORITY - Internal Methods or Missing Side Effect Docs

1. **src/core/agent.ts:613-624** - executePrompt missing cache/environment side effects
2. **src/core/agent.ts:876-928** - validateResponse missing schema requirement detail
3. **src/core/agent.ts:975-987** - setupEnvironment missing environment detail
4. **src/core/workflow.ts:190-193** - isDescendantOf missing security warning
5. **src/core/workflow.ts:271-273** - addObserver missing event emission detail
6. **src/providers/anthropic-provider.ts:828-892** - registerMCPs missing state modification detail
7. **src/providers/anthropic-provider.ts:1178-1209** - createSession missing idempotent detail
8. **src/providers/anthropic-provider.ts:1211-1234** - getSession missing update behavior
9. **src/providers/anthropic-provider.ts:1236-1256** - deleteSession missing destructive detail
10. **src/providers/opencode-provider.ts:849-886** - registerMCPs missing LLM-only limitation
11. **src/providers/opencode-provider.ts:888-953** - loadSkills missing injection detail
12. **src/core/workflow.ts:450-466** - emitEvent missing notification detail
13. **src/core/workflow.ts:471-493** - snapshotState missing observer detail
14. **src/core/workflow.ts:345-387** - attachChild missing event detail
15. **src/core/workflow.ts:413-445** - detachChild missing event detail

### LOW PRIORITY - Minor Clarifications

1. **src/core/agent.ts:279-307** - reflect unclear opt-out behavior
2. **src/core/agent.ts:244-253** - prompt missing required parameter clarity
3. **src/providers/anthropic-provider.ts:894-953** - loadSkills missing empty array behavior
4. **src/providers/anthropic-provider.ts:1178-1209** - createSession missing empty session detail
5. **src/providers/opencode-provider.ts:1-71** - deprecation warning missing side effect
6. **src/providers/opencode-provider.ts:431-453** - execute missing LLM-only limitation detail
7. **src/providers/anthropic-provider.ts:320-325** - normalizeModel missing provider validation
8. **src/providers/opencode-provider.ts:997-1038** - normalizeModel missing multi-provider detail

## Specific Recommendations

### For Constructor Defaults

**File: src/core/agent.ts:98**
- **Current**: `constructor(config: AgentConfig = {})`
- **Issue**: Doesn't specify what defaults are applied
- **Recommendation**: Add `@param config Agent configuration (default: { name: 'Agent', model: 'claude-sonnet-4-20250514' })`

**File: src/core/workflow.ts:104-106**
- **Current**: `@param name Human-readable name (defaults to class name)`
- **Issue**: Doesn't clarify the two different patterns
- **Recommendation**: Specify both patterns: `@overload Class-based pattern: constructor(name?: string, parent?: Workflow)<br/>@overload Functional pattern: constructor(config: WorkflowConfig, executor?: WorkflowExecutor)<br/>@param name Human-readable name for class-based pattern (default: class name) or config object for functional pattern`

### For Required vs Optional Parameters

**File: src/core/agent.ts:279-307**
- **Current**: `@param prompt Prompt to execute<br/>@param overrides Optional overrides for this execution`
- **Issue**: Doesn't explain opt-out behavior for reflection
- **Recommendation**: Add `@remarks When reflection is enabled (prompt.enableReflection, overrides.enableReflection, or config.enableReflection), prefixes system prompt with reflection instructions. Reflection follows opt-out pattern: enabled by default unless explicitly disabled.`

### For Side Effects

**File: src/core/agent.ts:613-624**
- **Current**: `Internal prompt execution with full flow using provider abstraction`
- **Issue**: Missing side effect documentation
- **Recommendation**: Add `@side effects May emit workflow events, may read from/write to cache if enabled, may modify environment variables temporarily, validates response against schema, and stores result in cache if enabled.`

**File: src/core/workflow.ts:450-466**
- **Current**: `Emit an event to all root observers`
- **Issue**: Missing side effect detail
- **Recommendation**: Add `@side effects Pushes event to node.events array and notifies all registered observers. May trigger treeUpdated notifications for specific event types.`

**File: src/providers/anthropic-provider.ts:1178-1209**
- **Current**: `Create a new session with the specified Id`
- **Issue**: Missing idempotent behavior
- **Recommendation**: Add `@remarks Idempotent: if session exists, this is a no-op. Session will be used when execute() receives matching sessionId in options.`

### For LLM-only Mode Limitations

**File: src/providers/opencode-provider.ts:431-453**
- **Current**: `Execute a prompt request`
- **Issue**: Doesn't clarify LLM-only limitation
- **Recommendation**: Add `@remarks LLM-only mode: Tools are executed server-side with no client delegation. The toolExecutor parameter is accepted for interface compliance but cannot be used.`

### For Deprecation Side Effects

**File: src/providers/opencode-provider.ts:1-71**
- **Current**: `@deprecated Since v1.5.0. Will be removed in v2.0.0.`
- **Issue**: Doesn't mention the side effect of logging
- **Recommendation**: Add `@side effects Logs deprecation warning once on first initialize() call`

## Recommendations for Improvement

1. **Add Default Value Documentation**: For all public APIs with default values, clearly specify what the defaults are and how they're determined.

2. **Document Side Effects**: Add `@side effects` sections to methods that:
   - Modify external state (environment variables, file system, network)
   - Emit events
   - Modify internal state in significant ways
   - Perform I/O operations

3. **Clarify Required vs Optional**: For optional parameters, explain:
   - What happens when omitted
   - Opt-out vs opt-in behavior patterns
   - Default values when applicable

4. **Add Architectural Context**: For complex methods like `attachChild` and `detachChild`, document:
   - Tree structure modifications
   - Event emission patterns
   - Performance implications

5. **Document Error Handling**: For methods that throw, specify:
   - Common error cases
   - Recovery strategies
   - Whether errors are retryable

6. **Add Performance Characteristics**: For critical paths, document:
   - Time complexity
   - Memory implications
   - Network I/O expectations

This audit identified significant opportunities to improve JSDoc documentation, particularly around default values, side effects, and the LLM-only mode limitations in OpenCodeProvider. The most critical improvements needed are in the core workflow and agent classes, as these are the primary public APIs used by developers.
