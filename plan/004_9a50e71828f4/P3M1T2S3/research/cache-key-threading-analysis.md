# Research Note — P3.M1.T2.S3: Thread harness + provider into the cache key build-site

> Scope: make the `executePrompt` cache-key build-site (`src/core/agent.ts` ~L637–655) pass
> `harness: resolvedHarness` + `provider: parseModelSpec(effectiveModel, defaultModelProvider).provider`
> into `CacheKeyInputs`, satisfying PRD §7.14.5 (cache isolation per harness+provider+model). Consumed
> downstream by P4.M2.T1.S2 (cache-isolation parity tests).

---

## §1 — The build-site (exactly ONE location)

`grep -n "cacheInputs\|generateCacheKey\|cacheKey" src/core/agent.ts` → the **only** cache build-site is
inside `executePrompt` (~L637–655). `stream()` (~L354–553) does NOT cache (confirmed: no `cacheInputs`
reference in that range; S2's PRP "DO NOT touch the cache-key build-site — S3's scope"). **S3 edits ONE
method, ONE object literal.**

Current build-site (post-S1 executePrompt):

```ts
// agent.ts L630
const effectiveModel = overrides?.model ?? this.model;
// ...
// L636
const cacheEnabled = this.config.enableCache && !overrides?.disableCache;
let cacheKey: string | undefined;

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
  // ... defaultCache.get(cacheKey) → cacheHit/cacheMiss ...
}
```

**Missing:** `harness` and `provider` (both optional on `CacheKeyInputs` since P1.M3.T1.S1). The two
axes that PRD §7.14.5 requires for isolation are simply not threaded yet.

---

## §2 — What P1.M3.T1.S1 already built (S3 only THREADS)

`src/cache/cache-key.ts`:
- L16 `interface CacheKeyInputs` — already has `harness?: HarnessId` (L34) + `provider?: ModelProviderId`
  (L43). Both **optional** (the doc-comments explicitly name P3.M1.T2.S3 as the task that wires them).
- L221 `generateCacheKey(inputs)` — already does conditional append:
  ```ts
  if (inputs.harness !== undefined) normalized.harness = inputs.harness;
  if (inputs.provider !== undefined) normalized.provider = inputs.provider;
  ```
- The `cache-key.test.ts` "cache key isolation — harness + provider" describe block (9 cases) already
  PROVES `generateCacheKey` isolates by harness+provider when they're passed. **So S3 changes nothing in
  cache-key.ts** — it only supplies the values at the Agent build-site.

**Conclusion:** S3 is a 2-field addition to a single object literal + 1–2 imports in agent.ts. No
cache-key.ts edits. No type edits.

---

## §3 — The `defaultModelProvider` source (the load-bearing decision)

### The contract (item description)
> `provider: parseModelSpec(effectiveModel, defaultModelProvider).provider`

`defaultModelProvider` must be a variable sourced from global config. **Two singletons exist** during
the v1.2 migration window:

| Singleton | Setter | Type | Has `defaultModelProvider`? |
|-----------|--------|------|------------------------------|
| `globalProviderConfig` (LEGACY) | `configureProviders()` | `GlobalProviderConfig` (`types/providers.ts` L534) | **NO** — only `defaultProvider: ProviderId` (= the *harness* id, e.g. `'anthropic'`/`'pi'`) + `providerDefaults` |
| `globalHarnessConfig` (CANONICAL) | `configureHarnesses()` | `GlobalHarnessConfig` (`types/harnesses.ts` L460) | **YES** — `defaultModelProvider?: ModelProviderId` (L474) |

`agent.ts` reads the LEGACY bridge at L600 (`getGlobalProviderConfig()` → `globalProviderConfig`), which
S1/S2 KEPT deliberately (their Decision 1 — the legacy singleton keeps the existing test suite green).

### Decision: read `defaultModelProvider` from `getGlobalHarnessConfig()`

Because the legacy `GlobalProviderConfig` does NOT carry `defaultModelProvider`, agent.ts MUST read it
from the canonical harness singleton:

```ts
const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;
```

`getGlobalHarnessConfig()` returns `globalHarnessConfig ?? DEFAULT_HARNESS_CONFIG`. `DEFAULT_HARNESS_CONFIG`
(`harness-config.ts` L63) is `{ defaultHarness: 'pi' }` — it does **NOT** set `defaultModelProvider`, so
the field is `undefined` by default.

**Why undefined is safe:** `parseModelSpec(model, defaultProvider: ModelProviderId = 'anthropic')`
(`model-spec.ts` L68). A TS default parameter fires when the arg is `undefined`, so
`parseModelSpec(effectiveModel, undefined)` resolves bare models against `'anthropic'` — the PRD §7.8
sensible default. Provider-qualified models (`anthropic/x`, `openai/y`) parse the provider from the
string regardless. **So the provider axis is always correctly derived.**

### Both functions are already exported from `src/utils/index.ts`
- L6: `export { configureHarnesses, getGlobalHarnessConfig, resolveHarnessConfig, resetGlobalHarnessConfig } from './harness-config.js';`
- L9: `export { parseModelSpec, formatModelForProvider } from './model-spec.js';`

agent.ts currently imports `resolveProviderConfig, getGlobalProviderConfig` from
`'../utils/provider-config.js'` (L45). **S3 adds** `getGlobalHarnessConfig` + `parseModelSpec` imports.
Cleanest: add `getGlobalHarnessConfig` to the existing provider-config import line is WRONG (it's not
re-exported from provider-config.js) — import it from `'../utils/harness-config.js'` or
`'../utils/index.js'`. Prefer `harness-config.js` (the actual definition module; matches the
module-level direct-import convention). `parseModelSpec` → `'../utils/model-spec.js'`.

---

## §4 — `parseModelSpec` can THROW — behavior at the build-site

`parseModelSpec` throws (`model-spec.ts` L68+) on:
1. empty/whitespace model, OR
2. 3+-segment "harness-qualified" strings (`pi/anthropic/x`) — PRD §7.8 critical rule.

`effectiveModel = overrides?.model ?? this.model`; `this.model` defaults to
`'claude-sonnet-4-20250514'` (valid bare). So parseModelSpec throws ONLY if a caller passes an
invalid `overrides.model` (empty string, whitespace, or a 3-segment string).

**Decision: let it propagate (do NOT wrap in try/catch).** Rationale:
- The contract literally says `parseModelSpec(effectiveModel, defaultModelProvider).provider` — no guard.
- An invalid model string is a genuine configuration error that the harness would fail on anyway at
  L767 (`model: effectiveModel`); throwing earlier during cache-key generation is acceptable fail-fast.
- A silent `catch { provider = undefined }` would MASK config errors AND could cause cache collisions
  (provider omitted when it should be present → keys collapse → wrong cached response served).
- **Zero existing-test risk:** `enableCache` is OPT-IN (`this.config.enableCache && ...`, off by default
  — §5) and NO agent test enables cache. So no existing test path reaches parseModelSpec via the
  build-site.

Document as Gotcha; the new test file should include a `throws on invalid model string` case to lock
the behavior (or at minimum confirm provider-qualified + bare both parse).

---

## §5 — `enableCache` is opt-in → ZERO existing-test breakage

- `agent.ts` L636: `const cacheEnabled = this.config.enableCache && !overrides?.disableCache;`
- `AgentConfig.enableCache?: boolean` (`types/agent.ts` L41) — optional; `undefined && ...` = falsy →
  **cache DISABLED by default**.
- `grep -rn "enableCache: true" src/__tests__/` → **ZERO hits**. No agent test enables the cache.
- No agent-level test asserts a specific cache-key hex value or compares keys across providers
  (the `registry.get('pi')` calls in `agent-prompt-*-override.test.ts` are harness-instance lookups,
  NOT cache reads).

**Therefore:** threading harness+provider into the key changes the key ONLY for callers that opt into
caching — which is currently nobody in the test suite. The existing suite stays green with **no edits**
to any existing test. (The `cache-key.test.ts` isolation block already passes — it tests
`generateCacheKey` directly, unaffected by agent.ts.)

---

## §6 — Test strategy (new file, mirror S1's harness-override mock pattern)

Create `src/__tests__/unit/agent-cache-key-isolation.test.ts`. Mirror `agent-prompt-harness-override.test.ts`:
- `createMockHarness(id, executeImpl?)` helper (clone S1's — structurally compatible with `Provider`,
  accepted by `HarnessRegistry.register`).
- `beforeEach`: `resetGlobalConfig()`; register `pi` + `claude-code` mocks.
- `afterEach`: `HarnessRegistry['_resetForTesting']()`; `resetGlobalConfig()`; **clear the default
  cache** between tests (verify `defaultCache.clear?.()` exists in `src/cache/cache.ts`; if not, spy
  reset). [Implementer: `grep -n "clear\|reset" src/cache/cache.ts` to confirm the reset API.]

### Observable isolation: count `harness.execute` invocations + capture cache keys
- **Harness isolation:** ONE agent `{ enableCache: true }`; two identical prompts with `{ harness: 'pi' }`
  vs `{ harness: 'claude-code' }` → BOTH mocks invoked (cache MISS on the 2nd because the harness axis
  differs). Pre-S3 this would be a cache HIT (2nd execute NOT called) → the test pins the fix.
- **Provider isolation:** two identical prompts with `{ model: 'anthropic/claude-x' }` vs
  `{ model: 'openai/claude-x' }` (same model NAME, different provider) → both execute (MISS). Also
  same-provider same-model twice → HIT (2nd execute NOT called).
- **Bare-model default provider:** `{ model: 'claude-sonnet-4' }` (bare) → resolves provider
  `'anthropic'` (via `parseModelSpec` default since `getGlobalHarnessConfig().defaultModelProvider` is
  undefined). Capture the cache key via `vi.spyOn(defaultCache, 'set')` and assert the key for a bare
  model EQUALS the key for the explicit `anthropic/claude-sonnet-4` (same resolved tuple).
- **Cache HIT round-trip:** same (harness, provider, model) twice → 2nd returns the CACHED
  `AgentResponse` (2nd harness.execute NOT called). Assert via execute-call-count + the
  `cacheHit`/`cacheMiss` workflow events (if run in a workflow ctx) OR execute-count alone.
- **Key capture:** `vi.spyOn(defaultCache, 'set').mock.calls[i][0]` → assert the captured keys differ
  across harness/provider and are equal within the same tuple (direct proof the axes feed the digest).

### Resetting the cache
`defaultCache` is a module singleton (`src/cache/cache.ts`). Tests MUST clear it in `beforeEach` so
cross-test pollution doesn't masquerade as isolation. The implementer verifies the clear API
(`defaultCache.clear()` / `defaultCache['reset']()` / internal map) — `cache.test.ts` shows the pattern.

---

## §7 — Scope boundaries (DO NOT touch)

- **`stream()`** (~L354–553) — S2's scope; does NOT cache. Leave untouched.
- **`cache-key.ts`** — P1.M3.T1.S1 already added the fields + the `generateCacheKey` append. No edits.
- **`executePrompt` harness resolution / fetch / throw / hooks / request / execute** (S1's scope, L600–880
  outside the `if (cacheEnabled)` block) — UNCHANGED. S3 adds fields ONLY to the `cacheInputs` literal
  inside the `if (cacheEnabled)` block.
- **`CacheKeyInputs` type** — already has the fields. No type edit.
- **Constructor / AgentConfig / PromptOverrides** — S1 / P3.M2 scope. Untouched.
- **`src/index.ts`** — P3.M3.T1.S1 scope. Untouched.
- **Existing tests** — all green unchanged (cache opt-in, §5). Only the NEW test file is added.

---

## §8 — Imports needed in agent.ts

Current (L45): `import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';`
Current (L33–34): `import { generateCacheKey, defaultCache } from '../cache/index.js';` +
`import type { CacheKeyInputs } from '../cache/index.js';`

**ADD:**
- `import { getGlobalHarnessConfig } from '../utils/harness-config.js';` (canonical source — NOT in
  provider-config.js shim)
- `import { parseModelSpec } from '../utils/model-spec.js';` (the parser; `formatModelForProvider` not
  needed — S3 only reads `.provider`)

**No new type imports needed** — `CacheKeyInputs.harness: HarnessId` + `.provider: ModelProviderId`
are already satisfied by `resolvedHarness: HarnessId` (string) and `parseModelSpec(...).provider:
ModelProviderId`. `isolatedModules: true` is satisfied (both are value imports, not type-only).

---

## §9 — Confidence

**9.5/10.** The change is mechanically a 2-field addition to one object literal + 2 imports. The
`generateCacheKey` isolation is ALREADY proven by `cache-key.test.ts` (9 cases). The only subtlety is
the `defaultModelProvider` source (§3 — read from `getGlobalHarnessConfig()`, not the legacy bridge),
and that's a single function call returning a field that gracefully defaults. Zero existing-test risk
(cache opt-in, §5). The parseModelSpec throw (§4) is the one behavioral edge — documented + the new
test can pin it.
