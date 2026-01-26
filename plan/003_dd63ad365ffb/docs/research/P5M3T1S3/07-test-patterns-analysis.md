# Research Notes: Test Patterns Analysis

## Overview
Analysis of provider-related test files to understand real usage patterns and translate them into documentation examples.

## Key Test Files to Reference

### Integration Test Files

1. **`src/__tests__/integration/provider-switching.test.ts`**
   - Comprehensive provider switching functionality
   - Configuration cascade testing (global → agent → prompt)
   - Multi-provider state isolation
   - Error handling for unregistered providers

2. **`src/__tests__/integration/provider-agent.test.ts`**
   - Agent → Provider → SDK integration flow
   - Tool executor delegation through Agent.toolExecutor → MCPHandler
   - Session state management (creation, continuation, history)
   - Type safety with discriminated unions

3. **`src/__tests__/unit/providers/provider-registry.test.ts`**
   - Singleton pattern implementation
   - Provider registration and retrieval
   - State management and reset functionality

## Real Usage Patterns from Tests

### Provider Initialization Patterns

```typescript
// Basic initialization
const provider = new AnthropicProvider();
await provider.initialize();

// With registry
const registry = ProviderRegistry.getInstance();
registry.register(provider);
await registry.initializeProvider('anthropic');
```

### Global Configuration Patterns

```typescript
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: {
      apiKey: 'sk-test',
      timeout: 30000,
      endpoint: 'https://api.anthropic.com'
    },
    opencode: {
      endpoint: 'http://localhost:8080',
      timeout: 60000
    }
  }
});
```

### Agent Creation Patterns

```typescript
const agent = new Agent({
  provider: 'anthropic',
  providerOptions: { timeout: 10000, apiKey: 'sk-agent' },
  model: 'claude-sonnet-4-20250514',
  system: 'You are a helpful assistant'
});
```

### Prompt-Level Provider Override Patterns

```typescript
const prompt = new Prompt({
  user: 'What is 2+2?',
  responseFormat: z.object({ result: z.string() })
});

// Override provider at prompt level
const response = await agent.prompt(prompt, {
  provider: 'opencode',
  providerOptions: { timeout: 5000, endpoint: 'https://prompt.com' }
});
```

### Session Management Patterns

```typescript
// Create new session
const response1 = await agent.prompt(prompt, {
  providerOptions: { sessionId: 'session-123' }
});

// Continue existing session
const response2 = await agent.prompt(prompt, {
  providerOptions: { sessionId: 'session-123' }
});
```

### Streaming Patterns

```typescript
const { stream } = agent.stream(prompt, { provider: 'opencode' });
for await (const event of stream) {
  // Handle streaming events
}
```

## Test-to-Example Translation

### Patterns That Translate Well to Examples

#### 1. Configuration Cascade Example

```typescript
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { timeout: 30000, apiKey: 'sk-global' }
  }
});

const agent = new Agent({ provider: 'opencode' });
// Prompt override wins over agent and global config
```

#### 2. Multi-Provider Setup Example

```typescript
const anthropicProvider = createMockProvider('anthropic');
const opencodeProvider = createMockProvider('opencode');
ProviderRegistry.getInstance().register(anthropicProvider);
ProviderRegistry.getInstance().register(opencodeProvider);

const agent1 = new Agent({ provider: 'anthropic' });
const agent2 = new Agent({ provider: 'opencode' });
```

#### 3. Provider Switching Example

```typescript
// Agent with anthropic default
const agent = new Agent({ provider: 'anthropic' });

// Switch to opencode for specific prompt
await agent.prompt(prompt, { provider: 'opencode' });
// Back to anthropic for next prompt
await agent.prompt(prompt);
```

## Setup Patterns Users Need to Know

### Essential Setup Code

#### 1. Provider Registration (Always Required)

```typescript
// Always required before creating agents
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
registry.register(new OpenCodeProvider());
```

#### 2. Initialization (Required Before Use)

```typescript
// Required before use
await registry.initializeProvider('anthropic');
await registry.initializeProvider('opencode');
```

#### 3. Configuration (Optional but Recommended)

```typescript
// Set global defaults
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
  }
});
```

## "Gotchas" Revealed by Tests

### 1. Provider Registry State Isolation

- Tests repeatedly call `ProviderRegistry._resetForTesting()` between tests
- Users need to understand that the registry maintains global state
- Multiple providers must be registered before creating agents

### 2. Initialization Order

- Provider must be initialized before it can be used
- `initialize()` is idempotent but must be called at least once
- Agent creation fails if provider isn't registered and initialized

### 3. Configuration Priority

- Prompt-level overrides always win
- Agent-level config wins over global defaults
- Missing options cascade down but don't override

### 4. Error Handling Patterns

- Tests expect specific error codes: `PROVIDER_NOT_FOUND`, `PROVIDER_EXECUTION_FAILED`
- Error responses have structured format with `code`, `message`, `recoverable` flag
- Type guards `isSuccess()` and `isError()` are essential for safe handling

### 5. Session Management

- Sessions are provider-specific (Anthropic vs OpenCode have different session models)
- Session ID must be provided to continue an existing session
- Without session ID, each prompt creates a new conversation

## Code Patterns from Tests That Should Become Examples

### 1. Basic Provider Setup

```typescript
const registry = ProviderRegistry.getInstance();
const anthropicProvider = new AnthropicProvider();
registry.register(anthropicProvider);
await registry.initializeProvider('anthropic');
```

### 2. Agent with All Options

```typescript
const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  system: 'You are a helpful assistant',
  providerOptions: { timeout: 10000 }
});
```

### 3. Structured Output with Provider Switching

```typescript
const schema = z.object({
  answer: z.string(),
  confidence: z.number()
});

const prompt = new Prompt({
  user: 'What is 2+2?',
  responseFormat: schema
});

// Use different provider for structured output
const response = await agent.prompt(prompt, {
  provider: 'opencode'
});
```

## Test Mocks to Replace in Examples

### 1. Replace `createMockProvider()` with actual implementations

```typescript
// Instead of mocking:
const provider = createMockProvider('anthropic');

// Use real provider:
const provider = new AnthropicProvider();
await provider.initialize();
```

### 2. Replace test tool executor with real MCP tools

```typescript
// Instead of:
const toolExecutor = vi.fn().mockResolvedValue({
  content: 'Tool result',
  isError: false
});

// Use actual MCP server integration
```

### 3. Replace async generator mocks with real SDK responses

```typescript
// Instead of complex mocked generators
// Use actual provider responses
```

## Key Takeaway for PRP

The tests demonstrate sophisticated provider usage patterns that translate well into comprehensive examples:

### High-Value Patterns for Examples

1. **Configuration cascade**: Show global → agent → prompt priority
2. **Multi-provider setup**: Register and initialize multiple providers
3. **Provider switching**: Switch at agent and prompt levels
4. **Session management**: Create and continue sessions
5. **Error handling**: Handle unregistered providers, initialization failures

### Setup Code Users Must Know

- Provider registration is always required
- Initialization must happen before use
- Configuration is optional but recommended
- Session IDs are required for multi-turn conversations

### "Gotchas" to Document

- Registry maintains global state
- Initialization order matters
- Configuration priority is strict (prompt > agent > global)
- Sessions are provider-specific
- Error responses have structured format

### Test-to-Example Translation

The key is to extract the setup patterns while replacing test mocks with real implementations. Focus on:

- Real provider instantiations (not mocks)
- Actual API keys from environment (not test strings)
- Real MCP tools (not mocked tool executors)
- Actual SDK responses (not mocked generators)
