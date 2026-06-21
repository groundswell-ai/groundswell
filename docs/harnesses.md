# Harnesses

The pluggable agent runtime — orthogonal to the LLM provider/model.

**Version:** 0.0.4+ (PRD v1.2)

> [!IMPORTANT]
> **The harness is chosen independently of the LLM provider/model.** These are two orthogonal axes:
> the **harness** (`pi` or `claude-code`) is the agent runtime that drives prompting, tool execution,
> streaming, and sessions; the **provider/model** (`anthropic/claude-sonnet-4`, `openai/gpt-4o`, …)
> identifies the LLM host and model. They are configured and resolved separately.
>
> **The harness never appears in the model string.** Strings such as `pi/anthropic/claude-sonnet-4`
> or `cc/anthropic/…` are **invalid** and will be rejected by `parseModelSpec` (see §7.8).

## Table of Contents

- [Overview](#overview)
- [Supported Harnesses](#supported-harnesses)
- [Harness Identifier](#harness-identifier)
- [The Harness Interface](#the-harness-interface)
- [Capabilities](#capabilities)
- [Harness Options](#harness-options)
- [Global Harness Configuration](#global-harness-configuration)
- [Configuration Cascade](#configuration-cascade)
- [Model and Provider Specification](#model-and-provider-specification)
- [AgentConfig and PromptOverrides](#agentconfig-and-promptoverrides)
- [Tool Execution](#tool-execution)
- [Hooks](#hooks)
- [MCP, Skills and LSP Integration](#mcp-skills-and-lsp-integration)
- [Usage Examples](#usage-examples)
- [Feature Parity](#feature-parity)
- [Harness Registry](#harness-registry)
- [Migrating from Provider*](#migrating-from-provider)

## Overview

A **harness** is the agent runtime/SDK that drives prompting, tool execution, streaming, and sessions.
Groundswell ships two harnesses behind one shared `Harness` interface:

- **`pi`** *(default)* — wraps `@earendil-works/pi-coding-agent`. Vendor-neutral; runs any LLM
  provider (Anthropic, OpenAI, Google, Z.ai, custom). No walled garden — MCP, Skills, and LSP are
  supplied by Groundswell's shared `MCPHandler`, not by the harness.
- **`claude-code`** — wraps `@anthropic-ai/claude-agent-sdk`. Anthropic's official agent SDK with
  first-class MCP/Skills/LSP, but Anthropic-only models and ecosystem restrictions apply. Retained
  for users who must stay inside Anthropic's ecosystem.

**Rationale.** Claude Code was the original default because it is widely preconfigured, but
Anthropic's SDK imposes a walled-garden ecosystem and limits on coding-plan usage. Pi provides
comparable functionality without vendor lock-in, so it is now the default. Claude Code is retained
as an optional, parity-maintained fallback.

The two axes — harness (runtime) and provider/model (LLM host) — are **independent** (PRD §7).
Users select a harness once at the top level; all workflows, agents, and prompts inherit that
setting unless explicitly overridden. The provider/model is specified and resolved separately.

## Supported Harnesses

| Harness | SDK / Package | Description |
|---------|--------------|-------------|
| `pi` *(default)* | Pi SDK — `@earendil-works/pi-coding-agent` | Vendor-neutral runtime. No walled garden; runs any LLM provider through its own provider system. MCP, Skills, and LSP supplied by Groundswell's `MCPHandler`. |
| `claude-code` | Claude Code SDK — `@anthropic-ai/claude-agent-sdk` | Anthropic's official agent SDK. First-class MCP/Skills/LSP, but Anthropic-only models and plan/SDK usage restrictions apply. |

## Harness Identifier

The harness identifier is a closed set of two values:

```ts
type HarnessId = 'pi' | 'claude-code';
```

This is the agent runtime axis — independent of the LLM host axis (`ModelProviderId`).

## The Harness Interface

Both harnesses implement the shared `Harness` contract:

```ts
import type { HarnessId, HarnessCapabilities, HarnessOptions,
  HarnessRequest, ToolExecutionRequest, ToolExecutionResult, ModelSpec,
  AgentResponse } from 'groundswell';

interface Harness {
  readonly id: HarnessId;
  readonly capabilities: HarnessCapabilities;

  initialize(options?: HarnessOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
  supports(capability: keyof HarnessCapabilities): boolean;
  requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean;
}
```

### Non-streaming execution

```ts
import type { HarnessRequest, ToolExecutionRequest, ToolExecutionResult,
  AgentResponse } from 'groundswell';

const response = await harness.execute<{ answer: string }>(
  { prompt: 'What is 2+2?', options: {} },
  toolExecutor,
);

if (response.status === 'success') {
  console.log(response.data.answer);  // Type-safe access
}
```

### Streaming execution

```ts
import type { HarnessRequest, AgentResponse } from 'groundswell';

const stream = await harness.execute(
  { prompt: 'Explain TypeScript generics', options: { streaming: true } },
  toolExecutor,
);

for await (const event of stream) {
  // Handle StreamEvent items (text_delta, tool_call_start, tool_call_done, usage, done, …)
}
```

> [!NOTE]
> `execute()` returns `AgentResponse<T>` — see the
> [AgentResponse Migration Guide](./migration-guide-agent-response.md) for the full response shape
> and how to handle success, error, and partial responses.

## Capabilities

```ts
import type { HarnessCapabilities } from 'groundswell';

interface HarnessCapabilities {
  mcp: boolean;              // MCP server connections
  skills: boolean;           // Skill loading
  lsp: boolean;              // Language Server Protocol integration
  streaming: boolean;        // Streaming responses
  sessions: boolean;         // Session-based state
  extendedThinking: boolean; // Extended thinking/reasoning
}
```

| Capability | `pi` | `claude-code` |
|------------|------|---------------|
| MCP | ✅ via Groundswell `MCPHandler` (tools registered with the harness) | ✅ built-in **and** via `MCPHandler` |
| Skills | ✅ native [agentskills.io](https://agentskills.io); loads `~/.claude/skills` | ✅ native (system prompt injection) |
| LSP | ✅ via MCP plugins through `MCPHandler` | ✅ via MCP plugins |
| Streaming | ✅ (`session.subscribe`) | ✅ (message stream) |
| Sessions | ✅ (`SessionManager`; fork/switch/clone) | ✅ (file-based resume) |
| Extended Thinking | ✅ (model-dependent) | ✅ (maxThinkingTokens) |
| **LLM providers** | **any** (open set) | **Anthropic only** |

> **Parity without Pi plugins.** Groundswell executes all tools locally through `MCPHandler`
> and registers them with whichever harness is active; the harness only reports tool calls back via
> `toolExecutor`. Therefore Pi's lack of built-in MCP/LSP is **not** a capability gap, and no Pi plugin
> needs to be bundled to reach parity.

## Harness Options

```ts
import type { HarnessOptions } from 'groundswell';

interface HarnessOptions {
  endpoint?: string;                  // API endpoint override
  apiKey?: string;                    // Forwarded to the LLM provider — NOT owned by the harness
  sessionId?: string;                 // Session/resume id
  timeout?: number;                   // Timeout in milliseconds
  headers?: Record<string, string>;   // Custom headers
}
```

Harness implementations MAY extend this with harness-specific fields (e.g., session store
options on `ClaudeCodeHarness`). API keys belong to the **LLM provider**, not the harness — the
harness only forwards them.

```ts
import type { HarnessOptions } from 'groundswell';

const options: HarnessOptions = {
  endpoint: 'https://api.anthropic.com',
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60000,
};
```

## Global Harness Configuration

Configure the default harness and per-harness options once at application startup. This cascades
to all agents unless explicitly overridden (see [Configuration Cascade](#configuration-cascade)).

```ts
import { configureHarnesses } from 'groundswell';

// Set ONCE at application startup — cascades to all agents (PRD §7.7).
configureHarnesses({
  defaultHarness: 'pi',                  // vendor-neutral runtime (the default)
  defaultModelProvider: 'anthropic',     // LLM host — INDEPENDENT of the harness (§7.8)
  harnessDefaults: {
    'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

### Validation behavior

- `defaultHarness` must be `'pi'` or `'claude-code'` — **throws on anything else**, including the
  legacy `'anthropic'`.
- `harnessDefaults` keys (if present) must be valid `HarnessId` values — throws on invalid keys.
- `defaultModelProvider` is an **open set** (any string) — **not validated**.
- When `configureHarnesses()` is never called, the default is `{ defaultHarness: 'pi' }`.

The two configuration axes are **independent**:

| Axis | Field | Values | Purpose |
|------|-------|--------|---------|
| **Harness** (runtime) | `defaultHarness` | `'pi'` \| `'claude-code'` | Which agent SDK drives execution |
| **Provider** (LLM host) | `defaultModelProvider` | Open set (`'anthropic'`, `'openai'`, …) | Which LLM vendor resolves unqualified models |

## Configuration Cascade

Harness selection cascades independently of model selection. The cascade flows from the broadest
scope (global) to the narrowest (prompt-level), with **first-defined wins** for the harness choice:

```
GlobalHarnessConfig.defaultHarness          (broadest — application startup)
    ↓
AgentConfig.harness / AgentConfig.harnessOptions
    ↓
PromptOverrides.harness / PromptOverrides.harnessOptions   (narrowest — per-call)
```

### Resolution algorithm

```
harness  = promptHarness ?? agentHarness ?? globalConfig.defaultHarness   (first-defined wins)
options  = { ...globalDefaults[harness], ...agentOptions, ...promptOptions } (last write wins)
```

### Worked example 1: Agent overrides global

```
global.defaultHarness = 'pi'
agent.harness         = 'claude-code'
prompt.harness        = undefined

→ resolved harness = 'claude-code'  (agent wins over global; prompt absent)
```

### Worked example 2: Model override does NOT change the harness

```ts
// The model axis is SEPARATE from the harness axis — overriding model never changes the harness:
const response = await agent.prompt(myPrompt, {
  model: 'openai/gpt-4o',   // runs on whichever harness is active
});
// If the active harness is claude-code, it would REJECT a non-Anthropic provider.
// The model change does NOT switch the harness.
```

> [!NOTE]
> The cascade resolution helpers are internal utilities. Use the `configureHarnesses` /
> `AgentConfig.harness` / `PromptOverrides.harness` APIs to set configuration — the runtime
> resolves it for you.

## Model and Provider Specification

The model string identifies the **LLM host** and model — never the harness.

### Supported formats

| Format | Example | Meaning |
|--------|---------|---------|
| Plain model id | `claude-sonnet-4-20250514` | Resolved against `defaultModelProvider` (defaults to `'anthropic'`) |
| Provider-qualified | `anthropic/claude-opus-4-20250514` | Explicit LLM host |

### ModelSpec

```ts
import type { ModelSpec, ModelProviderId } from 'groundswell';

interface ModelSpec {
  provider: ModelProviderId;   // LLM host — NOT the harness
  model: string;               // Model name (without provider prefix)
  raw: string;                 // Original specification string
}

// LLM host — open set; any non-empty string is valid.
type ModelProviderId = 'anthropic' | 'openai' | 'google' | 'zai' | (string & {});
```

### parseModelSpec

```ts
import { parseModelSpec } from 'groundswell';

// Provider-qualified format
const spec1 = parseModelSpec('anthropic/claude-sonnet-4-20250514');
// { provider: 'anthropic', model: 'claude-sonnet-4-20250514', raw: 'anthropic/claude-sonnet-4-20250514' }

// Plain format — resolved against defaultModelProvider (defaults to 'anthropic')
const spec2 = parseModelSpec('claude-sonnet-4-20250514');
// { provider: 'anthropic', model: 'claude-sonnet-4-20250514', raw: 'claude-sonnet-4-20250514' }

// Custom provider (open set)
const spec3 = parseModelSpec('openai/gpt-4o');
// { provider: 'openai', model: 'gpt-4o', raw: 'openai/gpt-4o' }
```

### formatModelForProvider

```ts
import { parseModelSpec, formatModelForProvider } from 'groundswell';

const spec = parseModelSpec('anthropic/claude-3-5-sonnet');

// Same provider: pass-through
formatModelForProvider(spec, 'anthropic');
// → 'claude-3-5-sonnet'

// Different provider: THROWS
formatModelForProvider(spec, 'openai');
// → Error: "Cannot translate anthropic/claude-3-5-sonnet to openai provider.
//          Cross-provider model translation is not supported."
```

> [!WARNING]
> **The harness is NEVER part of the model string.** Harness-qualified strings (3+ segments) are
> invalid and will be rejected:
>
> ```ts
> // ✅ Valid model strings — identify the LLM HOST, never the harness:
> 'anthropic/claude-sonnet-4-20250514'   // provider-qualified
> 'claude-sonnet-4-20250514'             // plain → resolved against defaultModelProvider
> 'openai/gpt-4o'
> 'google/gemini-2.5-pro'
>
> // ❌ INVALID — the harness must NEVER appear in the model string (PRD §7.8):
> 'pi/anthropic/claude-sonnet-4'   // parseModelSpec throws: "Harness must not appear in model string…"
> 'cc/anthropic/claude-sonnet-4'   //   "
> ```

### claude-code constraint

The `claude-code` harness can only run `anthropic/*` models. Requesting a non-Anthropic provider on
`claude-code` is a configuration error surfaced at `initialize()`/`execute()`:

```ts
import { ClaudeCodeHarness } from 'groundswell';

const harness = new ClaudeCodeHarness();
await harness.initialize();
harness.normalizeModel('openai/gpt-4o');
// → Throws: "Cannot normalize openai/gpt-4o with ClaudeCodeHarness.
//           The claude-code harness only supports anthropic/* models (PRD §7.8)."
```

## AgentConfig and PromptOverrides

Both `AgentConfig` and `PromptOverrides` accept harness and model overrides:

```ts
import { Agent, createAgent } from 'groundswell';

// Agent-level configuration
const agent = new Agent({
  name: 'Analyzer',
  harness: 'pi',                                  // inherits from global if omitted
  model: 'anthropic/claude-sonnet-4-20250514',    // provider/model — never harness-qualified
  harnessOptions: { apiKey: process.env.ANTHROPIC_API_KEY },
});

// Prompt-level override
const response = await agent.prompt(myPrompt, {
  harness: 'claude-code',        // override harness for this call only
  model: 'anthropic/claude-opus-4-20250514',
  harnessOptions: { sessionId: 'my-session-id' },
});
```

## Tool Execution

Tools are executed locally via `MCPHandler` regardless of which harness is active. The harness
delegates tool calls back to Groundswell through the `toolExecutor` callback — it never executes
tools itself.

```ts
import type { ToolExecutionRequest, ToolExecutionResult } from 'groundswell';

interface ToolExecutionRequest {
  name: string;      // Tool name (may be namespaced: "server__tool")
  input: unknown;   // Tool input parameters
}

interface ToolExecutionResult {
  content: string | unknown;
  isError: boolean;
}
```

### Pi adapter specifics

Groundswell passes its tool list into `createAgentSession({ customTools })` via `MCPHandler`. When Pi
emits a tool call, the adapter invokes the `toolExecutor` callback and returns the
`ToolExecutionResult`. No Pi MCP plugin is required — Pi treats Groundswell's tools as ordinary
registered tools.

## Hooks

The `HarnessHookEvents` interface adapts harness-specific lifecycle events to a uniform API:

```ts
import type { HarnessHookEvents, ToolExecutionRequest, ToolExecutionResult } from 'groundswell';

const hooks: HarnessHookEvents = {
  onToolStart: async (tool) => { console.log('Starting:', tool.name); },
  onToolEnd: async (tool, result, duration) => {
    console.log(`Finished ${tool.name} in ${duration}ms`);
  },
  onStream: (chunk) => process.stdout.write(chunk),
};
```

### Hook mapping table

| AgentHooks | HarnessHookEvents | `pi` source event | `claude-code` source event |
|------------|-------------------|-------------------|----------------------------|
| `preToolUse` | `onToolStart` | `tool_execution_start` | `preToolUse` |
| `postToolUse` | `onToolEnd` | `tool_execution_end` | `postToolUse` |
| `sessionStart` | `onSessionStart` | `session_start` | `sessionStart` |
| `sessionEnd` | `onSessionEnd` | `session_shutdown` | `sessionEnd` |
| *(streaming)* | `onStream` | `message_update` | message stream |

> [!NOTE]
> **Known claude-code limitations:** The Claude Code SDK does not expose the real error status
> or duration for tool executions. For the `claude-code` harness:
> - `PostToolUse` `isError` is always `false`
> - `PostToolUse` and `SessionEnd` `duration` is always `0`
>
> The `pi` harness provides accurate values for both.

## MCP, Skills and LSP Integration

Capability parity is achieved through Groundswell's shared infrastructure — not through
harness-specific features.

### MCP and LSP

Provided by Groundswell's `MCPHandler` (and MCP plugins for LSP diagnostics), **not** by the
harness. Both harnesses receive the same tool list and delegate calls back through `toolExecutor`.
Claude Code's built-in MCP is bypassed in favor of `MCPHandler` so behavior is identical across
harnesses. Pi needs no plugin — Groundswell's shared infrastructure handles everything.

### Skills

- **`pi`**: Implements the [agentskills.io](https://agentskills.io) standard natively and loads
  Claude Code skill directories directly (e.g., `~/.claude/skills`). Skills are cross-harness with
  no adapter work.
- **`claude-code`**: Injects skills via system prompt.

Both harnesses store loaded skill content and inject it into the session's system prompt during
`execute()`. The **effect is identical**: the skill's content reaches the model regardless of
which harness is active.

```ts
// LSPConfig is used internally by Groundswell for LSP diagnostics via MCP plugins.
interface LSPConfig {
  enabled: boolean;
  languages?: string[];  // Restrict to specific languages
}
```

## Usage Examples

### Default (Pi)

```ts
import { Agent } from 'groundswell';

const agent = new Agent({
  name: 'Analyzer',
  harness: 'pi',                                  // default; may be omitted
  model: 'anthropic/claude-sonnet-4-20250514',    // provider/model — no harness prefix
});
```

### Switch harness for one call

```ts
import type { AgentResponse } from 'groundswell';

const response = await agent.prompt(myPrompt, {
  harness: 'claude-code',
});
```

### Override model only (harness unchanged)

```ts
import type { AgentResponse } from 'groundswell';

const response = await agent.prompt(myPrompt, {
  model: 'openai/gpt-4o',   // runs on whichever harness is active
});
```

## Feature Parity

All features MUST work identically across `pi` and `claude-code`:

1. **MCP Tools**: Register, discover, and execute MCP tools through the shared `MCPHandler`.
2. **Skills**: Load and invoke skills with identical effect (agentskills.io XML for `pi`, system
   prompt injection for `claude-code`).
3. **Hooks**: All hook types fire with consistent context and deterministic ordering.
4. **AgentResponse**: Identical response format regardless of harness — see the
   [AgentResponse Migration Guide](./migration-guide-agent-response.md) for the full shape.
5. **Caching**: Cache keys incorporate **both** the harness and the provider/model for isolation.
6. **Workflow Integration**: Events emit correctly in workflow context.

### Adapter non-functional requirements

- Identical `AgentResponse<T>` shape from both harnesses.
- Identical tool-execution semantics (`ToolExecutionRequest` / `ToolExecutionResult`).
- Deterministic hook ordering.
- Unsupported features are advertised via `HarnessCapabilities` rather than silently degrading.

## Harness Registry

The `HarnessRegistry` is a singleton that manages harness instances. Register harnesses at
application startup, then retrieve them throughout the application.

```ts
import { HarnessRegistry, PiHarness, ClaudeCodeHarness } from 'groundswell';

const registry = HarnessRegistry.getInstance();
registry.register(new PiHarness());          // id 'pi'  — vendor-neutral default
registry.register(new ClaudeCodeHarness());   // id 'claude-code' — Anthropic-only

// Retrieve harnesses
const pi = registry.get('pi');
const cc = registry.get('claude-code');

// Check availability
if (registry.has('pi')) {
  console.log('Pi harness is registered');
}
```

### Registry API

| Method | Description |
|--------|-------------|
| `HarnessRegistry.getInstance()` | Returns the singleton registry |
| `registry.register(harness)` | Register a harness (throws on duplicate id) |
| `registry.get(id)` | Get a harness by id (returns `undefined` if not found) |
| `registry.has(id)` | Check if a harness is registered |
| `registry.initializeAll(config)` | Initialize all registered harnesses in parallel |
| `registry.terminateAll()` | Terminate all harnesses and clear the registry |

> [!NOTE]
> An internal `registerDefaultHarnesses()` function exists that registers both `PiHarness` and
> `ClaudeCodeHarness` in one call. It is not part of the public `'groundswell'` entry — use the
> explicit `registry.register()` calls shown above instead.

## Migrating from Provider*

The v1.2 Harness/Provider split introduces a new vocabulary: `Provider*` types and APIs are
deprecated in favor of `Harness*` equivalents. All legacy names are retained as **deprecated aliases**
— your existing code continues to work.

See the full migration guide for the complete rename table, step-by-step migration instructions,
and before/after examples:

**→ [Provider → Harness Migration Guide](./migration-provider-to-harness.md)**
