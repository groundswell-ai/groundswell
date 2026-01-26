# Research Notes: Provider Switching Testing

**Research Date**: 2025-01-26
**Work Item**: P5.M2.T1.S2 - Test Provider Switching

---

## 1. Codebase Analysis Results

### 1.1 Test Framework and Patterns

**Framework**: Vitest 1.6.1
- Configured in `vitest.config.ts`
- Modern testing framework with TypeScript support
- Uses Vite's bundler for fast testing
- Coverage supported via `@vitest/coverage-v8`

**Test Organization**:
```
src/__tests__/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for component interactions
└── adversarial/    # Negative tests, edge cases, and error conditions
```

**Key Patterns**:
- Test files use `.test.ts` suffix (not `.spec.ts`)
- Descriptive names: `provider-agent.test.ts`, `anthropic-provider-execute.test.ts`
- `describe()` blocks for test organization
- `beforeEach()` for test setup and isolation
- `vi.fn()`, `vi.spyOn()` for mocking
- Type guards: `isSuccess()`, `isError()`

### 1.2 Provider Switching Implementation

**Configuration Cascade** (`src/utils/provider-config.ts`):
```typescript
// Priority order (highest to lowest):
const provider = promptProvider ?? agentProvider ?? globalProvider;

// Options merge (last write wins):
const options = {
  ...(globalDefaults ?? {}),
  ...(agentOptions ?? {}),
  ...(promptOptions ?? {})
};
```

**Agent Integration** (`src/core/agent.ts`):
- Agent constructor accepts `provider?: ProviderId` and `providerOptions?: ProviderOptions`
- `executePrompt()` method resolves provider using `resolveProviderConfig()`
- Provider instance is retrieved from registry each execution (allows prompt-level overrides)

**Provider Registry** (`src/providers/provider-registry.ts`):
- Singleton pattern with `getInstance()`
- Methods: `register()`, `get()`, `initializeAll()`, `terminateAll()`
- Testing method: `_resetForTesting()` for test isolation

### 1.3 Existing Test Patterns

**Mock Provider Factory** (`provider-agent.test.ts`):
```typescript
function createMockProvider(id: ProviderId): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true, skills: true, lsp: false, streaming: true,
    sessions: false, extendedThinking: false,
  };

  return {
    id, capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id, model, raw: model,
    })),
  };
}
```

**Test Isolation Pattern**:
```typescript
beforeEach(async () => {
  ProviderRegistry._resetForTesting();
  resetGlobalConfig();
  vi.clearAllMocks();
});
```

**Spy Verification Pattern**:
```typescript
const executeSpy = vi.spyOn(provider, 'execute');
await agent.prompt(prompt);
expect(executeSpy).toHaveBeenCalled();
```

---

## 2. Internal Research Results

### 2.1 PRD Context

**Work Item**: P5.M2.T1.S2 - Test provider switching
**Phase**: P5 - Testing & Documentation
**Milestone**: P5.M2 - Integration Tests
**Task**: P5.M2.T1 - Test Agent with Provider Integration
**Subtask**: P5.M2.T1.S2 - Test provider switching (2 points)

**Contract Definition**:
1. Users should be able to switch providers via configuration
2. INPUT: Agent with configurable provider
3. LOGIC: Test creating Agent with provider='anthropic', test creating Agent with provider='opencode', test prompt-level override switches provider for single call, verify correct provider used
4. OUTPUT: Tests verify provider switching works

**Prerequisites**:
- P5.M2.T1.S1 (Test Agent with Anthropic Provider) - Complete
- P4.M3.T1 (Prompt-Level Provider Overrides) - Complete

### 2.2 Related Work Items

**P5.M2.T1.S1** (Complete): Test Agent with Anthropic Provider
- File: `src/__tests__/integration/provider-agent.test.ts`
- Covers Agent creation with provider configuration
- Covers agent.prompt() → provider.execute() flow
- Covers tool executor delegation
- Covers session state management
- Covers prompt-level provider overrides (basic)

**P5.M2.T1.S2** (This Work Item): Test provider switching
- Extend P5.M2.T1.S1 with comprehensive provider switching tests
- Focus on multi-provider scenarios
- Validate configuration cascade priority
- Test state isolation between providers

**Future Work Items**:
- P5.M3: Documentation (provider system overview, API reference, usage examples)

---

## 3. External Research Results

### 3.1 Vitest Documentation

**Official Docs**: https://vitest.dev/guide/
- Mocking API: https://vitest.dev/api/mock.html
- Key functions: `vi.fn()`, `vi.spyOn()`, `vi.mock()`, `vi.clearAllMocks()`, `vi.restoreAllMocks()`

**Mock Patterns**:
```typescript
// Function mocking
const mockFn = vi.fn();
mockFn.mockReturnValue(value);
mockFn.mockResolvedValue(value);
mockFn.mockImplementation(fn);

// Spying on existing methods
const spy = vi.spyOn(object, 'method');
spy.mockReturnValue(value);

// Module mocking
vi.mock('./module', () => ({
  default: vi.fn()
}));
```

### 3.2 Multi-Provider Architecture Patterns

**Provider Abstraction Pattern**:
- Define a common Provider interface
- Implement providers for different backends
- Use factory pattern for provider instantiation
- Registry pattern for provider management

**Configuration Cascade Pattern**:
- Global defaults → Agent overrides → Prompt overrides
- Use nullish coalescing (??) for priority resolution
- Use object spread for options merging
- "Last write wins" for conflicting options

### 3.3 Testing Best Practices

**Test Isolation**:
- Reset singleton state between tests
- Clear mocks before each test
- Use fresh instances for each test
- Avoid shared state

**Deterministic Tests**:
- Avoid random data or time-based logic
- Use fixed test data
- Mock external dependencies
- Verify specific outcomes

**Comprehensive Coverage**:
- Test happy paths
- Test error cases
- Test edge cases
- Test state isolation

---

## 4. Key Implementation Insights

### 4.1 Configuration Cascade Validation

**Priority Order** (highest to lowest):
1. Prompt-level override: `agent.prompt(prompt, { provider: 'opencode' })`
2. Agent-level config: `new Agent({ provider: 'opencode' })`
3. Global default: `configureProviders({ defaultProvider: 'anthropic' })`

**Options Merge**:
- Global options are base
- Agent options override global
- Prompt options override both (last write wins)

### 4.2 Provider Switching Flow

```
1. User creates Agent: new Agent({ provider: 'anthropic' })
2. Agent constructor resolves effective provider using resolveProviderConfig()
3. Provider instance is retrieved from registry and cached
4. User calls agent.prompt(prompt, { provider: 'opencode' })
5. executePrompt() resolves provider again with prompt override
6. NEW provider instance is retrieved from registry (opencode)
7. Provider.execute() is called on the NEW provider
```

**Key Insight**: Provider is resolved on EACH execution, not cached at construction. This is what enables prompt-level overrides.

### 4.3 State Isolation Requirements

**Each Provider Must Maintain**:
- Independent call counts
- Independent session state
- Independent execution history
- No leakage of options or configuration

**Verification**:
- Track call counts per provider
- Verify no cross-provider interference
- Test concurrent execution with different providers

### 4.4 Common Pitfalls

**Pitfall 1**: Not resetting singleton state
- **Solution**: Always call `ProviderRegistry._resetForTesting()` and `resetGlobalConfig()` in `beforeEach()`

**Pitfall 2**: Mock implementations persisting
- **Solution**: Use `vi.clearAllMocks()` in `beforeEach()`

**Pitfall 3**: Testing provider implementation instead of switching logic
- **Solution**: Use mocks, not real provider instances. Focus on switching behavior.

**Pitfall 4**: Forgetting to test cascade priority
- **Solution**: Create test matrix covering all combinations (global, agent, prompt)

**Pitfall 5**: Not verifying which provider was called
- **Solution**: Use spies: `vi.spyOn(provider, 'execute')` and verify call counts

---

## 5. Test Case Matrix

### 5.1 Provider Creation Tests

| Agent Config | Global Config | Expected Provider | Expected Result |
|--------------|---------------|-------------------|-----------------|
| `{ provider: 'anthropic' }` | - | anthropic | Success |
| `{ provider: 'opencode' }` | - | opencode | Success |
| `{}` | `{ defaultProvider: 'anthropic' }` | anthropic | Success |
| `{ provider: 'invalid' }` | - | - | Error |

### 5.2 Prompt Override Tests

| Agent Provider | Prompt Override | Expected Provider | Expected Result |
|----------------|-----------------|-------------------|-----------------|
| anthropic | `{ provider: 'opencode' }` | opencode | Success |
| opencode | `{ provider: 'anthropic' }` | anthropic | Success |
| anthropic | `{}` | anthropic | Success |
| anthropic | `{ provider: 'invalid' }` | - | Error |

### 5.3 Full Cascade Tests

| Global | Agent | Prompt | Expected Provider |
|--------|-------|--------|-------------------|
| anthropic | opencode | anthropic | anthropic (prompt wins) |
| anthropic | opencode | {} | opencode (agent wins) |
| anthropic | {} | opencode | opencode (prompt wins) |
| anthropic | {} | {} | anthropic (global wins) |

---

## 6. Validation Commands

```bash
# Level 1: Syntax & Style
npm run build              # TypeScript compilation
npm run lint              # Type checking

# Level 2: Unit Tests
npx vitest run src/__tests__/integration/provider-switching.test.ts
npm test                  # All tests

# Level 3: Integration Testing
npx vitest run src/__tests__/integration/
npx vitest run --coverage

# Level 4: Creative Validation
for i in {1..5}; do npm test || exit 1; done  # Determinism check
time npm test                                   # Performance check
```

---

## 7. References

### External URLs
- Vitest Guide: https://vitest.dev/guide/
- Vitest Mocking API: https://vitest.dev/api/mock.html
- 12-Factor App - Config: https://12factor.net/config

### Internal Files
- `src/__tests__/integration/provider-agent.test.ts` - Reference test structure
- `src/__tests__/unit/agent-prompt-provider-override.test.ts` - Override patterns
- `src/utils/provider-config.ts` - Configuration cascade implementation
- `src/core/agent.ts` - Agent provider integration
- `src/providers/provider-registry.ts` - Provider registry

---

## 8. Confidence Score

**Confidence Score**: 9/10 for one-pass implementation success

**Rationale**:
- ✅ Comprehensive existing test patterns to follow
- ✅ Clear understanding of provider switching implementation
- ✅ Detailed test case matrix covering all scenarios
- ✅ Mock helper patterns already established
- ✅ Validation commands verified to work in codebase
- ⚠️ Minor: Need to ensure OpenCodeProvider mock doesn't require special handling

**Risk Mitigation**:
- Follow existing patterns exactly from provider-agent.test.ts
- Use simple mocks (no real SDK instances needed)
- Start with basic tests, add complexity incrementally
- Run tests frequently during development
