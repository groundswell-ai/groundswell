# PRP — P3.M2.T2.S1: Add harness/harnessOptions to PromptOverrides

**PRD reference:** §7.7 (Configuration Cascade — harness axis: GlobalHarnessConfig.defaultHarness →
AgentConfig.harness/harnessOptions → **PromptOverrides.harness/harnessOptions**, highest priority,
null-coalescing), §7.9 (`AgentConfig` harness extensions — PromptOverrides mirrors the same field
pair), §7.2 (`HarnessId`), §7.5 (`HarnessOptions`), §7.13 (`agent.prompt(myPrompt, { harness:
'claude-code' })` — the prompt-level harness switch that THIS field enables), §7 (harness ⊥
provider/model; the harness never appears in the model string). **Plan:** `plan/004_9a50e71828f4/` —
S1 of P3.M2.T2 ("PromptOverrides harness fields"). **Consumes:** `HarnessId` + `HarnessOptions` from
`src/types/harnesses.ts` (P1.M1.T1.S1) and the `Provider*` deprecated aliases from
`src/types/providers.ts` (P1.M1.T3.S1). **Produces:** the canonical `PromptOverrides` harness surface
that `Agent.executePrompt` / `Agent.stream` read (P3.M1.T2.S1.S1 + S2 — already Complete and already
consuming `overrides?.harness` / `overrides?.harnessOptions` at `src/core/agent.ts` L365-366 + L609-610).
**Unblocks:** nothing new at runtime (the harness fields are already wired); this item **completes the
contract** by formalising the deprecation JSDoc on the legacy `provider`/`providerOptions` + adding a
type-validation test. **Scope tag:** (a) in `src/types/agent.ts` `PromptOverrides` ADD a full migration
`@deprecated` JSDoc (BEFORE/AFTER) to `provider?:` (L~216-228) and `providerOptions?:` (L~230-243),
both pointing consumers at `harness`/`harnessOptions`, following the convention just landed in the
sibling `AgentConfig` block (src/types/agent.ts L106/L128) and `src/types/providers.ts`; (b) **pre-flight
grep** to defensively verify `harness?`/`harnessOptions?` + the `HarnessId`/`HarnessOptions` import are
present (P3.M1.T2.S1 already added them — this guard makes the two items idempotent / zero-conflict);
(c) **CREATE** `src/__tests__/unit/prompt-overrides-types.test.ts` mirroring the sibling
`src/__tests__/unit/agent-config-types.test.ts` (created in parallel by P3.M2.T1.S1). **DO NOT touch**
`AgentConfig` (L15-152 — P3.M2.T1.S1's region, just landed), `src/core/agent.ts` (P3.M1.* — already
reads the fields at L365/L609), `src/types/providers.ts` (alias shim, already @deprecated), or
`src/types/index.ts` (`PromptOverrides` already re-exported).

> **READ "CURRENT STATE REALITY" + "SCOPE DECISIONS" BEFORE WRITING CODE.** The `harness`/`harnessOptions`
> fields ALREADY EXIST (P3.M1.T2.S1 added them; they are already consumed at runtime by `src/core/agent.ts`
> L365-366 / L609-610). This is a **completion / contract-closure** task, not a greenfield addition. The
> change is mechanically: (1) rewrite two JSDoc blocks (no type changes whatsoever — `@deprecated` is a
> JSDoc tag, not a type), and (2) add one test file. Because nothing about the TypeScript *types* changes,
> `npm run lint` is expected to pass trivially; the load-bearing gates are the **contract grep checks**
> (both legacy fields carry the migration deprecation with the BEFORE/AFTER wording) and the **new vitest test**.

---

## Goal

**Feature Goal:** Make `PromptOverrides` (in `src/types/agent.ts`, interface L158–244) the **canonical,
migration-complete** carrier of the per-call harness-override surface defined by PRD §7.7 / §7.13 —
`harness?: HarnessId` and `harnessOptions?: HarnessOptions` — with the legacy `provider?:` /
`providerOptions?:` fields clearly marked `@deprecated` and pointing consumers at the new `harness` /
`harnessOptions` fields via the codebase's established migration-JSDoc convention (BEFORE/AFTER code
blocks, as just landed in `AgentConfig` and as in `src/types/providers.ts`). After S1, any reader of
`PromptOverrides` sees exactly which fields are current (harness/harnessOptions) and which are legacy
(provider/providerOptions) with unambiguous migration guidance — and a dedicated type-validation test
locks the surface against regressions. This realises PRD §7.13's `agent.prompt(myPrompt, { harness:
'claude-code' })` contract at the type level.

**Deliverable:**
1. **MODIFY `src/types/agent.ts`** — in the `PromptOverrides` interface (L158–244):
   - **REPLACE** the `provider?: ProviderId;` JSDoc block (currently L~216-228, a "highest priority in
     the provider cascade" prose block with an `@example` showing `provider: 'opencode'`, **NO
     `@deprecated`**) with a full migration JSDoc: `@deprecated Since v1.2. Use
     {@link PromptOverrides.harness} / {@link PromptOverrides.harnessOptions}` + rationale (harness ⊥
     provider/model per PRD §7; the harness is chosen separately and never appears in the model string) +
     a BEFORE/AFTER code block matching the `AgentConfig.provider` block that just landed at L106. See
     **Implementation Patterns** for the exact text. The `@example` must NOT recommend `'opencode'`
     (being deleted in P4.M1) — use the P3.M2.T1.S1 precedent (`provider: 'anthropic'` →
     `harness: 'claude-code'`). Field signature UNCHANGED.
   - **REPLACE** the `providerOptions?: ProviderOptions;` JSDoc block (currently L~230-243, a
     merge-semantics "last write wins" prose block, **NO `@deprecated`**) with a migration JSDoc that
     points consumers at `harnessOptions` and notes that `HarnessOptions` is **slimmed** (omits
     `sessionStore` / `sessionPersistence` / `sessionTtl` / `sessionPath`). Replace the now-stale
     "provider cascade" prose — the cascade is now the **harness** cascade per PRD §7.7 (see Scope
     Decision 2). Match the `AgentConfig.providerOptions` block that just landed at L128. Field
     signature UNCHANGED.
   - **DEFENSIVE pre-flight grep** (see Task 1): confirm `harness?:`, `harnessOptions?:`, and the
     `HarnessId`/`HarnessOptions` import are already present. They are (added by P3.M1.T2.S1). If the
     grep finds any ABSENT, add it per **Task 1 step 3** (idempotent guard).
2. **CREATE `src/__tests__/unit/prompt-overrides-types.test.ts`** — mirror the sibling
   `src/__tests__/unit/agent-config-types.test.ts` (created in parallel by P3.M2.T1.S1) and the canonical
   `src/__tests__/unit/harnesses-types.test.ts` (runtime-value assertions + type-annotated object
   literals; esbuild strips types so assertions must be runtime-meaningful). Assert: (a) `PromptOverrides`
   accepts `{ harness: 'pi' }` and `{ harness: 'claude-code' }`; (b) `PromptOverrides` accepts
   `{ harnessOptions: { endpoint, apiKey, sessionId, timeout, headers } }` (full `HarnessOptions` shape)
   and round-trips the values; (c) the PRD §7.13 call shape `{ model: 'openai/gpt-4o' }` (harness
   unchanged) and `{ harness: 'claude-code' }` (harness switch) both construct; (d) **backward
   compatibility** — `{ provider: 'anthropic', providerOptions: { endpoint: '...' } }` still type-checks
   & constructs without error (legacy fields retained, not removed); (e) the four fields coexist on one
   object literal `{ harness, harnessOptions, model, provider, providerOptions }`.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`, covers `src/**/*` **excluding** `src/__tests__`) exits **0** — confirms
   the JSDoc edits to `src/types/agent.ts` introduce no type errors (expected: trivial pass; `@deprecated`
   is not a type).
2. `npm test` (`vitest run`) exits **0** — the NEW `prompt-overrides-types.test.ts` passes AND the
   **entire existing suite stays green** (notably `src/__tests__/unit/agent-prompt-provider-override.test.ts`
   and `src/__tests__/unit/agent-stream-provider-override.test.ts` which exercise the prompt-level override
   path, and `src/__tests__/integration/provider-switching.test.ts` which exercises the cascade).
3. `npm run build` (`tsc`) exits **0** — `dist/types/agent.js` + `dist/types/agent.d.ts` emit cleanly.
4. **Contract grep checks** (all must pass):
   - `grep -c "@deprecated" src/types/agent.ts` → **≥ 5** (was 3 — AgentConfig's 3 from P3.M2.T1.S1 +
     2 new in PromptOverrides).
   - `grep -n "harness?: HarnessId" src/types/agent.ts` → **2 hits** (AgentConfig L98 + PromptOverrides L196).
   - `grep -n "harnessOptions?: HarnessOptions" src/types/agent.ts` → **≥ 2 hits** (AgentConfig L101 +
     PromptOverrides L199).
   - `grep -c "// BEFORE (v1.x)" src/types/agent.ts` → **≥ 4** (2 from AgentConfig + 2 new).
   - `grep -c "// AFTER (v1.2)" src/types/agent.ts` → **≥ 4**.
   - The `PromptOverrides.provider?` and `PromptOverrides.providerOptions?` JSDoc blocks each contain
     `Use {@link PromptOverrides.harness` (or `harnessOptions`) and a `// BEFORE (v1.x)` / `// AFTER (v1.2)` pair.
5. **No scope leak** — `AgentConfig` (L15–152) is byte-identical to HEAD (P3.M2.T1.S1's output);
   `src/core/agent.ts` is not modified (P3.M1.* owns it; the fields already flow through L365-366/L609-610).

---

## Why

- **Closes the migration contract for the prompt-level override.** PRD §7.7 names `PromptOverrides.harness` /
  `harnessOptions` as the **highest-priority** node in the harness cascade (above AgentConfig, above the
  global default), and PRD §7.13 shows the headline usage `agent.prompt(myPrompt, { harness: 'claude-code' })`.
  P3.M1.T2.S1 added the *fields* + wired them into `Agent.executePrompt`/`stream` (already Complete and
  reading them at `src/core/agent.ts` L365-366 / L609-610), but deliberately left the *deprecation JSDoc*
  on the legacy `provider`/`providerOptions` absent. This item formalises the migration messaging so
  consumers migrating off v1.x `provider`/`providerOptions` have unambiguous BEFORE/AFTER guidance —
  matching the precedent just landed in `AgentConfig` (P3.M2.T1.S1) and the alias shim (`src/types/providers.ts`).
- **Defends the surface.** A dedicated `prompt-overrides-types.test.ts` (mirroring the sibling
  `agent-config-types.test.ts`) prevents silent regressions to the PromptOverrides field set during the
  remaining P3/P4 migration work.
- **Zero runtime risk.** The change is JSDoc-only on the source side + an additive test. No type
  signatures change; no consumer recompiles differently. The runtime already reads both axes in lockstep
  (`overrides?.harness ?? overrides?.provider`), so deprecating `provider`/`providerOptions` changes zero
  behavior — it only steers new code toward the harness fields.

## What

User-visible behavior: **none** (types + JSDoc only; no runtime behavior change). Developers reading
`PromptOverrides` see clear `@deprecated` migration guidance on `provider`/`providerOptions` and a
validated harness surface (`harness`/`harnessOptions`), enabling the PRD §7.13 per-call harness switch.

### Success Criteria

- [ ] `PromptOverrides.provider?` carries a full migration `@deprecated` JSDoc (BEFORE/AFTER) referencing
      `harness`/`harnessOptions`; the stale `'opencode'` example is removed.
- [ ] `PromptOverrides.providerOptions?` carries a full migration `@deprecated` JSDoc (BEFORE/AFTER)
      referencing `harnessOptions` + the "HarnessOptions is slimmed" note.
- [ ] `PromptOverrides.harness?` / `harnessOptions?` + the `HarnessId`/`HarnessOptions` import are present
      (verified by pre-flight grep; added only if absent).
- [ ] `src/__tests__/unit/prompt-overrides-types.test.ts` exists and asserts the surface + backward compat.
- [ ] `npm run lint`, `npm test`, `npm run build` all exit 0; existing suite stays green.
- [ ] `AgentConfig`, `src/core/agent.ts`, `src/types/providers.ts`, `src/types/index.ts` untouched.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes** — this PRP gives: exact file + line ranges, the verbatim migration-JSDoc wording to
emit, the canonical pattern files to mirror (`src/types/providers.ts` + the `AgentConfig` blocks that just
landed), the test pattern file to mirror (`src/__tests__/unit/agent-config-types.test.ts` +
`src/__tests__/unit/harnesses-types.test.ts`), the verified validation commands, and the explicit
out-of-scope list. The only judgment call (replace vs. preserve the legacy `providerOptions` merge prose)
is resolved in **Scope Decision 2**.

### Documentation & References

```yaml
# MUST READ — include these in your context window
- url: plan/004_9a50e71828f4/prd_snapshot.md
  why: "PRD §7.7 (cascade — PromptOverrides.harness is highest priority), §7.9 (AgentConfig extensions, mirrored by PromptOverrides), §7.13 (agent.prompt(prompt,{harness:'claude-code'}) — the call this field enables), §7.2 (HarnessId), §7.5 (HarnessOptions), §7 (harness ⊥ provider)."
  critical: "§7.7 lists PromptOverrides.harness/harnessOptions as the TOP of the harness cascade (null-coalescing). §7: the harness NEVER appears in the model string. §7.13 is the headline usage."

- file: src/types/agent.ts
  why: "THE edit target. PromptOverrides interface = L158-244. harness? = L196, harnessOptions? = L199, provider? = L216-228 (NO @deprecated), providerOptions? = L230-243 (NO @deprecated). Import = L9."
  pattern: "Existing JSDoc style (TSDoc with @example <caption>, @see {@link ...}, @default). Match it. ALSO read the sibling AgentConfig.provider (L~100-123) + AgentConfig.providerOptions (L~125-151) blocks — P3.M2.T1.S1 just landed them; replicate their BEFORE/AFTER shape for PromptOverrides."
  gotcha: "AgentConfig (L15-152) is P3.M2.T1.S1's region (just landed) — DO NOT edit it. Edit ONLY PromptOverrides (L158-244)."

- file: plan/004_9a50e71828f4/P3M2T1S1/PRP.md
  why: "The SIBLING precedent — same operation on AgentConfig. Its 'Implementation Patterns' section contains the verbatim BEFORE/AFTER migration-JSDoc text to adapt (swap AgentConfig.harness → PromptOverrides.harness). It landed successfully during research."
  pattern: "Mirror its structure exactly: pre-flight grep → JSDoc rewrites → additive test → contract greps."

- file: src/types/providers.ts
  why: "The canonical migration-JSDoc convention to replicate. Bucket A examples (ProviderCapabilities→HarnessCapabilities L45-56, ProviderHookEvents L57-67, ProviderRequest L81-90) and Bucket C ProviderOptions→HarnessOptions (L113-125) all use '@deprecated Since v1.2. Use {@link ...}' + BEFORE/AFTER code block."
  pattern: "Replicate this exact BEFORE/AFTER block style for PromptOverrides.provider and PromptOverrides.providerOptions."
  gotcha: "ProviderId is a SUPERSET union (HarnessId | 'anthropic' | 'opencode') — Bucket B; ProviderOptions is Bucket C (KEPT CONCRETE, slimmed vs HarnessOptions). Don't 'fix' these; just reference them."

- file: src/types/harnesses.ts
  why: "Source of HarnessId (L~14: 'pi' | 'claude-code') and HarnessOptions (L~74: endpoint/apiKey/sessionId/timeout/headers — NO session-store fields)."
  pattern: "HarnessOptions is intentionally SLIMMED relative to ProviderOptions — your providerOptions @deprecated note MUST mention this (4 omitted fields)."

- file: src/__tests__/unit/agent-config-types.test.ts
  why: "THE sibling test pattern (created in parallel by P3.M2.T1.S1). Mirror its describe/it/expect structure exactly for prompt-overrides-types.test.ts."
  pattern: "import type {...} from '../../types/...'; vitest describe/it/expect; runtime value assertions (expect(x).toBe('pi')) + type-annotated literals. esbuild strips types, so every assertion MUST have a runtime expect()."
  gotcha: "If that file does not yet exist at implementation time (P3.M2.T1.S1 still in flight), fall back to src/__tests__/unit/harnesses-types.test.ts — same convention."

- file: src/__tests__/unit/harnesses-types.test.ts
  why: "The canonical type-validation test pattern for this codebase (P1.M1.T1.S1's). The FALLBACK pattern if the sibling agent-config-types.test.ts is not yet present."
  pattern: "import type {...} from '../../types/...'; vitest describe/it/expect; runtime value assertions on type-annotated literals."

- file: src/core/agent.ts
  why: "PROOF the harness fields are already wired. L365-366 (prompt) + L609-610 (stream): `const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined); const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;`."
  pattern: "Read-only confirmation. DO NOT EDIT. The lockstep `?? overrides?.provider` cast means BOTH axes work today; deprecating provider is advisory, not a removal."

- file: plan/004_9a50e71828f4/P3M2T2S1/research/findings.md
  why: "This task's research note — documents the 'fields already exist + already consumed' finding, exact current line state (verified post-P3.M2.T1.S1-landing), and the migration-JSDoc convention."
  section: "Verified current state table + Runtime consumption contract + Sibling precedent."
```

### Current Codebase tree (relevant slice)

```bash
src/types/
├── agent.ts          # EDIT TARGET — PromptOverrides (L158-244). AgentConfig (L15-152) is P3.M2.T1.S1's, DO NOT TOUCH.
├── harnesses.ts      # READ — HarnessId, HarnessOptions (canonical source)
├── providers.ts      # READ — migration-JSDoc BEFORE/AFTER convention to replicate; Provider* aliases
└── index.ts          # READ — PromptOverrides already re-exported; no change
src/__tests__/unit/
├── harnesses-types.test.ts          # READ — canonical test pattern (fallback)
├── agent-config-types.test.ts       # READ — sibling test pattern (mirror; created by P3.M2.T1.S1)
├── agent-prompt-provider-override.test.ts  # READ — existing suite that must stay green
├── agent-stream-provider-override.test.ts  # READ — existing suite that must stay green
└── prompt-overrides-types.test.ts   # CREATE — new type-validation test (THIS task)
src/core/agent.ts    # READ-ONLY — L365-366/L609-610 prove the fields are already consumed
plan/004_9a50e71828f4/
├── P3M2T1S1/PRP.md  # READ — sibling precedent (same operation on AgentConfig, just landed)
└── P3M2T2S1/
    ├── PRP.md        # THIS FILE
    └── research/findings.md
```

### Desired Codebase tree with files added/modified

```bash
src/types/agent.ts                              # MODIFY — PromptOverrides.provider? JSDoc replaced (deprecation added);
                                                #          PromptOverrides.providerOptions? JSDoc replaced (deprecation added)
src/__tests__/unit/prompt-overrides-types.test.ts  # CREATE — PromptOverrides surface + backward-compat test
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — the fields ALREADY EXIST. P3.M1.T2.S1 added harness?/harnessOptions? + the
//   HarnessId/HarnessOptions import. AND they are already consumed at runtime by src/core/agent.ts
//   L365-366 (prompt) + L609-610 (stream). This task is a COMPLETION (deprecation JSDoc + test),
//   NOT a greenfield addition. Run the pre-flight grep in Task 1 BEFORE editing; if harness? is
//   already present, DO NOT re-add it (would duplicate).

// CRITICAL #2 — @deprecated is a JSDoc TAG, not a TypeScript type. Adding/enhancing it changes ZERO
//   types. `npm run lint` (tsc --noEmit) will pass trivially. The load-bearing gates are the contract
//   GREP checks (Success Definition #4) and the new vitest test.

// CRITICAL #3 — tsconfig "exclude": ["src/__tests__"]. tsc does NOT type-check the test dir.
//   vitest uses esbuild (strips types, no type-check). So the new test MUST use runtime expect()
//   assertions on values (mirror harnesses-types.test.ts / agent-config-types.test.ts).
//   @ts-expect-error in tests is UNVERIFIED — avoid relying on it; prefer positive runtime assertions.

// CRITICAL #4 — HarnessOptions is SLIMMED vs ProviderOptions. It omits sessionStore, sessionPersistence,
//   sessionTtl, sessionPath (those are now harness-adapter internals). The providerOptions @deprecated
//   note MUST say this so migrating users aren't surprised when their sessionPersistence: 'file' has no
//   home on HarnessOptions (see src/types/providers.ts ProviderOptions @deprecated note for the exact
//   phrasing precedent; mirror the AgentConfig.providerOptions note just landed at L128).

// CRITICAL #5 — DO NOT touch AgentConfig (L15-152). P3.M2.T1.S1 just landed it. Editing it here = scope
//   leak + likely merge conflict. Edit ONLY PromptOverrides (L158-244).

// CRITICAL #6 — the current PromptOverrides.provider @example references 'opencode'. 'opencode' is being
//   DELETED in P4.M1. The migration JSDoc must NOT recommend opencode. Use the P3.M2.T1.S1 precedent:
//   BEFORE uses `provider: 'anthropic'`, AFTER uses `harness: 'claude-code'` + `model: 'anthropic/...'`.

// CRITICAL #7 — src/core/agent.ts is NOT edited by this task. The runtime reads BOTH axes in lockstep
//   (overrides?.harness ?? overrides?.provider). Deprecating provider/providerOptions is advisory — it
//   does NOT change the runtime fallthrough. P3.M1.* owns src/core/agent.ts (Complete).
```

## Implementation Blueprint

### Data models and structure

No data models change. The TypeScript *types* are byte-identical before and after this task (the
`harness?: HarnessId` / `harnessOptions?: HarnessOptions` / `provider?: ProviderId` /
`providerOptions?: ProviderOptions` field signatures are unchanged). Only JSDoc comments change. This
section is intentionally empty of model code — see **Implementation Patterns** for the exact JSDoc text.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT GREP (read-only verification — run FIRST, decide branch)
  - RUN: `grep -n "harness?: HarnessId\|harnessOptions?: HarnessOptions" src/types/agent.ts`
  - RUN: `grep -n "import type { ProviderId, ProviderOptions } from './providers.js'" src/types/agent.ts`
  - RUN: `grep -n "import type { HarnessId, HarnessOptions } from './harnesses.js'" src/types/agent.ts`
  - RUN: `grep -c "@deprecated" src/types/agent.ts`   # expect 3 today (all in AgentConfig, from P3.M2.T1.S1)
  - EXPECT: harness? (L196) + harnessOptions? (L199) + both imports ALL PRESENT (P3.M1.T2.S1 added them).
  - DECISION: if ALL present → SKIP Task 1 step 3 (field addition); proceed to Task 1 steps 1-2 (JSDoc).
              if ANY absent → execute Task 1 step 3 (add the missing field/import per spec).

Task 1: MODIFY src/types/agent.ts — PromptOverrides deprecation JSDoc (+ defensive field guard)
  - SCOPE: edit ONLY inside `export interface PromptOverrides { ... }` (L158-244). Do NOT edit AgentConfig (L15-152).
  - STEP 1: REPLACE the `provider?: ProviderId;` JSDoc block (currently ~L216-228, the "highest priority
            in the provider cascade" prose + @example showing `provider: 'opencode'`, NO @deprecated) with
            the full migration JSDoc from "Implementation Patterns → provider block" below. Field signature
            UNCHANGED. The new block must reference {@link PromptOverrides.harness} + {@link PromptOverrides.harnessOptions}
            and include a BEFORE/AFTER code block (BEFORE uses `provider: 'anthropic'`, NOT 'opencode').
  - STEP 2: REPLACE the `providerOptions?: ProviderOptions;` JSDoc block (currently ~L230-243, the
            "last write wins" merge prose, NO @deprecated) with the migration JSDoc from "Implementation
            Patterns → providerOptions block" below. Field signature UNCHANGED. (See Scope Decision 2 re:
            replacing vs preserving the legacy merge prose — REPLACE is recommended.) Reference
            {@link PromptOverrides.harnessOptions} + the "HarnessOptions is slimmed" note.
  - STEP 3 (CONDITIONAL — only if Task 0 found harness?/harnessOptions?/import ABSENT): add the missing
            piece(s), mirroring the AgentConfig placement:
        harness?: HarnessId;            // JSDoc: "Override harness for this prompt (PRD §7.7, §7.9). Highest priority in the harness cascade."
        harnessOptions?: HarnessOptions; // JSDoc: "Override harness options for this prompt (PRD §7.7). Merged via last-write-wins."
      and ensure the import: `import type { HarnessId, HarnessOptions } from './harnesses.js';`
      (P3.M1.T2.S1 already did this; this step is the idempotent safety net.)
  - FOLLOW pattern: src/types/agent.ts AgentConfig.provider (L~100-123) + AgentConfig.providerOptions (L~125-151)
            blocks JUST LANDED by P3.M2.T1.S1 — replicate their BEFORE/AFTER shape, swapping the {@link} target
            to PromptOverrides.harness/harnessOptions. Also consistent with src/types/providers.ts Bucket A/C.
  - NAMING: unchanged (provider?, providerOptions?).
  - PLACEMENT: inside PromptOverrides interface only (L158-244).
  - PRESERVE: every OTHER PromptOverrides field (system, tools, mcps, skills, hooks, env, temperature,
    maxTokens, stop, disableCache, enableReflection, model, harness, harnessOptions) byte-for-byte.

Task 2: CREATE src/__tests__/unit/prompt-overrides-types.test.ts
  - IMPLEMENT: vitest describe/it/expect asserting the PromptOverrides surface (mirror agent-config-types.test.ts;
    FALLBACK to harnesses-types.test.ts if the sibling file is not yet present).
  - ASSERT (each MUST have a runtime expect()):
      (a) `{ harness: 'pi' } as PromptOverrides` and `{ harness: 'claude-code' } as PromptOverrides` →
          expect(overrides.harness).toBe('pi' | 'claude-code').
      (b) `{ harnessOptions: { endpoint, apiKey, sessionId, timeout, headers } } as PromptOverrides` →
          round-trip each field via expect().
      (c) PRD §7.13 shapes: `{ harness: 'claude-code' } as PromptOverrides` (per-call harness switch) and
          `{ model: 'openai/gpt-4o' } as PromptOverrides` (override model only, harness unchanged) →
          construct + expect().
      (d) BACKWARD COMPAT: `{ provider: 'anthropic', providerOptions: { endpoint: 'https://x' } } as PromptOverrides`
          → constructs without error; expect(overrides.provider).toBe('anthropic').
      (e) COEXIST: one object literal carrying harness + harnessOptions + model + provider + providerOptions.
  - FOLLOW pattern: src/__tests__/unit/agent-config-types.test.ts (imports from '../../types/agent.js',
    vitest describe/it/expect, runtime assertions on type-annotated literals).
  - NAMING: file = prompt-overrides-types.test.ts; top describe = 'PromptOverrides types'.
  - COVERAGE: all 4 PromptOverrides harness/provider fields (positive + backward-compat) + the model field.
  - PLACEMENT: src/__tests__/unit/prompt-overrides-types.test.ts.
  - DO NOT: instantiate Agent (not needed; src/__tests__/unit/agent-prompt-provider-override.test.ts already
    covers runtime). Do NOT use @ts-expect-error as a load-bearing assertion (unverified by tsc; esbuild ignores it).

Task 3: VALIDATE (no code change — run the gates)
  - RUN: npm run lint && npm test && npm run build
  - RUN: the contract greps in "Success Definition #4".
  - EXPECT: all exit 0; grep counts match (≥5 @deprecated; 2× harness?/harnessOptions?; ≥4 BEFORE/AFTER).
```

### Implementation Patterns & Key Details

**`provider?: ProviderId;` migration JSDoc (Task 1 step 1 — REPLACE the current cascade block):**

```ts
  /**
   * Override provider for this prompt
   *
   * @deprecated Since v1.2. Use {@link PromptOverrides.harness} (and
   *   {@link PromptOverrides.harnessOptions} for options) instead. The runtime/harness
   *   axis (`'pi'` | `'claude-code'`) is now independent of the LLM provider/model
   *   (PRD §7): the harness is chosen separately, and the model string is never
   *   harness-qualified. This field is the highest-priority node in the PRD §7.7
   *   **harness** cascade (GlobalHarnessConfig.defaultHarness → AgentConfig.harness →
   *   PromptOverrides.harness). Retained for backward compatibility during the v1.2
   *   migration; the Agent runtime reads it in lockstep with `harness`
   *   (`overrides?.harness ?? overrides?.provider` in src/core/agent.ts).
   *
   * ```typescript
   * // BEFORE (v1.x)
   * const response = await agent.prompt(myPrompt, { provider: 'anthropic' });
   * // AFTER (v1.2)
   * const response = await agent.prompt(myPrompt, {
   *   harness: 'claude-code',
   *   model: 'anthropic/claude-sonnet-4-20250514',
   * });
   * ```
   */
  provider?: ProviderId;
```

**`providerOptions?: ProviderOptions;` migration JSDoc (Task 1 step 2 — REPLACE the current merge-semantics block):**

```ts
  /**
   * Override provider options for this prompt
   *
   * @deprecated Since v1.2. Use {@link PromptOverrides.harnessOptions} instead.
   *
   * Note: {@link HarnessOptions} is SLIMMED relative to this type — it omits
   * `sessionStore`, `sessionPersistence`, `sessionTtl`, and `sessionPath` (those are
   * now harness-adapter internals; see `src/types/providers.ts` → `ProviderOptions`
   * @deprecated note). Migrating callers that relied on session-persistence config
   * must move it to the concrete harness adapter.
   *
   * The v1.x provider-options merge cascade is superseded by the PRD §7.7 **harness**
   * cascade (GlobalHarnessConfig.defaultHarness → AgentConfig.harness/harnessOptions →
   * PromptOverrides.harness/harnessOptions), resolved via null-coalescing.
   *
   * ```typescript
   * // BEFORE (v1.x)
   * const response = await agent.prompt(myPrompt, {
   *   providerOptions: { endpoint: 'https://api.example.com', sessionPersistence: 'file' },
   * });
   * // AFTER (v1.2)
   * const response = await agent.prompt(myPrompt, {
   *   harnessOptions: { endpoint: 'https://api.example.com', apiKey: process.env.ANTHROPIC_API_KEY },
   * });
   * ```
   */
  providerOptions?: ProviderOptions;
```

**`prompt-overrides-types.test.ts` skeleton (Task 2 — mirror agent-config-types.test.ts):**

```ts
/**
 * Test file: prompt-overrides-types.test.ts
 *
 * Purpose: Validate the PromptOverrides harness surface per PRD §7.7 / §7.9 / §7.13
 * (harness?, harnessOptions?) plus backward compatibility of the @deprecated provider?/
 * providerOptions? fields.
 *
 * PRP: P3.M2.T2.S1 - Add harness/harnessOptions to PromptOverrides
 */
import { describe, it, expect } from 'vitest';
import type { PromptOverrides } from '../../types/agent.js';
import type { HarnessId, HarnessOptions } from '../../types/harnesses.js';

describe('PromptOverrides types', () => {
  describe('harness field (PRD §7.7 / §7.13)', () => {
    it('accepts harness: "pi"', () => {
      const overrides: PromptOverrides = { harness: 'pi' };
      expect(overrides.harness).toBe('pi');
    });
    it('accepts harness: "claude-code" (per-call harness switch, PRD §7.13)', () => {
      const overrides: PromptOverrides = { harness: 'claude-code' };
      expect(overrides.harness).toBe('claude-code');
    });
    it('harness is assignable to HarnessId', () => {
      const h: HarnessId | undefined = ({ harness: 'pi' } as PromptOverrides).harness;
      expect(h).toBe('pi');
    });
  });

  describe('harnessOptions field (PRD §7.7)', () => {
    it('accepts the full HarnessOptions shape and round-trips values', () => {
      const opts: HarnessOptions = {
        endpoint: 'https://api.example.com',
        apiKey: 'sk-test',
        sessionId: 'sess-1',
        timeout: 60000,
        headers: { 'X-Custom': 'v' },
      };
      const overrides: PromptOverrides = { harnessOptions: opts };
      expect(overrides.harnessOptions?.endpoint).toBe('https://api.example.com');
      expect(overrides.harnessOptions?.apiKey).toBe('sk-test');
      expect(overrides.harnessOptions?.timeout).toBe(60000);
    });
  });

  describe('model field (PRD §7.13 — override model only, harness unchanged)', () => {
    it('accepts a provider-qualified model (never harness-qualified)', () => {
      const overrides: PromptOverrides = { model: 'openai/gpt-4o' };
      expect(overrides.model).toContain('openai/');
    });
  });

  describe('backward compatibility (deprecated provider/providerOptions)', () => {
    it('still accepts provider + providerOptions (legacy, not removed)', () => {
      const overrides: PromptOverrides = {
        provider: 'anthropic',
        providerOptions: { endpoint: 'https://api.example.com', apiKey: 'sk-legacy' },
      };
      expect(overrides.provider).toBe('anthropic');
      expect(overrides.providerOptions?.endpoint).toBe('https://api.example.com');
    });
    it('all five harness/provider fields coexist on one object', () => {
      const overrides: PromptOverrides = {
        harness: 'pi',
        harnessOptions: { timeout: 1000 },
        model: 'anthropic/claude-sonnet-4-20250514',
        provider: 'claude-code',
        providerOptions: { endpoint: 'https://x' },
      };
      expect(overrides.harness).toBe('pi');
      expect(overrides.provider).toBe('claude-code');
    });
  });
});
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (no runtime config touched)
ROUTES: none
PUBLIC API: src/types/index.ts already re-exports PromptOverrides — no change needed.
IMPORTS: src/types/agent.ts L9 already imports HarnessId/HarnessOptions from './harnesses.js' — no change
         (unless Task 0 grep finds it absent).
RUNTIME: src/core/agent.ts L365-366 (prompt) + L609-610 (stream) ALREADY read overrides?.harness /
         overrides?.harnessOptions — NO runtime change needed (lockstep with provider/providerOptions).
```

## ⚠️ SCOPE DECISIONS — the load-bearing details

### Decision 1 — This is a COMPLETION task, not greenfield. Pre-flight grep decides the branch.

`src/types/agent.ts` `PromptOverrides` **already has** `harness?: HarnessId` (L196) and `harnessOptions?:
HarnessOptions` (L199) — P3.M1.T2.S1 added them and **already wired them into the runtime** at
`src/core/agent.ts` L365-366 (prompt) + L609-610 (stream). **Task 0's pre-flight grep is therefore
expected to find everything present** → skip the conditional field-addition (Task 1 step 3) and proceed
straight to the JSDoc work (Task 1 steps 1–2). The conditional step exists purely as an idempotent safety
net so this task and P3.M1.T2.S1 can never conflict or double-add. **Do NOT re-add fields that already
exist** — that would create duplicate declarations and break `npm run lint`.

### Decision 2 — REPLACE the legacy `provider`/`providerOptions` cascade/merge JSDoc (do not append).

The current `provider?` JSDoc (L~216-228) describes the **v1.x provider cascade** ("highest priority in
the provider cascade: PromptOverrides.provider → AgentConfig.provider → GlobalProviderConfig.defaultProvider")
and the `providerOptions?` JSDoc (L~230-243) describes the v1.x "last write wins" provider-options merge.
Post-migration those cascades are **superseded** by the PRD §7.7 **harness** cascade
(GlobalHarnessConfig.defaultHarness → AgentConfig.harness/harnessOptions → PromptOverrides.harness/harnessOptions).
Leaving the old provider-cascade prose on now-`@deprecated` fields would actively mislead readers (and the
`provider?` example still shows `'opencode'`, which is being deleted in P4.M1). **Resolution:** REPLACE
both blocks with the migration JSDoc from **Implementation Patterns** (which points at the harness cascade).
This matches the P3.M2.T1.S1 precedent (Scope Decision 2 there) which just landed identically on AgentConfig.

### Decision 3 — The migration `@example` must NOT use `'opencode'`.

The existing `PromptOverrides.provider` `@example` shows `provider: 'opencode'`. `'opencode'` (OpenCodeProvider)
is on a deletion track (P4.M1.T1.S1). The BEFORE/AFTER migration JSDoc must use the P3.M2.T1.S1 precedent:
BEFORE = `provider: 'anthropic'`, AFTER = `harness: 'claude-code'` + `model: 'anthropic/claude-sonnet-4-...'`.
This keeps the migration guidance forward-looking and not referencing a soon-deleted literal.

### Decision 4 — Test uses runtime assertions, NOT @ts-expect-error (tsc excludes __tests__).

`tsconfig.json` `"exclude": ["src/__tests__"]` means `tsc` (lint + build) never type-checks the test dir;
vitest's esbuild strips types without checking. So `@ts-expect-error` directives in tests are **unverified**
(esbuild silently drops them). **Resolution:** the new test mirrors `agent-config-types.test.ts` /
`harnesses-types.test.ts` — every assertion is a **runtime `expect()`** on a value. Type *annotations* on
object literals (`const overrides: PromptOverrides = {...}`) document intent and are checked only when
`src/types/agent.ts` itself is compiled (it IS in the lint set), so a broken PromptOverrides field would
still fail `npm run lint` via the source file. Do NOT rely on `@ts-expect-error` to prove rejection of bad values.

### Decision 5 — Strict out-of-scope: AgentConfig, core/agent.ts, providers.ts, index.ts.

- `AgentConfig` (L15–152) → **P3.M2.T1.S1** (sibling item, "AgentConfig harness fields"). It **just landed**
  during research (AgentConfig.provider/providerOptions now carry full migration JSDoc at L106/L128).
  Editing it here causes a merge conflict and is redundant. Edit ONLY PromptOverrides (L158-244).
- `src/core/agent.ts` → **P3.M1.*** (Complete). Already reads the harness fields at L365-366/L609-610.
  Zero change needed; the lockstep `?? overrides?.provider` cast means deprecating provider is advisory.
- `src/types/providers.ts` → alias shim, already fully @deprecated (P1.M1.T3.S1). No change.
- `src/types/index.ts` → `PromptOverrides` already re-exported. No change.

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after editing src/types/agent.ts — JSDoc-only change; expect trivial pass.
npm run lint            # tsc --noEmit on src/**/* (excludes src/__tests__). EXPECT: exit 0.
npm run build           # tsc → emits dist/types/agent.{js,d.ts}. EXPECT: exit 0.

# Expected: Zero errors. @deprecated is a JSDoc tag, not a type, so this is a smoke test that no
# accidental edit to a field signature occurred.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the NEW type-validation test in isolation first.
npm test -- prompt-overrides-types   # vitest run, filters to the new file. EXPECT: all green.

# Full suite — confirm no regression (esp. the provider-override + cascade suites).
npm test                               # vitest run. EXPECT: exit 0, entire suite green.

# Expected: New test passes; existing suite unchanged (types/JSDoc edits cannot break runtime tests
# unless a field signature was accidentally altered — Level 1 would catch that).
```

### Level 3: Integration Testing (System Validation)

```bash
# Contract grep checks — the load-bearing gates for THIS task.
echo "--- @deprecated count (expect >= 5) ---"
grep -c "@deprecated" src/types/agent.ts

echo "--- harness? (expect 2: AgentConfig + PromptOverrides) ---"
grep -n "harness?: HarnessId" src/types/agent.ts

echo "--- harnessOptions? (expect >= 2: AgentConfig + PromptOverrides) ---"
grep -n "harnessOptions?: HarnessOptions" src/types/agent.ts

echo "--- migration BEFORE/AFTER blocks (expect >= 4 each) ---"
grep -c "// BEFORE (v1.x)" src/types/agent.ts   # expect >= 4 (2 AgentConfig + 2 PromptOverrides)
grep -c "// AFTER (v1.2)" src/types/agent.ts    # expect >= 4

echo "--- PromptOverrides deprecation references (expect >= 2) ---"
grep -c "Use {@link PromptOverrides.harness" src/types/agent.ts   # expect >= 1 (provider block)
grep -c "Use {@link PromptOverrides.harnessOptions" src/types/agent.ts  # expect >= 1 (providerOptions block)

echo "--- 'opencode' must NOT appear in the new PromptOverrides JSDoc (expect the old example gone) ---"
sed -n '158,244p' src/types/agent.ts | grep -c "opencode"   # expect 0

echo "--- AgentConfig untouched sanity (expect its own @deprecated still present) ---"
grep -n "interface AgentConfig" src/types/agent.ts   # confirm interface still present, unedited by us

# Expected: counts match Success Definition #4.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Deprecation surface is visible to IDE/TSDoc consumers — verify the .d.ts carries the tags.
grep -A3 "@deprecated" dist/types/agent.d.ts | head -60
# Expected: BOTH PromptOverrides.provider and PromptOverrides.providerOptions @deprecated blocks appear in
# the emitted declarations (alongside AgentConfig's two), confirming downstream IDEs surface the migration
# guidance for the prompt-level override.

# (Optional) Confirm the public re-export still resolves PromptOverrides.
grep -n "PromptOverrides" src/types/index.ts   # expect re-export unchanged.

# (Optional) Sanity: the PRD §7.13 call shape still type-checks at the source level (lint covers src/types).
grep -n "overrides?.harness" src/core/agent.ts   # expect 2 hits (L365 + L609) — runtime already reads it.
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 passed: `npm run lint` exit 0 AND `npm run build` exit 0.
- [ ] Level 2 passed: `npm test` exit 0 (new `prompt-overrides-types.test.ts` green + full suite green).
- [ ] Level 3 passed: all contract greps match (≥5 `@deprecated`; 2× each `harness?`/`harnessOptions?`;
      ≥4× `// BEFORE (v1.x)` + `// AFTER (v1.2)`; `Use {@link PromptOverrides.harness`/`harnessOptions}` each ≥1).
- [ ] Level 4 passed: `dist/types/agent.d.ts` carries both new PromptOverrides `@deprecated` blocks.

### Feature Validation

- [ ] `PromptOverrides.provider?` carries full migration JSDoc referencing harness/harnessOptions (BEFORE/AFTER);
      the stale `'opencode'` example is removed.
- [ ] `PromptOverrides.providerOptions?` carries full migration JSDoc referencing harnessOptions + slimmed note.
- [ ] `PromptOverrides.harness?` / `harnessOptions?` + import present (pre-flight grep confirmed).
- [ ] New `prompt-overrides-types.test.ts` asserts surface + backward compat (provider/providerOptions retained).
- [ ] Error cases: N/A (pure type/JSDoc; no runtime error paths).

### Code Quality Validation

- [ ] JSDoc matches the established `src/types/providers.ts` + `AgentConfig` BEFORE/AFTER convention.
- [ ] Field signatures UNCHANGED (only JSDoc edited) — no accidental type drift.
- [ ] Anti-patterns avoided (see below).
- [ ] No scope leak: `AgentConfig`, `src/core/agent.ts`, `src/types/providers.ts`, `src/types/index.ts` untouched.

### Documentation & Deployment

- [ ] `@deprecated` migration guidance is self-documenting (BEFORE/AFTER code blocks).
- [ ] No new environment variables or config.
- [ ] `dist/types/agent.d.ts` emits the deprecation tags for downstream consumers.

---

## Anti-Patterns to Avoid

- ❌ Don't re-add `harness?`/`harnessOptions?` if the pre-flight grep finds them present (P3.M1.T2.S1
  already added them) — duplicate declarations break `tsc`.
- ❌ Don't edit `AgentConfig` (L15–152) — it's P3.M2.T1.S1's region (just landed); causes a merge conflict.
  Edit ONLY `PromptOverrides` (L158–244).
- ❌ Don't edit `src/core/agent.ts` — P3.M1.* owns it (Complete; L365-366/L609-610 already read the fields).
- ❌ Don't change any field *signature* — this is JSDoc-only on the source side; a signature change is out of
  scope and would ripple into P3.M1.* consumers.
- ❌ Don't rely on `@ts-expect-error` in the test as a load-bearing assertion — `tsconfig` excludes
  `src/__tests__`, so it's unverified; use runtime `expect()`.
- ❌ Don't leave the stale v1.x provider-cascade/merge prose on the now-`@deprecated` `provider?`/`providerOptions?`
  — it misleads readers (Scope Decision 2); replace with the harness-cascade migration JSDoc.
- ❌ Don't use `'opencode'` in the new migration `@example` — it's being deleted in P4.M1. Use the
  P3.M2.T1.S1 precedent (`provider: 'anthropic'` → `harness: 'claude-code'`).
- ❌ Don't "fix" the `ProviderId` superset union or `ProviderOptions` concrete shape in `src/types/providers.ts`
  — those are intentional (Bucket B / Bucket C) and owned by earlier items.
- ❌ Don't skip the contract greps — they are the load-bearing gates (JSDoc-only changes won't trip `tsc`).

---

## Confidence Score

**9 / 10** for one-pass implementation success.

**Rationale:** The task is mechanically tiny (two JSDoc block rewrites + one additive test), and it has a
**direct, freshly-landed precedent**: P3.M2.T1.S1 performed the *exact same operation* on the sibling
`AgentConfig` interface and landed successfully *during this research session* (verified: AgentConfig.provider
and AgentConfig.providerOptions now carry full BEFORE/AFTER migration JSDoc at src/types/agent.ts L106/L128).
The exact target text for PromptOverrides is provided verbatim in **Implementation Patterns** (adapted from
that precedent by swapping the `{@link}` target), the pattern files to mirror are named, and the validation
commands are verified against `package.json`/`tsconfig.json`. The runtime consumption is already proven —
`src/core/agent.ts` L365-366 (prompt) and L609-610 (stream) already read `overrides?.harness` /
`overrides?.harnessOptions` in lockstep with the legacy fields, so deprecating `provider`/`providerOptions`
is advisory and changes zero runtime behavior. The one residual risk is the implementer ignoring the
pre-flight grep and accidentally double-adding fields that already exist — fully mitigated by Task 0 +
Decision 1 + the "don't re-add" anti-pattern. No type signatures change, so there is no ripple risk into
P3.M1.* consumers.
