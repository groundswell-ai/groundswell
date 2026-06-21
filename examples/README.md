# Groundswell Workflow Engine - Examples

Comprehensive examples showcasing all features and configuration options of the Groundswell hierarchical workflow engine.

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run all examples
npm run start:all

# Or run individual examples
npm run start:basic
npm run start:decorators
npm run start:parent-child
npm run start:observers
npm run start:errors
npm run start:concurrent
npm run start:agent-loops
npm run start:sdk-features
npm run start:reflection
npm run start:introspection
npm run start:reparenting
```

## Examples Overview

### 1. Basic Workflow (`01-basic-workflow.ts`)

Core workflow concepts:
- Creating workflows by extending `Workflow` base class
- Using `WorkflowLogger` for structured logging
- Managing workflow status (`idle` → `running` → `completed`/`failed`)
- Using `WorkflowTreeDebugger` for visualization

### 2. Decorator Options (`02-decorator-options.ts`)

All decorator configuration options:

**@Step options:**
- `name` - Custom step name (defaults to method name)
- `snapshotState` - Capture state after step completion
- `trackTiming` - Track and emit step duration
- `logStart` - Log message at step start
- `logFinish` - Log message at step end

**@Task options:**
- `name` - Custom task name
- `concurrent` - Run returned workflows concurrently

**@ObservedState options:**
- `hidden` - Exclude from state snapshots
- `redact` - Show as `***` in snapshots (for sensitive data)

### 3. Parent-Child Workflows (`03-parent-child.ts`)

Hierarchical workflow structures:
- Multi-level workflow hierarchies
- Automatic parent-child attachment
- `@Task` decorator for spawning child workflows
- Event propagation from children to root
- Tree visualization of nested structures

### 4. Observers & Debugger (`04-observers-debugger.ts`)

Real-time monitoring and debugging:
- Implementing custom `WorkflowObserver`
- `MetricsObserver` for collecting statistics
- `ConsoleObserver` for real-time logging
- `Observable` event stream subscription
- `WorkflowTreeDebugger` complete API

### 5. Error Handling (`05-error-handling.ts`)

Error management patterns:
- `WorkflowError` structure with full context
- State snapshots preserved at error time
- Error events emitted to observers
- Retry patterns with backoff
- Error isolation in parent-child workflows

### 6. Concurrent Tasks (`06-concurrent-tasks.ts`)

Parallel execution patterns:
- Sequential vs concurrent comparison
- `@Task({ concurrent: true })` option
- Manual `Promise.all` patterns
- Fan-out / fan-in architecture
- Performance benchmarks

### 7. Agent Loops with Observability (`07-agent-loops.ts`)

Run: `npx tsx examples/examples/07-agent-loops.ts`

Agent.prompt() within workflow loops:
- Using Agent.prompt() within ctx.step() loops
- Multiple agents for different item types
- Full event tree visualization with timing
- State snapshots at each iteration
- Cache hit/miss tracking

### 8. SDK Features Integration (`08-sdk-features.ts`)

Run: `npx tsx examples/examples/08-sdk-features.ts`

Anthropic SDK integration:
- Custom tool definitions with handlers
- MCP server configuration (inprocess)
- Pre/Post tool hooks for logging and validation
- Skills integration with system prompt content
- Environment variable pass-through

### 9. Multi-level Reflection (`09-reflection.ts`)

Run: `npx tsx examples/examples/09-reflection.ts`

Reflection at all three levels:
- Prompt-level reflection (enableReflection on prompt)
- Agent-level reflection (agent.reflect() method)
- Workflow-level reflection (step failure retry)
- Reflection events in tree output
- Error recovery with revised prompts

### 10. Introspection Tools Demo (`10-introspection.ts`)

Run: `npx tsx examples/examples/10-introspection.ts`

Agent self-awareness and hierarchy navigation:
- inspect_current_node - "Where am I?"
- read_ancestor_chain - "What's above me?"
- list_siblings_children - "What's around me?"
- inspect_prior_outputs - "What happened before?"
- inspect_cache_status - "Is this cached?"
- request_spawn_workflow - "Can I create children?"

### 11. Reparenting Workflows (`11-reparenting-workflows.ts`)

Run: `npx tsx examples/examples/11-reparenting-workflows.ts`

Workflow reparenting with detach-then-attach pattern:
- WRONG way: Direct attachChild() throws error (single-parent invariant)
- RIGHT way: detachChild() then attachChild() pattern
- Tree structure verification before/after reparenting
- Observer propagation updates after reparenting
- Dual-tree synchronization (workflow tree + node tree)
- Error handling for invalid reparenting operations

## Harness Examples

Comprehensive examples demonstrating Groundswell's harness system — the Harness ⊥ ModelProvider split (PRD §7).

**Quick Start:**
```bash
export ANTHROPIC_API_KEY=sk-...
npm run start:harness-basic
npm run start:harness-config
npm run start:harness-switching
npm run start:harness-scenarios
npm run start:harness-sessions
npm run start:harness-features
```

### 12. Basic Harness Usage (`harnesses/01-basic-harness-usage.ts`)

Run: `npx tsx examples/harnesses/01-basic-harness-usage.ts`

Minimal harness setup and usage:
- Harness registration with HarnessRegistry (ClaudeCodeHarness + PiHarness)
- Harness initialization before use
- Creating Agent with harness configuration
- Executing prompts through configured harnesses

### 13. Harness Configuration (`harnesses/02-harness-configuration.ts`)

Run: `npx tsx examples/harnesses/02-harness-configuration.ts`

Dual configuration cascade:
- Global configuration with `configureHarnesses()`
- Agent-level configuration in `new Agent({ harness, harnessOptions })`
- Prompt-level overrides in `agent.prompt(prompt, { harness, harnessOptions })`
- Dual cascade: harness axis + model axis are independent (PRD §7.7)

### 14. Harness Switching (`harnesses/03-harness-switching.ts`)

Run: `npx tsx examples/harnesses/03-harness-switching.ts`

Switching between harnesses and models at runtime:
- Agent-level harness switching
- Prompt-level harness switch (§7.13)
- Model-only override — harness unchanged (§7.13)
- Verifying which harness is being used

### 15. Multi-Provider Scenarios (`harnesses/04-multi-provider-scenarios.ts`)

Run: `npx tsx examples/harnesses/04-multi-provider-scenarios.ts`

Model axis scenarios — harness stays CONSTANT (pi):
- Cost optimization by model selection
- Multi-provider: anthropic vs openai on the same pi harness
- Fallback patterns for resilience
- A/B testing between models

### 16. Harness Sessions (`harnesses/05-harness-sessions.ts`)

Run: `npx tsx examples/harnesses/05-harness-sessions.ts`

Session management for multi-turn conversations:
- Creating sessions with `harnessOptions.sessionId`
- Continuing existing sessions
- Retrieving session state with `harness.getSession()` (claude-code)
- Session model differences: claude-code vs pi

### 17. Harness Features (`harnesses/06-harness-with-mcp-skills.ts`)

Run: `npx tsx examples/harnesses/06-harness-with-mcp-skills.ts`

Advanced harness features:
- MCP server registration on both harnesses (parity, §7.4)
- Using MCP tools in agent prompts
- Loading skills (cc: system prompt; pi: native agentskills.io)
- Harness hooks for observability
- Capability matrix: pi vs claude-code (PRD §7.4)

See [harnesses/README.md](./harnesses/README.md) for detailed harness examples documentation.

## Project Structure

```
examples/
├── examples/
│   ├── 01-basic-workflow.ts
│   ├── 02-decorator-options.ts
│   ├── 03-parent-child.ts
│   ├── 04-observers-debugger.ts
│   ├── 05-error-handling.ts
│   ├── 06-concurrent-tasks.ts
│   ├── 07-agent-loops.ts
│   ├── 08-sdk-features.ts
│   ├── 09-reflection.ts
│   ├── 10-introspection.ts
│   └── 11-reparenting-workflows.ts
├── harnesses/
│   ├── 01-basic-harness-usage.ts
│   ├── 02-harness-configuration.ts
│   ├── 03-harness-switching.ts
│   ├── 04-multi-provider-scenarios.ts
│   ├── 05-harness-sessions.ts
│   ├── 06-harness-with-mcp-skills.ts
│   └── README.md
├── utils/
│   └── helpers.ts
├── index.ts
└── README.md
```

## Key Concepts

### Workflow Status Lifecycle

```
idle → running → completed
                ↘ failed
                ↘ cancelled
```

### Event Types

| Event Type | Description |
|------------|-------------|
| `stepStart` | Step execution started |
| `stepEnd` | Step completed (includes duration) |
| `taskStart` | Task execution started |
| `taskEnd` | Task completed |
| `childAttached` | Child workflow attached to parent |
| `stateSnapshot` | State snapshot captured |
| `error` | Error occurred |
| `treeUpdated` | Tree structure changed |

### Tree Visualization Symbols

| Symbol | Status |
|--------|--------|
| ○ | idle |
| ◐ | running |
| ✓ | completed |
| ✗ | failed |
| ⊘ | cancelled |

## Usage Patterns

### Basic Workflow
```typescript
class MyWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Starting workflow');
    // ... workflow logic
    this.setStatus('completed');
  }
}
```

### Step with All Options
```typescript
@Step({
  name: 'CustomStepName',
  snapshotState: true,
  trackTiming: true,
  logStart: true,
  logFinish: true,
})
async myStep(): Promise<void> {
  // Step logic
}
```

### Observable State
```typescript
@ObservedState()
publicField: string = 'visible';

@ObservedState({ redact: true })
apiKey: string = 'secret';

@ObservedState({ hidden: true })
internalState: object = {};
```

### Concurrent Child Workflows
```typescript
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> {
  return items.map(item => new WorkerWorkflow(item, this));
}
```

## License

MIT
