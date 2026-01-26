# Product Requirement Prompt (PRP): Resolve Provider with Prompt Overrides

## Goal

**Feature Goal**: Enable prompt-level provider and provider options override in the `Agent.prompt()` and `Agent.stream()` methods, allowing dynamic provider switching on a per-request basis.

**Deliverable**: Verification and completion of the provider resolution cascade in `executePrompt()` and `stream()` methods to correctly extract prompt-level provider overrides, resolve the configuration cascade, and retrieve the appropriate provider instance from the registry.

**Success Definition**:
- `Agent.prompt()` and `Agent.stream()` methods correctly extract `provider` and `providerOptions` from `PromptOverrides`
- The configuration cascade (global → agent → prompt) is applied correctly using `resolveProviderConfig()`
- The resolved provider instance is retrieved from `ProviderRegistry` for execution
- If the resolved provider differs from the Agent's default provider, the new provider instance is used
- All existing tests continue to pass, and new tests verify prompt-level override behavior

## Why

- **Runtime Flexibility**: Users can switch providers on a per-prompt basis without creating new Agent instances
- **Testing**: Allows testing against multiple providers with a single Agent configuration
- **A/B Testing**: Enables easy comparison of different providers for the same prompt
- **Cost Optimization**: Allows routing specific prompts to different providers based on cost/capability requirements
- **Fallback Scenarios**: Enables graceful fallback to alternative providers if primary provider fails

## What

### User-Visible Behavior

When calling `agent.prompt()` or `agent.stream()`, users can optionally specify `provider` and `providerOptions` in the overrides parameter:

```typescript
// Agent configured with anthropic provider
const agent = new Agent({
  name: 'MyAgent',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514'
});

// Use anthropic (default)
const result1 = await agent.prompt('Hello');

// Switch to opencode for this specific prompt
const result2 = await agent.prompt('Hello', {
  provider: 'opencode',
  providerOptions: { endpoint: 'http://localhost:8080' }
});

// Use anthropic with custom options for this prompt
const result3 = await agent.prompt('Hello', {
  providerOptions: { timeout: 60000 }
});
```

### Technical Requirements

1. Extract `provider` and `providerOptions` from `PromptOverrides` parameter
2. Call `resolveProviderConfig()` with global, agent, and prompt-level configuration
3. Retrieve the resolved provider instance from `ProviderRegistry`
4. Use the resolved provider and options for execution
5. Handle error case where resolved provider is not registered

### Success Criteria

- [ ] Prompt-level `provider` override correctly switches the provider for execution
- [ ] Prompt-level `providerOptions` override correctly merges with agent and global options
- [ ] Both `prompt()` and `stream()` methods support prompt-level overrides
- [ ] Provider not registered error is handled gracefully
- [ ] All existing tests pass
- [ ] New tests verify prompt-level override behavior

## All Needed Context

### Context Completeness Check

✅ **"No Prior Knowledge" Test Passed**: This PRP provides all necessary context for implementing the feature, including:
- Exact file locations and line numbers for relevant code
- Complete type definitions
- Existing implementation patterns to follow
- Test patterns and validation commands
- Architecture decisions and gotchas

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- file: src/utils/provider-config.ts
  why: Contains resolveProviderConfig() function that implements the cascade logic
  pattern: Lines 338-363 show the complete cascade implementation
  critical: The cascade uses nullish coalescing for provider (??) and object spread for options merging
  gotcha: Options are merged in order: global → agent → prompt (last write wins)

- file: src/providers/provider-registry.ts
  why: ProviderRegistry singleton for retrieving provider instances
  pattern: Lines 164-169 (getInstance()), 219-223 (get() method)
  critical: registry.get() returns undefined if provider not registered - must validate before use

- file: src/types/providers.ts
  why: Type definitions for ProviderId, ProviderOptions, GlobalProviderConfig, resolveProviderConfig return type
  pattern: Lines 303-327 (ProviderResult), 393-426 (GlobalProviderConfig, ProviderOptions)
  critical: ProviderId is a union type: 'anthropic' | 'opencode'

- file: src/types/agent.ts
  why: Contains PromptOverrides interface with provider and providerOptions fields
  pattern: Search for "PromptOverrides" interface definition
  critical: PromptOverrides.provider and PromptOverrides.providerOptions are already defined

- file: src/core/agent.ts
  why: Contains Agent.prompt() and Agent.stream() methods that need to use prompt-level overrides
  pattern: Lines 348-364 (stream method), 556-580 (executePrompt method)
  critical: Both methods already extract promptProvider and promptProviderOptions, then call resolveProviderConfig()
  gotcha: The resolved provider may differ from this.provider - must get from registry each time

- file: src/__tests__/unit/utils/provider-config.test.ts
  why: Comprehensive tests for the configuration cascade behavior
  pattern: Shows how to test all combinations of global/agent/prompt overrides
  critical: Tests verify "first defined wins" semantics and options merging behavior

- docfile: plan/003_dd63ad365ffb/P4M3T1S2/research/CODEBASE_ANALYSIS.md
  why: Detailed analysis of existing implementation and what needs to be verified/completed
  section: Current Implementation Status, Implementation Gap Analysis

- docfile: plan/003_dd63ad365ffb/P4M3T1S2/research/CONFIGURATION_CASCADE_PATTERNS.md
  why: Best practices and patterns for configuration cascades
  section: Best Practices, Anti-Patterns to Avoid
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── agent.ts                    # Agent class with prompt() and stream() methods
│   └── ...
├── providers/
│   ├── provider-registry.ts        # ProviderRegistry singleton
│   ├── anthropic-provider.ts       # AnthropicProvider implementation
│   └── opencode-provider.ts        # OpenCodeProvider implementation
├── utils/
│   ├── provider-config.ts          # configureProviders(), getGlobalProviderConfig(), resolveProviderConfig()
│   └── index.ts                    # Exports provider utilities
├── types/
│   ├── providers.ts                # Provider-related type definitions
│   └── agent.ts                    # AgentConfig, PromptOverrides type definitions
└── __tests__/
    ├── unit/
    │   ├── agent.test.ts           # Existing Agent tests
    │   └── utils/
    │       └── provider-config.test.ts  # Provider configuration cascade tests
    └── integration/
        └── agent-workflow.test.ts  # Integration tests
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Use ?? (nullish coalescing) not || (logical OR)
// ?? operator: first non-null/undefined value wins
// || operator: first non-falsy value wins (treats 0, '', false as missing)
const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;

// CRITICAL: Options merge order matters - last write wins
const options: ProviderOptions = {
  ...(globalDefaults ?? {}),    // Base layer
  ...(agentOptions ?? {}),      // Can override global
  ...(promptOptions ?? {})      // Can override both (highest priority)
};

// CRITICAL: When switching providers, agent-level options still apply
// Example: Agent has opencode with timeout 10000, prompt switches to anthropic
// Result: anthropic provider gets timeout 10000 from agentOptions
// This is by design - options cascade independently of provider selection

// CRITICAL: registry.get() returns undefined if provider not registered
// Always validate before using the provider instance
const providerInstance = registry.get(resolvedProvider);
if (!providerInstance) {
  throw new Error(`Provider '${resolvedProvider}' is not registered`);
}

// CRITICAL: resolveProviderConfig() never mutates input parameters
// It creates new objects via object spread - safe to call multiple times

// CRITICAL: getGlobalProviderConfig() never returns null
// It falls back to hardcoded defaults if not configured:
// { defaultProvider: 'anthropic', providerDefaults: undefined }

// CRITICAL: Agent's this.provider is the DEFAULT provider
// The actual provider for execution is resolved at runtime via cascade
// So this.provider may differ from the resolved provider used for execution
```

## Implementation Blueprint

### Data Models and Structure

The data models are already defined. This section documents the existing types:

```typescript
// From src/types/providers.ts

/**
 * Provider identifier union type
 */
export type ProviderId = 'anthropic' | 'opencode';

/**
 * Provider-specific options
 */
export interface ProviderOptions {
  endpoint?: string;                  // API endpoint override
  apiKey?: string;                    // API key (if not from environment)
  sessionId?: string;                 // Session ID for session-based providers
  timeout?: number;                   // Timeout in milliseconds
  headers?: Record<string, string>;   // Custom headers
}

/**
 * Global provider configuration
 */
export interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}

/**
 * Result of resolveProviderConfig() cascade
 */
interface ResolvedProviderConfig {
  provider: ProviderId;
  options: ProviderOptions;
}

// From src/types/agent.ts

/**
 * Prompt-level overrides for agent execution
 */
export interface PromptOverrides {
  // ... other override fields
  provider?: ProviderId;              // Prompt-level provider override
  providerOptions?: ProviderOptions;  // Prompt-level provider options override
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY stream() method provider resolution
  - LOCATE: src/core/agent.ts, lines 348-364
  - VERIFY: stream() method extracts promptProvider and promptProviderOptions from overrides parameter
  - VERIFY: stream() method calls resolveProviderConfig() with all cascade parameters
  - VERIFY: stream() method gets provider instance from registry using resolved provider
  - VERIFY: stream() method handles case where provider is not registered (throws error)
  - EVIDENCE: Lines 348-367 should show this pattern:
    - const promptProvider = overrides?.provider;
    - const promptProviderOptions = overrides?.providerOptions;
    - const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(...);
    - const providerInstance = registry.get(resolvedProvider);
    - if (!providerInstance) { throw new Error(...); }
  - ACCEPTANCE: stream() method correctly implements prompt-level provider override

Task 2: VERIFY executePrompt() method provider resolution
  - LOCATE: src/core/agent.ts, lines 556-580
  - VERIFY: executePrompt() method extracts promptProvider and promptProviderOptions from overrides parameter
  - VERIFY: executePrompt() method calls resolveProviderConfig() with all cascade parameters
  - VERIFY: executePrompt() method gets provider instance from registry using resolved provider
  - VERIFY: executePrompt() method handles case where provider is not registered (returns error response)
  - EVIDENCE: Lines 556-580 should show this pattern:
    - const promptProvider = overrides?.provider;
    - const promptProviderOptions = overrides?.providerOptions;
    - const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(...);
    - const providerInstance = registry.get(resolvedProvider);
    - if (!providerInstance) { return createErrorResponse(...); }
  - ACCEPTANCE: executePrompt() method correctly implements prompt-level provider override

Task 3: VERIFY provider options are passed to provider.execute()
  - LOCATE: src/core/agent.ts, executePrompt() method (after line 580)
  - VERIFY: resolvedProviderOptions from resolveProviderConfig() is used when building ProviderRequest
  - VERIFY: ProviderRequest.options is set to resolvedProviderOptions
  - EVIDENCE: Look for provider.execute() call with options parameter
  - ACCEPTANCE: Provider receives merged options from cascade

Task 4: CREATE test for prompt-level provider override in prompt()
  - CREATE: src/__tests__/unit/agent-prompt-provider-override.test.ts
  - IMPLEMENT: Test that verifies provider override switches the execution provider
  - IMPLEMENT: Test that verifies providerOptions override merges correctly
  - IMPLEMENT: Test that verifies agent-level options apply when switching providers
  - IMPLEMENT: Test that verifies unregistered provider returns error response
  - FOLLOW pattern: src/__tests__/unit/utils/provider-config.test.ts
  - NAMING: describe('Agent.prompt()', () => { describe('provider override', () => { ... }) })
  - COVERAGE: All override scenarios (provider only, options only, both, neither)
  - PLACEMENT: Unit tests alongside other agent tests

Task 5: CREATE test for prompt-level provider override in stream()
  - CREATE: src/__tests__/unit/agent-stream-provider-override.test.ts
  - IMPLEMENT: Test that verifies provider override switches the execution provider
  - IMPLEMENT: Test that verifies providerOptions override merges correctly
  - IMPLEMENT: Test that verifies unregistered provider throws error
  - FOLLOW pattern: Task 4 test structure
  - NAMING: describe('Agent.stream()', () => { describe('provider override', () => { ... }) })
  - COVERAGE: All override scenarios
  - PLACEMENT: Unit tests alongside other agent tests

Task 6: VERIFY existing tests still pass
  - RUN: Full test suite to ensure no regressions
  - VALIDATE: All existing provider configuration tests pass
  - VALIDATE: All existing agent tests pass
  - VALIDATE: All integration tests pass
  - COMMAND: npm test
  - ACCEPTANCE: 100% of existing tests pass
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: Extract prompt-level overrides (from stream() and executePrompt())
const promptProvider = overrides?.provider;
const promptProviderOptions = overrides?.providerOptions;

// Pattern 2: Resolve provider configuration with cascade
const globalConfig = getGlobalProviderConfig();
const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(
  globalConfig,              // Global configuration (lowest priority)
  this.providerId,           // Agent provider override
  this.providerOptions,      // Agent options override
  promptProvider,            // Prompt provider override (highest priority)
  promptProviderOptions      // Prompt options override (highest priority)
);

// Pattern 3: Get provider instance from registry
const registry = ProviderRegistry.getInstance();
const providerInstance = registry.get(resolvedProvider);

// Pattern 4: Handle missing provider (two approaches)

// Approach A: Throw error (used in stream())
if (!providerInstance) {
  throw new Error(`Provider '${resolvedProvider}' is not registered`);
}

// Approach B: Return error response (used in executePrompt())
if (!providerInstance) {
  return createErrorResponse(
    'PROVIDER_NOT_FOUND',
    `Provider '${resolvedProvider}' is not registered`,
    { providerId: resolvedProvider },
    false
  ) as AgentResponse<T>;
}

// Pattern 5: Build ProviderRequest with resolved options
const providerRequest: ProviderRequest = {
  query: userMessage,
  model: effectiveModel,
  system: effectiveSystem,
  tools: effectiveTools,
  options: resolvedProviderOptions,  // CRITICAL: Use resolved options from cascade
  maxTokens: effectiveMaxTokens,
  temperature: effectiveTemperature,
  hooks: providerHooks
};

// Pattern 6: Execute with resolved provider
const response = await providerInstance.execute<T>(
  providerRequest,
  this.toolExecutor.bind(this),
  providerHooks
);
```

### Integration Points

```yaml
IMPORTS:
  - add to: src/core/agent.ts (already present)
  - pattern: |
      import { getGlobalProviderConfig, resolveProviderConfig } from '../utils/provider-config.js';
      import { ProviderRegistry } from '../providers/provider-registry.js';

TYPE_REFERENCES:
  - PromptOverrides: src/types/agent.ts
  - ProviderId: src/types/providers.ts
  - ProviderOptions: src/types/providers.ts
  - ResolvedProviderConfig: src/utils/provider-config.ts (return type of resolveProviderConfig)

CONFIGURATION CASCADE FLOW:
  1. Global config: getGlobalProviderConfig() - lowest priority
  2. Agent config: this.providerId, this.providerOptions - medium priority
  3. Prompt config: overrides?.provider, overrides?.providerOptions - highest priority
  4. Resolution: resolveProviderConfig(global, agentProvider, agentOptions, promptProvider, promptOptions)
  5. Registry: ProviderRegistry.getInstance().get(resolvedProvider)
  6. Execution: providerInstance.execute(..., resolvedProviderOptions, ...)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after any code changes - fix before proceeding
npm run lint              # ESLint checks
npm run format            # Prettier formatting
npm run type-check        # TypeScript type checking

# Project-wide validation
npm run lint:check        # Check linting without auto-fix
npm run format:check      # Check formatting without auto-fix
npm run type-check        # Full type check

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test provider configuration cascade (existing tests)
npm test -- src/__tests__/unit/utils/provider-config.test.ts

# Test agent with prompt-level provider overrides (new tests)
npm test -- src/__tests__/unit/agent-prompt-provider-override.test.ts
npm test -- src/__tests__/unit/agent-stream-provider-override.test.ts

# Test all agent functionality
npm test -- src/__tests__/unit/agent.test.ts

# Test provider registry
npm test -- src/__tests__/unit/providers/provider-registry.test.ts

# Full unit test suite
npm test -- src/__tests__/unit/

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run integration tests
npm test -- src/__tests__/integration/

# Run full test suite
npm test

# Expected: All tests pass, including integration tests.
```

### Level 4: Manual Testing (Optional Verification)

```bash
# If you want to manually verify the behavior

# Create a test script: test-provider-override.ts
import { Agent, configureProviders } from './src/index.js';

// Configure providers
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    opencode: { endpoint: 'http://localhost:8080' }
  }
});

// Create agent with default provider
const agent = new Agent({
  name: 'TestAgent',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514'
});

// Test 1: Default provider (no override)
console.log('Test 1: Default provider');
const result1 = await agent.prompt('Say "test 1"');
console.log('Provider used:', result1.metadata.provider);

// Test 2: Override provider only
console.log('Test 2: Override provider');
const result2 = await agent.prompt('Say "test 2"', {
  provider: 'opencode'
});
console.log('Provider used:', result2.metadata.provider);

// Test 3: Override provider options only
console.log('Test 3: Override provider options');
const result3 = await agent.prompt('Say "test 3"', {
  providerOptions: { timeout: 60000 }
});
console.log('Provider used:', result3.metadata.provider);

// Test 4: Override both provider and options
console.log('Test 4: Override both');
const result4 = await agent.prompt('Say "test 4"', {
  provider: 'opencode',
  providerOptions: { endpoint: 'http://localhost:9090' }
});
console.log('Provider used:', result4.metadata.provider);

# Expected: Each test uses the correct provider based on overrides.
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint:check`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format:check`

### Feature Validation

- [ ] Prompt-level `provider` override correctly switches the provider
- [ ] Prompt-level `providerOptions` override correctly merges with existing options
- [ ] Both `prompt()` and `stream()` methods support prompt-level overrides
- [ ] Provider not registered error is handled gracefully (error response or throw)
- [ ] Agent-level options still apply when switching providers
- [ ] Global configuration still applies as base defaults

### Code Quality Validation

- [ ] Follows existing codebase patterns (nullish coalescing, object spread)
- [ ] File placement matches existing structure
- [ ] Anti-patterns avoided (no `||` instead of `??`, no mutation of inputs)
- [ ] JSDoc comments added if any new functions/parameters introduced
- [ ] Test coverage includes all override scenarios

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable names
- [ ] No breaking changes to existing API
- [ ] Backward compatibility maintained (overrides are optional)
- [ ] Existing tests all pass (no regressions)

## Anti-Patterns to Avoid

- ❌ Don't use `||` instead of `??` for provider resolution (treats 0, '', false as missing)
- ❌ Don't mutate input configuration objects (use object spread instead)
- ❌ Don't skip validation of provider instance from registry (always check for undefined)
- ❌ Don't use `this.provider` directly for execution (always resolve via cascade)
- ❌ Don't forget to pass `resolvedProviderOptions` to `provider.execute()`
- ❌ Don't assume `overrides` parameter is defined (use optional chaining `?.`)
- ❌ Don't create new provider instances on each request (use registry singleton)
- ❌ Don't handle stream() and executePrompt() errors differently without justification

## Context Completeness Validation

✅ This PRP passes the "No Prior Knowledge" test:

- **Type Definitions**: All relevant types are documented with file locations
- **File References**: Specific file paths and line numbers provided for all code
- **Existing Implementation**: Both `stream()` and `executePrompt()` patterns are documented
- **Test Patterns**: Existing test structure and new test requirements specified
- **Gotchas**: All critical implementation details and edge cases documented
- **Validation Commands**: Specific commands for all validation levels provided

**Confidence Score**: 10/10 for one-pass implementation success

The implementation is already complete in the codebase. This PRP serves as verification documentation and test specification for the prompt-level provider override feature.
