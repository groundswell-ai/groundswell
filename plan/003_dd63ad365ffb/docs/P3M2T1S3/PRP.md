# Product Requirement Prompt (PRP): P3.M2.T1.S3 - Implement execute() with multi-provider support

---

## Goal

**Feature Goal:** Implement the `execute()` method in OpenCodeProvider to support multi-provider LLM execution using the OpenCode SDK, with proper model parsing, session management, and hooks integration.

**Deliverable:** A fully implemented `async execute<T>()` method in `src/providers/opencode-provider.ts` that:
1. Accepts ProviderRequest with model field (may include provider prefix like 'openai/gpt-4')
2. Parses model using `parseModelSpec()` and extracts providerID/modelID
3. Calls OpenCode SDK `session.prompt()` with the model and prompt
4. Integrates hooks via Server-Sent Events subscription
5. Returns `AgentResponse<T>` with proper metadata

**Success Definition:**
- Method compiles without TypeScript errors
- Follows AnthropicProvider execute() pattern exactly
- Handles multi-provider model format (e.g., 'openai/gpt-4', 'anthropic/claude-opus-4')
- Integrates hooks via event subscription (not callback pattern)
- Returns AgentResponse with createSuccessResponse/createErrorResponse factory

---

## User Persona (if applicable)

**Target User:** Developer integrating Groundswell's multi-provider system

**Use Case:** Developer wants to execute LLM prompts using OpenCode's 75+ provider support without managing OpenCode server lifecycle directly

**User Journey:**
1. Developer initializes OpenCodeProvider (server starts automatically)
2. Developer calls `provider.execute()` with model like 'openai/gpt-4'
3. Provider parses model, creates session, executes prompt
4. Provider returns AgentResponse with LLM response and metadata

**Pain Points Addressed:**
- Multi-provider support without implementing separate provider classes
- Access to 75+ LLM models through single provider interface
- Native session management via OpenCode SDK

---

## Why

- **Multi-Provider Access:** OpenCode SDK provides access to 75+ LLM providers via unified interface (providerID/modelID format)
- **Provider Parity:** Completes OpenCodeProvider implementation to match AnthropicProvider functionality
- **Session Management:** Leverages OpenCode's native server-side session storage
- **Extended Thinking:** Supports reasoning tokens via OpenCode's ReasoningPart events
- **Integration with Existing System:** Follows established Provider interface pattern

---

## What

### Success Criteria

- [ ] `execute()` method accepts ProviderRequest with optional model field
- [ ] Model string is parsed using `normalizeModel()` (delegates to `parseModelSpec()`)
- [ ] Multi-provider format is supported: 'openai/gpt-4', 'anthropic/claude-opus-4', etc.
- [ ] OpenCode session is created or retrieved based on request.options.sessionId
- [ ] `client.session.prompt()` is called with parsed model and prompt
- [ ] Hooks are integrated via Server-Sent Events (not callbacks like Anthropic)
- [ ] Response is converted to AgentResponse using factory functions
- [ ] Token usage is extracted and returned in metadata
- [ ] Duration is tracked and included in metadata
- [ ] Error cases return proper ErrorResponse with descriptive codes

---

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Critical for understanding the decision

# Architecture Decision 3: OpenCode Implementation Strategy
- file: plan/003_dd63ad365ffb/docs/architecture/decisions.md
  why: Explains why OpenCode is being implemented despite architectural mismatches
  section: Decision 3 (lines 99-300+)
  critical: "Decision was to proceed with OpenCode as LLM-only provider (tools disabled)"
  gotcha: OpenCode executes tools server-side - toolExecutor parameter cannot be used

# OpenCode SDK API Documentation
- file: plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md
  why: Complete API reference for session.prompt(), event subscription, response types
  section: Section 5 (Session API), Section 10 (Real-Time Events), Section 7 (TypeScript Types)
  critical: "session.prompt() returns RequestResult<SessionPromptResponses> with UserMessage | AssistantMessage"
  gotcha: All types auto-generated from OpenAPI spec (complex nested types)

# OpenCode Execution Patterns Research
- file: plan/003_dd63ad365ffb/P3M2T1S3/research/opencode-execution-patterns.md
  why: Compiled patterns for multi-provider execution, session management, event streaming
  section: Section 2 (Session Execution API), Section 4 (Event Streaming), Section 8 (Complete Skeleton)
  critical: "Model format uses providerID/modelID string that needs to be split"
  gotcha: Session management is server-side, not in-memory like AnthropicProvider

# Tool Execution Research (CRITICAL)
- file: plan/003_dd63ad365ffb/P3M2T1S3/research/opencode-tool-execution-research.md
  why: Explains why toolExecutor parameter cannot be used and recommended approach
  section: Summary, LLM-Only Hybrid Mode
  critical: "OpenCode executes tools server-side with NO client-side delegation mechanism"
  gotcha: Implement as LLM-only provider - accept toolExecutor param but do NOT use it

# Codebase Patterns Reference
- file: plan/003_dd63ad365ffb/P3M2T1S3/research/codebase-patterns-reference.md
  why: Extracted patterns from AnthropicProvider.execute() that MUST be followed
  section: Section 1 (execute() Pattern), Section 2 (Response Factory), Section 9 (Error Handling)
  critical: "FOLLOW AnthropicProvider.execute() pattern EXACTLY for consistency"
  gotcha: Response factory pattern uses createSuccessResponse/createErrorResponse

# Reference Implementation
- file: src/providers/anthropic-provider.ts
  why: COMPLETE reference for execute() implementation - follow this pattern
  pattern: Lines 243-446 (execute method), lines 643-720 (buildAgentSDKHooks adapter)
  critical: "SDK initialization check, session management, model parsing, hooks integration"
  gotcha: OpenCode uses event subscription instead of callback hooks

# OpenCodeProvider Current State
- file: src/providers/opencode-provider.ts
  why: Existing class structure with initialize() and terminate() implemented
  pattern: Lines 49-112 (class structure), lines 126-221 (initialize), lines 232-260 (terminate)
  critical: "SDK lazy loading pattern, server lifecycle management, client reference storage"
  gotcha: execute() is currently a stub throwing "not implemented yet" error (line 279)

# Model Specification Utility
- file: src/utils/model-spec.ts
  why: parseModelSpec() function for parsing provider/model format
  pattern: Lines 104-168 (parseModelSpec implementation)
  critical: "Handles 'openai/gpt-4' format by splitting on first '/'"
  gotcha: Returns ModelSpec with provider, model, and raw fields

# Response Factory Functions
- file: src/types/agent.ts
  why: createSuccessResponse() and createErrorResponse() for proper response construction
  pattern: Lines 499-550 (createSuccessResponse), lines 552-615 (createErrorResponse)
  critical: "All responses MUST use these factory functions for PRD 6.4 compliance"
  gotcha: Error responses include recoverable flag for retry logic

# Provider Type Definitions
- file: src/types/providers.ts
  why: ProviderRequest, ProviderHookEvents, ToolExecutor, AgentResponse types
  pattern: Lines 120-130 (ProviderRequest), lines 78-97 (ProviderHookEvents)
  critical: "execute() signature requires these exact types"
  gotcha: ToolExecutor callback cannot be used due to OpenCode architecture

# Hooks Adapter Pattern
- file: plan/003_dd63ad365ffb/P3M2T1S3/research/hooks-adapter-research.md
  why: Explains how to adapt ProviderHookEvents to OpenCode's event system
  section: Section 4 (Mapping Strategy), Section 5 (Implementation Pattern)
  critical: "OpenCode uses Server-Sent Events, not callback hooks"
  gotcha: buildOpenCodeHooks() returns event config, not hook callbacks
```

### Current Codebase Context

**Provider System Status (from tasks.json):**
- Phase 1 (Provider Type System): ✅ Complete
- Phase 2 (Anthropic Provider): ✅ Complete
- Phase 3 (OpenCode Provider): ⏳ In Progress (P3.M2.T1.S1 ✅, P3.M2.T1.S2 ✅, P3.M2.T1.S3 → This Task)
- Phase 4 (Agent Integration): ⏳ Planned

**Key Files:**
```
src/
├── types/
│   ├── providers.ts           # Provider interface, ProviderRequest, ProviderHookEvents
│   └── agent.ts              # AgentResponse, createSuccessResponse, createErrorResponse
├── providers/
│   ├── anthropic-provider.ts  # REFERENCE IMPLEMENTATION - follow execute() pattern
│   ├── opencode-provider.ts   # TARGET FILE - implement execute() here
│   └── provider-registry.ts   # Provider lifecycle management
├── utils/
│   └── model-spec.ts         # parseModelSpec() for model parsing
```

**OpenCodeProvider Current State:**
```typescript
// src/providers/opencode-provider.ts (lines 273-280)
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  // STUB: Full implementation in P3.M2.T1.S3
  throw new Error("OpenCodeProvider.execute() not implemented yet");
}
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Tool Execution Limitation
// OpenCode executes tools server-side with NO client-side delegation
// The toolExecutor parameter CANNOT be used - accept it for interface compliance
// but DO NOT call it. Document this limitation clearly.

// CRITICAL: Multi-Provider Model Format
// OpenCode uses "providerID/modelID" format (e.g., "openai/gpt-4")
// parseModelSpec() handles this, but need to split for SDK call:
const [providerID, modelID] = modelSpec.model.split('/');

// CRITICAL: Session Management Difference
// Anthropic: In-memory Map<sessionId, SessionState>
// OpenCode: Server-side sessions with IDs stored on server
// Create session via client.session.create() and reuse sessionID

// CRITICAL: Hooks Integration Pattern
// Anthropic: Callback hooks passed to query() options
// OpenCode: Server-Sent Events via client.event.subscribe()
// Must set up event subscription and dispatch to ProviderHookEvents

// CRITICAL: Response Type Conversion
// OpenCode: RequestResult<SessionPromptResponses> with data: UserMessage | AssistantMessage
// Groundswell: AgentResponse<T> with createSuccessResponse/createErrorResponse
// Must convert between formats

// GOTCHA: Event Stream Cleanup
// Server-Sent Events need proper cleanup
// Store eventStream reference and close after execution
// Check SDK documentation for dispose/close pattern

// PATTERN: Follow AnthropicProvider.execute() Structure
// 1. SDK initialization check (if (!this.sdk) throw)
// 2. Session detection/retrieval
// 3. Model resolution via normalizeModel()
// 4. Hooks adapter (buildOpenCodeHooks)
// 5. Start time tracking
// 6. SDK execution call
// 7. Response conversion
// 8. Duration calculation
// 9. Return AgentResponse via factory

// GOTCHA: Idempotent initialize() Pattern
// Already implemented in OpenCodeProvider (lines 126-221)
// Execute() can assume client is initialized if SDK check passes

// GOTCHA: Lazy SDK Loading
// SDK is imported dynamically in initialize()
// Use 'this.sdk' for SDK type access (typeof import("@opencode-ai/sdk"))
```

---

## Implementation Blueprint

### Data models and structure

```typescript
// No new data models needed - use existing types

// FROM: src/types/providers.ts
// - ProviderRequest (already imported)
// - ProviderHookEvents (already imported)
// - ToolExecutor (already imported)

// FROM: src/types/agent.ts
// - AgentResponse<T> (already imported)
// - createSuccessResponse (already imported)
// - createErrorResponse (already imported)

// FROM: src/utils/model-spec.ts
// - parseModelSpec (already imported)
// - ModelSpec (already imported)
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: IMPLEMENT buildOpenCodeHooks() private method
  - CREATE: Private method in OpenCodeProvider class
  - IMPLEMENT: Convert ProviderHookEvents to event subscription configuration
  - FOLLOW: Partial pattern from buildAgentSDKHooks() (anthropic-provider.ts:643-720)
  - RETURN: { onToolStart?: boolean; onToolEnd?: boolean; onStream?: boolean; }
  - PLACEMENT: After terminate() method, before execute() method
  - NAMING: private buildOpenCodeHooks(hooks?: ProviderHookEvents)
  - GOTCHA: OpenCode uses events, not callbacks - return config, not hook functions

Task 2: IMPLEMENT SDK initialization check in execute()
  - ADD: Check for this.client !== null at start of execute()
  - THROW: Error "OpenCode provider not initialized" if client is null
  - FOLLOW: AnthropicProvider pattern (anthropic-provider.ts:248-252)
  - PLACEMENT: First lines of execute() method

Task 3: IMPLEMENT session creation/retrieval logic
  - ADD: Extract sessionId from request.options.sessionId
  - IMPLEMENT: If sessionId exists, reuse it (OpenCode sessions are server-side)
  - IMPLEMENT: If no sessionId, call client.session.create() to create new session
  - EXTRACT: session.data.id as sessionId
  - FOLLOW: AnthropicProvider session pattern (anthropic-provider.ts:254-275)
  - GOTCHA: OpenCode sessions persist on server, no in-memory Map needed

Task 4: IMPLEMENT model parsing and providerID/modelID extraction
  - CALL: this.normalizeModel(request.options.model ?? DEFAULT_MODEL)
  - DEFAULT: Use "claude-opus-4-5-20251101" as default (OpenCode's default model)
  - EXTRACT: Split modelSpec.model on '/' to get [providerID, modelID]
  - VALIDATE: Ensure split produced 2 parts, handle edge case
  - FOLLOW: AnthropicProvider pattern (anthropic-provider.ts:280-282)
  - GOTCHA: Model format is "openai/gpt-4", need to split for SDK

Task 5: IMPLEMENT start time tracking
  - ADD: const startTime = Date.now(); before SDK call
  - FOLLOW: AnthropicProvider pattern (anthropic-provider.ts:326)
  - PLACEMENT: After hooks setup, before session.prompt() call

Task 6: IMPLEMENT event subscription for hooks (if configured)
  - CHECK: If hooks are provided via request.options.hooks
  - CALL: this.buildOpenCodeHooks(hooks) to get event config
  - SUBSCRIBE: await this.client.event.subscribe() if any hooks configured
  - IMPLEMENT: Async event processing loop that dispatches to ProviderHookEvents
  - DISPATCH: onStream for text parts with delta, onSessionStart/End for lifecycle
  - FOLLOW: Hooks adapter research (P3M2T1S3/research/hooks-adapter-research.md Section 5)
  - GOTCHA: Events are async - may arrive after prompt() completes

Task 7: IMPLEMENT session.prompt() SDK call
  - CALL: await this.client.session.prompt({ body: { sessionID, message: request.prompt } })
  - PASS: sessionID from Task 3, message from request.prompt
  - STORE: result in variable for response conversion
  - FOLLOW: OpenCode execution patterns (opencode-execution-patterns.md Section 2)
  - GOTCHA: session.prompt() is synchronous (waits for completion)

Task 8: IMPLEMENT response conversion to AgentResponse
  - CHECK: if (!result.data || result.error) for error case
  - RETURN: createErrorResponse() for errors with descriptive code/message
  - EXTRACT: message as result.data (type: UserMessage | AssistantMessage)
  - CAST: message as T for response data
  - FOLLOW: Response factory pattern (agent.ts:499-615)
  - GOTCHA: Check for message.error field (ApiError, ProviderAuthError, etc.)

Task 9: IMPLEMENT duration calculation
  - CALCULATE: const duration = Date.now() - startTime;
  - PLACE: After SDK call completes, before return statement
  - FOLLOW: AnthropicProvider pattern (anthropic-provider.ts:400)

Task 10: IMPLEMENT token usage extraction
  - EXTRACT: From message.tokens: { input, output, reasoning, cache: { read, write } }
  - MAP: To TokenUsage format: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
  - HANDLE: Missing tokens field with default zeros
  - FOLLOW: AnthropicProvider pattern (anthropic-provider.ts:430-433)

Task 11: IMPLEMENT success response return
  - CALL: createSuccessResponse(data, metadata)
  - PASS: message as T data
  - PASS: { agentId: this.id, timestamp: Date.now(), duration, usage }
  - RETURN: AgentResponse<T>
  - FOLLOW: AnthropicProvider pattern (anthropic-provider.ts:439-445)

Task 12: ADD JSDoc comments and documentation
  - DOCUMENT: Method signature and parameters
  - EXPLAIN: Multi-provider model format support
  - NOTE: Tool execution limitation (LLM-only mode)
  - REFERENCE: OpenCode SDK session.prompt() API
  - FOLLOW: OpenCodeProvider existing comment style (lines 1-33)

Task 13: CREATE unit tests for execute() method
  - CREATE: src/__tests__/unit/providers/opencode-provider-execute.test.ts
  - TEST: SDK initialization check throws when not initialized
  - TEST: Session creation when no sessionId provided
  - TEST: Session reuse when sessionId provided
  - TEST: Model parsing with provider/model format
  - TEST: Success response conversion
  - TEST: Error response conversion
  - TEST: Hooks integration (mock event subscription)
  - FOLLOW: Existing test patterns (anthropic-provider.test.ts)
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: SDK Initialization Check
// ============================================
// FROM: src/providers/anthropic-provider.ts:248-252
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,  // NOTE: Cannot use due to OpenCode architecture
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  // CRITICAL: Validate client is initialized
  if (!this.client) {
    throw new Error("OpenCode provider not initialized. Call initialize() first.");
  }
  // ... rest of implementation
}

// ============================================
// PATTERN 2: Session Management (Server-Side)
// ============================================
// OpenCode sessions are stored on server, not in memory
// GOTCHA: Different from AnthropicProvider's in-memory Map

let sessionId = request.options.sessionId;

if (!sessionId) {
  // Create new session on server
  const sessionResult = await this.client.session.create({});
  sessionId = sessionResult.data.id;
}

// Use sessionId in prompt call
const result = await this.client.session.prompt({
  body: {
    sessionID: sessionId,
    message: request.prompt,
  },
});

// ============================================
// PATTERN 3: Model Parsing for Multi-Provider
// ============================================
// OpenCode uses "providerID/modelID" format
// parseModelSpec() handles the string, need to split for SDK

const modelSpec = this.normalizeModel(
  request.options.model ?? "claude-opus-4-5-20251101"
);

// Extract provider and model
const parts = modelSpec.model.split('/');
if (parts.length !== 2) {
  return createErrorResponse(
    "INVALID_MODEL_FORMAT",
    `Model must be in 'provider/model' format: ${modelSpec.model}`,
    { model: modelSpec.raw },
    false
  ) as AgentResponse<T>;
}
const [providerID, modelID] = parts;

// ============================================
// PATTERN 4: Hooks Adapter (Event-Based)
// ============================================
// Unlike Anthropic's callback hooks, OpenCode uses Server-Sent Events

private buildOpenCodeHooks(
  hooks?: ProviderHookEvents,
): {
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

// Event subscription in execute()
const hookConfig = this.buildOpenCodeHooks(request.options.hooks);

if (Object.keys(hookConfig).length > 0) {
  const eventStream = await this.client.event.subscribe();

  // Process events in background
  (async () => {
    for await (const event of eventStream) {
      if (event.type === 'message.part.updated') {
        const part = event.properties.part;

        // onStream: TextPart with delta
        if (request.options.hooks?.onStream && part.type === 'text' && event.properties.delta) {
          request.options.hooks.onStream(event.properties.delta);
        }
      }
    }
  })().catch((error) => {
    console.warn('Event stream error:', error);
  });
}

// ============================================
// PATTERN 5: Response Factory Usage
// ============================================
// FROM: src/types/agent.ts:499-615
import { createSuccessResponse, createErrorResponse } from "../types/agent.js";

// Success case
return createSuccessResponse(message as T, {
  agentId: this.id,
  timestamp: Date.now(),
  duration,
  usage: {
    inputTokens: message.tokens?.input ?? 0,
    outputTokens: message.tokens?.output ?? 0,
    cacheReadTokens: message.tokens?.cache?.read ?? 0,
    cacheWriteTokens: message.tokens?.cache?.write ?? 0,
  },
});

// Error case
return createErrorResponse(
  "EXECUTION_FAILED",
  message.error?.name + ": " + message.error?.data?.message ?? "Unknown error",
  { providerID: message.providerID, modelID: message.modelID },
  false
) as AgentResponse<T>;

// ============================================
// PATTERN 6: Duration Tracking
// ============================================
// FROM: src/providers/anthropic-provider.ts:326, 400

const startTime = Date.now();

// ... SDK call ...

const duration = Date.now() - startTime;

// ============================================
// CRITICAL: Tool Execution Limitation
// ============================================
// OpenCode executes tools server-side - toolExecutor cannot be used
// Document this clearly in the implementation

/**
 * Execute a prompt request
 *
 * @param request - Provider request with prompt and options
 * @param toolExecutor - Callback for executing tools (NOT USED - OpenCode limitation)
 * @param hooks - Optional lifecycle hooks
 * @returns Typed agent response
 * @remarks
 * **Tool Execution Limitation:** OpenCode executes tools server-side with no
 * client-side delegation mechanism. The toolExecutor parameter is accepted
 * for interface compliance but cannot be used. This provider operates in
 * LLM-only mode.
 *
 * Full implementation in P3.M2.T1.S3
 */
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,  // Accepted but not used
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  // ...
}
```

### Integration Points

```yaml
OPENCODE_SDK:
  - import: "@opencode-ai/sdk" (dynamic import in initialize())
  - client.session.create(): Create new session
  - client.session.prompt(): Execute prompt synchronously
  - client.event.subscribe(): Subscribe to Server-Sent Events
  - type: RequestResult<SessionPromptResponses>

MODEL_SPEC:
  - import: "../utils/model-spec.js"
  - function: parseModelSpec(model, defaultProvider)
  - return: ModelSpec { provider, model, raw }
  - usage: Split model on '/' for providerID/modelID extraction

RESPONSE_FACTORY:
  - import: "../types/agent.js"
  - function: createSuccessResponse(data, metadata)
  - function: createErrorResponse(code, message, details, recoverable)
  - return: AgentResponse<T>

PROVIDER_TYPES:
  - import: "../types/providers.js"
  - interface: ProviderRequest
  - interface: ProviderHookEvents
  - type: ToolExecutor
  - type: AgentResponse
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file creation - fix before proceeding
npx tsc --noEmit src/providers/opencode-provider.ts

# Expected: Zero TypeScript errors
# Common issues to fix:
# - Missing imports (add to existing imports)
# - Type mismatches (use proper type assertions)
# - Async/await errors (ensure proper Promise handling)

# Format check
npx prettier --check src/providers/opencode-provider.ts

# Fix formatting issues
npx prettier --write src/providers/opencode-provider.ts
```

**Validation Gates:**
- [ ] TypeScript compilation succeeds with zero errors
- [ ] No type assertion errors in execute() method
- [ ] Proper import of factory functions
- [ ] Correct type for generic parameter T

### Level 2: Unit Tests (Component Validation)

```bash
# Run execute() specific tests
npm test -- src/__tests__/unit/providers/opencode-provider-execute.test.ts

# Run all OpenCodeProvider tests
npm test -- src/__tests__/unit/providers/opencode-provider-*.test.ts

# Full provider tests
npm test -- src/__tests__/unit/providers/

# Expected: All tests pass
# Coverage goal: >80% for execute() method
```

**Validation Gates:**
- [ ] Test for SDK initialization check throws when not initialized
- [ ] Test for session creation when no sessionId provided
- [ ] Test for session reuse when sessionId provided
- [ ] Test for model parsing with "openai/gpt-4" format
- [ ] Test for success response with proper metadata
- [ ] Test for error response with descriptive error codes
- [ ] Test for hooks integration (event subscription mock)

### Level 3: Integration Testing (System Validation)

```bash
# Start OpenCode server manually (for integration testing)
npm install -g opencode
opencode --port 4096 &

# Or use embedded server (initialize() starts it)
node -e "
import { OpenCodeProvider } from './dist/providers/opencode-provider.js';
const provider = new OpenCodeProvider();
await provider.initialize();

const result = await provider.execute(
  { prompt: 'Hello', options: {} },
  async (req) => ({ content: 'mock', isError: false })
);
console.log(result);
"

# Expected: Successful execution with AgentResponse return
```

**Validation Gates:**
- [ ] Provider initializes successfully (server starts)
- [ ] Execute() accepts ProviderRequest
- [ ] Session is created via client.session.create()
- [ ] Prompt is executed via client.session.prompt()
- [ ] Response is converted to AgentResponse format
- [ ] Metadata includes duration and token usage

### Level 4: Multi-Provider Validation

```bash
# Test different provider/model combinations
node -e "
const provider = new OpenCodeProvider();
await provider.initialize();

// Test Anthropic model
const result1 = await provider.execute(
  { prompt: 'Test', options: { model: 'anthropic/claude-opus-4-5-20251101' } },
  mockToolExecutor
);
console.log('Anthropic:', result1.status);

// Test OpenAI model
const result2 = await provider.execute(
  { prompt: 'Test', options: { model: 'openai/gpt-5.1' } },
  mockToolExecutor
);
console.log('OpenAI:', result2.status);

// Test Google model
const result3 = await provider.execute(
  { prompt: 'Test', options: { model: 'google/gemini-3-pro-preview' } },
  mockToolExecutor
);
console.log('Google:', result3.status);
"

# Expected: All three models execute successfully
```

**Validation Gates:**
- [ ] Anthropic models execute (anthropic/claude-opus-4-5-20251101)
- [ ] OpenAI models execute (openai/gpt-5.1)
- [ ] Google models execute (google/gemini-3-pro-preview)
- [ ] Model parsing handles provider/model format correctly
- [ ] Each provider returns proper AgentResponse

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation succeeds with zero errors
- [ ] All unit tests pass: `npm test -- opencode-provider-execute.test.ts`
- [ ] No formatting issues: `npx prettier --check src/providers/opencode-provider.ts`
- [ ] Method signature matches Provider interface exactly

### Feature Validation

- [ ] Accepts ProviderRequest with prompt and options
- [ ] Parses model using normalizeModel() (delegates to parseModelSpec)
- [ ] Supports multi-provider format: 'openai/gpt-4', 'anthropic/claude-opus-4'
- [ ] Creates/retrieves OpenCode session based on sessionId
- [ ] Calls client.session.prompt() with sessionID and message
- [ ] Integrates hooks via event subscription (not callbacks)
- [ ] Returns AgentResponse using factory functions
- [ ] Includes duration in metadata
- [ ] Includes token usage in metadata (input, output, cache)
- [ ] Handles error cases with proper ErrorResponse

### Code Quality Validation

- [ ] Follows AnthropicProvider execute() pattern exactly
- [ ] Uses createSuccessResponse/createErrorResponse for all responses
- [ ] Has SDK initialization check at method start
- [ ] Has proper JSDoc comments documenting parameters and behavior
- [ ] Documents tool execution limitation clearly
- [ ] Error messages are descriptive and actionable
- [ ] Event subscription cleanup is handled (best-effort)

### Documentation & Deployment

- [ ] JSDoc comments explain multi-provider support
- [ ] Tool execution limitation is documented
- [ ] Method references OpenCode SDK session.prompt() API
- [ ] Implementation notes any architectural differences from AnthropicProvider

---

## Anti-Patterns to Avoid

- ❌ **Don't use toolExecutor callback** - OpenCode executes tools server-side, cannot delegate
- ❌ **Don't create in-memory session Map** - OpenCode sessions are server-side, use sessionID only
- ❌ **Don't use callback hooks pattern** - OpenCode uses Server-Sent Events, not callbacks
- ❌ **Don't skip SDK initialization check** - Must validate client is initialized
- ❌ **Don't hardcode model names** - Support multi-provider format via model option
- ❌ **Don't throw in execute() for expected errors** - Use createErrorResponse instead
- ❌ **Don't forget to split model string** - OpenCode needs providerID/modelID separately
- ❌ **Don't ignore event stream cleanup** - Close/dispose event subscription after use
- ❌ **Don't return raw SDK response** - Must convert to AgentResponse via factory
- ❌ **Don't skip duration tracking** - Essential for performance monitoring

---

## Success Metrics

**Confidence Score:** 9/10

**Rationale:**
- Comprehensive research completed with documented patterns
- Reference implementation (AnthropicProvider) provides proven pattern
- OpenCode SDK API fully documented with usage examples
- Architectural limitations clearly understood and documented
- Validation gates ensure quality implementation

**Validation:** The completed PRP enables implementation of execute() method that:
1. Follows established AnthropicProvider pattern exactly
2. Supports OpenCode's 75+ multi-provider format
3. Integrates hooks via Server-Sent Events
4. Returns proper AgentResponse with metadata
5. Documents architectural limitations clearly

---

## Appendix: Complete execute() Skeleton

```typescript
/**
 * Execute a prompt request
 *
 * @param request - Provider request with prompt and options
 * @param toolExecutor - Callback for executing tools (NOT USED - OpenCode limitation)
 * @param hooks - Optional lifecycle hooks
 * @returns Typed agent response
 * @throws {Error} When SDK is not initialized
 * @remarks
 * Full implementation in P3.M2.T1.S3
 *
 * **Tool Execution Limitation:** OpenCode executes tools server-side with no
 * client-side delegation mechanism. The toolExecutor parameter is accepted
 * for interface compliance but cannot be used. This provider operates in
 * LLM-only mode.
 */
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  // STEP 1: SDK initialization check
  if (!this.client) {
    throw new Error("OpenCode provider not initialized. Call initialize() first.");
  }

  // STEP 2: Session creation/retrieval
  let sessionId = request.options.sessionId;
  if (!sessionId) {
    const sessionResult = await this.client.session.create({});
    sessionId = sessionResult.data.id;
  }

  // STEP 3: Model parsing
  const modelSpec = this.normalizeModel(
    request.options.model ?? "claude-opus-4-5-20251101"
  );

  // STEP 4: Extract providerID and modelID
  const parts = modelSpec.model.split('/');
  if (parts.length !== 2) {
    return createErrorResponse(
      "INVALID_MODEL_FORMAT",
      `Model must be in 'provider/model' format: ${modelSpec.model}`,
      { model: modelSpec.raw },
      false
    ) as AgentResponse<T>;
  }
  const [providerID, modelID] = parts;

  // STEP 5: Hooks setup
  const hookConfig = this.buildOpenCodeHooks(hooks);
  // ... event subscription setup ...

  // STEP 6: Start time tracking
  const startTime = Date.now();

  // STEP 7: Execute prompt
  const result = await this.client.session.prompt({
    body: {
      sessionID: sessionId,
      message: request.prompt,
    },
  });

  // STEP 8: Calculate duration
  const duration = Date.now() - startTime;

  // STEP 9: Convert response
  if (!result.data || result.error) {
    return createErrorResponse(
      "EXECUTION_FAILED",
      result.error?.message ?? "Unknown error",
      { duration },
      false
    ) as AgentResponse<T>;
  }

  const message = result.data as AssistantMessage;

  // STEP 10: Extract token usage
  const usage = {
    inputTokens: message.tokens?.input ?? 0,
    outputTokens: message.tokens?.output ?? 0,
    cacheReadTokens: message.tokens?.cache?.read ?? 0,
    cacheWriteTokens: message.tokens?.cache?.write ?? 0,
  };

  // STEP 11: Return success response
  return createSuccessResponse(message as T, {
    agentId: this.id,
    timestamp: Date.now(),
    duration,
    usage,
  });
}

/**
 * Build OpenCode event handler configuration
 *
 * Unlike Anthropic SDK hooks (passed to query()), OpenCode uses
 * event subscriptions. This returns a configuration object
 * that execute() uses to set up event handlers.
 *
 * @param hooks - Optional provider hook events to adapt
 * @returns Event subscription configuration
 * @internal
 */
private buildOpenCodeHooks(
  hooks?: ProviderHookEvents,
): {
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

---

**End of PRP**
