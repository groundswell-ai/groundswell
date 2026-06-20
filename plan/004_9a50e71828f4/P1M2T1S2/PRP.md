# PRP — P1.M2.T1.S2: Rename `ProviderRegistry` → `HarnessRegistry` (keyed by HarnessId)

**PRD reference:** §7 Agent Harness System — esp. §7.2 (`HarnessId`), §7.3 (`Harness` interface),
§7.6 (`GlobalHarnessConfig` + the `HarnessRegistry` successor). **Plan:**
`plan/004_9a50e71828f4/` — second subtask of P1.M2.T1 (Relocate provider modules and rename
registry). **Scope tag:** SYMBOL + FILE RENAME + DEPRECATED ALIAS + VOCABULARY MIGRATION.
The `InitializationStatus` enum and **all lifecycle logic are kept VERBATIM**.

**Prerequisite (verified in tree):** P1.M2.T1.S1 is **COMPLETE** — `src/harnesses/` exists
with the 5 relocated files (`anthropic-provider.ts`, `opencode-provider.ts`,
`provider-registry.ts`, `session-store.ts`, `index.ts`); `src/providers/` is gone; every
import specifier repo-wide already points at `…/harnesses/…`. This task renames the
**registry file + class** inside that relocated dir and threads the new name through the
two barrels + 22 test import paths.

> **READ THE "SCOPE DECISION" SECTION BELOW BEFORE WRITING ANY CODE.** It explains a
> load-bearing deviation from the literal contract wording (`Map<HarnessId, Harness>`)
> that is REQUIRED to keep the build green. Implementing the literal type-change blindly
> WILL break `agent.ts` and ~20 test files.

---

## Goal

**Feature Goal:** Rename the singleton registry class `ProviderRegistry` → `HarnessRegistry`,
rename its file `provider-registry.ts` → `harness-registry.ts` (history-preserving `git mv`),
export a deprecated `ProviderRegistry = HarnessRegistry` alias (type **and** value), adopt the
harness vocabulary in all JSDoc/comments, and update both barrels (`src/harnesses/index.ts`,
`src/index.ts`) to export `HarnessRegistry`. **The `InitializationStatus` enum and all
lifecycle logic (method names, signatures, bodies, promise-caching, parallel init/terminate)
are kept VERBATIM.** Existing consumers keep compiling unchanged via the alias.

**Deliverable:**
1. `src/harnesses/harness-registry.ts` (renamed from `provider-registry.ts`) exporting:
   - `enum InitializationStatus` (unchanged)
   - `class HarnessRegistry` (renamed; body unchanged except class-name self-references + JSDoc)
   - `type ProviderRegistry = HarnessRegistry` + `const ProviderRegistry = HarnessRegistry` (deprecated alias)
2. `src/harnesses/index.ts` barrel exports `HarnessRegistry` AND keeps `ProviderRegistry` (alias) + `InitializationStatus` + session-store exports.
3. `src/index.ts` re-exports `HarnessRegistry` (and keeps `ProviderRegistry`) from the new path.
4. All 22 test files' `provider-registry.js` import specifiers rewritten to `harness-registry.js`
   (incl. the 2 dynamic `await import(...)` calls in `opencode-provider-deprecation.test.ts`).
5. The renamed unit test `src/__tests__/unit/providers/harness-registry.test.ts` (renamed from
   `provider-registry.test.ts`) passes **against the `ProviderRegistry` alias** (verifies backward compat).

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `src/core/agent.ts` (the only non-test consumer)
   still compiles against the `ProviderRegistry` alias.
2. `npm test` (`vitest run`) exits 0 — all 22 test files resolve `harness-registry.js`; the
   renamed `harness-registry.test.ts` passes via the alias.
3. `npm run build` exits 0 — `dist/harnesses/harness-registry.js` + `.d.ts` emitted.
4. Contract verification: `grep -rn "provider-registry\.js" src/` → **empty** (no stale module path).
5. Alias verification: `grep -rn "export.*HarnessRegistry" src/harnesses/index.ts src/index.ts` → both export it.

---

## ⚠️ SCOPE DECISION — Why the Map stays `Map<ProviderId, Provider>` in S2

The contract's LOGIC clause says *"Change `Map<ProviderId,Provider>`→`Map<HarnessId,Harness>`;
update all method signatures `(id: HarnessId, provider: Harness)`."* **A strict, literal
implementation of this type-change BREAKS THE BUILD.** S2 ships a **vocabulary migration**
(class/file rename + alias + JSDoc) and **defers the strict type-narrowing** to the tasks that
own its prerequisites. The implementer MUST NOT write `Map<HarnessId, Harness>` /
`register(harness: Harness)` / `get(id: HarnessId)` in the S2 commit.

### Proof a literal type-change breaks the build (verified in the live tree)

1. **Adapters still carry legacy ids — not `HarnessId`:**
   - `src/harnesses/anthropic-provider.ts:69` → `readonly id: ProviderId = "anthropic";`
   - `src/harnesses/opencode-provider.ts:99` → `readonly id: ProviderId = "opencode";`
   - `ProviderId = HarnessId | 'anthropic' | 'opencode'` is a SUPERSET. `Provider.id: ProviderId`
     is wider than `Harness.id: HarnessId` → a `Provider` is **NOT assignable** to `Harness`.
   - Therefore `register(harness: Harness)` type-errors on every `registry.register(adapter)`.

2. **`agent.ts` looks providers up by `ProviderId` — and rewiring it is P3.M1's job, not S2's:**
   - `resolveProviderConfig(...): { provider: ProviderId; ... }` (`src/utils/provider-config.ts:344`).
   - `agent.ts:84` `private readonly providerId?: ProviderId;` ; `agent.ts:119/366/596`
     `registry.get(effectiveProvider)` with a `ProviderId` argument.
   - `get(id: HarnessId)` → `ProviderId` is not assignable to `HarnessId` → **`npm run lint`
     FAILS**. S2 may not ship red; the agent→harness rewire is explicitly P3.M1.T1.S1
     ("Agent: harness field + cascade + HarnessRegistry.get").

3. **~20 test files register `Provider`-typed mocks** with ids `'anthropic'`/`'opencode'` and
   call `registry.get('anthropic')` etc. Strict `Map<HarnessId, Harness>` would force rewriting
   every mock id → `'pi'`/`'claude-code'`, mock type → `Harness`, and every literal lookup —
   which is P2.M1's job (adapter id renames) and **contradicts the contract's own OUTPUT clause**:
   *"existing … provider-registry.test.ts (update path + rename) passes against the alias."*
   Minimal-change + alias-passing is only possible if the registry still accepts `ProviderId`/`Provider`.

### Resolution — S2 adopts the vocabulary, keeps the alias types (Approach A)

Keep the Map and **all** method signatures on the deprecated alias types
(`ProviderId`, `Provider`, `ProviderOptions`, `GlobalProviderConfig`) — which today are the
**superset** the live adapters/agent/tests use. Rename the **class** and **file**, export the
`ProviderRegistry` alias, rewrite JSDoc/comments to "harness". This:

- keeps `npm run lint` green (`agent.ts` `get(ProviderId)` still compiles),
- keeps all 20 registry-consuming tests passing (`Provider` mocks / `ProviderId` literals valid),
- exports the alias so every existing `import { ProviderRegistry }` resolves, and
- sets up **automatic collapse**: once **P2.M1** (adapters → `id: HarnessId`), **P3.M1**
  (agent rewire), and **P4.M1** (remove legacy `'anthropic'`/`'opencode'` literals) land, the
  `Provider`/`ProviderId` aliases collapse toward `Harness`/`HarnessId` and the registry becomes
  `Map<HarnessId, Harness>` with **zero further edits to this file** (it already imports the
  alias types).

> Net: S2 honors the **intent** (the registry is now the `HarnessRegistry`, named and documented
> in the harness vocabulary, alias-backed) and lands the **literal type-change for free** in the
> downstream tasks that own its prerequisites. This is the only path that ships green.

---

## User Persona

**Target User:** Groundswell core maintainers + downstream PRP agents:
- **P1.M2.T2.S1** — `configureHarnesses()` / `getGlobalHarnessConfig` / `resolveHarnessConfig`
  (lives in `src/utils/provider-config.ts`; operates on `GlobalHarnessConfig`, the successor to
  the registry's `initializeAll(config: GlobalProviderConfig)` param).
- **P2.M1 / P2.M2** — rename `AnthropicProvider`→`ClaudeCodeHarness`, add `PiHarness` (these are
  the adapters the registry stores; once they adopt `id: HarnessId`, the strict narrowing unlocks).
- **P3.M1** — Agent harness rewire (`Agent` resolves a harness via `HarnessRegistry.get`).

**Use Case:** The v1.2 harness axis (PRD §7) renames the runtime registry concept from "provider"
to "harness". The registry is the singleton every `Agent` resolves its runtime through; renaming
it (while keeping a deprecated alias) lets new code use `HarnessRegistry` and old code keep
compiling during the migration window.

**Pain Points Addressed:** The class/file still named `Provider*` misrepresents the v1.2 model
(harness ⊥ provider). A clean rename + alias unblocks downstream harness-vocabulary work
(P1.M2.T2, P2, P3) without forcing a flag-day rewrite of all consumers.

---

## Why

- **Unblocks P1.M2.T2.S1 / P2 / P3.** Those tasks reference `HarnessRegistry` by name; landing
  the rename + alias first means they import the real symbol while existing code keeps working.
- **Mechanical + reversible.** `git mv` preserves history; the class rename is a localized
  find/replace inside one file; the alias is 2 lines. Fully revertable.
- **Backward-compatible by construction.** The `ProviderRegistry` alias (type + const) keeps
  `agent.ts`, all 20 test files, and the public barrel (`src/index.ts`) resolving unchanged.
- **Does not change runtime behavior.** Enum verbatim, logic verbatim, types (alias superset)
  verbatim → no behavioral risk, only naming/vocabulary.

---

## What

1. `git mv src/harnesses/provider-registry.ts src/harnesses/harness-registry.ts`.
2. Inside the renamed file: rename `class ProviderRegistry` → `class HarnessRegistry` and every
   internal self-reference (`private static instance: HarnessRegistry`, `getInstance():
   HarnessRegistry`, `new HarnessRegistry()`, `HarnessRegistry.instance = null as any`). Add the
   deprecated `ProviderRegistry` alias (type + const) at the bottom. Rewrite JSDoc prose to the
   harness vocabulary ("harness instance", "HarnessId"). **Keep the `InitializationStatus` enum,
   every method name, every method body, and every type annotation (`ProviderId`, `Provider`,
   `ProviderOptions`, `GlobalProviderConfig`, `ProviderInitState`, `BatchInitResult`) VERBATIM.**
3. Update barrel `src/harnesses/index.ts`: `export { HarnessRegistry, ProviderRegistry, InitializationStatus } from './harness-registry.js';` (new path + new symbol; keep session-store exports).
4. Update `src/index.ts:118`: `export { HarnessRegistry, ProviderRegistry } from './harnesses/harness-registry.js';` (fix path + add `HarnessRegistry`; keep alias).
5. Rewrite the `provider-registry.js` → `harness-registry.js` module specifier across all 22 test
   files (incl. the 2 dynamic `await import(...)` in `opencode-provider-deprecation.test.ts`).
6. `git mv src/__tests__/unit/providers/provider-registry.test.ts src/__tests__/unit/providers/harness-registry.test.ts` (its import path was already fixed in step 5; body unchanged — it exercises the `ProviderRegistry` alias).

### Success Criteria

- [ ] `src/harnesses/harness-registry.ts` exists; `git log --follow` shows history from `provider-registry.ts`.
- [ ] `HarnessRegistry` class exported; `ProviderRegistry` alias exported (type + const); `InitializationStatus` unchanged.
- [ ] No method renamed; no type annotation changed to `Harness*`; enum + lifecycle logic byte-for-byte identical.
- [ ] Both barrels export `HarnessRegistry` and (alias) `ProviderRegistry`.
- [ ] `grep -rn "provider-registry\.js" src/` → empty.
- [ ] `npm run lint` exits 0; `npm test` exits 0; `npm run build` exits 0.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: a developer who has never seen this repo can execute S2 using only
(a) this PRP, (b) the exact reference enumeration below (every file + line verified by grep), (c)
the copy-paste recipes in the Implementation Blueprint, and (d) the validation commands. The
load-bearing non-obvious detail — **why the Map must stay `Map<ProviderId, Provider>`** — is
spelled out in the Scope Decision above and in `research/reference-enumeration.md §4`.

### Documentation & References

```yaml
# MUST READ — the authoritative contract.
- url: PRD.md §7  (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md)
  why: §7.2 HarnessId, §7.3 Harness interface, §7.6 names the HarnessRegistry successor.
  critical: §7.6's HarnessRegistry is the TARGET vocabulary this rename adopts; the strict
            Map<HarnessId,Harness> typing is gated on P2.M1/P3.M1 (see Scope Decision).

# MUST READ — this task's ground-truth reference enumeration + the type-compat proof.
- file: plan/004_9a50e71828f4/P1M2T1S2/research/reference-enumeration.md
  why: §2 lists every file importing provider-registry.js (the path-rewrite edit set);
       §3 lists production symbol consumers (kept green via alias); §4 is the decisive proof
       that strict Map<HarnessId,Harness> breaks the build; §5 is the alias pattern; §6 toolchain.
  critical: READ §4 BEFORE editing — do NOT write Map<HarnessId, Harness>.

# MUST READ — predecessor (S1) PRP. Its OUTPUT is this task's INPUT.
- file: plan/004_9a50e71828f4/P1M2T1S1/PRP.md
  why: S1 relocated src/providers→src/harnesses and rewrote every import to …/harnesses/… .
       Its Hand-off Notes (tail) describe S2 as "Rename ProviderRegistry→HarnessRegistry,
       re-key by HarnessId, update the barrel exports." NOTE: S1's hand-off mused about
       "initializeProvider→initializeHarness" — the authoritative CONTRACT says keep lifecycle
       logic VERBATIM, so DO NOT rename methods. Follow the contract, not the hand-off aside.

# MUST READ — the alias shim that makes Approach A collapse for free downstream.
- file: src/types/providers.ts
  why: defines ProviderId = HarnessId | 'anthropic' | 'opencode' (superset) and the deprecated
       Provider alias (kept CONCRETE, not = Harness, because adapters still carry legacy ids).
  critical: this is WHY the registry can stay on ProviderId/Provider now and become
            Map<HarnessId,Harness> automatically once P2.M1/P4.M1 collapse the aliases.

# MUST READ — the registry source being renamed.
- file: src/harnesses/provider-registry.ts   # → src/harnesses/harness-registry.ts
  why: the file you are renaming + editing. Enum + class + singleton + promise-caching lifecycle.
  pattern: keep enum + method names + method bodies + type annotations VERBATIM; rename only the
           class + its internal self-references; add alias; refresh JSDoc prose.
  gotcha: the contract's research note lists "terminateProvider" — the source has terminateAll()
          ONLY (no per-harness terminate). Follow the source.

# The two barrels to update.
- file: src/harnesses/index.ts   # barrel: add HarnessRegistry to the export list + fix path
- file: src/index.ts             # L118: fix path + add HarnessRegistry (keep ProviderRegistry alias)
  gotcha: src/index.ts is tagged "(P3.M3)" in the contract — P3.M3.T1.S1 owns the COMPREHENSIVE
          public Harness surface. S2 does the MINIMUM here (fix the now-broken path + export
          HarnessRegistry); P3.M3 will add the full Harness* type surface later. Do not remove
          the ProviderRegistry alias export — workflow-validation.test.ts imports it from here.

# The renamed test (verifies the alias).
- file: src/__tests__/unit/providers/provider-registry.test.ts   # → harness-registry.test.ts
  why: contract says it must "pass against the alias" with only path + rename. Body stays as-is
       (uses ProviderRegistry alias, Provider mocks, 'anthropic'/'opencode' ids) — that IS the
       backward-compat verification.
```

### Current Codebase tree (relevant slice — POST-S1, verified in working tree)

```bash
src/harnesses/                       # relocated by S1 (src/providers/ is GONE)
├── provider-registry.ts             # ← RENAMED (git mv) → harness-registry.ts  [THIS TASK]
├── anthropic-provider.ts            # untouched (id: ProviderId = "anthropic"; P2.M1 renames)
├── opencode-provider.ts             # untouched (id: ProviderId = "opencode";  P4.M1 deletes)
├── session-store.ts                 # untouched
└── index.ts                         # MODIFY: export HarnessRegistry + alias; fix path
src/types/
├── harnesses.ts                     # HarnessId / Harness / GlobalHarnessConfig (P1.M1) — NOT touched
└── providers.ts                     # alias shim (P1.M1.T3.S1) — NOT touched
src/core/agent.ts                    # NOT touched — consumes ProviderRegistry via barrel alias (P3.M1 owns rewire)
src/index.ts                         # MODIFY L118: fix path + export HarnessRegistry (keep alias)
src/__tests__/unit/providers/
├── provider-registry.test.ts        # ← RENAMED → harness-registry.test.ts  (body unchanged)
└── (21 other test files)            # MODIFY: import path provider-registry.js → harness-registry.js
src/__tests__/integration/{provider-switching,provider-agent}.test.ts  # MODIFY import path
src/__tests__/unit/{agent,agent-tool-executor,agent-prompt-provider-override,agent-stream-provider-override}.test.ts  # MODIFY import path
# src/__tests__/unit/workflow-validation.test.ts imports ProviderRegistry from '../../index.js' → NO path edit
```

### Desired Codebase tree with files to be changed

```bash
src/harnesses/harness-registry.ts                  # NEW name (git mv); class renamed; alias added; JSDoc refreshed
src/harnesses/index.ts                             # MODIFY export list + path
src/index.ts                                       # MODIFY L118 export list + path
src/__tests__/unit/providers/harness-registry.test.ts   # NEW name (git mv); import path fixed; body unchanged
# 21 test files: import path provider-registry.js → harness-registry.js (sed)
#  2 dynamic imports in opencode-provider-deprecation.test.ts also rewritten (sed catches them)
# Total: 1 file renamed+edited (registry), 1 file renamed (test), 2 barrels edited, ~21 test files path-edited.
```

### Known Gotchas of our codebase & Library Quirks

```bash
# CRITICAL #1 — DO NOT write Map<HarnessId, Harness> / register(harness: Harness) / get(id: HarnessId).
#   See Scope Decision. Strict typing breaks agent.ts (lint) + 20 test files. Keep the alias
#   superset types (ProviderId/Provider/ProviderOptions/GlobalProviderConfig) on the Map + sigs.

# CRITICAL #2 — The deprecated alias MUST be type+const (not just const).
#   Tests use ProviderRegistry as a VALUE (getInstance(), _resetForTesting(), toBeInstanceOf(...))
#   AND as a TYPE (const instances: ProviderRegistry[]). A bare `const` lacks the type binding.
#   Declare BOTH (TS allows same name in type + value namespaces):
#       export type ProviderRegistry = HarnessRegistry;
#       export const ProviderRegistry = HarnessRegistry;   // inferred typeof HarnessRegistry (has statics)

# CRITICAL #3 — Do NOT rename ANY method. The contract says "Keep InitializationStatus enum and
#   all lifecycle logic VERBATIM." S1's hand-off note mused about initializeProvider→initializeHarness;
#   IGNORE that — keep register/get/has/initializeProvider/initializeAll/terminateAll/getStatus/
#   isReady/getAllStatuses/_resetForTesting/_resetInitStateForTesting exactly as-is.

# GOTCHA #4 — "terminateProvider" in the contract's research note DOES NOT EXIST in the source.
#   The registry has terminateAll() only (parallel termination of all harnesses; clears maps).
#   Do not add a terminateProvider method. Follow the source.

# GOTCHA #5 — The path-rewrite sed must target the MODULE SPECIFIER, not the symbol.
#   `provider-registry.js` (lowercase, hyphenated, .js) is the import path. `ProviderRegistry`
#   (CamelCase, no .js) is the symbol/alias — KEEP IT. Use `s#provider-registry\.js#harness-registry.js#g`
#   which cannot match `ProviderRegistry`.

# GOTCHA #6 — Dynamic imports exist and must be caught. opencode-provider-deprecation.test.ts
#   L248 + L265 use `await import('../../../harnesses/provider-registry.js')`. The sed (matching
#   `provider-registry.js`) rewrites them. Verify with grep after.

# GOTCHA #7 — `npm run lint` EXCLUDES src/__tests__ (tsconfig exclude). It validates ONLY non-test
#   src/ (src/harnesses/**, src/core/agent.ts, src/index.ts, src/types/**). Test import paths are
#   validated ONLY by `npm test` (vitest/esbuild — resolution failure = test error). Run BOTH.

# GOTCHA #8 — src/index.ts is tagged "(P3.M3)" in the contract. P3.M3.T1.S1 owns the COMPREHENSIVE
#   public Harness surface. S2 does the MINIMUM in src/index.ts: fix the now-broken path (file was
#   renamed) + add HarnessRegistry to the export. Keep the ProviderRegistry alias export
#   (workflow-validation.test.ts imports it from '../../index.js'). P3.M3 will expand the surface later.

# GOTCHA #9 — Two "harnesses" things coexist; do not conflate:
#     src/harnesses/harness-registry.ts  → the relocated adapter DIRECTORY's registry file (THIS TASK)
#     src/types/harnesses.ts             → the Harness* TYPE definitions (P1.M1.T1, NOT touched)
#   The registry imports its types from '../types/providers.js' (the alias shim), NOT from
#   '../types/harnesses.js'. Leave that import unchanged (Approach A keeps alias types).

# GOTCHA #10 — The renamed test harness-registry.test.ts must keep using the ProviderRegistry ALIAS
#   symbol (that is the point — it verifies backward compat). Do not rewrite its mock ids to
#   'pi'/'claude-code' or its mock type to Harness; that is P2.M1's job and would violate the
#   contract's "passes against the alias (update path + rename)" clause.

# GOTCHA #11 — tsconfig.tsbuildinfo (root) is a tsc incremental cache; may show modified after
#   build. Optionally `rm -f tsconfig.tsbuildinfo` before lint/build for a clean recheck.
```

---

## Implementation Blueprint

### Data models and structure

**None change.** The `InitializationStatus` enum, `ProviderInitState`, `BatchInitResult` are kept
VERBATIM. The Map stays `Map<ProviderId, Provider>` (alias superset — see Scope Decision). This
task is a rename + alias + vocabulary migration + import-path rewrite. No runtime behavior change.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — confirm src/harnesses/ has the 5 S1 files and src/providers/ is gone.
  - RUN: `ls src/harnesses/provider-registry.ts` — confirm the file exists at the post-S1 path.
  - RUN: `grep -n "export class ProviderRegistry" src/harnesses/provider-registry.ts` — expect a hit.
  - RUN: `grep -n "export type ProviderId" src/types/providers.ts` — confirm alias shim present
    (expect `export type ProviderId = HarnessId | 'anthropic' | 'opencode';`). If absent, STOP —
    P1.M1.T3.S1 has not landed; this task depends on it.
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before touching anything.

Task 1: RENAME the registry file (history-preserving)
  - RUN: `git mv src/harnesses/provider-registry.ts src/harnesses/harness-registry.ts`
  - VERIFY: `git status --short` shows one `R` rename.
  - VERIFY: `git log --follow --oneline -- src/harnesses/harness-registry.ts | head` (history survived).

Task 2: EDIT src/harnesses/harness-registry.ts — rename class + add alias + refresh JSDoc
  - RENAME class: `ProviderRegistry` → `HarnessRegistry` for the class declaration AND every
    internal self-reference:
      `private static instance: HarnessRegistry;`
      `public static getInstance(): HarnessRegistry { if (!HarnessRegistry.instance) { HarnessRegistry.instance = new HarnessRegistry(); } return HarnessRegistry.instance; }`
      `_resetForTesting(): HarnessRegistry.instance = null as any;`
  - KEEP VERBATIM (do NOT touch): the `InitializationStatus` enum; `ProviderInitState`;
    `BatchInitResult`; every method name and body; every type annotation on the Map + signatures
    (`Map<ProviderId, Provider>`, `Map<ProviderId, ProviderInitState>`, `register(provider: Provider)`,
    `get(id: ProviderId)`, `has(id: ProviderId)`, `initializeProvider(id: ProviderId, options?:
    ProviderOptions)`, `initializeAll(config: GlobalProviderConfig)`, `getStatus(id: ProviderId)`,
    `isReady(id: ProviderId)`, `getAllStatuses(): Map<ProviderId, ProviderInitState>`); the
    `import type { Provider, ProviderId, ProviderOptions, GlobalProviderConfig } from '../types/providers.js';` line.
  - ADD the deprecated alias at the BOTTOM of the file (after the class):
        /**
         * @deprecated Since v1.2. Use {@link HarnessRegistry}. Retained so existing
         * `import { ProviderRegistry }` callsites (agent.ts, tests, public barrel) keep
         * resolving during the harness-vocabulary migration. Removed when P2.M1/P3.M1/P4.M1
         * collapse the Provider/ProviderId aliases.
         */
        export type ProviderRegistry = HarnessRegistry;
        export const ProviderRegistry = HarnessRegistry;
  - REFRESH JSDoc prose to harness vocabulary (descriptive text only; do NOT change signatures):
    file header "Provider Registry" → "Harness Registry"; class doc "provider instance(s)" →
    "harness instance(s)"; method docs "provider" → "harness" where it reads naturally. KEEP all
    `@param`/`@returns`/code-example blocks intact (they document behavior, which is unchanged).
  - VERIFY: `grep -n "class HarnessRegistry\|export type ProviderRegistry\|export const ProviderRegistry" src/harnesses/harness-registry.ts` → 3 hits.
  - VERIFY: `grep -n "ProviderRegistry" src/harnesses/harness-registry.ts` → ONLY the alias lines
    + (optionally) JSDoc {@link}/migration prose. NO remaining `class ProviderRegistry` or
    `: ProviderRegistry` return-type self-refs.

Task 3: UPDATE barrel src/harnesses/index.ts
  - REPLACE:  `export { ProviderRegistry, InitializationStatus } from './provider-registry.js';`
    WITH:     `export { HarnessRegistry, ProviderRegistry, InitializationStatus } from './harness-registry.js';`
  - REFRESH the header comment ("Exports the ProviderRegistry class" → "Exports the HarnessRegistry
    class (+ deprecated ProviderRegistry alias)").
  - KEEP the session-store re-exports UNCHANGED.

Task 4: UPDATE src/index.ts (L118) — minimum for green + contract's "export HarnessRegistry"
  - REPLACE:  `export { ProviderRegistry } from './harnesses/provider-registry.js';`
    WITH:     `export { HarnessRegistry, ProviderRegistry } from './harnesses/harness-registry.js';`
  - NOTE: P3.M3.T1.S1 later expands the public Harness surface; S2 only fixes the broken path +
    adds HarnessRegistry. Do NOT remove the ProviderRegistry alias (workflow-validation.test.ts
    imports it from '../../index.js').

Task 5: REWRITE import paths across all test files (provider-registry.js → harness-registry.js)
  - RUN (safe — matches only the .js module specifier, never the ProviderRegistry symbol):
      sed -i 's#provider-registry\.js#harness-registry.js#g' \
        $(grep -rl "provider-registry\.js" src/__tests__)
    This covers all 22 test files INCLUDING the 2 dynamic `await import(...)` calls in
    opencode-provider-deprecation.test.ts (L248, L265 — they contain `provider-registry.js`).
  - VERIFY: `grep -rn "provider-registry\.js" src/__tests__` → empty.

Task 6: RENAME the unit test file (body unchanged — verifies the alias)
  - RUN: `git mv src/__tests__/unit/providers/provider-registry.test.ts src/__tests__/unit/providers/harness-registry.test.ts`
  - NOTE: its import path was already rewritten in Task 5 (sed matched provider-registry.test.ts
    too, since its import specifier contained `provider-registry.js`). Confirm:
      grep -n "harness-registry.js" src/__tests__/unit/providers/harness-registry.test.ts  # → 1 hit
  - DO NOT rewrite the test body: it intentionally uses the `ProviderRegistry` alias, `Provider`-
    typed mocks, and `'anthropic'`/`'opencode'` ids — that IS the backward-compat verification
    mandated by the contract ("passes against the alias").

Task 7 (OPTIONAL cosmetic): refresh stale prose mentions of ProviderRegistry in sibling files
  - These are comments / an error-message string and do NOT break the build. Update for accuracy
    ONLY if time permits; do NOT block the task on them:
      src/harnesses/anthropic-provider.ts:200,279,301   # comments "ProviderRegistry manages ..."
      src/harnesses/anthropic-provider.ts:1170           # error string `Use ProviderRegistry.get('${spec.provider}') instead.`
      src/harnesses/opencode-provider.ts:239             # comment
      src/types/providers.ts:36                           # JSDoc "ProviderRegistry) keep compiling"
  - The error string at anthropic-provider.ts:1170 is still ACCURATE (the alias keeps
    ProviderRegistry.get working) — leaving it is fine; updating to HarnessRegistry is cosmetic.

Task 8: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: grep (contract), npm run lint, npm test, npm run build.
  - ANY failure → almost certainly a missed path or an accidental symbol/type change. Re-run the
    enumeration greps to localize. Do NOT "fix" by renaming methods or changing types.
```

### Implementation Patterns & Key Details

```ts
// === The deprecated class alias (type + value) — works in ALL positions ===
// Tests use ProviderRegistry as: value (getInstance, _resetForTesting, toBeInstanceOf)
//                              AND type (const instances: ProviderRegistry[]).
// TypeScript allows a type and a value with the same name (distinct namespaces).
export class HarnessRegistry {
  // ... body unchanged from the former ProviderRegistry ...
}

/** @deprecated Since v1.2. Use {@link HarnessRegistry}. */
export type ProviderRegistry = HarnessRegistry;
/** @deprecated Since v1.2. Use {@link HarnessRegistry}. */
export const ProviderRegistry = HarnessRegistry;   // typeof HarnessRegistry inferred → statics present

// === Barrel re-export carries both bindings (value + type) ===
// src/harnesses/index.ts:
export { HarnessRegistry, ProviderRegistry, InitializationStatus } from './harness-registry.js';
// src/index.ts (L118):
export { HarnessRegistry, ProviderRegistry } from './harnesses/harness-registry.js';
```

```bash
# === Safe path-rewrite sed (matches ONLY the .js module specifier) ===
# Cannot corrupt the `ProviderRegistry` symbol (different casing, no `.js`).
sed -i 's#provider-registry\.js#harness-registry.js#g' $(grep -rl "provider-registry\.js" src/__tests__)

# === History-preserving file rename ===
git mv src/harnesses/provider-registry.ts src/harnesses/harness-registry.ts
git mv src/__tests__/unit/providers/provider-registry.test.ts src/__tests__/unit/providers/harness-registry.test.ts
```

### Integration Points

```yaml
FILES RENAMED (git mv, history preserved):
  - src/harnesses/provider-registry.ts                     → src/harnesses/harness-registry.ts
  - src/__tests__/unit/providers/provider-registry.test.ts → src/__tests__/unit/providers/harness-registry.test.ts

BARRELS (export-list + path edits; symbol aliases preserved):
  - src/harnesses/index.ts : export HarnessRegistry (+ alias ProviderRegistry) from './harness-registry.js'
  - src/index.ts (L118)    : export HarnessRegistry (+ alias ProviderRegistry) from './harnesses/harness-registry.js'

CONSUMERS (kept green via the alias — NO source edits):
  - src/core/agent.ts                  : imports ProviderRegistry from '../harnesses/index.js' (barrel alias).
                                         Uses getInstance()/get(ProviderId)/_resetForTesting(). Untouched (P3.M1 owns rewire).
  - src/__tests__/unit/workflow-validation.test.ts : imports ProviderRegistry from '../../index.js' (public barrel alias).

TEST IMPORT PATHS (provider-registry.js → harness-registry.js; 22 files incl. 2 dynamic imports):
  - src/__tests__/{integration,unit}/**  : sed path rewrite; symbols unchanged.

NOT IN SCOPE (do not touch — owned downstream):
  - Map<ProviderId,Provider> → Map<HarnessId,Harness> (strict type-narrowing) → unlocks at P2.M1+P3.M1+P4.M1
  - AnthropicProvider → ClaudeCodeHarness; PiHarness                                  → P2.M1 / P2.M2
  - Agent harness field + cascade + HarnessRegistry.get                               → P3.M1
  - configureHarnesses / resolveHarnessConfig                                        → P1.M2.T2.S1
  - Comprehensive public Harness* type surface in src/index.ts                        → P3.M3.T1.S1
  - OpenCodeProvider + opencode-provider.ts deletion                                  → P4.M1.T1.S1
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates non-test
> `src/` only: `src/harnesses/**`, `src/core/agent.ts`, `src/index.ts`, `src/types/**`).
> `npm test` = `vitest run` (esbuild transpile-only; resolution/assertion failures surface as
> test errors). `npm run build` = `tsc`. No eslint/prettier. **Run BOTH lint and test** — lint
> covers the non-test edit sites; test covers the 22 test files + the renamed test.

### Level 1: The rename itself (after Tasks 1–6)

```bash
git status --short                                      # expect 2 'R' renames + edited barrels + ~21 test path edits
ls src/harnesses/harness-registry.ts                    # expect the file
ls src/__tests__/unit/providers/harness-registry.test.ts# expect the renamed test
git log --follow --oneline -- src/harnesses/harness-registry.ts | head   # history survived
# Confirm the OLD names are gone:
ls src/harnesses/provider-registry.ts 2>/dev/null       # expect: No such file or directory
```

### Level 2: Path-rewrite + alias completeness

```bash
# CONTRACT verification (must be EMPTY — no stale module specifier):
grep -rn "provider-registry\.js" src/
# Expected: no output.

# Confirm the symbol alias is INTACT (ProviderRegistry must still resolve everywhere):
grep -rn "ProviderRegistry" src/core/agent.ts           # expect 4 hits (import + 3 getInstance/reset)
grep -rn "export.*HarnessRegistry" src/harnesses/index.ts src/index.ts   # expect both files export it

# Confirm the alias is declared as type+const in the registry file:
grep -n "export type ProviderRegistry\|export const ProviderRegistry\|class HarnessRegistry" src/harnesses/harness-registry.ts
# Expected: 3 hits.

# Confirm NO method was renamed and NO type was narrowed (should still reference alias types):
grep -n "register(provider: Provider)\|get(id: ProviderId)\|initializeAll(config: GlobalProviderConfig)\|Map<ProviderId, Provider>" src/harnesses/harness-registry.ts
# Expected: hits for each (unchanged signatures).
```

### Level 3: Type check (non-test src/) + full test suite

```bash
# Non-test type check — catches a broken barrel/index/agent import or a bad alias.
npm run lint
# Expected: exit 0. An error naming harness-registry / ProviderRegistry = a missed path or a
# malformed alias declaration.

# Full test suite — catches broken TEST imports (incl. 2 dynamic imports) + behavioral regressions.
npm test
# Expected: exit 0, all suites pass. The renamed harness-registry.test.ts must pass (it exercises
# the ProviderRegistry alias). A module-resolution error in any provider/opencode/agent test =
# a missed path rewrite in Task 5.
```

### Level 4: Build (declaration-emit sanity)

```bash
rm -f tsconfig.tsbuildinfo   # optional: force a clean incremental recheck
npm run build
# Expected: exit 0; dist/harnesses/harness-registry.js + .d.ts emitted; dist/providers/ is stale
# (gitignored) — harmless.
```

### Level 5: Targeted spot-checks (confidence)

```bash
# The alias resolves as BOTH value and type, and the singleton still works:
npx tsx -e "import('./src/harnesses/harness-registry.js').then(m => {
  const r1 = m.HarnessRegistry.getInstance();
  const r2 = m.ProviderRegistry.getInstance();   // alias value
  console.log('same singleton:', r1 === r2);      // true
  console.log('alias is class:', r1 instanceof m.ProviderRegistry); // true
})"
# Expected: same singleton: true ; alias is class: true

# toBeInstanceOf works against the alias (this is what the renamed test relies on):
npx tsx -e "import('./src/harnesses/harness-registry.js').then(m => {
  const r = m.HarnessRegistry.getInstance();
  console.log('instanceof alias:', r instanceof m.ProviderRegistry); // true
})"
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `git mv` staged 2 renames (registry source + unit test); `git log --follow` shows history.
- [ ] `grep -rn "provider-registry\.js" src/` → **empty** (contract verification).
- [ ] `HarnessRegistry` exported from `src/harnesses/index.ts` AND `src/index.ts`.
- [ ] `ProviderRegistry` alias (type + const) declared in `src/harnesses/harness-registry.ts`.
- [ ] `npm run lint` exits 0 (agent.ts compiles against the alias).
- [ ] `npm test` exits 0 (incl. renamed `harness-registry.test.ts` + 2 dynamic imports).
- [ ] `npm run build` exits 0; `dist/harnesses/harness-registry.{js,d.ts}` emitted.

### Feature Validation

- [ ] `InitializationStatus` enum byte-for-byte unchanged.
- [ ] No method renamed; no type annotation narrowed to `Harness*` (Scope Decision respected).
- [ ] The renamed `harness-registry.test.ts` passes **against the `ProviderRegistry` alias**
      (body unchanged — mock ids/types/literals all still `Provider`/`ProviderId`).
- [ ] `src/core/agent.ts` UNTOUCHED and still green (P3.M1 owns its rewire).
- [ ] `src/index.ts` keeps exporting the `ProviderRegistry` alias (workflow-validation.test.ts depends on it).

### Code Quality Validation

- [ ] Alias declared as **type + const** (works in value AND type positions).
- [ ] Path-rewrite sed targeted the `.js` module specifier only (symbol `ProviderRegistry` untouched).
- [ ] History preserved via `git mv` (not delete+create) for both renamed files.
- [ ] JSDoc/comments refreshed to harness vocabulary (prose only; signatures unchanged).
- [ ] `git mv` used for file renames; no `tsconfig.json`/`package.json` change.

---

## Anti-Patterns to Avoid

- ❌ **Don't write `Map<HarnessId, Harness>` / `register(harness: Harness)` / `get(id: HarnessId)`.**
  Strict typing breaks `agent.ts` (`get(ProviderId)` → lint error; rewire is P3.M1) and ~20 test
  files. Keep the alias superset types. (See Scope Decision + `research/reference-enumeration.md §4`.)
- ❌ **Don't rename ANY method** (`initializeProvider`→`initializeHarness`, etc.). The contract
  says keep lifecycle logic VERBATIM. S1's hand-off note mused about method renames — ignore it.
- ❌ **Don't declare the alias as `const` only.** Tests use `ProviderRegistry` as a TYPE
  (`const instances: ProviderRegistry[]`) AND value. Declare BOTH `type` and `const`.
- ❌ **Don't do a blind `s/provider-registry/harness-registry/g` across the whole file** — it would
  corrupt the `ProviderRegistry` symbol references inside the registry file. Rename the CLASS and
  its internal self-refs explicitly; add the alias by hand.
- ❌ **Don't rewrite the renamed test's body** (mock ids → `'pi'`/`'claude-code'`, type → `Harness`).
  That is P2.M1's job and violates the contract's "passes against the alias (update path + rename)".
- ❌ **Don't touch `src/core/agent.ts`** — it consumes the alias via the barrel and stays green.
  Rewiring it to `HarnessRegistry` is P3.M1.T1.S1.
- ❌ **Don't remove the `ProviderRegistry` export from `src/index.ts`** —
  `workflow-validation.test.ts` imports it from `'../../index.js'`.
- ❌ **Don't conflate** `src/harnesses/harness-registry.ts` (the registry) with
  `src/types/harnesses.ts` (the Harness* type definitions). The registry imports its types from
  `../types/providers.js` (the alias shim), not from `../types/harnesses.js`.
- ❌ **Don't skip `npm test`** — `npm run lint` excludes `src/__tests__`, so the 22 test import
  paths are validated ONLY by vitest.
- ❌ **Don't delete-and-recreate the renamed files** — use `git mv` to preserve blame/history.

---

## Hand-off Notes for Downstream Tasks

- **P1.M2.T2.S1 (configureHarnesses / resolveHarnessConfig):** operates on `src/utils/provider-config.ts`
  (sibling of the renamed dir, unaffected by S2). Its `GlobalHarnessConfig` is the successor to the
  registry's `initializeAll(config: GlobalProviderConfig)` param; S2 keeps `GlobalProviderConfig` so
  the existing `initializeAll` tests stay green. P1.M2.T2 may later add a `GlobalHarnessConfig`-accepting
  overload.
- **P2.M1 (ClaudeCodeHarness) / P2.M2 (PiHarness):** once the adapters adopt `readonly id: HarnessId`,
  registering them against the registry's `register(provider: Provider)` still works (HarnessId ⊂ ProviderId),
  and the `Provider` alias begins collapsing toward `Harness`.
- **P3.M1 (Agent harness rewire):** `Agent` will resolve its runtime via `HarnessRegistry.get(...)`.
  After P3.M1 + P2.M1 + P4.M1 land, the registry's `Map<ProviderId, Provider>` automatically narrows to
  `Map<HarnessId, Harness>` (alias collapse) — **zero further edits to `harness-registry.ts`**.
- **P3.M3.T1.S1 (public API surface):** will expand `src/index.ts` to export the full Harness* type
  surface. S2 only added the `HarnessRegistry` export there; P3.M3 adds the rest.
- **P4.M1.T1.S1 (OpenCode removal):** deletes `src/harnesses/opencode-provider.ts` and the `'opencode'`
  literal from `ProviderId`. After it lands, `ProviderId = HarnessId | 'anthropic'`; after P2.M1,
  `ProviderId = HarnessId`.

---

**Confidence Score: 9/10** — Fully enumerated edit set (1 file renamed+edited, 1 test renamed, 2
barrels edited, ~21 test paths sed-rewritten incl. 2 dynamic imports — all verified by grep), a
verified alias pattern (type+const) that keeps the sole non-test consumer (`agent.ts`) and all 20
test consumers green, and a load-bearing Scope Decision that resolves the literal-contract vs.
green-build tension with a documented forward-collapse path. The one residual risk is a reviewer
expecting the literal `Map<HarnessId, Harness>` change, which the prominent Scope Decision + proof
section addresses explicitly.
