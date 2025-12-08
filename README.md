# Groundswell

Hierarchical workflow orchestration engine with full observability.

## Installation

```bash
npm install groundswell
```

**Requirements:** Node.js 18+, TypeScript 5.2+

## Quick Start

### Class-Based Workflow

```typescript
import { Workflow, Step, ObservedState, WorkflowTreeDebugger } from 'groundswell';

class DataProcessor extends Workflow {
  @ObservedState()
  progress = 0;

  @Step({ trackTiming: true, snapshotState: true })
  async process(): Promise<string[]> {
    this.progress = 100;
    return ['item1', 'item2', 'item3'];
  }

  async run(): Promise<string[]> {
    this.setStatus('running');
    const result = await this.process();
    this.setStatus('completed');
    return result;
  }
}

const workflow = new DataProcessor('DataProcessor');
const debugger_ = new WorkflowTreeDebugger(workflow);

const result = await workflow.run();
console.log(debugger_.toTreeString());
```

### Functional Workflow

```typescript
import { createWorkflow } from 'groundswell';

const workflow = createWorkflow(
  { name: 'DataPipeline' },
  async (ctx) => {
    const loaded = await ctx.step('load', async () => fetchData());
    const processed = await ctx.step('process', async () => transform(loaded));
    return processed;
  }
);

const result = await workflow.run();
```

### Agent with Prompt

```typescript
import { createAgent, createPrompt } from 'groundswell';
import { z } from 'zod';

const agent = createAgent({
  name: 'AnalysisAgent',
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
// result is typed as { bugs: string[], severity: 'low' | 'medium' | 'high' }
```

## Documentation

- [Workflows](docs/workflow.md) - Hierarchical task orchestration
- [Agents](docs/agent.md) - LLM execution with caching and reflection
- [Prompts](docs/prompt.md) - Type-safe prompt definitions with Zod

## Core Concepts

### Workflows

The primary orchestration unit. Manage execution status, emit events, and support hierarchical parent-child relationships. Two patterns are supported:
- **Class-based**: Extend `Workflow` and override `run()`
- **Functional**: Use `createWorkflow()` with an executor function

### Agents

Lightweight wrappers around the Anthropic SDK. Execute prompts, manage tool invocation cycles, and integrate with caching and reflection systems.

### Prompts

Immutable value objects defining what to send to an agent and how to validate the response using Zod schemas.

## Decorators

```typescript
// Emit lifecycle events and track timing
@Step({ trackTiming: true, snapshotState: true })
async processData(): Promise<void> { }

// Spawn and manage child workflows
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }

// Mark fields for state snapshots
@ObservedState()
progress: number = 0;

@ObservedState({ redact: true })  // Shown as '***'
apiKey: string = 'secret';
```

## Caching

LLM responses are cached using deterministic SHA-256 keys:

```typescript
import { createAgent, defaultCache } from 'groundswell';

const agent = createAgent({ enableCache: true });

const result1 = await agent.prompt(prompt);  // API call
const result2 = await agent.prompt(prompt);  // Cached

console.log(defaultCache.metrics());  // { hits: 1, misses: 1, hitRate: 50 }
```

## Reflection

Multi-level error recovery with automatic retry:

```typescript
const workflow = createWorkflow(
  { name: 'MyWorkflow', enableReflection: true },
  async (ctx) => {
    await ctx.step('unreliable-operation', async () => {
      // If this fails, reflection will analyze and retry
    });
  }
);
```

## Introspection Tools

Agents can inspect their position in the workflow hierarchy:

```typescript
import { INTROSPECTION_TOOLS, createAgent } from 'groundswell';

const agent = createAgent({
  name: 'IntrospectionAgent',
  tools: INTROSPECTION_TOOLS,  // 6 tools for hierarchy navigation
});
```

## Examples

```bash
npm run start:all              # Interactive runner
npm run start:basic            # Basic workflow
npm run start:decorators       # Decorator options
npm run start:parent-child     # Hierarchical workflows
npm run start:observers        # Observers and debugger
npm run start:errors           # Error handling
npm run start:concurrent       # Concurrent tasks
npm run start:agent-loops      # Agent loops
npm run start:sdk-features     # Tools, MCPs, hooks
npm run start:reflection       # Multi-level reflection
npm run start:introspection    # Introspection tools
```

See [examples/](examples/) for source code.

## API Reference

| Category | Exports |
|----------|---------|
| **Core** | `Workflow`, `Agent`, `Prompt`, `MCPHandler` |
| **Factories** | `createWorkflow`, `createAgent`, `createPrompt` |
| **Decorators** | `@Step`, `@Task`, `@ObservedState` |
| **Caching** | `LLMCache`, `defaultCache`, `generateCacheKey` |
| **Reflection** | `ReflectionManager`, `executeWithReflection` |
| **Introspection** | `INTROSPECTION_TOOLS`, `handleInspectCurrentNode`, ... |
| **Debugging** | `WorkflowTreeDebugger`, `Observable` |

## Contributing

Contributions and issues are welcome.

## Support

https://buymeacoffee.com/dustindsch2

## License

MIT
