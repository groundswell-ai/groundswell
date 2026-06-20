# **Delta PRD: Harness / Provider Split Migration**

**Session:** 004_9a50e71828f4
**Base PRD Version:** 1.1 → 1.2
**Change Type:** Architecture Refactor (terminology + two-axis split)
**Size:** Medium

---

## **1. Summary**

PRD v1.2 reorganizes **Section 7 (Agent SDK Provider System → Agent Harness System)**. The agent runtime is now modeled as a **harness** (`pi` default, `claude-code` optional) that is **orthogonal** to the LLM **provider/model** (Anthropic, OpenAI, Z.ai, …). The two axes are chosen independently and the harness **never** appears in the model string.

The PRD explicitly notes: *"The current `Provider*` types in source map to the new `Harness*` types; code migration to match this spec is a tracked follow-up."* **This delta PRD defines that follow-up.**

**Scope is Section 7 only.** Sections 1–6 and 8+ are unchanged.

---

## **2. What Changed (1.1 → 1.2)**

### **2.1 Terminology rename — `Provider*` → `Harness*`**

| v1.1 (current source) | v1.2 (target) |
|------------------------|---------------|
| `ProviderId` = `'anthropic' \| 'opencode'` | `HarnessId` = `'pi' \| 'claude-code'` |
| `Provider` interface | `Harness` interface |
| `ProviderCapabilities` | `HarnessCapabilities` |
| `ProviderOptions` | `HarnessOptions` |
| `ProviderHookEvents` | `HarnessHookEvents` |
| `ProviderRequest` | `HarnessRequest` |
| `GlobalProviderConfig` | `GlobalHarnessConfig` |
| `configureProviders()` | `configureHarnesses()` |
| `AgentConfig.provider` / `providerOptions` | `AgentConfig.harness` / `harnessOptions` |
| `PromptOverrides.provider` / `providerOptions` | `PromptOverrides.harness` / `harnessOptions` |

**Default value change:** default harness is `'pi'` (was `'anthropic'`).

### **2.2 New orthogonal axis — LLM provider/model**

This is the **conceptually new** part of v1.2. The LLM host is no longer conflated with the runtime.

* New type `ModelProviderId` — open union: `'anthropic' | 'openai' | 'google' | 'zai' | (string & {})`.
* New field `GlobalHarnessConfig.defaultModelProvider?: ModelProviderId` — resolves unqualified model strings.
* `ModelSpec.provider` is now `ModelProviderId` (the LLM host), **not** `ProviderId` (the harness).
* **Critical rule:** model strings must never be harness-qualified. `pi/anthropic/claude-sonnet-4` and `cc/anthropic/...` are **invalid** and must be rejected by the parser.
* **`claude-code` constraint:** the Claude Code SDK can only run `anthropic/*` models. A non-Anthropic provider on `claude-code` is a config error surfaced at `initialize()`/`execute()`.

### **2.3 Harness adapter swap**

The two old provider implementations are replaced by two harness adapters:

| v1.1 (current source) | v1.2 (target) |
|------------------------|---------------|
| `AnthropicProvider` (wraps `@anthropic-ai/claude-agent-sdk`) | `ClaudeCodeHarness` (same SDK) |
| `OpenCodeProvider` (wraps `@opencode-ai/sdk`) | `PiHarness` (wraps `@earendil-works/pi-coding-agent` via `createAgentSession()`) |

* `PiHarness` is the **default** (vendor-neutral).
* `ProviderRegistry` → `HarnessRegistry`.
* `execute()` returns `AgentResponse<T>` (already implemented in session 003; `ProviderResult<T>` stays deprecated/removed).

### **2.4 New hook**

* `HarnessHookEvents` gains `onStream` (source events: `pi` → `message_update`; `claude-code` → message stream).

### **2.5 Documentation reorganization (§7.4, §7.10, §7.12)**

* Capabilities table reworked for `pi` vs `claude-code`.
* §7.10 clarifies tools flow through `MCPHandler` regardless of harness; `pi` adapter registers tools via `createAgentSession({ tools })`.
* §7.12 merges MCP / Skills / LSP into one section with the **parity-without-plugins** rationale (Groundswell's `MCPHandler` provides MCP/LSP; `pi` needs no plugin).

---

## **3. Reference to Prior Work (Session 003)**

The previous session fully implemented the v1.1 provider system. The migration **builds on** rather than re-implements:

* `src/types/providers.ts` (865 lines) — contains all `Provider*` types + already-deprecated `ProviderResult<T>` aliases. **Type rename happens here.**
* `src/providers/anthropic-provider.ts` (1254 lines) — SDK wiring (session store, hooks, model normalization, execute) is reusable; becomes the basis of `ClaudeCodeHarness`.
* `src/providers/opencode-provider.ts` (1039 lines) — the OpenCode SDK was never a real LLM-coupled runtime; its adapter logic is largely **retired**. The `PiHarness` is a **new** adapter wrapping a different SDK.
* `src/providers/provider-registry.ts` (607 lines), `src/providers/session-store.ts` (410 lines) — registry mechanics and session store are reusable after rename.
* `src/utils/provider-config.ts` (363 lines) — cascade logic reused; gains `defaultModelProvider` handling.
* `src/utils/model-spec.ts` (250 lines) — parser reused; must add the **harness-qualified-string rejection** rule and switch `provider` to `ModelProviderId`.
* `src/core/agent.ts` (1009 lines) — reads `provider`/`providerOptions`; rename to `harness`/`harnessOptions`.
* `execute()` already returns `AgentResponse<T>` — **no change needed** for the response-shape part of §7.3.

**Prior research that still applies** (in `plan/003_dd63ad365ffb/docs/`):
* `research/model-spec-parsing-best-practices.md`, `research/model-formatting-research.md` — parser design.
* `research/provider-initialization-best-practices.md`, `research/provider-interface-design-patterns.md` — adapter structure.
* `research/anthropic-provider-patterns.md`, `docs/architecture/decisions.md` — Claude Code SDK specifics.
* `sdk-message-serialization-research.md` — `AgentResponse<T>` shape.
* **Not needed from prior work:** OpenCode-specific research (`opencode-initialization-research.md`, `opencode-provider-*` PRPs) is **retired**; `opencode` is gone.

**New research needed:** Pi SDK `createAgentSession()` tool-registration API and streaming event shapes (`message_update`, `tool_execution_start/end`, `session_start/shutdown`). Pi SDK is installed locally (see environment); prefer reading its types over web search.

---

## **4. Scope Delta — What This Session Builds**

### **In scope (tasks below)**
1. Rename `Provider*` → `Harness*` across types, utils, registry, agent config, examples, tests.
2. Introduce `ModelProviderId` + `defaultModelProvider`; update `ModelSpec` and the parser (reject harness-qualified strings; switch provider axis).
3. Swap `AnthropicProvider` → `ClaudeCodeHarness`, add new `PiHarness`, retire `OpenCodeProvider`; rename registry.
4. Add `onStream` to `HarnessHookEvents` and wire in both adapters.
5. Update capabilities reporting, examples, and docs to match §7.

### **Explicitly out of scope**
* Full `ProviderResult<T>` removal — it is already deprecated; leaving the alias is acceptable this session.
* Re-implementing the cascade logic, session store, or `AgentResponse` shape — these are reused from session 003.
* Any change to Sections 1–6, 8+.

---

## **5. Implementation Plan**

**1 Phase · 3 Milestones · 7 Tasks**

### **Phase P1 — Harness / Provider Split Migration**

> **Goal:** Make source match PRD §7 v1.2 — `Harness*` types, orthogonal `ModelProviderId` axis, `PiHarness` default + `ClaudeCodeHarness` parity, `onStream` hook.

#### **Milestone P1.M1 — Type system & model-spec (foundational)**

* **P1.M1.T1 — Rename `Provider*` → `Harness*` in `src/types/providers.ts`**
  * Add `HarnessId = 'pi' | 'claude-code'`.
  * Rename `Provider` → `Harness`, `ProviderCapabilities` → `HarnessCapabilities`, `ProviderOptions` → `HarnessOptions`, `ProviderHookEvents` → `HarnessHookEvents` (+ add `onStream`), `ProviderRequest` → `HarnessRequest`, `GlobalProviderConfig` → `GlobalHarnessConfig`.
  * Keep deprecated type aliases (`ProviderId`, `Provider`, …) re-exporting the new names so downstream callers compile during migration. Remove in a later session.
  * Update `src/types/index.ts` re-exports.

* **P1.M1.T2 — Introduce `ModelProviderId` axis & update model-spec**
  * Add `export type ModelProviderId = 'anthropic' | 'openai' | 'google' | 'zai' | (string & {});`.
  * Change `ModelSpec.provider: ProviderId` → `ModelSpec.provider: ModelProviderId`.
  * Add `defaultModelProvider?: ModelProviderId` to `GlobalHarnessConfig`.
  * Update `parseModelSpec` / `formatModelForProvider` in `src/utils/model-spec.ts`: signature uses `ModelProviderId`; reject harness-qualified prefixes (`pi/`, `cc/`, `claude-code/`) with a clear error.
  * Update `src/utils/provider-config.ts` cascade to carry `defaultModelProvider` through.

#### **Milestone P1.M2 — Harness adapters & registry**

* **P1.M2.T1 — Rename `ProviderRegistry` → `HarnessRegistry`**
  * In `src/providers/provider-registry.ts`: rename class + the global accessor; update `configureProviders` → `configureHarnesses`.
  * Default registration switches to `pi`; `claude-code` registered as the parity fallback.

* **P1.M2.T2 — Convert `AnthropicProvider` → `ClaudeCodeHarness`**
  * Rename class + file (`src/providers/claude-code-harness.ts`); set `id: 'claude-code'`.
  * Reuse existing SDK wiring (session store, hooks, model normalization).
  * Add the **provider constraint**: at `initialize()`/`execute()`, if `ModelSpec.provider !== 'anthropic'`, throw a typed config error.
  * Wire `onStream` from the SDK message stream.

* **P1.M2.T3 — Implement `PiHarness` (new)**
  * New file `src/providers/pi-harness.ts` wrapping `createAgentSession()` from `@earendil-works/pi-coding-agent`.
  * Register Groundswell's tool list via `createAgentSession({ tools })`; route `tool_call` events to `toolExecutor` and return `ToolExecutionResult`.
  * Map Pi events → `HarnessHookEvents`: `message_update` → `onStream`, `tool_execution_start/end` → `onToolStart/End`, `session_start` → `onSessionStart`, `session_shutdown` → `onSessionEnd`.
  * No Pi MCP/LSP plugin (parity via `MCPHandler`).

* **P1.M2.T4 — Retire `OpenCodeProvider`**
  * Remove `src/providers/opencode-provider.ts` and its tests/examples.
  * Delete obsolete OpenCode research references from migration notes (research files themselves may stay for history).

#### **Milestone P1.M3 — Integration, examples, tests, docs**

* **P1.M3.T1 — Update `Agent` + `AgentConfig` / `PromptOverrides`**
  * In `src/core/agent.ts` and `src/types/agent.ts`: rename `provider`/`providerOptions` → `harness`/`harnessOptions`; default to `'pi'`.
  * Update provider-switching / override tests in `src/__tests__/`.

* **P1.M3.T2 — Refresh examples, capabilities reporting, and docs**
  * Rewrite `examples/providers/*` → `examples/harnesses/*` to match §7.13 (default Pi; per-call harness switch; model-only override).
  * Align `HarnessCapabilities` reporting with the §7.4 table.
  * Update `src/index.ts` public exports and the package README's provider/harness section.

---

## **6. Acceptance**

* `npm run build` green; `npm test` green with no skipped harness tests.
* `grep -rE "ProviderId|configureProviders|providerOptions|opencode" src/` returns **only** intentional deprecated aliases (clearly marked) or zero hits.
* `parseModelSpec('pi/anthropic/claude-sonnet-4')` throws; `parseModelSpec('anthropic/claude-sonnet-4')` returns `{ provider: 'anthropic', … }`; `parseModelSpec('claude-sonnet-4')` resolves against `defaultModelProvider`.
* Both `PiHarness` and `ClaudeCodeHarness` satisfy the `Harness` interface and produce identical `AgentResponse<T>` shapes.
* Requesting a non-Anthropic provider on `claude-code` raises a typed config error.
