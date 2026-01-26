# Provider Examples

Comprehensive examples demonstrating Groundswell's provider system, including provider registration, configuration, and advanced features.

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Set your API key
export ANTHROPIC_API_KEY=sk-...

# Run individual examples
npm run start:provider-basic
npm run start:provider-config
npm run start:provider-switching
npm run start:provider-scenarios
npm run start:provider-sessions
npm run start:provider-features
```

## Prerequisites

- **Node.js 18+** - Required for ES modules and modern TypeScript features
- **ANTHROPIC_API_KEY** - Set as environment variable for Anthropic provider

## Examples Overview

### 1. Basic Provider Usage (`01-basic-provider-usage.ts`)

**Run**: `npx tsx examples/providers/01-basic-provider-usage.ts`

Demonstrates the minimal setup required to use Groundswell's provider system:

- Provider registration with `ProviderRegistry.getInstance()`
- Provider initialization with `initializeProvider()`
- Creating an Agent with a configured provider
- Executing prompts using `Agent.prompt()`

**What you'll learn**:
- The provider lifecycle (register → initialize → use)
- How the ProviderRegistry singleton works
- Creating agents with provider configuration

### 2. Provider Configuration (`02-provider-configuration.ts`)

**Run**: `npx tsx examples/providers/02-provider-configuration.ts`

Demonstrates the three levels of provider configuration:

- **Global configuration** with `configureProviders()`
- **Agent-level configuration** in `new Agent({ provider })`
- **Prompt-level overrides** in `agent.prompt(prompt, { provider })`
- **Configuration cascade priority** (Prompt > Agent > Global)

**What you'll learn**:
- How to set application-wide defaults
- How configuration cascades through the system
- When to use each configuration level

### 3. Provider Switching (`03-provider-switching.ts`)

**Run**: `npx tsx examples/providers/03-provider-switching.ts`

Demonstrates how to switch between providers:

- **Agent-level switching** - Different agents with different providers
- **Prompt-level switching** - Temporary provider changes per prompt
- **Verifying provider usage** via config and capabilities
- **Choosing the right pattern** for your use case

**What you'll learn**:
- When to use agent-level vs prompt-level switching
- How to verify which provider is being used
- Checking provider capabilities before switching

### 4. Multi-Provider Scenarios (`04-multi-provider-scenarios.ts`)

**Run**: `npx tsx examples/providers/04-multi-provider-scenarios.ts`

Demonstrates real-world multi-provider use cases:

- **Cost optimization** - Route based on task complexity
- **Fallback patterns** - Automatic failover on failure
- **A/B testing** - Compare providers empirically
- **Architecture patterns** - Production-ready designs

**What you'll learn**:
- Implementing cost-aware provider routing
- Building resilient multi-provider systems
- A/B testing between providers
- Production architecture patterns

### 5. Provider Sessions (`05-provider-sessions.ts`)

**Run**: `npx tsx examples/providers/05-provider-sessions.ts`

Demonstrates session management for multi-turn conversations:

- **Creating sessions** with `providerOptions.sessionId`
- **Continuing sessions** by reusing the same sessionId
- **Retrieving session state** with `provider.getSession()`
- **Provider session model differences**

**What you'll learn**:
- How sessions work across different providers
- Session lifecycle management
- Best practices for session persistence

### 6. Provider Features (MCP & Skills) (`06-provider-with-mcp-skills.ts`)

**Run**: `npx tsx examples/providers/06-provider-with-mcp-skills.ts`

Demonstrates advanced provider features:

- **MCP server registration** with AnthropicProvider
- **Using MCP tools** in agent prompts
- **Loading skills** from SKILL.md files
- **Provider hooks** for observability
- **Feature comparison** across providers

**What you'll learn**:
- Integrating Model Context Protocol (MCP) servers
- Enhancing agents with skills
- Using hooks for monitoring and debugging
- Understanding provider capability differences

## Project Structure

```
examples/providers/
├── README.md                              # This file
├── 01-basic-provider-usage.ts             # Minimal provider setup
├── 02-provider-configuration.ts           # Configuration levels
├── 03-provider-switching.ts               # Switching patterns
├── 04-multi-provider-scenarios.ts         # Real-world scenarios
├── 05-provider-sessions.ts                # Session management
└── 06-provider-with-mcp-skills.ts         # MCP & skills
```

## Key Concepts

### Provider Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐
│  Register   │ -> │  Initialize  │ -> │    Use     │
│ (Provider   │    │  (Load SDK,  │    │  (Create   │
│  Registry)  │    │   Config)    │    │  Agents)   │
└─────────────┘    └──────────────┘    └────────────┘
```

### Configuration Cascade

Priority from highest to lowest:

1. **Prompt-level** - `agent.prompt(prompt, { provider, providerOptions })`
2. **Agent-level** - `new Agent({ provider, providerOptions })`
3. **Global** - `configureProviders({ defaultProvider, providerDefaults })`

### Provider Capabilities Comparison

| Feature         | Anthropic |
|-----------------|-----------|
| MCP Support     | ✓         |
| Skills          | ✓         |
| LSP Support     | ✓         |
| Streaming       | ✓         |
| Sessions        | ✓         |
| Extended Thinking| ✓        |

## Usage Patterns

### Basic Provider Setup

```typescript
import { Agent, AnthropicProvider, ProviderRegistry } from 'groundswell';

// Register provider
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());

// Initialize provider
await registry.initializeProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Create agent
const agent = new Agent({ provider: 'anthropic' });
```

### Provider Switching (Model Selection)

```typescript
// Agent-level switching with different models
const fastAgent = new Agent({ provider: 'anthropic', model: 'claude-haiku-4-20250514' });
const smartAgent = new Agent({ provider: 'anthropic', model: 'claude-sonnet-4-20250514' });

// Prompt-level switching
await agent.prompt(prompt, { model: 'claude-opus-4-20250514' });
```

### Session Management

```typescript
// Create session
await agent.prompt(prompt, {
  providerOptions: { sessionId: 'session-123' }
});

// Continue session
await agent.prompt(prompt2, {
  providerOptions: { sessionId: 'session-123' }
});
```

### MCP Integration

```typescript
const provider = registry.get('anthropic');
await provider.registerMCPs([{
  name: 'demo-server',
  transport: 'inprocess',
  tools: [/* tool definitions */]
}]);
```

## Common Patterns

### Cost Optimization

```typescript
// Route simple tasks to faster model
const complexity = analyzeTask(task);
const model = complexity === 'simple' ? 'claude-haiku-4-20250514' : 'claude-sonnet-4-20250514';
await agent.prompt(prompt, { model });
```

### Fallback Pattern

```typescript
try {
  return await agent.prompt(prompt, { model: 'claude-sonnet-4-20250514' });
} catch (error) {
  return await agent.prompt(prompt, { model: 'claude-haiku-4-20250514' });
}
```

### A/B Testing

```typescript
const results = {};
const models = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'];
for (const model of models) {
  results[model] = await agent.prompt(prompt, { model });
}
// Compare results
```

## Troubleshooting

### Provider Not Registered Error

```
Error: Provider 'anthropic' is not registered
```

**Solution**: Always register providers before creating agents:
```typescript
registry.register(new AnthropicProvider());
```

### SDK Not Initialized Error

```
Error: SDK not initialized. Call initialize() first.
```

**Solution**: Initialize providers before use:
```typescript
await registry.initializeProvider('anthropic');
```

### Environment Variable Missing

```
Error: ANTHROPIC_API_KEY environment variable not set
```

**Solution**: Set the required environment variable:
```bash
export ANTHROPIC_API_KEY=sk-...
```

## Best Practices

1. **Always register providers before creating agents**
2. **Initialize providers before executing prompts**
3. **Use prompt-level overrides for temporary changes**
4. **Check provider capabilities before using features**
5. **Implement fallback patterns for production**
6. **Use hooks for observability and debugging**
7. **Handle errors gracefully at all provider levels**
8. **Monitor provider performance and costs**

## See Also

- [Provider Documentation](../../docs/providers.md) - Complete provider system documentation
- [Main Examples README](../README.md) - All Groundswell examples
- [Provider API Reference](../../docs/providers.md#api-reference) - Detailed API documentation

## License

MIT
