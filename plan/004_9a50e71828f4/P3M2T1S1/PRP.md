# PRP — P3.M2.T1.S1: Add harness/harnessOptions to AgentConfig

**PRD reference:** §7.9 (`AgentConfig` extensions: `harness?: HarnessId` + `harnessOptions?: HarnessOptions`
+ `model?: string`), §7.7 (Configuration Cascade — harness axis inherits from global → agent → prompt),
§7.2 (`HarnessId`), §7.5 (`HarnessOptions`), §7 (harness ⊥ provider/model; harness never appears in the
model string). **Plan:** `plan/004_9a50e71828f4/` — S1 of P3.M2.T1 ("AgentConfig harness fields").
**Consumes:** `HarnessId` + `HarnessOptions` from `src/types/harnesses.ts` (P1.M1.T1.S1) and the
`Provider*` deprecated aliases from `src/types/providers.ts` (P1.M1.T3.S1). **Produces:** the canonical
`AgentConfig` harness surface that the Agent ctor reads (P3.M1.T1.S1 — already Complete and already
consuming these fields). **Unblocks:** nothing new at runtime (fields already wired by P3.M1.T1.S1); this
item **completes the contract** by formalising the deprecation JSDoc + adding a type-validation test.
**Scope tag:** (a) in `src/types/agent.ts` `AgentConfig` ENHANCE the `provider?` deprecation JSDoc and ADD
`@deprecated` + migration JSDoc to `providerOptions?` (both pointing consumers at `harness`/`harnessOptions`,
following the BEFORE/AFTER convention established in `src/types/providers.ts`); (b) **pre-flight grep** to
defensively verify `harness?`/`harnessOptions?`/`model?` + the `HarnessId`/`HarnessOptions` import are
present (P3.M1.T1.S1 already added them — this guard makes the two items idempotent / zero-conflict);
(c) **CREATE** `src/__tests__/unit/agent-config-types.test.ts` mirroring
`src/__tests__/unit/harnesses-types.test.ts`. **DO NOT touch** `PromptOverrides` (P3.M2.T2.S1's scope — has
its own harness fields at L193/L196), `src/core/agent.ts` (P3.M1.* — P3.M1.T2.S3 edits it in PARALLEL,
cache-key only, ZERO file overlap), `src/types/providers.ts` (alias shim — already @deprecated), or
`src/types/index.ts` (`AgentConfig` already re-exported at L56).

> **READ "CURRENT STATE REALITY" + "SCOPE DECISIONS" BEFORE WRITING CODE.** The fields already exist. This
> is a **completion / contract-closure** task, not a greenfield addition. The change is mechanically: (1)
> rewrite two JSDoc blocks (no type changes whatsoever — `@deprecated` is a JSDoc tag, not a type), and
> (2) add one test file. Because nothing about the TypeScript *types* changes, `npm run lint` is expected
> to pass trivially; the load-bearing gates are the **contract grep checks** (both fields carry the
> migration deprecation with the BEFORE/AFTER wording) and the **new vitest test**.

---

## Goal

**Feature Goal:** Make `AgentConfig` (in `src/types/agent.ts`, interface L15–149) the **canonical,
migration-complete** carrier of the harness configuration surface defined by PRD §7.9 — `harness?:
HarnessId`, `harnessOptions?: HarnessOptions`, and `model?: string` — with the legacy `provider?` /
`providerOptions?` fields clearly marked `@deprecated` and pointing consumers at the new `harness` /
`harnessOptions` fields via the codebase's established migration-JSDoc convention (BEFORE/AFTER code
blocks, as in `src/types/providers.ts`). After S1, any reader of `AgentConfig` sees exactly which fields
are current (harness/harnessOptions/model) and which are legacy (provider/providerOptions) with unambiguous
migration guidance — and a dedicated type-validation test locks the surface against regressions.

**Deliverable:**
1. **MODIFY `src/types/agent.ts`** — in the `AgentConfig` interface:
   - **ENHANCE** the `provider?: ProviderId;` field's JSDoc (currently L~105–110, a one-liner
     `@deprecated Use \`harness\` instead.`) into a full migration JSDoc: `@deprecated Since v1.2. Use
     {@link AgentConfig.harness} / {@link AgentConfig.harnessOptions}` + a one-line rationale (harness ⊥
     provider/model per PRD §7) + a BEFORE/AFTER code block. See **Implementation Patterns** for the exact
     text.
   - **ADD** `@deprecated` + an equivalent migration JSDoc to `providerOptions?: ProviderOptions;`
     (currently L~111–148 — has extensive merge-semantics JSDoc but **no `@deprecated` tag**). The new
     JSDoc points consumers at `harnessOptions` and notes that `HarnessOptions` is **slimmed** (omits
     `sessionStore` / `sessionPersistence` / `sessionTtl` / `sessionPath`). Replace the now-misleading
     "Options Merge (PRD 7.7)" provider-cascade prose (the cascade is now the **harness** cascade per
     PRD §7.7) — keep only the migration-flavoured deprecation block (you MAY preserve the `@see` links if
     they still resolve).
   - **DEFENSIVE pre-flight grep** (see Task 1): confirm `harness?:`, `harnessOptions?:`, `model?:`, and
     `import type { HarnessId, HarnessOptions } from './harnesses.js';` are already present. They are
     (added by P3.M1.T1.S1). If the grep finds any ABSENT, add it per **Task 1 step 3** (idempotent guard).
2. **CREATE `src/__tests__/unit/agent-config-types.test.ts`** — mirror
   `src/__tests__/unit/harnesses-types.test.ts` (runtime-value assertions + type-annotated object
   literals; esbuild strips types so assertions must be runtime-meaningful). Assert: (a) `AgentConfig`
   accepts `{ harness: 'pi' }` and `{ harness: 'claude-code' }` and rejects nothing at runtime;
   (b) `AgentConfig` accepts `{ harnessOptions: { endpoint, apiKey, sessionId, timeout, headers } }`
   (full `HarnessOptions` shape) and round-trips the values; (c) `model?: string` accepts both plain
   (`'claude-sonnet-4-20250514'`) and qualified (`'anthropic/claude-sonnet-4-20250514'`) strings;
   (d) **backward compatibility** — `{ provider: 'anthropic', providerOptions: { endpoint: '...' } }` still
   type-checks & constructs without error (legacy fields retained, not removed); (e) the four fields coexist
   on one object literal `{ harness, harnessOptions, model, provider, providerOptions }`.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`, covers `src/**/*` **excluding** `src/__tests__`) exits **0** — confirms
   the JSDoc edits to `src/types/agent.ts` introduce no type errors (expected: trivial pass; `@deprecated`
   is not a type).
2. `npm test` (`vitest run`) exits **0** — the NEW `agent-config-types.test.ts` passes AND the **entire
   existing suite stays green** (notably `src/__tests__/unit/agent.test.ts`, which already constructs
   `new Agent({ harness: 'claude-code' })` at L115–118).
3. `npm run build` (`tsc`) exits **0** — `dist/types/agent.js` + `dist/types/agent.d.ts` emit cleanly.
4. **Contract grep checks** (all must pass):
   - `grep -c "@deprecated" src/types/agent.ts` → **≥ 2** (was 1 — both `provider` AND `providerOptions`
     now deprecated).
   - `grep -n "harness?: HarnessId" src/types/agent.ts` → exactly **1** hit inside `AgentConfig` (L~98).
   - `grep -n "harnessOptions?: HarnessOptions" src/types/agent.ts` → at least **1** hit inside
     `AgentConfig` (L~101).
   - `grep -n "model?: string" src/types/agent.ts` → **1** hit inside `AgentConfig` (L~55).
   - The `provider?` and `providerOptions?` JSDoc blocks each contain `Use {@link AgentConfig.harness` (or
     `harnessOptions`) and a `// BEFORE (v1.x)` / `// AFTER (v1.2)` pair.
5. **No scope leak** — `PromptOverrides` (L155–241) is byte-identical to HEAD; `src/core/agent.ts` is not
   modified by this task (P3.M1.T2.S3 owns it in parallel).

---

## Why

- **Closes the migration contract.** PRD §7.9 names `harness?`/`harnessOptions?`/`model?` as the AgentConfig
  surface. P3.M1.T1.S1 added the *fields* (to unblock the Agent ctor) but deliberately left the
  *deprecation JSDoc* on the legacy `provider`/`providerOptions` minimal or absent. This item formalises
  the migration messaging so consumers migrating off v1.x `provider`/`providerOptions` have unambiguous
  BEFORE/AFTER guidance — matching the precedent set in `src/types/providers.ts`.
- **Defends the surface.** A dedicated `agent-config-types.test.ts` (mirroring `harnesses-types.test.ts`)
  prevents silent regressions to the AgentConfig field set during the remaining P3/P4 migration work.
- **Zero runtime risk.** The change is JSDoc-only on the source side + an additive test. No type signatures
  change; no consumer recompiles differently.

## What

User-visible behavior: **none** (types + JSDoc only; no runtime behavior change). Developers reading
`AgentConfig` see clear `@deprecated` migration guidance on `provider`/`providerOptions` and a validated
harness surface (`harness`/`harnessOptions`/`model`).

### Success Criteria

- [ ] `AgentConfig.provider?` carries a full migration `@deprecated` JSDoc (BEFORE/AFTER) referencing
      `harness`/`harnessOptions`.
- [ ] `AgentConfig.providerOptions?` carries a full migration `@deprecated` JSDoc (BEFORE/AFTER)
      referencing `harnessOptions` + the "HarnessOptions is slimmed" note.
- [ ] `AgentConfig.harness?` / `harnessOptions?` / `model?` + the `HarnessId`/`HarnessOptions` import are
      present (verified by pre-flight grep; added only if absent).
- [ ] `src/__tests__/unit/agent-config-types.test.ts` exists and asserts the surface + backward compat.
- [ ] `npm run lint`, `npm test`, `npm run build` all exit 0; existing suite stays green.
- [ ] `PromptOverrides`, `src/core/agent.ts`, `src/types/providers.ts`, `src/types/index.ts` untouched.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes** — this PRP gives: exact file + line ranges, the verbatim migration-JSDoc wording to
emit, the canonical pattern file to mirror (`src/types/providers.ts`), the test pattern file to mirror
(`src/__tests__/unit/harnesses-types.test.ts`), the verified validation commands, and the explicit
out-of-scope list. The only judgment call (replace vs. preserve the legacy `providerOptions` merge prose)
is resolved in **Scope Decision 2**.

### Documentation & References

```yaml
# MUST READ — include in your context window
- url: plan/004_9a50e71828f4/prd_snapshot.md
  why: "PRD §7.9 (AgentConfig extensions), §7.7 (cascade), §7.2 (HarnessId), §7.5 (HarnessOptions), §7 (harness ⊥ provider)."
  critical: "§7.9 is the authoritative field list: harness?: HarnessId, harnessOptions?: HarnessOptions, model?: string. §7: the harness NEVER appears in the model string."

- file: src/types/agent.ts
  why: "THE edit target. AgentConfig interface = L15–149. harness? = L~98, harnessOptions? = L~101, model? = L~55, provider? = L~108 (partial @deprecated), providerOptions? = L~148 (NO @deprecated). Import = L9."
  pattern: "Existing JSDoc style (TSDoc with @example <caption>, @see {@link ...}, @default). Match it."
  gotcha: "PromptOverrides (L155–241) is a SEPARATE interface owned by P3.M2.T2.S1 — DO NOT edit it. It has its own harness/harnessOptions (L193/196) + provider/providerOptions (L215/240)."

- file: src/types/providers.ts
  why: "The canonical migration-JSDoc convention to replicate. See ProviderOptions @deprecated (Bucket C) and GlobalProviderConfig @deprecated — both use '@deprecated Since v1.2. Use {@link ...}' + note + BEFORE/AFTER code block."
  pattern: "Replicate this exact BEFORE/AFTER block style for AgentConfig.provider and AgentConfig.providerOptions."
  gotcha: "ProviderId is a SUPERSET union (HarnessId | 'anthropic' | 'opencode') — Bucket B; ProviderOptions is Bucket C (KEPT CONCRETE, slimmed vs HarnessOptions). Don't 'fix' these; just reference them."

- file: src/types/harnesses.ts
  why: "Source of HarnessId (L~14: 'pi' | 'claude-code') and HarnessOptions (L~74: endpoint/apiKey/sessionId/timeout/headers — NO session-store fields)."
  pattern: "HarnessOptions is intentionally SLIMMED relative to ProviderOptions — your providerOptions @deprecated note MUST mention this."

- file: src/__tests__/unit/harnesses-types.test.ts
  why: "THE test pattern to mirror for the new agent-config-types.test.ts."
  pattern: "import type {...} from '../../types/...'; vitest describe/it/expect; runtime value assertions (expect(x).toBe('pi')) + type-annotated literals. esbuild strips types, so every assertion MUST have a runtime expect()."
  gotcha: "tsconfig excludes src/__tests__ from tsc → @ts-expect-error directives in tests are NOT verified at build time; rely on runtime expect() assertions + npm run lint on the (included) src/types/agent.ts."

- file: src/__tests__/unit/agent.test.ts
  why: "Already exercises AgentConfig.harness (L115–118: new Agent({ harness: 'claude-code' })). Proves the field is wired; your new test complements (does not duplicate) it."
  pattern: "If you need a harness-registry mock pattern for any runtime check, crib createMockHarness from here — but the type test should NOT need an Agent instance; plain object literals suffice."

- file: plan/004_9a50e71828f4/P3M2T1S1/research/findings.md
  why: "This task's research note — documents the 'fields already exist' finding + exact current line state + migration-JSDoc convention."
  section: "Verified current state table + REMAINING contract work."
```

### Current Codebase tree (relevant slice)

```bash
src/types/
├── agent.ts          # EDIT TARGET — AgentConfig (L15-149) + PromptOverrides (L155-241, DO NOT TOUCH)
├── harnesses.ts      # READ — HarnessId, HarnessOptions (canonical source)
├── providers.ts      # READ — migration-JSDoc convention to replicate; Provider* aliases
└── index.ts          # READ — AgentConfig already re-exported (L56); no change
src/__tests__/unit/
├── harnesses-types.test.ts   # READ — test pattern to mirror
├── agent.test.ts             # READ — already exercises AgentConfig.harness (L115-118)
└── agent-config-types.test.ts # CREATE — new type-validation test
plan/004_9a50e71828f4/
├── P3M1T1S1/PRP.md  # READ — Decision 5 documents the conditional field addition (context only)
└── P3M2T1S1/
    ├── PRP.md        # THIS FILE
    └── research/findings.md
```

### Desired Codebase tree with files added/modified

```bash
src/types/agent.ts                         # MODIFY — provider? JSDoc enhanced; providerOptions? @deprecated added
src/__tests__/unit/agent-config-types.test.ts  # CREATE — AgentConfig surface + backward-compat test
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — the fields ALREADY EXIST. P3.M1.T1.S1 added harness?/harnessOptions?/model? +
//   the HarnessId/HarnessOptions import (conditional guard in its Decision 5). This task is a
//   COMPLETION (deprecation JSDoc + test), NOT a greenfield addition. Run the pre-flight grep in
//   Task 1 BEFORE editing; if harness? is already present, DO NOT re-add it (would duplicate).

// CRITICAL #2 — @deprecated is a JSDoc TAG, not a TypeScript type. Adding/enhancing it changes ZERO
//   types. `npm run lint` (tsc --noEmit) will pass trivially. The load-bearing gates are the contract
//   GREP checks (Success Definition #4) and the new vitest test.

// CRITICAL #3 — tsconfig "exclude": ["src/__tests__"]. tsc does NOT type-check the test dir.
//   vitest uses esbuild (strips types, no type-check). So the new test MUST use runtime expect()
//   assertions on values (mirror harnesses-types.test.ts). @ts-expect-error in tests is UNVERIFIED —
//   avoid relying on it; prefer positive runtime assertions.

// CRITICAL #4 — HarnessOptions is SLIMMED vs ProviderOptions. It omits sessionStore, sessionPersistence,
//   sessionTtl, sessionPath (those are now harness-adapter internals). The providerOptions @deprecated
//   note MUST say this so migrating users aren't surprised when their sessionPersistence: 'file' has no
//   home on HarnessOptions (see src/types/providers.ts ProviderOptions @deprecated note for the exact
//   phrasing precedent).

// CRITICAL #5 — DO NOT touch PromptOverrides (L155-241). It is a separate interface with its OWN
//   harness fields (L193/196) owned by P3.M2.T2.S1. Editing it here = scope leak + merge conflict.

// CRITICAL #6 — P3.M1.T2.S3 runs IN PARALLEL and edits src/core/agent.ts (cache-key build-site).
//   ZERO file overlap with this task (we only touch src/types/agent.ts + add a test). No coordination
//   needed.
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
  - RUN: `grep -n "harness?: HarnessId\|harnessOptions?: HarnessOptions\|model?: string" src/types/agent.ts`
  - RUN: `grep -n "import type { HarnessId, HarnessOptions } from './harnesses.js'" src/types/agent.ts`
  - RUN: `grep -c "@deprecated" src/types/agent.ts`   # expect 1 today (only provider)
  - EXPECT: harness?/harnessOptions?/model? + import ALL PRESENT (P3.M1.T1.S1 added them).
  - DECISION: if ALL present → SKIP Task 1 step 3 (field addition); proceed to Task 1 steps 1-2 (JSDoc).
              if ANY absent → execute Task 1 step 3 (add the missing field/import per spec).

Task 1: MODIFY src/types/agent.ts — AgentConfig deprecation JSDoc (+ defensive field guard)
  - STEP 1: REPLACE the `provider?: ProviderId;` JSDoc block (currently ~L105-110, the minimal
            `@deprecated Use \`harness\` instead.`) with the full migration JSDoc from
            "Implementation Patterns → provider block" below. Field signature UNCHANGED.
  - STEP 2: REPLACE the `providerOptions?: ProviderOptions;` JSDoc block (currently ~L111-148, extensive
            merge-semantics prose, NO @deprecated) with the migration JSDoc from "Implementation Patterns
            → providerOptions block" below. Field signature UNCHANGED. (See Scope Decision 2 re: replacing
            vs preserving the legacy merge prose — REPLACE is recommended.)
  - STEP 3 (CONDITIONAL — only if Task 0 found a field/import ABSENT): add the missing piece:
        harness?: HarnessId;            // after model?: string; (~L55), JSDoc: "Harness to use (inherits from global; default 'pi'). PRD §7.9."
        harnessOptions?: HarnessOptions; // immediately after harness?, JSDoc: "Harness-specific options. PRD §7.9."
      and ensure the import: `import type { HarnessId, HarnessOptions } from './harnesses.js';`
      (P3.M1.T1.S1 already did this; this step is the idempotent safety net.)
  - FOLLOW pattern: src/types/providers.ts ProviderOptions @deprecated block (BEFORE/AFTER convention).
  - NAMING: unchanged (provider?, providerOptions?).
  - PLACEMENT: inside `AgentConfig` interface only (L15-149). Do NOT edit PromptOverrides.
  - PRESERVE: every OTHER AgentConfig field (name, system, tools, mcps, skills, hooks, env, enableReflection,
    enableCache, model, maxTokens, temperature) byte-for-byte.

Task 2: CREATE src/__tests__/unit/agent-config-types.test.ts
  - IMPLEMENT: vitest describe/it/expect asserting the AgentConfig surface (mirror harnesses-types.test.ts).
  - ASSERT (each MUST have a runtime expect()):
      (a) `{ harness: 'pi' } as AgentConfig` and `{ harness: 'claude-code' } as AgentConfig` →
          expect(config.harness).toBe('pi' | 'claude-code').
      (b) `{ harnessOptions: { endpoint, apiKey, sessionId, timeout, headers } } as AgentConfig` →
          round-trip each field via expect().
      (c) `{ model: 'claude-sonnet-4-20250514' }` and `{ model: 'anthropic/claude-sonnet-4-20250514' }` →
          expect(config.model).toBe(...).
      (d) BACKWARD COMPAT: `{ provider: 'anthropic', providerOptions: { endpoint: 'https://x' } }` →
          constructs without error; expect(config.provider).toBe('anthropic').
      (e) COEXIST: one object literal carrying harness + harnessOptions + model + provider + providerOptions.
  - FOLLOW pattern: src/__tests__/unit/harnesses-types.test.ts (imports from '../../types/agent.js',
    vitest describe/it/expect, runtime assertions on type-annotated literals).
  - NAMING: file = agent-config-types.test.ts; top describe = 'AgentConfig types'.
  - COVERAGE: all 5 AgentConfig harness/provider fields (positive + backward-compat).
  - PLACEMENT: src/__tests__/unit/agent-config-types.test.ts.
  - DO NOT: instantiate Agent (not needed; agent.test.ts L115 already covers runtime). Do NOT use
    @ts-expect-error as a load-bearing assertion (unverified by tsc; esbuild ignores it).

Task 3: VALIDATE (no code change — run the gates)
  - RUN: npm run lint && npm test && npm run build
  - RUN: the contract greps in "Success Definition #4".
  - EXPECT: all exit 0; grep counts match (≥2 @deprecated; exactly 1 harness?/harnessOptions?/model?).
```

### Implementation Patterns & Key Details

**`provider?: ProviderId;` migration JSDoc (Task 1 step 1 — REPLACE the current one-liner):**

```ts
  /**
   * Provider to use for this agent
   *
   * @deprecated Since v1.2. Use {@link AgentConfig.harness} (and
   *   {@link AgentConfig.harnessOptions} for options) instead. The runtime/harness
   *   axis (`'pi'` | `'claude-code'`) is now independent of the LLM provider/model
   *   (PRD §7): the harness is chosen separately, and the model string is never
   *   harness-qualified. Retained for backward compatibility during the v1.2 migration
   *   and removed when the legacy adapters are renamed/deleted (P2.M1 / P4.M1).
   *
   * ```typescript
   * // BEFORE (v1.x)
   * const config: AgentConfig = { provider: 'anthropic' };
   * // AFTER (v1.2)
   * const config: AgentConfig = {
   *   harness: 'claude-code',
   *   model: 'anthropic/claude-sonnet-4-20250514',
   * };
   * ```
   */
  provider?: ProviderId;
```

**`providerOptions?: ProviderOptions;` migration JSDoc (Task 1 step 2 — REPLACE the current merge-semantics block):**

```ts
  /**
   * Provider-specific options for this agent
   *
   * @deprecated Since v1.2. Use {@link AgentConfig.harnessOptions} instead.
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
   * const config: AgentConfig = {
   *   providerOptions: { endpoint: 'https://api.example.com', sessionPersistence: 'file' },
   * };
   * // AFTER (v1.2)
   * const config: AgentConfig = {
   *   harnessOptions: { endpoint: 'https://api.example.com', apiKey: process.env.ANTHROPIC_API_KEY },
   * };
   * ```
   */
  providerOptions?: ProviderOptions;
```

**`agent-config-types.test.ts` skeleton (Task 2 — mirror harnesses-types.test.ts):**

```ts
/**
 * Test file: agent-config-types.test.ts
 *
 * Purpose: Validate the AgentConfig harness surface per PRD §7.9 (harness?, harnessOptions?,
 * model?) plus backward compatibility of the @deprecated provider?/providerOptions? fields.
 *
 * PRP: P3.M2.T1.S1 - Add harness/harnessOptions to AgentConfig
 */
import { describe, it, expect } from 'vitest';
import type { AgentConfig } from '../../types/agent.js';
import type { HarnessId, HarnessOptions } from '../../types/harnesses.js';

describe('AgentConfig types', () => {
  describe('harness field (PRD §7.9)', () => {
    it('accepts harness: "pi"', () => {
      const config: AgentConfig = { harness: 'pi' };
      expect(config.harness).toBe('pi');
    });
    it('accepts harness: "claude-code"', () => {
      const config: AgentConfig = { harness: 'claude-code' };
      expect(config.harness).toBe('claude-code');
    });
    it('harness is assignable to HarnessId', () => {
      const h: HarnessId | undefined = ({ harness: 'pi' } as AgentConfig).harness;
      expect(h).toBe('pi');
    });
  });

  describe('harnessOptions field (PRD §7.9)', () => {
    it('accepts the full HarnessOptions shape and round-trips values', () => {
      const opts: HarnessOptions = {
        endpoint: 'https://api.example.com',
        apiKey: 'sk-test',
        sessionId: 'sess-1',
        timeout: 60000,
        headers: { 'X-Custom': 'v' },
      };
      const config: AgentConfig = { harnessOptions: opts };
      expect(config.harnessOptions?.endpoint).toBe('https://api.example.com');
      expect(config.harnessOptions?.apiKey).toBe('sk-test');
      expect(config.harnessOptions?.timeout).toBe(60000);
    });
  });

  describe('model field (PRD §7.9 / §7.8)', () => {
    it('accepts a plain model id', () => {
      const config: AgentConfig = { model: 'claude-sonnet-4-20250514' };
      expect(config.model).toBe('claude-sonnet-4-20250514');
    });
    it('accepts a provider-qualified model (never harness-qualified)', () => {
      const config: AgentConfig = { model: 'anthropic/claude-sonnet-4-20250514' };
      expect(config.model).toContain('anthropic/');
    });
  });

  describe('backward compatibility (deprecated provider/providerOptions)', () => {
    it('still accepts provider + providerOptions (legacy, not removed)', () => {
      const config: AgentConfig = {
        provider: 'anthropic',
        providerOptions: { endpoint: 'https://api.example.com', apiKey: 'sk-legacy' },
      };
      expect(config.provider).toBe('anthropic');
      expect(config.providerOptions?.endpoint).toBe('https://api.example.com');
    });
    it('all five harness/provider fields coexist on one object', () => {
      const config: AgentConfig = {
        harness: 'pi',
        harnessOptions: { timeout: 1000 },
        model: 'anthropic/claude-sonnet-4-20250514',
        provider: 'claude-code',
        providerOptions: { endpoint: 'https://x' },
      };
      expect(config.harness).toBe('pi');
      expect(config.provider).toBe('claude-code');
    });
  });
});
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (no runtime config touched)
ROUTES: none
PUBLIC API: src/types/index.ts already re-exports AgentConfig (L56) — no change needed.
IMPORTS: src/types/agent.ts L9 already imports HarnessId/HarnessOptions from './harnesses.js' — no change (unless Task 0 grep finds it absent).
```

## ⚠️ SCOPE DECISIONS — the load-bearing details

### Decision 1 — This is a COMPLETION task, not greenfield. Pre-flight grep decides the branch.

`src/types/agent.ts` `AgentConfig` **already has** `harness?: HarnessId` (L~98), `harnessOptions?:
HarnessOptions` (L~101), `model?: string` (L~55), and the import (L9) — P3.M1.T1.S1 added them via its
**Decision 5** (conditional guard gated on a pre-flight grep; the fields were absent at S1's time so S1
added them). **Task 0's pre-flight grep is therefore expected to find everything present** → skip the
conditional field-addition (Task 1 step 3) and proceed straight to the JSDoc work (Task 1 steps 1–2). The
conditional step exists purely as an idempotent safety net so this task and P3.M1.T1.S1 can never conflict
or double-add. **Do NOT re-add fields that already exist** — that would create duplicate declarations and
break `npm run lint`.

### Decision 2 — REPLACE the legacy `providerOptions` merge-semantics JSDoc (do not append).

The current `providerOptions?` JSDoc (L~111–148) describes the **v1.x provider-options merge cascade**
("Prompt-level providerOptions (highest) → AgentConfig.providerOptions → GlobalProviderConfig.providerDefaults
[provider] (lowest)"). Post-migration that cascade is **superseded** by the PRD §7.7 **harness** cascade
(GlobalHarnessConfig.defaultHarness → AgentConfig.harness/harnessOptions → PromptOverrides). Leaving the old
provider-cascade prose on a now-`@deprecated` field would actively mislead readers. **Resolution:** REPLACE
the block with the migration JSDoc from **Implementation Patterns** (which points at the harness cascade).
You MAY keep a one-line `@see {@link resolveHarnessConfig}` if it resolves, but drop the stale provider-merge
exposition. (If you prefer minimal risk, an acceptable alternative is to PREPEND the `@deprecated` migration
block and leave the legacy prose below it — but REPLACE is cleaner and recommended.)

### Decision 3 — `provider?` deprecation is ENHANCED, not left as the one-liner.

P3.M1.T1.S1 added a minimal `@deprecated Use \`harness\` instead.` to `provider?`. The contract for THIS
item explicitly says "Mark provider/providerOptions @deprecated with migration JSDoc ('use
harness/harnessOptions')". **Resolution:** replace the one-liner with the full BEFORE/AFTER migration JSDoc
from **Implementation Patterns → provider block** (referencing both `harness` AND `harnessOptions`, matching
the `src/types/providers.ts` convention). This is a JSDoc-only change (no type change) → zero runtime risk.

### Decision 4 — Test uses runtime assertions, NOT @ts-expect-error (tsc excludes __tests__).

`tsconfig.json` `"exclude": ["src/__tests__"]` means `tsc` (lint + build) never type-checks the test dir;
vitest's esbuild strips types without checking. So `@ts-expect-error` directives in tests are **unverified**
(esbuild silently drops them). **Resolution:** the new test mirrors `harnesses-types.test.ts` — every
assertion is a **runtime `expect()`** on a value. Type *annotations* on object literals (`const config:
AgentConfig = {...}`) document intent and are checked only when `src/types/agent.ts` itself is compiled (it
IS in the lint set), so a broken AgentConfig field would still fail `npm run lint` via the source file. Do
NOT rely on `@ts-expect-error` to prove rejection of bad values.

### Decision 5 — Strict out-of-scope: PromptOverrides, core/agent.ts, providers.ts, index.ts.

- `PromptOverrides` (L155–241) → **P3.M2.T2.S1** (sibling item, "PromptOverrides harness fields"). It has
  its own harness/provider fields. Editing it here causes a merge conflict with P3.M2.T2.S1.
- `src/core/agent.ts` → **P3.M1.*** (P3.M1.T2.S3 edits the cache-key build-site IN PARALLEL). Zero file
  overlap with this task (we touch only `src/types/agent.ts` + the new test).
- `src/types/providers.ts` → alias shim, already fully @deprecated (P1.M1.T3.S1). No change.
- `src/types/index.ts` → `AgentConfig` already re-exported (L56). No change.

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
npm test -- agent-config-types        # vitest run, filters to the new file. EXPECT: all green.

# Full suite — confirm no regression (esp. agent.test.ts which constructs Agent({ harness: ... })).
npm test                               # vitest run. EXPECT: exit 0, entire suite green.

# Expected: New test passes; existing suite unchanged (types/JSDoc edits cannot break runtime tests
# unless a field signature was accidentally altered — Level 1 would catch that).
```

### Level 3: Integration Testing (System Validation)

```bash
# Contract grep checks — the load-bearing gates for THIS task.
echo "--- @deprecated count (expect >= 2) ---"
grep -c "@deprecated" src/types/agent.ts

echo "--- harness? inside AgentConfig (expect 1) ---"
grep -n "harness?: HarnessId" src/types/agent.ts

echo "--- harnessOptions? inside AgentConfig (expect >= 1) ---"
grep -n "harnessOptions?: HarnessOptions" src/types/agent.ts

echo "--- model? inside AgentConfig (expect 1) ---"
grep -n "model?: string" src/types/agent.ts

echo "--- migration BEFORE/AFTER blocks on provider + providerOptions (expect 2 each) ---"
grep -c "// BEFORE (v1.x)" src/types/agent.ts   # expect >= 2
grep -c "// AFTER (v1.2)" src/types/agent.ts    # expect >= 2

echo "--- PromptOverrides untouched sanity (expect its own harness? at L~193) ---"
grep -n "interface PromptOverrides" src/types/agent.ts   # confirm interface still present, unedited by us

# Expected: counts match Success Definition #4.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Deprecation surface is visible to IDE/TSDoc consumers — verify the .d.ts carries the tags.
grep -A3 "@deprecated" dist/types/agent.d.ts | head -40
# Expected: both provider and providerOptions @deprecated blocks appear in the emitted declarations,
# confirming downstream IDEs surface the migration guidance.

# (Optional) Confirm the public re-export still resolves AgentConfig.
grep -n "AgentConfig" src/types/index.ts   # expect L56 re-export unchanged.
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 passed: `npm run lint` exit 0 AND `npm run build` exit 0.
- [ ] Level 2 passed: `npm test` exit 0 (new `agent-config-types.test.ts` green + full suite green).
- [ ] Level 3 passed: all contract greps match (≥2 `@deprecated`; 1× each `harness?`/`harnessOptions?`/`model?`;
      ≥2× `// BEFORE (v1.x)` + `// AFTER (v1.2)`).
- [ ] Level 4 passed: `dist/types/agent.d.ts` carries both `@deprecated` blocks.

### Feature Validation

- [ ] `AgentConfig.provider?` carries full migration JSDoc referencing harness/harnessOptions (BEFORE/AFTER).
- [ ] `AgentConfig.providerOptions?` carries full migration JSDoc referencing harnessOptions + slimmed note.
- [ ] `AgentConfig.harness?` / `harnessOptions?` / `model?` + import present (pre-flight grep confirmed).
- [ ] New `agent-config-types.test.ts` asserts surface + backward compat (provider/providerOptions retained).
- [ ] Error cases: N/A (pure type/JSDoc; no runtime error paths).

### Code Quality Validation

- [ ] JSDoc matches the established `src/types/providers.ts` BEFORE/AFTER convention.
- [ ] Field signatures UNCHANGED (only JSDoc edited) — no accidental type drift.
- [ ] Anti-patterns avoided (see below).
- [ ] No scope leak: `PromptOverrides`, `src/core/agent.ts`, `src/types/providers.ts`, `src/types/index.ts` untouched.

### Documentation & Deployment

- [ ] `@deprecated` migration guidance is self-documenting (BEFORE/AFTER code blocks).
- [ ] No new environment variables or config.
- [ ] `dist/types/agent.d.ts` emits the deprecation tags for downstream consumers.

---

## Anti-Patterns to Avoid

- ❌ Don't re-add `harness?`/`harnessOptions?`/`model?` if the pre-flight grep finds them present (P3.M1.T1.S1
  already added them) — duplicate declarations break `tsc`.
- ❌ Don't edit `PromptOverrides` (L155–241) — it's P3.M2.T2.S1's scope; causes a merge conflict.
- ❌ Don't edit `src/core/agent.ts` — P3.M1.T2.S3 owns it in parallel (cache-key); zero overlap expected, keep it zero.
- ❌ Don't change any field *signature* — this is JSDoc-only on the source side; a signature change is out of scope
  and would ripple into P3.M1.* consumers.
- ❌ Don't rely on `@ts-expect-error` in the test as a load-bearing assertion — `tsconfig` excludes `src/__tests__`,
  so it's unverified; use runtime `expect()`.
- ❌ Don't leave the stale v1.x provider-options merge-cascade prose on the now-`@deprecated` `providerOptions?` —
  it misleads readers (Scope Decision 2); replace with the harness-cascade migration JSDoc.
- ❌ Don't "fix" the `ProviderId` superset union or `ProviderOptions` concrete shape in `src/types/providers.ts` —
  those are intentional (Bucket B / Bucket C) and owned by earlier items.
- ❌ Don't skip the contract greps — they are the load-bearing gates (JSDoc-only changes won't trip `tsc`).

---

## Confidence Score

**9 / 10** for one-pass implementation success.

**Rationale:** The task is mechanically tiny (two JSDoc block rewrites + one additive test), the exact
target text is provided verbatim in **Implementation Patterns**, the pattern files to mirror are named, and
the validation commands are verified against `package.json`/`tsconfig.json`. The one residual risk is the
implementer ignoring the pre-flight grep and accidentally double-adding fields that already exist — fully
mitigated by Task 0 + Decision 1 + the "don't re-add" anti-pattern. No type signatures change, so there is
no ripple risk into P3.M1.* consumers.
