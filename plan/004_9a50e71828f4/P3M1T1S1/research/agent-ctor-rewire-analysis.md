# Research Note — P3.M1.T1.S1: Agent constructor harness rewire

Scope of this note: (1) verify the exact current constructor + every ripple site of the
`providerId`/`providerOptions`/`provider` field rename; (2) quantify the test blast radius
of the literal-contract approach vs. a backward-compat bridge; (3) justify the chosen
implementation strategy. Read alongside `PRP.md`.

---

## 1. Current `src/core/agent.ts` — every site the rename touches

`grep` of the three private fields + the registry + the config fns (line numbers are
stable as of this research; re-confirm with the PRP's Task 0 pre-flight grep):

| Line | Code | S1 action |
|------|------|-----------|
| 45   | `import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';` | KEEP (bridge — see §3) |
| 44   | `import type { Provider } from '../types/providers.js';` (the `Provider`-typed field) | REPLACE with `import type { Harness, HarnessId, HarnessOptions } from '../types/harnesses.js';` |
| 43   | `import { ProviderRegistry } from '../harnesses/index.js';` | RENAME → `HarnessRegistry` (also rename the 3 call sites: ctor L119, stream L366, executePrompt L596) |
| 84-86 | field decls `providerId?: ProviderId`, `providerOptions?: ProviderOptions`, `provider: Provider` | RENAME → `harnessId?: HarnessId`, `harnessOptions?: HarnessOptions`, `harness: Harness` |
| 105-124 | ctor: store fields + `resolveProviderConfig` + `ProviderRegistry.get` + throw | REWIRE (see §3 design) |
| 356-366 | `stream()`: reads `this.providerId`/`this.providerOptions`, `ProviderRegistry.getInstance()`, comment "may differ from this.provider" | MINIMAL field-ref + identifier rename (NO logic change — that is T2) |
| 586-605 | `executePrompt()`: same pattern + returns `PROVIDER_NOT_FOUND` on miss | MINIMAL field-ref + identifier rename (NO logic change — that is T2) |

**Critical observation:** `this.provider` (the stored field) is assigned at L124 but is
**never read** anywhere — `stream`/`executePrompt` both re-resolve a *local* `providerInstance`
(L366/L596). So renaming the field `provider`→`harness` has zero behavioural effect beyond
the type. The contract's "holds a Harness instance" is satisfied by mere assignment. Low risk.

**Why `stream`/`executePrompt` MUST be touched at all:** the field rename `providerId`→`harnessId`
forces updating the two `resolveProviderConfig(..., this.providerId, this.providerOptions, ...)`
call sites (L359-360, L589-590) — otherwise they reference a deleted field and `tsc` fails.
The fix is a pure identifier rename (one token each), NOT the full T2 rewire (which swaps
`resolveProviderConfig`→`resolveHarnessConfig`, builds `HarnessRequest`, etc.). Renaming the
`ProviderRegistry` identifier at L366/L596 to `HarnessRegistry` at the same time keeps a
single import (avoids importing both aliases) and is behaviour-identical (`HarnessRegistry`
IS `ProviderRegistry` — `export const ProviderRegistry = HarnessRegistry;`).

---

## 2. Test blast-radius analysis (the deciding factor)

Seven test files construct `new Agent(...)`. Their constructor-resolution dependencies:

| File | Constructor pattern | Under LITERAL contract (`getGlobalHarnessConfig`, default `'pi'`) | Under BRIDGE (`getGlobalProviderConfig`, default `'anthropic'`) |
|------|---------------------|-------------------------------------------------------------------|----------------------------------------------------------------|
| `unit/agent.test.ts` | `new Agent()` (many), registers `'anthropic'` | BREAKS — resolves `'pi'`, not registered | GREEN (resolves `'anthropic'`) — but contract REQUIRES this file's update anyway |
| `unit/agent-tool-executor.test.ts` | `new Agent({mcps})` (no provider), registers `'anthropic'` | BREAKS — resolves `'pi'` | GREEN |
| `unit/agent-prompt-provider-override.test.ts` | `new Agent()` + `configureProviders({...})`, registers `'anthropic'`+`'opencode'` | BREAKS — `configureProviders` ignored by harness singleton; `new Agent()`→`'pi'` | GREEN |
| `unit/agent-stream-provider-override.test.ts` | same as above | BREAKS | GREEN |
| `integration/provider-agent.test.ts` | `configureProviders({defaultProvider:'claude-code'})`, registers AnthropicProvider | BREAKS — legacy singleton ignored | GREEN |
| `integration/provider-switching.test.ts` | `new Agent({})` (L148, no provider) + `new Agent({provider:'nonexistent-provider'})` (L162, asserts THROW) | `new Agent({})`→`'pi'` BREAKS; throw-test still throws | GREEN — `new Agent({})`→`'anthropic'` (registered); throw-test still throws ✓ |
| `unit/workflow-validation.test.ts` | constructs agents | likely BREAKS | GREEN |

**Literal contract ⇒ 6–7 test files need edits (≈15–25 small changes, several requiring
`configureHarnesses` + `'pi'`/`'claude-code'` stub registration and assertion rewrites).
Bridge ⇒ only `agent.test.ts` changes (which the contract mandates regardless).**

The throw-test in `provider-switching.test.ts` (L162: `new Agent({ provider:
'nonexistent-provider' })` expects construction to throw) is the cleanest proof the bridge
preserves behaviour: the constructor's "throw if the resolved harness is not registered"
guard (contract requirement) already exists today as `if (!providerInstance) throw`, so
that test passes unchanged under the bridge.

---

## 3. Chosen strategy — backward-compat bridge (resolveProviderConfig delegates to resolveHarnessConfig)

**The contract names `resolveHarnessConfig(global, this.harnessId, this.harnessOptions)`.**
`src/utils/harness-config.ts` documents and implements that
**`resolveProviderConfig` delegates to `resolveHarnessConfig`** (L23, L166-167, L341-343,
L367-368):

```ts
// harness-config.ts L367-368 (inside resolveProviderConfig)
const { harness, options } = resolveHarnessConfig(harnessGlobal, ...);
```

So calling `resolveProviderConfig(getGlobalProviderConfig(), this.harnessId, this.harnessOptions)`
**does invoke the canonical harness cascade** (`resolveHarnessConfig`) — the only difference
from the literal contract is the *global-config source*: the legacy singleton
(`getGlobalProviderConfig`, default `'anthropic'`, mutated by `configureProviders`) instead of
the harness singleton (`getGlobalHarnessConfig`, default `'pi'`, mutated by `configureHarnesses`).

Using the legacy singleton as the global source is what keeps every `configureProviders`-based
test green. This is the SAME staged-migration posture `harness-config.ts` itself documents:

> "Once P3.M1 rewires agent.ts to read the harness path and P4.M1 removes the legacy literals,
> the legacy singleton can be deleted and the aliases collapse to true delegation."

**S1 therefore rewires the constructor to hold a `Harness` + use `HarnessRegistry.get` + throw
(the contract's essential deliverable), while routing the global-config read through the legacy
singleton so the suite stays green.** T2 (P3.M1.T2) — which owns `executePrompt`/`stream`/cache —
is the natural place to switch agent.ts wholesale to `getGlobalHarnessConfig` +
`configureHarnesses` (and update the ~6 test files to harness vocabulary), because T2 already
has to touch those tests' execute/stream assertions.

### Constructor design (final)

```ts
// Store harness configuration from AgentConfig (PRD §7.9).
// Backward-compat bridge: prefer the new `harness` field; fall back to the legacy
// `provider` field so existing callers (`new Agent({ provider: 'anthropic' })`) keep
// working during the v1.2 migration. The fallback + legacy global-config singleton
// are removed by T2 (P3.M1.T2) when executePrompt/stream + the test suite move to
// `configureHarnesses` / `getGlobalHarnessConfig`.
this.harnessId = config.harness ?? (config.provider as HarnessId | undefined);
this.harnessOptions = config.harnessOptions ?? config.providerOptions;

// Resolve the effective harness via the configuration cascade (PRD §7.7).
// `resolveProviderConfig` delegates to `resolveHarnessConfig` (harness-config.ts L367-368);
// `getGlobalProviderConfig` is used as the global source to honour the legacy
// `configureProviders()` singleton still consumed by executePrompt/stream + the test suite.
const globalConfig = getGlobalProviderConfig();
const { provider: effectiveHarness } = resolveProviderConfig(
  globalConfig,
  this.harnessId,
  this.harnessOptions,
);

// Fetch the harness instance from the registry (HarnessRegistry is the v1.2 rename of
// ProviderRegistry). The cast bridges the legacy `Provider` return type to the `Harness`
// contract — the two are structurally identical at runtime (same method surface); the cast
// exists only because `Provider.id: ProviderId` is a wider type than `Harness.id: HarnessId`.
const registry = HarnessRegistry.getInstance();
const harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
if (!harnessInstance) {
  throw new Error(`Harness '${effectiveHarness}' is not registered`);
}
this.harness = harnessInstance;
```

### Why the `as HarnessId` cast on `config.provider` is runtime-safe (and codebase-consistent)

`config.provider` is `ProviderId` (= `HarnessId | 'anthropic' | 'opencode'`). Casting to
`HarnessId` is *unsound at the type level* but *runtime-safe* because `resolveProviderConfig`
(hence `resolveHarnessConfig`) treats the id as an **opaque string key** (no closed-union
validation — harness-config.ts L343: "resolveHarnessConfig performs NO id validation").
`HarnessRegistry.get(id)` likewise does a raw `Map.get(id)`. So a legacy literal like
`'anthropic'` flows through unchanged and resolves whatever stub is registered under it.
This mirrors the exact cast pattern already used in `resolveProviderConfig` itself
(`globalConfig.defaultProvider as HarnessId`, `agentProvider as HarnessId`).

---

## 4. Type-check verification (done during research)

- `this.harnessId: HarnessId` passed to `resolveProviderConfig(global, agentProvider?: ProviderId, …)`:
  `HarnessId ⊆ ProviderId` ⇒ assignable, **no cast needed**.
- `this.harnessOptions: HarnessOptions` passed to `resolveProviderConfig(…, agentOptions?: ProviderOptions)`:
  `HarnessOptions` ⊆ `ProviderOptions` (ProviderOptions is the superset — same fields + session
  fields) ⇒ assignable, **no cast needed**.
- `config.providerOptions` (`ProviderOptions`) assigned to `this.harnessOptions: HarnessOptions`
  via `??`: structurally assignable (superset→subset for optional-only shapes, no excess-property
  check on non-literals) ⇒ **no cast needed**.
- `registry.get(effectiveHarness)` returns `Provider | undefined`; assigned to `harness: Harness`:
  `Provider` is **NOT** assignable to `Harness` (`Provider.id: ProviderId` is wider than
  `Harness.id: HarnessId`) ⇒ **cast required** (`as Harness | undefined`). Runtime-safe (§3).
- `isolatedModules: true` (tsconfig) ⇒ the 3 new types (`Harness`, `HarnessId`, `HarnessOptions`)
  MUST be `import type`. `HarnessRegistry` is a value import. `resolveProviderConfig` /
  `getGlobalProviderConfig` are value imports (kept).
- `noUnusedLocals` is OFF (tsconfig) ⇒ the now-unused `Provider` type import would NOT error,
  but it is removed for hygiene.

---

## 5. AgentConfig dependency (P3.M2.T1.S1 is "Planned", not done)

Confirmed: `src/types/agent.ts` has `provider?: ProviderId` (L127) and
`providerOptions?: ProviderOptions` (L167) on `AgentConfig`, and the same pair on
`PromptOverrides` (L228, L253). **No `harness`/`harnessOptions` fields exist yet** —
`config.harness` is a `tsc` error today. The contract lists `AgentConfig.harness/harnessOptions
(P3.M2.T1.S1)` as an INPUT, but that work item is `Planned`.

**Resolution:** S1 adds `harness?: HarnessId` + `harnessOptions?: HarnessOptions` to
`AgentConfig` **as a conditional Task gated on a pre-flight grep**. If P3.M2.T1.S1 lands first
(and already added them), the grep detects the fields and the task is skipped — zero conflict.
If it has not landed, S1 adds the two optional fields (a 4-line, self-contained change that is
exactly P3.M2.T1.S1's entire deliverable). Either way the constructor's `config.harness` read
compiles. `PromptOverrides.harness/harnessOptions` are NOT added by S1 (P3.M2.T2.S1 owns those;
the constructor does not read prompt-level overrides).

---

## 6. What stays OUT of scope (T2 / P3.M2 / P3.M3 / P4)

- `executePrompt()` / `stream()` **logic** (cascade-fn swap to `resolveHarnessConfig`,
  `HarnessRequest` construction, `configureHarnesses` migration) → **T2 (P3.M1.T2)**.
  S1 only does the mechanical field/identifier rename so the file compiles.
- Cache-key harness/provider axes → **P3.M1.T2.S3**.
- `PromptOverrides.harness/harnessOptions` → **P3.M2.T2.S1**.
- `src/index.ts` public-export sweep → **P3.M3.T1.S1**.
- Removing the legacy `configureProviders` singleton + `Provider`/`ProviderId` literals → **P4**.
- The executePrompt `PROVIDER_NOT_FOUND` error path/message (L598-604) → T2 (left as-is; only the
  constructor's throw message moves to harness vocabulary, per contract).
