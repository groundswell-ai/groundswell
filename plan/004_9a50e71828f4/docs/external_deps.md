# External Dependencies — VERIFIED (PRD v1.2 Harness/Provider Split)

> **Status: AUTHORITATIVE.** All signatures below were read directly from installed
> `.d.ts` files and `npm view` metadata on 2026-06-20. This supersedes the
> UNVERIFIED `external-sdk-research.md` brief for the Pi SDK section.

## Dependency Summary

| Package | Version | Present in repo? | v1.2 disposition |
|---|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `0.1.77` (resolved from `^0.1.0`) | ✅ Yes | **KEEP** — wrapped by `ClaudeCodeHarness` |
| `@earendil-works/pi-coding-agent` | `0.79.8` | ❌ **No** | **ADD** — wrapped by `PiHarness` (default harness) |
| `@opencode-ai/sdk` | `1.1.36` (pinned) | ✅ Yes | **REMOVE** (deprecated v1.5.0 → removal v2.0.0) |
| `zod` | `3.25.76` | ✅ Yes | KEEP — meets Claude SDK peer dep `^3.25\|\|^4` ✅ |

---

## 1. Pi SDK — `@earendil-works/pi-coding-agent` (VERIFIED via `npm pack` + `.d.ts`)

**npm metadata:** `version: 0.79.8`, `main: ./dist/index.js`, `types: ./dist/index.d.ts`, `exports: { ".": { "types", "import" } }`, ESM, Node 18+. Install: `npm i @earendil-works/pi-coding-agent`.

### 1.1 Entry: `createAgentSession` (async factory)

```ts
// from dist/core/sdk.d.ts
import { createAgentSession } from '@earendil-works/pi-coding-agent';

export interface CreateAgentSessionOptions {
  cwd?: string;                       // default process.cwd()
  agentDir?: string;                  // default ~/.pi/agent
  authStorage?: AuthStorage;
  modelRegistry?: ModelRegistry;      // default ModelRegistry.create(auth, agentDir/models.json)
  model?: Model<any>;                 // from getModel(provider, model) @ pi-ai
  thinkingLevel?: ThinkingLevel;      // default 'medium'
  scopedModels?: Array<{ model: Model<any>; thinkingLevel?: ThinkingLevel }>;
  noTools?: 'all' | 'builtin';        // suppress default built-in tools
  tools?: string[];                   // allowlist of tool NAMES
  excludeTools?: string[];            // denylist
  customTools?: ToolDefinition[];     // ← KEY: in-process custom tools
  resourceLoader?: ResourceLoader;
  sessionManager?: SessionManager;    // default SessionManager.create(cwd)
  settingsManager?: SettingsManager;
  sessionStartEvent?: SessionStartEvent;
}

export interface CreateAgentSessionResult {
  session: AgentSession;
  extensionsResult: LoadExtensionsResult;
  modelFallbackMessage?: string;
}

export declare function createAgentSession(
  options?: CreateAgentSessionOptions
): Promise<CreateAgentSessionResult>;
```

### 1.2 `AgentSession` class — prompt / subscribe / lifecycle

```ts
export declare class AgentSession {
  get model(): Model<any> | undefined;
  get modelRegistry(): ModelRegistry;
  // Streaming/event subscription (returns unsubscribe fn):
  subscribe(listener: AgentSessionEventListener): () => void;
  // Send a user prompt (async, resolves when turn processed):
  prompt(text: string, options?: PromptOptions): Promise<void>;
  sendUserMessage(content: string | (TextContent | ImageContent)[], options?: {...}): void;
  setModel(model: Model<any>): Promise<void>;       // throws if no auth for model
  cycleModel(direction?: 'forward' | 'backward'): Promise<ModelCycleResult | undefined>;
  setActiveTools(...): ...;                          // rebuilds system prompt
  // ...thinking level, skills, prompt templates accessors
}
export type AgentSessionEventListener = (event: AgentSessionEvent) => void;
```

### 1.3 Model & Provider resolution (`@earendil-works/pi-ai`) — MATCHES PRD §7.8 EXACTLY

The Pi CLI/SDK resolves models as `provider/model`:

```
pi --provider openai --model gpt-4o "..."
pi --model openai/gpt-4o "..."            # provider prefix format
```

Programmatic: `import { getModel } from '@earendil-works/pi-ai'; getModel('anthropic', 'claude-opus-4-5')`.

**Built-in providers (from README):** Anthropic, OpenAI, Azure OpenAI, Google Gemini,
Google Vertex, ZAI, ZAI Coding Plan (China). → This is exactly the open
`ModelProviderId = 'anthropic' | 'openai' | 'google' | 'zai' | (string & {})` of PRD §7.8.
Custom providers via `~/.pi/agent/models.json` or extensions (`pi.registerProvider()`).

`ModelRegistry` (`dist/core/model-registry.d.ts`): `static create(authStorage, modelsJsonPath?)`,
`static inMemory(authStorage)`, `getApiKeyForProvider(provider)`,
`getProviderAuthStatus(provider)`, `registerProvider(name, config)`,
`unregisterProvider(name)`.

### 1.4 Custom tool registration — `customTools: ToolDefinition[]`

```ts
// dist/core/extensions/types.d.ts
export interface ToolDefinition<TParams = TSchema, TDetails = unknown, TState = any> {
  name: string;                 // tool name used in LLM tool calls
  label: string;                // UI label
  description: string;          // for LLM
  promptSnippet?: string;
  promptGuidelines?: string[];
  parameters: TParams;          // TypeBox schema (NOT Zod, NOT JSON-Schema directly)
  executionMode?: 'sequential' | 'parallel';
  execute(
    toolCallId: string,
    params: Static<TParams>,
    signal: AbortSignal | undefined,
    onUpdate: AgentToolUpdateCallback<TDetails> | undefined,
    ctx: ExtensionContext
  ): Promise<AgentToolResult<TDetails>>;
  // ...optional render hooks (UI-only, irrelevant to headless harness)
}
export declare function defineTool<TParams>(tool: ToolDefinition<TParams>): ToolDefinition<TParams> & AnyToolDefinition;
```

**Execution model:** Pi calls `tool.execute(...)` in-process and feeds the result back
to the model automatically. → **Both harnesses are "host provides execute handler,
SDK calls it."** This means `MCPHandler` wraps each registered tool as a
`ToolDefinition` whose `execute()` delegates to Groundswell's `toolExecutor`.

**Schema gotcha:** Pi uses **TypeBox** (`TSchema`) for `parameters`, while Claude SDK
uses **Zod raw shapes** and Groundswell's `MCPServer` tools use **JSON-Schema**
(`input_schema`). → `MCPHandler` needs a **schema-converter bridge** producing
TypeBox for Pi (parallel to the existing `jsonSchemaToZodRawShape()` for Claude).

### 1.5 Skills — NATIVE agentskills.io support (VERIFIED)

```ts
// dist/core/skills.d.ts
export interface Skill {
  name: string;
  description: string;
  filePath: string;
  baseDir: string;
  sourceInfo: SourceInfo;
  disableModelInvocation: boolean;
}
export interface LoadSkillsOptions { cwd: string; agentDir: string; skillPaths: string[]; includeDefaults: boolean; }
export declare function loadSkills(options: LoadSkillsOptions): LoadSkillsResult;
export declare function loadSkillsFromDir(options: { dir: string; source: string }): LoadSkillsResult;
/** Format skills for system prompt in XML per Agent Skills standard (https://agentskills.io/integrate-skills) */
export declare function formatSkillsForPrompt(skills: Skill[]): string;
```

Discovery: a dir with `SKILL.md` is a skill root (no recursion); else load `.md`
children. `formatSkillsForPrompt` emits the **agentskills.io XML format**.
→ PRD §7.12 "Pi implements agentskills.io natively" is **CONFIRMED**.

### 1.6 Events available via `session.subscribe(listener)`

From `dist/core/extensions/types.d.ts` exports — relevant events for hook mapping:
- Lifecycle: `SessionStartEvent`, `SessionShutdownEvent`, `SessionEvent`,
  `SessionCompactEvent`, `SessionBeforeForkEvent`, `SessionBeforeSwitchEvent`, `SessionBeforeTreeEvent`
- Turn: `TurnStartEvent`, `TurnEndEvent`, `BeforeAgentStartEvent`, `AgentStartEvent`, `AgentEndEvent`
- Tools: `ToolExecutionStartEvent`, `ToolExecutionEndEvent`, `ToolExecutionUpdateEvent`,
  `ToolResultEvent`, `ToolCallEvent` (+ typed: `BashToolCallEvent`, `EditToolCallEvent`,
  `ReadToolCallEvent`, `WriteToolCallEvent`, `GrepToolCallEvent`, `FindToolCallEvent`,
  `LsToolCallEvent`, `CustomToolCallEvent`)
- Streaming: `MessageUpdateEvent` (deltas), `MessageStartEvent`, `MessageEndEvent`
- Provider: `BeforeProviderRequestEvent` (inspect/modify outbound request)

### 1.7 Sessions — `SessionManager` (fork/switch/clone)

`dist/core/session-manager.ts`: `SessionManager.create(cwd)`, `SessionManager.inMemory()`,
`buildSessionContext()`, `SessionContext`, `NewSessionOptions`, `SessionInfo`.
The fork/switch/clone lifecycle is surfaced via `SessionBeforeForkEvent` /
`SessionBeforeSwitchEvent` / `SessionBeforeTreeEvent`. → Matches PRD §7.4 "Pi: SessionManager (fork/switch/clone)".

### 1.8 Pi gotchas
1. `createAgentSession` is **async** (loads resources/extensions) — unlike a plain `new`.
2. Tool parameter schemas are **TypeBox** — must convert from JSON-Schema/Zod.
3. Model object comes from `getModel(provider, model)` in `@earendil-works/pi-ai` (transitive dep) — the harness must resolve `ModelSpec` → `Model<any>`.
4. Auth: API keys resolved per-provider via `ModelRegistry.getApiKeyForProvider(provider)`; `setModel` throws if no auth configured.
5. Pi is a full coding-agent runtime (has its own read/bash/edit/write tools). For Groundswell's purpose we pass `customTools` (Groundswell's MCPHandler tools) and rely on `toolExecutor` delegation — Pi treats them as ordinary registered tools (PRD §7.10). `noTools: 'all'` can disable Pi's built-ins if isolation is desired.

---

## 2. Claude Code SDK — `@anthropic-ai/claude-agent-sdk@0.1.77` (VERIFIED, installed)

(See `external-sdk-research.md` §1 for the full verified surface; summary of
canonical seams the `ClaudeCodeHarness` adapter will use.)

- **Entry:** `query({ prompt, options }): AsyncGenerator<SDKMessage>` (stable). V2 `unstable_v2_*` session API is unstable — avoid for the harness.
- **Tools (in-process):** `createSdkMcpServer({ name, version, tools: [tool(name, desc, zodRawShape, handler)] })` → pass via `options.mcpServers`. Handler returns `Promise<CallToolResult>` (`{ content: [{type:'text',text}], isError? }`).
- **Streaming deltas OFF by default** — set `options.includePartialMessages = true`.
- **Hooks (12 events):** `options.hooks: { PreToolUse, PostToolUse, PostToolUseFailure, SessionStart, SessionEnd, Stop, ... }`. `canUseTool` is the permission gate.
- **Sessions (file-based):** `options.resume` / `options.continue` / `options.forkSession`; `persistSession:false` for ephemeral.
- **Skills:** no `loadSkills(text)` — inject via `systemPrompt: { type:'preset', preset:'claude_code', append: skillText }` or `plugins`/`settingSources`.
- **CONSTRAINT:** anthropic-only models; spawns the Claude Code CLI subprocess (needs binary + `ANTHROPIC_API_KEY`).

The existing `AnthropicProvider` (src/providers/anthropic-provider.ts) ALREADY wraps this
SDK correctly. `ClaudeCodeHarness` is largely a **rename + interface alignment** of it.

---

## 3. agentskills.io Standard (VERIFIED via Pi SDK implementation)

- Markdown-first skill spec; a skill = a dir with `SKILL.md` (+ optional YAML frontmatter: `name`, `description`, `disable-model-invocation`).
- **Integrate format = XML** (per `formatSkillsForPrompt` JSDoc citing https://agentskills.io/integrate-skills).
- Pi loads natively; Claude Code loads via `~/.claude/skills` / system-prompt append.
- Groundswell's portable `Skill` type (`{ name, path }`) already aligns; both adapters translate it.

---

## 4. Implications for the Harness Adapter Design

| Concern | ClaudeCodeHarness | PiHarness |
|---|---|---|
| Session factory | `query({prompt, options})` (sync generator) | `createAgentSession(opts)` (async → `session`) |
| Tool registration | `createSdkMcpServer({tools:[tool(...)]})` → `mcpServers` | `customTools: ToolDefinition[]` |
| Tool param schema | Zod raw shape | TypeBox `TSchema` |
| Tool execution | in-process handler returns `CallToolResult` | in-process `execute()` returns `AgentToolResult` |
| Skills | system-prompt append / plugins | native `loadSkills` + `formatSkillsForPrompt` |
| Streaming deltas | `includePartialMessages:true` → `SDKPartialAssistantMessage` | `MessageUpdateEvent` via `subscribe` |
| Lifecycle hooks | `options.hooks.*` | `session.subscribe` event filtering |
| Sessions | `resume`/`continue` (file) | `SessionManager` (fork/switch/clone) |
| Models | anthropic-only | any provider (`anthropic/openai/google/zai/...`) |
| Model constraint error | n/a (only anthropic allowed) | `setModel` throws on missing auth |

**Required new bridge on `MCPHandler`:** `toPiCustomTools(): ToolDefinition[]`
(plus a JSON-Schema → TypeBox converter) to parallel the existing `toAgentSDKServer()`.
