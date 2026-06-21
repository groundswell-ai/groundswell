# Harness Examples

Comprehensive examples demonstrating Groundswell's harness system, including harness registration, the dual configuration cascade, per-call switching, sessions, and MCP/skills integration.

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Set your API key
export ANTHROPIC_API_KEY=sk-...

# Run individual examples
npm run start:harness-basic
npm run start:harness-config
npm run start:harness-switching
npm run start:harness-scenarios
npm run start:harness-sessions
npm run start:harness-features
```

## Prerequisites

- **Node.js 18+** - Required for ES modules and modern TypeScript features
- **ANTHROPIC_API_KEY** - Set as environment variable for Claude Code harness
- **(Optional) OPENAI_API_KEY** - For OpenAI model demonstrations in example 04

## Examples Overview

### 1. Basic Harness Usage (`01-basic-harness-usage.ts`)

**Run**: `npx tsx examples/harnesses/01-basic-harness-usage.ts`

Demonstrates the minimal setup required to use Groundswell's harness system:

- Harness registration with `HarnessRegistry.getInstance()`
- Registering both `ClaudeCodeHarness` (Anthropic-only) and `PiHarness` (any provider)
- Harness initialization with `initializeProvider()`
- Creating an Agent with a configured harness
- Executing prompts using `Agent.prompt()`

**What you'll learn**:
- The harness lifecycle (register → initialize → use)
- The Harness ⊥ ModelProvider split (PRD §7.1)
- Model strings are NEVER harness-qualified (§7.8)

### 2. Harness Configuration (`02-harness-configuration.ts`)

**Run**: `npx tsx examples/harnesses/02-harness-configuration.ts`

Demonstrates the dual configuration cascade:

- **Global configuration** with `configureHarnesses()`
- **Agent-level configuration** in `new Agent({ harness, harnessOptions })`
- **Prompt-level overrides** in `agent.prompt(prompt, { harness, harnessOptions })`
- **Dual cascade priority** — harness axis + model axis are independent (PRD §7.7)

**What you'll learn**:
- How to set application-wide harness and model defaults
- How the dual cascade works (harness = prompt ?? agent ?? global; options = last-write wins)
- The two independent axes: harness and model/provider

### 3. Harness Switching (`03-harness-switching.ts`)

**Run**: `npx tsx examples/harnesses/03-harness-switching.ts`

Demonstrates how to switch between harnesses and models:

- **Agent-level switching** — Different agents with different harnesses
- **Prompt-level harness switch** — Temporary harness change per call (§7.13)
- **Model-only override** — Change LLM model, harness stays the same (§7.13)
- **Verifying harness usage** via config and capabilities

**What you'll learn**:
- When to use agent-level vs prompt-level switching
- The critical rule: claude-code is Anthropic-only, non-Anthropic requires pi (§7.8)
- Model strings are NEVER harness-qualified

### 4. Multi-Provider Scenarios (`04-multi-provider-scenarios.ts`)

**Run**: `npx tsx examples/harnesses/04-multi-provider-scenarios.ts`

Demonstrates the MODEL axis — different LLM providers while the harness stays CONSTANT (pi):

- **Cost optimization** — Route by task complexity via model selection
- **Multi-provider** — anthropic vs openai on the same pi harness
- **Fallback patterns** — Primary → cheaper model on failure
- **A/B testing** — Compare models empirically

**What you'll learn**:
- The model axis is independent of the harness axis (§7.8)
- claude-code is Anthropic-only; multi-provider requires pi
- Harness stays CONSTANT while you vary the model

### 5. Harness Sessions (`05-harness-sessions.ts`)

**Run**: `npx tsx examples/harnesses/05-harness-sessions.ts`

Demonstrates session management for multi-turn conversations:

- **Creating sessions** with `harnessOptions.sessionId`
- **Continuing sessions** by reusing the same sessionId
- **Retrieving session state** with `harness.getSession()` (claude-code only)
- **Session model differences** between claude-code and pi

**What you'll learn**:
- claude-code has `getSession()`; PiHarness does NOT
- Pi sessions are managed via Pi's SessionManager (fork/switch/clone)
- Session IDs are harness-specific

### 6. Harness Features — MCP & Skills (`06-harness-with-mcp-skills.ts`)

**Run**: `npx tsx examples/harnesses/06-harness-with-mcp-skills.ts`

Demonstrates advanced harness features:

- **MCP server registration** on both harnesses (parity, §7.4)
- **Using MCP tools** in agent prompts
- **Loading skills** — claude-code: system prompt injection; pi: native agentskills.io
- **Harness hooks** for observability
- **Capability matrix** — pi vs claude-code (PRD §7.4)

**What you'll learn**:
- Both harnesses have FULL capability parity (MCP, Skills, LSP, Streaming, Sessions, Extended Thinking)
- The ONLY difference: LLM providers — pi runs ANY, claude-code is Anthropic-only

## Project Structure

```
examples/harnesses/
├── README.md                              # This file
├── 01-basic-harness-usage.ts             # Minimal harness setup
├── 02-harness-configuration.ts           # Dual configuration cascade
├── 03-harness-switching.ts               # Switching patterns
├── 04-multi-provider-scenarios.ts        # Model axis scenarios
├── 05-harness-sessions.ts                # Session management
└── 06-harness-with-mcp-skills.ts         # MCP & skills
```

## Key Concepts

### Harness Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐
│  Register   │ -> │  Initialize  │ -> │    Use     │
│ (Harness    │    │  (Load SDK,  │    │  (Create   │
│  Registry)  │    │   Config)    │    │  Agents)   │
└─────────────┘    └──────────────┘    └────────────┘
```

### Dual Configuration Cascade

The harness axis and model axis are **independent** (PRD §7.7):

**Harness axis** (which adapter runs the prompt):
```
harness = promptHarness ?? agentHarness ?? global.defaultHarness  (first-defined wins)
```

**Options axis** (merged config per harness):
```
options = { ...globalDefaults[harness], ...agentOpts, ...promptOpts }  (last-write wins)
```

**Model axis** — SEPARATE from harness (§7.8):
- Overriding `model` never changes the harness
- Model string format: `"provider/model"` or plain — NEVER harness-qualified

### Capability Comparison (PRD §7.4)

| Feature           | pi                 | claude-code    |
|-------------------|--------------------|----------------|
| MCP Support       | ✓                  | ✓              |
| Skills            | ✓                  | ✓              |
| LSP Support       | ✓                  | ✓              |
| Streaming         | ✓                  | ✓              |
| Sessions          | ✓                  | ✓              |
| Extended Thinking | ✓                  | ✓              |
| **LLM providers** | **any**            | **Anthropic only** |

> Every capability is TRUE for BOTH harnesses. The ONLY difference is the LLM provider row.

## Usage Patterns

### Basic Harness Setup

```typescript
import { Agent, ClaudeCodeHarness, PiHarness, HarnessRegistry } from 'groundswell';

// Register both harnesses
const registry = HarnessRegistry.getInstance();
registry.register(new ClaudeCodeHarness());  // Anthropic-only
registry.register(new PiHarness());           // Any provider (the default)

// Initialize claude-code
await registry.initializeProvider('claude-code', {
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Create agent with harness
const agent = new Agent({ harness: 'claude-code', model: 'anthropic/claude-sonnet-4-20250514' });
```

### Harness Switching

```typescript
// Agent-level switching
const piAgent = new Agent({ harness: 'pi' });
const ccAgent = new Agent({ harness: 'claude-code' });

// Prompt-level harness switch (temporary, one call only)
await agent.prompt(prompt, { harness: 'claude-code' });

// Model-only override (harness unchanged)
await piAgent.prompt(prompt, { model: 'openai/gpt-4o' });
// ⚠️ Do NOT attempt openai/* on claude-code (Anthropic-only)
```

### Session Management

```typescript
// Create session
await agent.prompt(prompt, {
  harnessOptions: { sessionId: 'session-123' }
});

// Continue session
await agent.prompt(prompt2, {
  harnessOptions: { sessionId: 'session-123' }
});

// Retrieve state (claude-code only)
const cc = registry.get('claude-code');
const session = await cc?.getSession('session-123');
```

### MCP Integration

```typescript
const cc = registry.get('claude-code');
const pi = registry.get('pi');

// Both harnesses accept the same MCPServer (parity)
await cc.registerMCPs([{ name: 'demo-server', transport: 'inprocess', tools: [...] }]);
await pi.registerMCPs([{ name: 'demo-server', transport: 'inprocess', tools: [...] }]);
```

## Common Patterns

### Cost Optimization (Model Axis)

```typescript
// Both agents use pi harness; only the model changes
const simpleAgent = new Agent({ harness: 'pi', model: 'anthropic/claude-haiku-4-20250514' });
const complexAgent = new Agent({ harness: 'pi', model: 'anthropic/claude-sonnet-4-20250514' });
```

### Fallback Pattern

```typescript
try {
  return await agent.prompt(prompt, { model: 'anthropic/claude-sonnet-4-20250514' });
} catch (error) {
  return await agent.prompt(prompt, { model: 'anthropic/claude-haiku-4-20250514' });
}
```

### A/B Testing

```typescript
const models = ['anthropic/claude-sonnet-4-20250514', 'openai/gpt-4o'];
for (const model of models) {
  results[model] = await piAgent.prompt(prompt, { model });
}
```

## Troubleshooting

### Harness Not Registered Error

```
Error: Harness 'claude-code' is not registered
```

**Solution**: Always register harnesses before creating agents:
```typescript
registry.register(new ClaudeCodeHarness());
registry.register(new PiHarness());
```

### SDK Not Initialized Error

```
Error: SDK not initialized. Call initialize() first.
```

**Solution**: Initialize harnesses before use:
```typescript
await registry.initializeProvider('claude-code');
```

### Environment Variable Missing

```
Error: ANTHROPIC_API_KEY environment variable not set
```

**Solution**: Set the required environment variable:
```bash
export ANTHROPIC_API_KEY=sk-...
```

### Invalid Harness-Qualified Model String

```
Error: Harness must not appear in model string
```

**Solution**: Model strings are NEVER harness-qualified (§7.8):
```typescript
// ✓ Valid
model: 'anthropic/claude-sonnet-4-20250514'
model: 'claude-sonnet-4-20250514'

// ✗ Invalid — harness-qualified
model: 'pi/anthropic/claude-sonnet-4-20250514'
model: 'cc/anthropic/claude-sonnet-4-20250514'
```

## Best Practices

1. **Always register harnesses before creating agents**
2. **Initialize harnesses before executing prompts**
3. **Use `pi` for multi-provider scenarios** — claude-code is Anthropic-only
4. **Never harness-qualify model strings** — use `"provider/model"` format only
5. **Use prompt-level overrides for temporary changes**
6. **Check harness.capabilities before using features**
7. **Implement fallback patterns for production**
8. **Use hooks for observability and debugging**
9. **Handle errors gracefully at all harness levels**

## See Also

- [Harness Documentation](../../docs/harnesses.md) - Complete harness system documentation
- [Main Examples README](../README.md) - All Groundswell examples
- [Migration Guide](../../docs/migration-provider-to-harness.md) - Migrating from provider to harness API

## License

MIT
