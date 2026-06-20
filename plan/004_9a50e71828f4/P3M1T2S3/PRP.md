# PRP — P3.M1.T2.S3: Thread harness + provider into the cache key build-site

**PRD reference:** §7.6 (`GlobalHarnessConfig.defaultModelProvider`), §7.8 (`parseModelSpec` /
`ModelSpec.provider` — the model is never harness-qualified; bare models resolve against
`defaultModelProvider`), §7.14 point 5 (**Caching**: cache keys incorporate **both** the harness and the
provider/model for isolation — quoted verbatim in the item contract), §7.14.5. **Plan:**
`plan/004_9a50e71828f4/` — S3 of P3.M1.T2 ("Agent executePrompt + stream + cache key rewire").
**Consumes** the post-S1 `executePrompt` state (`resolvedHarness: HarnessId` already in scope at the
build-site via the S1 harness-resolution block) AND P1.M3.T1.S1's `CacheKeyInputs.harness?`/`provider?`
fields + `generateCacheKey` conditional-append (already proven by `cache-key.test.ts`). **Unblocks**
P4.M2.T1.S2 (cache-isolation parity tests). **Scope tag:** (a) in the `executePrompt`
`if (cacheEnabled)` block **ADD** `harness: resolvedHarness` + `provider: parseModelSpec(effectiveModel,
getGlobalHarnessConfig().defaultModelProvider).provider` to the `cacheInputs` object literal;
(b) **ADD** two imports to `agent.ts` (`getGlobalHarnessConfig`, `parseModelSpec`); (c) **CREATE** a new
`agent-cache-key-isolation.test.ts` mocking harnesses + the default cache, asserting per-(harness,
provider, model) isolation. **DO NOT touch** `stream()` (S2 — does not cache), `cache-key.ts`
(P1.M3.T1.S1 — already done), the `CacheKeyInputs` type (already has the fields), the S1
harness-resolution/fetch/throw/hooks/request blocks, or any existing test. **`generateCacheKey` ALREADY
incorporates the two axes** — S3 only supplies the values at the single build-site. **`enableCache` is
OPT-IN** (off by default; no existing agent test enables it) → threading the axes breaks ZERO existing
tests.

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** The change is mechanically a 2-field addition to one
> object literal inside `executePrompt`'s `if (cacheEnabled)` block. The single load-bearing subtlety is
> the `defaultModelProvider` source (Decision 2): the legacy `getGlobalProviderConfig()` bridge that S1/S2
> kept returns `GlobalProviderConfig`, which has NO `defaultModelProvider` field — so agent.ts MUST read
> it from the canonical `getGlobalHarnessConfig().defaultModelProvider`. The other decisions pin (a) the
> single build-site (executePrompt only — stream does not cache), (b) letting `parseModelSpec` throw
> propagate (fail-fast on invalid models; cache is opt-in so no existing test breaks), and (c) the test
> strategy (count `harness.execute` invocations + capture keys via `defaultCache.set` spy).

---

## Goal

**Feature Goal:** Make the `executePrompt` cache-key build-site (`src/core/agent.ts` ~L637–655) thread the
resolved **harness** (`resolvedHarness`) and the resolved **LLM provider**
(`parseModelSpec(effectiveModel, defaultModelProvider).provider`) into `CacheKeyInputs`, so cache entries
are isolated per `(harness, provider, model)` tuple — realising PRD §7.14 point 5 / §7.14.5. After S3,
`generateCacheKey` (which P1.M3.T1.S1 already extended to incorporate the two axes) receives non-`undefined`
values at the Agent call-site, producing distinct digests for `pi` vs `claude-code` runs and for
`anthropic/*` vs `openai/*` models even when the bare model id collides.

**Deliverable:**
1. **MODIFY `src/core/agent.ts`** — in the `executePrompt` `if (cacheEnabled)` block, add two fields to the
   `cacheInputs: CacheKeyInputs` object literal: `harness: resolvedHarness` and
   `provider: parseModelSpec(effectiveModel, getGlobalHarnessConfig().defaultModelProvider).provider`.
   Compute the provider via a single `parseModelSpec` call (capture into a `modelSpec` local or inline —
   implementer's choice; inlining is fine). Add two imports: `getGlobalHarnessConfig` (from
   `'../utils/harness-config.js'`) and `parseModelSpec` (from `'../utils/model-spec.js'`). Leave every
   other line of `executePrompt` (resolution, fetch, throw, hooks, request build, execute, cache
   set/store) byte-identical. Leave `stream()` untouched.
2. **CREATE `src/__tests__/unit/agent-cache-key-isolation.test.ts`** — mirror S1's
   `agent-prompt-harness-override.test.ts` mock structure (`createMockHarness` + `HarnessRegistry` setup +
   `resetGlobalConfig`). Enable cache (`new Agent({ enableCache: true })`). Assert: (a) two identical
   prompts with **different harnesses** → both execute (cache MISS — isolation); (b) two identical prompts
   with the **same harness** → second is a cache HIT (execute called once); (c) two prompts with the same
   model NAME but **different providers** (`anthropic/claude-x` vs `openai/claude-x`) → both execute; (d)
   a bare model resolves provider to `'anthropic'` (the `parseModelSpec` default) and its key equals the
   explicit `anthropic/<model>` key; (e) captured cache keys (via `vi.spyOn(defaultCache, 'set')`) differ
   across harness/provider and are equal within a tuple. Reset the default cache in `beforeEach`.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit` on `src/`, **excludes `src/__tests__``) exits 0 — the two new imports
   resolve, `resolvedHarness` (a `HarnessId` string) is assignable to `CacheKeyInputs.harness?: HarnessId`,
   and `parseModelSpec(...).provider` (`ModelProviderId`) is assignable to `CacheKeyInputs.provider?:
   ModelProviderId`.
2. `npm test` (`vitest run`) exits 0 — the NEW `agent-cache-key-isolation.test.ts` passes AND **the entire
   existing suite stays green** (cache is opt-in + no agent test enables it, so the changed key shape
   affects no existing assertion).
3. `npm run build` (`tsc`) exits 0 — `dist/core/agent.js` emits with the threaded axes.
4. Runtime spot-check (vitest): an agent with `enableCache: true` calling the same prompt on `{ harness:
   'pi' }` then `{ harness: 'claude-code' }` invokes BOTH harnesses (no cross-harness cache hit); the same
   prompt twice on `{ harness: 'pi' }` invokes the harness ONCE (cache hit); a bare model
   `claude-sonnet-4` and an explicit `anthropic/claude-sonnet-4` produce the SAME cache key.
5. Contract (grep): `harness: resolvedHarness` + `provider:` (referencing `parseModelSpec`) present in the
   `cacheInputs` literal inside `executePrompt`; `getGlobalHarnessConfig` + `parseModelSpec` imported in
   agent.ts; the build-site is the ONLY location touched (no `cacheInputs`/`generateCacheKey` edit in
   `stream()`).

---

## ⚠️ SCOPE DECISIONS — the load-bearing details

### Decision 1 — ONE build-site: `executePrompt`'s `if (cacheEnabled)` block. `stream()` does NOT cache.

`grep -n "cacheInputs\|generateCacheKey" src/core/agent.ts` → the only `cacheInputs` object + the only
`generateCacheKey(...)` call are inside `executePrompt` (~L640 & ~L652). `stream()` (~L354–553) has NO
cache logic (S2's PRP explicitly scopes stream as "DO NOT touch the cache-key build-site — S3's scope").
**S3 edits exactly one object literal.** Do not add caching to `stream()`; do not factor the build into a
shared helper (out of scope — that's a refactor; keep the inline literal).

### Decision 2 — `defaultModelProvider` source: `getGlobalHarnessConfig().defaultModelProvider` (NOT the legacy bridge)

**This is the core subtlety.** agent.ts reads the global source via the LEGACY bridge
`getGlobalProviderConfig()` (L600 — kept by S1/S2 Decision 1 to keep the existing test suite green). But
`getGlobalProviderConfig()` returns `GlobalProviderConfig` (`types/providers.ts` L534), whose shape is
`{ defaultProvider: ProviderId; providerDefaults? }` — it has **NO `defaultModelProvider` field**
(`defaultProvider` is the *harness* id like `'anthropic'`/`'pi'`, NOT the LLM host). The canonical
`defaultModelProvider` lives only on `GlobalHarnessConfig` (`types/harnesses.ts` L474), populated via
`configureHarnesses()` into the SEPARATE `globalHarnessConfig` singleton (`harness-config.ts` L57), read
via `getGlobalHarnessConfig()` (L158 → `globalHarnessConfig ?? DEFAULT_HARNESS_CONFIG`).

**Resolution:** read it from the canonical source:
```ts
const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;
```
`DEFAULT_HARNESS_CONFIG` (`harness-config.ts` L63) is `{ defaultHarness: 'pi' }` — it does **not** set
`defaultModelProvider`, so the field is `undefined` by default. **`undefined` is safe:**
`parseModelSpec(model, defaultProvider: ModelProviderId = 'anthropic')` (`model-spec.ts` L68) — a TS
default parameter fires when the arg is `undefined`, so bare models resolve against `'anthropic'`
(PRD §7.8 sensible default). Provider-qualified models parse the provider from the string regardless.
**So the provider axis is always correctly derived** (explicit for qualified strings, `'anthropic'`
fallback for bare). When a caller does `configureHarnesses({ defaultModelProvider: 'openai' })`, bare
models correctly resolve to `'openai'`.

**Two-singleton note (acceptable):** the harness axis (`resolvedHarness`) is resolved via the LEGACY
singleton; the provider axis's default is read from the CANONICAL singleton. This is the faithful
implementation of the contract (`parseModelSpec(effectiveModel, defaultModelProvider)`) and is safe
because the provider axis is derived primarily from the model STRING, with the global default only
affecting bare models (→ `'anthropic'`). Both are "global config" reads during the migration window; the
single-singleton consolidation is deferred (P3.M2 / P4 cleanup) alongside S1/S2's bridge removal.

### Decision 3 — `parseModelSpec` can THROW — let it propagate (no try/catch)

`parseModelSpec` throws (`model-spec.ts`) on (a) empty/whitespace model, or (b) 3+-segment
"harness-qualified" strings (`pi/anthropic/x`) — PRD §7.8 critical rule. `effectiveModel =
overrides?.model ?? this.model`; `this.model` defaults to `'claude-sonnet-4-20250514'` (valid bare). So
parseModelSpec throws ONLY when a caller passes an invalid `overrides.model`. **Decision: let it propagate
( fail-fast).** Rationale: (i) the contract literally says `parseModelSpec(effectiveModel,
defaultModelProvider).provider` — no guard; (ii) an invalid model is a genuine config error that the
harness would fail on anyway at L767 (`model: effectiveModel`) — throwing earlier during key generation is
acceptable; (iii) a silent `catch { provider = undefined }` would MASK config errors AND cause cache
collisions (provider omitted when it should be present → keys collapse → wrong cached response served);
(iv) **zero existing-test risk** — `enableCache` is opt-in and no agent test enables cache (§5 of the
research note), so no existing path reaches parseModelSpec via the build-site. Document as Gotcha; the new
test MAY include a `parseModelSpec throws on invalid model` case to lock the behavior (optional — the
`utils/model-spec.test.ts` suite already covers parseModelSpec's own throwing).

### Decision 4 — Inline the provider computation OR use a local (implementer's choice; recommend a named local for readability)

Two acceptable forms:

**Form A (named local — recommended):**
```ts
if (cacheEnabled) {
  // PRD §7.14.5: isolate cache entries per (harness, provider, model).
  const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;
  const modelSpec = parseModelSpec(effectiveModel, defaultModelProvider);

  const cacheInputs: CacheKeyInputs = {
    user: prompt.buildUserMessage(),
    data: prompt.getData(),
    system: effectiveSystem,
    model: effectiveModel,
    harness: resolvedHarness,        // PRD §7.14.5 — harness axis (resolved via cascade, S1)
    provider: modelSpec.provider,    // PRD §7.14.5 — LLM provider axis (from ModelSpec, §7.8)
    temperature: effectiveTemperature,
    maxTokens: effectiveMaxTokens,
    tools: this.config.tools,
    mcps: this.config.mcps,
    skills: this.config.skills,
    responseFormat: prompt.getResponseFormat(),
  };
  cacheKey = generateCacheKey(cacheInputs);
  // ... unchanged: defaultCache.get(cacheKey) → cacheHit/cacheMiss ...
}
```

**Form B (inline):** `provider: parseModelSpec(effectiveModel, getGlobalHarnessConfig().defaultModelProvider).provider,`

Form A is clearer (one `parseModelSpec` call, named locals, easy to comment). The implementer picks;
**Form A is recommended**. `getGlobalHarnessConfig()` is cheap (returns a module singleton or the const
default) so calling it once per cached prompt is negligible.

### Decision 5 — Imports: add `getGlobalHarnessConfig` + `parseModelSpec` (both already exported from `src/utils/index.ts`)

- `getGlobalHarnessConfig` → import from **`'../utils/harness-config.js'`** (the definition module — NOT
  re-exported by the `provider-config.js` shim, which only re-exports `configureProviders`/
  `getGlobalProviderConfig`/`resolveProviderConfig`/`resetGlobalConfig`). Importing from the actual
  definition module matches agent.ts's existing direct-import convention (e.g. it imports
  `HarnessRegistry` from `'../harnesses/harness-registry.js'`).
- `parseModelSpec` → import from **`'../utils/model-spec.js'`** (the definition module). Do NOT import
  `formatModelForProvider` (unused by S3 — `noUnusedLocals` is OFF so an unused import wouldn't break
  `tsc`, but keep imports minimal).
- Both are **value imports** (functions), not `import type` — fine under `isolatedModules: true`.
- KEEP the existing import block (L33–46) intact, including `resolveProviderConfig`/`getGlobalProviderConfig`
  (S1/S2's bridge — still used by the resolution block) and `generateCacheKey`/`defaultCache`/`CacheKeyInputs`
  from `'../cache/index.js'`.

### Decision 6 — New test FILE; NO edits to any existing test

`enableCache` is opt-in and no existing agent test enables it (research §5). Threading the axes changes
the key ONLY for caching callers (nobody in the suite today). **Therefore every existing test stays green
unchanged.** S3 CREATES `src/__tests__/unit/agent-cache-key-isolation.test.ts` (mirror S1's
`agent-prompt-harness-override.test.ts` mock structure) and edits NOTHING else. Do NOT edit
`cache-key.test.ts` (it tests `generateCacheKey` directly and already passes — P1.M3.T1.S1's isolation
block is the proof the digest works; S3 only supplies values at the Agent site).

---

## User Persona

**Target User:** Groundswell core maintainers + the P4.M2.T1.S2 (parity tests) implementer + downstream
`Agent` consumers who enable caching.
- **P4.M2.T1.S2 (cache-isolation parity tests)** — needs the Agent build-site to thread harness+provider
  so the parity suite can assert `pi` vs `claude-code` runs never share cache entries (PRD §7.14 point 5).
- **Agent consumers** — `new Agent({ enableCache: true, harness: 'pi', model: 'anthropic/claude-sonnet-4'
  })` now caches responses keyed by the full `(harness, provider, model)` tuple; switching harness or
  provider per-call (`agent.prompt(p, { harness: 'claude-code' })`) correctly misses the cache instead of
  serving a stale cross-harness entry.

**Use Case:** A workflow constructs `new Agent({ enableCache: true })` and calls `agent.prompt(prompt, {
harness: 'pi', model: 'anthropic/claude-sonnet-4' })`. The cache key now embeds `harness: 'pi'` +
`provider: 'anthropic'`. A second call `agent.prompt(prompt, { harness: 'claude-code' })` resolves a
DIFFERENT key (harness axis differs) → cache MISS → `claude-code.execute` runs (no stale `pi` entry
served). A second call with the same `{ harness: 'pi', model: 'anthropic/claude-sonnet-4' }` → SAME key →
cache HIT → `pi.execute` NOT called again. A bare `{ model: 'claude-sonnet-4' }` resolves provider
`'anthropic'` (parseModelSpec default) and shares the key with the explicit `anthropic/claude-sonnet-4`.

**Pain Points Addressed:** Today the cache key omits both axes (build-site passes only `model:
effectiveModel`), so a `pi` run and a `claude-code` run on the same prompt/model share a cache entry — a
correctness bug under PRD §7.14.5 (different harnesses can produce different responses/tool-calls).
Likewise `anthropic/gpt-4o-alias` and `openai/gpt-4o-alias` (colliding bare ids) would collide. S3 makes
the key harness+provider-aware.

---

## Why

- **Realises PRD §7.14 point 5 / §7.14.5** — "Cache keys incorporate **both** the harness and the
  provider/model for isolation." S3 is the Agent-side threading that P1.M3.T1.S1's type/key work was built
  to consume (the `CacheKeyInputs.harness?`/`provider?` doc-comments literally name P3.M1.T2.S3).
- **Realises PRD §7.8** — the provider axis is derived from the `ModelSpec` (`parseModelSpec`), honouring
  the open-set `ModelProviderId` and the `defaultModelProvider` resolution for bare models.
- **Completes P3.M1.T2's Agent rewire** — executePrompt (S1) + stream (S2) + cache-key threading (S3).
- **Unblocks P4.M2.T1.S2** — the cache-isolation parity suite can now assert real per-(harness, provider,
  model) isolation at the Agent level.
- **Zero migration risk** — cache is opt-in and unused by the existing test suite, so S3 lands green with
  a single new test file and no edits to existing tests.

---

## What

1. **MODIFY `src/core/agent.ts`** — add `harness: resolvedHarness` + `provider: parseModelSpec(effectiveModel,
   getGlobalHarnessConfig().defaultModelProvider).provider` to the `cacheInputs` object literal inside
   `executePrompt`'s `if (cacheEnabled)` block (Form A recommended — named locals). Add the two imports
   (`getGlobalHarnessConfig`, `parseModelSpec`).
2. **CREATE `src/__tests__/unit/agent-cache-key-isolation.test.ts`** — mock-harness + default-cache
   isolation coverage (harness isolation, provider isolation, bare-model default, cache HIT round-trip,
   captured-key assertions).
3. **VALIDATE** — lint / new test / full suite / build / grep contracts.
4. **DO NOT edit:** `stream()` (S2); `cache-key.ts` (P1.M3.T1.S1); the `CacheKeyInputs` type; the S1
   harness-resolution/fetch/throw/hooks/request/execute blocks in `executePrompt`; the constructor /
   `AgentConfig` / `PromptOverrides`; `cache-key.test.ts` or any existing test; `src/index.ts`
   (P3.M3.T1.S1).

### Success Criteria

- [ ] The `cacheInputs: CacheKeyInputs` literal in `executePrompt` includes `harness: resolvedHarness` and
      `provider:` derived from `parseModelSpec(effectiveModel, getGlobalHarnessConfig().defaultModelProvider)`.
- [ ] `getGlobalHarnessConfig` (from `'../utils/harness-config.js'`) + `parseModelSpec` (from
      `'../utils/model-spec.js'`) are imported in `agent.ts`.
- [ ] No other line of `executePrompt` changed (resolution/fetch/throw/hooks/request/execute/cache-set
      byte-identical); `stream()` untouched; `cache-key.ts` untouched.
- [ ] `agent-cache-key-isolation.test.ts` passes (harness isolation MISS, same-harness HIT, provider
      isolation, bare-model == explicit-qualified key, captured-key assertions).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0; the existing suite stays green unchanged.
- [ ] grep: `harness: resolvedHarness` + `parseModelSpec(` present in the `cacheInputs` block; NO
      `cacheInputs`/`generateCacheKey` edit in `stream()`.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement T2.S3 using only
(a) this PRP, (b) read-only access to `src/core/agent.ts` (the post-S1 `executePrompt` body —
`effectiveModel` L630, `cacheEnabled` L636, the `cacheInputs` literal L640–651 = the block to extend,
`generateCacheKey` call L652, the cache get/hit-miss L654+, imports L33–46), `src/cache/cache-key.ts`
(`CacheKeyInputs.harness?` L34 + `.provider?` L43 + the `generateCacheKey` conditional-append L228–235 —
proving S3 changes nothing here), `src/utils/harness-config.ts` (`getGlobalHarnessConfig` L158 +
`DEFAULT_HARNESS_CONFIG` L63 + the two-singleton fact), `src/utils/model-spec.ts` (`parseModelSpec` L68 +
its default `'anthropic'` + throw behavior), `src/types/providers.ts` (`GlobalProviderConfig` L534 — no
`defaultModelProvider`), `src/types/harnesses.ts` (`GlobalHarnessConfig.defaultModelProvider?` L474),
`src/__tests__/unit/agent-prompt-harness-override.test.ts` (the `createMockHarness` pattern to mirror),
`src/cache/cache.ts` (the `defaultCache` reset API the new test needs), and (c) the copy-paste-ready
snippets in "Implementation Patterns" + `research/cache-key-threading-analysis.md` (build-site §1,
P1.M3.T1.S1 state §2, defaultModelProvider source §3, throw behavior §4, opt-in/zero-risk §5, test
strategy §6, scope §7, imports §8). All six load-bearing decisions are proven in the research note.

### Documentation & References

```yaml
# MUST READ — the file to MODIFY (the single build-site).
- file: src/core/agent.ts
  why: L630 `effectiveModel = overrides?.model ?? this.model` (the model input to parseModelSpec);
       L636 `cacheEnabled = this.config.enableCache && !overrides?.disableCache` (opt-in gate);
       L637–655 the `if (cacheEnabled)` block — the `cacheInputs: CacheKeyInputs` literal (L640–651) is
       the ONLY object S3 edits (add harness + provider fields); L652 `generateCacheKey(cacheInputs)`;
       L654+ the `defaultCache.get(cacheKey)` → cacheHit/cacheMiss/return-cached logic (UNCHANGED);
       L600 `resolvedHarness` is already in scope (S1's resolution block) — reused as the harness axis;
       L33–46 the import block (ADD getGlobalHarnessConfig + parseModelSpec — Decision 5).
  pattern: effectiveModel → cacheEnabled gate → build cacheInputs (NOW with harness+provider) →
           generateCacheKey → defaultCache.get → hit/miss.
  gotcha: `resolvedHarness` is a `HarnessId` (string) — already in scope from S1's resolution block; do
          NOT re-resolve it. `stream()` (L354–553) has NO cache block — do not touch it.

# MUST READ — the cache key (proves S3 changes NOTHING here).
- file: src/cache/cache-key.ts
  why: L16 `interface CacheKeyInputs` ALREADY has `harness?: HarnessId` (L34) + `provider?: ModelProviderId`
       (L43) — both optional, doc-comments name P3.M1.T2.S3 as the wirer; L221 `generateCacheKey(inputs)`
       ALREADY does conditional append (L228–235: `if (inputs.harness !== undefined) normalized.harness=…;
       if (inputs.provider !== undefined) normalized.provider=…;`). So S3 only supplies values at the
       Agent call-site — the digest already incorporates them.
  critical: do NOT edit this file. The isolation is already proven by `cache-key.test.ts`'s
            "cache key isolation — harness + provider" describe block (9 cases).

# MUST READ — the canonical defaultModelProvider source (Decision 2 — the load-bearing detail).
- file: src/utils/harness-config.ts
  why: L57 `globalHarnessConfig` (the CANONICAL singleton, separate from the legacy `globalProviderConfig`);
       L63 `DEFAULT_HARNESS_CONFIG = { defaultHarness: 'pi' }` (does NOT set defaultModelProvider →
       undefined by default → parseModelSpec falls back to 'anthropic'); L158 `getGlobalHarnessConfig()` →
       `globalHarnessConfig ?? DEFAULT_HARNESS_CONFIG`. The legacy `getGlobalProviderConfig()` (which
       agent.ts L600 uses) returns `GlobalProviderConfig` which has NO defaultModelProvider — hence S3
       must read from `getGlobalHarnessConfig()`.
  pattern: `const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;`
  gotcha: there are TWO singletons during the migration window; the harness axis reads the legacy one
          (S1/S2 bridge), the provider-default reads the canonical one. Acceptable — see Decision 2.

# MUST READ — parseModelSpec (the provider parser + its throw behavior — Decision 3).
- file: src/utils/model-spec.ts
  why: L68 `parseModelSpec(model, defaultProvider: ModelProviderId = 'anthropic')` — TS default fires when
       the arg is undefined (so bare models resolve to 'anthropic' when getGlobalHarnessConfig().
       defaultModelProvider is undefined); returns `{ provider, model, raw }`; THROWS on empty/whitespace
       or 3+-segment harness-qualified strings (PRD §7.8). S3 reads only `.provider`.
  pattern: `const modelSpec = parseModelSpec(effectiveModel, defaultModelProvider); … provider: modelSpec.provider`
  gotcha: it can throw — let it propagate (Decision 3); cache is opt-in so no existing test reaches it.

# MUST READ — the type shapes (proves field assignability + the missing-field fact).
- file: src/types/harnesses.ts
  why: L474 `GlobalHarnessConfig.defaultModelProvider?: ModelProviderId` (the canonical field — confirms
       Decision 2's source); ModelSpec.provider: ModelProviderId (assignable to CacheKeyInputs.provider?).
- file: src/types/providers.ts
  why: L534 `GlobalProviderConfig { defaultProvider: ProviderId; providerDefaults? }` — NO defaultModelProvider
       (proves the legacy bridge CANNOT supply it → Decision 2's canonical read is required).

# MUST READ — the mock pattern to MIRROR (S1's harness-override prompt test).
- file: src/__tests__/unit/agent-prompt-harness-override.test.ts
  why: `createMockHarness(id, executeImpl?)` helper (structurally compatible with Provider — accepted by
       HarnessRegistry.register); beforeEach `resetGlobalConfig()` + register 'pi'+'claude-code' mocks;
       afterEach `HarnessRegistry['_resetForTesting']()` + `resetGlobalConfig()`. Clone this structure
       for the new cache-isolation test; the difference is `new Agent({ enableCache: true })` + cache
       reset + execute-call-count + key-capture assertions.

# MUST READ — the default cache (the singleton the new test must reset + spy on).
- file: src/cache/cache.ts
  why: `defaultCache` is a module-level singleton (imported by agent.ts L33). The new test MUST clear it
       between cases (cross-test pollution would masquerade as isolation) and SHOULD `vi.spyOn(defaultCache,
       'set')` to capture keys. VERIFY the reset API: `grep -n "clear\|reset\|flush" src/cache/cache.ts` —
       if `defaultCache.clear()` exists use it; otherwise inspect the internal map / use the pattern from
       `cache.test.ts`.

# SHOULD READ — the sibling PRPs (the Agent rewire S3 completes).
- file: plan/004_9a50e71828f4/P3M1T2S1/PRP.md
  why: defines the post-S1 executePrompt state (resolvedHarness in scope; the `if (cacheEnabled)` block
       S3 edits) + the bridge Decision 1 S3 inherits.
- file: plan/004_9a50e71828f4/P3M1T2S2/PRP.md
  why: confirms `stream()` does NOT cache (S3's build-site is executePrompt-only) + the shared bridge
       decisions.
- file: plan/004_9a50e71828f4/P1M3T1S1/PRP.md
  why: defines the `CacheKeyInputs.harness?`/`provider?` fields + `generateCacheKey` append that S3
       consumes (already landed).

# SHOULD READ — the research note (all load-bearing facts + scope boundaries).
- file: plan/004_9a50e71828f4/P3M1T2S3/research/cache-key-threading-analysis.md
  why: §1 the single build-site; §2 P1.M3.T1.S1's already-done state; §3 the defaultModelProvider source
       (two singletons); §4 parseModelSpec throw behavior; §5 enableCache opt-in → zero existing-test
       risk; §6 test strategy; §7 scope boundaries; §8 imports.
```

### Current Codebase tree (relevant slice)

```bash
src/core/agent.ts                                        # MODIFY — add harness+provider to the executePrompt cacheInputs literal + 2 imports
src/__tests__/unit/agent-cache-key-isolation.test.ts     # CREATE — mock-harness + default-cache isolation coverage
# READ-ONLY:
src/cache/cache-key.ts                                   # CacheKeyInputs.harness?/provider? + generateCacheKey append (P1.M3.T1.S1 — UNCHANGED)
src/cache/cache.ts                                       # defaultCache singleton (reset API for the test)
src/utils/harness-config.ts                              # getGlobalHarnessConfig + DEFAULT_HARNESS_CONFIG (defaultModelProvider source)
src/utils/model-spec.ts                                  # parseModelSpec (provider parser; default 'anthropic'; throws on invalid)
src/types/harnesses.ts                                   # GlobalHarnessConfig.defaultModelProvider? + ModelSpec.provider
src/types/providers.ts                                   # GlobalProviderConfig (NO defaultModelProvider — justifies Decision 2)
src/__tests__/unit/agent-prompt-harness-override.test.ts # createMockHarness pattern to MIRROR
src/__tests__/unit/cache-key.test.ts                     # generateCacheKey isolation already proven (9 cases — UNCHANGED)
# UNTOUCHED by T2.S3: stream() (S2), cache-key.ts (P1.M3.T1.S1), CacheKeyInputs type, constructor/AgentConfig/
#   PromptOverrides (S1/P3.M2), src/index.ts (P3.M3.T1.S1), every existing test.
```

### Desired Codebase tree with files to be modified

```bash
src/core/agent.ts                                        # MODIFIED — cacheInputs literal threads harness + provider; +2 imports
src/__tests__/unit/agent-cache-key-isolation.test.ts     # CREATED — createMockHarness + enableCache + isolation/HIT/key-capture cases
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — ONE build-site only. The only `cacheInputs`/`generateCacheKey` in agent.ts is inside
//   executePrompt (~L640/L652). stream() does NOT cache. Do NOT add caching to stream; do NOT factor a
//   shared helper (out of scope). (Decision 1.)

// CRITICAL #2 — defaultModelProvider is NOT on the legacy bridge. getGlobalProviderConfig() returns
//   GlobalProviderConfig (types/providers.ts L534) which has `defaultProvider` (the HARNESS id) but NO
//   `defaultModelProvider`. Read it from getGlobalHarnessConfig().defaultModelProvider (types/harnesses.ts
//   L474) — the canonical singleton. undefined by default → parseModelSpec falls back to 'anthropic'.
//   (Decision 2.)

// CRITICAL #3 — parseModelSpec CAN THROW (empty/whitespace model, or 3+-segment harness-qualified
//   strings per PRD §7.8). Let it propagate — fail-fast is correct, cache is opt-in so no existing test
//   reaches this path, and a silent catch would mask config errors + cause cache collisions. (Decision 3.)

// CRITICAL #4 — generateCacheKey ALREADY incorporates harness+provider (cache-key.ts L228–235, P1.M3.T1.S1).
//   S3 changes NOTHING in cache-key.ts — it only supplies the values at the Agent call-site. The isolation
//   is already proven by cache-key.test.ts's 9-case describe block.

// CRITICAL #5 — enableCache is OPT-IN (agent.ts L636 `this.config.enableCache && ...`; AgentConfig.
//   enableCache?: boolean, off by default). NO existing agent test enables cache (grep "enableCache: true"
//   → 0 hits). So threading the axes changes the key for ZERO existing test paths → the existing suite
//   stays green with NO edits. (Research §5.)

// GOTCHA #6 — resolvedHarness is ALREADY in scope at the build-site (S1's resolution block, L600–617).
//   Reuse it as the harness axis; do NOT re-resolve. It's a HarnessId (string) — assignable to
//   CacheKeyInputs.harness?: HarnessId with no cast.

// GOTCHA #7 — getGlobalHarnessConfig is exported from src/utils/harness-config.js (the DEFINITION module),
//   NOT re-exported by the provider-config.js shim (which only re-exports configureProviders/
//   getGlobalProviderConfig/resolveProviderConfig/resetGlobalConfig). Import from harness-config.js.
//   parseModelSpec is exported from src/utils/model-spec.js. Both are VALUE imports (functions), fine
//   under isolatedModules. (Decision 5.)

// GOTCHA #8 — npm run lint EXCLUDES src/__tests__ (tsconfig "exclude"). It type-checks agent.ts (proving
//   the imports resolve + field assignability). Test type errors surface in `npm test` (vitest/esbuild).
//   Run BOTH gates.

// GOTCHA #9 — The new test MUST reset the defaultCache singleton between cases (it's a module-level
//   singleton shared across the suite; without reset, a prior test's entry could masquerade as a HIT).
//   Verify the reset API: `grep -n "clear\|reset\|flush" src/cache/cache.ts`. Spy on defaultCache.set to
//   capture keys (mock.calls[i][0]).

// GOTCHA #10 — DO NOT touch stream(), cache-key.ts, the CacheKeyInputs type, the S1 resolution/fetch/
//   throw/hooks/request/execute blocks, the constructor, AgentConfig, PromptOverrides, any existing test,
//   or src/index.ts. S3 is a 2-field literal addition + 2 imports + 1 new test file. (Scope Decisions.)

// GOTCHA #11 — The two-singleton split (harness axis via legacy bridge; provider-default via canonical
//   singleton) is acceptable for S3 (Decision 2): the provider axis is derived primarily from the model
//   STRING; the global default only affects bare models → 'anthropic'. The single-singleton consolidation
//   is deferred alongside S1/S2's bridge removal (P3.M2/P4).
```

---

## Implementation Blueprint

### Data models and structure

NO new data models. S3 consumes the existing `CacheKeyInputs` (already has `harness?`/`provider?` since
P1.M3.T1.S1), `ModelSpec` (from `parseModelSpec`), and the `GlobalHarnessConfig.defaultModelProvider?`
field. No type edits. No new runtime structures — just two additional fields on an existing object
literal + two function imports.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify post-S1 baseline + green + that P1.M3.T1.S1 fields exist)
  - RUN: `git status --short` — note baseline (S1/S2 should be landed or landing in parallel; this task
        assumes S1's executePrompt rewire is present — `resolvedHarness` in scope at the build-site).
  - RUN: `grep -n "resolvedHarness\|cacheInputs\|generateCacheKey\|effectiveModel" src/core/agent.ts`
        → confirm: `resolvedHarness` present (S1 landed); the `cacheInputs` literal exists inside
        `if (cacheEnabled)` in executePrompt; `effectiveModel` is in scope.
  - RUN: `grep -n "harness?: HarnessId\|provider?: ModelProviderId" src/cache/cache-key.ts`
        → confirm both optional fields exist (P1.M3.T1.S1 landed). If ABSENT, P1.M3.T1.S1 hasn't landed —
        rebase/wait (S3 depends on it).
  - RUN: `grep -n "getGlobalHarnessConfig\|parseModelSpec" src/core/agent.ts`
        → expect ABSENT (S3 adds them). If present, another task added them — verify and skip Task 2's import add.
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before editing. If S1 is mid-flight
        (executePrompt not yet rewired → `resolvedHarness` absent), coordinate/rebase.
  - RUN: `grep -n "clear\|reset\|flush" src/cache/cache.ts` — note the defaultCache reset API for Task 4.

Task 1: MODIFY src/core/agent.ts — ADD the two imports
  - ADD (near the existing utils imports, e.g. after the provider-config import at L45):
        import { getGlobalHarnessConfig } from '../utils/harness-config.js';
        import { parseModelSpec } from '../utils/model-spec.js';
  - KEEP the existing import block intact (resolveProviderConfig/getGlobalProviderConfig from
        provider-config.js; generateCacheKey/defaultCache + CacheKeyInputs from cache/index.js; the
        harnesses type imports from S1).
  - VERIFY: `npm run lint` → 0 errors (both are value imports; isolatedModules satisfied).

Task 2: MODIFY src/core/agent.ts — THREAD harness + provider into the cacheInputs literal (Form A)
  - In the `if (cacheEnabled)` block (~L637–655), REPLACE the existing cacheInputs literal:
        if (cacheEnabled) {
          const cacheInputs: CacheKeyInputs = {
            user: prompt.buildUserMessage(),
            data: prompt.getData(),
            system: effectiveSystem,
            model: effectiveModel,
            temperature: effectiveTemperature,
            maxTokens: effectiveMaxTokens,
            tools: this.config.tools,
            mcps: this.config.mcps,
            skills: this.config.skills,
            responseFormat: prompt.getResponseFormat(),
          };
          cacheKey = generateCacheKey(cacheInputs);
          ...
    WITH:
        if (cacheEnabled) {
          // PRD §7.14.5: isolate cache entries per (harness, provider, model).
          // - harness: the resolved HarnessId (PRD §7.7 cascade, resolved above in executePrompt).
          // - provider: the LLM host parsed from the effective model spec (PRD §7.8). Bare models
          //   resolve against the global defaultModelProvider (defaults to 'anthropic' when unset).
          //   NOTE: parseModelSpec throws on invalid model strings (empty / harness-qualified) — this is
          //   intentional fail-fast; the harness would fail on an invalid model anyway. Cache is opt-in.
          const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;
          const modelSpec = parseModelSpec(effectiveModel, defaultModelProvider);

          const cacheInputs: CacheKeyInputs = {
            user: prompt.buildUserMessage(),
            data: prompt.getData(),
            system: effectiveSystem,
            model: effectiveModel,
            harness: resolvedHarness,        // PRD §7.14.5 — harness axis
            provider: modelSpec.provider,    // PRD §7.14.5 — LLM provider axis (from ModelSpec, §7.8)
            temperature: effectiveTemperature,
            maxTokens: effectiveMaxTokens,
            tools: this.config.tools,
            mcps: this.config.mcps,
            skills: this.config.skills,
            responseFormat: prompt.getResponseFormat(),
          };
          cacheKey = generateCacheKey(cacheInputs);
          // ... (the defaultCache.get(cacheKey) → cacheHit/cacheMiss/return-cached block is UNCHANGED)
  - LEAVE the rest of the `if (cacheEnabled)` block (defaultCache.get, cacheHit/cacheMiss event emission,
        the cached return) AND every other line of executePrompt byte-identical.
  - VERIFY: `npm run lint` → 0 errors.
  - VERIFY (grep): `grep -n "harness: resolvedHarness\|modelSpec.provider\|parseModelSpec\|getGlobalHarnessConfig" src/core/agent.ts`
        → expect hits in executePrompt's cache block + the imports.

Task 3: VERIFY no scope creep (grep contracts)
  - RUN: `awk 'NR>=354 && NR<=553' src/core/agent.ts | grep -nE "cacheInputs|generateCacheKey|harness: resolvedHarness|parseModelSpec"`
        → expect NO hits (stream() must be untouched — it does not cache).
  - RUN: `grep -n "generateCacheKey\|cacheInputs" src/core/agent.ts`
        → expect hits ONLY inside executePrompt (single build-site).
  - RUN: `npm run lint && npm test` → 0 errors / 0 failures (the existing suite must stay green —
        cache is opt-in, no existing test enables it).

Task 4: CREATE src/__tests__/unit/agent-cache-key-isolation.test.ts
  - MIRROR the structure of agent-prompt-harness-override.test.ts (createMockHarness + registry setup +
        resetGlobalConfig + HarnessRegistry['_resetForTesting']).
  - IMPORTS:
        import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
        import { Agent } from '../../core/agent.js';
        import { Prompt } from '../../core/prompt.js';
        import { HarnessRegistry } from '../../harnesses/harness-registry.js';
        import { resetGlobalConfig } from '../../utils/provider-config.js';
        import { defaultCache } from '../../cache/index.js';          // singleton to reset + spy
        import type { Harness, HarnessId, HarnessCapabilities, HarnessRequest } from '../../types/harnesses.js';
        import type { ModelSpec } from '../../types/providers.js';
        import { createSuccessResponse } from '../../types/agent.js';
  - HELPER (clone S1's createMockHarness; default execute returns a success response; capture execute
        via the returned mock so call-counts are observable):
        function createMockHarness(id: HarnessId, executeImpl?: (r: HarnessRequest) => Promise<any>): Harness {
          const mockExecute = vi.fn();
          if (executeImpl) mockExecute.mockImplementation(executeImpl);
          else mockExecute.mockImplementation(async () =>
            createSuccessResponse({ result: `response-from-${id}` }, { agentId: 'test-agent', timestamp: Date.now() }));
          return {
            id,
            capabilities: { mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false },
            initialize: vi.fn().mockResolvedValue(undefined),
            terminate: vi.fn().mockResolvedValue(undefined),
            execute: mockExecute,
            registerMCPs: vi.fn().mockResolvedValue([]),
            loadSkills: vi.fn().mockResolvedValue(undefined),
            normalizeModel: vi.fn((m: string): ModelSpec => ({ provider: id, model: m, raw: m })),
            supports: vi.fn(() => true),
            requiresFeatures: vi.fn(() => true),
          };
        }
  - CACHE RESET: in beforeEach, clear defaultCache. VERIFY the API first (`grep -n "clear\|reset\|flush"
        src/cache/cache.ts`). If `defaultCache.clear()` exists → call it; else inspect the internal map
        (e.g. `(defaultCache as any).cache?.clear?.()` or whatever cache.test.ts uses). ALSO
        vi.spyOn(defaultCache, 'set') to capture keys (read mock.calls[i][0]).
  - beforeEach: resetGlobalConfig(); HarnessRegistry.getInstance().register(createMockHarness('pi'));
        HarnessRegistry.getInstance().register(createMockHarness('claude-code')); clear defaultCache;
        setSpy = vi.spyOn(defaultCache, 'set');
  - afterEach: HarnessRegistry['_resetForTesting'](); resetGlobalConfig(); vi.restoreAllMocks();
  - describe('Agent cache key isolation — harness + provider (PRD §7.14.5)') with:
      1. 'isolates cache by harness: same prompt on pi then claude-code → both execute (MISS)':
           const agent = new Agent({ enableCache: true });
           const p = () => new Prompt('Say hi');
           await agent.prompt(p(), { harness: 'pi' });
           await agent.prompt(p(), { harness: 'claude-code' });
           expect(HarnessRegistry.getInstance().get('pi')!.execute).toHaveBeenCalledTimes(1);
           expect(HarnessRegistry.getInstance().get('claude-code')!.execute).toHaveBeenCalledTimes(1);
           // captured keys differ:
           const keys = setSpy.mock.calls.map(c => c[0]);
           expect(keys[0]).not.toBe(keys[1]);
      2. 'cache HIT on identical (harness, model): second call does NOT re-execute':
           const agent = new Agent({ enableCache: true });
           const piExec = HarnessRegistry.getInstance().get('pi')!.execute as ReturnType<typeof vi.fn>;
           await agent.prompt(new Prompt('Hi'), { harness: 'pi' });
           await agent.prompt(new Prompt('Hi'), { harness: 'pi' });
           expect(piExec).toHaveBeenCalledTimes(1);   // 2nd was a cache HIT
      3. 'isolates cache by provider: same model NAME, different provider → both execute (MISS)':
           const agent = new Agent({ enableCache: true });
           await agent.prompt(new Prompt('Hi'), { harness: 'pi', model: 'anthropic/claude-x' });
           await agent.prompt(new Prompt('Hi'), { harness: 'pi', model: 'openai/claude-x' });
           expect(HarnessRegistry.getInstance().get('pi')!.execute).toHaveBeenCalledTimes(2);
           const keys = setSpy.mock.calls.map(c => c[0]);
           expect(keys[0]).not.toBe(keys[1]);
      4. 'bare model resolves provider to the default (anthropic) and shares the key with the explicit-qualified form':
           const agent = new Agent({ enableCache: true });
           await agent.prompt(new Prompt('Hi'), { harness: 'pi', model: 'claude-sonnet-4' });          // bare
           await agent.prompt(new Prompt('Hi'), { harness: 'pi', model: 'anthropic/claude-sonnet-4' }); // qualified
           // both resolve provider 'anthropic' → SAME key → 2nd is a HIT → execute called ONCE:
           expect(HarnessRegistry.getInstance().get('pi')!.execute).toHaveBeenCalledTimes(1);
           const keys = setSpy.mock.calls.map(c => c[0]);
           expect(keys[0]).toBe(keys[1]);
      5. 'captured keys are 64-char hex and differ across the full (harness, provider, model) tuple':
           await agent.prompt(new Prompt('Hi'), { harness: 'pi', model: 'anthropic/claude-x' });
           await agent.prompt(new Prompt('Hi'), { harness: 'claude-code', model: 'anthropic/claude-x' });
           const keys = setSpy.mock.calls.map(c => c[0]);
           keys.forEach(k => expect(k).toMatch(/^[a-f0-9]{64}$/));
           expect(new Set(keys).size).toBe(keys.length);   // all distinct
      6. (OPTIONAL) 'parseModelSpec throws on a harness-qualified model string when cache is enabled':
           const agent = new Agent({ enableCache: true });
           await expect(agent.prompt(new Prompt('Hi'), { harness: 'pi', model: 'pi/anthropic/x' }))
             .rejects.toThrow(/Harness must not appear in model string/);
           (Locks Decision 3's fail-fast behavior. Skip if utils/model-spec.test.ts already covers it
           thoroughly — but a build-site-level assertion is valuable.)
  - VERIFY: `npx vitest run src/__tests__/unit/agent-cache-key-isolation.test.ts -v` → all pass.
  - VERIFY (regression): `npx vitest run src/__tests__/unit/cache-key.test.ts -v` → all pass (UNCHANGED).
  - VERIFY (full): `npm test` → 0 failures.

Task 5: VALIDATE (full suite + build + grep contracts)
  - RUN: `npm run lint`   → 0 errors.
  - RUN: `npm test`       → 0 failures (new isolation test green AND the existing suite green — if ANY
        existing test goes red, cache was touched outside executePrompt OR an existing test enables cache
        and asserts a key value — re-read Scope Decision 1 + Gotcha #5).
  - RUN: `npm run build`  → 0 errors; dist emits.
  - RUN (grep contracts):
        echo "--- executePrompt cache block MUST thread harness + provider ---"
        grep -nE "harness: resolvedHarness|modelSpec\.provider|parseModelSpec\(|getGlobalHarnessConfig\(" src/core/agent.ts
        echo "--- stream() must NOT be touched (no cacheInputs/generateCacheKey there) ---"
        awk 'NR>=354 && NR<=553' src/core/agent.ts | grep -nE "cacheInputs|generateCacheKey|harness: resolvedHarness|parseModelSpec" || echo "CLEAN ✓"
        echo "--- only ONE cacheInputs build-site in agent.ts ---"
        grep -c "cacheInputs: CacheKeyInputs" src/core/agent.ts   # expect 1
```

### Implementation Patterns & Key Details

```ts
// === The build-site edit — src/core/agent.ts executePrompt, inside `if (cacheEnabled)` ===
// BEFORE (S1 state — missing the two axes):
if (cacheEnabled) {
  const cacheInputs: CacheKeyInputs = {
    user: prompt.buildUserMessage(),
    data: prompt.getData(),
    system: effectiveSystem,
    model: effectiveModel,
    temperature: effectiveTemperature,
    maxTokens: effectiveMaxTokens,
    tools: this.config.tools,
    mcps: this.config.mcps,
    skills: this.config.skills,
    responseFormat: prompt.getResponseFormat(),
  };
  cacheKey = generateCacheKey(cacheInputs);
  // ... defaultCache.get(cacheKey) → cacheHit/cacheMiss/return-cached (UNCHANGED) ...
}

// AFTER (S3 — Form A, named locals):
if (cacheEnabled) {
  // PRD §7.14.5: isolate cache entries per (harness, provider, model).
  const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;   // Decision 2 (canonical singleton)
  const modelSpec = parseModelSpec(effectiveModel, defaultModelProvider);       // §7.8; may throw (Decision 3)

  const cacheInputs: CacheKeyInputs = {
    user: prompt.buildUserMessage(),
    data: prompt.getData(),
    system: effectiveSystem,
    model: effectiveModel,
    harness: resolvedHarness,      // PRD §7.14.5 — harness axis (already in scope from S1's resolution block)
    provider: modelSpec.provider,  // PRD §7.14.5 — LLM provider axis (from ModelSpec)
    temperature: effectiveTemperature,
    maxTokens: effectiveMaxTokens,
    tools: this.config.tools,
    mcps: this.config.mcps,
    skills: this.config.skills,
    responseFormat: prompt.getResponseFormat(),
  };
  cacheKey = generateCacheKey(cacheInputs);
  // ... defaultCache.get(cacheKey) → cacheHit/cacheMiss/return-cached (UNCHANGED) ...
}

// === Imports added to src/core/agent.ts (top of file) ===
import { getGlobalHarnessConfig } from '../utils/harness-config.js';   // canonical defaultModelProvider source
import { parseModelSpec } from '../utils/model-spec.js';               // provider parser (§7.8)

// === Test helper — createMockHarness (clone of S1's; accepted by HarnessRegistry.register) ===
function createMockHarness(id: HarnessId, executeImpl?: (r: HarnessRequest) => Promise<any>): Harness {
  const mockExecute = vi.fn();
  if (executeImpl) mockExecute.mockImplementation(executeImpl);
  else mockExecute.mockImplementation(async () =>
    createSuccessResponse({ result: `response-from-${id}` }, { agentId: 'test-agent', timestamp: Date.now() }));
  return {
    id,
    capabilities: { mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false },
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((m: string): ModelSpec => ({ provider: id, model: m, raw: m })),
    supports: vi.fn(() => true),
    requiresFeatures: vi.fn(() => true),
  };
}
```

### Integration Points

```yaml
CACHE KEY BUILD-SITE:
  - site: "src/core/agent.ts executePrompt → `if (cacheEnabled)` → cacheInputs literal"
  - change: "add harness: resolvedHarness + provider: parseModelSpec(effectiveModel, getGlobalHarnessConfig().defaultModelProvider).provider"
  - consumer: "generateCacheKey (src/cache/cache-key.ts) — ALREADY incorporates both axes (P1.M3.T1.S1 L228-235); no cache-key.ts edit"

GLOBAL CONFIG (defaultModelProvider):
  - source: "getGlobalHarnessConfig().defaultModelProvider (src/utils/harness-config.ts L158/L474)"
  - note: "the legacy getGlobalProviderConfig() bridge (used for harness resolution) does NOT carry defaultModelProvider — Decision 2"

MODEL SPEC:
  - parser: "parseModelSpec(effectiveModel, defaultModelProvider) → ModelSpec.provider (src/utils/model-spec.ts L68)"
  - note: "bare models resolve to 'anthropic' when defaultModelProvider is undefined (TS default param); qualified models parse the provider from the string"

NO DATABASE / NO ROUTES / NO NEW DEPENDENCIES / NO TYPE EDITS / NO config-file EDITS.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after editing src/core/agent.ts (imports + the cacheInputs literal)
npm run lint            # tsc --noEmit on src/ (excludes src/__tests__)
# Expected: Zero errors. If errors:
#   - "Cannot find name 'getGlobalHarnessConfig'/'parseModelSpec'" → Task 1: the imports weren't added.
#   - "Property 'harness'/'provider' does not exist on type 'CacheKeyInputs'" → P1.M3.T1.S1 didn't land
#     (rebase; the fields are required pre-conditions).
#   - "Property 'resolvedHarness' does not exist" → S1 didn't land (rebase; resolvedHarness must be in scope).
#   - Type mismatch on harness/provider → resolvedHarness is not a HarnessId or parseModelSpec().provider
#     is not a ModelProviderId (shouldn't happen — both are the exact types the fields expect).
```

### Level 2: Unit Tests (Component Validation)

```bash
# The new isolation test
npx vitest run src/__tests__/unit/agent-cache-key-isolation.test.ts -v
# Expected: all cases pass (harness isolation MISS, same-harness HIT, provider isolation, bare-model ==
#   explicit-qualified key, captured-key hex + distinctness, optional parseModelSpec-throw).

# generateCacheKey isolation — UNCHANGED (proves the digest already works; S3 only supplies values)
npx vitest run src/__tests__/unit/cache-key.test.ts -v
# Expected: all pass unchanged.
```

### Level 3: Integration Testing (System Validation)

```bash
# Full suite — the green-suite guarantee is the primary T2.S3 gate
npm test
# Expected: 0 failures. This is the proof that threading the axes broke NOTHING (cache is opt-in; no
# existing test enables it). If an existing test goes red, cache was touched outside executePrompt OR an
# existing test asserts a specific key value with cache enabled — re-read Scope Decision 1 + Gotcha #5.

# Build — proves dist emits with the threaded axes
npm run build
# Expected: exit 0.
```

### Level 4: Contract & Runtime Validation

```bash
# Grep contracts (must all hold)
echo "--- executePrompt cache block MUST thread harness + provider ---"
grep -nE "harness: resolvedHarness|modelSpec\.provider|parseModelSpec\(|getGlobalHarnessConfig\(" src/core/agent.ts
echo "--- stream() must NOT be touched (no cacheInputs/generateCacheKey there) ---"
awk 'NR>=354 && NR<=553' src/core/agent.ts | grep -nE "cacheInputs|generateCacheKey|harness: resolvedHarness|parseModelSpec" || echo "CLEAN ✓"
echo "--- only ONE cacheInputs build-site in agent.ts (executePrompt) ---"
grep -c "cacheInputs: CacheKeyInputs" src/core/agent.ts   # expect 1
echo "--- cache-key.ts UNCHANGED (P1.M3.T1.S1 already added the fields + append) ---"
grep -nE "harness\?: HarnessId|provider\?: ModelProviderId|inputs\.harness !== undefined|inputs\.provider !== undefined" src/cache/cache-key.ts

# Runtime spot-check is covered by the 'Agent cache key isolation' vitest cases (Task 4):
#   - same prompt on pi then claude-code → both execute (MISS) + captured keys differ;
#   - identical (harness, model) twice → second is a HIT (execute once);
#   - same model NAME different provider → both execute (MISS);
#   - bare model shares the key with the explicit anthropic/<model> form (default 'anthropic').
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (the two imports resolve; `resolvedHarness` assignable to `harness?`;
      `parseModelSpec(...).provider` assignable to `provider?`).
- [ ] `npm test` exits 0 — new `agent-cache-key-isolation.test.ts` green AND the existing suite green
      (unchanged — cache is opt-in).
- [ ] `npm run build` exits 0.
- [ ] grep: `harness: resolvedHarness` + `parseModelSpec(` + `getGlobalHarnessConfig(` present in
      executePrompt's cache block; NO `cacheInputs`/`generateCacheKey`/`parseModelSpec` edit in `stream()`;
      exactly ONE `cacheInputs: CacheKeyInputs` build-site in agent.ts.

### Feature Validation

- [ ] The `cacheInputs` literal includes `harness: resolvedHarness` and `provider:` derived from
      `parseModelSpec(effectiveModel, getGlobalHarnessConfig().defaultModelProvider)`.
- [ ] `defaultModelProvider` is read from `getGlobalHarnessConfig()` (the canonical singleton), NOT the
      legacy `getGlobalProviderConfig()` bridge.
- [ ] Cache entries are isolated per `(harness, provider, model)`: `pi` vs `claude-code` on the same
      prompt/model → distinct keys (both MISS); `anthropic/x` vs `openai/x` (same model name) → distinct
      keys; identical tuple → cache HIT (PRD §7.14.5).
- [ ] A bare model (`claude-sonnet-4`) resolves provider `'anthropic'` and shares the key with the
      explicit `anthropic/claude-sonnet-4` (PRD §7.8 default resolution).
- [ ] No behavioral change for non-caching callers (cache opt-in; existing suite green unchanged).

### Code Quality Validation

- [ ] Follows existing agent.ts conventions (inline comments, local `const` naming, error style).
- [ ] Imports added at the top of agent.ts from the correct definition modules (harness-config.js,
      model-spec.js).
- [ ] Form A (named locals) preferred for readability; the two axes are commented with PRD § references.
- [ ] No scope creep into `stream()`, `cache-key.ts`, the `CacheKeyInputs` type, the S1 resolution/fetch/
      throw/hooks/request/execute blocks, the constructor, AgentConfig, PromptOverrides, any existing
      test, or `src/index.ts`.

### Documentation & Deployment

- [ ] The cache block comments explain the two axes, the `defaultModelProvider` source, and the
      parseModelSpec fail-fast behavior (point to PRD §7.14.5 / §7.8).
- [ ] No new environment variables, dependencies, or config files.

---

## Anti-Patterns to Avoid

- ❌ Don't read `defaultModelProvider` from `getGlobalProviderConfig()` (the legacy bridge) — that returns
  `GlobalProviderConfig` which has NO `defaultModelProvider` field (only `defaultProvider` = the harness
  id). Read from `getGlobalHarnessConfig().defaultModelProvider` (Decision 2).
- ❌ Don't wrap `parseModelSpec` in a try/catch that silently sets `provider = undefined` — it masks config
  errors and causes cache collisions (keys collapse across providers). Let it propagate (fail-fast,
  Decision 3); cache is opt-in so no existing test reaches it.
- ❌ Don't edit `cache-key.ts` — P1.M3.T1.S1 already added `CacheKeyInputs.harness?`/`provider?` AND the
  `generateCacheKey` conditional-append. S3 only supplies values at the Agent call-site. Editing
  cache-key.ts is out of scope and would duplicate/conflict with P1.M3.T1.S1.
- ❌ Don't add caching to `stream()` or factor the build into a shared helper — `stream()` does NOT cache
  (S2's scope) and a refactor is out of scope (Decision 1). Edit the single executePrompt literal only.
- ❌ Don't re-resolve the harness at the build-site — `resolvedHarness` is already in scope from S1's
  resolution block; reuse it (Gotcha #6).
- ❌ Don't edit any existing test — cache is opt-in and no existing agent test enables it, so threading the
  axes changes the key for ZERO existing paths (Gotcha #5). Only the NEW test file is added.
- ❌ Don't forget to reset `defaultCache` in the new test's `beforeEach` — it's a module singleton shared
  across the suite; without reset, a prior test's entry masquerades as a HIT (Gotcha #9).
- ❌ Don't import `getGlobalHarnessConfig` from the `provider-config.js` shim — it's NOT re-exported there.
  Import from `'../utils/harness-config.js'` (the definition module, Decision 5).
- ❌ Don't touch the `CacheKeyInputs` type — it already has both optional fields (P1.M3.T1.S1).

---

## Confidence Score

**9.5/10** for one-pass implementation success. The change is mechanically a 2-field addition to a single
object literal inside `executePrompt`'s `if (cacheEnabled)` block + two value imports + one new test file.
The `generateCacheKey` isolation is **already proven** by `cache-key.test.ts`'s 9-case describe block
(P1.M3.T1.S1) — S3 only supplies the values at the Agent call-site. The single load-bearing subtlety — the
`defaultModelProvider` source (Decision 2) — is fully resolved: the legacy bridge lacks the field, so it's
read from the canonical `getGlobalHarnessConfig().defaultModelProvider`, which gracefully defaults to
`undefined` → `parseModelSpec` falls back to `'anthropic'` for bare models (proven by `model-spec.ts` L68
+ `utils/model-spec.test.ts`). **Zero existing-test risk** is proven: `enableCache` is opt-in
(`agent.ts` L636), `grep "enableCache: true" src/__tests__/` returns 0 hits, and no agent test asserts a
cache-key value (Gotcha #5 / research §5). The `parseModelSpec` throw (Decision 3) is the one behavioral
edge — documented + optionally pinned by the new test's case 6. The only residual risks are (i) the
defaultCache reset API in the new test (the implementer verifies it via `grep` in Task 0/Task 4 — fully
mitigated), and (ii) the parallel S1 dependency (S3 assumes `resolvedHarness` is in scope at the
build-site — mitigated by Task 0's pre-flight grep + baseline gate).
