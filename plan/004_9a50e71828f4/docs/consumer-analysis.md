# Consumer & Integration Analysis: Provider → Harness Refactoring

**Scope:** Map the existing `Provider`-based surface area that must be refactored into the PRD v1.2 `Harness` model (§7) and identify every consumer integration seam. Basis for migrating `AnthropicProvider` → `ClaudeCodeHarness`, removing `OpenCodeProvider`, and adding `PiHarness`.

**PRD source of truth:** `/home/dustin/projects/groundswell/PRD.md` §7 (lines 253–561).

---

## Files Retrieved

1. `src/providers/anthropic-provider.ts` (lines 1-941) — The basis for `ClaudeCodeHarness`. Wraps `@anthropic-ai/claude-agent-sdk`.
2. `src/providers/opencode-provider.ts` (lines 1-920) — Deprecated provider; full surface area to remove.
3. `src/providers/session-store.ts` (lines 1-407) — `SessionStore` interface, `MemorySessionStore`, `FileSessionStore`, `RedisSessionStore` (stub).
4. `src/providers/provider-registry.ts` (lines 1-120) — Singleton registry; tracks `ProviderId` → `Provider` + init state.
5. `src/types/providers.ts` (lines 1-770) — All `Provider*` type definitions: `Provider`, `ProviderId`, `ProviderRequest`, `ProviderHookEvents`, `ProviderCapabilities`, `ToolExecutor`, legacy `ProviderResult<T>` (deprecated).
6. `src/cache/cache-key.ts` (lines 1-265) — `CacheKeyInputs`, `generateCacheKey()`; **no harness identity, no provider/model** in the current key.
7. `src/core/mcp-handler.ts` (lines 1-325) — `MCPHandler`, `toAgentSDKServer()`, `registerServer()`, `executeTool()`.
8. `src/core/agent.ts` (lines 610-670) — Cache-key construction site; pulls inputs together.
9. `package.json` — Dependency inventory.
10. `examples/providers/01..06-*.ts` — Six consumer examples using `Provider`/`Agent`/`MCPHandler`.
11. `docs/providers.md` (lines 1-1581) — Provider docs (extensive); written entirely in pre-§7 vocabulary.
12. `docs/migration-opencode-removal.md` (lines 1-257) — Deprecation timeline: Jan 2026 (v1.5.0) → Jul 2026 (v2.0.0 removal).
13. `docs/migration-guide-agent-response.md` (lines 1-340) — Documents `AgentResponse<T>` return type (now shared by `Harness.execute()`).

---

## 1. `src/providers/anthropic-provider.ts` — Basis for `ClaudeCodeHarness`

This is the canonical adapter. Per PRD §7.1, the `claude-code` harness wraps `@anthropic-ai/claude-agent-sdk` — exactly what this file does today. The migration is largely a **rename + interface alignment**, not a rewrite.

### SDK wrapping
- **Lazy import** in `initialize()` (lines 162-179): `this.sdk = await import("@anthropic-ai/claude-agent-sdk")`. Throws a wrapped error on failure so the registry can record it.
- **Stateless SDK model**: the comment block (lines 260-272) states the SDK is stateless; the harness owns lifecycle. `terminate()` (lines 244-260) just nulls references (`this.sdk`, `this.mcpServerConfig`, `this.skillsPrompt`).

### `execute()` signature (key integration seam)

```ts
// src/providers/anthropic-provider.ts:228-237
execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>
```

This **already matches** the PRD §7.3 `Harness.execute()` shape — only the type names need updating:
- `ProviderRequest` → `HarnessRequest`
- `ToolExecutor` → `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>`
- `ProviderHookEvents` → `HarnessHookEvents`

The actual `Harness.execute()` target from PRD §7.3:

```ts
execute<T>(
  request: HarnessRequest,
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
  hooks?: HarnessHookEvents
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
```

### `execute()` flow (non-streaming path, lines 240-440)
1. SDK init guard.
2. Session resolution via `getSession()`/`createSession()`; detects continuation when `session.history.length > 0`.
3. `normalizeModel(request.options.model ?? 'claude-sonnet-4-20250514')`.
4. `buildAgentSDKHooks(hooks)` — adapts `ProviderHookEvents` → SDK `HookEvent` map.
5. Build `sdkOptions`: `model`, `systemPrompt` (skill-injected via `buildSystemPromptWithSkills()`), `continue` flag, `allowedTools` (string tool names), `mcpServers: { 'groundswell-mcp': this.mcpServerConfig }`, `hooks`.
6. `this.sdk.query({ prompt, options: sdkOptions })` returns `AsyncGenerator<SDKMessage>`.
7. For continuation, calls `queryResult.streamInput()` twice — once for `session.history`, once for the new user message (critical SDK contract documented at lines 333-358).
8. Iterates messages: counts `tool_use` blocks, accumulates `SDKUserMessage[]` into `session.history`, captures final `SDKResultMessage` into `session.lastResult`. Saves back to the store on every mutation when not `MemorySessionStore`.
9. Returns `createSuccessResponse(data, { agentId: this.id, timestamp, duration, usage, toolCalls })` or `createErrorResponse('EXECUTION_FAILED', ...)`.

### Streaming path (lines 442-632)
`executeStreaming<T>()` mirrors the non-streaming flow but yields `StreamEvent` objects (`metadata`, `text_delta`, `tool_call_start`, `tool_call_done`, `usage`, `done`, `error`) and returns the final `AgentResponse<T>` as the generator's return value.

### `registerMCPs()` (lines 684-720)
```ts
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  if (!this.sdk) throw new Error("SDK not initialized. Call initialize() first.");
  for (const server of servers) this.mcpHandler.registerServer(server);
  const sdkConfig = this.mcpHandler.toAgentSDKServer();
  if (sdkConfig) this.mcpServerConfig = sdkConfig;
  return this.mcpHandler.getTools();
}
```
The harness delegates to its own `MCPHandler` instance, stashes the SDK MCP server config, and exposes MCP-format tools (namespaced `serverName__toolName`) for the agent's tool executor. **This pattern is identical for both `pi` and `claude-code` per PRD §7.4 footnote — parity without Pi plugins.**

### `loadSkills()` (lines 740-779)
Reads `SKILL.md` from each `skill.path` via `readFile(join(skill.path, 'SKILL.md'))`, formats each as `### {name}\n\n{content}`, joins with `\n\n---\n\n`, stores in `this.skillsPrompt`. Empty array clears. **This is system-prompt injection — the claude-code path per PRD §7.12.** `PiHarness` will need to delegate to Pi's native skills loader instead.

### `normalizeModel()` (lines 893-923)
```ts
normalizeModel(model: string): ModelSpec {
  const spec = parseModelSpec(model, "anthropic");
  if (spec.provider !== this.id) {
    throw new Error(`Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider...`);
  }
  return spec;
}
```
**PRD §7.8 constraint:** `claude-code` may only run `anthropic/*` models. The provider equality check here already enforces that — it must be preserved as an explicit `claude-code` capability gate per §7.8 ("Requesting a non-Anthropic provider on `claude-code` is a configuration error surfaced at `initialize()`/`execute()`").

### Sessions (lines 927-982)
`createSession()` / `getSession()` / `deleteSession()` thin over `SessionStore<SessionState>`. **Note:** the PRD §7.4 capability table says claude-code sessions are "file-based resume" — the current implementation uses the `SessionStore` abstraction layered on top of the SDK's `streamInput()` history mechanism, not the SDK's native session resume. This is an open design question: whether `ClaudeCodeHarness` continues to use the abstraction or switches to native resume.

### Hook adaptation (lines 816-904)
`buildAgentSDKHooks()` maps `ProviderHookEvents` → SDK `HookEvent` arrays (`PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`). Each adapter returns `{ continue: true }`. **Known SDK limitations** (documented inline):
- `PostToolUse` cannot observe errors — `isError` always `false`.
- `PostToolUse` and `SessionEnd` cannot observe duration — always `0`.

This maps directly to PRD §7.11's hook adaptation table.

---

## 2. `src/providers/opencode-provider.ts` — Deprecation & Removal

### Deprecation status
- File-level JSDoc (lines 1-29): **`@deprecated Since v1.5.0. Will be removed in v2.0.0.`**
- Runtime warning (lines 175-191): one-shot `console.warn` on first `initialize()` call, including a stack-trace line for the caller.
- Docs: `docs/migration-opencode-removal.md` documents the full migration.

### What removing it entails

**Source removals:**
- Delete `src/providers/opencode-provider.ts` (~920 lines).
- Update `src/providers/index.ts` to drop the `OpenCodeProvider` export.

**Type changes (`src/types/providers.ts:9`):**
```ts
export type ProviderId = "anthropic" | "opencode";
```
Narrow this. Under the §7 refactor the *harness* axis (`HarnessId = 'pi' | 'claude-code'`) replaces the provider axis for runtime selection, but `ProviderId`/`ModelProviderId` survives as the LLM-host enum (PRD §7.8: `'anthropic' | 'openai' | 'google' | 'zai' | string`).

**Capability surface to delete:**
- `OpenCodeProvider` `capabilities` (lines 119-129): `mcp: false, lsp: false` — it ran in "LLM-only mode" because OpenCode executes tools server-side. Its `registerMCPs()` returns `[]` (lines 730-743).
- Server lifecycle code in `initialize()` (lines 193-258): `createOpencode({ port: 4096, ... })` returns `{ client, server }`; `terminate()` calls `this.server.close()`.

**Multi-provider gateway removal:** `normalizeModel()` (lines 855-876) accepts ANY provider prefix and forwards to OpenCode's 75+ provider gateway. Per the migration doc this multi-provider access is dropped; users wanting non-Anthropic models must wait for `PiHarness` + Pi's provider system (PRD §7.1).

**Dependency removal:** drop `"@opencode-ai/sdk": "1.1.36"` from `package.json` (see §8 below).

**Consumer/example updates:** `examples/providers/02,03,04,06-*.ts` import and register `OpenCodeProvider`; all need editing. The capability comparison matrix in `examples/providers/06-provider-with-mcp-skills.ts` (lines ~440-485) explicitly references OpenCode and must be rewritten to compare `pi` vs `claude-code`.

**Deprecation timeline (per `docs/migration-opencode-removal.md`):**
- Jan 2026 — v1.5.0 ships deprecation warnings.
- Jan–Jun 2026 — 6-month migration window.
- Jul 2026 — v2.0.0 removes `OpenCodeProvider` + `@opencode-ai/sdk`.

**Note on sequencing vs. §7 refactor:** the §7 refactor is the natural moment to remove `OpenCodeProvider` because the type system is being rewritten anyway. The deprecation runway gives cover to do both in v2.0.0.

---

## 3. `src/providers/session-store.ts` — Session Store Abstractions

The store layer is **harness-agnostic** and reusable as-is.

### `SessionStore<T>` interface (lines 38-105)
```ts
export interface SessionStore<T = SessionState> {
  save(sessionId: string, state: T): Promise<void>;
  load(sessionId: string): Promise<T | null>;
  delete(sessionId: string): Promise<boolean>;
  list(): Promise<string[]>;
  has(sessionId: string): Promise<boolean>;
  clear(): Promise<void>;
  deleteExpired(ttl?: number): Promise<string[]>;
}
```

### Implementations
| Class | Status | File location | Notes |
|---|---|---|---|
| `MemorySessionStore<T>` | ✅ Implemented | lines 108-205 | `Map<string,T>`; cleared on `terminate()`; TTL honored only if explicitly passed. |
| `FileSessionStore<T>` | ✅ Implemented | lines 215-368 | Atomic writes (temp + rename); JSON files at `{dir}/{sessionId}.json`; 60s clock-skew tolerance; lazy + active + on-init cleanup. |
| `RedisSessionStore<T>` | ❌ Interface stub only | lines 378-407 | Throws "not yet implemented" if selected via `sessionPersistence: 'redis'` (see `anthropic-provider.ts:204-208`). |

### Integration with the harness
`AnthropicProvider.initialize()` (lines 181-219) resolves the store with this priority:
1. `options.sessionStore` (direct injection) — wins.
2. `options.sessionPersistence` (`'memory' | 'file' | 'redis'`) — constructs the appropriate store.
3. Default — `MemorySessionStore`.

This logic should move verbatim into `HarnessOptions` resolution. The `SessionState` shape (`history: SDKUserMessage[]`, `lastResult: SDKResultMessage | null`, `createdAt?`, `lastAccessedAt?`) is currently Anthropic-SDK-specific — **`PiHarness` will need either a generalized state shape or its own state type**, since Pi's session primitives differ.

---

## 4. `src/cache/cache-key.ts` — Cache Key Does NOT Include Harness/Provider

**Confirmed gap against PRD §7.14.5** ("Cache keys incorporate **both** the harness and the provider/model for isolation").

### Current `CacheKeyInputs` (lines 19-43)
```ts
export interface CacheKeyInputs {
  user: string;
  data?: Record<string, unknown>;
  system?: string;
  model: string;            // ← model only; no provider prefix, no harness
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  responseFormat?: z.ZodType;
}
```

### Current `generateCacheKey()` (lines 201-265)
```ts
export function generateCacheKey(inputs: CacheKeyInputs): string {
  const normalized: Record<string, unknown> = {
    user: inputs.user,
    model: inputs.model,        // ← bare model string only
  };
  // ... optional fields appended conditionally ...
  normalized.schemaHash = getSchemaHash(inputs.responseFormat);
  const serialized = deterministicStringify(normalized);
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}
```

### Consumer site (`src/core/agent.ts:621-636`)
```ts
const cacheInputs: CacheKeyInputs = {
  user: prompt.buildUserMessage(),
  data: prompt.getData(),
  system: effectiveSystem,
  model: effectiveModel,                  // ← this.model string only
  temperature: effectiveTemperature,
  maxTokens: effectiveMaxTokens,
  tools: this.config.tools,
  mcps: this.config.mcps,
  skills: this.config.skills,
  responseFormat: prompt.getResponseFormat(),
};
cacheKey = generateCacheKey(cacheInputs);
```

### Gap analysis
- ❌ **No `harness` field** — a cache entry produced by `pi` can be wrongly returned for `claude-code` and vice versa.
- ❌ **No `provider` field** — the model string is included, but provider-qualified strings (`anthropic/claude-...` vs `claude-...`) happen to be distinct only by accident of formatting. With §7.8's `ModelSpec` the provider is a separate axis and must be its own key component.
- ⚠️ The Agent already has `this.providerId` (`src/core/agent.ts:85`) but does not pass it into `CacheKeyInputs`. Adding both fields requires:
  1. Extend `CacheKeyInputs` with `harness?: HarnessId` and `provider?: ModelProviderId`.
  2. Thread them into `normalized` in `generateCacheKey()`.
  3. Pass them in from `agent.ts` (where the resolved harness/provider are already known — `resolvedProvider` at line 602, and the future `resolvedHarness`).

---

## 5. `src/core/mcp-handler.ts` — MCP Execution & Harness Delegation

This is the **shared infrastructure** PRD §7.4 and §7.12 rely on for cross-harness parity.

### Public API (lines 56-260)
```ts
class MCPHandler {
  registerServer(server: MCPServer): void;                       // throws on duplicate name
  unregisterServer(name: string): void;
  registerToolExecutor(serverName: string, toolName: string, executor: ToolExecutor): void;
  getTools(): Tool[];                                            // returns namespaced tools
  executeTool(toolName: string, input: unknown): Promise<ToolResult>;
  hasTool(toolName: string): boolean;
  getServerNames(): string[];
  toAgentSDKServer(): McpServerConfig | null;                    // ← Anthropic-specific bridge
}
```

### Tool registration & naming (lines 67-93)
Tools are namespaced as `serverName__toolName` (double underscore). `registerServer()` validates name uniqueness and creates per-tool executors based on `server.transport`:
- `'inprocess'` — looks up `this.toolExecutors.get(fullName)` at call time (lazy).
- `'stdio'` — placeholder; throws "not yet implemented" (lines 311-318).

### Tool execution (lines 137-172)
`executeTool()` looks up the registered tool, invokes its executor, and returns a `ToolResult` (`{ type: 'tool_result', tool_use_id, content, is_error? }`). Errors are caught and returned as `is_error: true` rather than thrown.

### Anthropic SDK bridge (lines 178-235) — the key seam
```ts
public toAgentSDKServer(): McpServerConfig | null {
  const tools = this.getTools();
  if (tools.length === 0) return null;

  const sdkTools = Array.from(this.registeredTools.entries()).map(([fullName, registered]) => {
    const zodRawShape = this.jsonSchemaToZodRawShape(registered.tool.input_schema);
    return sdkTool(
      fullName,
      registered.tool.description,
      zodRawShape,
      async (args: unknown) => {
        const result = await registered.executor(args);
        return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
      }
    );
  });

  return createSdkMcpServer({
    name: 'groundswell-mcp',
    version: '1.0.0',
    tools: sdkTools,
  });
}
```

### How a harness delegates
Per PRD §7.10:
1. The harness receives `registerMCPs(servers)` and forwards to its own `MCPHandler` instance (see `anthropic-provider.ts:694-700`).
2. `MCPHandler.registerServer()` records each tool.
3. **`claude-code` path:** `toAgentSDKServer()` converts the tool list into a `createSdkMcpServer()` config and the harness stashes it for inclusion in `sdkOptions.mcpServers` (see `anthropic-provider.ts:703-705` and `:298-301`).
4. **`pi` path (per PRD §7.10):** Groundswell passes its tool list into `createAgentSession({ tools })`. When Pi emits a `tool_call`, the adapter invokes `toolExecutor` and returns the result. **This requires a new bridge method on `MCPHandler` (e.g. `toPiTools()`) that returns Pi-shaped tool descriptors** — currently the only export format is Anthropic's `McpServerConfig`.
5. At execution time, tool calls flow back through the `toolExecutor` callback passed into `execute()`, which routes to `MCPHandler.executeTool()`.

### Risk: JSON Schema → Zod conversion
`jsonSchemaToZodRawShape()` (lines 237-266) and `jsonSchemaPropertyToZod()` (lines 271-307) are Anthropic-SDK-specific (the SDK's `tool()` helper expects a Zod raw shape). This conversion logic does not belong in the shared `MCPHandler` if Pi wants a different shape — consider extracting an `McpFormatConverter` strategy.

---

## 6. `examples/` Directory — Provider/Harness Examples

### Layout
```
examples/
├── examples/                       # Workflow-focused examples (11 files)
│   ├── 01-basic-workflow.ts
│   ├── 02-decorator-options.ts
│   ├── 03-parent-child.ts
│   ├── 04-observers-debugger.ts
│   ├── 05-error-handling.ts
│   ├── 06-concurrent-tasks.ts
│   ├── 07-agent-loops.ts
│   ├── 08-sdk-features.ts          ← Anthropic SDK integration: custom tools, MCP, hooks, skills
│   ├── 09-reflection.ts
│   ├── 10-introspection.ts
│   ├── 11-reparenting-workflows.ts
│   ├── 12-ink-debugger-reactive.tsx
│   └── ink-debugger-hello.tsx
├── providers/                      # Provider-focused examples (6 files) ← refactor surface
│   ├── 01-basic-provider-usage.ts
│   ├── 02-provider-configuration.ts
│   ├── 03-provider-switching.ts
│   ├── 04-multi-provider-scenarios.ts
│   ├── 05-provider-sessions.ts
│   ├── 06-provider-with-mcp-skills.ts
│   └── README.md
├── utils/helpers.ts
├── index.ts
└── README.md
```

### API surface each provider example demonstrates
| File | APIs used | §7 refactor notes |
|---|---|---|
| `01-basic-provider-usage.ts` | `ProviderRegistry.getInstance()`, `registry.register(new AnthropicProvider())`, `registry.initializeProvider()`, `new Agent({ provider, model })`, `agent.prompt(prompt)` | Rename registry → `HarnessRegistry`, `AnthropicProvider` → `ClaudeCodeHarness`, drop `provider:` → `harness:`. |
| `02-provider-configuration.ts` | `configureProviders()`, three-level cascade (global → agent → prompt), `getGlobalProviderConfig()` | Maps to PRD §7.6 `configureHarnesses()` / §7.7 cascade. Imports `OpenCodeProvider` (delete). |
| `03-provider-switching.ts` | Agent-level + prompt-level `provider:` overrides; registers both `AnthropicProvider` and `OpenCodeProvider` | Rewrite to switch `harness:` between `'pi'` and `'claude-code'`. |
| `04-multi-provider-scenarios.ts` | Cost optimization, fallback, A/B testing across providers | Multi-provider logic moves to the model axis (`'anthropic/claude-...'` vs `'openai/gpt-4o'`); harness stays constant. |
| `05-provider-sessions.ts` | `sessionId` creation/continuation, `getSession()` | Largely unchanged; `SessionStore` interface is stable. |
| `06-provider-with-mcp-skills.ts` | `registerMCPs([MCPServer])`, `loadSkills([{ name, path }])`, capability comparison matrix | Capability matrix must be rewritten for `pi` vs `claude-code` (PRD §7.4 table). |
| `examples/08-sdk-features.ts` | Custom tool defs, MCP `inprocess` config, Pre/Post hooks, skills, env var pass-through | Workflow-level example; survives mostly intact. |

### `package.json` scripts (lines 21-37) — every `start:provider-*` script targets the current provider examples. After refactor these become `start:harness-*` or similar.

---

## 7. `docs/` — Documented Migration Approach

### `docs/providers.md` (lines 1-1581, ~3500 lines total)
- **Single-provider doc**: only `anthropic` is documented as supported in the table (lines 47-56). The architecture diagram (lines 65-110) shows `Application → ProviderRegistry → Provider → AnthropicProvider`.
- **Configuration cascade** (lines 165-260): documented as Prompt > Agent > Global using nullish coalescing. PRD §7.7 preserves this exact pattern but renames the axes.
- **`ProviderId`** documented as `'anthropic'` only (lines 73-78) — out of date vs. `src/types/providers.ts:9` which still has `'anthropic' | 'opencode'`.
- **Sessions** (lines 478-1100, extensive): the doc is the authoritative description of the `MemorySessionStore` / `FileSessionStore` / `RedisSessionStore` design, including atomic writes, sliding-window TTL, 60s clock-skew tolerance, lazy/active/on-init cleanup, and the migration playbook from memory → file.
- **Hooks** (lines 1162-1300): documents the `ProviderHookEvents` → SDK hook mapping. Will need a rename pass to `HarnessHookEvents`.

**Refactor impact:** This doc is the single largest documentation rewrite in the §7 effort. PRD §7 essentially supersedes it; the new `docs/harnesses.md` should be its successor.

### `docs/migration-opencode-removal.md` (lines 1-257)
- **Timeline:** Jan 2026 v1.5.0 (deprecation warnings shipped) → Jul 2026 v2.0.0 (removal).
- **Breaking changes enumerated** (lines 27-32):
  - `OpenCodeProvider` class removed.
  - `@opencode-ai/sdk` dependency removed.
  - `ProviderId` no longer includes `'opencode'`.
  - Multi-provider gateway functionality removed.
- **Migration steps:** (1) drop imports, (2) update registry calls, (3) update `configureProviders()` to drop `opencode`, (4) update model strings to Anthropic equivalents.
- **Model mapping table** (lines 117-123): OpenAI/Google models → Anthropic equivalents (or "N/A — not available via Anthropic").
- **FAQ:** OpenAI models are no longer accessible through Groundswell until the multi-provider story returns via `PiHarness`.

### `docs/migration-guide-agent-response.md` (lines 1-340)
- Documents `AgentResponse<T>` (`{ status, data, error, metadata? }`) — the **single shared response type** for both harnesses per PRD §7.14.4 ("Identical `AgentResponse<T>` shape from both harnesses").
- Factory functions `createSuccessResponse`, `createErrorResponse`, `createPartialResponse`.
- Type guards `isSuccess`, `isError`, `isPartial`.
- Error codes: `VALIDATION_ERROR`, `API_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- No deprecation timeline; this is the steady-state contract.

**Doc-driven refactor order implied by these three files:** (1) `OpenCodeProvider` removal → (2) `Provider*` → `Harness*` rename → (3) `docs/providers.md` rewrite as `docs/harnesses.md`.

---

## 8. `package.json` — Dependency Inventory

```json
"dependencies": {
  "@anthropic-ai/claude-agent-sdk": "^0.1.0",   ← PRESENT (claude-code harness)
  "@opencode-ai/sdk": "1.1.36",                  ← PRESENT (deprecated, remove in v2.0.0)
  "ink": "^6.6.0",
  "lru-cache": "^10.4.3",
  "react": "^19.0.0",
  "zod": "^3.23.0",
  "zod-to-json-schema": "^3.23.0"
}
```

| Package | Present? | §7 disposition |
|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | ✅ `^0.1.0` | **Keep** — wrapped by `ClaudeCodeHarness`. |
| `@opencode-ai/sdk` | ✅ `1.1.36` (pinned, no caret) | **Remove in v2.0.0** per deprecation timeline. |
| `@earendil-works/pi-coding-agent` | ❌ **NOT present** | **Add** — required by `PiHarness` per PRD §7.1. Currently zero Pi code exists in the repo. |

**Risk:** The Pi SDK is a net-new dependency with no existing wrapping code. Unlike `ClaudeCodeHarness` (which is a rename of `AnthropicProvider`), `PiHarness` is a from-scratch adapter that must implement the full `Harness` interface and reach parity with `claude-code` per §7.14.

---

## Key Integration Seams (Quick Reference)

### Seam 1 — Harness execute signature
```ts
// src/providers/anthropic-provider.ts:228-237 (today, as Provider)
execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>

// PRD §7.3 target (as Harness)
execute<T>(
  request: HarnessRequest,
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
  hooks?: HarnessHookEvents
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
```

### Seam 2 — MCP tool registration
```ts
// src/core/mcp-handler.ts:178-235 — the only SDK-specific bridge today
public toAgentSDKServer(): McpServerConfig | null { /* createSdkMcpServer(...) */ }

// Needed for PiHarness: a parallel bridge
// public toPiTools(): PiToolDescriptor[] { /* ... */ }
```

### Seam 3 — Cache key (PRD §7.14.5)
```ts
// src/cache/cache-key.ts:19-43 (current — missing harness + provider)
export interface CacheKeyInputs {
  user: string;
  model: string;        // ← bare model; no harness, no provider axis
  // ...
}

// Required addition:
//   harness: HarnessId;
//   provider: ModelProviderId;
```

### Seam 4 — Provider/Model normalization (PRD §7.8)
```ts
// src/providers/anthropic-provider.ts:893-923
normalizeModel(model: string): ModelSpec {
  const spec = parseModelSpec(model, "anthropic");
  if (spec.provider !== this.id) { /* throws — this becomes the claude-code constraint */ }
  return spec;
}
```

### Seam 5 — Type rename surface (purely mechanical)
- `Provider` → `Harness` (src/types/providers.ts:571-770)
- `ProviderId` → split into `HarnessId` (`'pi' | 'claude-code'`) + `ModelProviderId` (open string union)
- `ProviderRequest` → `HarnessRequest`
- `ProviderOptions` → `HarnessOptions`
- `ProviderCapabilities` → `HarnessCapabilities`
- `ProviderHookEvents` → `HarnessHookEvents`
- `ProviderRegistry` → `HarnessRegistry` (src/providers/provider-registry.ts)
- `configureProviders()` → `configureHarnesses()` (src/utils/provider-config.ts)
- `AgentConfig.provider` → `AgentConfig.harness` (src/types/agent.ts:127)
- `PromptOverrides.provider` → `PromptOverrides.harness` (src/types/agent.ts:228)
- `AnthropicProvider` → `ClaudeCodeHarness` (src/providers/anthropic-provider.ts)
- New: `PiHarness` wraps `@earendil-works/pi-coding-agent` (no current code).

---

## Start Here

**`src/types/providers.ts`** — This single file holds every type that must split or rename: `Provider`, `ProviderId`, `ProviderRequest`, `ProviderOptions`, `ProviderCapabilities`, `ProviderHookEvents`, plus the deprecated `ProviderResult<T>` family. Splitting `ProviderId` into `HarnessId` (closed) + `ModelProviderId` (open) and renaming the `Provider*` family to `Harness*` is the first mechanical step; everything downstream (registry, providers directory, agent.ts, cache-key.ts, examples) follows from these type changes. Open this file alongside `PRD.md` §7.2–§7.5 to drive the rename.
