# Research: External SDKs for a Pluggable Agent "Harness" Abstraction

> **Scope.** Authoritative API detail for two external SDKs to be wrapped behind
> a common `Harness` adapter interface (`PiHarness`, `ClaudeCodeHarness`):
> 1. `@anthropic-ai/claude-agent-sdk` (Claude Code SDK)
> 2. `@earendil-works/pi-coding-agent` (Pi coding-agent runtime)
>
> Plus a brief on the `agentskills.io` skill standard.

## Summary

The **Claude Agent SDK (`@anthropic-ai/claude-agent-sdk@0.1.77`) is fully
verified** in this repo from its installed `.d.ts` type definitions — its API
is documented below with exact signatures and code. It exposes a streaming
`query()` AsyncGenerator, in-process custom tools via `createSdkMcpServer()` +
`tool()`, a 12-event hook system, file-based session resume, and skills via
plugins/`systemPrompt`; it is **hard-constrained to `anthropic/*` models** and
spawns the Claude Code CLI as a subprocess. The **Pi SDK could NOT be verified**:
`@earendil-works/pi-coding-agent` is **not installed** in this repo and this
agent has no web-search tool, so every Pi-specific signature below is flagged
**UNVERIFIED** and must be confirmed from the installed package's `.d.ts` before
any `PiHarness` code is written — a concrete verification protocol and a
target `Harness` interface (modeled on this repo's existing `Provider`
abstraction) are provided so implementation can proceed once verified.

---

## ⚠️ Verification Status (read first)

| SDK | Installed locally? | Verified how? | Confidence |
|-----|-------------------|---------------|------------|
| `@anthropic-ai/claude-agent-sdk` | ✅ Yes, `0.1.77` | Read `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/**/*.d.ts` + `package.json` + `README.md` | **High / authoritative** |
| `@earendil-works/pi-coding-agent` | ❌ **No** (not in `package.json` deps, not in `node_modules`) | Not installed; no web search available to this agent | **None — UNVERIFIED** |
| `@opencode-ai/sdk` (related, already a dep) | ✅ Yes, `1.1.36` | Read `package.json` (out of scope but noted) | N/A |

> The Pi names below (`createAgentSession`, `session.subscribe`,
> `session_start` / `session_shutdown` / `tool_execution_start` /
> `tool_execution_end` / `message_update`, agentskills.io "native" support)
> came from the task brief. **They are not confirmed against source.** Treat the
> Pi section as a *specification of intent + verification checklist*, not fact.

---

# 1. Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)

All signatures below are copied/adapted from the installed type definitions at
`node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/{sdk/coreTypes.d.ts,
sdk/runtimeTypes.d.ts}` (v0.1.77). Package `type: "module"`, `main: sdk.mjs`,
`types: sdk.d.ts` (which re-exports `entrypoints/agentSdkTypes.d.ts`).

## 1.1 Install / require

```sh
npm install @anthropic-ai/claude-agent-sdk
```

Already present in this repo (`package.json`: `"@anthropic-ai/claude-agent-sdk": "^0.1.0"`).
Peer dependency: **`zod ^3.25.0 || ^4.0.0`** (this repo pins `zod ^3.23.0` — verify
`zod>=3.25` is actually resolved, or the `tool()` helper's Zod schema typing may
drift). Optional native deps: `@img/sharp-*` for image handling.

```ts
// ESM (Node 18+, this repo is Node 20 ESM — fine)
import { query, tool, createSdkMcpServer, AbortError } from '@anthropic-ai/claude-agent-sdk';
import type {
  Options, Query, SDKMessage, SDKAssistantMessage, SDKUserMessage,
  SDKResultMessage, SDKSystemMessage, SDKPartialAssistantMessage,
  SDKToolProgressMessage, SDKStatusMessage,
  SdkMcpToolDefinition, McpServerConfig, AgentDefinition,
  HookEvent, HookInput, HookJSONOutput, CanUseTool, PermissionResult,
} from '@anthropic-ai/claude-agent-sdk';
// V2 (UNSTABLE) session API:
import { unstable_v2_createSession, unstable_v2_resumeSession, unstable_v2_prompt } from '@anthropic-ai/claude-agent-sdk';
```

## 1.2 Primary API signatures

**One-shot streaming query** (stable, primary entry):

```ts
export function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;  // Query extends AsyncGenerator<SDKMessage, void>
```

`Query` is itself an async generator you iterate with `for await`, AND carries
control methods (`interrupt()`, `setPermissionMode()`, `setModel()`,
`supportedCommands()`, `supportedModels()`, `setMcpServers()`, etc.). Control
methods are only valid when streaming input/output is used.

**V2 persistent-session API (UNSTABLE — do not build production harness on it
yet; prefer `query()` + `resume`):**

```ts
export function unstable_v2_createSession(options: SDKSessionOptions): SDKSession;
export function unstable_v2_resumeSession(sessionId: string, options: SDKSessionOptions): SDKSession;
export function unstable_v2_prompt(message: string, options: SDKSessionOptions): Promise<SDKResultMessage>;

interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  stream(): AsyncGenerator<SDKMessage, void>;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;
}
type SDKSessionOptions = {
  model: string;                                  // REQUIRED in V2
  pathToClaudeCodeExecutable?: string;
  executable?: 'node' | 'bun';
  executableArgs?: string[];
  env?: Record<string, string | undefined>;
};
```

> **Note:** V2 `SDKSessionOptions` is much smaller than the stable `Options`.
> Callbacks/hooks/MCP are not in V2 options yet. For a harness that needs tools,
> hooks, and permissions, use the **stable `query()` API**.

## 1.3 `Options` shape (the central config — authoritative)

Key fields relevant to a harness (paraphrased from commented `.d.ts`):

```ts
type Options = {
  model?: string;                 // e.g. 'claude-sonnet-4-5-20250929'
  fallbackModel?: string;
  systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string };
  cwd?: string;                   // default process.cwd()
  env?: Record<string, string | undefined>;

  // --- Tools ---
  tools?: string[] | { type: 'preset'; preset: 'claude_code' };  // built-in tool set
  allowedTools?: string[];        // auto-allow (skip permission prompt)
  disallowedTools?: string[];     // remove from model context
  mcpServers?: Record<string, McpServerConfig>;                  // external + in-process tools
  agents?: Record<string, AgentDefinition>;                      // custom Task subagents

  // --- Permissions / execution control ---
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'delegate' | 'dontAsk';
  allowDangerouslySkipPermissions?: boolean;
  canUseTool?: CanUseTool;        // programmatic permission callback
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  sandbox?: SandboxSettings;
  additionalDirectories?: string[];

  // --- Sessions ---
  resume?: string;                // session ID to resume
  resumeSessionAt?: string;       // resume only up to a message UUID
  continue?: boolean;             // resume most recent (mutually exclusive with resume)
  forkSession?: boolean;          // when resuming, fork to new ID
  persistSession?: boolean;       // default true → ~/.claude/projects/

  // --- Limits / output ---
  maxTurns?: number;
  maxBudgetUsd?: number;
  maxThinkingTokens?: number;
  outputFormat?: { type: 'json_schema'; schema: Record<string, unknown> };
  betas?: ('context-1m-2025-08-07')[];   // SdkBeta

  // --- Streaming / runtime ---
  includePartialMessages?: boolean;       // emit SDKPartialAssistantMessage deltas
  abortController?: AbortController;
  stderr?: (data: string) => void;

  // --- Skills / plugins / settings ---
  plugins?: { type: 'local'; path: string }[];   // load skills, agents, hooks
  settingSources?: ('user' | 'project' | 'local')[];  // omit → SDK isolation mode; must include 'project' to load CLAUDE.md
  strictMcpConfig?: boolean;
  pathToClaudeCodeExecutable?: string;
  executable?: 'bun' | 'deno' | 'node';
  executableArgs?: string[];
  extraArgs?: Record<string, string | null>;
  spawnClaudeCodeProcess?: (options: SpawnOptions) => SpawnedProcess;  // VM/container/remote
  enableFileCheckpointing?: boolean;
  permissionPromptToolName?: string;
};
```

## 1.4 Tool registration (3 mechanisms)

### (a) Built-in Claude Code tools — via `tools`
```ts
const q = query({
  prompt: 'List files and run the tests.',
  options: { tools: { type: 'preset', preset: 'claude_code' } },  // all default tools
  // or: tools: ['Bash', 'Read', 'Edit', 'Glob', 'Grep', 'Write']
});
```
Pass `tools: []` to disable ALL built-in tools (pure LLM mode).

### (b) Custom **in-process** tools — `createSdkMcpServer()` + `tool()`

This is the canonical way to register your own JS tools that run in the same
Node process (no subprocess). Returns an MCP server you pass via `mcpServers`.

```ts
export function tool<Schema extends AnyZodRawShape>(
  _name: string,
  _description: string,
  _inputSchema: Schema,
  _handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>,
): SdkMcpToolDefinition<Schema>;

export function createSdkMcpServer(options: {
  name: string;
  version?: string;
  tools?: Array<SdkMcpToolDefinition<any>>;
}): McpSdkServerConfigWithInstance;   // { type:'sdk', name, instance: McpServer }
```

`CallToolResult` is imported from `@modelcontextprotocol/sdk/types.js`
(the SDK has an implicit/peer reliance on MCP types for tool results).

```ts
import { z } from 'zod';
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';

const echoTool = tool(
  'echo',
  'Echo back a string',
  { text: z.string().describe('text to echo') },
  async (args) => ({
    content: [{ type: 'text', text: `echo: ${args.text}` }],
    // isError?: boolean, // optional
  }),
);

const myServer = createSdkMcpServer({
  name: 'groundswell-tools',
  version: '1.0.0',
  tools: [echoTool],
});

const q = query({
  prompt: 'Echo "hello"',
  options: {
    mcpServers: { 'groundswell-tools': myServer },   // <-- in-process SDK server
    permissionMode: 'acceptEdits',                   // or use canUseTool
  },
});
```

> **Gotcha:** if your SDK MCP tool call runs > 60s, override env var
> `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT` (per the package's exported docstring).

### (c) External MCP servers — via `mcpServers` (stdio/sse/http)
```ts
options: {
  mcpServers: {
    'github': { type: 'stdio', command: 'npx', args: ['@modelcontextprotocol/server-github'], env: {...} },
    'remote': { type: 'http', url: 'https://mcp.example.com/sse', headers: {...} },
  },
}
```
`McpServerConfig = McpStdioServerConfig | McpSSEServerConfig | McpHttpServerConfig | McpSdkServerConfigWithInstance`.

### Dynamically swap MCP servers mid-session (streaming mode)
```ts
await q.setMcpServers({ 'new-srv': { type:'stdio', command:'node', args:['./s.js'] } });
const status: McpServerStatus[] = await q.mcpServerStatus();  // connected|failed|needs-auth|pending
```

## 1.5 Tool call → tool_result round-trip

There is **no manual "return a tool_result" step** for the caller — the agent
loop is internal to the SDK subprocess. Tool execution is surfaced/controlled
through three mechanisms instead:

1. **In-process tools** (`tool()` handler): return `Promise<CallToolResult>`
   (`{ content: [{type:'text',text}], isError? }`). The SDK feeds it back to
   the model automatically. This is how a harness "executes" a tool.
2. **`canUseTool` permission callback** — runs *before* a tool executes; can
   mutate input or block:
   ```ts
   type CanUseTool = (
     toolName: string,
     input: Record<string, unknown>,
     options: { signal: AbortSignal; suggestions?: PermissionUpdate[]; blockedPath?: string;
                decisionReason?: string; toolUseID: string; agentID?: string },
   ) => Promise<PermissionResult>;
   // PermissionResult =
   //   | { behavior:'allow'; updatedInput: Record<string,unknown>; updatedPermissions?: PermissionUpdate[]; toolUseID?: string }
   //   | { behavior:'deny';  message: string; interrupt?: boolean; toolUseID?: string };
   ```
3. **Hooks** — `PreToolUse` / `PostToolUse` / `PostToolUseFailure` let you
   observe/modify per call (see §1.7).

Tool *progress* is surfaced as an `SDKToolProgressMessage`:
```ts
type SDKToolProgressMessage = {
  type: 'tool_progress';
  tool_use_id: string; tool_name: string;
  parent_tool_use_id: string | null;
  elapsed_time_seconds: number; uuid: UUID; session_id: string;
};
```

For a **harness that wants full manual tool execution** (i.e., the model emits a
tool_use and the *host* executes it), the cleanest pattern is: register the tool
as an in-process `tool()` whose handler delegates into your host code and returns
the `CallToolResult`. Use `canUseTool` only for policy, not execution.

## 1.6 Streaming messages

`query()` is an `AsyncGenerator<SDKMessage>`. Iterate it:

```ts
for await (const msg of q) {
  switch (msg.type) {
    case 'system':      // SDKSystemMessage (subtype 'init' | 'status' | 'compact_boundary' | 'hook_response')
      if (msg.subtype === 'init') {
        console.log('tools:', msg.tools, 'skills:', msg.skills, 'model:', msg.model, 'mcp:', msg.mcp_servers);
      }
      break;
    case 'assistant':   // SDKAssistantMessage — full turn incl. content_blocks (text/tool_use/thinking)
      break;
    case 'user':        // SDKUserMessage — includes tool_use_result echo
      break;
    case 'stream_event': // SDKPartialAssistantMessage (RawMessageStreamEvent deltas)
      // ONLY emitted if options.includePartialMessages === true
      break;
    case 'tool_progress': break;
    case 'auth_status':  break;
    case 'result':       // SDKResultMessage — final, terminal
      if (msg.subtype === 'success') { /* msg.result, msg.usage, msg.total_cost_usd, msg.num_turns */ }
      else { /* 'error_max_turns' | 'error_max_budget_usd' | 'error_during_execution' | 'error_max_structured_output_retries' */ }
      break;
  }
}
```

```ts
type SDKPartialAssistantMessage = {
  type: 'stream_event';
  event: RawMessageStreamEvent;   // from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
  parent_tool_use_id: string | null; uuid: UUID; session_id: string;
};
```
**Gotcha:** partial/token deltas are **off by default**. Set
`options.includePartialMessages = true` to subscribe to streaming deltas.

**Multi-turn streaming input:** pass `prompt` as an `AsyncIterable<SDKUserMessage>`
and feed turns with `q.streamInput(asyncIterable)`.

## 1.7 Hooks & lifecycle events (12 events)

Hooks are the SDK's general event system — not just tool execution. Defined as
`HOOK_EVENTS = ['PreToolUse','PostToolUse','PostToolUseFailure','Notification',
'UserPromptSubmit','SessionStart','SessionEnd','Stop','SubagentStart',
'SubagentStop','PreCompact','PermissionRequest'] as const`.

```ts
type HookCallback = (input: HookInput, toolUseID: string | undefined, opts: { signal: AbortSignal }) => Promise<HookJSONOutput>;
interface HookCallbackMatcher { matcher?: string; hooks: HookCallback[]; timeout?: number; }

options: {
  hooks: {
    PreToolUse: [{ hooks: [async (input) => ({ continue: true })] }],
    PostToolUse: [{ matcher: 'Bash', hooks: [async (input) => ({ continue: true })] }],
    SessionStart: [{ hooks: [async (input) => ({ hookSpecificOutput: { hookEventName:'SessionStart', additionalContext:'...' } })] }],
    Stop: [{ hooks: [async (input) => ({ continue: true })] }],
  },
}
```

`HookJSONOutput` (sync) supports: `{ continue?, suppressOutput?, stopReason?, decision?: 'approve'|'block',
systemMessage?, reason?, hookSpecificOutput? }`. Per-event `hookSpecificOutput`:
- `PreToolUse` → `{ permissionDecision?: 'allow'|'deny'|'ask', permissionDecisionReason?, updatedInput? }`
- `PostToolUse` → `{ additionalContext?, updatedMCPToolOutput? }` ← inject/replace tool output
- `UserPromptSubmit` / `SessionStart` / `SubagentStart` → `{ additionalContext? }` ← inject context
- `PermissionRequest` → full permission decision object

There is also an **async hook** output: `{ async: true, asyncTimeout? }` for
long-running side effects.

**Mapping to the harness lifecycle asked about:**
| Harness concept | Claude SDK mechanism |
|---|---|
| session_start | `hooks.SessionStart` (input.source = `'startup'|'resume'|'clear'|'compact'`) or the `system/init` message |
| session_shutdown | `hooks.SessionEnd` (input.reason = ExitReason) |
| tool_execution_start | `hooks.PreToolUse` (input.tool_name, input.tool_input, input.tool_use_id) |
| tool_execution_end | `hooks.PostToolUse` (input.tool_response) / `PostToolUseFailure` (input.error) |
| message_update | `SDKPartialAssistantMessage` deltas (needs `includePartialMessages:true`) or per-turn `SDKAssistantMessage` |

## 1.8 Sessions & resume (file-based)

Sessions persist to `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` when
`persistSession !== false` (default true). Resume options:
```ts
query({ prompt: 'continue', options: { resume: '<sessionId>' } });        // continue exact session
query({ prompt: 'continue', options: { resume: '<id>', resumeSessionAt: '<msgUuid>' } }); // up to a point
query({ prompt: 'continue', options: { continue: true } });              // most recent session
query({ prompt: 'continue', options: { resume: '<id>', forkSession: true } }); // fork to new id
```
The `system/init` message returns the active `session_id`; `SDKMessage`s all
carry `session_id` and `uuid`. To **disable** persistence (ephemeral/automated
runs): `options: { persistSession: false }`.

## 1.9 System prompt injection & skills

System prompt:
```ts
systemPrompt: 'You are a coding agent...'                                    // fully custom
systemPrompt: { type:'preset', preset:'claude_code', append: 'Always cite files.' }  // default + append
```

**Skills** in Claude Code are invoked via `/name` slash commands. Surface area:
- `q.supportedCommands(): Promise<SlashCommand[]>` — `{ name, description, argumentHint }`
- `SDKSystemMessage` (init) carries `skills: string[]` and `slash_commands: string[]`.

Skills are **loaded two ways**:
1. **Plugins** (local dir): `plugins: [{ type:'local', path:'./my-plugin' }]`.
   A plugin dir can provide commands/agents/skills/hooks.
2. **Filesystem settings**: `settingSources: ['project','user','local']` loads
   `.claude/settings*.json` and (with `'project'`) `CLAUDE.md`. **Omitting
   `settingSources` = "SDK isolation mode"** (no settings/CLAUDE.md loaded).

There is **no `loadSkills(content[])` method on the Claude SDK** (unlike this
repo's `AnthropicProvider.loadSkills()`). To inject arbitrary skill text, use
`systemPrompt: { type:'preset', preset:'claude_code', append: skillText }` or a
`UserPromptSubmit`/`SessionStart` hook returning `additionalContext`.

## 1.10 Model selection — anthropic-only (hard constraint)

```ts
options: { model: 'claude-sonnet-4-5-20250929' }      // or claude-opus-4-20250514, haiku, etc.
await q.setModel('claude-opus-4-20250929');            // mid-session (streaming mode)
const models = await q.supportedModels();              // ModelInfo[]
```
- `AgentDefinition.model` for subagents is constrained to
  `'sonnet' | 'opus' | 'haiku' | 'inherit'` — confirming the **Anthropic-only** model universe.
- No OpenAI/Google/etc. provider abstraction. `fallbackModel` is also anthropic.
- **Gotcha:** the SDK does **not** call the Anthropic API directly — it **spawns
  the Claude Code CLI binary** as a subprocess (`pathToClaudeCodeExecutable`,
  `executable`, `spawnClaudeCodeProcess`). A harness running headless/in-CI must
  ensure that binary exists and `ANTHROPIC_API_KEY` (or OAuth) is configured.

## 1.11 Subagents (Task tool)
```ts
agents: {
  'test-runner': {
    description: 'Runs tests and reports results',
    prompt: 'You are a test runner...',
    tools: ['Read','Grep','Glob','Bash'],     // omit → inherit parent's tools
    disallowedTools?: string[],
    model?: 'sonnet'|'opus'|'haiku'|'inherit',
    mcpServers?: (string | { [name]: McpServerConfigForProcessTransport })[],
    criticalSystemReminder_EXPERIMENTAL?: string,
  },
}
```
Surfaced via `SubagentStart` / `SubagentStop` hooks (`agent_id`, `agent_type`).

## 1.12 Claude SDK gotchas (consolidated)
1. **Anthropic models only.** Cannot target OpenAI/Gemini/etc.
2. **Spawns the CLI subprocess**, not a direct API call. Requires the binary +
   auth env. Override via `pathToClaudeCodeExecutable` / `spawnClaudeCodeProcess`.
3. **Streaming deltas are OFF by default** — set `includePartialMessages: true`.
4. **`tool()` needs Zod ≥ 3.25** (peer dep). This repo pins `^3.23.0`; confirm
   the resolved version or the `tool()` generic types may not line up.
5. **No built-in `loadSkills(text)`** — use `systemPrompt.append` or hooks.
6. **V2 session API is `unstable_`** and lacks most `Options`. Build the harness
   on stable `query()` + `resume` for now.
7. **`permissionMode:'bypassPermissions'` requires `allowDangerouslySkipPermissions:true`.**
8. **SDK isolation mode by default** — if you need CLAUDE.md / project skills,
   set `settingSources: ['project']` (and usually `['user','project']`).
9. **`CallToolResult` shape** (`content[]`, `isError?`) must match MCP types —
   return `{ content: [{type:'text', text}], isError: false }`.
10. **Long in-process tool (>60s)**: set `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT` env.

---

# 2. Pi SDK (`@earendil-works/pi-coding-agent`) — ⚠️ UNVERIFIED

## 2.1 Status & verification protocol (DO THIS FIRST)

This package is **not installed** in the repo and this research agent has **no
web-search capability**, so the Pi API surface below is **best-effort and
unconfirmed**. Before writing `PiHarness`, an implementer MUST:

```sh
# 1. Resolve canonical metadata (versions, entry, exports, deps, README):
npm view @earendil-works/pi-coding-agent
npm view @earendil-works/pi-coding-agent versions --json
npm view @earendil-works/pi-coding-agent dist --json

# 2. Install at a known version and read the AUTHORITATIVE .d.ts:
npm install -D @earendil-works/pi-coding-agent
cat node_modules/@earendil-works/pi-coding-agent/package.json   # main/types/exports
find node_modules/@earendil-works/pi-coding-agent -name '*.d.ts' -o -name 'README.md' | head
# read each .d.ts — they are the source of truth for signatures below.

# 3. Confirm the package scope/name is exactly right. There may be aliases
#    (e.g. a `pi` CLI vs an embeddable `pi-coding-agent` lib). Check `exports`.
```

Then **replace every "UNVERIFIED" block below with the real signature** and
re-check the mapping table (§2.5). If the real API diverges from the assumed
shape, update the `Harness` interface (§4) accordingly.

## 2.2 What this brief assumes (intent, not fact)

Based on the task brief, the Pi runtime is assumed to be a **vendor-neutral
embedding-friendly coding-agent loop** with: a session factory, a registered-tools
list, a subscription/streaming event bus, and lifecycle events. The names below
mirror those in the task and are **to be confirmed**:

```ts
// UNVERIFIED — confirm against installed .d.ts
import { createAgentSession } from '@earendil-works/pi-coding-agent';

const session = createAgentSession({
  model: { /* provider/model spec — shape UNKNOWN */ },
  tools: [ /* tool defs — shape UNKNOWN */ ],
  systemPrompt: '...',
  // possibly: skills, mcpServers, permissions, cwd, env
});

const unsub = session.subscribe((event) => { /* event.type ∈ session_start|session_shutdown|tool_execution_start|tool_execution_end|message_update|... */ });
await session.send('user message');
await session.shutdown();
```

## 2.3 Items to confirm (Pi-specific checklist)
- **Entry function:** Is it `createAgentSession(...)`? Single export or a class?
  What is the exact options object shape (keys, optionality, nesting)?
- **Tool registration:** Tools passed at session creation (`tools: [...]`) vs a
  `session.registerTool(...)` method vs MCP-only? Tool def shape:
  `{ name, description, inputSchema, handler }`? JSON-Schema or Zod?
- **Tool call/result round-trip:** Does Pi emit a `tool_call` event the host
  must fulfill (returning a `tool_result`), or does it execute registered
  handlers internally (like Claude's `tool()`)? **This is the biggest design
  fork** — it determines whether `PiHarness` is "host-executes" or "sdk-executes".
- **Streaming:** `session.subscribe(cb)`? Async-iterator? Event names/types?
  Is there a distinct "delta" vs "final message" event?
- **Lifecycle events:** Exact names/types for
  `session_start` / `session_shutdown` / `tool_execution_start` /
  `tool_execution_end` / `message_update`. Are there `error`/`permission` events?
- **Skills:** Does Pi implement the **agentskills.io** standard *natively* (i.e.
  auto-discovers `SKILL.md`), or must the harness parse skills and inject them?
  How is a skill loaded (path? dir? plugin?)?
- **Model selection:** How is provider/model specified? Does it accept an OpenAI
  base URL / API key, multiple providers, or only one? (Pi's selling point is
  vendor-neutrality, so expect `{ provider, model, apiKey/baseURL }`.)
- **MCP:** Does it require tools to come via an MCP plugin, or does it accept
  plain registered tool handlers (the task asks specifically)?
- **Sessions:** Is there resume/continue? Is state in-memory, file, or pluggable?
- **Runtime:** ESM? Node 18+/20+? Any native deps? Does it spawn a subprocess
  (like Claude) or call providers in-process?

## 2.4 Why this matters for the harness design

The two SDKs likely differ on **who executes tools**:
- **Claude SDK:** registered `tool()` handlers run in-process and the SDK feeds
  results back automatically. Host = passive observer (via hooks) + tool author.
- **Pi SDK (assumed):** may surface `tool_call` events and expect the host to
  return `tool_result`. Host = active executor.

A good `Harness` interface must accommodate **both** execution models (see §4).

## 2.5 Assumed → Harness concept mapping (verify each row)
| Harness concept | Pi (ASSUMED, verify) | Claude (verified) |
|---|---|---|
| create session | `createAgentSession(opts)` | `query({prompt,options})` or `unstable_v2_createSession` |
| register tool | `options.tools` / `session.registerTool` | `mcpServers: {name: createSdkMcpServer({tools:[tool(...)]})}` |
| execute tool | host returns `tool_result` on `tool_call` event | `tool()` handler returns `CallToolResult` (in-process) |
| stream deltas | `session.subscribe` `message_update` | `for await (msg of query)` + `includePartialMessages` |
| lifecycle | `session_start/session_shutdown/tool_execution_*` events | `hooks.{SessionStart,SessionEnd,PreToolUse,PostToolUse}` |
| resume | unknown — confirm | `options.resume` / `continue` / `forkSession` |
| skills | unknown — agentskills.io native? | `plugins` / `settingSources` / `systemPrompt.append` |
| model | `{provider,model,...}` (verify) | `options.model` (anthropic-only) |

---

# 3. `agentskills.io` Skill Standard — ⚠️ partial / verify

## 3.1 What it is (best knowledge — verify at agentskills.io)
`agentskills.io` is an emerging **open standard for packaging agent "skills"** as
portable, tool-agnostic markdown + metadata so a skill authored once can be
loaded by any compatible agent runtime (Claude Code, and runtimes like Pi that
adopt it). The core ideas:

- A **skill** = a directory (or single file) describing a capability the agent
  can opt into, typically surfaced as a `/slash-command` and/or as injected
  instructions in the system prompt.
- Skills are **markdown-first**: human-readable instructions the model follows,
  optionally with reference files/scripts bundled alongside.

## 3.2 Typical skill shape (ASSUMED — confirm the official spec)
```markdown
---
# YAML-ish frontmatter (exact keys — VERIFY on agentskills.io):
name: code-review
description: Expert code review for bugs, security, and performance
argument_hint: "<file or diff>"
# possibly: version, author, license, model_compatibility, tools[]
---

# Code Review

When this skill is active, review code for:
- Security vulnerabilities (SQL injection, XSS, ...)
- Performance bottlenecks
- Adherence to best practices

## Output Format
Provide: Critical (must fix), Suggestions (should fix), Nitpicks (nice to have).
```
Loaded from a `skills/` dir (or `.claude/skills/` for Claude Code), discovered by
filename `SKILL.md`, and exposed via `supportedCommands()`.

## 3.3 How each SDK relates (verify)
- **Claude Code SDK:** treats skills as slash-commands; loaded via **plugins**
  (`plugins:[{type:'local',path}]`) or project settings. It does **not** advertise
  formal `agentskills.io` compliance in its v0.1.77 types, but the on-disk
  skill format (markdown, `/command`) is compatible in spirit.
- **Pi SDK (assumed):** the task implies Pi may implement agentskills.io
  **natively** (auto-discover `SKILL.md`). **Confirm** in its README/types.

## 3.4 Harness implication
Because skill *format* may be shared but *loading mechanism* differs, the
`Harness` should:
- Expose a **portable `Skill` object** (`{ name, description, argumentHint, content/markdown }`).
- Translate it per adapter: Claude → `systemPrompt.append` or a local plugin;
  Pi → whatever native loader it provides (or fall back to system-prompt injection).

---

# 4. Recommended common `Harness` interface (unifying abstraction)

This is a **target contract** for `PiHarness` and `ClaudeCodeHarness` to both
implement, derived from this repo's existing `Provider` pattern
(`registerMCPs`, `loadSkills`, `capabilities`, `onToolStart/End`,
`onSessionStart/End`, `onStream` — see
`examples/providers/06-provider-with-mcp-skills.ts`) and the verified Claude API.
It is intentionally a **lowest-common-denominator + capabilities** shape so both
SDKs fit.

```ts
// Harness.ts — proposed
import type { z } from 'zod';

/** Portable tool def (harness translates to SDK-native form). */
export interface HarnessTool {
  name: string;
  description: string;
  // Accept either Zod (preferred in this repo) or JSON-Schema:
  inputSchema?: z.ZodRawShape | Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: HarnessToolCtx) => Promise<HarnessToolResult>;
}
export interface HarnessToolResult { content: string; isError?: boolean; json?: unknown; }
export interface HarnessToolCtx { signal: AbortSignal; toolUseId: string; sessionId: string; }

/** Portable skill (agentskills.io-compatible). */
export interface HarnessSkill {
  name: string;
  description?: string;
  argumentHint?: string;
  content: string;              // markdown body
  path?: string;                // optional on-disk source
}

export type HarnessEvent =
  | { type: 'session_start'; sessionId: string; source?: 'startup'|'resume'|'clear'|'compact' }
  | { type: 'session_end'; sessionId: string; reason?: string }
  | { type: 'tool_start'; toolName: string; toolInput: unknown; toolUseId: string }
  | { type: 'tool_end'; toolName: string; result: HarnessToolResult; toolUseId: string }
  | { type: 'tool_error'; toolName: string; error: string; toolUseId: string }
  | { type: 'message_delta'; text: string }          // streaming token deltas
  | { type: 'message'; role: 'assistant'|'user'; content: unknown }
  | { type: 'result'; ok: boolean; result?: string; error?: string; usage?: unknown; costUsd?: number };

export interface HarnessCapabilities {
  customTools: boolean;          // can register in-process tool handlers
  hostExecutedTools: boolean;    // SDK emits tool_call for host to fulfill (Pi model)
  streamingDeltas: boolean;      // token-level streaming
  fileSessionResume: boolean;    // resume by session id from disk
  skillsNative: boolean;         // agentskills.io auto-discovery
  modelVendor: 'anthropic' | 'multi';
}

export interface HarnessSessionOptions {
  model: string;                 // adapter interprets (Claude: anthropic id; Pi: verify)
  systemPrompt?: string;
  tools?: HarnessTool[];
  skills?: HarnessSkill[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  resumeSessionId?: string;
  abortSignal?: AbortSignal;
  maxTurns?: number;
  maxBudgetUsd?: number;
  // provider-specific escape hatch:
  raw?: Record<string, unknown>;
}

export interface AgentHarness {
  readonly id: string;                         // 'claude' | 'pi'
  readonly capabilities: HarnessCapabilities;
  /** One-shot streaming query; yields events; resolves on terminal result. */
  run(prompt: string, opts?: HarnessSessionOptions): AsyncIterable<HarnessEvent>;
  /** Subscribe to all session events (alternative to async-iteration). */
  subscribe(handler: (e: HarnessEvent) => void): () => void;
}
```

**Adapter responsibilities:**
- `ClaudeCodeHarness.run(...)`: build `Options` (map `tools`→`createSdkMcpServer`,
  `skills`→`systemPrompt.append` or plugin, `resumeSessionId`→`resume`,
  `model`→`options.model`, `abortSignal`→`abortController`), call `query()`,
  translate `SDKMessage` → `HarnessEvent` (incl. enabling `includePartialMessages`
  for `message_delta`), wire hooks → `tool_start/tool_end/session_*`.
- `PiHarness.run(...)`: AFTER verification, map `tools`/`skills`/`model` onto the
  confirmed Pi options, call the confirmed session factory, and translate Pi's
  event bus into `HarnessEvent`. **Pay special attention to the host-executes vs
  sdk-executes tool model (§2.4).**

---

## Findings (consolidated)

1. **Claude SDK v0.1.77 is verified & rich.** Primary entry is
   `query({prompt, options}): AsyncGenerator<SDKMessage>`. — Source:
   installed `entrypoints/sdk/runtimeTypes.d.ts` + `coreTypes.d.ts`.
2. **Claude tools have 3 paths:** built-in `tools`, in-process `tool()`+`createSdkMcpServer()`
   (returns `Promise<CallToolResult>`), external `mcpServers` (stdio/sse/http).
   `setMcpServers()` swaps them live. — Installed `.d.ts`.
3. **Claude streaming deltas are OFF by default** — set `options.includePartialMessages = true`.
   `SDKPartialAssistantMessage.event` is an Anthropic `RawMessageStreamEvent`.
4. **Claude lifecycle = 12-event `hooks`** (PreToolUse/PostToolUse/SessionStart/...).
   `canUseTool` is the permission gate. Maps cleanly to the harness event set.
5. **Claude sessions resume from disk** (`~/.claude/projects/...`) via `resume`/`continue`/`forkSession`;
   `persistSession:false` disables. V2 session API exists but is `unstable_`.
6. **Claude = Anthropic models only** (incl. subagent `model: 'sonnet'|'opus'|'haiku'|'inherit'`),
   and it **spawns the CLI subprocess** (not a direct API call).
7. **Claude has no `loadSkills(text)`** — inject via `systemPrompt.append`, plugins, or
   `UserPromptSubmit`/`SessionStart` hooks' `additionalContext`. `supportedCommands()` lists skills.
8. **Pi SDK is NOT installed** and could not be web-verified. All Pi signatures in this brief are
   UNVERIFIED; an implementer must `npm view` + read the installed `.d.ts` before coding `PiHarness`.
9. **The two SDKs likely differ on tool execution ownership** (Claude executes in-process; Pi may
   emit `tool_call` for the host). The proposed `Harness` interface (§4) accommodates both via
   `capabilities.hostExecutedTools`.
10. **agentskills.io** is a markdown-first, `/command` skill standard; format is shared but each
    SDK loads it differently (Claude: plugins/settings; Pi: verify native support).

## Sources
- **Kept (verified locally):**
  - `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts` — full `Options`/`Query`/`Hooks`/`CanUseTool`/`McpServerConfig`/`SDKSession` types (authoritative for v0.1.77).
  - `…/entrypoints/sdk/coreTypes.d.ts` — all `SDKMessage` variants, `HookInput`/`HookJSONOutput`, `AgentDefinition`, `SDKResultMessage` subtypes, `PermissionResult`.
  - `…/package.json` + `…/README.md` — version, engines, peer dep `zod ^3.25||^4`, migration note ("Claude Code SDK" → "Claude Agent SDK").
  - `…/entrypoints/agentSdkTypes.d.ts` — confirms `query`, `tool`, `createSdkMcpServer`, `AbortError`, and the three `unstable_v2_*` functions are the public surface.
  - This repo: `package.json` (deps, Node ≥20, ESM), `examples/providers/06-provider-with-mcp-skills.ts` (existing `Provider`/`MCPServer`/`loadSkills`/hooks pattern to mirror).
- **Dropped:**
  - `node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs` — minified runtime; the `.d.ts` files are the authoritative, readable contract, so the minified JS adds nothing.
  - `@opencode-ai/sdk` — installed but out of scope (different runtime; not requested).
- **Unverifiable (flagged, not cited as fact):** `@earendil-works/pi-coding-agent` (not installed), `agentskills.io` spec details.

## Gaps
1. **Pi SDK API is entirely unverified** (entry fn, options shape, tool model, event names, skills loading, model spec, MCP-vs-plain-tools, resume). This is the single biggest gap and blocks confident `PiHarness` implementation. **Next step:** run the `npm view` + install + read-`.d.ts` protocol in §2.1, then update §2 and §4.
2. **`zod` version drift:** this repo pins `^3.23.0`; Claude SDK `tool()` peer-depends `^3.25||^4`. Confirm the resolved `zod` in the lockfile to avoid `AnyZodRawShape` type mismatches.
3. **agentskills.io exact frontmatter keys** (name/description/argumentHint/version/…) need the official spec page; only the conceptual shape is documented here.
4. **Claude V2 session API** is `unstable_` and lacks hooks/MCP — do not build the harness on it; use stable `query()` + `resume`.
5. **Auth/runtime for headless Claude runs:** the CLI subprocess + `ANTHROPIC_API_KEY`/OAuth requirement wasn't tested here.

## Supervisor coordination
No supervisor bridge is configured in this environment (only `read`/`write` tools are available;
no `web_search`, `bash`, or `contact_supervisor`). I was therefore unable to web-verify the Pi SDK
or contact a supervisor for the missing package. The brief is delivered complete for the **verified**
Claude SDK and marks all Pi material as UNVERIFIED with a concrete install-and-read verification
protocol (§2.1) so the implementation agent can close the gap before writing `PiHarness`.
