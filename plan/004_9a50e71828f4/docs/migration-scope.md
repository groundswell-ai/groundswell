# Provider → Harness Migration Scope (PRD v1.2)

**Codebase:** `/home/dustin/projects/groundswell`
**Scope baseline:** 60 src files (non-test), 99 test files under `src/__tests__`, 24 example files.
**Context:** PRD v1.2 introduces a Harness/Provider split (`Harness`, `HarnessId = 'pi' | 'claude-code'`, `ModelProviderId` separate from harness). The current TypeScript source uses `Provider*` naming throughout and contains **zero** references to `Harness`, `pi`, `ModelProviderId`, or `configureHarnesses` (per `grep -rni` of `src/`). Per PRD line 8: *"The current `Provider*` types in source map to the new `Harness*` types; code migration to match this spec is a tracked follow-up."* This document inventories that follow-up.

---

## 1. Token Inventory (exhaustive grep across `src/`, INCLUDES `src/__tests__`)

Counts produced by `grep -rn <token> src/`. "Src-only" splits exclude `__tests__/`. All occurrences are case-sensitive unless noted.

| Token | Files | Occurrences | Src-only (files / occ) | Test-only (files / occ) | Representative Sample |
|---|---|---|---|---|---|
| `ProviderId` | 23 | 124 | 10 / 59 | 13 / 65 | `types/providers.ts:9: export type ProviderId = "anthropic" \| "opencode";` |
| `Provider` (interface/type, word-boundary `\bProvider\b`) | 32 | 221 | — | — | `types/providers.ts:645: export interface Provider {` |
| `Provider` (substring, any context) | 46 | 2210 | 12 / 476 | 34 / 1734 | `core/agent.ts:91: private readonly provider: Provider;` |
| `ProviderOptions` | 18 | 90 | 7 / 28 | 11 / 62 | `types/providers.ts:34: export interface ProviderOptions {` |
| `ProviderCapabilities` | 14 | 55 | 4 / 17 | 10 / 38 | `types/providers.ts:15: export interface ProviderCapabilities {` |
| `ProviderRequest` | 16 | 137 | 4 / 18 | 12 / 119 | `types/providers.ts:223: export interface ProviderRequest {` |
| `ProviderExecutionOptions` | 3 | 4 | 2 / 3 | 0 / 0 | `types/providers.ts:199: export interface ProviderExecutionOptions {` |
| `ProviderHookEvents` | 11 | 85 | 4 / 20 | 7 / 65 | `types/providers.ts:174: export interface ProviderHookEvents {` |
| `ProviderRegistry` | 30 | 417 | 6 / 43 | 24 / 374 | `providers/provider-registry.ts:111: export class ProviderRegistry {` |
| `ProviderResult` | 4 | 37 | 2 / 8 | 2 / 29 | `types/providers.ts:502: export interface ProviderResult<T = unknown> {` |
| `ProviderResponseStatus` | 4 | 18 | 1 / 5 | 2 / 13 | `types/providers.ts:303: export type ProviderResponseStatus = "success" \| "error" \| "partial";` |
| `ProviderErrorDetails` | 4 | 19 | 1 / 4 | 2 / 15 | `types/providers.ts:342: export interface ProviderErrorDetails {` |
| `ProviderResponseMetadata` | 4 | 24 | 1 / 5 | 2 / 19 | `types/providers.ts:405: export interface ProviderResponseMetadata {` |
| `GlobalProviderConfig` | 9 | 71 | 5 / 26 | 3 / 45 | `types/providers.ts:556: export interface GlobalProviderConfig {` |
| `configureProviders` | 8 | 47 | 2 / 9 | 4 / 38 | `utils/provider-config.ts:159: export function configureProviders(config: GlobalProviderConfig): void;` |
| `getGlobalProviderConfig` | 4 | 31 | 2 / 9 | 2 / 22 | `utils/provider-config.ts:228: export function getGlobalProviderConfig(): GlobalProviderConfig` |
| `resolveProviderConfig` | 4 | 37 | 2 / 6 | 2 / 31 | `utils/provider-config.ts:338: export function resolveProviderConfig(...)` |
| `opencode` (case-insensitive) | 27 | 851 | 7 / 61 | 19 / 564 | `types/providers.ts:9: ProviderId = "anthropic" \| "opencode"` |
| `OpenCode` (PascalCase identifier) | subset of above | — | — | — | `providers/opencode-provider.ts:93: export class OpenCodeProvider implements Provider` |
| `AnthropicProvider` | 29 | 164 | 5 / 22 | 24 / 142 | `providers/anthropic-provider.ts:63: export class AnthropicProvider implements Provider` |
| `OpenCodeProvider` | 11 | 107 | 2 / 16 | 9 / 91 | `providers/opencode-provider.ts:93: export class OpenCodeProvider` |
| `normalizeModel` | 18 | 124 | 4 / 12 | 14 / 112 | `types/providers.ts:817: normalizeModel(model: string): ModelSpec;` |
| `parseModelSpec` | 9 | 65 | 5 / 17 | 3 / 48 | `utils/model-spec.ts:104: export function parseModelSpec(...)` |
| `formatModelForProvider` | 3 | 15 | 2 / 8 | 1 / 7 | `utils/model-spec.ts:236: export function formatModelForProvider(spec, targetProvider)` |
| `ModelSpec` | 22 | 160 | 8 / 41 | 14 / 119 | `types/providers.ts:249: export interface ModelSpec {` |
| `providerOptions` (field/var) | 8 | 54 | 3 / 9 | 5 / 45 | `core/agent.ts:88: private readonly providerOptions?: ProviderOptions;` |
| `config.provider` | 6 | 24 | 2 / 2 | 4 / 22 | `core/agent.ts:105: this.providerId = config.provider;` |
| `overrides?.provider` | 1 | 4 | 1 / 4 | 0 / 0 | `core/agent.ts:352 & 582: const promptProvider = overrides?.provider;` |

**Totals across all listed tokens:** ~4,800 occurrences in **~46 distinct files** (heavily concentrated in tests).

---

## 2. Every File Under `src/providers/`

| File | Lines | Responsibility |
|---|---|---|
| `src/providers/anthropic-provider.ts` | 1254 | Primary `Provider` implementation wrapping the Anthropic Agent SDK. Carries capabilities (mcp=true, lsp=true, streaming=true, sessions=true, extendedThinking=true, skills=true), `initialize()`, `terminate()`, `execute()` (streaming + non-streaming), `registerMCPs()`, `loadSkills()`, `normalizeModel()`, `buildAgentSDKHooks()`. Session-store integration. **Maps to `PiHarness` (or `ClaudeCodeHarness`) post-migration.** |
| `src/providers/opencode-provider.ts` | 1039 | `Provider` implementation wrapping `@opencode-ai/sdk`. **`@deprecated Since v1.5.0. Will be removed in v2.0.0.`** (JSDoc line 4). LLM-only mode (no tools/MCP/LSP). Emits a one-time `console.warn` deprecation notice in `initialize()` (guarded by `OpenCodeProvider.deprecationWarningShown` static flag, line 194/216). 75+-provider multi-model gateway. **No PRD-v1.2 successor — slated for deletion, not rename.** |
| `src/providers/provider-registry.ts` | 607 | Singleton `ProviderRegistry` (`getInstance()`) keyed by `ProviderId`. Manages registration, `initializeProvider()` with promise caching, `terminateProvider()`, `initializeAll()`, `terminateAll()`, status queries (`getStatus`, `isReady`, `getAllStatuses`), `_resetForTesting()`. Also exports `InitializationStatus` enum. **Maps to `HarnessRegistry` per PRD §7.6.** |
| `src/providers/session-store.ts` | 410 | `SessionStore` interface + `MemorySessionStore`, `FileSessionStore` impls, `RedisSessionStore` type stub. Imports only `SessionState` from `types/providers.js` (minimal provider coupling). **Likely survives migration with no rename** (sessions are harness-level, not provider-specific in PRD). |
| `src/providers/index.ts` | 18 | Barrel. Re-exports `ProviderRegistry`, `InitializationStatus`, `MemorySessionStore`, `FileSessionStore`, `SessionStore`, `RedisSessionStore`. |

---

## 3. Test Files Referencing `provider` / `opencode` / `Provider` (38 files)

Grouped by directory. All paths under `src/__tests__/`.

### `src/__tests__/integration/` (2 files)
- `provider-agent.test.ts` — Agent → Provider → SDK integration flow (P5.M2.T1.S1)
- `provider-switching.test.ts` — Runtime provider override cascade (global → agent → prompt); extensively uses `'opencode'` ProviderId

### `src/__tests__/unit/` (7 files at top level)
- `agent.test.ts` — Agent class; uses `Provider`, `ProviderId`, `ProviderCapabilities`, `ProviderRegistry`
- `agent-error-codes.test.ts`
- `agent-prompt-provider-override.test.ts` — Prompt-level provider override
- `agent-stream-provider-override.test.ts` — Stream-level provider override
- `agent-tool-executor.test.ts`
- `provider-interface.test.ts` — Interface conformance suite (1100+ lines, 17 mock provider classes)
- `provider-result-types.test.ts` — Validates `ProviderResult`, `ModelSpec`, `GlobalProviderConfig` types
- `workflow-validation.test.ts` — Imports `ProviderRegistry`, `Provider`, `ProviderId`, `ProviderCapabilities`, `ProviderRequest`, `ModelSpec`

### `src/__tests__/unit/providers/` (18 files)
**Anthropic side (12):**
- `anthropic-provider.test.ts` — class structure & capabilities
- `anthropic-provider-execute.test.ts`
- `anthropic-provider-hooks.test.ts`
- `anthropic-provider-initialize.test.ts`
- `anthropic-provider-loadskills.test.ts`
- `anthropic-provider-normalizemodel.test.ts`
- `anthropic-provider-registermcps.test.ts`
- `anthropic-provider-sessionconfig.test.ts`
- `anthropic-provider-sessions.test.ts`
- `anthropic-provider-sessionstore.test.ts`
- `anthropic-provider-supports.test.ts`
- `anthropic-provider-terminate.test.ts`

**OpenCode side (9, all marked DEPRECATED in headers):**
- `opencode-provider-deprecation.test.ts`
- `opencode-provider-execute.test.ts`
- `opencode-provider-hooks.test.ts`
- `opencode-provider-initialize.test.ts`
- `opencode-provider-loadskills.test.ts`
- `opencode-provider-normalizemodel.test.ts`
- `opencode-provider-registermcps.test.ts`
- `opencode-provider-supports.test.ts`
- `opencode-provider-terminate.test.ts`

**Shared infrastructure (4):**
- `provider-lifecycle.test.ts`
- `provider-registry.test.ts`
- `session-store.test.ts`
- `session-store-ttl.test.ts`

### `src/__tests__/unit/utils/` (4 files)
- `model-spec.test.ts` — `parseModelSpec`, `formatModelForProvider`
- `provider-config.test.ts` — `configureProviders`, `getGlobalProviderConfig`, `resolveProviderConfig`
- `session-serialization.test.ts`
- `agent-validation.test.ts`

**Note:** `src/__tests__/compatibility/backward-compatibility.test.ts` contains **zero** provider/opencode references (verified — migration does not affect backward-compat suite).

---

## 4. Provider-Related Fields in `src/types/agent.ts`

File: `src/types/agent.ts` (466 lines).

### `AgentConfig` interface (lines 18-169)
Provider-related fields:
- **`provider?: ProviderId;`** (line 127) — Agent-level provider override. Cascades below prompt override, above global default.
- **`providerOptions?: ProviderOptions;`** (line 167) — Agent-level provider options (merged with global `providerDefaults[provider]`).
- (Field `model?: string;` line 53 — supports qualified `anthropic/...` or `opencode/...` format via `parseModelSpec`.)

### `PromptOverrides` interface (lines 178-257)
Provider-related fields:
- **`provider?: ProviderId;`** (line 228) — Highest-priority provider override per prompt.
- **`providerOptions?: ProviderOptions;`** (line 253) — Highest-priority provider options per prompt.

Both interfaces import: `import type { ProviderId, ProviderOptions } from './providers.js';` (line 7). JSDoc on both `provider` fields explicitly references the cascade order Prompt → Agent → Global (PRD §7.7) and the `'opencode'` literal as a valid example.

**Migration implication:** These four fields become harness-named equivalents (`harness?: HarnessId`, `harnessOptions?: HarnessOptions`) — and the `provider` semantics split: PRD v1.2 makes `provider/model` a separate `ModelProviderId` concept that no longer lives on Agent/Prompt config the same way. Per PRD §7.8 *"The harness never appears in the model string"* — so qualified model format changes too.

---

## 5. Public API Exports Containing `Provider` or `opencode`

From `src/index.ts` (lines 30-48 — `// Provider types` block) and the class-export block (lines 117-118):

### Type exports (re-exported from `./types/index.js`)
| Line | Symbol |
|---|---|
| 33 | `Provider` |
| 34 | `ProviderId` |
| 35 | `ProviderCapabilities` |
| 36 | `ProviderOptions` |
| 37 | `ProviderExecutionOptions` |
| 38 | `ProviderRequest` |
| 39 | `ProviderHookEvents` |
| 41 | `ModelSpec` |
| 43 | `ToolExecutor` (provider-adjacent) |
| 44 | `ProviderResult` |
| 45 | `ProviderResponseStatus` |
| 46 | `ProviderErrorDetails` |
| 47 | `ProviderResponseMetadata` |
| 48 | `GlobalProviderConfig` |

### Class exports
| Line | Symbol | Source |
|---|---|---|
| 117 | `AnthropicProvider` | `./providers/anthropic-provider.js` |
| 118 | `ProviderRegistry` | `./providers/provider-registry.js` |

### Symbols with `opencode` in their identifier
- **None at the `src/index.ts` export level.** `OpenCodeProvider` is **deliberately NOT re-exported** from `src/index.ts` (consistent with its deprecation). It is only reachable via deep import `./providers/opencode-provider.js`.
- The literal string `'opencode'` appears throughout `ProviderId` types and in `utils/model-spec.ts` / `utils/provider-config.ts` as a valid enum member.

### Adjacent (not exported from `src/index.ts` but exposed via `src/utils/index.ts`)
- `configureProviders` (line 3)
- `parseModelSpec`, `formatModelForProvider` (line 7)

> **Note:** `src/index.ts` does **not** re-export `configureProviders`, `getGlobalProviderConfig`, `resolveProviderConfig`, `parseModelSpec`, or `formatModelForProvider`. These are exported only from `src/utils/index.ts` (internal). If the public API is meant to include them, that's a separate gap.

---

## 6. OpenCodeProvider — Location & Deprecation Status

- **File:** `src/providers/opencode-provider.ts` (1039 lines, 36 KB).
- **Class declaration:** line 93 — `export class OpenCodeProvider implements Provider {`.
- **`id` literal:** line 99 — `readonly id: ProviderId = "opencode";`.
- **Deprecated: YES.**
  - JSDoc on the file/class (lines 2-8):
    ```
    * OpenCode provider implementation (LLM-Only Mode)
    *
    * @deprecated Since v1.5.0. Will be removed in v2.0.0.
    * Use AnthropicProvider for full feature support.
    *
    * @see AnthropicProvider
    * @see {@link https://groundswell.dev/docs/migration-opencode-removal | Migration Guide}
    ```
  - Runtime deprecation gate at lines 216-231: emits `console.warn` once on first `initialize()` call, guarded by private static `OpenCodeProvider.deprecationWarningShown` (declared line 194).
  - Dedicated test suite `src/__tests__/unit/providers/opencode-provider-deprecation.test.ts` asserts the warning fires exactly once.
- **Not re-exported from `src/index.ts`** (deep-import only).
- **Docs:** `docs/migration-opencode-removal.md` exists as the published migration guide.

**Migration implication for PRD v1.2:** OpenCodeProvider is on a pre-existing deletion track (v2.0.0). The Harness refactor does not need to produce a `PiHarness`-equivalent for it. Plan should treat OpenCodeProvider + its 9 test files + the literal `'opencode'` member of `ProviderId` + `docs/migration-opencode-removal.md` as **deletion items**, not renames.

---

## 7. Architecture: How the Pieces Connect

```
                 src/types/providers.ts  ←──────── SINGLE SOURCE OF TRUTH for all Provider* types
                         │
        ┌────────────────┼────────────────────────────────┐
        ▼                ▼                                 ▼
  src/types/agent.ts   src/types/index.ts            src/index.ts
  (AgentConfig,        (re-exports all               (PUBLIC API:
   PromptOverrides      Provider* types)              types + AnthropicProvider +
   use ProviderId,                                  ProviderRegistry)
   ProviderOptions)
        │
        ▼
  src/core/agent.ts  ──── THE CENTRAL CONSUMER ─────────────────┐
   • imports Provider, ProviderId, ProviderOptions,              │
     ProviderRequest, ProviderHookEvents from types/providers.js │
   • imports ProviderRegistry from providers/index.js            │
   • imports resolveProviderConfig, getGlobalProviderConfig      │
     from utils/provider-config.js                               │
   • private fields: providerId, providerOptions, provider       │
   • cascade resolution in constructor, prompt(), stream()       │
   • builds ProviderRequest, converts hooks→ProviderHookEvents   │
        │                                                        │
        ▼                                                        ▼
  src/utils/provider-config.ts        src/providers/provider-registry.ts
   • configureProviders()              • singleton ProviderRegistry
   • getGlobalProviderConfig()         • keyed by ProviderId
   • resolveProviderConfig()           • initialize/terminate lifecycle
   • isValidProviderId()               • imports GlobalProviderConfig,
   • DEFAULT_CONFIG                        ProviderId, ProviderOptions,
     (defaultProvider:'anthropic')         Provider from types/providers.ts
                                                      │
                                  ┌───────────────────┴────────────────────┐
                                  ▼                                         ▼
                  src/providers/anthropic-provider.ts        src/providers/opencode-provider.ts
                  (primary; id='anthropic')                  (deprecated v1.5.0; id='opencode')
                                  │
                                  ▼
                  src/utils/model-spec.ts
                   • parseModelSpec()
                   • formatModelForProvider()
                   • isValidProviderId()  ← DUPLICATE of provider-config.ts version
```

**Key data flow:** User → `Agent` ctor (resolves cascade via `resolveProviderConfig`) → `ProviderRegistry.get(providerId)` → `provider.execute(ProviderRequest)` → `AgentResponse<T>` returned to caller. Same flow duplicated for `Agent.stream()`.

---

## 8. Other Findings / Risks

1. **Duplicated validation logic.** `isValidProviderId()` is defined **twice** with identical bodies: `src/utils/model-spec.ts:30` and `src/utils/provider-config.ts:106`. Both hard-code the `'anthropic' | 'opencode'` literal. Migration must consolidate.

2. **Hard-coded enum strings everywhere.** Beyond the type union, the literal `'opencode'` appears in error messages, examples, and tests (~564 occurrences in tests alone). A naive rename will miss message strings.

3. **`provider-registry.ts` also exports `InitializationStatus`** (enum) and `_resetForTesting()` — both must carry over to `HarnessRegistry`.

4. **`src/providers/index.ts` barrel** also exports `SessionStore` family from `session-store.ts`. Migration of the registry must preserve session-store exports.

5. **Tests dominate the change surface.** Of ~4,800 token occurrences, ~3,900 are in `src/__tests__/`. The `provider-interface.test.ts` file alone (1100+ lines) declares 17 inline mock provider classes that all `implements Provider` — every signature will need updating.

6. **Adjacent non-src scope (NOT in this report's grep totals, but relevant):**
   - `examples/providers/` — 6 example `.ts` files + README (basic-usage, configuration, switching, multi-provider, sessions, with-mcp-skills).
   - `examples/index.ts`, `examples/README.md` — reference providers.
   - `docs/providers.md`, `docs/migration-opencode-removal.md`.
   - `CHANGELOG.md` references.
   - `dist/` (built artifacts — will be regenerated).
   These are **out of `src/`** but downstream of any public-API rename.

7. **PRD v1.2 splits the concept of "provider."** Under the new model, what the codebase currently calls `Provider` becomes `Harness` (runtime: `pi` / `claude-code`), while the LLM-vendor concept moves to a separate `ModelProviderId` (Anthropic, OpenAI, Z.ai, …) per PRD §7.4–7.5. The current `ProviderId = "anthropic" | "opencode"` conflates these two concerns: `"anthropic"` is really a model-provider, while `"opencode"` was a runtime. **A direct 1:1 rename (`Provider*` → `Harness*`) is mechanically possible but semantically incomplete** — the migration plan should decide whether `ModelProviderId` is introduced in the same pass.

8. **No `Harness`, `pi`, `ModelProviderId`, `configureHarnesses`, `HarnessId` references exist in `src/` today** (verified). The migration starts from a clean slate on the new vocabulary.

---

## 9. Start Here

**`src/types/providers.ts`** — this single file defines every `Provider*` type listed in §1 (`Provider`, `ProviderId`, `ProviderCapabilities`, `ProviderOptions`, `ProviderExecutionOptions`, `ProviderRequest`, `ProviderHookEvents`, `ProviderResult`, `ProviderResponseStatus`, `ProviderErrorDetails`, `ProviderResponseMetadata`, `GlobalProviderConfig`, `ModelSpec`). PRD §7.2–7.6 gives the 1:1 target shapes (`HarnessId`, `Harness`, `HarnessCapabilities`, `HarnessOptions`, `HarnessRequest`, `HarnessHookEvents`, `GlobalHarnessConfig`, etc.). Renaming here + updating `src/types/index.ts` re-exports cascades type errors that map the rest of the migration.

**Secondary entry point:** `src/core/agent.ts` — the only runtime consumer of the full provider cascade; lines 84-130 (constructor) and 340-470 / 580-770 (prompt/stream resolution) are the canonical examples of how `ProviderRequest` is built and `ProviderRegistry` is consulted.

---

## 10. Quick-Reference: Files Requiring Source Edits (non-test)

Twelve files (verified via `grep -rl Provider src/ --exclude-dir=__tests__`):

1. `src/index.ts` — public API exports
2. `src/types/index.ts` — type barrel
3. `src/types/providers.ts` — type definitions (primary)
4. `src/types/agent.ts` — `AgentConfig.provider`, `AgentConfig.providerOptions`, `PromptOverrides.provider`, `PromptOverrides.providerOptions`
5. `src/core/agent.ts` — runtime consumer (largest non-test edit)
6. `src/providers/index.ts` — class barrel
7. `src/providers/provider-registry.ts` — registry singleton
8. `src/providers/anthropic-provider.ts` — primary adapter → `PiHarness`/`ClaudeCodeHarness`
9. `src/providers/opencode-provider.ts` — **delete, do not rename** (deprecated)
10. `src/providers/session-store.ts` — minimal (`SessionState` import only); likely survives unchanged
11. `src/utils/provider-config.ts` — `configureProviders`, `getGlobalProviderConfig`, `resolveProviderConfig`, `isValidProviderId`
12. `src/utils/model-spec.ts` — `parseModelSpec`, `formatModelForProvider`, `isValidProviderId` (duplicate)
13. `src/utils/index.ts` — utility barrel (`configureProviders`, `parseModelSpec`, `formatModelForProvider`)

Plus **38 test files** under `src/__tests__/` (listed in §3) and **adjacent docs/examples** (out of `src/` scope).
