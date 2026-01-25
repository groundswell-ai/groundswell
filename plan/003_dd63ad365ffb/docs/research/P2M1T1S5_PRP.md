# PRP: P2.M1.T1.S5 - Implement execute() method - query construction

**Session**: 003_dd63ad365ffb
**Work Item**: P2.M1.T1.S5
**Status**: Research Complete, Ready for Implementation
**Confidence Score**: 9/10

---

## Goal

**Feature Goal**: Implement the query construction portion of the `execute()` method in `AnthropicProvider`, building the SDK `AgentSDKOptions` object from `ProviderRequest` inputs and returning the `query()` AsyncGenerator for message iteration.

**Deliverable**: Partial `execute()` method implementation that:
1. Validates SDK initialization
2. Constructs the `AgentSDKOptions` object from `ProviderRequest`
3. Calls the SDK `query()` function with the constructed options
4. Returns the `AsyncGenerator<SDKMessage>` for message iteration (P2.M1.T1.S6)

**Success Definition**:
- `execute()` method compiles without TypeScript errors
- `AgentSDKOptions` object is constructed with all required fields from `ProviderRequest`
- SDK `query()` function is called correctly
- Returns `AsyncGenerator<SDKMessage>` ready for iteration in P2.M1.T1.S6
- Follows existing codebase patterns from `src/core/agent.ts`

---

## User Persona (if applicable)

**Target User**: None (Internal provider implementation)

**Use Case**: This is the core execution method for the AnthropicProvider that enables Agent instances to execute prompts through the Anthropic SDK.

**User Journey**: N/A (Internal implementation)

**Pain Points Addressed**:
- Provides unified provider interface for Agent class
- Enables multi-provider support (Anthropic and future OpenCode)
- Separates query construction from message iteration for testability

---

## Why

- **Provider Abstraction**: This is the core method that enables the multi-provider architecture defined in PRD Section 7
- **Agent Integration**: The Agent class will call `provider.execute()` instead of directly using the SDK
- **Type Safety**: Ensures proper type conversions between Provider interfaces and SDK types
- **Testability**: Separating query construction from message iteration allows focused unit testing

---

## What

Implement the query construction portion of `AnthropicProvider.execute()` method:

### Input Parameters
- `request: ProviderRequest` - Contains `prompt` (string) and `options` (model, systemPrompt, tools, hooks)
- `toolExecutor: ToolExecutor` - Callback for executing tools (delegated to Agent/MCPHandler)
- `hooks?: ProviderHookEvents` - Optional lifecycle hooks

### Core Logic
1. **SDK Validation**: Check if SDK is initialized, throw if not
2. **Model Resolution**: Use `this.normalizeModel()` to parse model specification
3. **Options Construction**: Build `AgentSDKOptions` object:
   - `model`: Map from `request.options.model`
   - `systemPrompt`: Map from `request.options.systemPrompt`
   - `allowedTools`: Map from `request.options.tools` → array of tool names
   - `mcpServers`: Will be added in P2.M1.T1.S7 (registerMCPs integration)
   - `hooks`: Convert `ProviderHookEvents` to SDK hook format (adapter in P2.M1.T2.S1)
4. **Query Execution**: Call `this.sdk.query({ prompt: request.prompt, options: sdkOptions })`
5. **Return**: Return the `AsyncGenerator<SDKMessage>` (message iteration in P2.M1.T1.S6)

### Success Criteria
- [ ] `execute()` method signature matches `Provider` interface
- [ ] SDK initialization check throws descriptive error if SDK not loaded
- [ ] `AgentSDKOptions` object constructed with all required fields
- [ ] Model resolution uses `normalizeModel()` for provider-qualified model strings
- [ ] Tools mapped to `allowedTools` array (string[])
- [ ] System prompt mapped correctly
- [ ] SDK `query()` called with correct parameters
- [ ] Returns `AsyncGenerator<SDKMessage>` type

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: **YES** - This PRP provides:
- Exact file locations and line numbers for all patterns to follow
- Complete code snippets from `src/core/agent.ts` showing query construction
- SDK type definitions and signatures
- Factory function patterns for response creation
- Error handling patterns with specific error codes
- Hook conversion patterns (adapter implementation in P2.M1.T2.S1)

### Documentation & References

```yaml
# MUST READ - Core patterns from existing Agent implementation
- file: src/core/agent.ts
  why: Complete reference implementation of query() construction and execution
  sections:
    - "Lines 320-326: Model and system prompt resolution patterns"
    - "Lines 383-385: Tools merging pattern"
    - "Lines 397-426: AgentSDKOptions construction (THE KEY PATTERN)"
    - "Lines 431: query() function call signature"
    - "Lines 437-466: Message iteration pattern (for P2.M1.T1.S6)"
    - "Lines 468-499: Result handling and error patterns"
  pattern: Use exact same options construction and query call pattern
  gotcha: Tools are mapped to allowedTools as string[] (not full tool objects)

# MUST READ - Provider interface and types
- file: src/types/providers.ts
  why: ProviderRequest, ProviderHookEvents, ToolExecutor type definitions
  sections:
    - "Lines 103-118: ProviderExecutionOptions interface"
    - "Lines 124-130: ProviderRequest interface"
    - "Lines 78-97: ProviderHookEvents interface"
    - "Lines 167-169: ToolExecutor type"
  pattern: Match exact parameter types and names
  gotcha: ProviderRequest has nested options object, not flat parameters

# MUST READ - AgentResponse factory functions
- file: src/types/agent.ts
  why: Response creation and error handling patterns
  sections:
    - "Lines 540-550: createSuccessResponse() function"
    - "Lines 595-615: createErrorResponse() function"
    - "Lines 442-493: AGENT_ERROR_CODES constants"
    - "Lines 284-339: AgentResponseMetadata interface"
  pattern: Use factory functions for all response creation
  gotcha: Always include metadata with agentId, timestamp, duration

# MUST READ - Existing AnthropicProvider patterns
- file: src/providers/anthropic-provider.ts
  why: Follow existing class structure and patterns
  sections:
    - "Lines 107-143: initialize() pattern (idempotent check, error handling)"
    - "Lines 154-169: terminate() pattern (idempotent check, cleanup)"
    - "Lines 246-259: normalizeModel() pattern (delegation + validation)"
  pattern: Follow same error handling, idempotent checks, and documentation style
  gotcha: Use this.sdk null check pattern for initialization validation

# MUST READ - SDK type definitions
- file: node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts
  why: Exact AgentSDKOptions and query() function signature
  sections:
    - "query() function signature: Returns Query (AsyncGenerator)"
    - "Options interface: All fields for AgentSDKOptions"
  pattern: Match exact type names and field names
  gotcha: query() returns AsyncGenerator<SDKMessage>, not Promise

# MUST READ - Hook adapter (P2.M1.T2.S1 - to be implemented)
- file: src/providers/anthropic-provider.ts (future)
  why: buildAgentSDKHooks() adapter function for hook conversion
  pattern: Converts ProviderHookEvents to SDK hook format
  gotcha: For P2.M1.T1.S5, hooks can be optional/placeholder (adapter in P2.M1.T2.S1)

# REFERENCE - MCPHandler integration (P2.M1.T1.S7)
- file: src/core/mcp-handler.ts
  why: toAgentSDKServer() pattern for MCP server conversion
  sections:
    - "Lines 167-213: toAgentSDKServer() implementation"
    - "Lines 180-204: sdkTool() usage pattern"
  pattern: MCP servers converted via toAgentSDKServer()
  gotcha: For P2.M1.T1.S5, mcpServers can be undefined (added in P2.M1.T1.S7)

# REFERENCE - Model spec parsing
- file: src/utils/model-spec.ts
  why: parseModelSpec() function for model string parsing
  sections:
    - "Lines 1-50: parseModelSpec() implementation"
  pattern: Use normalizeModel() to delegate to parseModelSpec()
  gotcha: normalizeModel() validates provider matches this.id

# RESEARCH DOCUMENTATION
- docfile: plan/003_dd63ad365ffb/docs/research/anthropic_agent_sdk_query_research.md
  why: Complete SDK query() function documentation and examples
  section: "Function Signature" and "AgentSDKOptions Interface"

- docfile: plan/003_dd63ad365ffb/P2M1T1S4/PRP.md
  why: Reference for normalizeModel() implementation pattern
  section: "Implementation Blueprint"

# ARCHITECTURE CONTEXT
- docfile: plan/003_dd63ad365ffb/docs/architecture/system_context.md
  why: Overall project architecture and provider system design
  section: "Provider System (Multi-Provider Support)"

- docfile: plan/003_dd63ad365ffb/delta_prd.md
  why: PRD requirements for provider system
  section: "Section 7 - Agent SDK Provider System"
```

### Current Codebase tree

```bash
src/
├── core/
│   ├── agent.ts                    # Reference: query() construction pattern
│   └── mcp-handler.ts              # Reference: toAgentSDKServer() pattern
├── providers/
│   ├── anthropic-provider.ts       # MODIFY: Implement execute() query construction
│   ├── provider-registry.ts        # Reference: Provider lifecycle management
│   └── index.ts                    # Public exports
├── types/
│   ├── providers.ts                # REFERENCE: ProviderRequest, ProviderHookEvents types
│   ├── agent.ts                    # REFERENCE: AgentResponse, factory functions
│   └── sdk-primitives.ts           # REFERENCE: Tool, MCPServer, Skill types
└── utils/
    └── model-spec.ts               # REFERENCE: parseModelSpec() for model resolution
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# No new files for P2.M1.T1.S5 - modifying existing file
src/
└── providers/
    └── anthropic-provider.ts       # MODIFY: Implement execute() query construction (lines 181-188)
                                      - SDK initialization check
                                      - AgentSDKOptions construction
                                      - SDK query() call
                                      - Return AsyncGenerator<SDKMessage>
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: SDK must be initialized before execute()
// Pattern from initialize() at lines 107-110: if (this.sdk) { return; }
// In execute(), throw error if SDK is null:
if (!this.sdk) {
  throw new Error('SDK not initialized. Call initialize() first.');
}

// CRITICAL: ProviderRequest has nested options object
// NOT: execute(request: ProviderRequest, model, systemPrompt, tools, hooks)
// BUT: execute(request: ProviderRequest) where request.options has model, systemPrompt, tools
interface ProviderRequest {
  prompt: string;
  options: ProviderExecutionOptions;  // Nested options!
}

// CRITICAL: Tools mapping is tool names (string[]), not full tool objects
// FROM: src/core/agent.ts:405-407
if (effectiveTools && effectiveTools.length > 0) {
  sdkOptions.allowedTools = effectiveTools.map((t) => t.name);  // String array!
}

// CRITICAL: MCP servers will be added in P2.M1.T1.S7 (registerMCPs)
// For P2.M1.T1.S5, mcpServers can be undefined in AgentSDKOptions
// Do not attempt to call registerMCPs() or build MCP servers in this subtask

// CRITICAL: Hook adapter (buildAgentSDKHooks) will be implemented in P2.M1.T2.S1
// For P2.M1.T1.S5, hooks can be optional/placeholder
// Do not implement full hook conversion in this subtask

// CRITICAL: query() returns AsyncGenerator<SDKMessage>, not Promise
// FROM: node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts
// The return type is Query, which is an AsyncGenerator<SDKMessage>
// Do not await the query() call - it returns the generator immediately

// CRITICAL: Model resolution uses normalizeModel() for provider validation
// FROM: src/providers/anthropic-provider.ts:246-259
const modelSpec = this.normalizeModel(request.options.model ?? 'claude-sonnet-4-20250514');
// This ensures provider-qualified model strings work correctly

// CRITICAL: Error handling uses AGENT_ERROR_CODES constants
// FROM: src/types/agent.ts:442-493
// Use createErrorResponse() with specific error codes for failures

// CRITICAL: System prompt mapping
// FROM: src/core/agent.ts:317-318
const effectiveSystem = prompt.systemOverride ?? overrides?.system ?? this.config.system;
// In execute(), map from request.options.systemPrompt directly

// CRITICAL: SDK is stateless - no client instance needed
// FROM: src/providers/anthropic-provider.ts:129-142
// The actual SDK client creation happens when execute() is called
// SDK manages its own resources internally

// CRITICAL: Type safety - execute() returns Promise<AgentResponse<T>>
// FROM: src/types/providers.ts:143-148
// For P2.M1.T1.S5, this is partial implementation - full response in P2.M1.T1.S6
```

---

## Implementation Blueprint

### Data models and structure

**No new data models for P2.M1.T1.S5** - using existing types:

```typescript
// FROM: src/types/providers.ts
interface ProviderRequest {
  prompt: string;
  options: ProviderExecutionOptions;
}

interface ProviderExecutionOptions {
  model?: string;
  systemPrompt?: string;
  tools?: Tool[];
  hooks?: ProviderHookEvents;
  sessionId?: string;  // Ignored for Anthropic (sessions: false)
}

// FROM: src/types/agent.ts
interface AgentResponse<T> {
  status: 'success' | 'error' | 'partial';
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

// FROM: @anthropic-ai/claude-agent-sdk
interface AgentSDKOptions {
  model?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  mcpServers?: Record<string, McpServerConfig>;  // P2.M1.T1.S7
  hooks?: Partial<Record<string, { hooks: HookCallback[] }>>;  // P2.M1.T2.S1
  outputFormat?: OutputFormat;
  // ... other optional fields
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VALIDATE SDK initialization in execute()
  - IMPLEMENT: Check if this.sdk is null, throw error if so
  - FOLLOW pattern: src/providers/anthropic-provider.ts:107-110 (initialize() idempotent check)
  - THROW: Error with message 'SDK not initialized. Call initialize() first.'
  - PLACEMENT: First line in execute() method body
  - DEPENDENCIES: None

Task 2: RESOLVE model specification using normalizeModel()
  - IMPLEMENT: const modelSpec = this.normalizeModel(request.options.model ?? 'claude-sonnet-4-20250514')
  - FOLLOW pattern: src/providers/anthropic-provider.ts:246-259 (normalizeModel() usage)
  - DEFAULT: 'claude-sonnet-4-20250514' if model not provided (from src/core/agent.ts:320)
  - PLACEMENT: After SDK validation, before options construction
  - DEPENDENCIES: Task 1

Task 3: CONSTRUCT AgentSDKOptions object
  - IMPLEMENT: const sdkOptions: AgentSDKOptions = { ... }
  - FOLLOW pattern: src/core/agent.ts:397-426 (EXACT pattern)
  - FIELDS:
    - model: modelSpec.model (string)
    - systemPrompt: request.options.systemPrompt (string | undefined)
    - allowedTools: request.options.tools?.map(t => t.name) (string[] | undefined)
    - hooks: undefined (placeholder for P2.M1.T2.S1)
    - mcpServers: undefined (placeholder for P2.M1.T1.S7)
  - PLACEMENT: After model resolution, before query call
  - DEPENDENCIES: Task 2

Task 4: CALL SDK query() function
  - IMPLEMENT: const query = this.sdk.query({ prompt: request.prompt, options: sdkOptions })
  - FOLLOW pattern: src/core/agent.ts:431 (EXACT call signature)
  - RETURN TYPE: AsyncGenerator<SDKMessage> (not Promise!)
  - PLACEMENT: After options construction
  - DEPENDENCIES: Task 3

Task 5: RETURN AsyncGenerator for message iteration
  - IMPLEMENT: return query (for now - P2.M1.T1.S6 will iterate and build AgentResponse)
  - TEMPORARY: Cast as AgentResponse<T> to satisfy interface (full implementation in P2.M1.T1.S6)
  - COMMENT: Add "// TODO: P2.M1.T1.S6 - Iterate messages and build AgentResponse"
  - PLACEMENT: Last line of execute() method
  - DEPENDENCIES: Task 4

Task 6: ADD TypeScript type imports
  - IMPLEMENT: Import SDK types from @anthropic-ai/claude-agent-sdk
  - IMPORTS: query, type AgentSDKOptions, type SDKMessage
  - PLACEMENT: Top of src/providers/anthropic-provider.ts with other imports
  - DEPENDENCIES: None (can do in parallel with Task 1)
```

### Implementation Patterns & Key Details

```typescript
// PATTERN: SDK initialization check (follow initialize() pattern)
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents
): Promise<AgentResponse<T>> {
  // CRITICAL: Validate SDK is loaded (follow initialize() pattern at lines 107-110)
  if (!this.sdk) {
    throw new Error('SDK not initialized. Call initialize() first.');
  }

  // PATTERN: Model resolution using normalizeModel()
  // FROM: src/providers/anthropic-provider.ts:246-259
  const modelSpec = this.normalizeModel(
    request.options.model ?? 'claude-sonnet-4-20250514'  // Default model
  );

  // PATTERN: AgentSDKOptions construction (EXACT pattern from src/core/agent.ts:397-426)
  const sdkOptions: AgentSDKOptions = {
    // Model mapping
    model: modelSpec.model,

    // System prompt mapping (from src/core/agent.ts:317-318)
    systemPrompt: request.options.systemPrompt,

    // Tools mapping to allowedTools (string[])
    // CRITICAL: Map tool objects to tool names (from src/core/agent.ts:405-407)
    ...(request.options.tools && request.options.tools.length > 0 && {
      allowedTools: request.options.tools.map((t) => t.name),
    }),

    // MCP servers (placeholder for P2.M1.T1.S7)
    // mcpServers: undefined,

    // Hooks (placeholder for P2.M1.T2.S1)
    // hooks: undefined,
  };

  // PATTERN: SDK query() call (EXACT pattern from src/core/agent.ts:431)
  const queryResult = this.sdk.query({
    prompt: request.prompt,
    options: sdkOptions,
  });

  // TODO: P2.M1.T1.S6 - Iterate messages and build AgentResponse
  // FOR NOW: Return temporary response to satisfy interface
  // FROM: src/types/agent.ts:540-550 (createSuccessResponse pattern)
  return {
    status: 'success',
    data: queryResult as T,  // Temporary cast - will iterate in P2.M1.T1.S6
    error: null,
    metadata: {
      agentId: this.id,
      timestamp: Date.now(),
    },
  } satisfies AgentResponse<T>;
}

// GOTCHA: query() returns AsyncGenerator<SDKMessage>, not Promise<AgentResponse<T>>
// Do NOT await the query() call - it returns the generator synchronously
// The actual async iteration happens in P2.M1.T1.S6 with "for await (const message of queryResult)"

// GOTCHA: ProviderRequest has nested options object
// Access model via request.options.model (not request.model)
// Access systemPrompt via request.options.systemPrompt (not request.systemPrompt)
// Access tools via request.options.tools (not request.tools)

// GOTCHA: Tools are mapped to tool names only
// The SDK uses allowedTools: string[] to auto-approve tools
// Full tool definitions are provided via mcpServers (P2.M1.T1.S7)

// CRITICAL: Type safety
// Use "satisfies AgentResponse<T>" for compile-time validation
// Import types from SDK: "import { query, type AgentSDKOptions, type SDKMessage } from '@anthropic-ai/claude-agent-sdk'"
```

### Integration Points

```yaml
IMPORTS:
  - add to: src/providers/anthropic-provider.ts (line 38-50 section)
  - pattern: |
    import {
      query,
      type AgentSDKOptions,
      type SDKMessage,
    } from '@anthropic-ai/claude-agent-sdk';

TYPE_IMPORTS:
  - add to: src/providers/anthropic-provider.ts (line 38-50 section)
  - already imported: Provider, ProviderRequest, ToolExecutor, ProviderHookEvents, ModelSpec
  - pattern: No additional type imports needed (all from providers.ts)

HOOK_ADAPTER:
  - future: P2.M1.T2.S1 - buildAgentSDKHooks() adapter function
  - placeholder: hooks: undefined in AgentSDKOptions for now
  - integration: Will call adapter in P2.M1.T2.S1

MCP_SERVERS:
  - future: P2.M1.T1.S7 - registerMCPs() integration
  - placeholder: mcpServers: undefined in AgentSDKOptions for now
  - integration: Will build mcpServers from registered MCPs in P2.M1.T1.S7

MESSAGE_ITERATION:
  - future: P2.M1.T1.S6 - Iterate AsyncGenerator and build AgentResponse
  - placeholder: Return queryResult as temporary data field
  - integration: Will replace return with full message iteration in P2.M1.T1.S6
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file modification - fix before proceeding
npx tsc --noEmit src/providers/anthropic-provider.ts  # TypeScript type checking
npx eslint src/providers/anthropic-provider.ts        # Linting (if ESLint configured)
npx prettier --check src/providers/anthropic-provider.ts  # Formatting check

# Project-wide validation
npm run type-check  # Or: npx tsc --noEmit
npm run lint        # Or: npx eslint src/
npm run format:check  # Or: npx prettier --check src/

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
# Common TypeScript errors:
# - TS2307: Cannot find module '@anthropic-ai/claude-agent-sdk' → Check import path
# - TS2345: Argument of type 'X' is not assignable to parameter of type 'Y' → Check type casting
# - TS2322: Type 'X' is not assignable to type 'Y' → Use "satisfies" or "as" for temporary cast
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test AnthropicProvider execute() query construction
npm test -- src/__tests__/unit/providers/anthropic-provider.test.ts

# Specific test scenarios (manual verification for P2.M1.T1.S5):
# - Test SDK initialization check throws error when SDK not loaded
# - Test model resolution uses normalizeModel()
# - Test AgentSDKOptions object construction with all fields
# - Test tools mapping to allowedTools string array
# - Test system prompt mapping
# - Test query() function called with correct parameters
# - Test returns AsyncGenerator<SDKMessage> (temporary AgentResponse wrapper)

# Full provider test suite
npm test -- src/__tests__/unit/providers/

# Coverage validation (if coverage tools available)
npm test -- --coverage src/providers/

# Expected: All tests pass. If failing, debug root cause and fix implementation.
# Note: For P2.M1.T1.S5, tests may be partial (full testing in P2.M1.T1.S6)
```

### Level 3: Integration Testing (System Validation)

```bash
# Test with actual Anthropic SDK (requires API key)
npm test -- src/__tests__/integration/provider-anthropic.test.ts

# Manual integration test:
# node -e "
# import { AnthropicProvider } from './dist/providers/anthropic-provider.js';
# const provider = new AnthropicProvider();
# await provider.initialize({ apiKey: 'sk-test-key' });
# const result = await provider.execute(
#   { prompt: 'Hello', options: { model: 'claude-sonnet-4' } },
#   async (req) => ({ content: 'mock', isError: false })
# );
# console.log(result);
# "

# Expected: Query construction succeeds, AsyncGenerator returned
# Note: Full integration testing requires P2.M1.T1.S6 (message iteration) completion
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual verification of query construction:
# 1. Log the constructed sdkOptions object
# console.log('Constructed AgentSDKOptions:', JSON.stringify(sdkOptions, null, 2));

# 2. Verify query() call signature matches SDK documentation
# Compare: this.sdk.query({ prompt, options }) with node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts

# 3. Type narrowing verification
# Use "satisfies AgentSDKOptions" to validate constructed object at compile time

# 4. Temporary response validation (P2.M1.T1.S5 only)
# Verify temporary AgentResponse satisfies interface (will be replaced in P2.M1.T1.S6)

# Expected: Query options match SDK expectations, temporary response compiles
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation successful: `npx tsc --noEmit`
- [ ] No linting errors: `npm run lint`
- [ ] No formatting issues: `npm run format:check`
- [ ] execute() method signature matches Provider interface
- [ ] SDK initialization check throws descriptive error
- [ ] Model resolution uses normalizeModel() correctly
- [ ] AgentSDKOptions object constructed with all required fields
- [ ] Tools mapped to allowedTools string array
- [ ] System prompt mapped correctly
- [ ] SDK query() called with correct signature
- [ ] Returns type that satisfies AgentResponse<T> (temporary)

### Feature Validation

- [ ] SDK not initialized error thrown when this.sdk is null
- [ ] Model specification parsed correctly (plain and qualified formats)
- [ ] Default model 'claude-sonnet-4-20250514' used when model not provided
- [ ] Tools array correctly mapped to tool names
- [ ] System prompt passed through correctly
- [ ] query() function receives correct parameters
- [ ] AsyncGenerator returned for message iteration
- [ ] Temporary AgentResponse wrapper compiles (for P2.M1.T1.S5)

### Code Quality Validation

- [ ] Follows existing AnthropicProvider patterns (initialize, terminate, normalizeModel)
- [ ] Follows src/core/agent.ts query construction pattern exactly
- [ ] Error handling uses descriptive error messages
- [ ] Type imports added for SDK types
- [ ] Comments added for TODO items (P2.M1.T1.S6, P2.M1.T2.S1, P2.M1.T1.S7)
- [ ] No unused variables or imports
- [ ] Proper use of "satisfies" operator for type safety

### Documentation & Deployment

- [ ] JSDoc comments added to execute() method (if not present)
- [ ] TODO comments added for future subtasks
- [ ] Implementation notes added for gotchas and patterns
- [ ] Code is self-documenting with clear variable names

---

## Anti-Patterns to Avoid

- ❌ **Don't access ProviderRequest fields directly**: Use `request.options.model`, not `request.model`
- ❌ **Don't map full tool objects**: Use `tools.map(t => t.name)` for `allowedTools`, not full tool definitions
- ❌ **Don't implement MCP server conversion**: That's P2.M1.T1.S7 - use `mcpServers: undefined` placeholder
- ❌ **Don't implement hook conversion**: That's P2.M1.T2.S1 - use `hooks: undefined` placeholder
- ❌ **Don't await the query() call**: It returns `AsyncGenerator<SDKMessage>` synchronously, not a Promise
- ❌ **Don't implement message iteration**: That's P2.M1.T1.S6 - return temporary AgentResponse for now
- ❌ **Don't skip SDK initialization check**: Always validate `this.sdk` is not null before using it
- ❌ **Don't hardcode model values**: Use `request.options.model ?? 'claude-sonnet-4-20250514'` pattern
- ❌ **Don't use sync error handling**: Use try/catch for async operations, throw descriptive errors
- ❌ **Don't create new SDK client instance**: SDK is stateless, use `this.sdk.query()` directly

---

## Research Notes Stored

Research documentation for this PRP is stored at:
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P2M1T1S5/research/`

Key research files:
- `agent-query-pattern.md` - Complete query() construction analysis from src/core/agent.ts
- `anthropic-provider-patterns.md` - Existing AnthropicProvider implementation patterns
- `agent-response-factory-patterns.md` - Response creation and error handling patterns
- `sdk-tool-integration.md` - createSdkMcpServer and sdkTool function signatures
- `architecture-context.md` - PRD and system context for provider system

---

## Dependencies

### Direct Dependencies (Must be complete)
- ✅ **P1.M1.T1.S1-S5**: Provider type definitions (Provider, ProviderRequest, ProviderHookEvents)
- ✅ **P1.M1.T2.S1**: parseModelSpec() function for model resolution
- ✅ **P2.M1.T1.S1**: AnthropicProvider class structure
- ✅ **P2.M1.T1.S2**: initialize() method for SDK loading
- ✅ **P2.M1.T1.S4**: normalizeModel() method for model validation

### Same-Task Dependencies
- 🔜 **P2.M1.T1.S6**: Message iteration and AgentResponse building (depends on this subtask)
- 🔜 **P2.M1.T1.S7**: MCP server registration and mcpServers integration
- 🔜 **P2.M1.T2.S1**: Hook adapter (buildAgentSDKHooks) implementation

### Downstream Tasks
- 🔜 **P4.M2.T1.S3**: Agent.prompt() refactoring to use provider.execute()
- 🔜 **P5.M1.T3.S2**: Testing AnthropicProvider execute() method

---

## Success Metrics

**Confidence Score**: 9/10

**Justification**:
- Complete reference implementation available in `src/core/agent.ts`
- All type definitions and patterns documented with exact line numbers
- SDK documentation and examples available locally
- Existing AnthropicProvider patterns well-established
- Clear separation between query construction (this subtask) and message iteration (next subtask)

**Remaining Risk**:
- SDK query() function may have undocumented behaviors not captured in local type definitions
- Hook adapter and MCP server integration may require adjustments to options construction

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to implement the query construction successfully using only the PRP content and codebase access.
