# PRP — P1.M1.T3.S1: Provider* → Harness* deprecated alias shim

**PRD reference:** §7.2 (HarnessId), §7.3 (Harness interface), §7.4 (HarnessCapabilities),
§7.5 (HarnessOptions), §7.8 (ModelSpec / open ModelProviderId), §7.10 (Tool Execution),
§7.11 (Hook Adaptation), §7.6 (GlobalHarnessConfig — *referenced, not implemented here*).
**Plan:** `plan/004_9a50e71828f4/` — sole subtask of P1.M1.T3 (Backward-compatible deprecated
Provider* aliases). First milestone P1.M1 (Harness Core Type System) closes with this task.
**Scope tag:** PURE TYPES — rewrite of `src/types/providers.ts` into a compat shim. No runtime
code. **No edits to any consumer** (adapters, registry, agent, provider-config are out of scope
and owned by P1.M2 / P2 / P3). Adds one focused type-level test.

> **Prerequisite (verified complete):** P1.M1.T1 (S1 + S2) shipped `src/types/harnesses.ts` with
> the full `Harness*` surface; P1.M1.T2.S1 already added a *transitional* `ModelSpec` re-export
> alias at `src/types/providers.ts:235-236`. This task generalizes that pattern to the whole
> Provider* family and formalizes it as the deprecated alias shim.

---

## Goal

**Feature Goal:** Convert `src/types/providers.ts` from the single source of truth for the
`Provider*` types into a **backward-compatible deprecated alias shim**: every `Provider*` type
that has a structurally-identical `Harness*` counterpart becomes a `@deprecated` type alias
pointing at it, while the types whose shape genuinely diverges (or whose consumers depend on
pre-migration literals) are kept **concrete** with `@deprecated` migration JSDoc. After this
task, the legacy `Provider*` vocabulary still compiles everywhere it is used today, but it is now
a thin facade over `src/types/harnesses.ts` (the v1.2 source of truth).

**Deliverable:**
1. Rewritten `src/types/providers.ts` — a compat shim that (a) **aliases** the cleanly-mappable
   types to their `Harness*` counterparts, (b) **keeps concrete** the types that cannot be aliased
   without touching out-of-scope consumers, and (c) stamps every public `Provider*` symbol with a
   `@deprecated` JSDoc block carrying a migration recipe. The `ProviderResult` family
   (`ProviderResult` / `ProviderResponseStatus` / `ProviderErrorDetails` / `ProviderResponseMetadata`)
   is left **exactly as-is** (already `@deprecated` → `AgentResponse`).
2. One new test — `src/__tests__/unit/providers/provider-alias-shim.test.ts` — that documents the
   alias mappings as executable type assertions and verifies `ProviderId` is now a superset
   (accepts `'pi'` / `'claude-code'` *and* the legacy `'anthropic'` / `'opencode'`).

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) passes with exit 0 across the whole (non-test) `src/` tree —
   i.e. **no consumer of `Provider*` breaks**: `src/providers/anthropic-provider.ts`,
   `src/providers/opencode-provider.ts`, `src/providers/provider-registry.ts`, `src/core/agent.ts`,
   `src/types/agent.ts`, `src/utils/provider-config.ts`, `src/types/index.ts`, `src/index.ts`.
2. `npm test` (`vitest run`) passes — including the existing `provider-result-types.test.ts`,
   `harnesses-types.test.ts`, `harnesses-config-types.test.ts`, `provider-interface.test.ts`,
   `provider-registry.test.ts`, and every `anthropic-provider-*` / `opencode-provider-*` suite.
3. `ProviderCapabilities`, `ProviderHookEvents`, `ProviderExecutionOptions`, `ProviderRequest`,
   `ToolExecutionRequest`, `ToolExecutionResult`, `ModelSpec` resolve to the **same types** exported
   from `src/types/harnesses.ts` (verified by type-identity assertions in the new test).
4. `ProviderId` accepts `'pi'`, `'claude-code'`, `'anthropic'`, AND `'opencode'` (superset).
5. Every aliased `Provider*` type carries a `@deprecated` JSDoc with a one-line migration recipe.
6. `src/types/providers.ts` introduces **zero new runtime code** (pure types + re-exports).

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agents implementing:
- **P1.M2** (Harness Registry & Configuration Cascade) — `ProviderRegistry` → `HarnessRegistry`
  keyed by `HarnessId`; `configureHarnesses()` + `resolveHarnessConfig()`.
- **P2.M1** (ClaudeCodeHarness — rename of `AnthropicProvider`) and **P2.M2** (PiHarness).
- **P3.M3.T1.S1** (public API) — exports the `Harness*` surface alongside the deprecated aliases.

**Use Case:** Today every adapter, the registry, the agent runtime, and 38 test files import
`Provider*` by name. v1.2 (PRD §7) renames the *runtime* axis to `Harness*`. This shim lets the
codebase migrate **incrementally** — file-by-file switching `Provider*` → `Harness*` imports —
without a flag-day break, while every still-unmigrated consumer keeps compiling.

**Pain Points Addressed:** Without a shim, the only options are (a) a flag-day rename that breaks
~46 files at once (unreviewable, unrevertable), or (b) shipping `Harness*` types with **no bridge**
to the existing `Provider*` surface, leaving them unused. The alias shim is the missing bridge.

---

## Why

- **Closes P1.M1 and unblocks P1.M2.** P1.M2.T1.S1 relocates `src/providers → src/harnesses` and
  renames `ProviderRegistry → HarnessRegistry`; P1.M2.T2.S1 implements `configureHarnesses()`.
  Both depend on the legacy `Provider*` names still resolving (the registry + agent + tests still
  import them). This shim guarantees they resolve to the *same* underlying types as the new
  `Harness*` surface, so P1.M2 can switch consumers over one at a time.
- **Makes the type system the migration ledger.** A `@deprecated` alias is a compile-visible
  signal: any editor/IDE flags `Provider*` usage, and the JSDoc tells the migrator exactly what to
  rename it to. This is cheaper and more durable than a separate migration-tracking doc.
- **Preserves the public API contract.** `src/index.ts` re-exports every `Provider*` type to
  external consumers (migration-scope.md §5). Aliasing (not deleting) means **semver-compatible**:
  no external consumer breaks on upgrade to v1.2.
- **Zero-risk landing.** Pure types; the only non-test file touched is `providers.ts`. Reversible.

---

## What

Rewrite `src/types/providers.ts` so each `Provider*` symbol falls into exactly one of three buckets:

| Bucket | Types | Treatment |
|---|---|---|
| **A — ALIAS** (structurally identical `Harness*` counterpart) | `ProviderCapabilities`, `ProviderHookEvents`, `ProviderExecutionOptions`, `ProviderRequest`, `ToolExecutionRequest`, `ToolExecutionResult`, `ModelSpec` | `export type ProviderX = HarnessX;` (or re-export for the same-named Tool* types) + `@deprecated` JSDoc |
| **B — DEPRECATED SUPERSET** (union that preserves legacy literals + adds harness axis) | `ProviderId` | `export type ProviderId = HarnessId \| 'anthropic' \| 'opencode';` + `@deprecated` JSDoc |
| **C — KEEP CONCRETE** (shape diverges from Harness*, or consumers depend on specifics) | `ProviderOptions`, `SessionState`, `GlobalProviderConfig`, `Provider` (interface), `ToolExecutor`, `ProviderResult`, `ProviderResponseStatus`, `ProviderErrorDetails`, `ProviderResponseMetadata` | Keep the **current** interface/type body verbatim; add/refresh `@deprecated` JSDoc. The `ProviderResult` family is already `@deprecated` → `AgentResponse` — leave its bodies untouched. |

**Why bucket C is NOT aliasable** (the two hard constraints that override the literal
`ProviderId = HarnessId` / `interface Provider extends Harness {}` sketch in the contract):

- **Constraint 1 — `ProviderId` redirect breaks every adapter + the registry.**
  `src/providers/anthropic-provider.ts:69` is `readonly id: ProviderId = "anthropic";`,
  `src/providers/opencode-provider.ts:99` is `readonly id: ProviderId = "opencode";`, and
  `provider-registry.ts` / `core/agent.ts` / `utils/provider-config.ts` are keyed on those literals
  (124 occurrences across 23 files per migration-scope.md §1). A literal `ProviderId = HarnessId`
  (`'pi' | 'claude-code'`) makes `"anthropic"` / `"opencode"` unassignable → `npm run lint` fails
  on non-test `src/`. **Fix:** a deprecated *superset* union keeps the old literals valid while
  adding the new harness ids. The adapters are renamed in P2.M1 (where `id` becomes `HarnessId`);
  until then the superset is the only build-green option.
- **Constraint 2 — `interface Provider extends Harness {}` breaks the adapters' `id` field.**
  `Harness.id` is typed `HarnessId` (narrow). The adapters declare `readonly id: ProviderId`
  (now a *wider* superset). An interface that `extends Harness` while widening `id` to `ProviderId`
  is a TS error ("Interface 'Provider' incorrectly extends 'Harness'"). And an empty
  `interface Provider extends Harness {}` forces `id: HarnessId`, which `"anthropic"` fails to
  satisfy under `implements Provider`. **Fix:** keep the `Provider` interface **concrete** (its
  current full body, `id: ProviderId`) with a `@deprecated → Harness` JSDoc. P2.M1 deletes it.
- **Constraint 3 — `ProviderOptions` ≠ `HarnessOptions`.** `HarnessOptions` was *deliberately
  slimmed* (harnesses.ts JSDoc §7.5 / system_context.md §3): it dropped `sessionStore`,
  `sessionPersistence`, `sessionTtl`, `sessionPath`. The adapters read all four from
  `options` in `initialize()` (`anthropic-provider.ts:215-245` et al.). Aliasing would erase them.
  **Fix:** keep `ProviderOptions` concrete.
- **Constraint 4 — `GlobalProviderConfig` ≠ `GlobalHarnessConfig`.** Different field *names*
  (`defaultProvider`/`providerDefaults` vs `defaultHarness`/`harnessDefaults`) and the latter adds
  `defaultModelProvider`. `provider-config.ts` + its tests reference the old names. **Fix:** keep
  `GlobalProviderConfig` concrete (its `configureHarnesses()` successor is P1.M2.T2.S1).

### Success Criteria

- [ ] `npm run lint` passes (exit 0) — no consumer of `Provider*` breaks.
- [ ] `npm test` passes — full suite, including the new `provider-alias-shim.test.ts`.
- [ ] Bucket A types are `export type … = Harness…;` aliases (or same-name re-exports for Tool*).
- [ ] `ProviderId === HarnessId | 'anthropic' | 'opencode'` (superset; verified by test).
- [ ] Bucket C types keep their current bodies; each carries a `@deprecated` JSDoc.
- [ ] `ProviderResult` family is byte-for-byte unchanged.
- [ ] No file other than `src/types/providers.ts` and the new test is modified.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: A developer who has never seen this repo can implement this task
using only (a) this PRP, (b) read-only access to `src/types/providers.ts` (current) and
`src/types/harnesses.ts` (S1+S2 output), and (c) the complete reference shim in the
Implementation Blueprint. Every line number, the two hard aliasing constraints, and the exact
validation commands are spelled out. The three buckets table above is the single decision matrix.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (the "what" and "why").
- url: PRD.md §7  (repo root; identical content in plan/004_9a50e71828f4/prd_snapshot.md)
  why: §7.2–7.5 + §7.8 + §7.10–7.11 define the Harness* target surface this shim points at.
  critical: §7.2 HarnessId = 'pi' | 'claude-code'; §7.5 HarnessOptions is SLIMMED (no session
            fields) — that slimming is WHY ProviderOptions cannot alias (Constraint 3).

# MUST READ — the file you are REWRITING (current legacy definitions + line numbers).
- file: src/types/providers.ts
  why: Holds every Provider* type. Line map (verified):
       L9   ProviderId = "anthropic" | "opencode"
       L15  ProviderCapabilities        (→ ALIAS HarnessCapabilities)
       L34  ProviderOptions             (→ KEEP CONCRETE: session fields)
       L118 SessionState                (→ KEEP CONCRETE: Anthropic-SDK-specific)
       L151 ToolExecutionRequest        (→ RE-EXPORT from harnesses.ts, same name)
       L162 ToolExecutionResult         (→ RE-EXPORT from harnesses.ts, same name)
       L174 ProviderHookEvents          (→ ALIAS HarnessHookEvents)
       L199 ProviderExecutionOptions    (→ ALIAS HarnessExecutionOptions)
       L223 ProviderRequest             (→ ALIAS HarnessRequest)
       L235-236 ModelSpec re-export     (already done by T2.S1 — KEEP, refresh JSDoc)
       L246 ToolExecutor                (→ KEEP CONCRETE; references aliased Tool* types)
       L303/342/405/482 ProviderResult family (→ UNCHANGED; already @deprecated → AgentResponse)
       L536 GlobalProviderConfig        (→ KEEP CONCRETE: field names differ from GlobalHarnessConfig)
       L625 Provider interface          (→ KEEP CONCRETE + @deprecated; see Constraint 2)
  pattern: The existing ProviderResult @deprecated JSDoc blocks (L257-301 etc.) are the
           STYLE TEMPLATE for every new @deprecated block in this shim — copy that format
           (version line, "Use {@link X} instead", a BEFORE/AFTER code recipe, @see link).
  gotcha: The file currently imports `Tool, MCPServer, Skill, TokenUsage` (L1), `AgentResponse`
          (L2), `StreamEvent` (L3) — ALL are still needed after the rewrite (the concrete
          Provider interface references Tool/MCPServer/Skill via registerMCPs/loadSkills;
          TokenUsage is on ProviderResponseMetadata; AgentResponse+StreamEvent on Provider.execute).
          Keep these imports. tsconfig has NO noUnusedLocals, so even an accidental unused import
          is not a lint error — but keep them accurate.

# MUST READ — the SOURCE OF TRUTH you alias INTO (S1+S2 output).
- file: src/types/harnesses.ts
  why: Exports the Harness* counterparts: HarnessId, HarnessCapabilities, HarnessHookEvents,
       HarnessExecutionOptions, HarnessRequest, ToolExecutionRequest, ToolExecutionResult,
       ModelSpec, Harness, GlobalHarnessConfig. Bucket A aliases resolve to THESE.
  pattern: "export type HarnessId = 'pi' | 'claude-code';"
  gotcha: harnesses.ts ToolExecutionRequest/ToolExecutionResult are COPIES of providers.ts's
          (verbatim, per S1). Aliasing unifies them — no shape change. ModelSpec here has
          provider: ModelProviderId (open set) — already aliased in providers.ts by T2.S1.

# MUST READ — the predecessor PRP (it set up the ModelSpec alias you are generalizing).
- file: plan/004_9a50e71828f4/P1M1T2S1/PRP.md
  why: Its "Hand-off Notes" explicitly say: "T3 should extend [the ModelSpec alias] to the full
       alias surface ... at which point the ModelSpec re-export added here becomes part of the
       formal alias shim (no conflict)." Confirm the existing L235-236 alias is preserved.

# SHOULD READ — the migration inventory (consumers that must keep compiling).
- file: plan/004_9a50e71828f4/docs/migration-scope.md
  why: §1 token counts (ProviderId in 23 files/124 occ; Provider interface in 32 files/221 occ);
       §7 architecture (providers.ts is the single source of truth re-exported via types/index.ts
       → src/index.ts). Confirms the blast radius of a bad alias.
- file: plan/004_9a50e71828f4/docs/consumer-analysis.md
  why: §7 documents the existing @deprecated alias pattern (ProviderResult→AgentResponse JSDoc with
       BEFORE/AFTER migration recipes) — the style to replicate. §5 "Type rename surface" lists the
       1:1 Provider*→Harness* mapping this shim implements.

# Style references (read-only — copy the JSDoc format, do not edit these files).
- file: src/__tests__/unit/provider-result-types.test.ts
  why: The existing type-assertion test pattern (assign values to types; vitest runs the
       assignments). Your new provider-alias-shim.test.ts mirrors this style.
- file: src/__tests__/unit/harnesses-types.test.ts
  why: Confirms the Harness* shapes (HarnessId 2 values; ModelProviderId open set) your aliases
       must be type-identical to.
```

### Current Codebase tree (relevant slice)

```bash
src/
├── types/
│   ├── harnesses.ts        # S1+S2: SOURCE OF TRUTH — Harness*, ModelSpec, GlobalHarnessConfig  ← ALIAS INTO HERE
│   ├── providers.ts        # ← REWRITE (this task): legacy Provider* → alias shim
│   └── index.ts            # re-exports Provider* from providers.ts  (NO CHANGE — still resolves)
├── providers/
│   ├── anthropic-provider.ts   # implements Provider; id: ProviderId = "anthropic"  (NO CHANGE — must keep compiling)
│   ├── opencode-provider.ts    # implements Provider; id: ProviderId = "opencode"   (NO CHANGE — must keep compiling)
│   └── provider-registry.ts    # keyed by ProviderId; initializeProvider(id, options?: ProviderOptions)  (NO CHANGE)
├── core/agent.ts               # imports ProviderRequest, ProviderOptions; providerId cascade     (NO CHANGE)
├── utils/provider-config.ts    # GlobalProviderConfig, configureProviders, resolveProviderConfig   (NO CHANGE)
└── __tests__/
    └── unit/providers/
        └── provider-alias-shim.test.ts   # ← NEW (this task): alias-mapping + superset assertions
```

### Desired Codebase tree with files to be added/changed

```bash
src/types/providers.ts                                  # REWRITE → compat shim (3 buckets)
src/__tests__/unit/providers/provider-alias-shim.test.ts # NEW → alias identity + ProviderId superset test
# (No other files touched. No consumer edits. No runtime code.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — `ProviderId = HarnessId` (literal) BREAKS THE BUILD. The adapters set
//   readonly id: ProviderId = "anthropic" / "opencode" (anthropic-provider.ts:69,
//   opencode-provider.ts:99) and the registry/agent/provider-config are keyed on those literals.
//   HarnessId is 'pi' | 'claude-code' — so "anthropic" is unassignable. Use the SUPERSET:
//   export type ProviderId = HarnessId | 'anthropic' | 'opencode';
//   (deprecated union). Do NOT redirect ProviderId to HarnessId.

// CRITICAL #2 — `interface Provider extends Harness {}` BREAKS THE ADAPTERS. Harness.id is
//   HarnessId (narrow); adapters declare `readonly id: ProviderId` (now the wider superset from #1).
//   Widening id while extending Harness is TS2417 ("incorrectly extends"); and an empty
//   `extends Harness {}` forces id: HarnessId which "anthropic" fails under `implements Provider`.
//   KEEP THE Provider INTERFACE CONCRETE (its current body) + @deprecated → Harness JSDoc.
//   P2.M1 deletes Provider when AnthropicProvider becomes ClaudeCodeHarness (id: HarnessId).

// CRITICAL #3 — ProviderOptions CANNOT alias to HarnessOptions. HarnessOptions was SLIMMED
//   (harnesses.ts §7.5 note): it dropped sessionStore / sessionPersistence / sessionTtl /
//   sessionPath. The adapters read ALL FOUR from options in initialize() (anthropic-provider.ts
//   :215-245). Aliasing would erase them and break the adapters + provider-config.ts.
//   KEEP ProviderOptions CONCRETE.

// CRITICAL #4 — GlobalProviderConfig CANNOT alias to GlobalHarnessConfig. Different field NAMES
//   (defaultProvider/providerDefaults vs defaultHarness/harnessDefaults) + the latter adds
//   defaultModelProvider. provider-config.ts + its tests use the old names. KEEP CONCRETE;
//   its configureHarnesses() successor is P1.M2.T2.S1.

// GOTCHA #5 — tsconfig.json EXCLUDES src/__tests__ from `tsc --noEmit` ("exclude":
//   ["node_modules","dist","src/__tests__"]). So `npm run lint` only type-checks NON-TEST src.
//   The binding success criterion is "non-test consumers compile". Tests are checked only by
//   `npm test` (vitest/esbuild, transpile-only — type errors there do NOT fail the run unless a
//   runtime assertion fires). The new provider-alias-shim.test.ts should therefore use RUNTIME
//   assignments/expect() (not pure type-only `// @ts-expect-error` blocks) so it actually asserts
//   something under vitest, while ALSO being valid under tsc if someone type-checks it.

// GOTCHA #6 — tsconfig has NO noUnusedLocals / noUnusedParameters. Unused imports are NOT lint
//   errors. Still, keep providers.ts imports accurate: after aliasing, the file STILL needs
//   Tool/MCPServer/Skill (Provider interface registerMCPs/loadSkills), TokenUsage
//   (ProviderResponseMetadata), AgentResponse + StreamEvent (Provider.execute return type),
//   AND the new harnesses.ts imports (HarnessId, HarnessCapabilities, HarnessHookEvents,
//   HarnessExecutionOptions, HarnessRequest, ToolExecutionRequest, ToolExecutionResult, ModelSpec).

// GOTCHA #7 — ToolExecutionRequest / ToolExecutionResult have the SAME name in providers.ts and
//   harnesses.ts (S1 copied them verbatim). Alias them via RE-EXPORT (same name), not a rename:
//     import type { ToolExecutionRequest, ToolExecutionResult } from './harnesses.js';
//     export type { ToolExecutionRequest, ToolExecutionResult };
//   These are shared tool-exec types, NOT Provider*→Harness* renames — do NOT mark them
//   @deprecated (they are the canonical names; they just now live in harnesses.ts).

// GOTCHA #8 — ToolExecutor stays CONCRETE. It is a providers.ts convenience alias
//   `(request: ToolExecutionRequest) => Promise<ToolExecutionResult>`; the Harness interface uses
//   an INLINE function type (no named ToolExecutor counterpart). Keep its definition referencing
//   the (now-aliased) ToolExecutionRequest/Result — it stays automatically consistent. Not deprecated.

// GOTCHA #9 — `npm run lint` IS the type check (`tsc --noEmit`). There is NO eslint/prettier.
//   Validation gates = `npm run lint` + `npm test` + `npm run build` (declaration-emit sanity).
//   vitest uses esbuild (transpile-only) — "tests pass" does NOT imply types are correct; lint does.
```

---

## Implementation Blueprint

### Data models and structure

No new data models. This task CONSUMES the types from `src/types/harnesses.ts` (S1+S2) and
re-exposes the legacy `Provider*` names as aliases / deprecated concretes. The alias map:

```ts
// From src/types/harnesses.ts (already shipped — DO NOT redefine)
export type HarnessId = 'pi' | 'claude-code';
export interface HarnessCapabilities { /* 6 booleans */ }
export interface HarnessHookEvents { /* 5 optional callbacks */ }
export interface HarnessExecutionOptions { model?; systemPrompt?; tools?; hooks?; sessionId?; streaming?; }
export interface HarnessRequest { prompt: string; options: HarnessExecutionOptions; }
export interface ToolExecutionRequest { name: string; input: unknown; }
export interface ToolExecutionResult { content: string | unknown; isError: boolean; }
export interface ModelSpec { provider: ModelProviderId; model: string; raw: string; }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD the harnesses.ts import block to src/types/providers.ts
  - KEEP the existing 3 imports (sdk-primitives: Tool, MCPServer, Skill, TokenUsage;
    agent: AgentResponse; streaming: StreamEvent) — they are still used by concrete types.
  - ADD (alongside the existing T2.S1 `import type { ModelSpec } from './harnesses.js';` at ~L235,
    which you will RELOCATE up to the top import block for tidiness):
        import type {
          HarnessId,
          HarnessCapabilities,
          HarnessHookEvents,
          HarnessExecutionOptions,
          HarnessRequest,
          ToolExecutionRequest,
          ToolExecutionResult,
          ModelSpec,
        } from './harnesses.js';
  - NAMING/PLACEMENT: top-of-file import block (after the existing 3 imports). Merge the stray
    L235 `import type { ModelSpec }` into this single statement (delete the mid-file copy).
  - GOTCHA: do NOT import `Harness`, `GlobalHarnessConfig`, `ModelProviderId`, or `HarnessOptions`
    here — they are not needed for the aliases and would invite scope creep.

Task 2: CONVERT Bucket A types to @deprecated aliases
  - ProviderCapabilities  (L15):  replace the `export interface ProviderCapabilities {…}` block with
        /** @deprecated Since v1.2. Use {@link HarnessCapabilities} (from types/harnesses.ts). */
        export type ProviderCapabilities = HarnessCapabilities;
    (Keep the existing explanatory JSDoc ABOVE the @deprecated line if useful, or trim — the
    canonical docs now live on HarnessCapabilities in harnesses.ts.)
  - ProviderHookEvents    (L174): replace `export interface ProviderHookEvents {…}` with
        /** @deprecated Since v1.2. Use {@link HarnessHookEvents}. */
        export type ProviderHookEvents = HarnessHookEvents;
  - ProviderExecutionOptions (L199): replace `export interface ProviderExecutionOptions {…}` with
        /** @deprecated Since v1.2. Use {@link HarnessExecutionOptions}. */
        export type ProviderExecutionOptions = HarnessExecutionOptions;
  - ProviderRequest       (L223): replace `export interface ProviderRequest {…}` with
        /** @deprecated Since v1.2. Use {@link HarnessRequest}. */
        export type ProviderRequest = HarnessRequest;
  - ToolExecutionRequest/Result (L151, L162): replace BOTH interface definitions with a single
    re-export (these are shared types, NOT Provider* renames — no @deprecated):
        // v1.2: ToolExecutionRequest/Result now live in types/harnesses.ts (copied verbatim
        // there by S1). Re-exported here so legacy imports keep resolving to the SAME type.
        export type { ToolExecutionRequest, ToolExecutionResult };
    (The `import type { ToolExecutionRequest, ToolExecutionResult }` from Task 1 brings them into
    scope so `export type { … }` re-exports them.)
  - ModelSpec (L235-236, already aliased by T2.S1): keep `export type { ModelSpec };` but REFRESH
    the JSDoc to the formal deprecated-alias wording (it is now part of the shim, not transitional):
        /**
         * @deprecated Since v1.2. Use {@link ModelSpec} from types/harnesses.ts directly.
         * `provider` is now the open `ModelProviderId` set (anthropic/openai/google/zai/…).
         */
        export type { ModelSpec };
  - PATTERN for each @deprecated block: version line ("Since v1.2"), "Use {@link X} instead", and a
    2-3 line BEFORE/AFTER import recipe (copy the style from the ProviderResult @deprecated blocks
    at L257-301). Keep them concise.

Task 3: CONVERT ProviderId to the deprecated SUPERSET (Bucket B)
  - L9: replace `export type ProviderId = "anthropic" | "opencode";` with:
        /**
         * @deprecated Since v1.2. The single `ProviderId` axis is SPLIT:
         *   - runtime axis  → {@link HarnessId} ('pi' | 'claude-code')  — types/harnesses.ts
         *   - LLM-host axis → {@link ModelProviderId} (open set)         — types/harnesses.ts
         * This union is a SUPERSET kept only so pre-migration consumers (AnthropicProvider
         * id:'anthropic', OpenCodeProvider id:'opencode', ProviderRegistry) keep compiling.
         * `'anthropic'` / `'opencode'` will be REMOVED when the adapters are renamed (P2.M1) /
         * deleted (P4.M1).
         */
        export type ProviderId = HarnessId | 'anthropic' | 'opencode';
  - GOTCHA: this is the single most load-bearing line in the shim. Verify with the test (Task 6)
    that all four literals type-check.

Task 4: KEEP Bucket C types CONCRETE — add/refresh @deprecated JSDoc only
  - ProviderOptions (L34): LEAVE the interface body UNCHANGED (it carries the session fields the
    adapters need). Prepend a @deprecated JSDoc:
        /** @deprecated Since v1.2. Use {@link HarnessOptions} (note: HarnessOptions is SLIMMED —
         *  it omits sessionStore/sessionPersistence/sessionTtl/sessionPath; those move to the
         *  concrete harness adapter). */
  - SessionState (L118): LEAVE the body unchanged (Anthropic-SDK-specific). Prepend:
        /** @deprecated Since v1.2. Session state is harness-adapter-internal; do not depend on
         *  this Anthropic-SDK-specific shape from public code. */
  - GlobalProviderConfig (L536): LEAVE the body unchanged. Prepend:
        /** @deprecated Since v1.2. Use {@link GlobalHarnessConfig} (types/harnesses.ts) — note the
         *  field rename defaultProvider→defaultHarness, providerDefaults→harnessDefaults, plus the
         *  new defaultModelProvider axis. Successor configureHarnesses() lands in P1.M2.T2.S1. */
  - Provider interface (L625): LEAVE the entire interface body UNCHANGED (id: ProviderId, the 6
    methods, supports/requiresFeatures). Prepend a @deprecated block pointing to {@link Harness}:
        /**
         * @deprecated Since v1.2. Implement {@link Harness} (types/harnesses.ts) instead.
         * NOTE: this interface is kept CONCRETE (not `extends Harness`) because Harness.id is the
         * narrow HarnessId while adapters still declare `id: ProviderId` with the legacy
         * 'anthropic'/'opencode' literals. It is removed when AnthropicProvider→ClaudeCodeHarness
         * (P2.M1) and OpenCodeProvider deletion (P4.M1) land. The method surface is identical to
         * Harness — only the `id` union width differs today.
         */
  - ToolExecutor (L246): LEAVE unchanged. It references the (now-aliased) ToolExecutionRequest/
    ToolExecutionResult, so it stays automatically consistent. No @deprecated (shared util type).
  - ProviderResult / ProviderResponseStatus / ProviderErrorDetails / ProviderResponseMetadata
    (L303/342/405/482): LEAVE BYTE-FOR-BYTE UNCHANGED. They are already @deprecated → AgentResponse
    with full migration JSDoc (the style template for Tasks 2-4).

Task 5: VERIFY no stray references / tidy
  - Confirm the only harnesses.ts import is the Task 1 block; remove the now-relocated mid-file
    `import type { ModelSpec }` (it was merged into Task 1).
  - Confirm providers.ts still exports EVERY symbol that src/types/index.ts re-exports:
    Provider, ProviderId, ProviderCapabilities, ProviderOptions, ProviderExecutionOptions,
    ProviderRequest, ProviderHookEvents, ToolExecutionRequest, ToolExecutionResult, ModelSpec,
    ToolExecutor, ProviderResult, ProviderResponseStatus, ProviderErrorDetails,
    ProviderResponseMetadata, GlobalProviderConfig, SessionState. (See src/types/index.ts lines
    ~33-52 — all must still resolve.)
  - Run `npm run lint` — MUST be exit 0. Any error naming a consumer (anthropic-provider.ts,
    opencode-provider.ts, provider-registry.ts, agent.ts, provider-config.ts) means an alias was
    applied to a Bucket-C type by mistake — revert that one to concrete.

Task 6: CREATE src/__tests__/unit/providers/provider-alias-shim.test.ts
  - PURPOSE: executable documentation of the alias map + a runtime assertion that ProviderId is a
    superset. Mirrors the type-assertion style of provider-result-types.test.ts /
    harnesses-types.test.ts (assign values to types; expect() the runtime values).
  - IMPORT both `… from '../../../types/providers.js'` (the aliases) AND
    `… from '../../../types/harnesses.js'` (the canonicals) — type *identity* is asserted by
    assigning an alias-typed value to a canonical-typed variable and vice-versa (these compile iff
    the alias truly equals the canonical).
  - TEST CASES (minimum):
      describe('Provider* deprecated alias shim'):
        it('ProviderCapabilities === HarnessCapabilities'):
            const caps: ProviderCapabilities = { mcp:true, skills:true, lsp:true, streaming:true,
              sessions:false, extendedThinking:false };
            const asHarness: HarnessCapabilities = caps;   // compiles iff identical
            expect(asHarness.mcp).toBe(true);
        it('ProviderHookEvents === HarnessHookEvents'):
            const hooks: ProviderHookEvents = { onStream: () => {} };
            const asHarness: HarnessHookEvents = hooks; expect(typeof hooks.onStream).toBe('function');
        it('ProviderExecutionOptions === HarnessExecutionOptions'):
            const o: ProviderExecutionOptions = { model:'anthropic/claude-sonnet-4', streaming:true };
            const asHarness: HarnessExecutionOptions = o; expect(o.streaming).toBe(true);
        it('ProviderRequest === HarnessRequest'):
            const r: ProviderRequest = { prompt:'hi', options:{} };
            const asHarness: HarnessRequest = r; expect(r.prompt).toBe('hi');
        it('ToolExecutionRequest/Result are the harness types'):
            const req: ToolExecutionRequest = { name:'fs__read', input:{} };
            const res: ToolExecutionResult = { content:'x', isError:false };
            expect(req.name).toBe('fs__read'); expect(res.isError).toBe(false);
        it('ModelSpec accepts the open ModelProviderId set'):
            const spec: ModelSpec = { provider:'openai', model:'gpt-4o', raw:'openai/gpt-4o' };
            expect(spec.provider).toBe('openai');
        it('ProviderId is a superset (harness + legacy literals)'):
            const ids: ProviderId[] = ['pi','claude-code','anthropic','opencode'];
            const pi: ProviderId = 'pi';            // new harness axis
            const legacy: ProviderId = 'anthropic'; // pre-migration adapter id
            expect(ids).toHaveLength(4); expect(pi).toBe('pi'); expect(legacy).toBe('anthropic');
        it('Bucket C concrete types still work'):
            // ProviderOptions keeps session fields
            const opts: ProviderOptions = { sessionPersistence:'file', sessionPath:'/tmp', sessionTtl:1000 };
            expect(opts.sessionPersistence).toBe('file');
            // GlobalProviderConfig keeps old field names
            const cfg: GlobalProviderConfig = { defaultProvider:'anthropic',
              providerDefaults:{ anthropic:{ apiKey:'sk-' } } };
            expect(cfg.defaultProvider).toBe('anthropic');
            // SessionState shape intact
            const st: SessionState = { history:[], lastResult:null };
            expect(st.history).toHaveLength(0);
  - NAMING: test file `provider-alias-shim.test.ts` in src/__tests__/unit/providers/.
  - PLACEMENT: alongside the existing provider-* test files.
  - COVERAGE: every Bucket A alias (identity check), ProviderId superset, and a smoke check that
    each Bucket C concrete type still exposes the fields consumers rely on.

Task 7: VERIFY the broader suite still passes (NO code change — run and fix only if a test breaks)
  - RUN the suites that exercise Provider* most heavily:
      npm test -- src/__tests__/unit/provider-result-types.test.ts
      npm test -- src/__tests__/unit/harnesses-types.test.ts
      npm test -- src/__tests__/unit/harnesses-config-types.test.ts
      npm test -- src/__tests__/unit/providers/provider-registry.test.ts
      npm test -- src/__tests__/unit/providers/anthropic-provider.test.ts
      npm test -- src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
      npm test -- src/__tests__/unit/providers/provider-alias-shim.test.ts   # the new one
      npm test                                                                # full suite
  - If any BREAKS: it almost certainly means a Bucket-C type was wrongly aliased (erasing a field a
    test reads). Revert that alias to concrete. Do NOT "fix" the test by editing consumers — that
    is out of scope (P1.M2/P2/P3 own those files).
```

### Implementation Patterns & Key Details

```ts
// src/types/providers.ts — shape of the rewritten shim (illustrative, not exhaustive).
import type { Tool, MCPServer, Skill, TokenUsage } from "./sdk-primitives.js";
import type { AgentResponse } from "./agent.js";
import type { StreamEvent } from "./streaming.js";
import type {
  HarnessId,
  HarnessCapabilities,
  HarnessHookEvents,
  HarnessExecutionOptions,
  HarnessRequest,
  ToolExecutionRequest,
  ToolExecutionResult,
  ModelSpec,
} from "./harnesses.js";

// ── Bucket B: deprecated SUPERSET (preserves legacy literals + adds harness axis) ───────────
/** @deprecated Since v1.2. Split into HarnessId (runtime) + ModelProviderId (LLM host). */
export type ProviderId = HarnessId | 'anthropic' | 'opencode';

// ── Bucket A: @deprecated aliases → Harness* counterparts ───────────────────────────────────
/** @deprecated Since v1.2. Use HarnessCapabilities (types/harnesses.ts). */
export type ProviderCapabilities = HarnessCapabilities;
/** @deprecated Since v1.2. Use HarnessHookEvents. */
export type ProviderHookEvents = HarnessHookEvents;
/** @deprecated Since v1.2. Use HarnessExecutionOptions. */
export type ProviderExecutionOptions = HarnessExecutionOptions;
/** @deprecated Since v1.2. Use HarnessRequest. */
export type ProviderRequest = HarnessRequest;
/** @deprecated Since v1.2. Use ModelSpec from types/harnesses.ts directly. */
export type { ModelSpec };

// Shared tool-exec types — now canonical in harnesses.ts; re-exported (NOT deprecated, same name).
export type { ToolExecutionRequest, ToolExecutionResult };

// ── Bucket C: KEPT CONCRETE (shape diverges / consumers depend on specifics) + @deprecated ──
/** @deprecated Since v1.2. Use HarnessOptions (slimmed — no session* fields). */
export interface ProviderOptions { /* …UNCHANGED body: endpoint?, apiKey?, sessionId?, timeout?,
  headers?, sessionStore?, sessionPersistence?, sessionTtl?, sessionPath?… */ }

/** @deprecated Since v1.2. Harness-adapter-internal; Anthropic-SDK-specific. */
export interface SessionState { /* …UNCHANGED body… */ }

/** @deprecated Since v1.2. Use GlobalHarnessConfig (field renames + defaultModelProvider). */
export interface GlobalProviderConfig { /* …UNCHANGED body… */ }

/** @deprecated Since v1.2. Implement Harness instead. Kept concrete (id-type width). */
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;
  execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents):
    | Promise<AgentResponse<T>>
    | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
  supports(capability: keyof ProviderCapabilities): boolean;
  requiresFeatures(features: (keyof ProviderCapabilities)[]): boolean;
}

// ToolExecutor — concrete; references aliased Tool* types; NOT deprecated (shared util).
export type ToolExecutor = (request: ToolExecutionRequest) => Promise<ToolExecutionResult>;

// ── ProviderResult family — UNCHANGED (already @deprecated → AgentResponse) ────────────────
export type ProviderResponseStatus = "success" | "error" | "partial";   // body unchanged
export interface ProviderErrorDetails { /* …unchanged… */ }
export interface ProviderResponseMetadata { /* …unchanged… */ }
export interface ProviderResult<T = unknown> { /* …unchanged… */ }
```

### Integration Points

```yaml
TYPES:
  - src/types/harnesses.ts : SOURCE OF TRUTH for Harness*/ModelSpec (no edit; S1+S2 own it).
  - src/types/providers.ts : the compat shim (this task). Aliases point INTO harnesses.ts.

BARRELS (NO change needed — they re-export by name, which still resolves):
  - src/types/index.ts : re-exports Provider*, ModelSpec, SessionState, GlobalProviderConfig, etc.
    from './providers.js'. Every name still exists post-shim → no edit.
  - src/index.ts       : public API re-exports the same Provider* names from './types/index.js'.
    External consumers are UNAFFECTED (semver-compatible alias, not a removal).

CONSUMERS (must keep compiling — DO NOT EDIT; owned by later tasks):
  - src/providers/anthropic-provider.ts : implements Provider; id: ProviderId="anthropic".
  - src/providers/opencode-provider.ts  : implements Provider; id: ProviderId="opencode".
  - src/providers/provider-registry.ts  : Map<ProviderId, Provider>; initializeProvider(id, opts?).
  - src/core/agent.ts                   : ProviderRequest, ProviderOptions, providerId cascade.
  - src/types/agent.ts                  : AgentConfig.provider/providerOptions, PromptOverrides.*.
  - src/utils/provider-config.ts        : GlobalProviderConfig, configureProviders, resolveProviderConfig.

NOT IN SCOPE (do not touch — owned downstream):
  - configureHarnesses / resolveHarnessConfig / HarnessRegistry            → P1.M2.T1.S2 / P1.M2.T2.S1.
  - Renaming AnthropicProvider→ClaudeCodeHarness / adding PiHarness         → P2.M1 / P2.M2.
  - src/index.ts Harness* exports + public-API alias surface               → P3.M3.T1.S1.
  - OpenCodeProvider + 'opencode' literal deletion                          → P4.M1.T1.S1.
```

---

## Validation Loop

> **Toolchain note:** TypeScript + vitest. `npm run lint` = `tsc --noEmit` (type check; **excludes
> `src/__tests__`** per tsconfig.json). `npm test` = `vitest run` (esbuild transpile-only — runs
> tests, does NOT type-check them). There is NO eslint/prettier. So: **`npm run lint` is the ONLY
> gate that catches a broken alias in non-test `src/`**; `npm test` catches behavioral regressions.

### Level 1: Syntax & Type Check (run after Tasks 1-5)

```bash
# Type-check the whole (non-test) src/ tree. MUST be exit 0. This is the load-bearing gate:
# any alias that erased a field a consumer reads surfaces here as a tsc error naming that consumer.
npm run lint

# If errors mention anthropic-provider.ts / opencode-provider.ts / provider-registry.ts /
# agent.ts / provider-config.ts → a Bucket-C type was wrongly aliased. Revert it to concrete.
# Expected: zero errors.
```

### Level 2: Unit Tests (run after Task 6)

```bash
# The new alias-shim suite (identity + superset assertions)
npm test -- src/__tests__/unit/providers/provider-alias-shim.test.ts

# The suites that exercise Provider* most heavily (regression safety net)
npm test -- src/__tests__/unit/provider-result-types.test.ts
npm test -- src/__tests__/unit/harnesses-types.test.ts
npm test -- src/__tests__/unit/harnesses-config-types.test.ts
npm test -- src/__tests__/unit/providers/provider-registry.test.ts
npm test -- src/__tests__/unit/providers/provider-interface.test.ts
npm test -- src/__tests__/unit/providers/anthropic-provider.test.ts
npm test -- src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
npm test -- src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts

# Full suite (catch anything else)
npm test
# Expected: all pass. A failure usually means a Bucket-C type was aliased (field erased) — revert it.
```

### Level 3: Targeted Behavior Verification (manual one-liner)

```bash
# Confirm the alias surface + ProviderId superset at runtime via the project tsx:
npx tsx -e '
  import * as legacy from "./src/types/providers.js" assert {};
  // (types are erased at runtime; this mainly confirms the module loads without error)
  console.log("providers.ts module loaded OK");
'
# Expected: "providers.ts module loaded OK" (no import/syntax errors). The semantic guarantees
# (alias identity, ProviderId superset) are asserted by provider-alias-shim.test.ts in Level 2.
```

### Level 4: Build (declaration-emit sanity check)

```bash
# Confirms the alias shim emits valid .d.ts declarations (export type X = Y; re-exports; etc.)
npm run build
# Expected: exit 0, dist/ regenerated without errors.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` (`tsc --noEmit`) passes with exit 0 — no consumer of `Provider*` breaks.
- [ ] `npm test` (`vitest run`) passes — full suite incl. the new `provider-alias-shim.test.ts`.
- [ ] `npm run build` succeeds (valid `.d.ts` emit from the alias shim).
- [ ] No file other than `src/types/providers.ts` and
      `src/__tests__/unit/providers/provider-alias-shim.test.ts` was modified.

### Feature Validation

- [ ] Bucket A: `ProviderCapabilities`, `ProviderHookEvents`, `ProviderExecutionOptions`,
      `ProviderRequest` are `export type … = Harness…;` aliases; `ToolExecutionRequest`/
      `ToolExecutionResult` are same-name re-exports; `ModelSpec` re-export preserved.
- [ ] Bucket B: `ProviderId === HarnessId | 'anthropic' | 'opencode'` (all four literals accepted).
- [ ] Bucket C: `ProviderOptions`, `SessionState`, `GlobalProviderConfig`, `Provider` (interface),
      `ToolExecutor` keep their current bodies; the first four carry a refreshed `@deprecated` JSDoc.
- [ ] `ProviderResult` / `ProviderResponseStatus` / `ProviderErrorDetails` /
      `ProviderResponseMetadata` are byte-for-byte unchanged.
- [ ] Every aliased `Provider*` type (Buckets A + B + C-interface) has a `@deprecated` JSDoc with a
      migration pointer to its `Harness*` / split counterpart.
- [ ] `src/types/index.ts` and `src/index.ts` re-exports lists still resolve (no missing names).

### Code Quality Validation

- [ ] The shim imports from `./harnesses.js` (the v1.2 source of truth), not redefined locally.
- [ ] No closed-union `'anthropic' | 'opencode'` survives as a *redirect* (it only survives inside
      the explicit `ProviderId` superset, which is documented as transitional).
- [ ] `@deprecated` JSDoc blocks follow the existing ProviderResult style (version + "Use X" + recipe).
- [ ] The new test mirrors the type-assertion style of `provider-result-types.test.ts` /
      `harnesses-types.test.ts` and asserts runtime values (not type-only).

---

## Anti-Patterns to Avoid

- ❌ Don't write `export type ProviderId = HarnessId;` — it makes `"anthropic"`/`"opencode"`
  unassignable in the adapters + registry + agent + provider-config and fails `npm run lint`. Use the
  superset `HarnessId | 'anthropic' | 'opencode'`.
- ❌ Don't write `interface Provider extends Harness {}` — the adapters declare `id: ProviderId`
  (wide) which is incompatible with `Harness.id: HarnessId` (narrow) under `implements`. Keep
  `Provider` concrete.
- ❌ Don't alias `ProviderOptions` → `HarnessOptions` — `HarnessOptions` was deliberately slimmed
  (no session fields); the adapters read those fields. Keep `ProviderOptions` concrete.
- ❌ Don't alias `GlobalProviderConfig` → `GlobalHarnessConfig` — the field names differ
  (`defaultProvider`→`defaultHarness`, etc.) and `provider-config.ts` + tests use the old names.
  Keep concrete; P1.M2.T2.S1 owns the successor.
- ❌ Don't edit ANY consumer (adapters, registry, agent.ts, agent.ts types, provider-config.ts,
  barrels) to "make it compile" — that is P1.M2 / P2 / P3 scope. The shim must be self-contained.
- ❌ Don't mark `ToolExecutionRequest` / `ToolExecutionResult` / `ToolExecutor` `@deprecated` — they
  are the canonical tool-exec types (just relocated to harnesses.ts), not Provider*→Harness* renames.
- ❌ Don't touch the `ProviderResult` family — it is already fully `@deprecated` → `AgentResponse`.
- ❌ Don't trust `npm test` alone — vitest/esbuild does NOT type-check (and tsconfig excludes tests
  from `tsc`). `npm run lint` is the only gate that catches a broken non-test alias.
- ❌ Don't delete the existing `@deprecated` JSDoc on `ProviderResult` etc. to "tidy up" — they are
  the style template and must remain intact.

---

## Hand-off Notes for Downstream Tasks

- **P1.M2.T1.S2 (HarnessRegistry):** `ProviderRegistry` becomes `HarnessRegistry` keyed by
  `HarnessId`. Once the registry stops accepting `'anthropic'`/`'opencode'`, the `ProviderId`
  superset can be narrowed — but NOT before the adapters (P2.M1) and OpenCode removal (P4.M1) land.
- **P1.M2.T2.S1 (configureHarnesses):** Owns `GlobalHarnessConfig` + `configureHarnesses()` +
  `resolveHarnessConfig()`. The concrete `GlobalProviderConfig` + `configureProviders()` kept here
  is its deprecated predecessor; that task wires the replacement and may then deprecate/remove the
  old runtime functions (this task only touches types).
- **P2.M1 (ClaudeCodeHarness):** Renames `AnthropicProvider` → `ClaudeCodeHarness`, switches
  `id: ProviderId="anthropic"` → `id: HarnessId="claude-code"`, and `implements Provider` →
  `implements Harness`. At that point the concrete `Provider` interface here has no live
  implementer on the anthropic side and can be deleted (after OpenCode removal).
- **P3.M3.T1.S1 (public API):** Exports the `Harness*` surface from `src/index.ts` ALONGSIDE the
  deprecated `Provider*` aliases (which this shim keeps resolving). No conflict — both coexist.
- **P4.M1.T1.S1 (OpenCode removal):** Deletes `OpenCodeProvider` + the `'opencode'` literal. After
  it AND P2.M1 land, the `ProviderId` superset can finally collapse to just `HarnessId` (or be
  removed entirely), and the `Provider` interface + `Provider*` aliases can be deleted in v2.0.0.
