# PRP — P3.M1.T1.S1: Agent constructor — harness field + cascade + `HarnessRegistry.get`

**PRD reference:** §7.3 (Harness interface), §7.6 (`GlobalHarnessConfig` / `configureHarnesses`),
§7.7 (Configuration Cascade), §7.9 (`AgentConfig.harness` / `harnessOptions`). **Plan:**
`plan/004_9a50e71828f4/` — S1 of P3.M1.T1 ("Agent constructor harness resolution"). **Consumes**
`HarnessRegistry` (P1.M2.T1.S2 — `src/harnesses/harness-registry.ts`, singleton keyed by id,
`getInstance()`/`get(id)`/`register()`/`_resetForTesting()`), `resolveHarnessConfig` +
`getGlobalHarnessConfig` (P1.M2.T2.S1 — `src/utils/harness-config.ts`; **reached via the
`resolveProviderConfig`/`getGlobalProviderConfig` legacy wrappers which delegate to them**), and
`AgentConfig.harness/harnessOptions` (P3.M2.T1.S1 — **"Planned"; S1 adds these two optional fields
conditionally**, see Decision 5). **Unblocks** executePrompt/stream/cache rewire (P3.M1.T2.S1–S3).
**Scope tag:** (a) RENAME the three Agent private fields `providerId`→`harnessId?: HarnessId`,
`providerOptions`→`harnessOptions?: HarnessOptions`, `provider`→`harness: Harness`; (b) REWIRE the
constructor to resolve the effective harness via the cascade and fetch it from `HarnessRegistry`
(throw if missing), holding a `Harness` instance; (c) MINIMAL mechanical rename of the field
references + `ProviderRegistry` identifier inside `stream()`/`executePrompt()` so the file compiles
(**no logic change** — the full cascade-fn swap is T2); (d) conditionally ADD `harness`/`harnessOptions`
to `AgentConfig`; (e) UPDATE `src/__tests__/unit/agent.test.ts` to harness vocabulary + new
harness-resolution tests. **MCPHandler init + `config.mcps` registration loop are UNCHANGED.**

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** The contract literally names
> `resolveHarnessConfig` / `getGlobalHarnessConfig`, but the chosen implementation routes the
> global-config read through the **legacy `resolveProviderConfig` / `getGlobalProviderConfig`
> wrappers** (which are documented to delegate to `resolveHarnessConfig`). This bridge keeps the
> entire existing test suite GREEN (6–7 test files configure via `configureProviders` and would
> break under the literal `getGlobalHarnessConfig` default of `'pi'`). T2 (P3.M1.T2) — which already
> owns `executePrompt`/`stream` and their tests — migrates agent.ts wholesale to
> `configureHarnesses` / `getGlobalHarnessConfig` / direct `resolveHarnessConfig`. **Do not** do
> that migration here; it expands scope and risks a red suite.

---

## Goal

**Feature Goal:** Make the `Agent` constructor resolve and **hold a `Harness` instance** (instead of
a `Provider`): read `AgentConfig.harness`/`harnessOptions` (with a legacy `provider`/`providerOptions`
fallback), run the PRD §7.7 cascade, fetch the harness from `HarnessRegistry`, and throw if the
resolved harness is not registered. After S1 the Agent is harness-vocabulary internally (`this.harness`,
`this.harnessId`, `this.harnessOptions`) while remaining a drop-in for every existing caller and test.

**Deliverable:**
1. **MODIFY `src/core/agent.ts`** — rename the 3 private fields; rewire the constructor
   (cascade → `HarnessRegistry.get` → throw → `this.harness`); mechanically rename the field
   references + `ProviderRegistry`→`HarnessRegistry` identifier in `stream()` + `executePrompt()`
   (compile-only, no logic change); update imports.
2. **MODIFY `src/types/agent.ts`** — add `harness?: HarnessId` + `harnessOptions?: HarnessOptions`
   to `AgentConfig` (CONDITIONAL — only if a pre-flight grep shows they are absent; P3.M2.T1.S1 may
   have added them first).
3. **MODIFY `src/__tests__/unit/agent.test.ts`** — modernize the mock helper to harness vocabulary,
   register stub harnesses via `HarnessRegistry`, add a `describe('Agent harness resolution')` block
   (explicit harness, legacy-provider fallback, global default, throw-on-unregistered), keep the
   existing assertions green.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit` on `src/`, **excludes `src/__tests__`**) exits 0 — the renamed
   fields, the `Harness`/`HarnessId`/`HarnessOptions` imports, the `HarnessRegistry` import, the
   `registry.get(...) as Harness | undefined` cast, the `AgentConfig.harness` field, and the
   `stream`/`executePrompt` field-reference renames all type-check.
2. `npm test` (`vitest run`) exits 0 — the updated `agent.test.ts` passes AND **the entire existing
   suite stays green** (the bridge preserves legacy resolution behaviour, so
   `agent-tool-executor`, `agent-prompt-provider-override`, `agent-stream-provider-override`,
   `provider-agent`, `provider-switching`, `workflow-validation` need **zero** changes).
3. `npm run build` (`tsc`) exits 0 — `dist/core/agent.js` + `dist/types/agent.js` emit reflect the
   renamed fields.
4. Runtime spot-check (vitest): `new Agent({ harness: 'pi' })` with a `'pi'` stub registered resolves
   `this.harness` without throwing; `new Agent({ provider: 'anthropic' })` (legacy fallback) resolves
   the `'anthropic'` stub; `new Agent({ harness: 'claude-code' })` with no `'claude-code'` stub
   **throws** `/Harness 'claude-code' is not registered/`.
5. Contract (grep): `this.harness\b`, `this.harnessId`, `this.harnessOptions`, `HarnessRegistry`,
   `config.harness` present in `agent.ts`; `this.provider\b` / `this.providerId` /
   `this.providerOptions` / `ProviderRegistry` **absent** from `agent.ts`.

---

## ⚠️ SCOPE DECISIONS — the load-bearing details

### Decision 1 — Use the LEGACY config wrappers as a global-config bridge (NOT `getGlobalHarnessConfig`)

The contract names `resolveHarnessConfig(global, this.harnessId, this.harnessOptions)`.
`src/utils/harness-config.ts` **documents and implements that `resolveProviderConfig` delegates to
`resolveHarnessConfig`** (L23, L166-167, L341-343, L367-368):

```ts
// harness-config.ts (inside resolveProviderConfig, L367-368)
const { harness, options } = resolveHarnessConfig(harnessGlobal, agentProvider, agentOptions, promptProvider, promptOptions);
```

So calling `resolveProviderConfig(getGlobalProviderConfig(), this.harnessId, this.harnessOptions)`
**invokes the canonical harness cascade** (`resolveHarnessConfig`). The only difference from the
literal contract is the *global-config source*: the **legacy singleton** (`getGlobalProviderConfig`,
default `'anthropic'`, mutated by `configureProviders`) vs. the **harness singleton**
(`getGlobalHarnessConfig`, default `'pi'`, mutated by `configureHarnesses`).

Using the legacy singleton is **what keeps 6–7 existing test files green** (they all mutate the
global default via `configureProviders(...)` and construct `new Agent()` expecting to resolve the
legacy default `'anthropic'` / a configured provider). Switching to `getGlobalHarnessConfig` would
make every such `new Agent()` resolve `'pi'` and throw (no `'pi'` stub registered) — see the
blast-radius table in `research/agent-ctor-rewire-analysis.md` §2. T2 (P3.M1.T2) is the natural
place to migrate agent.ts + those tests to `configureHarnesses`/`getGlobalHarnessConfig`, because T2
already rewrites the execute/stream assertions.

**Net:** S1 honours the contract's *essential* deliverable (resolve the harness cascade →
`HarnessRegistry.get` → throw → hold `Harness`) while routing the global-config read through the
legacy singleton. This is the same staged-migration posture `harness-config.ts` itself advertises
("Once P3.M1 rewires agent.ts … the legacy singleton can be deleted"). KEEP the existing
`import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';`
(agent.ts L45) — do **not** replace it with `resolveHarnessConfig`/`getGlobalHarnessConfig`.

### Decision 2 — Backward-compat field fallback: `config.harness ?? config.provider`

The constructor must accept BOTH the new harness vocabulary and the legacy provider vocabulary so
existing callers/tests (`new Agent({ provider: 'anthropic' })`) keep working. Read:

```ts
this.harnessId = config.harness ?? (config.provider as HarnessId | undefined);
this.harnessOptions = config.harnessOptions ?? config.providerOptions;
```

`config.provider` is `ProviderId` (= `HarnessId | 'anthropic' | 'opencode'`); the `as HarnessId`
cast is **unsound at the type level but runtime-safe** — `resolveProviderConfig`/`resolveHarnessConfig`
treat the id as an **opaque string key** (harness-config.ts L343: "resolveHarnessConfig performs NO
id validation") and `HarnessRegistry.get(id)` does a raw `Map.get(id)`. So a legacy literal like
`'anthropic'` flows through unchanged and resolves whatever stub is registered under it. This cast
mirrors the EXACT pattern already used inside `resolveProviderConfig`
(`globalConfig.defaultProvider as HarnessId`, `agentProvider as HarnessId`). The fallback is removed
by T2 once `PromptOverrides`/the test suite are fully on harness vocabulary.

### Decision 3 — `HarnessRegistry.get(...)` returns `Provider`; cast to `Harness` (runtime-safe)

`HarnessRegistry` is the v1.2 rename of `ProviderRegistry` (`export const ProviderRegistry =
HarnessRegistry;` in `harness-registry.ts`). Its `get(id: ProviderId): Provider | undefined` returns
the legacy `Provider` type. `Provider` is **NOT assignable** to `Harness` (`Provider.id: ProviderId`
is a wider type than `Harness.id: HarnessId`), so a cast is required:

```ts
const harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
```

Runtime-safe: `Provider` and `Harness` are **structurally identical** (identical method surface —
`id`, `capabilities`, `initialize`, `terminate`, `execute`, `registerMCPs`, `loadSkills`,
`normalizeModel`, `supports`, `requiresFeatures`); every `Provider*` parameter type is a
`@deprecated` alias for the matching `Harness*` type. The cast bridges only the `id`-type width gap.
The constructor's throw guard runs on the cast value, so a genuinely-missing harness still throws.

### Decision 4 — `stream()` / `executePrompt()` get a MINIMAL mechanical rename ONLY (no logic change)

The field rename deletes `this.providerId` / `this.providerOptions`, so the two
`resolveProviderConfig(globalConfig, this.providerId, this.providerOptions, promptProvider,
promptProviderOptions)` call sites (`stream()` L357-361, `executePrompt()` L587-591) **must** be
updated or `tsc` fails on the deleted fields. The fix is a pure identifier rename
(`this.providerId`→`this.harnessId`, `this.providerOptions`→`this.harnessOptions`) — **one token
each**. These identifiers type-check against `resolveProviderConfig`'s `ProviderId`/`ProviderOptions`
params because `HarnessId ⊆ ProviderId` and `HarnessOptions ⊆ ProviderOptions` (no cast needed —
verified, research §4).

Also rename the `ProviderRegistry.getInstance()` identifier at L366 (`stream`) + L596
(`executePrompt`) → `HarnessRegistry.getInstance()` (pure identifier rename; `HarnessRegistry` IS
`ProviderRegistry`). This lets agent.ts import a single registry name. **Do NOT** touch anything
else in `stream`/`executePrompt` — the cascade-fn swap (`resolveProviderConfig`→`resolveHarnessConfig`),
`HarnessRequest` construction, the `PROVIDER_NOT_FOUND` error path (L598-604), and the
`configureHarnesses` migration are all **T2 (P3.M1.T2)**. Update the two comments at L365 + L595
("may differ from this.provider") → "may differ from this.harness".

### Decision 5 — Conditionally ADD `harness`/`harnessOptions` to `AgentConfig` (P3.M2.T1.S1 is "Planned")

`config.harness` is a `tsc` error today (`src/types/agent.ts` `AgentConfig` has only `provider` /
`providerOptions` at L127/L167 — confirmed by grep). The contract lists
`AgentConfig.harness/harnessOptions (P3.M2.T1.S1)` as an INPUT, but that work item is `Planned`
(not done). **Resolution:** S1 adds the two optional fields to `AgentConfig` as a **Task gated on a
pre-flight grep** — `grep -nE '^\s+harness\??:' src/types/agent.ts`. If the grep finds
`harness?:` on `AgentConfig`, P3.M2.T1.S1 already landed and the task is **skipped** (zero conflict).
If absent, add (after the existing `model?` field, ~L120):

```ts
  /** Harness to use (inherits from global; default 'pi'). PRD §7.9. */
  harness?: HarnessId;

  /** Harness-specific options. PRD §7.9. */
  harnessOptions?: HarnessOptions;
```

plus `import type { HarnessId, HarnessOptions } from './harnesses.js';` at the top of `agent.ts`
(types) alongside the existing `import type { ProviderId, ProviderOptions } from './providers.js';`
(KEEP — still used by `provider`/`providerOptions` fields + `PromptOverrides`). **Do NOT** add
`harness`/`harnessOptions` to `PromptOverrides` — that is P3.M2.T2.S1 (the constructor does not read
prompt-level overrides).

### Decision 6 — The stored `this.harness` field is held but not read (zero behaviour risk)

`this.provider` is assigned at L124 and **never read** — `stream`/`executePrompt` both re-resolve a
*local* `providerInstance` (L366/L596). So renaming the field to `this.harness` has **no behavioural
effect** beyond the type; it satisfies the contract's "Agent resolves & holds a Harness instance".
(The local `providerInstance` / `provider` variables inside `stream`/`executePrompt` stay as-is —
renaming them is cosmetic and T2's territory; leave them to minimise churn.)

### Decision 7 — Constructor throw message moves to harness vocabulary

The constructor's existing throw (L122: `` `Provider '${effectiveProvider}' is not registered` ``)
becomes `` `Harness '${effectiveHarness}' is not registered` `` (contract: "throw if missing").
This is the ONLY throw-message change in S1 — the `executePrompt()` `PROVIDER_NOT_FOUND` error path
(L598-604) stays as-is (T2 owns it). `provider-switching.test.ts` L162 asserts `new Agent({ provider:
'nonexistent-provider' })` throws at construction — that test passes unchanged because the guard still
throws (now with a `Harness '...'` message; the test does not assert the message text — verify in
Task 0 grep).

### Decision 8 — `agent.test.ts`: harness-vocabulary helper + new resolution tests, keep existing green

Under the bridge, the existing `agent.test.ts` assertions (`new Agent()` resolving the registered
`'anthropic'` stub) **already pass** — but the contract requires the file be "updated" to
demonstrate harness resolution + mock `HarnessRegistry` with stub harnesses. So:
- Rename/clone the helper to `createMockHarness(id: HarnessId): Harness` (structurally identical to
  the existing `createMockProvider`; return a `Harness`-typed object so `HarnessRegistry.register`
  accepts it — `register(provider: Provider)` accepts a structurally-identical `Harness`).
- Switch the `beforeEach` to register via `HarnessRegistry.getInstance().register(...)` and
  `afterEach` to `HarnessRegistry['_resetForTesting']()` (drop the legacy `ProviderRegistry` name).
- **ADD** a `describe('Agent harness resolution')` block: explicit `{ harness: 'pi' }`,
  explicit `{ harness: 'claude-code' }`, legacy fallback `{ provider: 'anthropic' }`, global default
  (`new Agent()`), and throw-on-unregistered. Use `configureHarnesses`/`resetGlobalHarnessConfig`
  where a global default is exercised — with `resetGlobalHarnessConfig()` in `afterEach`.
- The `Agent.prompt()` + `Agent.prompt() response validation` describe blocks keep registering an
  `'anthropic'` stub (their `new Agent({name:...})` resolves it via the legacy default) — leave them
  unless a test breaks; the bridge preserves their behaviour.

---

## User Persona

**Target User:** Groundswell core maintainers + the T2 implementer (P3.M1.T2) + downstream
`Agent` consumers.
- **T2 (P3.M1.T2.S1–S3)** — needs `this.harness` (a `Harness` instance) + `this.harnessId`/
  `this.harnessOptions` to exist on the Agent so `executePrompt`/`stream` can build `HarnessRequest`
  and thread harness + provider into the cache key. S1 delivers exactly these held fields.
- **Agent consumers** — `new Agent({ harness: 'pi', model: 'anthropic/claude-sonnet-4-20250514' })`
  (PRD §7.13) now resolves the harness at construction; legacy `new Agent({ provider: 'anthropic' })`
  callers keep working via the fallback.

**Use Case:** A workflow constructs `new Agent({ harness: 'pi', model: 'anthropic/claude-sonnet-4' })`.
The constructor reads `config.harness` (`'pi'`), runs the cascade, fetches `HarnessRegistry.get('pi')`,
and holds the `PiHarness` instance. A second agent `new Agent({ provider: 'anthropic' })` (legacy
caller) falls back to `config.provider` (`'anthropic'`), resolves the registered `'anthropic'` stub,
and holds it as `this.harness`. Both proceed to `prompt()`/`stream()` unchanged.

**Pain Points Addressed:** Today the Agent holds a `Provider` and is named entirely in provider
vocabulary, blocking the §7 harness/provider split. S1 makes the Agent harness-native internally
while preserving every external caller — the prerequisite for T2 to finish the execute/stream rewire.

---

## Why

- **Realises PRD §7.9** — `AgentConfig.harness` / `harnessOptions` are read by the Agent.
- **Realises PRD §7.7** — the Agent constructor runs the harness configuration cascade.
- **Unblocks P3.M1.T2** — `executePrompt`/`stream` can now delegate to `this.harness` and build
  `HarnessRequest`; the cache-key builder can thread `this.harnessId` + the resolved provider.
- **Keeps the migration safe** — the bridge means S1 lands green without forcing a simultaneous
  rewrite of 6 test files (deferred to T2, which already touches their execute/stream assertions).

---

## What

1. **MODIFY `src/core/agent.ts`** — imports (drop `Provider`, add `Harness`/`HarnessId`/`HarnessOptions`,
   rename `ProviderRegistry`→`HarnessRegistry`); rename the 3 private fields; rewire the constructor;
   mechanically rename field refs + registry identifier in `stream()` + `executePrompt()` + their comments.
2. **MODIFY `src/types/agent.ts`** — conditionally add `harness?`/`harnessOptions?` to `AgentConfig`.
3. **MODIFY `src/__tests__/unit/agent.test.ts`** — harness-vocabulary helper + `HarnessRegistry`
   setup + new `Agent harness resolution` describe block.
4. **VALIDATE** — lint / targeted tests / full suite / build / grep contracts + runtime spot-check.
5. **DO NOT** edit: `executePrompt`/`stream` **logic** (cascade fn, `HarnessRequest`,
   `PROVIDER_NOT_FOUND` path — T2); `PromptOverrides` (P3.M2.T2.S1); the cache key (P3.M1.T2.S3);
   `src/index.ts` exports (P3.M3.T1.S1); `MCPHandler` init or the `config.mcps` registration loop;
   `harness-config.ts` / `harness-registry.ts` / `types/harnesses.ts` (already done in P1/P2);
   the 6 other agent test files (the bridge keeps them green).

### Success Criteria

- [ ] `Agent` private fields are `harnessId?: HarnessId`, `harnessOptions?: HarnessOptions`,
      `harness: Harness`; no `providerId`/`providerOptions`/`provider` fields remain.
- [ ] Constructor reads `config.harness ?? config.provider` (cast) + `config.harnessOptions ??
      config.providerOptions`, resolves via `resolveProviderConfig(getGlobalProviderConfig(), …)`
      (which delegates to `resolveHarnessConfig`), fetches `HarnessRegistry.getInstance().get(...)`,
      casts to `Harness | undefined`, throws `Harness '<id>' is not registered` if missing, assigns
      `this.harness`.
- [ ] `stream()` + `executePrompt()` reference `this.harnessId`/`this.harnessOptions` and
      `HarnessRegistry.getInstance()` (no `this.providerId`/`ProviderRegistry` remain); their logic
      is otherwise byte-identical to today.
- [ ] `AgentConfig` has `harness?: HarnessId` + `harnessOptions?: HarnessOptions` (added by S1 only
      if absent at pre-flight).
- [ ] `agent.test.ts` registers stub harnesses via `HarnessRegistry` and has a passing
      `Agent harness resolution` describe (explicit harness, legacy fallback, global default,
      throw-on-unregistered).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0; the full suite stays green.
- [ ] grep: `this.provider\b`, `this.providerId`, `this.providerOptions`, `ProviderRegistry`
      ABSENT from `src/core/agent.ts`.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S1 using only
(a) this PRP, (b) read-only access to `src/core/agent.ts` (ctor L98-145, stream L350-366,
executePrompt L583-605 — the exact blocks to edit; imports L40-46), `src/types/agent.ts`
(`AgentConfig` L113-167, `PromptOverrides` L210-253), `src/harnesses/harness-registry.ts`
(`getInstance`/`get`/`register`/`_resetForTesting` + the `ProviderRegistry` alias), `src/utils/harness-config.ts`
(`resolveProviderConfig` delegates to `resolveHarnessConfig` at L367-368; `configureHarnesses`/
`getGlobalHarnessConfig`/`resetGlobalHarnessConfig`), `src/types/harnesses.ts` (`Harness`/`HarnessId`/
`HarnessOptions` definitions), and `src/__tests__/unit/agent.test.ts` (the existing `createMockProvider`
helper + `beforeEach`/`afterEach` registry pattern to modernize), and (c) the copy-paste-ready snippets
in "Implementation Patterns" + `research/agent-ctor-rewire-analysis.md` (blast-radius table + the
type-check verification in §4). The eight load-bearing decisions (legacy-wrapper bridge, field
fallback, `Provider`→`Harness` cast, minimal stream/executePrompt rename, conditional AgentConfig
add, held-not-read field, harness throw message, agent.test.ts harness tests) are all proven in the
research note.

### Documentation & References

```yaml
# MUST READ — the file to REWIRE (the constructor + the two ripple sites).
- file: src/core/agent.ts
  why: L98-145 = constructor (store fields + resolveProviderConfig + ProviderRegistry.get + throw +
       MCPHandler init + mcps loop — the block to rewire); L84-86 = the 3 private field declarations
       to rename; L350-366 = stream() resolution (field refs + ProviderRegistry — mechanical rename);
       L583-605 = executePrompt() resolution (field refs + ProviderRegistry + PROVIDER_NOT_FOUND —
       mechanical rename, leave the error path); L40-46 = imports to adjust (drop Provider, add
       Harness/HarnessId/HarnessOptions, rename ProviderRegistry→HarnessRegistry).
  pattern: constructor stores config-derived fields, resolves via cascade, fetches from registry,
           throws if missing, holds the instance.
  gotcha: this.provider is NEVER read after construction (stream/executePrompt re-resolve a local) —
          renaming it is zero-behaviour-change. Only the constructor throw message moves to harness vocab.

# MUST READ — the cascade utilities (confirms resolveProviderConfig delegates to resolveHarnessConfig).
- file: src/utils/harness-config.ts
  why: L23/L166-167/L341-343/L367-368 = proof that resolveProviderConfig DELEGATES to resolveHarnessConfig
       (justifies Decision 1's bridge); L192-230 = resolveHarnessConfig signature
       (globalConfig, agentHarness?, agentOptions?, promptHarness?, promptOptions?) => {harness, options}
       (NO id validation — opaque string key, justifies Decision 2's cast); L98-138 = configureHarnesses
       (validates ONLY 'pi'|'claude-code'); L140-155 = getGlobalHarnessConfig (default {defaultHarness:'pi'});
       L260-265 = resetGlobalHarnessConfig (for tests).
  critical: the legacy singleton (configureProviders/getGlobalProviderConfig) and the harness singleton
            (configureHarnesses/getGlobalHarnessConfig) are SEPARATE — that is exactly why S1 routes the
            constructor through the legacy singleton (to keep configureProviders-based tests green).

# MUST READ — the registry (HarnessRegistry IS ProviderRegistry).
- file: src/harnesses/harness-registry.ts
  why: getInstance() (singleton); get(id: ProviderId): Provider | undefined (returns the LEGACY Provider
       type — Decision 3's cast target); register(provider: Provider) (accepts a structurally-identical
       Harness — used by agent.test.ts); _resetForTesting() (static, for afterEach); the file ENDS with
       `export const ProviderRegistry = HarnessRegistry;` (proves the identifier rename is behaviour-free).
  gotcha: get() returns Provider, NOT Harness — cast `as Harness | undefined` (Decision 3).

# MUST READ — the Harness type (the contract the held field implements).
- file: src/types/harnesses.ts
  why: HarnessId = 'pi' | 'claude-code' (the field type); HarnessOptions {endpoint?,apiKey?,sessionId?,
       timeout?,headers?} (⊆ ProviderOptions — assignable, no cast); Harness interface (id/capabilities/
       initialize/terminate/execute/registerMCPs/loadSkills/normalizeModel/supports/requiresFeatures —
       structurally identical to Provider, justifies Decision 3's runtime-safe cast).
  pattern: `import type { Harness, HarnessId, HarnessOptions } from '../types/harnesses.js';` (type-only
           — isolatedModules: true).

# MUST READ — AgentConfig (the conditional edit target).
- file: src/types/agent.ts
  why: L113-167 = AgentConfig (provider? L127, providerOptions? L167 — the legacy fields KEPT; add
       harness?/harnessOptions? after model? ~L120 IF absent — Decision 5); L210-253 = PromptOverrides
       (DO NOT touch — P3.M2.T2.S1). Existing import at top: `import type { ProviderId, ProviderOptions }
       from './providers.js';` — ADD `import type { HarnessId, HarnessOptions } from './harnesses.js';`.
  gotcha: the pre-flight grep (Task 0) decides whether this file is edited at all.

# MUST READ — the legacy provider-config shim (the import agent.ts KEEPS).
- file: src/utils/provider-config.ts
  why: confirms `resolveProviderConfig` + `getGlobalProviderConfig` are re-exported (deprecated shim)
       from harness-config.js — agent.ts L45 imports them and KEEPS them (Decision 1). @deprecated but
       fully functional during the migration.

# MUST READ — the existing test to MODERNIZE.
- file: src/__tests__/unit/agent.test.ts
  why: createMockProvider(id) helper (L11-39 — clone as createMockHarness returning Harness-typed);
       beforeEach registers a stub + afterEach calls ProviderRegistry['_resetForTesting']() (modernize
       to HarnessRegistry); the `Agent` describe (L42-94 — keep assertions, add harness-resolution
       tests). The Agent.prompt() / response-validation describes register 'anthropic' + construct
       new Agent({name}) — leave (the bridge keeps them green).

# SHOULD READ — the research note (blast radius + type verification + the bridge rationale).
- file: plan/004_9a50e71828f4/P3M1T1S1/research/agent-ctor-rewire-analysis.md
  why: §2 = the 7-file blast-radius table (literal-contract breaks 6–7; bridge breaks 0 beyond
       agent.test.ts); §3 = the constructor design + the resolveProviderConfig→resolveHarnessConfig
       delegation proof; §4 = the type-check verification (which casts are needed and why); §5 = the
       AgentConfig dependency resolution; §6 = explicit out-of-scope list.

# REFERENCE — the previous PRP (P2.M4.T1.S2) for the harness-vocabulary migration conventions.
- file: plan/004_9a50e71828f4/P2M4T1S2/PRP.md
  why: establishes the "decision + gotcha" PRP style + the harness/Provider structural-identity cast
       convention used throughout P2/P3. (P2.M4.T1.S2 is being implemented in parallel; it does NOT
       touch agent.ts or AgentConfig, so there is ZERO file overlap with S1.)
```

### Current Codebase tree (relevant slice)

```bash
src/core/agent.ts                 # MODIFY — ctor rewire + field rename + stream/executePrompt mechanical rename + imports
src/types/agent.ts                # MODIFY (CONDITIONAL) — add harness?/harnessOptions? to AgentConfig if absent
src/__tests__/unit/agent.test.ts  # MODIFY — harness-vocabulary helper + HarnessRegistry setup + harness-resolution tests
src/harnesses/harness-registry.ts # READ-ONLY — HarnessRegistry.getInstance/get/register/_resetForTesting
src/utils/harness-config.ts       # READ-ONLY — resolveProviderConfig delegates to resolveHarnessConfig; configureHarnesses
src/utils/provider-config.ts      # READ-ONLY — legacy shim re-exporting resolveProviderConfig/getGlobalProviderConfig
src/types/harnesses.ts            # READ-ONLY — Harness/HarnessId/HarnessOptions types
# (src/types/providers.ts, stream()/executePrompt() logic, PromptOverrides, cache-key, src/index.ts, MCPHandler — UNTOUCHED by S1.)
```

### Desired Codebase tree with files to be modified

```bash
src/core/agent.ts                 # MODIFIED — harness fields + rewired ctor + mechanical stream/executePrompt renames
src/types/agent.ts                # MODIFIED (conditional) — AgentConfig.harness?/harnessOptions? added if absent
src/__tests__/unit/agent.test.ts  # MODIFIED — createMockHarness + HarnessRegistry setup + Agent harness resolution describe
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Use resolveProviderConfig/getGlobalProviderConfig (NOT resolveHarnessConfig/getGlobalHarnessConfig)
//   in the constructor. resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368), so
//   the canonical harness cascade runs. The legacy global singleton is used deliberately to keep the ~6 test files
//   that call configureProviders() green. T2 (P3.M1.T2) migrates agent.ts + those tests to configureHarnesses.
//   Do NOT "improve" this to getGlobalHarnessConfig — it will turn the suite red. (Decision 1.)

// CRITICAL #2 — config.provider cast as HarnessId is runtime-safe. resolveHarnessConfig performs NO id validation
//   (opaque string key); HarnessRegistry.get does a raw Map.get. So 'anthropic'/'opencode' legacy literals flow
//   through unchanged and resolve the registered stub. Mirrors the cast already inside resolveProviderConfig.
//   (Decision 2.)

// CRITICAL #3 — registry.get(...) returns Provider, NOT Harness. Cast `as Harness | undefined`. Provider and Harness
//   are structurally identical (same methods; Provider* params are deprecated Harness* aliases); the cast bridges
//   only the id-type width gap (Provider.id: ProviderId wider than Harness.id: HarnessId). The throw guard runs on
//   the cast value, so a missing harness still throws. (Decision 3.)

// CRITICAL #4 — stream()/executePrompt() get a MECHANICAL rename ONLY: this.providerId→this.harnessId,
//   this.providerOptions→this.harnessOptions, ProviderRegistry→HarnessRegistry, comment "this.provider"→"this.harness".
//   NO logic change. The cascade-fn swap, HarnessRequest, PROVIDER_NOT_FOUND path, and configureHarnesses migration
//   are T2 (P3.M1.T2). Touching them here = scope creep + red suite. (Decision 4.)

// CRITICAL #5 — AgentConfig.harness is added ONLY if a pre-flight grep shows it absent. P3.M2.T1.S1 ("Planned")
//   may land first and add it — then SKIP the types/agent.ts edit. Do NOT add harness to PromptOverrides
//   (P3.M2.T2.S1). (Decision 5.)

// GOTCHA #6 — isolatedModules: true (tsconfig.json). The new type imports (Harness, HarnessId, HarnessOptions)
//   MUST be `import type`. HarnessRegistry is a value import. resolveProviderConfig/getGlobalProviderConfig are
//   value imports (kept). Provider type import is REMOVED (unused after the field rename).

// GOTCHA #7 — noUnusedLocals is OFF (tsconfig), so a leftover unused import would not fail `tsc --noEmit`. But
//   REMOVE the now-unused `import type { Provider } from '../types/providers.js';` for hygiene (it is only used
//   by the deleted `this.provider: Provider` field declaration). Keep ProviderId/ProviderOptions/ProviderRequest/
//   ProviderHookEvents/ToolExecutionRequest/ToolExecutionResult imports — they are still used in stream/executePrompt.

// GOTCHA #8 — npm run lint EXCLUDES src/__tests__ (tsconfig "exclude"). It type-checks agent.ts + types/agent.ts
//   (proving the impl compiles + imports resolve + the AgentConfig field + the cast). Test type errors surface in
//   `npm test` (vitest/esbuild). Run BOTH gates.

// GOTCHA #9 — HarnessRegistry.register(provider: Provider) accepts a structurally-identical Harness-typed mock
//   in tests (structural typing). createMockHarness returns a Harness; registry.register(harness) type-checks.

// GOTCHA #10 — The local `providerInstance`/`provider` variables INSIDE stream()/executePrompt() stay named as-is
//   (renaming them is cosmetic churn owned by T2). Only the `this.`-prefixed field references + the
//   `ProviderRegistry.getInstance()` identifier change in S1.

// GOTCHA #11 — DO NOT edit executePrompt()'s PROVIDER_NOT_FOUND error path (L598-604) or its throw/return. That is
//   T2's scope. Only the CONSTRUCTOR's throw message moves to harness vocabulary (Decision 7).

// GOTCHA #12 — The 6 other agent test files (agent-tool-executor, agent-prompt-provider-override,
//   agent-stream-provider-override, provider-agent, provider-switching, workflow-validation) are NOT edited by S1.
//   The bridge preserves their behaviour. If any of them goes red, the bridge was implemented wrong (most likely
//   getGlobalHarnessConfig was used by mistake — re-read Decision 1).
```

---

## Implementation Blueprint

### Data models and structure

NO new runtime data models. S1 consumes the existing `Harness`/`HarnessId`/`HarnessOptions`
(`src/types/harnesses.ts`), `HarnessRegistry` (`src/harnesses/harness-registry.ts`), and
`resolveProviderConfig`/`getGlobalProviderConfig` (`src/utils/provider-config.ts` → `harness-config.ts`).
The only structural additions are two optional fields on `AgentConfig` (conditional) and the three
renamed private fields on `Agent`.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs + baseline green)
  - RUN: `git status --short` — note baseline.
  - RUN: `grep -nE "this\.provider|this\.providerId|this\.providerOptions|ProviderRegistry|getGlobalProviderConfig|resolveProviderConfig" src/core/agent.ts`
        → confirm ctor L105-124, stream L356-366, executePrompt L586-605, import L45 (exact ripple sites).
  - RUN: `grep -nE "^\s+(provider|harness|providerOptions|harnessOptions)\??:" src/types/agent.ts`
        → if `harness?:` is ABSENT on AgentConfig, Task 2 runs; if PRESENT (P3.M2.T1.S1 landed), SKIP Task 2.
  - RUN: `grep -nE "createMockProvider|ProviderRegistry|configureProviders|new Agent\(" src/__tests__/unit/agent.test.ts`
        → enumerate the helper + beforeEach/afterEach + construct sites to modernize.
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before editing.

Task 1: MODIFY src/core/agent.ts — IMPORTS
  - REMOVE: `import type { Provider } from '../types/providers.js';` (the standalone Provider type import;
        unused after the field rename — verify no other reference first).
  - ADD: `import type { Harness, HarnessId, HarnessOptions } from '../types/harnesses.js';`
  - CHANGE: `import { ProviderRegistry } from '../harnesses/index.js';` → `import { HarnessRegistry } from '../harnesses/index.js';`
  - KEEP: `import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';` (Decision 1 bridge).
  - KEEP: the `import type { ProviderId, ProviderOptions, ProviderRequest, ProviderHookEvents, ToolExecutionRequest, ToolExecutionResult } from '../types/providers.js';`
        block (still used by stream/executePrompt).
  - VERIFY: `npm run lint` → 0 errors (imports resolve; isolatedModules-safe type-only imports).

Task 2: MODIFY src/types/agent.ts — ADD AgentConfig.harness/harnessOptions (SKIP if pre-flight found `harness?:`)
  - ADD to imports (top of file, next to the existing providers.js import):
        `import type { HarnessId, HarnessOptions } from './harnesses.js';`
  - ADD to AgentConfig (after the `model?: string;` field, ~L120):
        /** Harness to use (inherits from global; default 'pi'). PRD §7.9. */
        harness?: HarnessId;
        /** Harness-specific options. PRD §7.9. */
        harnessOptions?: HarnessOptions;
  - DO NOT touch PromptOverrides (P3.M2.T2.S1) and DO NOT remove provider/providerOptions (legacy, kept).
  - VERIFY: `npm run lint` → 0 errors.

Task 3: MODIFY src/core/agent.ts — RENAME the 3 private fields (declarations L84-86)
  - CHANGE:
        `private readonly providerId?: ProviderId;`            → `private readonly harnessId?: HarnessId;`
        `private readonly providerOptions?: ProviderOptions;`  → `private readonly harnessOptions?: HarnessOptions;`
        `private readonly provider: Provider;`                 → `private readonly harness: Harness;`
  - (Also update their JSDoc comments from "Provider …" to "Harness …" if present.)
  - VERIFY: `npm run lint` → will FAIL here (stream/executePrompt still reference this.providerId) — fixed by Task 5.

Task 4: MODIFY src/core/agent.ts — REWIRE the constructor (L104-124)
  - REPLACE the block:
        // Store provider configuration from AgentConfig
        // Full provider resolution (global + agent + prompt) happens later during execution
        this.providerId = config.provider;
        this.providerOptions = config.providerOptions;

        // Resolve effective provider using configuration cascade
        // Priority: agent provider -> global default provider
        const globalConfig = getGlobalProviderConfig();
        const resolved = resolveProviderConfig(
          globalConfig,
          this.providerId,
          this.providerOptions
        );
        const effectiveProvider = resolved.provider;

        // Get provider instance from registry
        const registry = ProviderRegistry.getInstance();
        const providerInstance = registry.get(effectiveProvider);
        if (!providerInstance) {
          throw new Error(`Provider '${effectiveProvider}' is not registered`);
        }
        this.provider = providerInstance;
    WITH:
        // Store harness configuration from AgentConfig (PRD §7.9).
        // Backward-compat bridge: prefer the new `harness` field; fall back to the legacy `provider`
        // field so existing callers (`new Agent({ provider: 'anthropic' })`) keep working during the
        // v1.2 migration. The fallback + legacy global-config singleton are removed by T2 (P3.M1.T2)
        // when executePrompt/stream + the test suite move to configureHarnesses/getGlobalHarnessConfig.
        this.harnessId = config.harness ?? (config.provider as HarnessId | undefined);
        this.harnessOptions = config.harnessOptions ?? config.providerOptions;

        // Resolve the effective harness via the configuration cascade (PRD §7.7).
        // resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368);
        // getGlobalProviderConfig is used as the global source to honour the legacy configureProviders()
        // singleton still consumed by executePrompt/stream + the existing test suite.
        const globalConfig = getGlobalProviderConfig();
        const resolved = resolveProviderConfig(
          globalConfig,
          this.harnessId,
          this.harnessOptions,
        );
        const effectiveHarness = resolved.provider;

        // Fetch the harness instance from HarnessRegistry (the v1.2 rename of ProviderRegistry).
        // The cast bridges the legacy Provider return type to the Harness contract — structurally
        // identical at runtime; the cast exists only because Provider.id is a wider type than Harness.id.
        const registry = HarnessRegistry.getInstance();
        const harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
        if (!harnessInstance) {
          throw new Error(`Harness '${effectiveHarness}' is not registered`);
        }
        this.harness = harnessInstance;
  - LEAVE the MCPHandler init + config.mcps registration loop (L126-145) UNCHANGED (contract: "Keep
        MCPHandler init + mcps registration unchanged").
  - VERIFY (grep): `grep -nE "this\.harness\b|this\.harnessId|this\.harnessOptions|HarnessRegistry|config\.harness" src/core/agent.ts` → present in ctor.

Task 5: MODIFY src/core/agent.ts — MECHANICAL rename in stream() + executePrompt() (compile-only)
  - In stream() (L357-366): change `this.providerId` → `this.harnessId`, `this.providerOptions` →
        `this.harnessOptions`, `const registry = ProviderRegistry.getInstance();` →
        `const registry = HarnessRegistry.getInstance();`, and the comment
        "may differ from this.provider" → "may differ from this.harness".
  - In executePrompt() (L587-596): the SAME four identifier renames + the same comment update.
  - DO NOT touch anything else in those methods (no cascade-fn swap, no HarnessRequest, no
        PROVIDER_NOT_FOUND path — T2).
  - VERIFY: `npm run lint` → 0 errors (proves the field-rename propagated; no orphan this.providerId).
  - VERIFY (grep): `grep -nE "this\.provider\b|this\.providerId|this\.providerOptions|ProviderRegistry" src/core/agent.ts`
        → NO hits (all renamed).

Task 6: MODIFY src/__tests__/unit/agent.test.ts — harness vocabulary + harness-resolution tests
  - UPDATE imports: `import { HarnessRegistry } from '../../harnesses/harness-registry.js';`
        (replace ProviderRegistry); add `import { configureHarnesses, resetGlobalHarnessConfig } from '../../utils/harness-config.js';`;
        add `import type { Harness, HarnessId, HarnessCapabilities } from '../../types/harnesses.js';`
        (replace the Provider/ProviderId/ProviderCapabilities type imports where the helper is modernized).
  - REPLACE/CLONE the helper:
        function createMockHarness(id: HarnessId): Harness {
          const capabilities: HarnessCapabilities = {
            mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false,
          };
          return {
            id, capabilities,
            initialize: vi.fn().mockResolvedValue(undefined),
            terminate: vi.fn().mockResolvedValue(undefined),
            execute: vi.fn(),
            registerMCPs: vi.fn().mockResolvedValue([]),
            loadSkills: vi.fn().mockResolvedValue(undefined),
            normalizeModel: vi.fn((model: string): ModelSpec => ({ provider: id as ModelProviderId, model, raw: model })),
            supports: vi.fn(() => true),
            requiresFeatures: vi.fn(() => true),
          };
        }
    (import ModelSpec from '../../types/providers.js' or harnesses.js; ModelProviderId from harnesses.js.
     NOTE: a `Harness`-typed object is structurally accepted by HarnessRegistry.register(provider: Provider).)
  - In the top `describe('Agent')` beforeEach: `HarnessRegistry.getInstance().register(createMockHarness('pi'));`
        and `configureHarnesses({ defaultHarness: 'pi' });` (so `new Agent()` resolves 'pi'); afterEach:
        `HarnessRegistry['_resetForTesting']();` and `resetGlobalHarnessConfig();`.
    - The existing assertions (unique id, default name, custom name, getMcpHandler, mcp registration)
          still pass (they do not assert on the harness id).
  - ADD a new describe block:
        describe('Agent harness resolution', () => {
          beforeEach(() => { resetGlobalHarnessConfig(); HarnessRegistry['_resetForTesting'](); });
          afterEach(()  => { resetGlobalHarnessConfig(); HarnessRegistry['_resetForTesting'](); });

          it('resolves an explicit harness from AgentConfig.harness', () => {
            HarnessRegistry.getInstance().register(createMockHarness('claude-code'));
            const agent = new Agent({ harness: 'claude-code' });   // no throw
            expect(agent.getMcpHandler()).toBeInstanceOf(MCPHandler);
          });

          it('falls back to the legacy provider field', () => {
            HarnessRegistry.getInstance().register(createMockHarness('pi'));   // any id; cast below
            // legacy caller — provider literal flows through the opaque-key cascade
            const stub = createMockHarness('anthropic' as HarnessId);
            HarnessRegistry.getInstance().register(stub);
            const agent = new Agent({ provider: 'anthropic' as any });        // no throw
            expect(agent.id).toBeDefined();
          });

          it('uses the configured global default harness', () => {
            configureHarnesses({ defaultHarness: 'pi' });
            HarnessRegistry.getInstance().register(createMockHarness('pi'));
            const agent = new Agent();                                       // no throw
            expect(agent.name).toBe('Agent');
          });

          it('throws when the resolved harness is not registered', () => {
            configureHarnesses({ defaultHarness: 'pi' });
            // no 'pi' stub registered
            expect(() => new Agent()).toThrow(/Harness 'pi' is not registered/);
          });
        });
    (Adjust the literal values so each test registers the exact id the constructor will resolve. The
     throw-test is the key contract assertion: "HarnessRegistry.get throw if missing".)
  - LEAVE the `Agent.prompt()` + `Agent.prompt() response validation` describes UNLESS they break —
        they register an 'anthropic' stub and construct `new Agent({name:...})`, which the bridge
        resolves via the legacy default. If one breaks, register the matching stub in its beforeEach.
  - VERIFY: `npx vitest run src/__tests__/unit/agent.test.ts` → all pass.

Task 7: VALIDATE (full suite + build + grep contracts)
  - RUN: `npm run lint`   → 0 errors.
  - RUN: `npm test`       → 0 failures (agent.test.ts green AND the 6 other agent test files green
        via the bridge — if any red, re-read Decision 1).
  - RUN: `npm run build`  → 0 errors; dist emits.
  - RUN (grep contracts):
        grep -nE "this\.provider\b|this\.providerId|this\.providerOptions|ProviderRegistry" src/core/agent.ts   → NO hits
        grep -nE "this\.harness\b|HarnessRegistry|config\.harness|effectiveHarness" src/core/agent.ts          → present
  - RUN (runtime spot-check, vitest): the 4 harness-resolution tests above pass (incl. the throw test).
```

### Implementation Patterns & Key Details

```ts
// === Constructor (the core of S1) — src/core/agent.ts ===
constructor(config: AgentConfig = {}) {
  this.id = generateId();
  this.name = config.name ?? 'Agent';
  this.config = config;
  this.model = config.model ?? 'claude-sonnet-4-20250514';

  // Decision 2 — backward-compat field fallback (config.harness ?? config.provider).
  this.harnessId = config.harness ?? (config.provider as HarnessId | undefined);
  this.harnessOptions = config.harnessOptions ?? config.providerOptions;

  // Decision 1 — legacy global-config bridge (resolveProviderConfig delegates to resolveHarnessConfig).
  const globalConfig = getGlobalProviderConfig();
  const resolved = resolveProviderConfig(globalConfig, this.harnessId, this.harnessOptions);
  const effectiveHarness = resolved.provider;   // ProviderId; treated as opaque key

  // Decision 3 — HarnessRegistry.get returns Provider; cast to Harness (runtime-safe, structural identity).
  const registry = HarnessRegistry.getInstance();
  const harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
  if (!harnessInstance) {
    throw new Error(`Harness '${effectiveHarness}' is not registered`);   // Decision 7
  }
  this.harness = harnessInstance;

  // UNCHANGED — MCPHandler init + config.mcps registration loop.
  this.mcpHandler = new MCPHandler();
  if (config.mcps) {
    for (const mcp of config.mcps) {
      if (mcp instanceof MCPHandler) this.mcpHandlers.push(mcp);
      this.mcpHandler.registerServer(mcp);
    }
  }
}

// === stream() / executePrompt() — MECHANICAL rename ONLY (Decision 4) ===
// BEFORE: resolveProviderConfig(globalConfig, this.providerId, this.providerOptions, promptProvider, promptProviderOptions)
// AFTER:  resolveProviderConfig(globalConfig, this.harnessId,   this.harnessOptions,   promptProvider, promptProviderOptions)
// BEFORE: const registry = ProviderRegistry.getInstance();
// AFTER:  const registry = HarnessRegistry.getInstance();
// (Nothing else in these methods changes. The local `providerInstance`/`provider` vars keep their names.)

// === Test helper — createMockHarness (Harness-typed, accepted by HarnessRegistry.register) ===
function createMockHarness(id: HarnessId): Harness {
  return {
    id,
    capabilities: { mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false },
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string) => ({ provider: 'anthropic', model, raw: model })),
    supports: vi.fn(() => true),
    requiresFeatures: vi.fn(() => true),
  };
}
```

### Integration Points

```yaml
REGISTRY:
  - consumer: "src/core/agent.ts constructor (new) + stream()/executePrompt() (renamed identifier)"
  - api: "HarnessRegistry.getInstance().get(id) — returns the registered Harness stub (cast from Provider)"
  - note: "HarnessRegistry IS ProviderRegistry (export const alias) — pure identifier rename in stream/executePrompt"

CONFIG CASCADE:
  - consumer: "src/core/agent.ts constructor"
  - api: "resolveProviderConfig(getGlobalProviderConfig(), this.harnessId, this.harnessOptions) — delegates to resolveHarnessConfig"
  - note: "legacy global singleton used deliberately (Decision 1); T2 migrates to getGlobalHarnessConfig/configureHarnesses"

AGENTCONFIG:
  - add to: "src/types/agent.ts AgentConfig (conditional on pre-flight grep)"
  - fields: "harness?: HarnessId; harnessOptions?: HarnessOptions;"
  - note: "PromptOverrides.harness is NOT added (P3.M2.T2.S1)"

NO DATABASE / NO ROUTES / NO NEW DEPENDENCIES.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after editing src/core/agent.ts + src/types/agent.ts
npm run lint            # tsc --noEmit on src/ (excludes src/__tests__)
# Expected: Zero errors. If errors:
#   - "Property 'harness' does not exist on AgentConfig" → run Task 2 (add the fields).
#   - "Property 'providerId' does not exist" in stream/executePrompt → Task 5 rename missed a site.
#   - "Type 'Provider' is not assignable to type 'Harness'" → missing the `as Harness | undefined` cast (Decision 3).
```

### Level 2: Unit Tests (Component Validation)

```bash
# The modernized test file
npx vitest run src/__tests__/unit/agent.test.ts -v
# Expected: all pass, incl. the new 'Agent harness resolution' describe (4 cases + the throw test).

# The bridge must keep these green with ZERO edits:
npx vitest run src/__tests__/unit/agent-tool-executor.test.ts -v
npx vitest run src/__tests__/unit/agent-prompt-provider-override.test.ts -v
npx vitest run src/__tests__/unit/agent-stream-provider-override.test.ts -v
npx vitest run src/__tests__/integration/provider-switching.test.ts -v
npx vitest run src/__tests__/integration/provider-agent.test.ts -v
# Expected: all pass unchanged. If any red → the bridge was implemented wrong (most likely
#   getGlobalHarnessConfig was used instead of getGlobalProviderConfig — re-read Decision 1).
```

### Level 3: Integration Testing (System Validation)

```bash
# Full suite — the green-suite guarantee is the primary S1 gate
npm test
# Expected: 0 failures. This is the proof the bridge preserved behaviour across all 7 Agent-constructing
# test files.

# Build — proves dist emits with the renamed fields
npm run build
# Expected: exit 0.
```

### Level 4: Contract & Runtime Validation

```bash
# Grep contracts (must all hold)
echo "--- agent.ts must NOT contain legacy field/registry names ---"
grep -nE "this\.provider\b|this\.providerId|this\.providerOptions|ProviderRegistry" src/core/agent.ts || echo "CLEAN ✓"
echo "--- agent.ts MUST contain harness names ---"
grep -nE "this\.harness\b|this\.harnessId|this\.harnessOptions|HarnessRegistry|config\.harness|effectiveHarness" src/core/agent.ts

# Runtime spot-check is covered by the 4 'Agent harness resolution' vitest cases (Task 6):
#   - explicit harness resolves; legacy provider fallback resolves; global default resolves;
#     unregistered harness throws /Harness '...' is not registered/.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (agent.ts + types/agent.ts type-check; cast resolves; imports resolve).
- [ ] `npm test` exits 0 — `agent.test.ts` green AND the 6 other Agent-constructing test files green
      (unchanged — the bridge preserves their behaviour).
- [ ] `npm run build` exits 0.
- [ ] grep: no `this.provider`/`this.providerId`/`this.providerOptions`/`ProviderRegistry` in agent.ts.

### Feature Validation

- [ ] `Agent` holds a `Harness` instance (`this.harness`) resolved at construction.
- [ ] Constructor reads `config.harness ?? config.provider` + `config.harnessOptions ?? config.providerOptions`.
- [ ] Constructor resolves via the cascade (`resolveProviderConfig` → delegates to `resolveHarnessConfig`).
- [ ] Constructor fetches `HarnessRegistry.getInstance().get(...)` and throws
      `Harness '<id>' is not registered` when missing.
- [ ] `new Agent({ harness: 'pi' })`, `new Agent({ provider: 'anthropic' })`, and `new Agent()` (global
      default) all resolve a registered stub without throwing.
- [ ] MCPHandler init + `config.mcps` registration loop unchanged.
- [ ] `stream()`/`executePrompt()` compile and behave identically to today (mechanical rename only).

### Code Quality Validation

- [ ] Follows existing agent.ts conventions (private readonly fields, JSDoc, error-message style).
- [ ] Type-only imports use `import type` (isolatedModules).
- [ ] The unused `Provider` type import is removed; `Harness`/`HarnessId`/`HarnessOptions` added.
- [ ] The backward-compat bridge + cast are documented inline (point to T2 for removal).
- [ ] No scope creep into executePrompt/stream logic, PromptOverrides, cache-key, src/index.ts, MCPHandler.

### Documentation & Deployment

- [ ] Constructor JSDoc/comments explain the bridge + the T2 migration target.
- [ ] No new environment variables, dependencies, or config files.

---

## Anti-Patterns to Avoid

- ❌ Don't switch the constructor to `getGlobalHarnessConfig`/`resolveHarnessConfig`/`configureHarnesses`
  directly — it breaks ~6 test files that use `configureProviders`. Use the legacy-wrapper bridge
  (Decision 1); T2 does the full migration.
- ❌ Don't rewrite `stream()`/`executePrompt()` logic — only the field-reference + registry-identifier
  rename (Decision 4). The cascade-fn swap, `HarnessRequest`, and `PROVIDER_NOT_FOUND` are T2.
- ❌ Don't add `harness`/`harnessOptions` to `PromptOverrides` — that is P3.M2.T2.S1.
- ❌ Don't skip the `as Harness | undefined` cast on `registry.get(...)` — `Provider` is not assignable
  to `Harness` (id-type width); `tsc` will error.
- ❌ Don't edit the 6 other Agent-constructing test files — the bridge keeps them green; editing them
  is T2's job and risks conflicts.
- ❌ Don't remove the legacy `provider`/`providerOptions` fields from `AgentConfig` — they are kept for
  backward compat (the constructor falls back to them).
- ❌ Don't catch and swallow the constructor throw — the contract requires "throw if missing" (the
  `provider-switching.test.ts` L162 throw-test depends on it).

---

## Confidence Score

**9/10** for one-pass implementation success. The change is mechanically small (one constructor
block + three field renames + two compile-only ripple renames + one conditional 2-field type
addition + one test-file modernization). The one design subtlety — routing the global-config read
through the legacy `resolveProviderConfig`/`getGlobalProviderConfig` wrappers instead of the literal
`resolveHarnessConfig`/`getGlobalHarnessConfig` — is **proven** by the delegation in `harness-config.ts`
(L367-368) and **validated** by the blast-radius table showing it keeps all 7 Agent-constructing test
files green. The only residual risk is the conditional `AgentConfig` edit colliding with a concurrent
P3.M2.T1.S1, which the pre-flight grep (Task 0) + conditional Task 2 fully mitigates.
