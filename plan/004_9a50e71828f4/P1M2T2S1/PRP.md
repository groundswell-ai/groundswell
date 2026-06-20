# PRP — P1.M2.T2.S1: `configureHarnesses` + `getGlobalHarnessConfig` + `resolveHarnessConfig` (dual cascade)

**PRD reference:** §7 Agent Harness System — esp. §7.6 (`GlobalHarnessConfig` + `configureHarnesses`),
§7.7 (Configuration Cascade — harness axis), §7.1 (pi is default), §7.8 (`defaultModelProvider`
resolves unqualified model strings; harness NEVER in model string). **Plan:**
`plan/004_9a50e71828f4/` — sole subtask of P1.M2.T2 (Harness configuration cascade utilities).
**Scope tag:** NEW CONFIG UTILITY MODULE + DEPRECATED ALIAS DELEGATION + TEST REWRITE.
**No behavioral change** to existing consumers.

> **READ THE "SCOPE DECISION" SECTION BELOW BEFORE WRITING ANY CODE.** It explains why the
> deprecated `configureProviders`/`getGlobalProviderConfig` CANNOT share the harness singleton
> (incompatible validation domains: `'anthropic'`/`'opencode'` vs `'pi'`/`'claude-code'`) and why
> a **dual-singleton** design is the only build-green path while `agent.ts` + 4 test files still
> use the legacy `'anthropic'`/`'opencode'` literals. Implementing a single shared singleton
> blindly WILL break agent.ts and 4 test files this task is forbidden from editing.

---

## Goal

**Feature Goal:** Create `src/utils/harness-config.ts` — the v1.2 canonical harness-configuration
module — exposing the **dual-cascade** utilities `configureHarnesses` / `getGlobalHarnessConfig` /
`resolveHarnessConfig` (operating on `GlobalHarnessConfig` / `HarnessId` / `HarnessOptions`),
plus deprecated `configureProviders` / `getGlobalProviderConfig` / `resolveProviderConfig` /
`resetGlobalConfig` aliases that delegate to the new functions where type-safe (resolution) and
preserve legacy behavior where the validation domains diverge (configuration storage). The old
`src/utils/provider-config.ts` becomes a thin re-export shim so every existing consumer
(`agent.ts`, `utils/index.ts`, 4 test files) keeps compiling with **zero edits**.

**Deliverable:**
1. `src/utils/harness-config.ts` (NEW) — contains:
   - **Harness cascade**: module-private `globalHarnessConfig` singleton; `DEFAULT_HARNESS_CONFIG =
     { defaultHarness: 'pi' as HarnessId }`; `configureHarnesses()` (strict validation:
     `defaultHarness ∈ {'pi','claude-code'}` + `harnessDefaults` keys ∈ `HarnessId`);
     `getGlobalHarnessConfig()`; `resolveHarnessConfig()` returning `{ harness, options }`;
     `resetGlobalHarnessConfig()`.
   - **Deprecated legacy aliases** (`configureProviders` / `getGlobalProviderConfig` /
     `resolveProviderConfig` / `resetGlobalConfig`) with their own `globalProviderConfig`
     singleton + permissive `ProviderId`-superset validation. `resolveProviderConfig` DELEGATES
     to `resolveHarnessConfig` via field-name translation.
2. `src/utils/provider-config.ts` (REWRITTEN → re-export shim) re-exporting the 4 legacy aliases
   from `./harness-config.js`.
3. `src/utils/index.ts` (MODIFIED) — add the 3 new harness exports (keep `configureProviders`).
4. `src/__tests__/unit/utils/provider-config.test.ts` → renamed to `harness-config.test.ts`
   (history-preserving `git mv`) and REWRITTEN to test the new harness cascade (PRD §7.7 ordering)
   plus a backward-compat section for the deprecated aliases + the shim.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`, excludes `src/__tests__`) exits 0 — `agent.ts` (the only
   non-test consumer of the legacy aliases) still compiles via the `provider-config.js` shim.
2. `npm test` (`vitest run`) exits 0 — the 4 legacy test files + `agent.ts`-driven integration
   tests stay green via the shim; the rewritten `harness-config.test.ts` validates PRD §7.7.
3. `npm run build` exits 0 — `dist/utils/harness-config.{js,d.ts}` emitted.
4. Contract verification: `grep -rn "configureHarnesses\|resolveHarnessConfig\|getGlobalHarnessConfig" src/utils/harness-config.ts` → hits; `grep -rn "provider-config\.js" src/` → only the shim + shim consumers (no stale self-reference).

---

## ⚠️ SCOPE DECISION — Dual-singleton (why `configureProviders` keeps its own storage)

The contract's LOGIC clause says: *"Export deprecated `configureProviders`/
`getGlobalProviderConfig`/`resolveProviderConfig` aliases delegating to the new fns."* A naive
"single shared singleton" implementation **BREAKS THE BUILD / TESTS**. This task ships a
**dual-singleton** design (legacy aliases keep their own storage + permissive validation;
`resolveProviderConfig` genuinely delegates to `resolveHarnessConfig`) and defers true singleton
unification to the tasks that own its prerequisites. The implementer MUST give the legacy
`configureProviders` its OWN `globalProviderConfig` variable; it MUST NOT call `configureHarnesses`.

### Proof a single shared singleton breaks the build (verified in the live tree)

1. **The new and legacy functions validate disjoint id sets.**
   - NEW `configureHarnesses` rejects anything not in `{'pi','claude-code'}`.
   - LEGACY consumers pass `'anthropic'` / `'opencode'` as `defaultProvider`:
     - `src/__tests__/integration/provider-switching.test.ts:278,361,454,627` →
       `configureProviders({ defaultProvider: 'opencode' })` and `'anthropic'`.
     - `src/__tests__/unit/agent-prompt-provider-override.test.ts:153,314,352,494` → same.
     - `src/__tests__/unit/agent-stream-provider-override.test.ts:167,331,372` → same.
   - If `configureProviders` delegated to `configureHarnesses`, these calls would THROW
     `"Invalid default harness"` → 4 test suites fail. This task is forbidden from editing them.

2. **`agent.ts` reads the legacy singleton and destructures `{ provider, options }`.**
   - `agent.ts:110-111`: `const globalConfig = getGlobalProviderConfig(); const resolved =
     resolveProviderConfig(globalConfig, this.providerId, this.providerOptions);`
   - `agent.ts:357`: `const { provider: resolvedProvider, options: resolvedProviderOptions } =
     resolveProviderConfig(...)` then `registry.get(effectiveProvider)` with the literal
     `'anthropic'`/`'opencode'`.
   - P3.M1.T1 owns the agent→harness rewire; this task MUST NOT touch `agent.ts`. So the legacy
     `getGlobalProviderConfig`/`resolveProviderConfig` MUST keep returning `{ defaultProvider }` /
     `{ provider, options }` with the legacy literals intact.

3. **The two DEFAULT constants diverge by design.**
   - Harness default (PRD §7.1): `defaultHarness: 'pi'` (vendor-neutral).
   - Legacy default (existing `provider-config.ts`): `defaultProvider: 'anthropic'` — relied on
     by `provider-config.test.ts` assertions and by agent.ts's fallback resolution.
   - A shared singleton cannot honor both defaults for the unconfigured (`null`) case.

### Resolution — dual singleton; delegate only where it is type-safe

- **`resolveProviderConfig` delegates to `resolveHarnessConfig`.** ✅ SAFE: `resolveHarnessConfig`
  is a **pure function that performs NO id validation** (only `configureHarnesses` validates). It
  treats ids as opaque string keys for the `harnessDefaults?.[harness]` lookup. So
  `resolveProviderConfig` translates its `GlobalProviderConfig` argument → `GlobalHarnessConfig`
  shape (rename `defaultProvider`→`defaultHarness`, `providerDefaults`→`harnessDefaults`; unsound
  but runtime-safe `as HarnessId` casts for the opaque id keys), invokes `resolveHarnessConfig`,
  then maps `{ harness, options }` → `{ provider, options }`. This satisfies the contract's
  "delegating to the new fns" for the resolution path with zero behavioral change.
- **`configureProviders` / `getGlobalProviderConfig` / `resetGlobalConfig`** keep a SEPARATE
  module-private `globalProviderConfig: GlobalProviderConfig | null` singleton with the existing
  permissive `ProviderId`-superset validation + legacy `DEFAULT_PROVIDER_CONFIG`. They are
  documented `@deprecated → configureHarnesses / getGlobalHarnessConfig`.

> Net: this honors the contract's INTENT (new dual-cascade utilities exist; the deprecated
> aliases live in the new file and delegate where type-safe) and lands literal singleton
> unification for free downstream — once **P3.M1** rewires `agent.ts` to read the harness path and
> **P4.M1** removes the `'anthropic'`/`'opencode'` literals, the legacy singleton is deleted and
> the aliases collapse to true delegation. This is the only path that ships green.

---

## User Persona

**Target User:** Groundswell core maintainers + downstream PRP agents:
- **P3.M1.T1** — `Agent` constructor harness resolution. The `Agent` will call
  `getGlobalHarnessConfig()` + `resolveHarnessConfig(globalConfig, agentHarness, agentOptions,
  promptHarness, promptOptions)` and then `HarnessRegistry.get(effectiveHarness)`.
- **P3.M1.T2** — `executePrompt` / `stream` per-call harness resolution.
- **P3.M3.T1.S1** — public API surface; will re-export `configureHarnesses` /
  `getGlobalHarnessConfig` / `resolveHarnessConfig` from `src/index.ts`.

**Use Case:** v1.2 (PRD §7) splits the single `Provider` axis into two INDEPENDENT axes — the
harness runtime (`pi` | `claude-code`) and the LLM provider/model (`anthropic`, `openai`, …).
Application startup calls `configureHarnesses({ defaultHarness: 'pi', defaultModelProvider:
'anthropic', harnessDefaults: {...} })` ONCE; every `Agent` inherits it via the §7.7 cascade
unless explicitly overridden at the agent or prompt level.

**Pain Points Addressed:** Today the only global config is `configureProviders` (conflated
provider/harness axis, default `'anthropic'`). There is no way to express "runtime = pi,
LLM host = anthropic" independently. This task adds that capability without breaking the legacy
entry point.

---

## Why

- **Unblocks P3.M1 (Agent harness rewire).** The `Agent` class needs `getGlobalHarnessConfig` +
  `resolveHarnessConfig` to implement the §7.7 cascade. Without them, P3.M1 cannot start.
- **Realizes PRD §7.6 / §7.7.** The dual cascade (harness independent of model/provider) is the
  defining v1.2 architecture; this task is its configuration substrate.
- **Backward-compatible by construction.** The `provider-config.ts` shim + preserved legacy
  aliases mean `agent.ts`, `utils/index.ts`, and 4 test files keep working unchanged.
- **Low-risk, reversible.** Pure additive config utilities + a re-export shim + one rewritten
  test. No runtime behavior change for existing consumers.

---

## What

1. CREATE `src/utils/harness-config.ts` (see Implementation Blueprint for the full body):
   - Harness cascade: `globalHarnessConfig` singleton, `DEFAULT_HARNESS_CONFIG`,
     `isValidHarnessId`, `configureHarnesses`, `getGlobalHarnessConfig`, `resolveHarnessConfig`,
     `resetGlobalHarnessConfig`.
   - Deprecated legacy aliases (moved from `provider-config.ts`): `globalProviderConfig`
     singleton, `DEFAULT_PROVIDER_CONFIG`, `isValidProviderId` (superset), `configureProviders`,
     `getGlobalProviderConfig`, `resolveProviderConfig` (delegates to `resolveHarnessConfig`),
     `resetGlobalConfig`.
2. REWRITE `src/utils/provider-config.ts` → a `@deprecated` re-export shim sourcing all 4 legacy
   aliases from `./harness-config.js`.
3. MODIFY `src/utils/index.ts` — add `export { configureHarnesses, getGlobalHarnessConfig,
   resolveHarnessConfig, resetGlobalHarnessConfig } from './harness-config.js';` (leave the
   existing `configureProviders` line pointing at `./provider-config.js` — it still works via the
   shim).
4. `git mv src/__tests__/unit/utils/provider-config.test.ts src/__tests__/unit/utils/harness-config.test.ts`
   and REWRITE it to test the new harness cascade (PRD §7.7 ordering) + backward-compat for the
   deprecated aliases + shim resolution.

### Success Criteria

- [ ] `src/utils/harness-config.ts` exists; exports `configureHarnesses`, `getGlobalHarnessConfig`,
      `resolveHarnessConfig`, `resetGlobalHarnessConfig` AND the 4 deprecated aliases.
- [ ] `src/utils/provider-config.ts` is a re-export shim (no own logic).
- [ ] `npm run lint` exits 0 (agent.ts compiles via shim).
- [ ] `npm test` exits 0 (4 legacy test files + agent integration tests green; rewritten
      harness-config.test.ts validates §7.7).
- [ ] `npm run build` exits 0; `dist/utils/harness-config.{js,d.ts}` emitted.
- [ ] `resolveProviderConfig` return value is byte-for-byte equivalent to the pre-task behavior
      (verified by the unchanged 4 legacy test files passing).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: a developer who has never seen this repo can implement S1 using only
(a) this PRP, (b) read-only access to `src/utils/provider-config.ts` (the file being migrated),
`src/types/harnesses.ts` (target types), and `src/types/providers.ts` (legacy alias types), and
(c) the complete copy-paste-ready bodies in the Implementation Blueprint. The load-bearing
non-obvious detail — **why `configureProviders` cannot share the harness singleton** — is spelled
out in the Scope Decision above and in `research/consumer-and-design-analysis.md §4`.

### Documentation & References

```yaml
# MUST READ — the authoritative contract.
- url: PRD.md §7  (repo root; identical content in plan/004_9a50e71828f4/prd_snapshot.md)
  why: §7.6 GlobalHarnessConfig + configureHarnesses; §7.7 cascade ordering (prompt ?? agent ??
       global.defaultHarness); §7.1 pi is default; §7.8 defaultModelProvider (open set, no
       validation) + "harness never in model string".
  critical: §7.7's nullish-coalescing makes PROMPT win (first-defined-wins), NOT global. The
            contract's LOGIC clause is explicit: `prompt ?? agent ?? globalConfig.defaultHarness`.

# MUST READ — the file being migrated (legacy logic moves INTO harness-config.ts).
- file: src/utils/provider-config.ts
  why: Holds the 4 legacy functions + the module-private singleton pattern this task generalizes.
        Line map: L36 `let globalConfig`; L43 DEFAULT_CONFIG (defaultProvider:'anthropic');
        L65 isValidProviderId; L159 configureProviders; L228 getGlobalProviderConfig;
        L245 resetGlobalConfig; L338 resolveProviderConfig (the PURE cascade algorithm to preserve).
  pattern: preserve the EXACT validation error-message format ("Invalid default provider: "X".
           Supported providers: ..."anthropic", "opencode"") so the 4 legacy tests' regex
           assertions (/Invalid default provider/i, /Supported providers:/) still match.
  gotcha: the legacy DEFAULT_CONFIG sets providerDefaults: undefined explicitly — preserve that.

# MUST READ — the target types (already shipped by P1.M1.T1.S2).
- file: src/types/harnesses.ts
  why: Defines HarnessId ('pi'|'claude-code'), GlobalHarnessConfig (defaultHarness +
        harnessDefaults? + defaultModelProvider?), HarnessOptions (5 fields), ModelProviderId
        (open set). Import these TYPES from here.
  pattern: "import type { GlobalHarnessConfig, HarnessId, HarnessOptions } from '../types/harnesses.js';"
  gotcha: defaultModelProvider is an OPEN ModelProviderId set — do NOT validate it in
          configureHarnesses (any string is valid). Only validate defaultHarness + harnessDefaults keys.

# MUST READ — the legacy alias types (ProviderId superset, GlobalProviderConfig, ProviderOptions).
- file: src/types/providers.ts
  why: Defines ProviderId = HarnessId | 'anthropic' | 'opencode' (SUPERSET), GlobalProviderConfig
        (defaultProvider + providerDefaults?), ProviderOptions (superset of HarnessOptions — adds
        session* fields). The legacy aliases import these.
  critical: ProviderId is a SUPERSET — the legacy isValidProviderId MUST accept 'pi'/'claude-code'
            too (so a caller can configure a harness id through the legacy API). Acceptance of the
            full superset keeps forward-compat and matches the P1.M1.T3.S1 alias semantics.

# MUST READ — this task's ground-truth consumer + design analysis.
- file: plan/004_9a50e71828f4/P1M2T2S1/research/consumer-and-design-analysis.md
  why: §2 enumerates every consumer of provider-config.ts (the green-contract); §4 is the decisive
        proof that a single shared singleton breaks the build; §5 is the shim pattern; §6 the
        type-compat facts enabling resolveProviderConfig delegation.
  critical: READ §4 BEFORE editing — do NOT make configureProviders call configureHarnesses.

# MUST READ — the parallel predecessor PRP (registry rename) — establishes the alias/shim pattern
#             and confirms agent.ts is OUT OF SCOPE until P3.M1.
- file: plan/004_9a50e71828f4/P1M2T1S2/PRP.md
  why: Its "Approach A" (keep alias superset types, defer literal collapse to P2/P3/P4) is the
        template for THIS task's dual-singleton Scope Decision. Its Hand-off Notes name
        P1.M2.T2.S1 as owning "configureHarnesses / resolveHarnessConfig" and confirm
        provider-config.ts is the target file.
  critical: S2 renames src/harnesses/provider-registry.ts → harness-registry.ts and edits
            src/harnesses/index.ts + src/index.ts. It does NOT touch src/utils/. No merge conflict.

# SHOULD READ — the model-spec sibling (same utils/ dir; shows established utils patterns + barrel).
- file: src/utils/model-spec.ts
  why: Same directory, same coding style (JSDoc + throw-on-invalid + open-set validation). Its
        open-set validation (reject empty, no closed-union check) is the model for
        configureHarnesses' harnessDefaults key handling being strict on HarnessId while
        defaultModelProvider stays open.

# The shim target barrel + the test being renamed.
- file: src/utils/index.ts            # MODIFY: add the 3 new harness exports (keep configureProviders).
- file: src/__tests__/unit/utils/provider-config.test.ts   # → harness-config.test.ts (git mv + rewrite)
  why: the existing test body is the SPEC for the legacy aliases' behavior (error-message format,
        default values, cascade cases) — port the relevant backward-compat assertions and ADD the
        new harness-cascade assertions.
```

### Current Codebase tree (relevant slice — verified in working tree)

```bash
src/utils/
├── provider-config.ts        # ← REWRITE → re-export shim (logic MOVES to harness-config.ts)
├── model-spec.ts             # untouched (style reference)
├── index.ts                  # MODIFY: add harness exports
└── ... (restart-analysis, agent-validation, delay, id, observable, session-serialization)
src/types/
├── harnesses.ts              # GlobalHarnessConfig / HarnessId / HarnessOptions  (IMPORT FROM HERE — no edit)
└── providers.ts              # ProviderId superset / GlobalProviderConfig / ProviderOptions       (IMPORT FROM HERE — no edit)
src/core/agent.ts             # NOT touched — imports resolveProviderConfig/getGlobalProviderConfig via shim (P3.M1 owns rewire)
src/utils/index.ts            # MODIFY (add harness exports)
src/__tests__/unit/utils/
├── provider-config.test.ts   # ← RENAMED (git mv) → harness-config.test.ts  + REWRITTEN
src/__tests__/{integration,unit}/  # 4 legacy test files (provider-switching, provider-agent,
                                   #   agent-prompt-provider-override, agent-stream-provider-override)
                                   #   import configureProviders/resetGlobalConfig from provider-config.js
                                   #   → NO EDIT (kept green via shim)
```

### Desired Codebase tree with files to be added/changed

```bash
src/utils/harness-config.ts                          # NEW — harness cascade + deprecated legacy aliases (moved from provider-config.ts)
src/utils/provider-config.ts                         # REWRITE → @deprecated re-export shim sourcing from ./harness-config.js
src/utils/index.ts                                   # MODIFY — add configureHarnesses/getGlobalHarnessConfig/resolveHarnessConfig/resetGlobalHarnessConfig
src/__tests__/unit/utils/harness-config.test.ts      # NEW name (git mv) + REWRITE — tests harness cascade (§7.7) + legacy alias backward-compat + shim
# (No other files touched. agent.ts, the 4 legacy test files, types/*, harnesses/* — all unchanged.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Do NOT make configureProviders delegate to configureHarnesses.
//   configureHarnesses validates defaultHarness ∈ {'pi','claude-code'}; the legacy consumers
//   pass 'anthropic'/'opencode' (provider-switching.test.ts, agent-prompt/stream-*.test.ts,
//   agent.ts). Delegation would throw and break 4 test suites + agent.ts. Give configureProviders
//   its OWN globalProviderConfig singleton + permissive ProviderId-superset validation.
//   (See Scope Decision + research/consumer-and-design-analysis.md §4.)

// CRITICAL #2 — resolveProviderConfig CAN and SHOULD delegate to resolveHarnessConfig.
//   resolveHarnessConfig performs NO id validation (only configureHarnesses does) — it treats ids
//   as opaque string keys for harnessDefaults?.[harness]. So translate GlobalProviderConfig →
//   GlobalHarnessConfig (rename fields; cast ids `as HarnessId` — unsound but runtime-safe) and
//   map the {harness,options} result back to {provider,options}. This satisfies the contract's
//   "delegating to the new fns" for the resolution path with zero behavioral change.

// CRITICAL #3 — preserve the legacy error-message format EXACTLY.
//   The 4 legacy tests assert /Invalid default provider/i, /Supported providers:/, and that the
//   message contains the bad value in quotes and the words "anthropic" + "opencode". Keep:
//     `Invalid default provider: "${value}". Supported providers: "anthropic", "opencode"`
//   (and the analogous "Invalid provider in providerDefaults: ..." for bad keys).
//   The NEW configureHarnesses uses its OWN message format:
//     `Invalid default harness: "${value}". Supported harnesses: "pi", "claude-code"`

// GOTCHA #4 — isValidProviderId (legacy) must accept the FULL ProviderId superset.
//   ProviderId = HarnessId | 'anthropic' | 'opencode'. The legacy validator must therefore accept
//   'pi' AND 'claude-code' too (not just 'anthropic'/'opencode'). This keeps forward-compat: a
//   caller can configure a harness id via the legacy API during the migration window.

// GOTCHA #5 — `npm run lint` EXCLUDES src/__tests__ (tsconfig "exclude"). It validates ONLY
//   non-test src/ (harness-config.ts, provider-config.ts shim, utils/index.ts, agent.ts, types/).
//   Test correctness is validated ONLY by `npm test` (vitest/esbuild — transpile-only; a type
//   error in a test does NOT fail the run unless a runtime assertion fires). Run BOTH gates.

// GOTCHA #6 — isolatedModules: true. Use `import type { ... }` for type-only imports
//   (GlobalHarnessConfig, HarnessId, HarnessOptions, GlobalProviderConfig, ProviderId,
//   ProviderOptions). The codebase already follows this convention.

// GOTCHA #7 — The harness DEFAULT is 'pi' (PRD §7.1); the legacy DEFAULT is 'anthropic'. Do NOT
//   unify them. DEFAULT_HARNESS_CONFIG = { defaultHarness: 'pi' as HarnessId };
//   DEFAULT_PROVIDER_CONFIG = { defaultProvider: 'anthropic' as ProviderId, providerDefaults: undefined }.

// GOTCHA #8 — resolveHarnessConfig/resolveProviderConfig are PURE (take globalConfig as a param,
//   do NOT read the singleton). Keep them pure — agent.ts reads the singleton via
//   getGlobalProviderConfig() and passes it in. This purity is what makes resolveProviderConfig's
//   delegation to resolveHarnessConfig safe (no singleton coupling).

// GOTCHA #9 — ProviderOptions is a SUPERSET of HarnessOptions (adds sessionStore/sessionPersistence/
//   sessionTtl/sessionPath). The `{...globalDefaults, ...agentOptions, ...promptOptions}` spread
//   therefore yields a ProviderOptions-compatible object; the `options as ProviderOptions` cast on
//   resolveProviderConfig's return is sound. (HarnessOptions lacks the session fields, so casting
//   the OTHER way — ProviderOptions as HarnessOptions — would be unsound; avoid it.)

// GOTCHA #10 — The §7.7 diagram lists global→agent→prompt top-down as "priority for defaults",
//   but nullish-coalescing makes PROMPT win. Follow the CONTRACT: `prompt ?? agent ?? global`.
//   This matches the existing resolveProviderConfig algorithm (byte-for-byte rename).

// GOTCHA #11 — The shim provider-config.ts MUST re-export ALL 4 legacy names (configureProviders,
//   getGlobalProviderConfig, resolveProviderConfig, resetGlobalConfig) — agent.ts imports 2 of them,
//   utils/index.ts re-exports 1, the 4 legacy tests import various. Missing one = resolution error.
```

---

## Implementation Blueprint

### Data models and structure

No new data models. This task CONSUMES the types from `src/types/harnesses.ts`
(`GlobalHarnessConfig`, `HarnessId`, `HarnessOptions`) and `src/types/providers.ts`
(`GlobalProviderConfig`, `ProviderId`, `ProviderOptions`). It introduces two module-private
singletons + two DEFAULT constants + two id validators.

```ts
// harness-config.ts — type imports (isolatedModules → use `import type`)
import type {
  GlobalHarnessConfig,
  HarnessId,
  HarnessOptions,
} from '../types/harnesses.js';
import type {
  GlobalProviderConfig,
  ProviderId,
  ProviderOptions,
} from '../types/providers.js';
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — confirm a clean tree (parallel S2 task may be in flight; this task
    touches src/utils/ which S2 does NOT — no conflict, but start from a known state).
  - RUN: `grep -n "export interface GlobalHarnessConfig" src/types/harnesses.ts` — expect a hit
    (P1.M1.T1.S2 prerequisite). If absent, STOP.
  - RUN: `grep -n "export type ProviderId" src/types/providers.ts` — expect the superset
    `HarnessId | 'anthropic' | 'opencode'`. If absent, STOP (P1.M1.T3.S1 prerequisite).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before touching anything.

Task 1: CREATE src/utils/harness-config.ts — Part A (harness cascade)
  - FILE: src/utils/harness-config.ts (NEW).
  - IMPORT (type-only, isolatedModules):
        import type { GlobalHarnessConfig, HarnessId, HarnessOptions } from '../types/harnesses.js';
  - SINGLETON: `let globalHarnessConfig: GlobalHarnessConfig | null = null;` (module-private).
  - DEFAULT: `const DEFAULT_HARNESS_CONFIG: GlobalHarnessConfig = { defaultHarness: 'pi' as HarnessId };`
  - VALIDATOR:
        function isValidHarnessId(value: string): value is HarnessId {
          return value === 'pi' || value === 'claude-code';
        }
        function getSupportedHarnessesList(): string { return '"pi", "claude-code"'; }
  - configureHarnesses(config: GlobalHarnessConfig): void
      • Validate defaultHarness: if !isValidHarnessId(config.defaultHarness) → throw
        `Invalid default harness: "${config.defaultHarness}". Supported harnesses: ${getSupportedHarnessesList()}`.
      • Validate harnessDefaults keys (if present): for each key, if !isValidHarnessId(key) → throw
        `Invalid harness in harnessDefaults: "${key}". Supported harnesses: ${getSupportedHarnessesList()}`.
      • Do NOT validate defaultModelProvider (open ModelProviderId set — PRD §7.8).
      • Store: globalHarnessConfig = config.
  - getGlobalHarnessConfig(): GlobalHarnessConfig → `return globalHarnessConfig ?? DEFAULT_HARNESS_CONFIG;`
  - resolveHarnessConfig(globalConfig, agentHarness?, agentOptions?, promptHarness?, promptOptions?):
        { harness: HarnessId; options: HarnessOptions }
      • const harness = promptHarness ?? agentHarness ?? globalConfig.defaultHarness;
      • const globalDefaults = globalConfig.harnessDefaults?.[harness];
      • const options: HarnessOptions = { ...(globalDefaults ?? {}), ...(agentOptions ?? {}),
        ...(promptOptions ?? {}) };
      • return { harness, options };
  - resetGlobalHarnessConfig(): void → globalHarnessConfig = null;

Task 2: APPEND to src/utils/harness-config.ts — Part B (deprecated legacy aliases)
  - IMPORT (type-only):
        import type { GlobalProviderConfig, ProviderId, ProviderOptions } from '../types/providers.js';
  - SINGLETON: `let globalProviderConfig: GlobalProviderConfig | null = null;` (module-private, SEPARATE).
  - DEFAULT: `const DEFAULT_PROVIDER_CONFIG: GlobalProviderConfig = { defaultProvider: 'anthropic' as ProviderId, providerDefaults: undefined };`
  - VALIDATOR (SUPERSET — accepts harness ids too):
        function isValidProviderId(value: string): value is ProviderId {
          return value === 'anthropic' || value === 'opencode' || value === 'pi' || value === 'claude-code';
        }
        function getSupportedProvidersList(): string { return '"anthropic", "opencode"'; }
    NOTE: getSupportedProvidersList keeps the LEGACY message text (the 4 legacy tests assert the
    message contains "anthropic" + "opencode"). Do NOT add 'pi'/'claude-code' to the LIST string.
  - configureProviders(config: GlobalProviderConfig): void   [DELEGATES TO STORAGE ONLY — NOT configureHarnesses]
      • Validate defaultProvider: if !isValidProviderId(config.defaultProvider) → throw
        `Invalid default provider: "${config.defaultProvider}". Supported providers: ${getSupportedProvidersList()}`.
      • Validate providerDefaults keys (if present): for each key, if !isValidProviderId(key) → throw
        `Invalid provider in providerDefaults: "${key}". Supported providers: ${getSupportedProvidersList()}`.
      • Store: globalProviderConfig = config.
    Add `@deprecated Since v1.2. Use {@link configureHarnesses}.` JSDoc.
  - getGlobalProviderConfig(): GlobalProviderConfig → `return globalProviderConfig ?? DEFAULT_PROVIDER_CONFIG;`
    Add `@deprecated Since v1.2. Use {@link getGlobalHarnessConfig}.` JSDoc.
  - resolveProviderConfig(globalConfig, agentProvider?, agentOptions?, promptProvider?, promptOptions?):
        { provider: ProviderId; options: ProviderOptions }    [DELEGATES TO resolveHarnessConfig]
      • Translate GlobalProviderConfig → GlobalHarnessConfig shape:
          const harnessGlobal: GlobalHarnessConfig = {
            defaultHarness: globalConfig.defaultProvider as HarnessId,
            harnessDefaults: globalConfig.providerDefaults as Partial<Record<HarnessId, HarnessOptions>> | undefined,
          };
      • const { harness, options } = resolveHarnessConfig(
          harnessGlobal,
          agentProvider as HarnessId | undefined,
          agentOptions as HarnessOptions | undefined,
          promptProvider as HarnessId | undefined,
          promptOptions as HarnessOptions | undefined,
        );
      • return { provider: harness as ProviderId, options: options as ProviderOptions };
    Add `@deprecated Since v1.2. Use {@link resolveHarnessConfig}.` JSDoc. Note in the JSDoc that it
    delegates to resolveHarnessConfig (the cascade algorithm is shared).
  - resetGlobalConfig(): void → globalProviderConfig = null;
    Add `@deprecated Since v1.2. Use {@link resetGlobalHarnessConfig}.` JSDoc.
  - GOTCHA: the casts `as HarnessId` are unsound but runtime-safe — resolveHarnessConfig treats ids
    as opaque string keys (no validation, just harnessDefaults?.[harness] lookup). The legacy
    'anthropic'/'opencode' literals pass through unchanged and are returned as `provider`.

Task 3: REWRITE src/utils/provider-config.ts → re-export shim
  - REPLACE the entire file contents with:
        /**
         * Global provider configuration — DEPRECATED shim.
         *
         * @deprecated Since v1.2. All logic has moved to {@link ./harness-config.js}.
         * Use `configureHarnesses` / `getGlobalHarnessConfig` / `resolveHarnessConfig` directly.
         * This module remains only so existing imports (agent.ts, utils/index.ts, tests) keep
         * resolving during the harness-vocabulary migration. Removed when P3.M1 rewires agent.ts.
         */
        export {
          configureProviders,
          getGlobalProviderConfig,
          resolveProviderConfig,
          resetGlobalConfig,
        } from './harness-config.js';
  - VERIFY: `grep -n "^export\|^function\|^let\|^const" src/utils/provider-config.ts` → ONLY the
    single re-export block (no leftover logic).

Task 4: MODIFY src/utils/index.ts — add harness exports
  - ADD a new line (after the existing configureProviders line):
        export { configureHarnesses, getGlobalHarnessConfig, resolveHarnessConfig, resetGlobalHarnessConfig } from './harness-config.js';
  - LEAVE the existing `export { configureProviders } from './provider-config.js';` line UNCHANGED
    (it still resolves via the shim; editing it is out of scope and unnecessary).
  - VERIFY: `grep -n "harness-config\|provider-config" src/utils/index.ts` → both lines present.

Task 5: RENAME + REWRITE the test
  - RUN: `git mv src/__tests__/unit/utils/provider-config.test.ts src/__tests__/unit/utils/harness-config.test.ts`
  - REWRITE src/__tests__/unit/utils/harness-config.test.ts with these sections:
      import { describe, it, expect, afterEach } from 'vitest';
      import {
        configureHarnesses, getGlobalHarnessConfig, resolveHarnessConfig, resetGlobalHarnessConfig,
        // deprecated aliases:
        configureProviders, getGlobalProviderConfig, resolveProviderConfig, resetGlobalConfig,
      } from '../../../../utils/harness-config.js';
      import type { GlobalHarnessConfig, HarnessId, HarnessOptions } from '../../../../types/harnesses.js';
      import type { GlobalProviderConfig, ProviderId, ProviderOptions } from '../../../../types/providers.js';

      // Reset BOTH singletons after each test (they are independent — see Scope Decision).
      afterEach(() => { resetGlobalHarnessConfig(); resetGlobalConfig(); });

      describe('configureHarnesses', ...):
        • valid: defaultHarness 'pi' and 'claude-code' accepted; harnessDefaults with valid keys;
          defaultModelProvider preserved (open set — any string, e.g. 'anthropic'/'openai'/'zai').
        • invalid: defaultHarness 'invalid'/'anthropic'/'opencode' → throws /Invalid default harness/i;
          error contains the bad value + '"pi", "claude-code"'; bad harnessDefaults key → throws
          /Invalid harness in harnessDefaults/i.
      describe('getGlobalHarnessConfig', ...):
        • default (unconfigured) → { defaultHarness: 'pi' } (harnessDefaults/defaultModelProvider undefined).
        • after configureHarnesses({defaultHarness:'claude-code', harnessDefaults:{'claude-code':{apiKey:'x'}}})
          → returns it; same reference across calls; defaultModelProvider round-trips.
        • after resetGlobalHarnessConfig → back to { defaultHarness: 'pi' }.
        • never null/undefined.
      describe('resolveHarnessConfig', ...) — PRD §7.7 cascade:
        • harness = promptHarness ?? agentHarness ?? global.defaultHarness:
            - no overrides → global.defaultHarness.
            - agent only → agentHarness.
            - prompt + agent → promptHarness wins.
        • options merge (last-write-wins): { ...global.harnessDefaults?.[harness], ...agentOptions,
          ...promptOptions }. Verify global base preserved, agent overrides global, prompt overrides all.
        • immutability: inputs not mutated; fresh options object each call.
        • provider-switch scenario (cascade integration): agent picks 'claude-code', prompt overrides
          to 'pi' with custom options → harness='pi', options from pi's harnessDefaults + prompt.
      describe('deprecated aliases — backward compat', ...):
        • configureProviders accepts 'anthropic', 'opencode', 'pi', 'claude-code' (superset);
          rejects 'invalid' with /Invalid default provider/i + message contains 'anthropic'+'opencode'.
        • getGlobalProviderConfig default → { defaultProvider: 'anthropic', providerDefaults: undefined }.
        • resolveProviderConfig returns { provider, options } (NOT {harness}) and delegates to
          resolveHarnessConfig: build a GlobalProviderConfig, call resolveProviderConfig, assert the
          cascade + options merge match resolveHarnessConfig on the translated equivalent.
        • resetGlobalConfig clears the legacy singleton (independent of resetGlobalHarnessConfig).
      describe('provider-config.js shim', ...):
        • import { configureProviders as shimConfigure } from '../../../../utils/provider-config.js';
          assert shimConfigure === configureProviders (same function reference — proves the shim
          re-exports the harness-config.js aliases; this is what keeps agent.ts green).
  - NAMING/PLACEMENT: src/__tests__/unit/utils/harness-config.test.ts.
  - COVERAGE: every new harness fn (happy + error), §7.7 cascade ordering, options merge,
    immutability, both DEFAULT constants, full legacy backward-compat, shim identity.

Task 6: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: grep (contract), npm run lint, npm test, npm run build.
  - ANY failure → most likely a missed shim export, a wrong error-message format, or an accidental
    configureProviders→configureHarnesses delegation. Re-read the Scope Decision.
```

### Implementation Patterns & Key Details

```ts
// === resolveProviderConfig delegates to resolveHarnessConfig (the contract's "delegating" path) ===
// resolveHarnessConfig performs NO id validation — only configureHarnesses does — so the legacy
// 'anthropic'/'opencode' literals flow through as opaque string keys. Safe delegation.
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions,
): { provider: ProviderId; options: ProviderOptions } {
  const harnessGlobal: GlobalHarnessConfig = {
    defaultHarness: globalConfig.defaultProvider as HarnessId,
    harnessDefaults:
      globalConfig.providerDefaults as Partial<Record<HarnessId, HarnessOptions>> | undefined,
  };
  const { harness, options } = resolveHarnessConfig(
    harnessGlobal,
    agentProvider as HarnessId | undefined,
    agentOptions as HarnessOptions | undefined,
    promptProvider as HarnessId | undefined,
    promptOptions as HarnessOptions | undefined,
  );
  return { provider: harness as ProviderId, options: options as ProviderOptions };
}

// === configureProviders keeps its OWN singleton + permissive validation (NOT configureHarnesses) ===
export function configureProviders(config: GlobalProviderConfig): void {
  if (!isValidProviderId(config.defaultProvider)) {            // superset: anthropic|opencode|pi|claude-code
    throw new Error(`Invalid default provider: "${config.defaultProvider}". Supported providers: ${getSupportedProvidersList()}`);
  }
  if (config.providerDefaults) {
    for (const id of Object.keys(config.providerDefaults)) {
      if (!isValidProviderId(id)) {
        throw new Error(`Invalid provider in providerDefaults: "${id}". Supported providers: ${getSupportedProvidersList()}`);
      }
    }
  }
  globalProviderConfig = config;   // SEPARATE singleton — do NOT call configureHarnesses
}

// === The shim (provider-config.ts) — keeps agent.ts + utils/index.ts + 4 tests green ===
export {
  configureProviders, getGlobalProviderConfig, resolveProviderConfig, resetGlobalConfig,
} from './harness-config.js';
```

### Integration Points

```yaml
NEW FILE:
  - src/utils/harness-config.ts : the canonical dual-cascade module (harness fns + legacy aliases).

SHIM (rewritten):
  - src/utils/provider-config.ts : @deprecated re-export of the 4 legacy aliases from ./harness-config.js.

BARREL (modified — additive):
  - src/utils/index.ts : add configureHarnesses/getGlobalHarnessConfig/resolveHarnessConfig/
    resetGlobalHarnessConfig from './harness-config.js'. Leave the configureProviders line as-is.

TEST (renamed + rewritten):
  - src/__tests__/unit/utils/provider-config.test.ts → harness-config.test.ts (git mv + rewrite).

CONSUMERS (kept green via the shim — NO source edits):
  - src/core/agent.ts                  : imports resolveProviderConfig/getGlobalProviderConfig from
                                         '../utils/provider-config.js' (shim). Untouched (P3.M1 owns rewire).
  - src/utils/index.ts                 : re-exports configureProviders from './provider-config.js' (shim).
  - src/__tests__/integration/provider-switching.test.ts        : configureProviders/resetGlobalConfig.
  - src/__tests__/integration/provider-agent.test.ts            : resetGlobalConfig.
  - src/__tests__/unit/agent-prompt-provider-override.test.ts   : configureProviders/resetGlobalConfig.
  - src/__tests__/unit/agent-stream-provider-override.test.ts   : configureProviders/resetGlobalConfig.

NOT IN SCOPE (do not touch — owned downstream):
  - Agent harness field + cascade + HarnessRegistry.get                                → P3.M1.T1
  - AgentConfig.harness / PromptOverrides.harness fields                               → P3.M2
  - Public Harness* exports in src/index.ts                                            → P3.M3.T1.S1
  - AnthropicProvider → ClaudeCodeHarness; PiHarness                                   → P2.M1 / P2.M2
  - Removing the legacy globalProviderConfig singleton + 'anthropic'/'opencode' literals → P3.M1 + P4.M1
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates non-test
> `src/` only: `harness-config.ts`, `provider-config.ts` shim, `utils/index.ts`, `agent.ts`, `types/`).
> `npm test` = `vitest run` (esbuild transpile-only; resolution + assertion failures surface as test
> errors). `npm run build` = `tsc`. No eslint/prettier. **Run BOTH lint and test** — lint covers the
> non-test edit sites (incl. the shim that agent.ts imports); test covers the rewritten test + the 4
> legacy test files + agent integration tests.

### Level 1: Syntax & Type Check (run after Tasks 1–4)

```bash
# Non-test type check — catches a broken shim, a bad cast, or a missing export.
npm run lint
# Expected: exit 0. An error naming agent.ts/provider-config.ts/utils/index.ts = a malformed shim
# (missing export) or an unsound type that doesn't actually compile. Re-read Gotcha #9.
```

### Level 2: Unit Tests (run after Task 5)

```bash
# The rewritten cascade + backward-compat suite
npm test -- src/__tests__/unit/utils/harness-config.test.ts

# The 4 legacy consumers (MUST stay green via the shim — proves zero behavioral change):
npm test -- src/__tests__/integration/provider-switching.test.ts
npm test -- src/__tests__/integration/provider-agent.test.ts
npm test -- src/__tests__/unit/agent-prompt-provider-override.test.ts
npm test -- src/__tests__/unit/agent-stream-provider-override.test.ts

# Full suite (catch anything else — agent.test.ts, workflow-validation, etc.)
npm test
# Expected: all pass. A legacy-test failure almost certainly means the shim is missing an export OR
# the error-message format / DEFAULT constant diverged from the pre-task behavior.
```

### Level 3: Contract Verification (grep gates)

```bash
# New functions exist in harness-config.ts:
grep -n "export function configureHarnesses\|export function getGlobalHarnessConfig\|export function resolveHarnessConfig" src/utils/harness-config.ts
# Expected: 3 hits.

# Deprecated aliases live in harness-config.ts:
grep -n "export function configureProviders\|export function getGlobalProviderConfig\|export function resolveProviderConfig\|export function resetGlobalConfig" src/utils/harness-config.ts
# Expected: 4 hits.

# provider-config.ts is a pure shim (NO own logic — only the re-export block):
grep -c "^export" src/utils/provider-config.ts   # Expected: 1 (the single re-export statement)
grep -nE "^(let|const|function) " src/utils/provider-config.ts   # Expected: empty (no own logic)

# The shim re-exports from harness-config.js (NOT a self-reference / stale path):
grep -n "from './harness-config.js'" src/utils/provider-config.ts   # Expected: 1 hit

# utils/index.ts exports the new harness fns:
grep -n "configureHarnesses\|resolveHarnessConfig\|getGlobalHarnessConfig" src/utils/index.ts   # Expected: 1 line, 3+ symbols
```

### Level 4: Behavioral Spot-Check (delegation + shim identity)

```bash
# Confirm resolveProviderConfig delegates to resolveHarnessConfig AND the shim re-exports the same fn.
npx tsx -e '
  import * as hc from "./src/utils/harness-config.js";
  import * as shim from "./src/utils/provider-config.js";
  // Shim identity — agent.ts relies on this path resolving to the SAME function:
  console.log("shim delegates:", shim.configureProviders === hc.configureProviders);   // true
  console.log("shim resolve:", shim.resolveProviderConfig === hc.resolveProviderConfig); // true
  // resolveProviderConfig delegates to resolveHarnessConfig (legacy shape {provider,options}):
  const legacy = hc.resolveProviderConfig(
    { defaultProvider: "anthropic", providerDefaults: { anthropic: { apiKey: "sk-g" } } },
    "opencode", { timeout: 1000 }, "anthropic", { apiKey: "sk-p" },
  );
  console.log("provider (prompt wins):", legacy.provider);   // anthropic
  console.log("options:", JSON.stringify(legacy.options));    // {"apiKey":"sk-p","timeout":1000}
'
# Expected: shim delegates: true ; shim resolve: true ; provider (prompt wins): anthropic ;
#           options: {"apiKey":"sk-p","timeout":1000}
```

### Level 5: Build (declaration-emit sanity)

```bash
npm run build
# Expected: exit 0; dist/utils/harness-config.js + .d.ts emitted; dist/utils/provider-config.js
# (shim) regenerated.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` exits 0 (agent.ts compiles via the provider-config.js shim).
- [ ] `npm test` exits 0 (rewritten harness-config.test.ts + 4 legacy test files + agent tests).
- [ ] `npm run build` exits 0; `dist/utils/harness-config.{js,d.ts}` emitted.
- [ ] `grep -c "^export" src/utils/provider-config.ts` → 1 (pure shim, no own logic).

### Feature Validation

- [ ] `configureHarnesses` validates `defaultHarness ∈ {'pi','claude-code'}` + `harnessDefaults`
      keys; does NOT validate `defaultModelProvider` (open set).
- [ ] `getGlobalHarnessConfig()` default → `{ defaultHarness: 'pi' }` (PRD §7.1).
- [ ] `resolveHarnessConfig` implements `prompt ?? agent ?? global.defaultHarness` + object-spread
      options merge (PRD §7.7; prompt wins).
- [ ] `resolveProviderConfig` returns `{ provider, options }` (legacy shape) and delegates to
      `resolveHarnessConfig` (verified by the delegation spot-check + the 4 legacy tests passing).
- [ ] `configureProviders`/`getGlobalProviderConfig`/`resetGlobalConfig` preserve pre-task behavior
      (permissive validation, `defaultProvider: 'anthropic'` default, legacy error-message format).
- [ ] The 4 legacy test files pass UNCHANGED (the green-contract — zero behavioral regression).

### Code Quality Validation

- [ ] Dual-singleton design respected (Scope Decision): `configureProviders` has its OWN
      `globalProviderConfig`; it does NOT call `configureHarnesses`.
- [ ] `import type` used for all type-only imports (isolatedModules).
- [ ] `@deprecated` JSDoc on every legacy alias pointing to its harness successor.
- [ ] `git mv` used for the test rename (history preserved).
- [ ] `src/utils/index.ts` change is purely additive (configureProviders line untouched).

### Documentation & Deployment

- [ ] Module-level JSDoc on `harness-config.ts` explains the dual-cascade + the dual-singleton
      rationale (or points to this PRP's Scope Decision).
- [ ] No new environment variables; no config-file changes.

---

## Anti-Patterns to Avoid

- ❌ **Don't make `configureProviders` delegate to `configureHarnesses`.** Strict harness validation
  rejects `'anthropic'`/`'opencode'` and breaks 4 test files + agent.ts. Give it its own singleton
  + permissive superset validation. (See Scope Decision + `research/consumer-and-design-analysis.md §4`.)
- ❌ **Don't unify the two DEFAULT constants.** Harness default is `'pi'` (PRD §7.1); legacy default
  is `'anthropic'`. They diverge by design until P3.M1 rewires agent.ts.
- ❌ **Don't change the legacy error-message format.** The 4 legacy tests assert
  `/Invalid default provider/i`, `/Supported providers:/`, and the literal words `"anthropic"` +
  `"opencode"`. Keep `getSupportedProvidersList()` returning `'"anthropic", "opencode"'`.
- ❌ **Don't make `resolveHarnessConfig` validate ids.** It must stay a pure cascade function (no
  validation) so `resolveProviderConfig` can delegate to it with legacy literals. Validation lives
  ONLY in `configureHarnesses` / `configureProviders`.
- ❌ **Don't touch `agent.ts`, the 4 legacy test files, `types/*`, or `harnesses/*`.** They are kept
  green by the shim + preserved alias behavior. agent.ts rewire is P3.M1; types are P1.M1; the
  registry rename is the parallel S2 task.
- ❌ **Don't drop `resetGlobalConfig` / `resetGlobalHarnessConfig`.** Both singletons need a test
  reset; `afterEach` in the rewritten test must reset BOTH.
- ❌ **Don't cast `ProviderOptions as HarnessOptions`.** That direction is unsound (ProviderOptions
  has extra session fields). The sound direction is the spread result → `as ProviderOptions` (superset).
- ❌ **Don't skip `npm test`.** `npm run lint` excludes `src/__tests__`, so the shim's resolution
  for the 4 legacy test files + the rewritten test is validated ONLY by vitest.
- ❌ **Don't delete-and-recreate the test file** — use `git mv` to preserve blame/history.

---

## Hand-off Notes for Downstream Tasks

- **P3.M1.T1 (Agent harness rewire):** `Agent` will call `getGlobalHarnessConfig()` +
  `resolveHarnessConfig(globalConfig, this.harness, this.harnessOptions, promptHarness,
  promptOptions)` → `{ harness, options }`, then `HarnessRegistry.get(effectiveHarness)`. After this
  lands, agent.ts stops reading the legacy `getGlobalProviderConfig`/`resolveProviderConfig`, and the
  legacy `globalProviderConfig` singleton becomes dead (removable).
- **P3.M1.T2 (per-call resolution):** `executePrompt`/`stream` resolve the harness per-call via
  `resolveHarnessConfig` with the prompt overrides.
- **P3.M2 (AgentConfig/PromptOverrides):** adds `harness`/`harnessOptions` fields — these become the
  `agentHarness`/`agentOptions` and `promptHarness`/`promptOptions` args to `resolveHarnessConfig`.
- **P3.M3.T1.S1 (public API):** re-exports `configureHarnesses`/`getGlobalHarnessConfig`/
  `resolveHarnessConfig` from `src/index.ts`. The `provider-config.ts` shim can be removed once
  agent.ts + the 4 legacy tests are migrated (P3.M1 + P4).
- **P4.M1 (OpenCode removal):** deletes the `'opencode'` literal from `ProviderId`. After it AND
  P3.M1 land, the legacy `globalProviderConfig` singleton + `configureProviders`/`getGlobalProviderConfig`
  aliases can be deleted and `provider-config.ts` removed; the dual-singleton collapses to one.

---

**Confidence Score: 9/10** — Fully specified new module (copy-paste-ready bodies in the Blueprint),
a verified dual-singleton Scope Decision that resolves the incompatible-validation-domains tension
with a documented forward-collapse path (P3.M1 + P4.M1), a shim that keeps the sole non-test
consumer (`agent.ts`) and all 4 legacy test files green with zero edits, genuine delegation for the
resolution path (`resolveProviderConfig` → `resolveHarnessConfig`, verified safe because the latter
does no id validation), and grep + spot-check gates that prove the contract. The one residual risk
is a reviewer expecting a single shared singleton, which the prominent Scope Decision + proof
section addresses explicitly.
