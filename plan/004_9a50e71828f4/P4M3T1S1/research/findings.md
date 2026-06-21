# Research Findings — P4.M3.T1.S1: Write docs/harnesses.md + update migration guides

**Scope tag:** DOCUMENTATION-ONLY. CREATE 2 doc files + EDIT 2 existing files. Zero source code,
zero tests, zero build config. Consumes the **finalized** public API (P3.M3 complete) + the verified
`external_deps.md`. Produces the authoritative harness reference and deprecates `docs/providers.md`.

---

## 1. The deliverable contract (from item description + PRD §7)

Create `docs/harnesses.md` covering, **in this order, mapped to PRD §7 subsections**:

| harnesses.md section | PRD § | Source of truth for content |
|---|---|---|
| Overview + **Harness ⊥ ModelProvider axes + §7.8 critical rule** | §7 intro, §7.8 | `src/types/harnesses.ts` (HarnessId / ModelProviderId JSDoc) |
| Supported Harnesses table | §7.1 | PRD §7.1 table + `src/harnesses/{pi,claude-code}-harness.ts` SDK imports |
| HarnessId + Harness interface | §7.2, §7.3 | `src/types/harnesses.ts` `Harness` interface (verified verbatim) |
| Capabilities table | §7.4 | PRD §7.4 table; capability VALUES verified from source (§3 below) |
| HarnessOptions | §7.5 | `src/types/harnesses.ts` `HarnessOptions` |
| Global Harness Configuration (`configureHarnesses`) | §7.6 | `src/utils/harness-config.ts` (verified signature + behavior) |
| Configuration Cascade (dual cascade + worked example) | §7.7 | `resolveHarnessConfig()` (verified algorithm) |
| Model & Provider Specification (formats + critical rule + parse/format) | §7.8 | `src/utils/model-spec.ts` (verified) |
| AgentConfig / PromptOverrides | §7.9 | `src/types/agent.ts` harness/harnessOptions/model fields |
| Tool Execution | §7.10 | `src/types/harnesses.ts` ToolExecutionRequest/Result |
| Hook Adaptation | §7.11 | PRD §7.11 mapping table |
| MCP, Skills & LSP Integration | §7.12 | PRD §7.12 + external_deps.md §1.5/§3 |
| Usage Examples | §7.13 | PRD §7.13 examples |
| Feature Parity Requirements | §7.14 | PRD §7.14 (1–6 + non-functional reqs) |
| Harness Registry + `registerDefaultHarnesses` | §7.6 | `src/harnesses/harness-registry.ts`, `register-defaults.ts` |
| Migrating from Provider* (pointer) | — | → `docs/migration-provider-to-harness.md` |

Create `docs/migration-provider-to-harness.md` — the **Provider*→Harness* migration guide**, structured
to mirror `docs/migration-opencode-removal.md` (the closest analog: a vocabulary/type rename + deprecation).

EDIT `docs/providers.md` — insert a deprecation banner immediately after the `# Providers` H1 + tagline,
pointing to `harnesses.md` + the migration guide. **Do not delete the body** (contract: "add banner").

EDIT `README.md` — add the two new docs to the `## Documentation` list (discoverability).

---

## 2. Finalized public API surface (src/index.ts — verified, P3.M3 complete)

These are the ONLY symbols the docs may reference as `import { ... } from 'groundswell'`:

**Harness types:** `Harness, HarnessId, ModelProviderId, HarnessCapabilities, HarnessOptions,
HarnessRequest, HarnessExecutionOptions, HarnessHookEvents, GlobalHarnessConfig, ModelSpec,
ToolExecutionRequest, ToolExecutionResult, StreamEvent`.

**Harness classes/functions:** `PiHarness`, `ClaudeCodeHarness`, `HarnessRegistry`,
`configureHarnesses`, `parseModelSpec`, `formatModelForProvider`, `registerDefaultHarnesses`
(via `groundswell/harnesses` — verify exact subpath in §6 below), `getGlobalHarnessConfig`.

**Deprecated aliases still exported (document as deprecated, do NOT feature):**
`AnthropicProvider` (= `ClaudeCodeHarness`), `ProviderRegistry` (= `HarnessRegistry`), `Provider`,
`ProviderId`, `ProviderOptions`, `ProviderRequest`, `ProviderCapabilities`, `ProviderHookEvents`,
`configureProviders`, `ProviderResult`, etc.

> Cross-check rule: every `from 'groundswell'` import in the new docs MUST appear in `src/index.ts`.
> Run `grep -E "^export"` against src/index.ts to verify before publishing each code sample.

---

## 3. Verified capability VALUES (read directly from source — do NOT paraphrase from memory)

**PiHarness** (`src/harnesses/pi-harness.ts:83-90`): `mcp:true, skills:true, lsp:true,
streaming:true, sessions:true, extendedThinking:true` — AND runs **any** LLM provider (open set).

**ClaudeCodeHarness** (`src/harnesses/claude-code-harness.ts:124-139`): `mcp:true` (via
`createSdkMcpServer`), `skills:true` (system-prompt injection), `lsp:true` (MCP plugins),
`streaming:true`, `sessions:true` (abstraction layer / file resume), `extendedThinking:true`
(maxThinkingTokens) — but **Anthropic-only** (§7.8 constraint).

**The ONE row that differs in the capabilities table is "LLM providers": `any` vs `Anthropic only`.**
Everything else is parity. This is the §7.4 "Parity without Pi plugins" point — Pi's lack of built-in
MCP/LSP is NOT a gap because Groundswell's `MCPHandler` provides both to whichever harness is active
(§7.12).

---

## 4. Verified semantics — the non-obvious facts that MUST be documented correctly

### configureHarnesses (src/utils/harness-config.ts)
- Signature: `configureHarnesses(config: GlobalHarnessConfig): void`.
- Validates `defaultHarness ∈ {'pi','claude-code'}` — throws on anything else (incl. legacy `'anthropic'`).
- Validates `harnessDefaults` keys (must be HarnessIds). **Does NOT validate `defaultModelProvider`**
  (open set — any string, per §7.8).
- Default (never called): `{ defaultHarness: 'pi' }` — **pi is the vendor-neutral default** (§7.1).
- NOTE for migration doc: legacy `configureProviders({ defaultProvider: 'anthropic' })` is a SEPARATE
  singleton and still works (accepts 'anthropic'); do not claim it was hard-removed.

### resolveHarnessConfig — the dual cascade (PRD §7.7), pure function
```
harness  = promptHarness ?? agentHarness ?? globalConfig.defaultHarness   // first-defined wins
options  = { ...globalDefaults[harness], ...agentOptions, ...promptOptions } // last write wins
```
- Harness cascade and model cascade are **independent**. Model resolution (§7.8) is separate:
  a plain model id is resolved against `getGlobalHarnessConfig().defaultModelProvider`
  (defaults `'anthropic'`). Verified in `src/core/agent.ts:661` (`parseModelSpec(effectiveModel,
  defaultModelProvider)`).

### parseModelSpec / formatModelForProvider (src/utils/model-spec.ts)
- `parseModelSpec('anthropic/claude-sonnet-4')` → `{provider:'anthropic', model:'claude-sonnet-4',
  raw:'anthropic/claude-sonnet-4'}`. Plain `'claude-sonnet-4'` → resolved against defaultProvider.
- **§7.8 critical rule (MUST be the headline of the model section):** 3+ segment strings
  (`pi/anthropic/x`, `cc/anthropic/...`) are REJECTED with `"Harness must not appear in model
  string…"`. The harness is NEVER in the model string.
- `formatModelForProvider(spec, target)`: pass-through (returns `spec.model`) if same provider;
  otherwise THROWS `"Cannot translate … Cross-provider model translation is not supported."`
  (MVP — document honestly).

### HarnessRegistry (src/harnesses/harness-registry.ts)
- Singleton: `HarnessRegistry.getInstance()`. `register(h)` throws on duplicate id.
- `get(id)` returns `undefined` (never throws) for missing. `has(id)`, `initializeAll(config)`,
  `terminateAll()`.
- `registerDefaultHarnesses(registry?)` (src/harnesses/register-defaults.ts): idempotent bootstrap
  registering `ClaudeCodeHarness` ('claude-code') + `PiHarness` ('pi'). Exported under
  `groundswell/harnesses` subpath — **verify the exact public subpath before documenting it**
  (check src/index.ts + package.json `exports`; if not publicly exported, document the
  `HarnessRegistry.getInstance().register(new PiHarness())` equivalent instead).

### Tool execution parity (§7.10 / §7.12)
- Tools execute locally via `MCPHandler` for BOTH harnesses; the harness only reports tool calls back
  via `toolExecutor`. Claude Code's built-in MCP is bypassed in favor of `MCPHandler` so behavior is
  identical. **Pi needs no plugin** (§7.4 footnote).

---

## 5. Existing doc landscape (what exists + what each becomes)

| File | Lines | Disposition in this task |
|---|---|---|
| `docs/providers.md` | ~3524 (1581 shown) | **EDIT** — add deprecation banner after H1. Body kept (contract: "add banner"). |
| `docs/migration-guide-agent-response.md` | 340 | **UNTOUCHED** — documents `AgentResponse<T>` (steady-state, shared by both harnesses, §7.14.4). harnesses.md LINKS to it. |
| `docs/migration-opencode-removal.md` | 257 | **UNTOUCHED** — OpenCode removal (P4.M1, complete). Reference its structure for the new migration guide. |
| `README.md` | — | **EDIT** — add 2 doc links to `## Documentation`. (Stale "Anthropic SDK" agent prose is P4.M3.T2 territory — do NOT rewrite it here.) |

### Doc voice/conventions to mirror (from README + existing docs)
- H1 title + one-line tagline. `## Table of Contents` with anchor links (providers.md has one — replicate).
- Code-first: every concept introduced with a ```ts fenced block.
- GitHub-flavored blockquote callouts: `> [!IMPORTANT]` / `> [!NOTE]` (README uses `> [!IMPORTANT]`).
- Tables for capability/mapping comparisons (providers.md §"Supported Providers", PRD §7.4/§7.11).
- Version tags: existing migration docs use `**Version:**` / `**Status:**` headers. The harness split
  ships at **package version 0.0.4** (verified package.json) under **PRD v1.2**. Use "Since v0.0.4
  (PRD v1.2)".

### providers.md banner placement (verified head of file)
```
# Providers

Groundswell supports the Anthropic Agent SDK provider through a unified abstraction layer…
```
→ Insert the deprecation blockquote AFTER the tagline paragraph, BEFORE `## Table of Contents`.

---

## 6. The Provider*→Harness* mechanical rename table (for the migration guide)

Lifted from `consumer-analysis.md` §"Seam 5 — Type rename surface" (verified against src):

| v1.x (Provider*) — deprecated | v0.0.4+ (Harness*) |
|---|---|
| `AnthropicProvider` | `ClaudeCodeHarness` (alias retained, deprecated) |
| `ProviderRegistry` | `HarnessRegistry` (alias retained, deprecated) |
| `configureProviders()` | `configureHarnesses()` (alias retained, deprecated) |
| `Provider` (interface) | `Harness` |
| `ProviderId` | `HarnessId` ('pi'\|'claude-code') + `ModelProviderId` (open set) |
| `ProviderRequest` | `HarnessRequest` |
| `ProviderOptions` | `HarnessOptions` |
| `ProviderCapabilities` | `HarnessCapabilities` |
| `ProviderHookEvents` | `HarnessHookEvents` |
| `ProviderResult<T>` | `AgentResponse<T>` |
| `AgentConfig.provider` | `AgentConfig.harness` |
| `AgentConfig.providerOptions` | `AgentConfig.harnessOptions` |
| `PromptOverrides.provider` | `PromptOverrides.harness` |
| model `'openai/gpt-4'` via OpenCode | `model: 'openai/gpt-4o'` via **Pi harness** (default) |

Key migration nuance: the legacy aliases are **retained and deprecated, not removed** (src/index.ts
still exports `AnthropicProvider`, `ProviderRegistry`, `configureProviders`). So the migration is
non-breaking — existing code keeps working with deprecation. Document this honestly (contrast with
the OpenCode removal, which WAS a hard removal).

---

## 7. Validation tooling available (verified)

- `markdownlint` library IS installed in node_modules (but NOT necessarily the CLI). Use
  `npx markdownlint-cli2 'docs/**/*.md'` if it resolves; otherwise the deterministic gate is the
  **fence-balance + symbol cross-check** script (see PRP Validation Loop Level 1).
- `npm run lint` = `tsc --noEmit` (type-checks src). Docs are NOT compiled by it — so a doc typo in
  a code block will NOT fail the build. The PRP therefore mandates a **symbol cross-check**: every
  `from 'groundswell'` import in the new docs must exist in `src/index.ts`.
- No test touches docs. `npm test` will be unaffected — run it only to prove zero collateral damage
  (it won't be, since no src/ file changes).

## 7b. CRITICAL — public-vs-internal API boundary (verified 2026-06-20)

`package.json` `exports` maps ONLY `"."` → `dist/index.js`. There is **no `"./harnesses"`
subpath**. Consequence for what the docs may feature as `import { X } from 'groundswell'`:

| Symbol | In top-level `src/index.ts`? | Public via `from 'groundswell'`? | Doc treatment |
|---|---|---|---|
| `configureHarnesses` | ✅ yes | ✅ yes | **Primary public config API — feature it.** |
| `PiHarness`, `ClaudeCodeHarness`, `HarnessRegistry` | ✅ yes | ✅ yes | Feature (construct + register). |
| `parseModelSpec`, `formatModelForProvider` | ✅ yes | ✅ yes | Feature. |
| All harness TYPES (`Harness`, `HarnessId`, `ModelSpec`, …) | ✅ yes | ✅ yes | Feature. |
| `getGlobalHarnessConfig` | ❌ NO (only in utils) | ❌ no | **Internal** — describe the cascade conceptually; do NOT show importing it. |
| `resolveHarnessConfig` | ❌ NO (only in utils) | ❌ no | **Internal** — describe algorithm; do NOT show importing it. |
| `registerDefaultHarnesses` | ❌ NO (only `src/harnesses/index.ts`) | ❌ no subpath export | **Do NOT feature as `from 'groundswell/harnesses'`** — it will not resolve via the `exports` map. Document the equivalent explicit `registry.register(new PiHarness())` + `new ClaudeCodeHarness()` calls instead, and at most mention `registerDefaultHarnesses` exists as an internal convenience WITHOUT a resolvable import path (or omit entirely). |

> **Net rule for the doc author:** every `import { … } from 'groundswell'` in the new docs must be
> cross-checked against `src/index.ts` (grep `^export`). Anything only in `src/harnesses/index.ts` or
> `src/utils/*` that is NOT re-exported at the top level must NOT appear as a public import — describe
> it in prose only.

---

## 8. Scope boundaries (do NOT cross — parallel/owned work)

- **`examples/providers/*` is owned by P4.M3.T2.S1** ("Migrate examples to harness vocabulary"). Do
  NOT edit any example file, its README, or any `package.json` `start:provider-*` script. The new
  docs may *reference* upcoming harness examples by name but must not create them.
- **`docs/providers.md` body stays.** Only the banner is added. Rewriting/deleting its ~3500 lines is
  out of scope (consumer-analysis §7: "the single largest documentation rewrite"; the banner deprecates
  it pending a future full removal).
- **No `src/` edits, no `PRD.md`, no `tasks.json`, no `prd_snapshot.md`.**
- Do NOT document `OpenCodeProvider` as supported — it was removed in P4.M1.
