# PRP: Refactor Agent.prompt() to use provider.execute()

---

## Goal

**Feature Goal**: Refactor `Agent.prompt()` method to use the provider abstraction layer (`provider.execute()`) instead of directly calling the Anthropic SDK's `query()` function, enabling multi-provider support and proper tool delegation.

**Deliverable**: Modified `Agent.executePrompt()` method that builds `ProviderRequest`, resolves configuration via `resolveProviderConfig()`, calls `provider.execute()` with the tool executor, and handles responses with existing cache logic.

**Success Definition**:
- `Agent.prompt()` executes via `provider.execute()` instead of direct SDK `query()` calls
- Configuration cascade works correctly (global → agent → prompt level)
- Tool execution delegates through the existing `toolExecutor` method
- LRU caching continues to work with provider responses
- All existing tests pass without modification to public interface
- Both Anthropic and OpenCode providers can be used via `Agent.prompt()`

---

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**YES** - This PRP provides:
- Complete current implementation analysis with line numbers
- Full provider interface and type definitions
- Exact configuration cascade patterns
- Caching infrastructure details
- Tool executor integration patterns
- Related subtask implementations (S1, S2) to follow

---

### Documentation & References

```yaml
# MUST READ - Core implementation files
- file: /home/dustin/projects/groundswell/src/core/agent.ts
  why: Contains the current Agent.prompt() implementation (lines 256-261, 442-753) that needs refactoring
  pattern: executePrompt() method with SDK query() calls (line 567)
  gotcha: The toolExecutor method (lines 179-208) exists but is not currently used - must be activated

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Contains Provider interface, ProviderRequest, ProviderExecutionOptions, ToolExecutor type definitions
  pattern: Provider.execute<T>(request, toolExecutor, hooks) signature (lines 437-447)
  gotcha: ProviderRequest has nested structure { prompt, options } not flat parameters

- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Reference implementation showing how provider.execute() works (lines 243-446)
  pattern: execute() method structure - SDK init, session handling, hooks, response construction
  gotcha: Uses buildAgentSDKHooks() to convert ProviderHookEvents to SDK format

- file: /home/dustin/projects/groundswell/src/providers/opencode-provider.ts
  why: Shows alternative provider implementation with different patterns (lines 388-574)
  pattern: execute() with server-side sessions, SSE event handling
  gotcha: toolExecutor is accepted but NOT used (server-side tools only)

- file: /home/dustin/projects/groundswell/src/utils/provider-config.ts
  why: Contains resolveProviderConfig() for configuration cascade (lines 338-363)
  pattern: Nullish coalescing for provider resolution, object spread for options merge
  gotcha: Retrieves defaults for resolved provider, not agent's provider

- file: /home/dustin/projects/groundswell/src/cache/cache.ts
  why: LLMCache class with LRU eviction, TTL support, prefix-based invalidation
  pattern: get() / set() methods with optional prefix parameter (lines 85-99, 138-149)
  gotcha: Use agent ID as cache prefix for invalidation

- file: /home/dustin/projects/groundswell/src/cache/cache-key.ts
  why: generateCacheKey() function with CacheKeyInputs interface (lines 201-244)
  pattern: SHA-256 hash generation with deterministic stringify
  gotcha: Sorts object keys for consistency - must provide CacheKeyInputs object

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: AgentResponse, AgentErrorDetails, AgentResponseMetadata interfaces (lines 280-322)
  pattern: Discriminated union with status field ('success' | 'error' | 'partial')
  gotcha: Factory functions createSuccessResponse(), createErrorResponse() available

# Related subtask implementations to follow
- file: /home/dustin/projects/groundswell/src/core/agent.ts (lines 98-99)
  why: P4.M2.T1.S1 - Provider instance storage pattern
  pattern: private readonly provider: Provider;
  gotcha: Provider resolved at construction time using ProviderRegistry

- file: /home/dustin/projects/groundswell/src/core/agent.ts (lines 179-208)
  why: P4.M2.T1.S2 - Tool executor implementation for delegation
  pattern: Delegates to MCPHandlers, never throws (wraps errors in result)
  gotcha: Returns ToolExecutionResult with content string and isError boolean

# PRD context for work item boundaries
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/prd_snapshot.md
  why: PRD Section 7 - Multi-Provider Agent SDK System
  section: 7.7 Configuration Cascade (global → agent → prompt level)
  gotcha: Prompt-level provider overrides NOT in current PromptOverrides interface

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P4M2T1S3/PRP.md
  why: This work item's contract definition from tasks.json
  section: CONTRACT DEFINITION with INPUT/LOGIC/OUTPUT
  gotcha: Research note mentions current query() call that needs replacing
```

---

### Current Codebase Tree

```bash
src/
├── cache/
│   ├── cache.ts              # LLMCache class with LRU, TTL, prefix invalidation
│   ├── cache-key.ts          # generateCacheKey() with SHA-256 hashing
│   └── index.ts              # Cache exports
├── core/
│   ├── agent.ts              # Agent class with prompt(), executePrompt(), toolExecutor
│   ├── mcp-handler.ts        # MCPHandler for tool execution delegation
│   └── prompt.ts             # Prompt<T> class for typed prompts
├── providers/
│   ├── anthropic-provider.ts # AnthropicProvider with execute(), buildAgentSDKHooks()
│   ├── opencode-provider.ts  # OpenCodeProvider with execute(), buildOpenCodeHooks()
│   └── provider-registry.ts  # ProviderRegistry singleton for provider instances
├── types/
│   ├── agent.ts              # AgentResponse, AgentErrorDetails, AgentHooks
│   ├── providers.ts          # Provider, ProviderRequest, ProviderExecutionOptions, ToolExecutor
│   └── sdk-primitives.ts     # Agent SDK types (AgentSDKOptions, AgentHooks)
└── utils/
    ├── provider-config.ts    # resolveProviderConfig(), getGlobalProviderConfig()
    └── model-spec.ts         # parseModelSpec(), formatModelForProvider()
```

---

### Desired Codebase Tree with Changes

```bash
# Modified files
src/core/agent.ts
  ├── executePrompt() method (lines 442-753) - REFACTORED
  │   ├── BEFORE: Direct SDK query() call (line 567)
  │   ├── AFTER: provider.execute() call with ProviderRequest
  │   ├── Add: resolveProviderConfig() call for prompt-level overrides
  │   ├── Add: ProviderRequest construction
  │   ├── Change: Remove SDK message iteration (provider returns AgentResponse directly)
  │   └── Keep: Cache logic (LRU cache still works)
  │
  └── toolExecutor method (lines 179-208) - NOW USED
      ├── BEFORE: Existed but not called by executePrompt()
      └── AFTER: Passed to provider.execute() as callback
```

---

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: ProviderRequest has nested structure
// WRONG: provider.execute(prompt, options, toolExecutor, hooks)
// RIGHT: provider.execute({ prompt, options }, toolExecutor, hooks)
const request: ProviderRequest = {
  prompt: userMessage,
  options: { model, systemPrompt, tools, sessionId, hooks }
};

// CRITICAL: resolveProviderConfig() retrieves defaults for RESOLVED provider
// If agent uses 'opencode' but prompt overrides to 'anthropic',
// defaults come from anthropic's config, not opencode's
const { provider, options } = resolveProviderConfig(
  globalConfig,
  this.providerId,      // Agent's provider
  this.providerOptions, // Agent's options
  promptProvider,       // Prompt override (from overrides?.provider)
  promptOptions         // Prompt options override (from overrides?.providerOptions)
);

// GOTCHA: PromptOverrides doesn't have provider/providerOptions fields
// Need to handle these as special cases or extend the interface
// Option 1: Add fields to PromptOverrides interface
// Option 2: Handle as separate parameters in executePrompt()

// CRITICAL: toolExecutor never throws - returns errors in result
// All providers must handle ToolExecutionResult.isError
private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
  // Delegates to MCPHandler
  // Returns { content: string, isError: boolean }
  // NEVER throws exceptions
}

// CRITICAL: Cache key generation uses CacheKeyInputs interface
const cacheInputs: CacheKeyInputs = {
  user: prompt.buildUserMessage(),
  data: prompt.getData(),
  system: effectiveSystem,
  model: effectiveModel,
  temperature: effectiveTemperature,
  maxTokens: effectiveMaxTokens,
  tools: this.config.tools,
  mcps: this.config.mcps,
  skills: this.config.skills,
  responseFormat: prompt.getResponseFormat(),
};

// GOTCHA: Agent SDK hooks vs Provider hooks
// AgentHooks has arrays: preToolUse?: HookHandler<PreToolUseContext>[]
// ProviderHookEvents has single callbacks: onToolStart?: (tool) => Promise<void>
// Need to convert when building ProviderRequest
// OR: Pass Agent.hooks directly and let provider handle conversion?

// CRITICAL: AnthropicProvider.convertToolUseToToolExecutionResult() pattern
// Converts SDK ToolUse block to ToolExecutionRequest format
// Name: serverName__toolName (namespaced)
// Input: tool_use.input parameter object

// GOTCHA: Provider returns AgentResponse directly
// No need to construct AgentResponse from provider result
// Just validate and return (may need to adjust metadata.agentId)

// CRITICAL: Session management is provider-specific
// AnthropicProvider: In-memory sessions, pass sessionId in options
// OpenCodeProvider: Server-side sessions, auto-creates if not provided
// Agent should NOT manage sessions - just pass through sessionId if provided
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// No new data models needed - using existing types:

// From /src/types/providers.ts
interface ProviderRequest {
  prompt: string;
  options: ProviderExecutionOptions;
}

interface ProviderExecutionOptions {
  model?: string;
  systemPrompt?: string;
  tools?: Tool[];
  hooks?: ProviderHookEvents;
  sessionId?: string;
}

interface ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;
}

// From /src/types/agent.ts
interface PromptOverrides {
  system?: string;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  hooks?: AgentHooks;
  env?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  disableCache?: boolean;
  enableReflection?: boolean;
  model?: string;
  // NOTE: provider/providerOptions NOT currently in this interface
  // May need to extend for full prompt-level override support
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: EXTEND PromptOverrides interface (optional but recommended)
  - LOCATION: /home/dustin/projects/groundswell/src/types/agent.ts
  - ADD: provider?: ProviderId field to PromptOverrides interface
  - ADD: providerOptions?: ProviderOptions field to PromptOverrides interface
  - REASON: Enable full prompt-level provider override as specified in PRD 7.7
  - ALTERNATIVE: Handle as special case in executePrompt() without interface change
  - DEPENDENCIES: None

Task 2: MODIFY Agent.executePrompt() signature to extract prompt-level overrides
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts (line 442)
  - EXTRACT: promptProvider from overrides?.provider (if Task 1 completed) or from overrides?.model prefix
  - EXTRACT: promptOptions from overrides (temperature, maxTokens, etc.)
  - STORE: In local variables for provider config resolution
  - DEPENDENCIES: Task 1 (optional)

Task 3: RESOLVE provider configuration with cascade
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts, inside executePrompt()
  - CALL: getGlobalProviderConfig() to get global defaults
  - CALL: resolveProviderConfig() with:
    - globalConfig
    - agentProvider: this.providerId
    - agentOptions: this.providerOptions
    - promptProvider: extracted from Task 2
    - promptOptions: extracted from Task 2
  - STORE: Resolved { provider, options } in local variables
  - PATTERN: Follow lines 116-132 (constructor provider resolution)
  - GOTCHA: Resolved provider may differ from this.provider (prompt override)
  - DEPENDENCIES: Task 2

Task 4: GET provider instance for resolved provider
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts, inside executePrompt()
  - CALL: ProviderRegistry.getInstance().get(resolvedProvider)
  - VALIDATE: Provider exists, throw descriptive error if not
  - STORE: In local variable (may be different from this.provider)
  - PATTERN: Follow lines 128-132 (constructor provider retrieval)
  - DEPENDENCIES: Task 3

Task 5: BUILD ProviderRequest object
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts, inside executePrompt()
  - CONSTRUCT: ProviderRequest with nested structure:
    ```typescript
    const providerRequest: ProviderRequest = {
      prompt: userMessage,
      options: {
        model: effectiveModel,
        systemPrompt: effectiveSystem,
        tools: effectiveTools,
        sessionId: overrides?.sessionId, // Pass through if provided
        hooks: providerHooks, // Converted from Agent.hooks or from overrides
      }
    };
    ```
  - CONVERT: Agent.hooks to ProviderHookEvents format (if needed)
    - OR: Pass Agent.hooks directly and let provider handle conversion
    - Check AnthropicProvider.buildAgentSDKHooks() for reference
  - GOTCHA: Nested options structure, not flat parameters
  - DEPENDENCIES: Task 4

Task 6: REPLACE SDK query() call with provider.execute()
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts (line 567)
  - REMOVE: const q = query({ prompt: userMessage, options: sdkOptions });
  - REMOVE: for await (const message of q) { ... } message iteration loop
  - ADD: const response = await resolvedProvider.execute<T>(
      providerRequest,
      this.toolExecutor.bind(this), // Pass tool executor callback
      providerHooks // Optional hook events
    );
  - GOTCHA: Provider returns AgentResponse directly, no need to iterate
  - GOTCHA: Must use .bind(this) or arrow function to preserve context
  - DEPENDENCIES: Task 5

Task 7: REMOVE SDK message processing code
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts (lines 573-602)
  - REMOVE: Message iteration loop that processed SDK messages
  - REMOVE: Tool call counting from message stream
  - REMOVE: resultMessage capture logic
  - KEEP: Response validation (still needed but may be simpler)
  - REASON: Provider handles all message processing internally
  - DEPENDENCIES: Task 6

Task 8: SIMPLIFY response handling
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts (lines 607-703)
  - REMOVE: Complex result message parsing (provider returns AgentResponse)
  - KEEP: Response validation using prompt.safeValidateResponse()
  - KEEP: Error handling for provider errors
  - ADJUST: May need to set response.metadata.agentId to this.id instead of provider.id
  - PATTERN: Keep factory function usage (createSuccessResponse, createErrorResponse)
  - DEPENDENCIES: Task 6

Task 9: VERIFY cache integration works
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts (lines 465-495, 734-736)
  - VERIFY: Cache key generation still works with provider responses
  - VERIFY: Cache.get() before provider.execute() call
  - VERIFY: Cache.set() after successful response
  - NO CHANGES: Cache logic should work without modification
  - TEST: Ensure cache hits return correctly formatted AgentResponse
  - DEPENDENCIES: Task 8

Task 10: VERIFY tool executor integration
  - LOCATION: /home/dustin/projects/groundswell/src/core/agent.ts (lines 179-208)
  - VERIFY: toolExecutor is called by provider during tool execution
  - VERIFY: MCPHandler delegation works correctly
  - VERIFY: Tool results flow back through provider to Agent
  - TEST: Create test with tool-using prompt to verify delegation
  - DEPENDENCIES: Task 6
```

---

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Configuration Cascade with Prompt Overrides
// ============================================================
// From /src/utils/provider-config.ts (lines 338-363)

// In Agent.executePrompt(), after extracting overrides:
const globalConfig = getGlobalProviderConfig();

// Extract prompt-level provider override (if PromptOptions extended)
const promptProvider = overrides?.provider;
const promptOptions: ProviderOptions = {
  temperature: overrides?.temperature,
  maxTokens: overrides?.maxTokens,
  // ... other provider-specific options
};

// Resolve with cascade: prompt > agent > global
const { provider: resolvedProvider, options: resolvedOptions } = resolveProviderConfig(
  globalConfig,
  this.providerId,      // Agent-level provider
  this.providerOptions, // Agent-level options
  promptProvider,       // Prompt-level override (highest priority)
  promptOptions         // Prompt-level options (highest priority)
);

// ============================================================
// PATTERN 2: Provider Request Construction
// ============================================================
// CRITICAL: Nested structure, not flat parameters

const providerRequest: ProviderRequest = {
  prompt: userMessage, // From prompt.buildUserMessage()
  options: {
    model: effectiveModel, // Resolved from cascade
    systemPrompt: effectiveSystem, // From config or override
    tools: effectiveTools, // Merged from config, prompt, overrides
    sessionId: overrides?.sessionId, // Optional session identifier
    // NOTE: hooks may be converted here OR passed to provider
  }
};

// ============================================================
// PATTERN 3: Hook Conversion (Agent Hooks → Provider Hooks)
// ============================================================
// Agent.hooks uses array format: preToolUse?: HookHandler<PreToolUseContext>[]
// Provider hooks use single callback: onToolStart?: (tool) => Promise<void>

// Option A: Convert in Agent before calling provider
const providerHooks: ProviderHookEvents = {};
if (effectiveHooks.preToolUse && effectiveHooks.preToolUse.length > 0) {
  providerHooks.onToolStart = async (tool: ToolExecutionRequest) => {
    for (const hook of effectiveHooks.preToolUse) {
      await hook({
        toolName: tool.name,
        toolInput: tool.input,
        agentId: this.id,
      } as PreToolUseContext);
    }
  };
}
// Similar for postToolUse, sessionStart, sessionEnd

// Option B: Pass Agent.hooks directly and let provider handle conversion
// This is simpler but requires providers to understand Agent.hooks format
// Check AnthropicProvider.buildAgentSDKHooks() - it converts to SDK format

// ============================================================
// PATTERN 4: Provider Execution Call
// ============================================================
// BEFORE (direct SDK):
const q = query({ prompt: userMessage, options: sdkOptions });
for await (const message of q) {
  // Process messages...
}

// AFTER (provider abstraction):
const response = await resolvedProvider.execute<T>(
  providerRequest,
  this.toolExecutor.bind(this), // Tool executor callback
  providerHooks // Optional hook events
);

// GOTCHA: .bind(this) required to preserve Agent context
// GOTCHA: Type parameter T inferred from Prompt<T>

// ============================================================
// PATTERN 5: Tool Executor Callback
// ============================================================
// From /src/core/agent.ts (lines 179-208)

private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
  try {
    // 1. Check delegated MCPHandlers first (custom executors)
    for (const handler of this.mcpHandlers) {
      if (handler.hasTool(req.name)) {
        const toolResult = await handler.executeTool(req.name, req.input);
        return this.convertToToolExecutionResult(toolResult);
      }
    }

    // 2. Check main MCPHandler
    if (this.mcpHandler.hasTool(req.name)) {
      const toolResult = await this.mcpHandler.executeTool(req.name, req.input);
      return this.convertToToolExecutionResult(toolResult);
    }

    // 3. Tool not found
    return {
      content: `Tool '${req.name}' not found`,
      isError: true,
    };
  } catch (error) {
    // Never throws - wraps errors in result
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: `Tool execution error: ${message}`,
      isError: true,
    };
  }
}

// GOTCHA: Tool names use serverName__toolName format
// GOTCHA: Never throws - always returns ToolExecutionResult

// ============================================================
// PATTERN 6: Cache Integration (No Changes Needed)
// ============================================================
// From /src/core/agent.ts (lines 465-495)

// Cache key generation (before execution)
const cacheInputs: CacheKeyInputs = {
  user: prompt.buildUserMessage(),
  data: prompt.getData(),
  system: effectiveSystem,
  model: effectiveModel,
  temperature: effectiveTemperature,
  maxTokens: effectiveMaxTokens,
  tools: this.config.tools,
  mcps: this.config.mcps,
  skills: this.config.skills,
  responseFormat: prompt.getResponseFormat(),
};
const cacheKey = generateCacheKey(cacheInputs);

// Cache check
const cached = await defaultCache.get(cacheKey) as AgentResponse<T> | PromptResult<T> | null;
if (cached) {
  return convertPromptResultToAgentResponse(cached);
}

// ... provider execution ...

// Cache set (after successful execution)
if (cacheEnabled && cacheKey) {
  await defaultCache.set(cacheKey, validatedResponse, { prefix: this.id });
}

// GOTCHA: Use agent ID as cache prefix for invalidation
// GOTCHA: Cache key format is SHA-256 hash of inputs

// ============================================================
// PATTERN 7: Response Handling (Simplified)
// ============================================================
// BEFORE: Complex message iteration and result processing
// AFTER: Direct AgentResponse from provider

const response = await resolvedProvider.execute<T>(...);

// Provider returns AgentResponse directly - just validate
if (response.status === 'error') {
  // Handle error case
  return response; // Or wrap in additional error handling
}

// Validate structured output if prompt has schema
if (prompt.getResponseFormat()) {
  const validated = await prompt.safeValidateResponse(response.data);
  if (!validated.success) {
    return createErrorResponse(
      'VALIDATION_ERROR',
      `Response validation failed: ${validated.error.message}`,
    );
  }
  return createSuccessResponse(validated.data, response.metadata);
}

return response;

// GOTCHA: Provider already returns AgentResponse format
// GOTCHA: May need to adjust metadata.agentId to use this.id instead of provider.id
```

---

### Integration Points

```yaml
CONFIGURATION:
  - modify: src/types/agent.ts
  - add: PromptOverrides.provider?: ProviderId
  - add: PromptOverrides.providerOptions?: ProviderOptions
  - pattern: "Enable prompt-level provider override per PRD 7.7"

TOOL_EXECUTION:
  - modify: src/core/agent.ts (executePrompt method)
  - change: Pass this.toolExecutor to provider.execute()
  - pattern: "resolvedProvider.execute(request, this.toolExecutor.bind(this), hooks)"

CACHING:
  - no changes needed to cache infrastructure
  - verify: Cache key generation works with provider responses
  - verify: Cache.get/set logic works as before
  - pattern: "Existing LRU cache integration continues to work"

PROVIDER_REGISTRY:
  - use: ProviderRegistry.getInstance().get(resolvedProvider)
  - pattern: "Get provider instance for resolved provider ID"
  - gotcha: Resolved provider may differ from this.provider (prompt override)

HOOKS:
  - convert: Agent.hooks → ProviderHookEvents
  - or: Pass Agent.hooks directly and let provider convert
  - pattern: "Check AnthropicProvider.buildAgentSDKHooks() for reference"

SESSIONS:
  - pass through: overrides?.sessionId in ProviderExecutionOptions
  - pattern: "Provider handles session management internally"
  - gotcha: No Agent-level session management needed

ERROR_HANDLING:
  - keep: Existing error handling patterns
  - adjust: May need to handle Provider-specific errors
  - pattern: "Provider returns AgentResponse with error details"
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after making changes to agent.ts
# Navigate to project root
cd /home/dustin/projects/groundswell

# Type checking
npx tsc --noEmit src/core/agent.ts

# Linting
npm run lint -- src/core/agent.ts

# Formatting
npm run format -- src/core/agent.ts

# Full project type check (after all changes)
npm run type-check

# Expected: Zero type errors, zero lint errors. Fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing Agent tests to ensure no regression
npm test -- src/__tests__/unit/agent.test.ts

# Run provider tests to verify integration
npm test -- src/__tests__/unit/providers.test.ts

# Run cache tests to verify caching still works
npm test -- src/__tests__/unit/cache.test.ts

# Full test suite
npm test

# Expected: All tests pass. If failing, debug root cause.
# Focus on:
# - Agent.prompt() returns correct AgentResponse format
# - Tool execution delegates through toolExecutor
# - Cache hits/misses work correctly
# - Provider switching works (anthropic vs opencode)
```

### Level 3: Integration Testing (System Validation)

```bash
# Test 1: Basic prompt execution with Anthropic provider
cat > test-provider-integration.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';
import { z } from 'zod';

const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});

const prompt = new Prompt({
  user: 'What is 2 + 2?',
  responseFormat: z.object({ answer: z.number() }),
});

const result = await agent.prompt(prompt);
console.log('Status:', result.status);
console.log('Data:', result.data);
console.log('Provider ID:', result.metadata.agentId);

// Expected: success status, correct answer, agentId matches agent.id
EOF

npm run exec test-provider-integration.ts

# Test 2: Provider switching at prompt level
cat > test-provider-switching.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';
import { z } from 'zod';

const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});

const prompt = new Prompt({
  user: 'What is the capital of France?',
  responseFormat: z.object({ capital: z.string() }),
});

// Prompt-level provider override (if PromptOptions extended)
const result = await agent.prompt(prompt, {
  provider: 'opencode',
  model: 'anthropic/claude-opus-4-5-20251101',
});

console.log('Used provider:', result.metadata.agentId);

// Expected: Uses OpenCode provider despite agent default
EOF

npm run exec test-provider-switching.ts

# Test 3: Tool execution with provider delegation
cat > test-tool-execution.ts << 'EOF'
import { Agent, Prompt, tool } from './src/index.js';

const agent = new Agent({
  provider: 'anthropic',
  tools: [
    tool({
      name: 'calculator',
      description: 'Calculate math expressions',
      inputSchema: z.object({ expression: z.string() }),
      executor: async (input) => {
        return eval(input.expression); // Simple eval for test
      },
    }),
  ],
});

const prompt = new Prompt({
  user: 'What is 15 * 23?',
});

const result = await agent.prompt(prompt);
console.log('Tool calls:', result.metadata.toolCalls);
console.log('Answer:', result.data);

// Expected: Tool executes via toolExecutor, result contains answer
EOF

npm run exec test-tool-execution.ts

# Test 4: Cache functionality
cat > test-cache.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';

const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});

const prompt = new Prompt({
  user: 'What is the capital of Japan?',
  responseFormat: z.object({ capital: z.string() }),
});

// First call - cache miss
const start1 = Date.now();
const result1 = await agent.prompt(prompt);
const time1 = Date.now() - start1;

// Second call - cache hit
const start2 = Date.now();
const result2 = await agent.prompt(prompt);
const time2 = Date.now() - start2;

console.log('First call time:', time1, 'ms');
console.log('Second call time:', time2, 'ms');
console.log('Cache hit:', time2 < time1);

// Expected: Second call is faster (cache hit)
EOF

npm run exec test-cache.ts

# Expected: All integration tests pass with correct behavior
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test 1: Multi-provider scenario
cat > test-multi-provider.ts << 'EOF'
// Test agent can switch between providers dynamically
import { Agent, Prompt } from './src/index.js';

const anthropicAgent = new Agent({ provider: 'anthropic' });
const opencodeAgent = new Agent({ provider: 'opencode' });

const prompt = new Prompt({ user: 'Say hello' });

const anthropicResult = await anthropicAgent.prompt(prompt);
const opencodeResult = await opencodeAgent.prompt(prompt);

console.log('Anthropic agent ID:', anthropicResult.metadata.agentId);
console.log('OpenCode agent ID:', opencodeResult.metadata.agentId);

// Expected: Different agent IDs, both successful
EOF

npm run exec test-multi-provider.ts

# Test 2: Error handling from provider
cat > test-provider-errors.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';

const agent = new Agent({
  provider: 'anthropic',
  apiKey: 'invalid-key', // Trigger auth error
});

const prompt = new Prompt({ user: 'Test' });

const result = await agent.prompt(prompt);
console.log('Status:', result.status);
console.log('Error code:', result.error?.code);
console.log('Error message:', result.error?.message);

// Expected: error status, descriptive error details
EOF

npm run exec test-provider-errors.ts

# Test 3: Configuration cascade verification
cat > test-config-cascade.ts << 'EOF'
import { Agent, Prompt, configureProviders } from './src/index.js';

// Set global config
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { timeout: 30000, temperature: 0.7 },
    opencode: { timeout: 60000, temperature: 0.5 },
  },
});

// Agent with opencode override
const agent = new Agent({
  provider: 'opencode',
  providerOptions: { temperature: 0.3 }, // Agent-level override
});

const prompt = new Prompt({ user: 'Test cascade' });

// Verify config is resolved correctly
// Priority: prompt (none) > agent (opencode, temp=0.3) > global (opencode, temp=0.5)
const result = await agent.prompt(prompt);

console.log('Agent ID:', result.metadata.agentId);
console.log('Should use opencode provider with temp=0.3');

// Expected: Uses opencode provider with agent's temperature override
EOF

npm run exec test-config-cascade.ts

# Test 4: Performance verification
cat > test-performance.ts << 'EOF
import { Agent, Prompt } from './src/index.js';
import { performance } from 'perf_hooks';

const agent = new Agent({ provider: 'anthropic' });
const prompt = new Prompt({ user: 'Quick response' });

const iterations = 10;
const times: number[] = [];

for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  await agent.prompt(prompt);
  times.push(performance.now() - start);
}

const avg = times.reduce((a, b) => a + b, 0) / times.length;
const max = Math.max(...times);
const min = Math.min(...times);

console.log('Average time:', avg.toFixed(2), 'ms');
console.log('Min time:', min.toFixed(2), 'ms');
console.log('Max time:', max.toFixed(2), 'ms');

// Expected: Consistent performance, no significant degradation
EOF

npm run exec test-performance.ts

# Expected: All creative tests pass, demonstrating robustness
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No type errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] No formatting issues: `npm run format`

### Feature Validation

- [ ] Agent.prompt() executes via provider.execute() instead of direct SDK calls
- [ ] Configuration cascade works: global → agent → prompt level
- [ ] Tool execution delegates through toolExecutor callback
- [ ] LRU caching works with provider responses
- [ ] Both Anthropic and OpenCode providers can be used
- [ ] Prompt-level provider overrides work (if implemented)
- [ ] Session management passes through to providers
- [ ] Error handling works for provider errors

### Code Quality Validation

- [ ] Follows existing patterns from S1 (provider resolution) and S2 (tool executor)
- [ ] No new patterns introduced when existing ones work
- [ ] Agent public interface unchanged (backward compatible)
- [ ] Code is self-documenting with clear variable names
- [ ] Proper error messages for provider not found
- [ ] No hard-coded values, uses configuration cascade

### Documentation & Deployment

- [ ] Changes documented in commit message
- [ ] No breaking changes to Agent API
- [ ] Provider switching is transparent to users
- [ ] Cache behavior is consistent with previous implementation

---

## Anti-Patterns to Avoid

- ❌ Don't create new configuration patterns - use existing resolveProviderConfig()
- ❌ Don't bypass the toolExecutor - must delegate tool execution to MCPHandler
- ❌ Don't break existing cache logic - LRU cache should continue working
- ❌ Don't introduce new public methods - keep Agent interface unchanged
- ❌ Don't handle sessions in Agent - delegate to providers
- ❌ Don't ignore prompt-level overrides - must support provider switching at runtime
- ❌ Don't throw from toolExecutor - always return ToolExecutionResult with isError
- ❌ Don't modify Provider interface - implement against existing contract
- ❌ Don't hard-code provider-specific logic - use abstraction layer
- ❌ Don't skip validation - provider responses must still be validated

---

## Success Metrics

**Confidence Score: 9/10** for one-pass implementation success

**Rationale**:
- Comprehensive research provides complete context
- All type definitions and patterns documented
- Existing implementations (S1, S2) provide clear patterns to follow
- Cache integration requires no changes (low risk)
- Tool executor already implemented and tested
- Provider interface is stable and well-defined
- Only risk is hook conversion complexity (documented with options)

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to:
1. Understand the current Agent.prompt() implementation
2. Know exactly what changes to make (line-by-line)
3. Follow established patterns from related subtasks
4. Handle edge cases and gotchas documented
5. Validate implementation with specific test commands
