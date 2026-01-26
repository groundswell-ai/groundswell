name: "Test AnthropicProvider execute() method"
description: |

---

## Goal

**Feature Goal**: Write comprehensive unit tests for `AnthropicProvider.execute()` method that verify SDK query construction, tool execution delegation, message iteration, session management, response formatting, and error handling.

**Deliverable**: Test file at `src/__tests__/unit/providers/anthropic-provider-execute.test.ts` with passing tests covering all execute() scenarios including AsyncGenerator mocking for SDK query().

**Success Definition**:

* All tests pass when running `npm test`
* Tests verify SDK query() is called with correct options (model, systemPrompt, allowedTools, mcpServers, hooks)
* Tests confirm tool execution is delegated via toolExecutor callback
* Tests validate message iteration captures result from AsyncGenerator<SDKMessage>
* Tests confirm ProviderResult format matches AgentResponse structure
* Tests verify error handling converts SDK errors to AgentResponse with status='error'
* Tests cover session management (new session, continuation, history streaming)
* Tests cover streaming mode (AsyncGenerator<StreamEvent> return)
* Code coverage for execute() method is ≥ 90%

## User Persona

**Target User**: Developer working on the Groundswell provider system

**Use Case**: Ensuring AnthropicProvider.execute() works correctly for all execution paths before production usage

**User Journey**:

1. Developer implements AnthropicProvider.execute() per P2.M1.T1.S5-S6
2. Developer writes tests to verify implementation
3. Tests catch bugs during development (shift-left testing)
4. Tests serve as documentation for expected behavior
5. Future code changes are validated against tests

**Pain Points Addressed**:

* Manual testing of provider execution requires actual API calls (slow, expensive)
* AsyncGenerator mocking is complex - tests demonstrate correct patterns
* Session management edge cases are hard to test manually
* Error handling paths rarely execute in happy path testing
* Streaming mode behavior needs verification without real SDK

## Why

* **Testing Best Practices**: Unit tests catch bugs early and serve as living documentation
* **AsyncGenerator Safety**: Validates SDK query() AsyncGenerator mocking pattern works correctly
* **Session Management Confidence**: Tests ensure session state is managed correctly across executions
* **Error Handling Validation**: Confirms SDK errors are properly converted to AgentResponse format
* **Refactoring Confidence**: Tests ensure execute() behavior is preserved during code changes
* **Onboarding**: New developers understand execution behavior by reading tests

## What

Test suite for `AnthropicProvider.execute()` method covering:

### 1. Basic Execution Flow

* SDK initialization check (throws if not initialized)
* Simple prompt without tools or sessions
* SDK query() construction with correct options
* Message iteration over AsyncGenerator<SDKMessage>
* AgentResponse construction with correct metadata

### 2. SDK Options Construction

* Model mapping via normalizeModel()
* System prompt injection with buildSystemPromptWithSkills()
* Tools mapping to allowedTools array
* MCP servers inclusion when configured
* Hooks conversion via buildAgentSDKHooks()
* Session continue flag for continuation

### 3. Tool Execution

* Tools in options trigger allowedTools mapping
* Tool call counting from assistant messages
* Tool execution via toolExecutor callback (delegation pattern)
* Tool results not directly handled by provider (SDK manages)

### 4. Message Iteration

* Iteration over AsyncGenerator<SDKMessage> from query()
* Assistant message processing (text, tool_use blocks)
* User message capture for session history
* Result message extraction (type: 'result')
* Subtype validation (success vs error subtypes)

### 5. Session Management

* New session creation (lazy creation on first execute)
* Session retrieval via getSession()
* Session continuation detection (existing history)
* Session history streaming via streamInput()
* User message accumulation in session.history
* Last result storage in session.lastResult

### 6. Response Formatting

* Success response with data from structured_output or result
* Error response for missing result message
* Error response for error subtypes (error_during_execution, error_max_turns)
* Usage extraction (input_tokens, output_tokens)
* Duration calculation from start time
* Metadata construction (agentId, timestamp, duration, usage, toolCalls)

### 7. Error Handling

* SDK not initialized throws Error
* Missing result message returns createErrorResponse()
* Error subtype returns createErrorResponse() with EXECUTION_FAILED
* Recoverable flag set based on subtype (error_max_turns is recoverable)
* Error details included (subtype, errors array)

### 8. Streaming Mode

* Streaming enabled returns AsyncGenerator<StreamEvent>
* Delegates to executeStreaming() method
* StreamEvent types: text_delta, tool_call_start, tool_call_done, usage, done, error
* Final return value is AgentResponse

### Success Criteria

* [ ] All test cases pass with `npm test`
* [ ] Tests cover happy path and edge cases
* [ ] Tests use proper AsyncGenerator mocking for SDK query()
* [ ] Tests validate both implementation and type safety
* [ ] Code coverage ≥ 90% for execute() method
* [ ] Tests demonstrate correct AsyncGenerator mocking patterns

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
* Exact file paths and line numbers for all references
* Complete AsyncGenerator mocking patterns from codebase
* Type definitions for all interfaces used
* Test structure patterns from existing tests
* Specific mock implementations for SDK query()
* Expected behavior for all execution paths

### Documentation & References

```yaml
# PRIMARY IMPLEMENTATION - Source Code
- file: src/providers/anthropic-provider.ts
  why: AnthropicProvider.execute() method implementation (lines 248-456)
  pattern: SDK init check, streaming mode detection, session management, SDK options construction, query() call, message iteration, response construction
  gotcha: query() returns AsyncGenerator<SDKMessage> synchronously (not awaited), streamInput() for session continuation

# EXECUTE STREAMING - Streaming Mode Implementation
- file: src/providers/anthropic-provider.ts
  why: executeStreaming() method (lines 473-676) - called when request.options.streaming = true
  pattern: Returns AsyncGenerator<StreamEvent>, yields metadata, text_delta, tool_call_start, tool_call_done, usage, done, error events
  gotcha: Final return value is AgentResponse<T>, not yielded

# EXISTING TEST PATTERN - Initialization Tests
- file: src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
  why: THIS IS THE REFERENCE TEST PATTERN - follow this structure
  pattern: describe() blocks grouped by feature area, beforeEach() for setup, @ts-expect-error for private property access, ProviderRegistry._resetForTesting() for isolation
  gotcha: Tests access private sdk field using // @ts-expect-error comments

# ASYNC GENERATOR MOCKING - Codebase Pattern
- file: src/__tests__/unit/agent-stream-provider-override.test.ts
  why: EXCELLENT AsyncGenerator mocking pattern (lines 42-50, 307-314, 465-473)
  pattern: vi.fn().mockImplementation(async function* () { yield ...; return ... })
  gotcha: Use async function* syntax (not function*), consume generators with for await...of

# ASYNC GENERATOR RESEARCH - Comprehensive Guide
- file: research/async-generator-mocking-best-practices.md
  why: Complete best practices for mocking AsyncGenerator in Vitest
  section: Pattern 1 (lines 24-42), Pattern 2 (lines 50-64), Common Pitfalls (list 0-3)
  gotcha: Always use async function* syntax, always consume generators, clear mocks between tests

# ASYNC GENERATOR QUICK REFERENCE
- file: research/async-generator-mocking-summary.md
  why: Condensed reference for AsyncGenerator mocking
  section: Essential Code Patterns (code.0-2), Common Pitfalls (code.3-6)
  critical: Basic template: vi.fn().mockImplementation(async function* () { yield ...; return ... })

# TYPE DEFINITIONS - Provider Types
- file: src/types/providers.ts
  why: ProviderRequest, ProviderExecutionOptions, ToolExecutor, ProviderHookEvents type definitions
  pattern: ProviderRequest has prompt: string and options: ProviderExecutionOptions; ToolExecutor is callback type
  gotcha: ToolExecutor delegates to MCPHandler - provider does not create its own

# TYPE DEFINITIONS - Agent Response Types
- file: src/types/agent.ts
  why: AgentResponse<T>, AgentErrorDetails, AgentResponseMetadata, createSuccessResponse(), createErrorResponse()
  pattern: AgentResponse has status, data, error, metadata; Factory functions for response creation
  gotcha: Use createSuccessResponse() and createErrorResponse() - don't construct directly

# TYPE DEFINITIONS - Streaming Types
- file: src/types/streaming.ts
  why: StreamEvent discriminated union for streaming events
  pattern: StreamEvent types: text_delta, text_done, tool_call_start, tool_call_delta, tool_call_done, usage, metadata, done, error
  gotcha: Streaming returns AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>

# TYPE DEFINITIONS - SDK Primitives
- file: src/types/sdk-primitives.ts
  why: Tool, MCPServer, Skill, AgentHooks types for SDK integration
  pattern: Tool has name, inputSchema, description; MCPServer has transport, command, args
  gotcha: SDK query() expects specific format for tools and MCP servers

# TEST FRAMEWORK CONFIGURATION
- file: vitest.config.ts
  why: Vitest configuration with test file patterns and globals enabled
  pattern: Test files match '**/*.test.ts', globals enabled (no need to import describe/it/expect)
  gotcha: Tests must be in src/__tests__/ directory to be picked up

# PROVIDER REGISTRY - Singleton Pattern
- file: src/providers/provider-registry.ts
  why: ProviderRegistry manages provider lifecycle, has _resetForTesting() for test isolation
  pattern: getInstance() for singleton, register(), initializeProvider(), _resetForTesting()
  gotcha: Always call ProviderRegistry._resetForTesting() in beforeEach() to avoid test interference

# NORMALIZE MODEL - Method Reference
- file: src/providers/anthropic-provider.ts
  why: normalizeModel() method (lines 227-246) - called in execute()
  pattern: Parses model string, returns ModelSpec with provider, model, raw
  gotcha: Uses parseModelSpec() utility from src/utils/model-spec.ts

# BUILD AGENT SDK HOOKS - Method Reference
- file: src/providers/anthropic-provider.ts
  why: buildAgentSDKHooks() method (lines 199-220) - converts ProviderHookEvents to SDK hooks
  pattern: Maps onToolStart, onToolEnd, onSessionStart, onSessionEnd, onStream to SDK AgentHooks
  gotcha: Returns empty object if no hooks provided

# BUILD SYSTEM PROMPT WITH SKILLS - Method Reference
- file: src/providers/anthropic-provider.ts
  why: buildSystemPromptWithSkills() method (lines 188-197) - injects loaded skills
  pattern: Prepends skill definitions to systemPrompt if skills are loaded
  gotcha: Skills are stored in this.skills field (private)

# SESSION STATE MANAGEMENT - Internal Methods
- file: src/providers/anthropic-provider.ts
  why: getSession(), createSession() methods (lines 140-156) - manage session state
  pattern: Sessions stored in Map<string, SessionState>; createSession() initializes empty session
  gotcha: Session creation is lazy - only created when sessionId is provided in request

# PRP TEMPLATE - Reference For Structure
- docfile: plan/003_dd63ad365ffb/docs/PRP-P5M1T3S1.md
  why: PRP template with test structure patterns, mock strategies, validation loops
  section: Goal, What, Implementation Blueprint, Validation Loop
  pattern: Follow this structure for comprehensive test PRP

# PACKAGE.JSON - SDK Dependency
- file: package.json
  why: Confirm @anthropic-ai/claude-agent-sdk version and availability
  pattern: SDK is installed as dependency (not devDependency)
  gotcha: SDK exports: query, createSdkMcpServer, tool
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── providers/
│   ├── anthropic-provider.ts          # PRIMARY: execute() implementation
│   ├── opencode-provider.ts           # Reference: alternate provider implementation
│   └── provider-registry.ts           # Provider lifecycle management
├── types/
│   ├── providers.ts                   # ProviderRequest, ToolExecutor, ProviderHookEvents
│   ├── agent.ts                       # AgentResponse, createSuccessResponse, createErrorResponse
│   ├── streaming.ts                   # StreamEvent for streaming mode
│   └── sdk-primitives.ts              # Tool, MCPServer, Skill types
├── utils/
│   └── model-spec.ts                  # parseModelSpec() utility
└── __tests__/
    └── unit/
        └── providers/
            ├── anthropic-provider-initialize.test.ts    # REFERENCE: test pattern
            └── anthropic-provider-execute.test.ts       # OUTPUT: new test file

plan/003_dd63ad365ffb/
├── docs/
│   └── PRP-P5M1T3S1.md                # PRP template reference
├── P5M1T3S2/
│   ├── PRP.md                         # OUTPUT: this file
│   └── research/                      # OUTPUT: research documentation
└── tasks.json                          # Owned by orchestrator (READ-ONLY)

research/
├── async-generator-mocking-best-practices.md    # AsyncGenerator mocking guide
└── async-generator-mocking-summary.md           # Quick reference
```

### Desired Codebase Tree with Files to be Added

```bash
src/__tests__/unit/providers/
├── anthropic-provider-initialize.test.ts    # EXISTS: reference pattern
└── anthropic-provider-execute.test.ts        # CREATE: tests for execute() method

plan/003_dd63ad365ffb/P5M1T3S2/
├── PRP.md                                   # CREATE: this file
└── research/
    └── execute-testing-patterns.md          # CREATE: research summary for execute() testing
```

### Known Gotchas of our Codebase & Library Quirks

```typescript
// CRITICAL: SDK query() returns AsyncGenerator<SDKMessage> SYNCHRONOUSLY
// Do NOT await the query() call - it returns the generator immediately
// BAD: const result = await this.sdk.query(...)
// GOOD: const queryResult = this.sdk.query(...)

// CRITICAL: AsyncGenerator mocking requires async function* syntax
// BAD: mock.mockImplementation(function* () { ... })
// GOOD: mock.mockImplementation(async function* () { ... })

// CRITICAL: Always consume AsyncGenerator with for await...of in tests
// If you don't consume the generator, it never executes
// BAD: const stream = provider.execute(...); expect(stream).toBeTruthy()
// GOOD: for await (const event of stream) { events.push(event); }

// CRITICAL: Use // @ts-expect-error comments for private property access
// This is the accepted pattern for testing private fields
// @ts-expect-error - Testing private property
expect(provider.sdk).not.toBeNull();

// CRITICAL: Always reset ProviderRegistry state between tests
// Without this, tests can interfere with each other
beforeEach(() => {
  ProviderRegistry._resetForTesting();
});

// CRITICAL: Session continuation requires BOTH continue: true AND streamInput()
// Setting continue: true alone is insufficient - must also call streamInput()
// See lines 310-371 in anthropic-provider.ts for the pattern

// CRITICAL: Agent SDK message types from query() AsyncGenerator
// Messages can be: { type: 'assistant', message: {...} }
//                { type: 'user', message: {...} }
//                { type: 'result', subtype: 'success', result: {...}, usage: {...} }
//                { type: 'result', subtype: 'error_during_execution' | 'error_max_turns', errors: [...] }

// CRITICAL: Result message extraction happens at end of iteration
// The last message in the AsyncGenerator is always type: 'result'
// If no result message, return createErrorResponse()

// CRITICAL: Tool execution is delegated to SDK via hooks
// Provider does NOT directly execute tools - SDK handles tool use and results
// Tool execution happens via onToolStart/onToolEnd hooks if provided

// CRITICAL: Streaming mode delegates to executeStreaming()
// When request.options.streaming = true, execute() returns executeStreaming() result
// executeStreaming() yields StreamEvent objects, returns AgentResponse at end

// CRITICAL: System prompt injection via buildSystemPromptWithSkills()
// If skills are loaded (this.skills), they are prepended to system prompt
// Skills format: "Available tools:\n{json}\n\n{original_system_prompt}"

// CRITICAL: MCP servers config expects specific format
// mcpServers: { "server-name": { transport: "stdio" | "sse", command: "...", args: [...] } }

// CRITICAL: Duration calculation uses Date.now() - startTime
// startTime is captured before query() call (line 337)
// Duration is included in response metadata

// CRITICAL: Tool call counting happens during message iteration
// Count tool_use blocks in assistant message content arrays
// Stored in toolCallCount variable, included in metadata

// CRITICAL: vi.clearAllMocks() between tests
// Prevents mock state from leaking between tests
// Use in afterEach() or at start of beforeEach()
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed - tests use existing types:

```typescript
// Existing types used in tests
import type { ProviderRequest, ProviderExecutionOptions, ToolExecutor, ProviderHookEvents } from '../../../types/providers.js';
import type { AgentResponse } from '../../../types/agent.js';
import type { StreamEvent } from '../../../types/streaming.js';
import type { Tool } from '../../../types/sdk-primitives.js';

// Mock SDK types (from @anthropic-ai/claude-agent-sdk)
type SDKMessage =
  | { type: 'assistant'; message: { content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown }> } }
  | { type: 'user'; message: { content: string }; session_id?: string }
  | { type: 'result'; subtype: 'success' | 'error_during_execution' | 'error_max_turns'; result?: unknown; structured_output?: unknown; usage?: { input_tokens: number; output_tokens: number }; errors?: string[] };

type SDKQueryResult = AsyncGenerator<SDKMessage> & {
  streamInput(generator: AsyncGenerator<SDKMessage>): Promise<void>;
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/unit/providers/anthropic-provider-execute.test.ts
  - IMPLEMENT: Test file structure following anthropic-provider-initialize.test.ts pattern
  - FOLLOW pattern: describe() blocks grouped by feature area
  - NAMING: File name matches pattern: anthropic-provider-execute.test.ts
  - PLACEMENT: src/__tests__/unit/providers/

Task 2: IMPLEMENT beforeEach() Setup
  - IMPLEMENT: beforeEach() to create fresh AnthropicProvider instance
  - IMPLEMENT: ProviderRegistry._resetForTesting() for test isolation
  - IMPLEMENT: vi.clearAllMocks() to clean mock state
  - FOLLOW pattern: anthropic-provider-initialize.test.ts lines 24-28
  - GOTCHA: Must call ProviderRegistry._resetForTesting() before creating provider

Task 3: IMPLEMENT SDK Initialization Check Tests
  - IMPLEMENT: Test execute() throws when SDK not initialized
  - VERIFY: Error message is "SDK not initialized. Call initialize() first."
  - FOLLOW pattern: await expect(provider.execute(...)).rejects.toThrow("SDK not initialized")
  - GOTCHA: Provider must be initialized before execute() can be called

Task 4: IMPLEMENT SDK Mock with AsyncGenerator for query()
  - IMPLEMENT: Mock this.sdk.query to return AsyncGenerator<SDKMessage>
  - IMPLEMENT: Mock queryResult.streamInput for session continuation tests
  - FOLLOW pattern: research/async-generator-mocking-summary.md code.0
  - CRITICAL: Use async function* syntax for mock implementation
  - GOTCHA: Access private sdk field with // @ts-expect-error

Task 5: IMPLEMENT Basic Execution Flow Tests
  - IMPLEMENT: Test simple prompt execution with mocked SDK
  - VERIFY: sdk.query is called with correct prompt and options
  - VERIFY: AgentResponse is returned with correct status and data
  - VERIFY: Metadata includes agentId, timestamp, duration
  - FOLLOW pattern: anthropic-provider-initialize.test.ts SDK Import Success section
  - GOTCHA: Mock must yield assistant message and result message

Task 6: IMPLEMENT SDK Options Construction Tests
  - IMPLEMENT: Test model mapping via normalizeModel()
  - IMPLEMENT: Test system prompt injection with buildSystemPromptWithSkills()
  - IMPLEMENT: Test tools mapping to allowedTools array
  - IMPLEMENT: Test MCP servers inclusion
  - IMPLEMENT: Test hooks conversion
  - IMPLEMENT: Test session continue flag
  - VERIFY: sdk.query is called with expected options
  - FOLLOW pattern: capture query call arguments and assert on structure
  - GOTCHA: Options are conditional - only included when not empty

Task 7: IMPLEMENT Tool Execution Tests
  - IMPLEMENT: Test tools in options trigger allowedTools mapping
  - IMPLEMENT: Test tool call counting from assistant messages
  - IMPLEMENT: Test multiple tool_use blocks are counted correctly
  - VERIFY: toolCallCount in metadata reflects number of tool uses
  - GOTCHA: Tool execution is delegated to SDK - provider only counts

Task 8: IMPLEMENT Message Iteration Tests
  - IMPLEMENT: Test iteration over AsyncGenerator<SDKMessage>
  - IMPLEMENT: Test assistant message processing (text, tool_use)
  - IMPLEMENT: Test user message capture for session history
  - IMPLEMENT: Test result message extraction
  - IMPLEMENT: Test subtype validation
  - VERIFY: Correct message types are processed correctly
  - GOTCHA: Mock must yield multiple messages in sequence

Task 9: IMPLEMENT Session Management Tests
  - IMPLEMENT: Test new session creation (lazy creation)
  - IMPLEMENT: Test session retrieval for existing session
  - IMPLEMENT: Test session continuation detection
  - IMPLEMENT: Test session history streaming via streamInput()
  - IMPLEMENT: Test user message accumulation
  - IMPLEMENT: Test last result storage
  - VERIFY: Session state is managed correctly
  - GOTCHA: Session continuation requires streamInput() call

Task 10: IMPLEMENT Response Formatting Tests
  - IMPLEMENT: Test success response with structured_output
  - IMPLEMENT: Test success response with result (fallback)
  - IMPLEMENT: Test usage extraction (input_tokens, output_tokens)
  - IMPLEMENT: Test duration calculation
  - IMPLEMENT: Test metadata construction
  - VERIFY: AgentResponse matches expected format
  - GOTCHA: Prefer structured_output over result

Task 11: IMPLEMENT Error Handling Tests
  - IMPLEMENT: Test missing result message returns error response
  - IMPLEMENT: Test error_during_execution subtype
  - IMPLEMENT: Test error_max_turns subtype (recoverable)
  - IMPLEMENT: Test error details inclusion (subtype, errors)
  - VERIFY: Error responses have correct status and error details
  - GOTCHA: error_max_turns should have recoverable: true

Task 12: IMPLEMENT Streaming Mode Tests
  - IMPLEMENT: Test streaming enabled returns AsyncGenerator
  - IMPLEMENT: Test StreamEvent types (text_delta, tool_call_start, etc.)
  - IMPLEMENT: Test final return value is AgentResponse
  - VERIFY: Streaming mode delegates to executeStreaming()
  - GOTCHA: Streaming returns AsyncGenerator, not Promise<AgentResponse>

Task 13: CREATE research/execute-testing-patterns.md
  - IMPLEMENT: Research summary document for execute() testing
  - INCLUDE: AsyncGenerator mocking patterns specific to SDK query()
  - INCLUDE: Session state management testing patterns
  - INCLUDE: Error scenario testing patterns
  - REFERENCE: research/async-generator-mocking-summary.md structure
```

### Implementation Patterns & Key Details

```typescript
// ========== MOCK SDK SETUP ==========
// CRITICAL: Mock the SDK query() method to return AsyncGenerator<SDKMessage>
// Pattern from research/async-generator-mocking-summary.md code.0

// @ts-expect-error - Testing private property
provider.sdk = {
  query: vi.fn().mockImplementation(({ prompt, options }) => {
    // Return AsyncGenerator that yields SDK messages
    return (async function* () {
      // Yield assistant message with text content
      yield {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello world' }
          ]
        }
      };

      // Yield user message for session history
      yield {
        type: 'user',
        message: { content: 'User response' },
        session_id: 'test-session'
      };

      // Yield final result message
      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'test result' },
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();
  }),
  createSdkMcpServer: vi.fn(),
  tool: vi.fn()
};

// ========== MOCK WITH streamInput FOR SESSION CONTINUATION ==========
// CRITICAL: For session continuation tests, mock streamInput() method

// @ts-expect-error - Testing private property
provider.sdk = {
  query: vi.fn().mockImplementation(({ prompt, options }) => {
    const mockGenerator = (async function* () {
      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'test' },
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();

    // Add streamInput mock for session continuation
    mockGenerator.streamInput = vi.fn().mockResolvedValue(undefined);

    return mockGenerator;
  }),
  // ...
};

// ========== TEST BASIC EXECUTION ==========
it('should execute prompt and return AgentResponse', async () => {
  await provider.initialize();

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const toolExecutor = vi.fn();

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('success');
  expect(response.data).toBeDefined();
  expect(response.metadata.agentId).toBe('anthropic');
  expect(response.metadata.timestamp).toBeGreaterThan(0);
  expect(response.metadata.duration).toBeGreaterThan(0);
});

// ========== TEST SDK OPTIONS CONSTRUCTION ==========
it('should build correct SDK options from ProviderRequest', async () => {
  await provider.initialize();

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'You are a helpful assistant',
      tools: [
        { name: 'test_tool', inputSchema: { type: 'object' }, description: 'Test tool' }
      ]
    }
  };

  const toolExecutor = vi.fn();

  await provider.execute(request, toolExecutor);

  // @ts-expect-error - Testing private property
  const queryCall = provider.sdk.query.mock.calls[0];
  const { prompt: queryPrompt, options: sdkOptions } = queryCall[0];

  expect(queryPrompt).toBe('Test prompt');
  expect(sdkOptions.model).toBe('claude-sonnet-4-20250514');
  expect(sdkOptions.systemPrompt).toContain('You are a helpful assistant');
  expect(sdkOptions.allowedTools).toEqual(['test_tool']);
});

// ========== TEST SESSION MANAGEMENT ==========
it('should create new session on first execute with sessionId', async () => {
  await provider.initialize();

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { sessionId: 'test-session' }
  };

  const toolExecutor = vi.fn();

  await provider.execute(request, toolExecutor);

  // @ts-expect-error - Testing private property
  const session = provider.getSession('test-session');

  expect(session).toBeDefined();
  expect(session?.history).toBeDefined();
});

// ========== TEST SESSION CONTINUATION ==========
it('should detect continuation and call streamInput', async () => {
  await provider.initialize();

  // Create existing session with history
  const request: ProviderRequest = {
    prompt: 'First message',
    options: { sessionId: 'test-session' }
  };

  const toolExecutor = vi.fn();

  // First execution creates session
  await provider.execute(request, toolExecutor);

  // Mock streamInput for continuation
  // @ts-expect-error - Testing private property
  provider.sdk.query.mockImplementation(() => {
    const gen = (async function* () {
      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'continuation' },
        usage: { input_tokens: 50, output_tokens: 25 }
      };
    })();
    gen.streamInput = vi.fn().mockResolvedValue(undefined);
    return gen;
  });

  // Second execution is continuation
  const continuationRequest: ProviderRequest = {
    prompt: 'Second message',
    options: { sessionId: 'test-session' }
  };

  await provider.execute(continuationRequest, toolExecutor);

  // Verify streamInput was called
  // @ts-expect-error - Testing private property
  const queryResult = await provider.sdk.query.mock.results[0].value;
  expect(queryResult.streamInput).toHaveBeenCalled();
});

// ========== TEST ERROR HANDLING ==========
it('should return error response when result message is missing', async () => {
  await provider.initialize();

  // Mock SDK that doesn't yield result message
  // @ts-expect-error - Testing private property
  provider.sdk.query.mockImplementation(() => {
    return (async function* () {
      yield {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'No result' }] }
      };
      // Generator ends without result message
    })();
  });

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const toolExecutor = vi.fn();

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('INVALID_RESPONSE_FORMAT');
});

// ========== TEST ERROR SUBTYPE ==========
it('should handle error_during_execution subtype', async () => {
  await provider.initialize();

  // Mock SDK with error result
  // @ts-expect-error - Testing private property
  provider.sdk.query.mockImplementation(() => {
    return (async function* () {
      yield {
        type: 'result',
        subtype: 'error_during_execution',
        errors: ['Tool execution failed']
      };
    })();
  });

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const toolExecutor = vi.fn();

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('EXECUTION_FAILED');
  expect(response.error?.recoverable).toBe(false);
});

// ========== TEST STREAMING MODE ==========
it('should return AsyncGenerator when streaming is enabled', async () => {
  await provider.initialize();

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { streaming: true }
  };

  const toolExecutor = vi.fn();

  const result = provider.execute(request, toolExecutor);

  // Verify result is AsyncGenerator
  expect(result).toBeDefined();

  // Consume stream
  const events: StreamEvent[] = [];
  for await (const event of result) {
    events.push(event);
  }

  // Verify events were yielded
  expect(events.length).toBeGreaterThan(0);
});
```

### Integration Points

```yaml
PROVIDER_REGISTRY:
  - reset: "Call ProviderRegistry._resetForTesting() in beforeEach()"
  - pattern: "ProviderRegistry._resetForTesting()"

SDK_DEPENDENCY:
  - mock: "Mock @anthropic-ai/claude-agent-sdk query() method"
  - pattern: "provider.sdk.query.mockImplementation(async function* () { ... })"

TYPE_IMPORTS:
  - from: "src/types/providers.js"
  - imports: "ProviderRequest, ToolExecutor, ProviderHookEvents"

TYPE_IMPORTS:
  - from: "src/types/agent.js"
  - imports: "AgentResponse, createSuccessResponse, createErrorResponse"

TYPE_IMPORTS:
  - from: "src/types/streaming.js"
  - imports: "StreamEvent"

TYPE_IMPORTS:
  - from: "src/types/sdk-primitives.js"
  - imports: "Tool"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after test file creation - fix before proceeding
npm run test -- --run anthropic-provider-execute.test.ts

# Project-wide validation
npm run test

# Expected: All tests pass. If failing, READ output and fix implementation.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test execute() method specifically
npm run test -- --run anthropic-provider-execute.test.ts

# Full provider test suite
npm run test -- --run anthropic-provider-initialize.test.ts anthropic-provider-execute.test.ts

# Coverage validation
npm run test -- --coverage

# Expected: All tests pass. If failing, debug root cause and fix test or mock.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all provider tests together
npm run test -- --run src/__tests__/unit/providers/

# Run all unit tests
npm run test -- --run src/__tests__/unit/

# Expected: No test interference, all tests pass.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual testing of execute() behavior
# Create a test script that uses real Anthropic provider with mocked SDK
node -e "
const { AnthropicProvider } = require('./dist/providers/anthropic-provider.js');
const provider = new AnthropicProvider();
await provider.initialize();
console.log('Provider initialized, execute() ready for testing');
"

# Performance testing (if needed)
npm run test -- --run anthropic-provider-execute.test.ts --reporter=verbose

# Expected: Manual testing confirms execute() behavior matches test expectations.
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] Tests follow anthropic-provider-initialize.test.ts pattern

### Feature Validation

- [ ] SDK initialization check tested (throws when not initialized)
- [ ] SDK options construction tested (model, systemPrompt, tools, mcpServers, hooks)
- [ ] Tool execution delegation tested (toolExecutor callback)
- [ ] Message iteration tested (AsyncGenerator<SDKMessage> consumption)
- [ ] Response formatting tested (AgentResponse structure)
- [ ] Error handling tested (missing result, error subtypes)
- [ ] Session management tested (new session, continuation, history)
- [ ] Streaming mode tested (AsyncGenerator<StreamEvent> return)

### Code Quality Validation

- [ ] Follows existing test patterns from anthropic-provider-initialize.test.ts
- [ ] AsyncGenerator mocking uses async function* syntax
- [ ] Mocks are cleared between tests with vi.clearAllMocks()
- [ ] ProviderRegistry state reset with _resetForTesting()
- [ ] Private property access uses // @ts-expect-error comments

### Documentation & Deployment

- [ ] Test file has descriptive header comment
- [ ] describe() blocks group related tests
- [ ] it() test names are descriptive
- [ ] Research documentation created at research/execute-testing-patterns.md

---

## Anti-Patterns to Avoid

- ❌ Don't use `function*` instead of `async function*` for AsyncGenerator mocks
- ❌ Don't forget to consume AsyncGenerator with `for await...of` in tests
- ❌ Don't skip clearing mocks between tests (use `vi.clearAllMocks()`)
- ❌ Don't forget to reset ProviderRegistry state in `beforeEach()`
- ❌ Don't access private properties without `// @ts-expect-error` comments
- ❌ Don't mock execute() directly - test the real implementation
- ❌ Don't skip testing session continuation (it requires streamInput mock)
- ❌ Don't skip testing error subtypes (error_during_execution, error_max_turns)
- ❌ Don't skip testing streaming mode (it returns different type)
- ❌ Don't assume SDK query() is awaited - it returns AsyncGenerator synchronously

## Confidence Score

**Score**: 9/10

**Rationale**:
* Comprehensive context provided with exact file paths and line numbers
* AsyncGenerator mocking patterns well-documented from codebase research
* Existing test patterns clearly identified and referenced
* All execution paths covered with specific test scenarios
* Session management patterns documented with gotchas
* Error handling paths specified
* One point deduction: execute() is a complex method with many edge cases - some may emerge during implementation that weren't anticipated

**Validation**: The completed PRP should enable an AI agent unfamiliar with the codebase to implement comprehensive tests for the AnthropicProvider.execute() method successfully using only the PRP content and codebase access.
