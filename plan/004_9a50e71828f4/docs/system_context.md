# System Context — PRD v1.2 Harness/Provider Split

> **Purpose:** The single authoritative architecture summary downstream PRP
> (Product Requirement Prompt) agents consume when implementing tasks. Read this
> alongside `external_deps.md` (verified SDK APIs), `migration-scope.md` (token
> inventory), and `consumer-analysis.md` (integration seams).

## 1. What This Project Is

**Groundswell** (`package.json` name: `groundswell`, v0.0.4) is a TypeScript
hierarchical-workflow orchestration engine with full observability (tree mirror,
logs, events, snapshots, restart semantics, tree debugger). It ALSO ships an
agent-execution layer: the `Agent` class runs prompts through a pluggable LLM
runtime, delegating tool execution to an `MCPHandler`.

- **Stack:** Node ≥20, ESM (`"type": "module"`), TS 5.2 (`target/module ES2022`,
  `moduleResolution: bundler`, `strict`, `useDefineForClassFields`).
- **Test:** Vitest (`src/__tests__/**` excluded from `tsc` build). TDD is the
  implicit workflow — every task implies red→green.
- **Key dirs:** `src/types` (17 type files — single source of truth),
  `src/providers` (runtime adapters + registry + session store), `src/core`
  (`agent.ts`, `workflow.ts`, `mcp-handler.ts`, `prompt.ts`, `context.ts`),
  `src/cache`, `src/decorators`, `src/debugger`, `src/utils`.

## 2. The v1.2 Mandate (the work to be done)

PRD v1.2 (commit `fd1b737` updated **only `PRD.md`**) introduces a fundamental
**Harness / Provider split**. The PRD states verbatim:
> *"The current `Provider*` types in source map to the new `Harness*` types; code migration to match this spec is a tracked follow-up."*

**Verified reality:** `grep -rln "Harness" src/` returns **0 files**. Zero `pi`/
`ModelProviderId`/`configureHarnesses` references exist. The entire v1.2
implementation is unstarted. This is a large, mechanical-but-semantic refactoring.

### 2.1 The core conceptual change — two orthogonal axes

Today the code has ONE axis — `ProviderId = "anthropic" | "opencode"` — which
**conflates** the agent runtime (the SDK/loop that drives prompting+tools) with
the LLM vendor (who hosts the model). v1.2 splits this into TWO independent axes:

| Axis | Old concept | New concept | Values |
|---|---|---|---|
| Agent runtime | (implicit in Provider) | **Harness** | `HarnessId = 'pi' \| 'claude-code'` |
| LLM vendor | `ProviderId` (conflated) | **Model Provider** | `ModelProviderId = 'anthropic' \| 'openai' \| 'google' \| 'zai' \| (string & {})` |

**Critical rule (PRD §7.8):** the harness is NEVER part of the model string.
`pi/anthropic/claude-...` is INVALID. Format is `provider/model` (e.g.
`anthropic/claude-sonnet-4`) or plain model id (resolved against `defaultModelProvider`).
`claude-code` can only run `anthropic/*` models (surfaced as a config error at init/execute).

### 2.2 The three concrete deliverables

1. **Rename** the `Provider*` type/runtime family → `Harness*` family (mechanical, large).
2. **Remove** `OpenCodeProvider` + `@opencode-ai/sdk` + the `'opencode'` enum (already on the v1.5.0→v2.0.0 deprecation track).
3. **Add** `PiHarness` wrapping `@earendil-works/pi-coding-agent` (NEW dependency, NEW adapter from scratch) and make it the **default** harness. Retain `ClaudeCodeHarness` (rename of `AnthropicProvider`) as a parity-maintained option.

Plus the cross-cutting requirements: split the configuration cascade into two
independent cascades (§7.7), make cache keys incorporate BOTH harness AND
provider/model (§7.14.5), add an MCPHandler→Pi tool bridge, and maintain
**backward compatibility** via deprecated `Provider*` aliases (per the existing
`docs/migration-guide-agent-response.md` pattern).

## 3. Target Type Mapping (verified old → new)

`src/types/providers.ts` is the SINGLE source of truth to edit first; everything
else cascades from it. `src/types/index.ts` and `src/index.ts` re-export.

| Old (src/types/providers.ts) | New | Notes |
|---|---|---|
| `ProviderId = "anthropic"\|"opencode"` | `HarnessId = 'pi'\|'claude-code'` + `ModelProviderId` (open string union) | Split into two axes |
| `ProviderCapabilities` | `HarnessCapabilities` | identical shape |
| `ProviderOptions` | `HarnessOptions` | drop `'redis'` if not needed; keep `apiKey` (forwards to provider) |
| `ProviderExecutionOptions` | (becomes part of `HarnessRequest`) | merge |
| `ProviderRequest` | `HarnessRequest` | `{ prompt, options }` |
| `ProviderHookEvents` | `HarnessHookEvents` | identical (`onToolStart`/`onToolEnd`/`onSessionStart`/`onSessionEnd`/`onStream`) |
| `Provider` (interface) | `Harness` | identical method surface (execute/registerMCPs/loadSkills/normalizeModel/initialize/terminate/supports/requiresFeatures) |
| `GlobalProviderConfig` | `GlobalHarnessConfig` | + `defaultModelProvider?: ModelProviderId` |
| `configureProviders` | `configureHarnesses` | util rename |
| `ModelSpec.provider: ProviderId` | `ModelSpec.provider: ModelProviderId` | provider axis is now model-vendor |
| `ProviderResult<T>` family | (already deprecated → AgentResponse) | keep deprecated aliases |

**Renames elsewhere:**
- `ProviderRegistry` → `HarnessRegistry` (keep singleton, `InitializationStatus`, `_resetForTesting`).
- `AnthropicProvider` → `ClaudeCodeHarness` (id `'claude-code'`, anthropic-only constraint).
- `OpenCodeProvider` → **DELETE** (do not rename).
- `src/providers/` → may keep dir name OR move to `src/harnesses/` (decision: keep `src/providers/` dir but add `src/harnesses/` for new files? — see Task notes; simplest is rename dir to `src/harnesses/`).
- `AgentConfig.provider/providerOptions` → `harness/harnessOptions` (+ model stays, parsed via `ModelSpec`).
- `PromptOverrides.provider/providerOptions` → `harness/harnessOptions`.

## 4. Integration Seams (where the harness plugs in)

1. **`src/core/agent.ts`** — the CENTRAL consumer. Resolves harness via cascade
   (`resolveHarnessConfig`), fetches `HarnessRegistry.get(harnessId)`, builds
   `HarnessRequest`, calls `harness.execute()`. Has TWO call sites (constructor +
   `executePrompt` + `stream`) that each do cascade resolution. Cache-key build site (~line 621) needs harness+provider added.
2. **`src/cache/cache-key.ts`** — `CacheKeyInputs` must gain `harness: HarnessId` and `provider: ModelProviderId`; `generateCacheKey` must include them. PRD §7.14.5.
3. **`src/core/mcp-handler.ts`** — currently only `toAgentSDKServer()` (Claude bridge). ADD `toPiCustomTools(): ToolDefinition[]` + a JSON-Schema→TypeBox converter for Pi.
4. **`src/utils/provider-config.ts`** → `harness-config.ts` — `configureHarnesses`, `getGlobalHarnessConfig`, `resolveHarnessConfig`. NOTE: model resolution is a SEPARATE concern (`parseModelSpec`/`formatModelForProvider` in `model-spec.ts`); the two cascades are independent (PRD §7.7).
5. **`src/utils/model-spec.ts`** — `parseModelSpec(model, defaultProvider?)` against `ModelProviderId` (open set, so validation changes from closed-union to "non-empty"). `formatModelForProvider` keeps cross-translation-error behavior.

## 5. The Two SDK Adapter Contracts (verified — see external_deps.md)

Both `PiHarness` and `ClaudeCodeHarness` implement the shared `Harness` interface.
BOTH execute tools via an in-process handler the host provides → the adapter maps
each `MCPHandler` tool to the SDK's tool shape and delegates execution to the
`toolExecutor` callback.

- **ClaudeCodeHarness:** rename of `AnthropicProvider`. `createSdkMcpServer({tools:[tool(...)]})`; `query()` streaming; `options.hooks`; anthropic-only.
- **PiHarness (NEW):** `createAgentSession({ model, customTools, ... })`; `session.subscribe(events)`; `session.prompt(text)`; TypeBox tool schemas; native skills; any provider.

## 6. Migration Strategy & Sequencing

A safe, reversible order (each milestone leaves the build green):

1. **Foundation types first** (`Harness*`, `HarnessId`, `ModelProviderId`, `GlobalHarnessConfig`) in `src/types/harnesses.ts` (new file, parallel to legacy `providers.ts`). Keep legacy `Provider*` as deprecated type-aliases pointing at the new types → instant backward-compat.
2. **Registry + config** rename (`HarnessRegistry`, `configureHarnesses`, `resolveHarnessConfig`) with deprecated aliases.
3. **Model spec** open-set validation (`ModelProviderId`).
4. **ClaudeCodeHarness** = rename `AnthropicProvider` (id `'claude-code'`, default-model `'anthropic'`, anthropic-only gate). Register it.
5. **PiHarness** = new adapter wrapping `@earendil-works/pi-coding-agent` (add dep). Register it. Make `'pi'` the global default.
6. **MCPHandler Pi bridge** (`toPiCustomTools` + TypeBox converter).
7. **Agent + PromptOverrides + cache-key** rewire to harness axis + dual cascade.
8. **Remove** `OpenCodeProvider`, `@opencode-ai/sdk`, `'opencode'` literal, opencode tests, migration-opencode doc.
9. **Examples + docs + public API (`src/index.ts`)** finalize.
10. **Parity + adversarial tests** (PRD §7.14): identical `AgentResponse`, tool semantics, hook ordering, cache isolation across both harnesses.

## 7. Risks & Open Decisions

- **`SessionState` is Anthropic-SDK-shaped** (`SDKUserMessage[]`/`SDKResultMessage`). Pi has its own session primitives. Decision: keep `SessionStore<T>` generic; each harness owns its concrete state type (`ClaudeCodeSessionState`, `PiSessionState`). Do NOT force a shared state shape.
- **Directory rename** `src/providers/` → `src/harnesses/`: cleaner but touches every import path. Acceptable since the whole tree is being edited; downstream PRP agents should rename the directory.
- **Backward-compat aliases:** keep `Provider*` as `@deprecated` type aliases in `src/types/providers.ts` (re-exporting from `harnesses.ts`) for one release to avoid breaking external consumers (mirrors the existing `ProviderResult`→`AgentResponse` deprecation pattern). Keep `AnthropicProvider` as a deprecated alias for `ClaudeCodeHarness`.
- **TypeBox dependency:** Pi tools need TypeBox schemas; convert from the existing JSON-Schema `input_schema`. May require adding `@sinclair/typebox` (transitive via Pi) as a direct dep or using the converter inline.

## 8. Files Touched (verified — see migration-scope.md §10)

**Non-test src (13):** `index.ts`, `types/index.ts`, `types/providers.ts`(+new `types/harnesses.ts`), `types/agent.ts`, `core/agent.ts`, `core/mcp-handler.ts`, `cache/cache-key.ts`, `providers/*` (rename dir → `harnesses/`), `utils/provider-config.ts`(→`harness-config.ts`), `utils/model-spec.ts`, `utils/index.ts`.
**Tests:** ~38 files under `src/__tests__/` (integration + unit/providers + unit/utils).
**Adjacent (out of src, downstream):** `examples/providers/*`, `docs/providers.md`→`docs/harnesses.md`, `docs/migration-opencode-removal.md` (update/finalize), `package.json` deps, `CHANGELOG.md`.
