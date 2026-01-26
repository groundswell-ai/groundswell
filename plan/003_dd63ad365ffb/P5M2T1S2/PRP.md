# PRP: P5.M2.T1.S2 - Test Provider Switching

**PRP ID**: P5.M2.T1.S2
**Work Item**: Test provider switching
**Created**: 2025-01-26
**Status**: Ready for Implementation

---

## Goal

**Feature Goal**: Create comprehensive integration tests that verify provider switching works correctly across all configuration levels (global, agent, prompt) and between different providers (anthropic, opencode).

**Deliverable**: Integration test file `src/__tests__/integration/provider-switching.test.ts` with complete test coverage for:
- Agent creation with different providers
- Prompt-level provider overrides
- Configuration cascade priority validation
- Multi-provider state isolation
- Error handling for unregistered providers

**Success Definition**:
- All tests pass with `npm test`
- Tests verify correct provider is used in each scenario
- Configuration cascade priority is validated
- Provider state isolation is confirmed
- Error cases are handled gracefully

---

## User Persona

**Target User**: Development team and QA engineers

**Use Case**: Validate that the multi-provider system correctly switches between providers based on configuration at different levels (global, agent, prompt)

**User Journey**:
1. Developer runs the test suite to verify provider switching functionality
2. Tests cover all switching scenarios: global config → agent config → prompt overrides
3. Tests verify state isolation between providers
4. Tests confirm error handling for invalid configurations

**Pain Points Addressed**:
- Ensures provider switching doesn't leak state between providers
- Validates configuration cascade priority works as expected
- Confirms prompt-level overrides correctly switch providers

---

## Why

- **System Reliability**: Provider switching is a critical feature that must work correctly for the multi-provider architecture to function
- **Configuration Correctness**: Validates that the configuration cascade (global → agent → prompt) works with the correct priority
- **State Isolation**: Ensures switching providers doesn't leak state or cause cross-provider interference
- **Integration Validation**: Tests the complete flow from Agent → Provider → SDK with provider switching

---

## What

### Test Coverage Requirements

**Provider Creation Tests**:
- Test creating Agent with provider='anthropic'
- Test creating Agent with provider='opencode'
- Test creating Agent without provider (uses global default)

**Provider Override Tests**:
- Test prompt-level override switches provider for single call
- Test prompt-level override takes precedence over agent config
- Test agent-level provider takes precedence over global config

**Configuration Cascade Tests**:
- Test full cascade: global → agent → prompt priority
- Test options merge behavior across cascade levels
- Test null/undefined handling in cascade

**Multi-Provider State Isolation Tests**:
- Test that switching providers maintains independent state
- Test concurrent prompts with different providers
- Test provider-specific options don't leak between providers

**Error Handling Tests**:
- Test unregistered provider returns error
- Test provider unavailable during execution
- Test invalid provider configuration

### Success Criteria

- [ ] All tests pass with `npm test`
- [ ] Test file follows existing patterns from `provider-agent.test.ts`
- [ ] Mock providers use `createMockProvider()` factory pattern
- [ ] Registry state is reset in `beforeEach()` for isolation
- [ ] Tests verify correct provider instance is used via spy verification
- [ ] Configuration cascade priority is validated
- [ ] Provider state isolation is confirmed

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:
- Complete test framework information (Vitest)
- Exact file patterns and locations
- Mock helper patterns with code examples
- Provider switching implementation details
- Configuration cascade logic
- Existing test patterns to follow
- Validation commands that work in this codebase

### Documentation & References

```yaml
# MUST READ - Test Framework and Patterns
- url: https://vitest.dev/guide/
  why: Vitest testing framework documentation
  critical: vi.fn(), vi.spyOn(), mock patterns, async testing

- url: https://vitest.dev/api/mock.html
  why: Vitest mocking API reference
  critical: Mock creation, spying, implementation patterns

# MUST READ - Provider Switching Implementation
- file: src/utils/provider-config.ts
  why: Contains configureProviders(), getGlobalProviderConfig(), resolveProviderConfig()
  pattern: Configuration cascade with nullish coalescing (??) and object spread
  gotcha: Options merge uses "last write wins" - prompt options override agent options

- file: src/core/agent.ts
  why: Agent constructor and executePrompt() method implement provider resolution
  pattern: Resolve provider using resolveProviderConfig(), then get from registry
  gotcha: Provider is retrieved from registry each execution, allowing prompt-level overrides

- file: src/providers/provider-registry.ts
  why: ProviderRegistry singleton manages provider instances
  pattern: getInstance(), register(), get(), _resetForTesting()
  gotcha: Must call _resetForTesting() in beforeEach for test isolation

# MUST READ - Existing Test Patterns
- file: src/__tests__/integration/provider-agent.test.ts
  why: Complete reference for Agent-Provider integration test structure
  pattern: describe() blocks, beforeEach() with registry reset, mock helpers
  gotcha: Uses @ts-expect-error to access private provider.sdk for testing

- file: src/__tests__/unit/agent-prompt-provider-override.test.ts
  why: Reference for prompt-level provider override testing
  pattern: Test cascade priority, options merge, provider switching
  gotcha: Spy on provider.execute to verify correct provider is called

- file: src/__tests__/unit/providers/provider-lifecycle.test.ts
  why: Reference for provider lifecycle testing (initialize, terminate)
  pattern: Test provider registration, initialization, termination
  gotcha: Use ProviderRegistry._resetForTesting() for isolation

# Provider Types
- file: src/types/provider.ts
  why: ProviderId type ('anthropic' | 'opencode'), Provider interface
  pattern: Provider interface with initialize(), terminate(), execute()
  gotcha: ProviderId is a discriminated union - only valid providers allowed

- file: src/providers/anthropic-provider.ts
  why: AnthropicProvider implementation reference
  pattern: Provider class structure, capabilities, methods
  gotcha: Has full MCP support, native skills, LSP via MCP

- file: src/providers/opencode-provider.ts
  why: OpenCodeProvider implementation reference
  pattern: Alternative provider with different capabilities
  gotcha: No MCP support (mcp: false), LLM-only mode

# Agent Types
- file: src/types/agent.ts
  why: AgentConfig, PromptOverrides, AgentResponse types
  pattern: provider?: ProviderId, providerOptions?: ProviderOptions in AgentConfig
  gotcha: PromptOverrides supports provider and providerOptions for overrides

# Type Guards
- file: src/types/agent.ts
  why: isSuccess(), isError() type guards for discriminated unions
  pattern: if (isSuccess(response)) { /* response.data exists */ }
  gotcha: Must use type guards for safe access to response.data or response.error

# Global Config Reset
- file: src/utils/provider-config.ts
  why: resetGlobalConfig() function for test cleanup
  pattern: Call in afterEach to reset global provider config
  gotcha: Must call along with ProviderRegistry._resetForTesting()
```

### Current Codebase Tree

```bash
src/
├── __tests__/
│   ├── integration/
│   │   ├── provider-agent.test.ts          # P5.M2.T1.S1 - Agent with Anthropic Provider
│   │   ├── agent-workflow.test.ts          # Agent-Workflow integration tests
│   │   └── provider-switching.test.ts      # [TO BE CREATED] P5.M2.T1.S2
│   ├── unit/
│   │   ├── agent-prompt-provider-override.test.ts  # Prompt-level override tests
│   │   ├── agent-stream-provider-override.test.ts  # Streaming override tests
│   │   ├── agent.test.ts                  # Agent unit tests
│   │   └── providers/
│   │       ├── provider-lifecycle.test.ts  # Provider lifecycle tests
│   │       ├── anthropic-provider-execute.test.ts  # Anthropic execute() tests
│   │       └── opencode-provider-execute.test.ts   # OpenCode execute() tests
│   └── adversarial/
├── core/
│   ├── agent.ts                           # Agent class with provider integration
│   └── ...
├── providers/
│   ├── provider-registry.ts               # ProviderRegistry singleton
│   ├── anthropic-provider.ts              # AnthropicProvider implementation
│   └── opencode-provider.ts               # OpenCodeProvider implementation
├── types/
│   ├── agent.ts                           # AgentConfig, PromptOverrides, AgentResponse
│   └── provider.ts                        # ProviderId, Provider interface
└── utils/
    └── provider-config.ts                 # configureProviders(), resolveProviderConfig()
```

### Desired Codebase Tree with Files to be Added

```bash
src/
├── __tests__/
│   ├── integration/
│   │   ├── provider-agent.test.ts          # Existing: P5.M2.T1.S1
│   │   └── provider-switching.test.ts      # [TO CREATE] P5.M2.T1.S2 - Provider switching tests
│   └── ...
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Provider Registry Reset for Test Isolation
// Always reset the singleton registry state in beforeEach()
beforeEach(() => {
  ProviderRegistry._resetForTesting();  // Resets singleton state
  resetGlobalConfig();                  // Resets global provider config
  vi.clearAllMocks();                    // Clears mock call counts
});

// CRITICAL: Provider Instance Resolution
// Providers are retrieved from registry each execution, not cached at construction
// This allows prompt-level overrides to switch providers dynamically
const providerInstance = registry.get(resolvedProvider);  // Fresh lookup each time

// CRITICAL: Configuration Cascade Priority
// Priority (highest to lowest): prompt > agent > global
// Provider resolution uses nullish coalescing (??)
const provider = promptProvider ?? agentProvider ?? globalProvider;

// CRITICAL: Options Merge Behavior
// Options merge uses object spread with "last write wins"
// Prompt options completely override agent options for the same keys
const options = {
  ...(globalDefaults ?? {}),
  ...(agentOptions ?? {}),
  ...(promptOptions ?? {})  // Highest priority - overrides all
};

// CRITICAL: Type Guards for Discriminated Unions
// Must use isSuccess() or isError() for type-safe access
if (isSuccess(response)) {
  expect(response.data).toBeDefined();  // TypeScript knows response.data exists
}

// CRITICAL: Mock Provider Creation Pattern
// Use factory function with ProviderId parameter for consistent mocking
function createMockProvider(id: ProviderId): Provider {
  return {
    id,
    capabilities: { mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false },
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({ provider: id, model, raw: model })),
  };
}

// CRITICAL: Spy Verification Pattern
// Spy on provider.execute() to verify correct provider is called
const executeSpy = vi.spyOn(provider, 'execute');
await agent.prompt(prompt);
expect(executeSpy).toHaveBeenCalled();

// CRITICAL: AsyncGenerator Mocking for Streaming
// When mocking SDK query, must return AsyncGenerator with streamInput method
const generator = (async function* () {
  yield { type: 'assistant', message: { content: [{ type: 'text', text: 'Test' }] } };
  yield { type: 'result', subtype: 'success', result: { data: 'test' }, usage: { input_tokens: 100, output_tokens: 50 } };
})();
generator.streamInput = vi.fn().mockResolvedValue(undefined);
return generator;

// CRITICAL: OpenCodeProvider Limitations
// OpenCodeProvider has mcp: false, skills: false - no tool execution support
// It's an LLM-only mode provider, unlike AnthropicProvider

// CRITICAL: Test File Naming Convention
// Integration tests go in src/__tests__/integration/
// Test files use .test.ts suffix (not .spec.ts)
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - this is test implementation using existing types:
- `ProviderId`: 'anthropic' | 'opencode'
- `Provider`: Interface with initialize(), terminate(), execute()
- `AgentConfig`: { provider?: ProviderId, providerOptions?: ProviderOptions, ... }
- `PromptOverrides`: { provider?: ProviderId, providerOptions?: ProviderOptions, ... }
- `AgentResponse<T>`: { status, data, error, metadata }

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/integration/provider-switching.test.ts
  - IMPLEMENT: Integration test suite for provider switching
  - FOLLOW pattern: src/__tests__/integration/provider-agent.test.ts (overall structure, mock helpers)
  - NAMING: describe('Provider Switching Integration', () => { ... })
  - PLACEMENT: Integration test directory alongside provider-agent.test.ts
  - SECTIONS:
    - Mock helper functions (createMockProvider, createMockSDK)
    - Test setup with beforeEach() for registry reset
    - Agent creation with different providers
    - Prompt-level provider overrides
    - Configuration cascade tests
    - Multi-provider state isolation
    - Error handling

Task 2: IMPLEMENT Mock Helper Functions
  - IMPLEMENT: createMockProvider(id: ProviderId): Provider factory function
  - FOLLOW pattern: src/__tests__/integration/provider-agent.test.ts (createMockProvider)
  - NAMING: createMockProvider, createMockSDK (if needed for AnthropicProvider)
  - PATTERN: Use vi.fn().mockResolvedValue() for methods, vi.fn() for execute
  - CAPABILITIES: Full capabilities object with mcp, skills, lsp, streaming, sessions, extendedThinking

Task 3: IMPLEMENT Test Setup and Cleanup
  - IMPLEMENT: beforeEach() to reset state for test isolation
  - FOLLOW pattern: src/__tests__/integration/provider-agent.test.ts (line 141-148)
  - RESET: ProviderRegistry._resetForTesting(), resetGlobalConfig(), vi.clearAllMocks()
  - PATTERN: beforeEach(async () => { ... }) at top level

Task 4: IMPLEMENT Agent Creation Tests
  - IMPLEMENT: Tests for creating Agent with different providers
  - TEST CASES:
    - Agent with provider='anthropic' uses AnthropicProvider
    - Agent with provider='opencode' uses OpenCodeProvider
    - Agent without provider uses global default
    - Agent with unregistered provider throws error
  - VERIFY: ProviderRegistry.getInstance().get() returns correct provider instance

Task 5: IMPLEMENT Prompt-Level Override Tests
  - IMPLEMENT: Tests for prompt-level provider switching
  - TEST CASES:
    - Prompt with provider='anthropic' overrides agent config
    - Prompt with provider='opencode' overrides agent config
    - Prompt without override uses agent provider
    - Prompt with unregistered provider returns error
  - VERIFY: Spy on provider.execute() to confirm correct provider is called

Task 6: IMPLEMENT Configuration Cascade Tests
  - IMPLEMENT: Tests for full cascade priority validation
  - TEST CASES:
    - Global default → Agent override → Prompt override (full cascade)
    - Global default only
    - Agent override only
    - Prompt override only
    - Options merge behavior (global + agent + prompt)
  - VERIFY: resolveProviderConfig() returns expected provider and options

Task 7: IMPLEMENT Multi-Provider State Isolation Tests
  - IMPLEMENT: Tests for provider state isolation
  - TEST CASES:
    - Switching providers maintains independent state
    - Concurrent prompts with different providers don't interfere
    - Provider-specific options don't leak between providers
    - Each provider maintains separate call counts
  - VERIFY: State tracking per provider (call counts, sessions, etc.)

Task 8: IMPLEMENT Error Handling Tests
  - IMPLEMENT: Tests for error scenarios
  - TEST CASES:
    - Unregistered provider returns PROVIDER_NOT_FOUND error
    - Provider unavailable during execution handles gracefully
    - Invalid provider configuration is rejected
    - Concurrent provider switches handle errors correctly
  - VERIFY: isError(response) is true, response.error.code is correct

Task 9: IMPLEMENT Streaming Provider Switch Tests (if applicable)
  - IMPLEMENT: Tests for agent.stream() with provider switching
  - FOLLOW pattern: src/__tests__/unit/agent-stream-provider-override.test.ts
  - TEST CASES:
    - Stream with prompt-level provider override
    - Stream events come from correct provider
    - Streaming handles provider switching correctly
  - VERIFY: for await (const event of stream) yields events from overridden provider
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// Mock Helper Functions Pattern
// ============================================================================

/**
 * Create a mock provider with the given ID
 *
 * Follows pattern from provider-agent.test.ts and agent-prompt-provider-override.test.ts
 * Uses vi.fn() for execute() to allow spying on calls
 */
function createMockProvider(id: ProviderId): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: id === 'anthropic',  // Anthropic has MCP, OpenCode doesn't
    skills: id === 'anthropic',
    lsp: id === 'anthropic',
    streaming: true,
    sessions: true,
    extendedThinking: true,
  };

  const mockExecute = vi.fn();

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}

// For AnthropicProvider with SDK mocking (if needed):
async function createMockAnthropicProvider(): Promise<AnthropicProvider> {
  const provider = new AnthropicProvider();
  await provider.initialize();

  // @ts-expect-error - Testing private property
  provider.sdk = createMockSDK();

  return provider;
}

// ============================================================================
// Test Setup Pattern
// ============================================================================

describe('Provider Switching Integration', () => {
  beforeEach(async () => {
    // CRITICAL: Reset registry state for isolation
    ProviderRegistry._resetForTesting();
    // Reset global provider config
    resetGlobalConfig();
    // Clear all mocks
    vi.clearAllMocks();
  });

  // Test sections...
});

// ============================================================================
// Provider Switching Test Pattern
// ============================================================================

describe('Agent Creation with Different Providers', () => {
  it('should create Agent with anthropic provider', async () => {
    const provider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(provider);

    const agent = new Agent({ provider: 'anthropic' });

    expect(agent).toBeDefined();
  });

  it('should create Agent with opencode provider', async () => {
    const provider = createMockProvider('opencode');
    ProviderRegistry.getInstance().register(provider);

    const agent = new Agent({ provider: 'opencode' });

    expect(agent).toBeDefined();
  });
});

// ============================================================================
// Prompt-Level Override Test Pattern
// ============================================================================

describe('Prompt-Level Provider Overrides', () => {
  it('should switch to opencode provider for single prompt', async () => {
    const anthropicProvider = createMockProvider('anthropic');
    const opencodeProvider = createMockProvider('opencode');

    ProviderRegistry.getInstance().register(anthropicProvider);
    ProviderRegistry.getInstance().register(opencodeProvider);

    // Create agent with anthropic provider
    const agent = new Agent({ provider: 'anthropic' });

    const prompt = new Prompt({
      user: 'Test prompt',
      responseFormat: z.object({ result: z.string() })
    });

    // Spy on both providers to verify which one is called
    const anthropicSpy = vi.spyOn(anthropicProvider, 'execute');
    const opencodeSpy = vi.spyOn(opencodeProvider, 'execute');

    // Prompt with provider override to opencode
    const response = await agent.prompt(prompt, {
      provider: 'opencode'
    });

    // Verify opencode provider was called, not anthropic
    expect(opencodeSpy).toHaveBeenCalledTimes(1);
    expect(anthropicSpy).not.toHaveBeenCalled();
    expect(isSuccess(response)).toBe(true);
  });
});

// ============================================================================
// Configuration Cascade Test Pattern
// ============================================================================

describe('Configuration Cascade Priority', () => {
  it('should prioritize prompt override over agent and global config', async () => {
    const anthropicProvider = createMockProvider('anthropic');
    const opencodeProvider = createMockProvider('opencode');

    ProviderRegistry.getInstance().register(anthropicProvider);
    ProviderRegistry.getInstance().register(opencodeProvider);

    // Configure global default to anthropic
    configureProviders({
      defaultProvider: 'anthropic',
      providerDefaults: {
        anthropic: { timeout: 30000 },
        opencode: { timeout: 60000 }
      }
    });

    // Create agent with opencode override
    const agent = new Agent({ provider: 'opencode' });

    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.object({ result: z.string() })
    });

    // Prompt with anthropic override (highest priority)
    const anthropicSpy = vi.spyOn(anthropicProvider, 'execute');
    const opencodeSpy = vi.spyOn(opencodeProvider, 'execute');

    await agent.prompt(prompt, { provider: 'anthropic' });

    // Prompt override should win - anthropic should be called
    expect(anthropicSpy).toHaveBeenCalledTimes(1);
    expect(opencodeSpy).not.toHaveBeenCalled();
  });
});

// ============================================================================
// State Isolation Test Pattern
// ============================================================================

describe('Multi-Provider State Isolation', () => {
  it('should maintain independent state between providers', async () => {
    const anthropicProvider = createMockProvider('anthropic');
    const opencodeProvider = createMockProvider('opencode');

    ProviderRegistry.getInstance().register(anthropicProvider);
    ProviderRegistry.getInstance().register(opencodeProvider);

    const agent = new Agent({ provider: 'anthropic' });

    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.object({ result: z.string() })
    });

    // Track call counts per provider
    let anthropicCallCount = 0;
    let opencodeCallCount = 0;

    anthropicProvider.execute.mockImplementation(async () => {
      anthropicCallCount++;
      return createSuccessResponse({ result: `anthropic-${anthropicCallCount}` });
    });

    opencodeProvider.execute.mockImplementation(async () => {
      opencodeCallCount++;
      return createSuccessResponse({ result: `opencode-${opencodeCallCount}` });
    });

    // First prompt with anthropic
    const r1 = await agent.prompt(prompt);
    expect(isSuccess(r1) && r1.data.result).toBe('anthropic-1');

    // Second prompt with opencode override
    const r2 = await agent.prompt(prompt, { provider: 'opencode' });
    expect(isSuccess(r2) && r2.data.result).toBe('opencode-1');

    // Third prompt back to anthropic (agent default)
    const r3 = await agent.prompt(prompt);
    expect(isSuccess(r3) && r3.data.result).toBe('anthropic-2');

    // Verify independent state
    expect(anthropicCallCount).toBe(2);
    expect(opencodeCallCount).toBe(1);
  });
});

// ============================================================================
// Error Handling Test Pattern
// ============================================================================

describe('Provider Switching Error Handling', () => {
  it('should return error for unregistered provider', async () => {
    const anthropicProvider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(anthropicProvider);

    const agent = new Agent({ provider: 'anthropic' });

    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.object({ result: z.string() })
    });

    // Try to use unregistered provider
    const response = await agent.prompt(prompt, {
      provider: 'nonexistent-provider'
    });

    expect(isError(response)).toBe(true);
    expect(response.error?.code).toBe('PROVIDER_NOT_FOUND');
  });
});
```

### Integration Points

```yaml
NO DATABASE INTEGRATION:
  - This is pure unit/integration testing with mocks
  - No database migrations or schema changes

NO CONFIG CHANGES:
  - No changes to config files
  - Tests use configureProviders() to set up test scenarios

NO ROUTE CHANGES:
  - No API routes involved
  - Pure code-level testing
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating the test file - fix before proceeding
npm run build              # TypeScript compilation check
npm run lint              # Type checking with tsc --noEmit

# Expected: Zero TypeScript errors, zero linting errors
# If errors exist, READ output and fix before proceeding

# Common issues to watch for:
# - Missing imports (Provider, Agent, Prompt, etc.)
# - Type mismatches in mock implementations
# - Incorrect test structure (missing describe/it blocks)
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new test file
npx vitest run src/__tests__/integration/provider-switching.test.ts

# Run all integration tests to ensure no regressions
npx vitest run src/__tests__/integration/

# Run all tests to ensure full suite passes
npm test

# Expected: All tests pass
# If failing, debug root cause and fix implementation

# Watch mode for iterative development
npx vitest watch src/__tests__/integration/provider-switching.test.ts
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify test file is properly discovered
npx vitest run --reporter=verbose 2>&1 | grep provider-switching

# Run tests with coverage
npx vitest run --coverage

# Verify specific test cases
npx vitest run src/__tests__/integration/provider-switching.test.ts -t "should create Agent with anthropic provider"
npx vitest run src/__tests__/integration/provider-switching.test.ts -t "should switch to opencode provider for single prompt"

# Expected: All integration tests pass, coverage is adequate
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test Registry Isolation
# Run tests multiple times to ensure no state leakage
for i in {1..5}; do npm test || exit 1; done

# Concurrent Test Execution (verify no race conditions)
npx vitest run --threads --pool=threads

# Performance Testing (ensure tests complete quickly)
time npm test  # Should complete in < 10 seconds

# Coverage Validation
npx vitest run --coverage --coverage.threshold.lines=80

# Expected: All validations pass, tests are deterministic and fast
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] Test file follows existing patterns from provider-agent.test.ts
- [ ] Mock helpers use createMockProvider() factory pattern
- [ ] Registry state is reset in beforeEach() for isolation
- [ ] Spy verification confirms correct provider is called

### Feature Validation

- [ ] Agent creation with different providers works correctly
- [ ] Prompt-level provider overrides switch providers as expected
- [ ] Configuration cascade priority is validated (prompt > agent > global)
- [ ] Multi-provider state isolation is confirmed
- [ ] Error handling for unregistered providers works correctly
- [ ] Options merge behavior is verified across cascade levels

### Code Quality Validation

- [ ] Tests are deterministic (no random failures)
- [ ] Tests are isolated (no state leakage between tests)
- [ ] Test names are descriptive and follow convention
- [ ] Mock implementations are consistent and type-safe
- [ ] Spy usage correctly verifies provider switching
- [ ] Error cases are tested with isError() type guards
- [ ] Test coverage is adequate (all switching scenarios covered)

### Documentation & Deployment

- [ ] Test file includes header comment with purpose and PRP reference
- [ ] Complex test logic has inline comments explaining the scenario
- [ ] Mock helpers have JSDoc comments explaining their purpose
- [ ] Tests serve as documentation for provider switching behavior

---

## Anti-Patterns to Avoid

- ❌ Don't create new test patterns - follow existing patterns from provider-agent.test.ts
- ❌ Don't forget to reset ProviderRegistry state in beforeEach()
- ❌ Don't use real provider instances - use mocks for isolation
- ❌ Don't skip spy verification - verify correct provider is called
- ❌ Don't test only happy paths - include error cases and edge cases
- ❌ Don't forget to test state isolation between providers
- ❌ Don't hardcode provider IDs - use ProviderId type for type safety
- ❌ Don't use sync functions for async operations - use async/await
- ❌ Don't catch all exceptions - be specific about expected errors
- ❌ Don't skip type guards - use isSuccess() and isError() for type-safe access
- ❌ Don't mutate input parameters when merging options - create new objects
- ❌ Don't test provider implementation - test provider switching logic only
- ❌ Don't forget to test configuration cascade priority thoroughly
- ❌ Don't create complex test setups - keep tests focused and isolated
- ❌ Don't use test.only in committed code - remove before committing
