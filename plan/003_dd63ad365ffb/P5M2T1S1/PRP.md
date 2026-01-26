# Product Requirement Prompt (PRP): Test Agent with Anthropic Provider

**Task ID**: P5.M2.T1.S1
**Phase**: P5 - Testing & Documentation
**Milestone**: M5.2 - Integration Tests
**Story Points**: 2
**Status**: Ready for Implementation

---

## Goal

**Feature Goal**: Create comprehensive integration tests that verify the end-to-end flow from Agent → Provider → Anthropic SDK, ensuring the provider abstraction layer correctly delegates prompt execution, tool calling, caching, and prompt-level provider overrides.

**Deliverable**: Passing integration test suite at `src/__tests__/integration/provider-agent.test.ts` that validates:
- Agent configuration with global Anthropic provider
- Provider.execute() called correctly via agent.prompt()
- Tool executor delegation through Agent → MCPHandler
- Session/caching behavior
- Prompt-level provider override functionality

**Success Definition**:
- All integration tests pass (`npm test -- src/__tests__/integration/provider-agent.test.ts`)
- Code coverage for Agent-Provider integration path exceeds 80%
- Tests follow established patterns from `src/__tests__/unit/providers/anthropic-provider-execute.test.ts`

---

## Why

**Business Value and User Impact**:
- The multi-provider system is a critical architectural feature (PRD Section 7) enabling Groundswell to support both Anthropic and OpenCode SDKs through a unified interface
- Integration tests provide confidence that the provider abstraction works correctly before broader adoption
- Catches regressions in the Agent → Provider → SDK flow that unit tests might miss

**Integration with Existing Features**:
- Depends on completed P4.M2.T1.S3 (Agent.prompt() refactored to use provider.execute())
- Validates the configuration cascade (global → agent → prompt provider resolution)
- Ensures tool delegation works through the new provider abstraction

**Problems This Solves**:
- Verifies end-to-end behavior that spans multiple components (Agent, Provider, SDK, MCPHandler)
- Confirms prompt-level provider overrides work as designed
- Validates session state management in the context of Agent usage

---

## What

**User-Visible Behavior**: Tests only (no user-facing changes)

**Technical Requirements**:

### Test Coverage Areas

1. **Agent-Provider Integration Flow**
   - Agent constructor resolves provider from registry
   - agent.prompt() calls provider.execute() with correct parameters
   - Provider receives properly formatted ProviderRequest
   - AgentResponse is correctly returned to caller

2. **Tool Executor Delegation**
   - Tool execution requests flow: Provider → Agent.toolExecutor → MCPHandler.executeTool()
   - Tool names use `serverName__toolName` format
   - Tool results are converted correctly (MCPHandler → Provider → Agent)
   - Tool errors are handled gracefully

3. **Session and Caching**
   - Session creation on first execute with sessionId
   - Session continuation on subsequent executes
   - Cache key generation and lookup
   - Cache hit/miss behavior

4. **Prompt-Level Provider Overrides**
   - Prompt overrides override agent-level provider
   - Configuration cascade: global → agent → prompt
   - Provider resolution respects override priorities

### Success Criteria

- [ ] Test file exists at `src/__tests__/integration/provider-agent.test.ts`
- [ ] All tests pass with `npm test -- src/__tests__/integration/provider-agent.test.ts`
- [ ] Tests mock Anthropic SDK correctly (no real API calls)
- [ ] Provider.execute() is verified to be called with correct parameters
- [ ] Tool executor delegation is validated end-to-end
- [ ] Session/caching behavior is tested
- [ ] Prompt-level provider overrides are tested

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Complete test patterns to follow from existing codebase
- Exact file locations and imports to use
- Mock implementation patterns for Anthropic SDK
- Provider-Agent integration architecture details
- Validation commands that work in this project

---

### Documentation & References

```yaml
# MUST READ - Critical context for implementation

- url: https://vitest.dev/guide/mocking.html
  why: Vitest mocking patterns (vi.fn, vi.mock, async generator mocking)
  critical: Use vi.fn().mockImplementation() for SDK mocks, not vi.mock() at module level

- file: src/__tests__/unit/providers/anthropic-provider-execute.test.ts
  why: Reference implementation for provider testing patterns
  pattern: SDK mocking with @ts-expect-error, AsyncGenerator mocking, tool executor patterns
  gotcha: Use @ts-expect-error when accessing provider.sdk for testing

- file: src/__tests__/integration/agent-workflow.test.ts
  why: Integration test structure and patterns
  pattern: AAA pattern (Arrange-Act-Assert), beforeEach/afterEach setup
  gotcha: Always call ProviderRegistry._resetForTesting() in beforeEach

- file: src/core/agent.ts:108-124
  why: Provider resolution in Agent constructor
  pattern: Configuration cascade: global → agent → prompt
  gotcha: Provider is resolved at construction time, stored in this.provider

- file: src/core/agent.ts:171-200
  why: Tool executor implementation for provider delegation
  pattern: Check delegated handlers first, then main handler
  gotcha: Tool names use serverName__toolName format (double underscore)

- file: src/core/agent.ts:546-835
  why: executePrompt implementation showing provider.execute() call
  pattern: ProviderRequest construction, tool executor binding, response handling
  gotcha: ProviderRequest includes tools array and sessionId

- file: src/providers/anthropic-provider.ts:297-457
  why: Provider.execute() implementation to understand what we're testing
  pattern: SDK query() calling, message iteration, AgentResponse construction
  gotcha: execute() throws if SDK not initialized

- file: src/providers/provider-registry.ts
  why: Provider registration and retrieval patterns
  pattern: Singleton with getInstance(), register(), get()
  gotcha: Always call _resetForTesting() to clean up between tests

- file: src/utils/provider-config.ts
  why: Configuration cascade logic
  pattern: resolveProviderConfig() merges global, agent, prompt configs
  gotcha: Provider ID has priority: prompt > agent > global

- file: plan/003_dd63ad365ffb/P5M2T1S1/research/external-testing-patterns.md
  why: External best practices for provider-agent integration testing
  section: Sections 2.3 (Tool Calling Integration), 4.1 (Agent-Provider Integration)
  gotcha: Use async function* () syntax for AsyncGenerator mocks

- docfile: plan/003_dd63ad365ffb/docs/research/test-patterns.md
  why: Project-specific testing conventions
  section: All sections
  gotcha: Tests use Vitest with globals enabled (no describe/it/expect imports needed)
```

---

### Current Codebase Tree

```bash
src/
├── __tests__/
│   ├── integration/
│   │   └── agent-workflow.test.ts          # Reference integration test patterns
│   └── unit/
│       └── providers/
│           └── anthropic-provider-execute.test.ts  # Provider testing patterns
├── core/
│   ├── agent.ts                            # Agent class with provider integration
│   ├── mcp-handler.ts                      # Tool execution via MCPHandler
│   └── prompt.ts                           # Prompt class
├── providers/
│   ├── anthropic-provider.ts               # AnthropicProvider implementation
│   └── provider-registry.ts                # Provider registry singleton
├── types/
│   ├── agent.ts                            # AgentResponse, AgentConfig types
│   └── providers.ts                        # Provider interface, ProviderRequest types
└── utils/
    └── provider-config.ts                  # Configuration cascade utilities
```

---

### Desired Codebase Tree with Files to be Added

```bash
src/
├── __tests__/
│   ├── integration/
│   │   ├── agent-workflow.test.ts          # Existing
│   │   └── provider-agent.test.ts          # NEW: Integration tests for Agent-Provider flow
│   └── unit/
│       └── providers/
│           └── anthropic-provider-execute.test.ts  # Existing: Reference patterns
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Always reset ProviderRegistry singleton between tests
beforeEach(() => {
  ProviderRegistry._resetForTesting();
});

// CRITICAL: Anthropic SDK must be mocked at instance level, not module level
// Use vi.fn().mockImplementation(), NOT vi.mock() at top of file
provider.sdk = {
  query: vi.fn().mockImplementation(async function* () {
    yield { type: 'result', subtype: 'success', result: { data: 'test' } };
  })(),
  createSdkMcpServer: vi.fn(),
  tool: vi.fn()
};

// CRITICAL: Use @ts-expect-error to access private properties in tests
// @ts-expect-error - Testing private property
provider.sdk = mockSDK;

// CRITICAL: Tool executor must return ToolExecutionResult format
const toolExecutor = vi.fn().mockResolvedValue({
  content: 'Tool result',
  isError: false,
});

// CRITICAL: AsyncGenerator mock must use async function* () syntax
const mockStream = (async function* () {
  yield { type: 'assistant', message: { content: [{ type: 'text', text: 'Test' }] } };
  yield { type: 'result', subtype: 'success', result: { data: 'done' } };
})();

// CRITICAL: Provider SDK query returns AsyncGenerator with optional streamInput method
mockStream.streamInput = vi.fn().mockResolvedValue(undefined);

// CRITICAL: Tool names use serverName__toolName format (double underscore)
// This is created by MCPHandler.registerServer()

// CRITICAL: Agent constructor throws if provider is not registered
// Always register provider before creating Agent

// CRITICAL: Agent.prompt() returns AgentResponse<T> with discriminated union
// Use isSuccess() and isError() type guards for safe access

// CRITICAL: Vitest globals are enabled - no need to import describe/it/expect
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - tests use existing types:

```typescript
// From src/types/providers.ts
type ProviderRequest = {
  prompt: string;
  options: {
    model?: string;
    systemPrompt?: string;
    tools?: Tool[];
    sessionId?: string;
    hooks?: ProviderHookEvents;
  };
};

type ToolExecutionRequest = {
  name: string;  // Format: serverName__toolName
  input: unknown;
};

type ToolExecutionResult = {
  content: string | unknown;
  isError: boolean;
};

// From src/types/agent.ts
type AgentResponse<T> =
  | { status: 'success'; data: T; error: null; metadata: AgentResponseMetadata }
  | { status: 'error'; data: null; error: AgentError; metadata: AgentResponseMetadata };
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE test file structure and imports
  - CREATE: src/__tests__/integration/provider-agent.test.ts
  - IMPORT: describe, it, expect, beforeEach, vi from 'vitest'
  - IMPORT: Agent, Prompt from '../../core/agent.js'
  - IMPORT: AnthropicProvider from '../../providers/anthropic-provider.js'
  - IMPORT: ProviderRegistry from '../../providers/provider-registry.js'
  - IMPORT: type { Tool, ToolExecutor } from '../../types/providers.js'
  - IMPORT: isSuccess, type { AgentResponse } from '../../types/agent.js'
  - FOLLOW: Import pattern from anthropic-provider-execute.test.ts (lines 1-26)

Task 2: IMPLEMENT test setup utilities
  - CREATE: helper function to create mock AnthropicProvider with SDK
  - CREATE: helper function to create mock tool executor
  - CREATE: helper function to create mock AsyncGenerator for SDK responses
  - IMPLEMENT: beforeEach block with ProviderRegistry._resetForTesting()
  - IMPLEMENT: vi.clearAllMocks() in beforeEach
  - FOLLOW: Setup pattern from anthropic-provider-execute.test.ts (lines 37-52)

Task 3: IMPLEMENT basic Agent-Provider integration test
  - DESCRIBE: 'Agent → Provider → SDK Integration'
  - TEST: 'should create Agent with Anthropic provider from global config'
    - Configure global provider with configureProviders()
    - Create Agent without provider config
    - Verify Agent uses Anthropic provider
  - TEST: 'should create Agent with explicit Anthropic provider'
    - Register AnthropicProvider
    - Create Agent with { provider: 'anthropic' }
    - Verify Agent uses Anthropic provider
  - TEST: 'should throw when provider is not registered'
    - Attempt to create Agent with unregistered provider
    - Verify error message
  - FOLLOW: Provider registration pattern from anthropic-provider-execute.test.ts

Task 4: IMPLEMENT agent.prompt() calls provider.execute() tests
  - DESCRIBE: 'agent.prompt() → provider.execute() Flow'
  - ARRANGE: Create Agent with mocked AnthropicProvider
  - MOCK: provider.execute() to verify call parameters
  - MOCK: SDK query to return valid AsyncGenerator
  - TEST: 'should call provider.execute() with correct ProviderRequest'
    - Spy on provider.execute() method
    - Call agent.prompt()
    - Verify execute() called with correct prompt and options
  - TEST: 'should return AgentResponse from provider.execute()'
    - Mock provider.execute() to return success response
    - Call agent.prompt()
    - Verify response structure and data
  - TEST: 'should handle provider.execute() errors'
    - Mock provider.execute() to throw
    - Verify error response returned
  - FOLLOW: AAA pattern from agent-workflow.test.ts (lines 42-63)

Task 5: IMPLEMENT tool executor delegation tests
  - DESCRIBE: 'Tool Executor Delegation (Provider → Agent → MCPHandler)'
  - TEST: 'should delegate tool execution to Agent.toolExecutor'
    - Mock SDK to yield tool_use block
    - Mock Agent.toolExecutor to verify calls
    - Verify tool executor called with correct parameters
  - TEST: 'should pass tool results back to provider'
    - Mock tool executor to return result
    - Verify provider receives tool result
  - TEST: 'should handle tool executor errors'
    - Mock tool executor to return error result
    - Verify error handled correctly
  - TEST: 'should use serverName__toolName format for tool names'
    - Register MCP server with tools
    - Verify tool names include server prefix
  - FOLLOW: Tool execution pattern from anthropic-provider-execute.test.ts (lines 312-400)

Task 6: IMPLEMENT session and caching tests
  - DESCRIBE: 'Session State Management'
  - TEST: 'should create session on first prompt with sessionId'
    - Call agent.prompt() with sessionId
    - Verify session created in provider
  - TEST: 'should reuse session on subsequent prompts with same sessionId'
    - Call agent.prompt() twice with same sessionId
    - Verify session history updated
  - TEST: 'should maintain separate sessions for different sessionIds'
    - Create prompts with different sessionIds
    - Verify sessions are isolated
  - TEST: 'should generate cache key for prompt'
    - Call agent.prompt() with caching enabled
    - Verify cache key generation
  - TEST: 'should return cached result on repeated prompt'
    - Call agent.prompt() twice with same inputs
    - Verify second call returns cached result
  - FOLLOW: Session testing pattern from anthropic-provider-execute.test.ts (lines 617-868)

Task 7: IMPLEMENT prompt-level provider override tests
  - DESCRIBE: 'Prompt-Level Provider Overrides'
  - TEST: 'should use prompt provider override when specified'
    - Create Agent with default provider
    - Register second provider
    - Call agent.prompt() with provider override
    - Verify override provider used
  - TEST: 'should fallback to agent provider when override not specified'
    - Create Agent with specific provider
    - Call agent.prompt() without override
    - Verify agent provider used
  - TEST: 'should respect configuration cascade priority'
    - Set global provider
    - Set agent provider
    - Set prompt override
    - Verify prompt override takes priority
  - FOLLOW: Configuration cascade pattern from provider-config.ts

Task 8: IMPLEMENT edge cases and error handling tests
  - DESCRIBE: 'Edge Cases and Error Handling'
  - TEST: 'should handle empty prompt'
  - TEST: 'should handle very long prompt'
  - TEST: 'should handle concurrent prompts'
  - TEST: 'should handle provider unavailable'
  - TEST: 'should handle invalid tool schema'
  - TEST: 'should handle session timeout'

Task 9: VERIFY all tests pass
  - RUN: npm test -- src/__tests__/integration/provider-agent.test.ts
  - VERIFY: All tests pass
  - VERIFY: No console errors
  - VERIFY: Coverage meets threshold (if coverage enabled)
```

---

### Implementation Patterns & Key Details

```typescript
// ===== PATTERN 1: Test File Structure =====
/**
 * Test file: provider-agent.test.ts
 *
 * Purpose: Integration tests for Agent → Provider → SDK flow
 *
 * Tests:
 * - Agent creation with provider configuration
 * - agent.prompt() calls provider.execute()
 * - Tool executor delegation
 * - Session management
 * - Prompt-level provider overrides
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Agent, Prompt } from '../../core/agent.js';
import { AnthropicProvider } from '../../providers/anthropic-provider.js';
import { ProviderRegistry } from '../../providers/provider-registry.js';
import type { Tool, ToolExecutor } from '../../types/providers.js';
import { isSuccess } from '../../types/agent.js';

// ===== PATTERN 2: Mock SDK Creation =====
function createMockSDK() {
  return {
    query: vi.fn().mockImplementation(async function* () {
      yield {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Test response' }]
        }
      };
      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'test result' },
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })(),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };
}

// ===== PATTERN 3: Mock Provider with SDK =====
async function createMockProvider(): Promise<AnthropicProvider> {
  const provider = new AnthropicProvider();
  await provider.initialize();

  // @ts-expect-error - Testing private property
  provider.sdk = createMockSDK();

  return provider;
}

// ===== PATTERN 4: Mock Tool Executor =====
function createMockToolExecutor(): ToolExecutor {
  return vi.fn().mockResolvedValue({
    content: 'Tool result',
    isError: false,
  });
}

// ===== PATTERN 5: Mock AsyncGenerator with streamInput =====
function createMockStreamWithHistory(history: any[]) {
  const stream = (async function* () {
    yield {
      type: 'result',
      subtype: 'success',
      result: { data: 'test' },
      usage: { input_tokens: 100, output_tokens: 50 }
    };
  })();

  // Add streamInput for session continuation
  stream.streamInput = vi.fn().mockImplementation(async (gen) => {
    for await (const msg of gen) {
      history.push(msg);
    }
  });

  return stream;
}

// ===== PATTERN 6: AAA Test Structure =====
describe('Agent → Provider → SDK Integration', () => {
  beforeEach(async () => {
    // CRITICAL: Reset registry state for isolation
    ProviderRegistry._resetForTesting();
    vi.clearAllMocks();
  });

  it('should execute prompt through provider with correct parameters', async () => {
    // ===== ARRANGE =====
    const provider = await createMockProvider();
    ProviderRegistry.getInstance().register(provider);

    const agent = new Agent({ provider: 'anthropic' });
    const prompt = new Prompt({
      user: 'What is 2 + 2?',
      responseFormat: z.object({ result: z.number() })
    });

    // Spy on provider.execute to verify calls
    const executeSpy = vi.spyOn(provider, 'execute');

    // ===== ACT =====
    const response = await agent.prompt(prompt);

    // ===== ASSERT =====
    expect(executeSpy).toHaveBeenCalled();
    expect(isSuccess(response)).toBe(true);
  });
});

// ===== PATTERN 7: Tool Executor Verification =====
describe('Tool Executor Delegation', () => {
  it('should call tool executor for tool use blocks', async () => {
    const provider = await createMockProvider();

    // Mock SDK to return tool_use block
    // @ts-expect-error - Testing private property
    provider.sdk.query.mockImplementation(async function* () {
      yield {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'I will use a tool' },
            { type: 'tool_use', id: 'tool-1', name: 'test_server__calculator', input: { a: 2, b: 2 } }
          ]
        }
      };
      yield {
        type: 'result',
        subtype: 'success',
        result: { answer: 4 },
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();

    ProviderRegistry.getInstance().register(provider);
    const agent = new Agent({ provider: 'anthropic' });

    const prompt = new Prompt({
      user: 'Calculate 2 + 2',
      responseFormat: z.object({ answer: z.number() })
    });

    // Act
    await agent.prompt(prompt);

    // Assert: Tool executor was called by provider
    // Note: We verify through provider behavior since toolExecutor is private
  });
});

// ===== PATTERN 8: Session Testing =====
describe('Session Management', () => {
  it('should create session on first prompt with sessionId', async () => {
    const provider = await createMockProvider();
    ProviderRegistry.getInstance().register(provider);

    const agent = new Agent({ provider: 'anthropic' });

    const prompt = new Prompt({
      user: 'First message',
      responseFormat: z.object({ reply: z.string() })
    });

    // Act: Prompt with sessionId
    await agent.prompt(prompt, { sessionId: 'test-session' });

    // Assert: Session was created
    // @ts-expect-error - Testing private property
    const session = provider.getSession('test-session');
    expect(session).toBeDefined();
    expect(session?.history).toBeDefined();
  });
});

// ===== PATTERN 9: Configuration Cascade Testing =====
describe('Prompt-Level Provider Overrides', () => {
  it('should use prompt provider override', async () => {
    const provider1 = await createMockProvider();
    const provider2 = await createMockProvider();

    ProviderRegistry.getInstance().register(provider1);
    ProviderRegistry.getInstance().register(provider2);

    // Create agent with provider1
    const agent = new Agent({ provider: 'anthropic' });

    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.object({ result: z.string() })
    });

    // Prompt with provider override
    // Note: This tests the configuration cascade, not direct override
    // The actual override happens in executePrompt via resolveProviderConfig

    const response = await agent.prompt(prompt);

    expect(isSuccess(response)).toBe(true);
  });
});

// ===== PATTERN 10: Error Handling =====
describe('Error Handling', () => {
  it('should handle provider not registered error', async () => {
    expect(() => {
      new Agent({ provider: 'nonexistent' });
    }).toThrow('Provider');
  });

  it('should handle provider execute errors', async () => {
    const provider = await createMockProvider();

    // Mock execute to throw
    vi.spyOn(provider, 'execute').mockRejectedValue(
      new Error('Provider error')
    );

    ProviderRegistry.getInstance().register(provider);
    const agent = new Agent({ provider: 'anthropic' });

    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.object({ result: z.string() })
    });

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('error');
  });
});
```

---

### Integration Points

```yaml
PROVIDER_REGISTRY:
  - singleton: ProviderRegistry.getInstance()
  - method: register(provider: Provider)
  - method: get(id: ProviderId): Provider | undefined
  - testing: ProviderRegistry._resetForTesting()

AGENT_CONFIG:
  - field: provider?: ProviderId
  - field: providerOptions?: ProviderOptions
  - field: model?: string
  - field: mcps?: MCPServer[]

PROVIDER_REQUEST:
  - prompt: string
  - options: {
      model?: string
      systemPrompt?: string
      tools?: Tool[]
      sessionId?: string
      hooks?: ProviderHookEvents
    }

TOOL_EXECUTION:
  - format: ToolExecutionRequest { name: string, input: unknown }
  - tool names: serverName__toolName (double underscore)
  - result: ToolExecutionResult { content, isError }

CONFIGURATION_CASCADE:
  - function: resolveProviderConfig(global, agent, prompt)
  - priority: prompt > agent > global
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after writing test file - fix before proceeding
npm test -- src/__tests__/integration/provider-agent.test.ts

# Expected: All tests pass. If failing, READ output and fix.
# Common issues:
# - Missing imports
# - Type errors in mock setup
# - Incorrect assertion syntax

# Linting (if ruff is configured)
# npm run lint src/__tests__/integration/provider-agent.test.ts

# Type checking (if mypy/tsc is configured)
# npm run type-check
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Test specific describe block
npm test -- src/__tests__/integration/provider-agent.test.ts -t "should create Agent"

# Test all integration tests
npm test -- src/__tests__/integration/

# Run with coverage (if configured)
npm test -- src/__tests__/integration/provider-agent.test.ts --coverage

# Expected: All tests pass, coverage > 80% for integration paths
```

---

### Level 3: Integration Testing (System Validation)

```bash
# Run entire test suite to ensure no regressions
npm test

# Expected:
# - All provider-agent tests pass
# - No existing tests broken
# - Provider registry properly isolated between tests

# Verify no state leakage between tests
npm test -- src/__tests__/integration/provider-agent.test.ts --reporter=verbose

# Expected: Each test is independent, no cross-test pollution
```

---

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual verification: Check test output matches expectations
npm test -- src/__tests__/integration/provider-agent.test.ts --reporter=verbose

# Verify mock behavior is correct
# - provider.execute() called with correct parameters
# - Tool executor receives correct tool names and inputs
# - Sessions created and retrieved correctly
# - Configuration cascade respects priority

# Performance check: Tests should complete quickly
time npm test -- src/__tests__/integration/provider-agent.test.ts

# Expected: All tests complete in < 5 seconds
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All tests pass: `npm test -- src/__tests__/integration/provider-agent.test.ts`
- [ ] No linting errors: `npm run lint` (if configured)
- [ ] No type errors: `npm run type-check` (if configured)
- [ ] Coverage threshold met: `npm test -- --coverage` (if configured)
- [ ] No state leakage between tests (verify with --reporter=verbose)

### Feature Validation

- [ ] Agent creation with provider tested
- [ ] agent.prompt() → provider.execute() flow verified
- [ ] Tool executor delegation validated
- [ ] Session management tested
- [ ] Prompt-level provider overrides tested
- [ ] Error cases handled gracefully
- [ ] Edge cases covered

### Code Quality Validation

- [ ] Follows existing test patterns from anthropic-provider-execute.test.ts
- [ ] AAA pattern (Arrange-Act-Assert) used consistently
- [ ] Test names are descriptive and follow "should ___" convention
- [ ] beforeEach/afterEach used for setup/teardown
- [ ] ProviderRegistry._resetForTesting() called in beforeEach
- [ ] Mock implementations use vi.fn().mockImplementation()
- [ ] @ts-expect-error used for private property access
- [ ] Type guards (isSuccess, isError) used for safe type narrowing

### Documentation & Deployment

- [ ] Test file includes header comment describing purpose
- [ ] Complex test scenarios have explanatory comments
- [ ] Mock helper functions are documented
- [ ] Test groups (describe blocks) are logically organized

---

## Anti-Patterns to Avoid

- ❌ Don't use vi.mock() at module level - use vi.fn().mockImplementation() for SDK mocking
- ❌ Don't forget to call ProviderRegistry._resetForTesting() in beforeEach
- ❌ Don't create Agents before registering their providers
- ❌ Don't use sync functions in async test contexts
- ❌ Don't skip error handling tests
- ❌ Don't test implementation details - test behavior and integration
- ❌ Don't share state between tests - each test should be independent
- ❌ Don't forget to mock the SDK's streamInput method for session tests
- ❌ Don't use real API calls - always mock the SDK
- ❌ Don't assume provider is initialized - always await provider.initialize()
- ❌ Don't forget to yield 'result' message in AsyncGenerator mocks
- ❌ Don't use incorrect tool name format - must be serverName__toolName
- ❌ Don't create tests that depend on execution order
- ❌ Don't ignore console errors during test execution

---

## Confidence Score

**Rating: 9/10** for one-pass implementation success

**Rationale**:
- ✅ Comprehensive test patterns available in existing codebase
- ✅ Clear mock implementation patterns established
- ✅ Provider-Agent integration is well-defined with clear interfaces
- ✅ External research provides additional best practices
- ⚠️ Complexity in mocking AsyncGenerator with streamInput method
- ⚠️ Session state management requires careful test isolation

**Mitigation for Risks**:
- Detailed mock implementation patterns provided
- Reference implementations from existing tests included
- Step-by-step task breakdown with dependencies
- Explicit gotchas and anti-patterns documented

---

**PRP Version**: 1.0
**Last Updated**: 2025-01-26
**Status**: Ready for Implementation
