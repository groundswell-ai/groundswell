# Agents

Agents are lightweight wrappers around the Anthropic SDK that execute prompts, manage tool invocation cycles, and integrate with caching and reflection systems.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
- [Executing Prompts](#executing-prompts)
- [Reflection](#reflection)
- [Tools and MCP](#tools-and-mcp)
- [Hooks](#hooks)
- [Caching](#caching)
- [API Reference](#api-reference)

## Basic Usage

```typescript
import { createAgent, createPrompt } from 'groundswell';
import { z } from 'zod';

const agent = createAgent({
  name: 'AnalysisAgent',
  model: 'claude-sonnet-4-20250514',
  enableCache: true,
});

const prompt = createPrompt({
  user: 'Analyze this code for bugs',
  data: { code: 'function foo() { return 42; }' },
  responseFormat: z.object({
    bugs: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
  }),
});

const result = await agent.prompt(prompt);
// result is typed: { bugs: string[], severity: 'low' | 'medium' | 'high' }
```

## Configuration

### AgentConfig

```typescript
interface AgentConfig {
  name?: string;                    // Human-readable name
  system?: string;                  // System prompt
  tools?: Tool[];                   // Available tools
  mcps?: MCPServer[];               // MCP servers to connect
  skills?: Skill[];                 // Skills to load
  hooks?: AgentHooks;               // Lifecycle hooks
  env?: Record<string, string>;     // Environment variables
  enableReflection?: boolean;       // Enable reflection capability
  enableCache?: boolean;            // Enable response caching
  model?: string;                   // Model to use
  maxTokens?: number;               // Max tokens for responses
  temperature?: number;             // Response temperature
}
```

### Configuration Priority

Configuration follows a three-level override hierarchy:

1. **Prompt-level** (highest priority)
2. **Execution-level** (via `PromptOverrides`)
3. **Agent-level** (lowest priority)

```typescript
const agent = createAgent({
  system: 'Default system prompt',  // Agent-level
  model: 'claude-sonnet-4-20250514',
});

const prompt = createPrompt({
  user: 'Hello',
  system: 'Override system prompt',  // Prompt-level (wins)
  responseFormat: z.object({ response: z.string() }),
});

// Or override at execution time
const result = await agent.prompt(prompt, {
  model: 'claude-opus-4-5-20251101',  // Execution-level override
});
```

## Executing Prompts

### prompt()

Returns validated response data:

```typescript
const result = await agent.prompt(prompt);
// result is T (the response type)
```

### promptWithMetadata()

Returns full execution metadata:

```typescript
const result = await agent.promptWithMetadata(prompt);

console.log(result.data);       // Validated response
console.log(result.usage);      // { input_tokens, output_tokens }
console.log(result.duration);   // Total time in ms
console.log(result.toolCalls);  // Number of tool invocations
```

### PromptResult

```typescript
interface PromptResult<T> {
  data: T;                  // Validated response
  usage: TokenUsage;        // Token usage stats
  duration: number;         // Duration in milliseconds
  toolCalls: number;        // Number of tool calls
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}
```

## Reflection

Enable self-correction with the `reflect()` method:

```typescript
const agent = createAgent({
  name: 'ReflectiveAgent',
  enableReflection: true,
});

const result = await agent.reflect(prompt);
```

The reflection system prepends a reflection prefix to the system prompt:

```
Before answering, reflect on your reasoning step by step.
Consider alternative approaches and potential errors.
Then provide your final answer.
```

### Reflection Configuration

```typescript
// Agent-level
const agent = createAgent({
  enableReflection: true,
});

// Prompt-level
const prompt = createPrompt({
  user: 'Complex question',
  enableReflection: true,
  responseFormat: schema,
});

// Execution-level
const result = await agent.prompt(prompt, {
  enableReflection: true,
});
```

## Tools and MCP

### Tool Definition

```typescript
import type { Tool } from 'groundswell';

const calculatorTool: Tool = {
  name: 'calculate',
  description: 'Performs arithmetic operations',
  input_schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  },
};
```

### MCP Handler

Register tools with an MCP handler:

```typescript
import { MCPHandler } from 'groundswell';

const mcpHandler = new MCPHandler();

mcpHandler.registerServer({
  name: 'demo',
  transport: 'inprocess',
  tools: [calculatorTool],
});

mcpHandler.registerToolExecutor('demo', 'calculate', async (input) => {
  const { operation, a, b } = input;
  switch (operation) {
    case 'add': return { result: a + b };
    case 'subtract': return { result: a - b };
    case 'multiply': return { result: a * b };
    case 'divide': return { result: a / b };
  }
});

const agent = createAgent({
  tools: mcpHandler.getTools(),
});
```

### Tool Execution Flow

1. Agent sends prompt to API
2. API requests tool use
3. Agent executes tool via MCP handler
4. Result sent back to API
5. Loop continues until no more tool calls
6. Final response validated and returned

## Hooks

Lifecycle hooks enable logging, monitoring, and custom processing:

```typescript
import type { AgentHooks, PreToolUseContext, PostToolUseContext } from 'groundswell';

const hooks: AgentHooks = {
  preToolUse: [
    async (ctx: PreToolUseContext) => {
      console.log(`[PRE] Tool: ${ctx.toolName}`);
      console.log(`Input:`, ctx.input);
    }
  ],
  postToolUse: [
    async (ctx: PostToolUseContext) => {
      console.log(`[POST] Tool: ${ctx.toolName}`);
      console.log(`Output:`, ctx.output);
      console.log(`Duration: ${ctx.duration}ms`);
    }
  ],
  sessionStart: [
    async (ctx) => {
      console.log(`Session started: ${ctx.agentName}`);
    }
  ],
  sessionEnd: [
    async (ctx) => {
      console.log(`Session ended: ${ctx.totalDuration}ms`);
    }
  ],
};

const agent = createAgent({
  hooks,
});
```

### Hook Types

| Hook | Trigger | Context |
|------|---------|---------|
| `preToolUse` | Before tool execution | `toolName`, `input` |
| `postToolUse` | After tool execution | `toolName`, `input`, `output`, `duration` |
| `sessionStart` | Before prompt execution | `agentName`, `promptId` |
| `sessionEnd` | After prompt execution | `agentName`, `totalDuration` |

## Caching

### Enable Caching

```typescript
const agent = createAgent({
  enableCache: true,
});

// First call: API request made, result cached
const result1 = await agent.prompt(prompt);

// Second call: cached result returned
const result2 = await agent.prompt(prompt);
```

### Cache Metrics

```typescript
import { defaultCache } from 'groundswell';

const metrics = defaultCache.metrics();
console.log(`Hits: ${metrics.hits}`);
console.log(`Misses: ${metrics.misses}`);
console.log(`Hit rate: ${metrics.hitRate}%`);
console.log(`Size: ${metrics.size} items`);
console.log(`Size bytes: ${metrics.sizeBytes}`);
```

### Cache Key Generation

Cache keys are deterministic SHA-256 hashes of:
- User message
- Data
- System prompt
- Model
- Temperature
- Max tokens
- Tools
- MCP servers
- Skills
- Response format schema

Identical inputs always produce identical keys.

### Disable Cache for Specific Call

```typescript
const result = await agent.prompt(prompt, {
  disableCache: true,
});
```

### Clear Cache

```typescript
import { defaultCache } from 'groundswell';

await defaultCache.clear();

// Or bust by prefix (agent ID)
await defaultCache.bustPrefix(agent.id);
```

### Cache Configuration

```typescript
import { LLMCache } from 'groundswell';

const customCache = new LLMCache({
  maxItems: 500,           // Default: 1000
  maxSizeBytes: 25_000_000, // Default: 50MB
  defaultTTLMs: 7_200_000,  // Default: 1 hour
});
```

## API Reference

### Agent Class

```typescript
class Agent {
  readonly id: string;
  readonly name: string;

  constructor(config?: AgentConfig);

  prompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>;
  promptWithMetadata<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<PromptResult<T>>;
  reflect<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>;
}
```

### Factory Function

```typescript
function createAgent(config?: AgentConfig): Agent;
```

### PromptOverrides

```typescript
interface PromptOverrides {
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableReflection?: boolean;
  disableCache?: boolean;
}
```

### Types

```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface MCPServer {
  name: string;
  transport: 'inprocess' | 'stdio' | 'http';
  tools?: Tool[];
}

interface Skill {
  name: string;
  path: string;
}

interface AgentHooks {
  preToolUse?: Array<(ctx: PreToolUseContext) => Promise<void>>;
  postToolUse?: Array<(ctx: PostToolUseContext) => Promise<void>>;
  sessionStart?: Array<(ctx: SessionStartContext) => Promise<void>>;
  sessionEnd?: Array<(ctx: SessionEndContext) => Promise<void>>;
}
```

See [examples/08-sdk-features.ts](../examples/examples/08-sdk-features.ts) for tools and hooks usage.
