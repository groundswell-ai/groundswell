# System Context — Harness System Integration Bugfix

> Master synthesis of all research. Downstream PRP agents MUST read this before
> generating implementation plans. Individual issue reports live alongside this file:
> `issue1-agent-harness-resolution.md`, `issue2-piharness-toolexecutor.md`,
> `issue3-4-metadata-and-exports.md`, `test-patterns-and-conventions.md`.

## 1. What we are fixing

Four integration-level bugs in the Harness System (PRD §7), all validated against the
current codebase. A fifth (unicode workflow names) is **OUT OF SCOPE** per the PRD.

| # | Severity | Issue | Primary file |
|---|----------|-------|--------------|
| 1 | Critical | `configureHarnesses()` global default never reaches `Agent` — `new Agent({model})` throws "Harness 'anthropic' is not registered" | `src/core/agent.ts` |
| 2 | Major | `PiHarness` ignores the `toolExecutor` callback — Agent-configured tools are invisible/non-executable (PRD §7.10) | `src/harnesses/pi-harness.ts` |
| 3 | Minor | Streaming `metadata.provider` reports harness id, not LLM provider | `pi-harness.ts` + `claude-code-harness.ts` |
| 4 | Minor | `registerDefaultHarnesses()` not exported from public barrel, never auto-invoked — **compounds Issue 1** | `src/index.ts` + `harness-registry.ts` |

**Issue 4 is coupled to Issue 1.** The PRD explicitly states: "even after the cascade fix,
`new Agent({ model })` will fail unless the user has registered a `'pi'` harness somewhere."
The end-to-end success criterion for the Critical fix therefore requires a default-harness
registration safety net.

## 2. Root causes (validated)

### Issue 1 — two singletons, Agent reads the wrong one
- `src/core/agent.ts` imports the **legacy** pair `getGlobalProviderConfig` /
  `resolveProviderConfig` from `../utils/provider-config.js` (import at **L45**).
- `getGlobalProviderConfig()` reads `globalProviderConfig` (defaults to
  `{ defaultProvider: 'anthropic' }`) — a **separate store** from `globalHarnessConfig`.
- `configureHarnesses()` (the NEW public API) writes to `globalHarnessConfig`, which the
  Agent **never reads for harness resolution**.
- Result: legacy default `'anthropic'` flows to `registry.get('anthropic')` → `undefined`
  → constructor throws at **L128**: `throw new Error("Harness 'anthropic' is not registered")`.
- The correct functions already exist and are PURE: `getGlobalHarnessConfig()` (defaults to
  `{ defaultHarness: 'pi' }`) and `resolveHarnessConfig(global, agentHarness?, agentOptions?,
  promptHarness?, promptOptions?)` → `{ harness, options }`, **no id validation**.
- `getGlobalHarnessConfig` is already imported (L46) and used at L661 for the **model axis**
  only — proving model resolution is fine; only the **harness axis** is mis-wired.

**Three call sites to rewire** (all in `src/core/agent.ts`):
1. Constructor — L117-120 (throws at L128; variable `effectiveHarness = resolved.provider`)
2. `stream()` — L372-378 (throws synchronously at L390 before generator creation)
3. `executePrompt()` — L616-622 (returns `createErrorResponse('PROVIDER_NOT_FOUND')` at L633 — NOT a throw)

The swap is near drop-in: `getGlobalProviderConfig()` → `getGlobalHarnessConfig()`;
`resolveProviderConfig(...)` → `resolveHarnessConfig(...)`; destructure `.provider` → `.harness`.

### Issue 2 — dead `toolExecutor` parameter
- `PiHarness.execute()` (L212-216) and `executeStreaming()` (L348-352) declare `toolExecutor`
  but the body never calls it. The only use of `toolExecutor` in `execute()` is forwarding
  into `executeStreaming` (L223). `grep toolExecutor pi-harness.ts` → 3 hits, all
  signature/forward, **zero call sites**.
- `buildCustomTools()` (L649-661) is `return this.mcpHandler.toPiCustomTools();` — no arg,
  no rebinding. Called at L250 (non-streaming) and L370 (streaming), result passed as
  `customTools` to `createAgentSession`.
- `MCPHandler.toPiCustomTools()` (mcp-handler.ts L236-261) binds each tool's `execute` to
  `registered.executor` (L253) — the executor stashed inside the harness's OWN MCPHandler,
  NOT the caller's `toolExecutor`.
- `Agent.toolExecutor` (agent.ts L180-218) IS correctly passed as the arg to
  `harness.execute()` at agent.ts L494-497 (stream) and L804-807 (executePrompt). The
  harness just drops it.
- **Conversion mismatch to fix too:** `MCPHandler.toAgentToolResult(result, isError)`
  (mcp-handler.ts L272-281) blindly stringifies `unknown`. The caller's `toolExecutor`
  returns `ToolExecutionResult { content: string|unknown, isError: boolean }`
  (types/harnesses.ts L145-150). A NEW converter `toAgentToolResultFromExecResult` must
  read `.content` / `.isError` instead of JSON-stringifying the whole object.
- `ToolExecutionRequest` (types/harnesses.ts L127-131) = `{ name: string; input: unknown }`.

### Issue 3 — one-token semantic fix (×2)
- `pi-harness.ts` L374-382: `metadata.provider: this.id` (`'pi'`). `modelSpec` in scope at L358.
- `claude-code-harness.ts` L696-704: `metadata.provider: this.id` (`'claude-code'`).
  `modelSpec` in scope at L666-669.
- `StreamEvent` metadata type (streaming.ts L41):
  `{ type:'metadata'; metadata:{ requestId?: string; model?: string; provider: string } }`.
- `ModelSpec.provider` (types/harnesses.ts L229-238) is the correct LLM host.
- Fix: `provider: this.id` → `provider: modelSpec.provider` at both sites.
- **Risk:** snapshot/value tests may assert `provider:'pi'`; grep before landing.

### Issue 4 — registration safety net
- `registerDefaultHarnesses` exported only from `src/harnesses/index.ts` (L21), NOT from
  `src/index.ts`. Function body at `register-defaults.ts` L28-48 registers `'claude-code'`
  + `'pi'` idempotently (guarded by `registry.has(id)`).
- `HarnessRegistry.getInstance()` (harness-registry.ts) starts **empty** — no lazy
  auto-registration.
- **Zero production callers** of `registerDefaultHarnesses()` (only tests + JSDoc).
- **Policy note:** PRP `P2M1T1S2` deliberately kept it out of the public barrel and forbade
  import-time auto-invocation (to avoid singleton pollution in tests). The chosen resolution
  here is: (a) **export from `src/index.ts`** (convenience + docs), AND (b) **lazy
  auto-register** inside the Agent constructor / registry accessor WITH a guard so the
  `'pi'` + `'claude-code'` defaults exist when needed, while tests that reset the registry
  and register their own mocks remain unaffected.

## 3. The documented primary user journey (must work end-to-end after M1)

`examples/harnesses/02-harness-configuration.ts` is the shipped, documented smoke test:
- L70-71: `configureHarnesses({ defaultHarness: 'pi', ... })`
- L121-124: `new Agent({ name: 'DefaultAgent' })` with **no harness** — expects to inherit
  global `'pi'`.
- Currently crashes on launch with "Harness 'anthropic' is not registered".
- After M1 (Issue 1 + Issue 4): must construct successfully and resolve to the `pi` harness
  with NO manual `registerDefaultHarnesses()` / `registry.register(...)` call in user code.

Minimal repro (PRD §Steps to Reproduce): `configureHarnesses({defaultHarness:'pi'})` then
`new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })` — must NOT throw.

## 4. The four-scenario cascade matrix (currently untested at the Agent level)

| # | global.defaultHarness | agent.harness | prompt.harness | resolved | Current |
|---|-----------------------|---------------|----------------|----------|---------|
| 1 | `'pi'` | — | — | `'pi'` | ❌ FAILS (legacy default `'anthropic'`) |
| 2 | `'pi'` | `'claude-code'` | — | `'claude-code'` | ✅ (explicit, cascade never reaches global) |
| 3 | `'pi'` | `'claude-code'` | `'pi'` | `'pi'` | ✅ (prompt wins) |
| 4 | nothing | — | — | `'pi'` | ❌ FAILS (registry empty + legacy default) |

Scenario 1 + 4 are the regression coverage gaps. The pure-function matrix is partially
covered in `harness-config.test.ts` (`describe('cascade integration')` L377-405) but NOT
through the Agent constructor.

## 5. Testing conventions (see test-patterns-and-conventions.md for full detail)

- **Runner:** vitest 1.x; `npm test` = `vitest run`; `npm run lint` = `tsc --noEmit`.
- **Lint scope:** `tsc --noEmit` EXCLUDES `src/__tests__` (per tsconfig `exclude`). Type
  errors in tests surface only at `vitest run` via esbuild (permissive). Verify with
  `vitest run`.
- **Imports:** relative paths + `.js` extension even for `.ts` source (bundler resolution).
  Type-only imports MUST use `import type { ... }` (`isolatedModules: true`).
- **Globals:** `globals: true`, but explicitly `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';`.
- **Private-field overwrite** (`// @ts-expect-error - Testing private property`) after REAL
  `initialize()` — NOT `vi.mock`. This is the proven pattern across all harness unit tests.
- **Registry reset:** `HarnessRegistry._resetForTesting();` + `HarnessRegistry.getInstance()._resetInitStateForTesting();` in `beforeEach`/`afterEach`.
- **Global config reset:** `resetGlobalHarnessConfig()` (new) and/or `resetGlobalConfig()` (legacy).
- **Pi SDK mock:** `makeFakeSession(events)` factory capturing a listener; `prompt` replays
  scripted events. Gold-standard copy: `src/__tests__/integration/harness-parity.test.ts:46-80`.
- **Anthropic SDK mock:** `sdk.query` returns an async generator yielding `SDKMessage`s;
  include `createSdkMcpServer` + `tool` stubs or `initialize()` throws.
- **Parity assertions:** SHAPE/key-set parity only (`Object.keys(...).sort()`); never
  value-equality on `isError`/`duration`. `agentId` is the ONE sanctioned value divergence.
- **Mock harness for Agent tests:** `createMockHarness(id, executeImpl?)` factory.

## 6. Cross-cutting risks & decisions

1. **"is not registered" substring contract** — `stream()` (L390) throw and
   `executePrompt()` (L633) error message MUST preserve the literal substring
   `is not registered` so existing `.rejects.toThrow(...)` regex tests still match.
2. **Legacy `config.provider` fallback** — `this.harnessId` may be populated from
   `config.provider` (legacy vocabulary). After the rewire, a literal `'anthropic'`
   passed as `provider:` will flow through `resolveHarnessConfig` (no validation) to
   `registry.get('anthropic')` → throws. This is acceptable (the registry no longer has
   an `'anthropic'` harness), but existing tests using `new Agent({ provider:'anthropic' })`
   fixtures (e.g. `workflow-validation.test.ts`) may need their mock registration updated.
   The audit subtask (M1.T1.S1) enumerates these.
3. **Two separate singletons** — `globalProviderConfig` (legacy) and `globalHarnessConfig`
  (new) remain distinct stores. The legacy shim `src/utils/provider-config.ts` only
  re-exports. Do NOT assume `configureProviders` and `configureHarnesses` share state.
4. **Issue 2 backward compat** — `ClaudeCodeHarness` uses `toAgentSDKServer()` which calls
   `registered.executor` directly and is unaffected. Do NOT remove `toPiCustomTools()`
   default behavior; add an optional `toolExecutor` parameter (preferred — `undefined`
   falls back to `registered.executor`, preserving the existing `pi-harness-customtools.test.ts`).
5. **Issue 2 adapter shape** — Pi's `execute` is
   `(_toolCallId, params, _signal, _onUpdate, _ctx) => Promise<AgentToolResult<{isError}>>`.
   The caller's `toolExecutor` is `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>`.
   Adapter must supply `name` (= `fullName`, the map key in scope at mcp-handler.ts L237)
   and pass `params` as `input`.
6. **Issue 4 test isolation** — lazy auto-registration must be guarded so a reset registry
   that already has mocks registered is not overwritten. The `registerDefaultHarnesses`
   idempotency guard (`registry.has(id)`) already provides this.

## 7. Files touched (summary)

| File | Issues |
|------|--------|
| `src/core/agent.ts` | 1 (rewire 3 sites + import), 4 (lazy auto-register in ctor) |
| `src/harnesses/pi-harness.ts` | 2 (`buildCustomTools` + 2 call sites), 3 (L380 provider) |
| `src/harnesses/claude-code-harness.ts` | 3 (L702 provider) |
| `src/core/mcp-handler.ts` | 2 (add `toAgentToolResultFromExecResult`; thread toolExecutor into `toPiCustomTools`) |
| `src/index.ts` | 4 (export `registerDefaultHarnesses`) |
| `src/harnesses/harness-registry.ts` | 4 (lazy auto-register in `getInstance`, optional) |
| New/updated tests under `src/__tests__/` | 1, 2, 3, 4 regression coverage |

**Issue 5 (unicode workflow names) is explicitly OUT OF SCOPE** — do not touch
`src/core/workflow.ts` or `edge-case.test.ts`.
