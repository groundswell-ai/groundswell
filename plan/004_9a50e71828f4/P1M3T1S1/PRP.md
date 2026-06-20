# PRP — P1.M3.T1.S1: Extend `CacheKeyInputs` and `generateCacheKey` with harness + provider axes

**PRD reference:** §7.14.5 ("Cache keys incorporate **both** the harness and the provider/model for
isolation") + §7.2 (`HarnessId`) + §7.8 (`ModelProviderId`, open set; harness NEVER in model string).
**Plan:** `plan/004_9a50e71828f4/` — sole subtask of P1.M3.T1 (Add harness + provider axes to
`CacheKeyInputs`), the only subtask of P1.M3 (Cache Key Harness/Provider Isolation).
**Scope tag:** TARGETED EDIT to ONE source file (`src/cache/cache-key.ts`) + ADDITIVE test cases.
**No behavioral change** to the sole existing consumer (`agent.ts`) — see Scope Decision.

> **READ THE "SCOPE DECISION" SECTION BELOW BEFORE WRITING ANY CODE.** It explains why `harness`
> MUST be declared **OPTIONAL** (`harness?: HarnessId`), even though the contract literally says
> "CacheKeyInputs requires harness". Making it required breaks `agent.ts` (the sole consumer, owned
> by the downstream task P3.M1.T2.S3) and fails `npm run lint`. The optional shape is the only
> ship-green path and is the contract P3.M1.T2.S3 consumes.

---

## Goal

**Feature Goal:** Extend `CacheKeyInputs` (in `src/cache/cache-key.ts`) with two new axes —
`harness?: HarnessId` and `provider?: ModelProviderId` — and thread them into the normalized object
inside `generateCacheKey()` BEFORE `deterministicStringify` + SHA-256, so that cache keys become
distinct per **(harness, provider, model)** tuple as mandated by PRD §7.14.5. Today the key
incorporates only a bare `model: string` with no harness and no provider axis
(`docs/consumer-analysis.md §4` confirms the gap), so a cache entry produced by the `pi` harness
can be wrongly returned for `claude-code` (and vice versa).

**Deliverable:**
1. **MODIFY `src/cache/cache-key.ts`** (the only source edit):
   - Add `import type { HarnessId, ModelProviderId } from '../types/harnesses.js';`
     (types shipped by P1.M1.T1.S1 / P1.M1.T1.S2).
   - Add two fields to the `CacheKeyInputs` interface (immediately after `model: string;`):
     `harness?: HarnessId;` and `provider?: ModelProviderId;` — both OPTIONAL (see Scope Decision),
     each with a JSDoc comment citing PRD §7.14.5 + the migration note.
   - In `generateCacheKey()`, append `harness` and `provider` to the `normalized` object
     **conditionally** (`if (inputs.harness !== undefined) normalized.harness = inputs.harness;`
     and the same for `provider`) — following the EXISTING optional-field pattern used for
     `data`/`system`/`temperature`/`maxTokens`/`tools`/`mcps`/`skills`. Keep ALL existing fields,
     sorting logic, and the trailing `schemaHash` + SHA-256 unchanged.
2. **MODIFY `src/__tests__/unit/cache-key.test.ts`** (additive — do not rewrite existing tests):
   - Append a new `describe('cache key isolation — harness + provider (PRD §7.14.5)', ...)` block
     with isolation cases (see Implementation Blueprint Task 2 for the exact case list).

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`, excludes `src/__tests__` but DOES type-check `src/cache/cache-key.ts`
   + `src/core/agent.ts`) exits 0 — proves the optional-field choice keeps `agent.ts` compiling.
2. `npm test` (`vitest run`) exits 0 — existing `cache-key.test.ts` assertions UNCHANGED + new
   isolation cases pass.
3. `npm run build` exits 0 — `dist/cache/cache-key.{js,d.ts}` re-emitted with the two new optional
   fields on the `CacheKeyInputs` interface.
4. Contract verification (grep): the interface has both fields; `generateCacheKey` references both;
   no other source file was edited (`git diff --name-only` shows exactly 2 files).

---

## ⚠️ SCOPE DECISION — `harness` is OPTIONAL, not required (why the literal contract cannot ship green)

The contract's LOGIC/OUTPUT clauses say: *"Add fields `harness: HarnessId` ... to CacheKeyInputs"* and
*"`CacheKeyInputs` requires harness"*. A literal **required** field **BREAKS THE BUILD**. This task
declares `harness?: HarnessId` (optional) and defers the required-tightening to the task that owns
its prerequisite. The implementer MUST make BOTH new fields optional and MUST append them to
`normalized` only when defined.

### Proof a required `harness` breaks the build (verified in the live tree)

1. **The sole construction site of `CacheKeyInputs` does not pass `harness`.**
   - `src/core/agent.ts:624` builds `const cacheInputs: CacheKeyInputs = { user, data, system, model,
     temperature, maxTokens, tools, mcps, skills, responseFormat }` — **NO harness, NO provider**.
   - `grep -rn "CacheKeyInputs" src/` (excluding `cache-key.ts` + its test) → the ONLY hits are
     `agent.ts:33,34,624,636` and the two barrel re-exports (`src/cache/index.ts`, `src/index.ts`).
     There is exactly **one** consumer, and it omits the field.

2. **`npm run lint` type-checks `agent.ts`.**
   - `package.json` → `"lint": "tsc --noEmit"`. `tsconfig.json:23` → `"exclude": ["node_modules",
     "dist", "src/__tests__"]`. `src/core/agent.ts` is non-test source → it IS type-checked.
   - A required `harness: HarnessId` triggers **TS2741** at `agent.ts:624` (*Property 'harness' is
     missing ... but required in type 'CacheKeyInputs'*) → `npm run lint` exits ≠ 0 → task fails.

3. **`agent.ts` is owned by the downstream task P3.M1.T2.S3 — out of scope here.**
   - `plan/004_9a50e71828f4/tasks.json`: **P3.M1.T2.S3 = "Thread harness + provider into the cache
     key build-site"** (status: Planned). It is the task that will resolve the harness via
     `resolveHarnessConfig(...).harness` (shipped by the parallel predecessor P1.M2.T2.S1) and the
     provider via the `ModelSpec`/`parseModelSpec`, then pass both into `CacheKeyInputs`.
   - This task is **forbidden** from editing `agent.ts` (identical boundary to P1.M2.T2.S1, whose
     PRP states agent.ts is "Untouched (P3.M1 owns rewire)"). Editing `agent.ts` here would collide
     with P3.M1.T2.S3's planned diff and break its green contract.

### Resolution — optional fields, conditional append, zero behavioral regression

- Declare **`harness?: HarnessId`** and **`provider?: ModelProviderId`** (both optional). `provider`
  is already optional per the contract; making `harness` optional too is uniform and consistent.
- In `generateCacheKey`, append each field to `normalized` **only when `!== undefined`** — exactly
  the pattern already used for `data`, `system`, `temperature`, `maxTokens`, `tools`, `mcps`,
  `skills`. A call that omits both (e.g. today's `agent.ts` call) produces the **byte-for-byte
  identical** key as before this task → zero behavioral regression, existing tests unchanged.
- **Never** unconditionally assign `normalized.harness = inputs.harness`. `deterministicStringify`
  stringifies `undefined` as the literal `'undefined'` (see `cache-key.ts` `stringify()`), which
  would inject `"harness":undefined` and silently drift every key. The `!== undefined` guard is
  mandatory.
- The contract's INTENT (keys distinct per (harness, provider, model) — PRD §7.14.5) is fully
  realized: any caller that PROVIDES the axes gets full isolation; the omission case is a transient
  migration state owned by P3.M1.T2.S3.

> This mirrors the dual-singleton Scope Decision in the parallel predecessor PRP (P1.M2.T2.S1):
> honor the contract's intent + ship green; defer literal achievement to the downstream task that
> owns its prerequisites.

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agent:
- **P3.M1.T2.S3** — "Thread harness + provider into the cache key build-site." It will edit
  `agent.ts:624` to pass `harness` (from `resolveHarnessConfig(globalConfig, this.harness,
  this.harnessOptions, promptHarness, promptOptions).harness` — shipped by P1.M2.T2.S1) and
  `provider` (from the resolved `ModelSpec.provider` via `parseModelSpec` / `Harness.normalizeModel`).
  This task ships the `CacheKeyInputs` **shape** it consumes.

**Use Case:** PRD §7.14.5 mandates cross-harness cache isolation. With the harness/provider axes on
the cache key, a cached response from a `pi`-harness run is never returned for a `claude-code` run
(and vice versa), and provider-qualified models (`anthropic/claude-...` vs `openai/gpt-4o`) get
distinct cache entries even when the bare model id collides.

**Pain Points Addressed:** Today's key uses only a bare `model: string` (no harness, no provider).
Cross-harness/cross-provider cache collisions are possible. This task closes the §7.14.5 gap at the
key-generation layer.

---

## Why

- **Realizes PRD §7.14.5** (the defining v1.2 cache-isolation requirement) at the key layer.
- **Unblocks P3.M1.T2.S3.** That task only needs to THREAD values into the fields this task adds;
  without this task, it would have to extend the interface itself (scope creep / merge conflict).
- **Backward-compatible by construction.** Optional fields + conditional append → the sole existing
  consumer (`agent.ts`) keeps compiling and produces identical keys until P3.M1.T2.S3 rewires it.
- **Low-risk, reversible, tiny diff.** One source file (+2 interface fields, +2 conditional
  appends, +1 type import) and additive test cases. No runtime/behavior change for existing callers.

---

## What

1. **MODIFY `src/cache/cache-key.ts`**:
   - Add `import type { HarnessId, ModelProviderId } from '../types/harnesses.js';` near the existing
     `import type { Tool, MCPServer, Skill } from '../types/index.js';`.
   - In `CacheKeyInputs`, immediately after `model: string;`, add `harness?: HarnessId;` and
     `provider?: ModelProviderId;` with JSDoc (PRD §7.14.5; "optional during the harness migration
     window; always provided once P3.M1.T2.S3 rewires the Agent cache build-site").
   - In `generateCacheKey`, after the initial `const normalized = { user, model }` literal and
     BEFORE the existing optional `data` block (placement is cosmetic — `deterministicStringify`
     sorts keys — but grouping the identity axes near `model` reads cleanly), add:
     ```ts
     if (inputs.harness !== undefined) {
       normalized.harness = inputs.harness;
     }
     if (inputs.provider !== undefined) {
       normalized.provider = inputs.provider;
     }
     ```
   - Do NOT touch `deterministicStringify`, `getSchemaHash`, `extractSchemaStructure`, the existing
     optional-field blocks, the `schemaHash` line, or the SHA-256 call.
2. **MODIFY `src/__tests__/unit/cache-key.test.ts`** — append a new `describe(...)` block of
   isolation cases (see Implementation Blueprint Task 2). Leave every existing test UNCHANGED
   (they omit `harness`/`provider`; with optional fields they compile and pass as-is).

### Success Criteria

- [ ] `CacheKeyInputs` has `harness?: HarnessId` and `provider?: ModelProviderId` (grep-verified).
- [ ] `generateCacheKey` references `inputs.harness` and `inputs.provider` behind `!== undefined`
      guards (grep-verified); no unconditional assignment.
- [ ] `npm run lint` exits 0 (proves `agent.ts` still compiles — the optional-field proof).
- [ ] `npm test` exits 0 (existing tests unchanged + new isolation cases pass).
- [ ] `npm run build` exits 0; `dist/cache/cache-key.d.ts` shows the two new optional fields.
- [ ] `git diff --name-only` shows exactly 2 files: `src/cache/cache-key.ts` +
      `src/__tests__/unit/cache-key.test.ts`. (`agent.ts`, barrels, `types/*` — all unchanged.)

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: a developer who has never seen this repo can implement S1 using only
(a) this PRP, (b) read-only access to `src/cache/cache-key.ts` (the file being edited) +
`src/types/harnesses.ts` (the type source) + `src/__tests__/unit/cache-key.test.ts` (the test being
extended), and (c) the copy-paste-ready snippets in the Implementation Blueprint. The single
load-bearing non-obvious detail — **why `harness` must be optional** — is spelled out in the Scope
Decision above and in `research/scope-and-consumer-analysis.md`.

### Documentation & References

```yaml
# MUST READ — the authoritative contract for this task.
- url: PRD.md §7.14. (repo root; identical content in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.14.5 = "Cache keys incorporate BOTH the harness and the provider/model for isolation"
       (the requirement this task implements). §7.2 = HarnessId ('pi'|'claude-code'). §7.8 =
       ModelProviderId (OPEN set: 'anthropic'|'openai'|'google'|'zai'|(string&{}); harness NEVER
       in the model string — so provider is a SEPARATE axis that must be its own key component).
  critical: §7.14.5 is the ONLY clause that mentions cache keys — it is the entire justification.
            Do NOT over-engineer (no key versioning, no namespace prefix) — just add the 2 axes.

# MUST READ — the file being edited (the entire change is here).
- file: src/cache/cache-key.ts
  why: Holds CacheKeyInputs (L21-43), deterministicStringify (L36-117 — note `undefined`→'undefined'
        at L46), generateCacheKey (L201-265 — the normalized object + conditional optional-field
        pattern to follow + the trailing schemaHash + SHA-256).
  pattern: follow the EXISTING optional-field pattern (L211-247): `if (inputs.X !== undefined)
           normalized.X = inputs.X;`. Do NOT invent a new pattern.
  gotcha: deterministicStringify stringifies `undefined` as the literal string 'undefined' — NEVER
          assign `normalized.harness = inputs.harness` unconditionally (would inject
          "harness":undefined and drift every key). Always guard with `!== undefined`.

# MUST READ — the type source (already shipped by P1.M1.T1.S1 / P1.M1.T1.S2).
- file: src/types/harnesses.ts
  why: Defines `HarnessId = 'pi' | 'claude-code'` (L11) and `ModelProviderId` open set (L19-24).
        Import BOTH as type-only from here.
  pattern: "import type { HarnessId, ModelProviderId } from '../types/harnesses.js';"
  gotcha: src/types/index.ts does NOT re-export these types (only AnthropicProvider). Import
          directly from '../types/harnesses.js' — matches the predecessor PRP convention.

# MUST READ — the ground-truth gap analysis (confirms the §7.14.5 violation this task fixes).
- file: plan/004_9a50e71828f4/docs/consumer-analysis.md
  why: §4 ("Cache Key Does NOT Include Harness/Provider") quotes the current CacheKeyInputs +
        generateCacheKey + the agent.ts:624 consumer site and enumerates the exact 3-step fix this
        task performs. It is the source of the contract's wording.
  critical: §4 confirms the ONLY consumer is agent.ts:624 (the basis of the Scope Decision).

# MUST READ — this task's scope/consumer proof (the Scope Decision evidence).
- file: plan/004_9a50e71828f4/P1M3T1S1/research/scope-and-consumer-analysis.md
  why: §1 enumerates every consumer (grep-verified: only agent.ts). §2 proves a required `harness`
        triggers TS2741 at agent.ts:624 and fails `npm run lint`. §3 ties this to the predecessor's
        dual-singleton pattern. §5 is the P3.M1.T2.S3 handoff.
  critical: READ §2 BEFORE editing — do NOT make `harness` required.

# MUST READ — the parallel predecessor PRP (establishes the ship-green-during-migration pattern).
- file: plan/004_9a50e71828f4/P1M2T2S1/PRP.md
  why: Its "Scope Decision" (dual-singleton to keep agent.ts + 4 test files compiling) is the
        template for THIS task's optional-field decision. It also ships `resolveHarnessConfig` —
        the function P3.M1.T2.S3 will call to obtain the `harness` value passed into CacheKeyInputs.
  critical: P1.M2.T2.S1 does NOT touch src/cache/ — no merge conflict. It keeps agent.ts green via
            the provider-config.js shim; this task must NOT undo that by breaking agent.ts.

# SHOULD READ — the test being extended (existing structure + assertion style).
- file: src/__tests__/unit/cache-key.test.ts
  why: Existing `describe('generateCacheKey', ...)` block shows the established test style
        (vitest `describe/it/expect`, 64-hex regex `/^[a-f0-9]{64}$/`, "same key"/"different key"
        comparisons). The new isolation block follows the same style. Existing tests OMIT
        harness/provider — they stay valid because the fields are optional.
  pattern: base input shape `{ user: 'Hello', model: 'claude-sonnet-4-20250514' }`; add
           `harness: 'pi'`/`'claude-code'` and `provider: 'anthropic'`/`'openai'`/`'google'`/`'zai'`.

# SHOULD READ — the cache barrel + public barrel (auto-track the interface; NO edit needed).
- file: src/cache/index.ts
  why: re-exports `generateCacheKey` + type `CacheKeyInputs` (L7-8). Adding fields to the interface
        is transparent to the barrel — NO edit. (src/index.ts L160/L162 likewise — NO edit.)
  gotcha: do NOT edit the barrels; they re-export by name and pick up the new fields automatically.
```

### Current Codebase tree (relevant slice — verified in working tree)

```bash
src/cache/
├── cache-key.ts        # ← EDIT (the ONLY source change): +2 interface fields, +2 conditional appends, +1 type import
├── cache.ts            # untouched (LLMCache/defaultCache)
└── index.ts            # untouched (barrel — auto-tracks CacheKeyInputs fields)
src/types/
└── harnesses.ts        # untouched — IMPORT HarnessId + ModelProviderId from here (shipped by P1.M1.T1)
src/core/
└── agent.ts            # NOT touched — sole consumer of CacheKeyInputs (owned by P3.M1.T2.S3); kept compiling via optional fields
src/index.ts            # untouched (public barrel — auto-tracks)
src/__tests__/unit/
└── cache-key.test.ts   # ← EDIT (additive): append isolation describe-block; leave existing tests unchanged
```

### Desired Codebase tree with files to be added/changed

```bash
src/cache/cache-key.ts                  # MODIFY — +import type {HarnessId,ModelProviderId}; +harness?/provider? on CacheKeyInputs; +2 conditional appends in generateCacheKey
src/__tests__/unit/cache-key.test.ts    # MODIFY — append `describe('cache key isolation — harness + provider (PRD §7.14.5)', ...)`
# (No other files touched. agent.ts, cache/index.ts, src/index.ts, types/* — all unchanged.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Do NOT make `harness` required. The contract says "requires harness" but the sole
//   consumer (agent.ts:624, owned by P3.M1.T2.S3) does not pass it. A required field → TS2741 at
//   agent.ts:624 → `npm run lint` fails. Make BOTH new fields OPTIONAL. (See Scope Decision +
//   research/scope-and-consumer-analysis.md §2.)

// CRITICAL #2 — NEVER assign `normalized.harness = inputs.harness` unconditionally.
//   deterministicStringify (cache-key.ts:46) stringifies `undefined` as the literal 'undefined',
//   injecting `"harness":undefined` and drifting EVERY key. ALWAYS guard with `!== undefined`,
//   matching the existing optional-field pattern (data/system/temperature/maxTokens/tools/mcps/skills).

// GOTCHA #3 — `npm run lint` EXCLUDES src/__tests__ (tsconfig.json:23 "exclude": [..., "src/__tests__"]).
//   It type-checks src/cache/cache-key.ts AND src/core/agent.ts (non-test source). A test-only type
//   error will NOT fail lint — but it WILL fail `npm test` if it breaks transpilation. Run BOTH gates.

// GOTCHA #4 — isolatedModules: true (tsconfig.json:20). Use `import type { HarnessId, ModelProviderId }`
//   (type-only) — never a value import for types. The codebase follows this convention everywhere.

// GOTCHA #5 — src/types/index.ts does NOT re-export HarnessId/ModelProviderId. Import directly from
//   '../types/harnesses.js'. (grep confirmed: types/index.ts only re-exports AnthropicProvider from
//   ../harnesses/.)

// GOTCHA #6 — deterministicStringify SORTS object keys (cache-key.ts:99 `Object.keys(...).sort()`).
//   So the insertion order of `harness`/`provider` in the `normalized` object is COSMETIC — it does
//   NOT affect the SHA-256 digest. Place them wherever reads cleanest (near `model` is recommended).

// GOTCHA #7 — Do NOT edit the barrels (src/cache/index.ts, src/index.ts). They re-export
//   `CacheKeyInputs` by name and pick up the new fields automatically. Editing them is out of scope
//   and unnecessary.

// GOTCHA #8 — Keep `provider` as the LLM host axis ONLY (ModelProviderId). Do NOT confuse it with
//   the harness. PRD §7.8: the harness NEVER appears in the model string; provider is the separate
//   LLM-vendor axis. Both must be independent key components (PRD §7.14.5).

// GOTCHA #9 — Leave existing cache-key.test.ts tests UNCHANGED. They omit harness/provider and
//   assert identical-input→identical-key. With optional fields they still compile + pass. The new
//   isolation cases go in a SEPARATE describe-block. Rewriting existing assertions risks breaking
//   the green contract for no benefit.

// GOTCHA #10 — The `model` field stays a bare `string` (NOT changed to ModelSpec). This task adds
//   orthogonal axes; it does not refactor how `model` is represented. P3.M1.T2.S3 decides whether
//   to pass a provider-qualified model string; that is out of scope here.
```

---

## Implementation Blueprint

### Data models and structure

No new data models. This task CONSUMES `HarnessId` and `ModelProviderId` from
`src/types/harnesses.ts` and adds two optional fields to the existing `CacheKeyInputs` interface.

```ts
// cache-key.ts — type imports (isolatedModules → use `import type`)
import type { HarnessId, ModelProviderId } from '../types/harnesses.js';
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — confirm a clean tree (the parallel P1.M2.T2.S1 task touches
    src/utils/, NOT src/cache/ — no conflict, but start from a known state).
  - RUN: `grep -n "export type HarnessId\|export type ModelProviderId" src/types/harnesses.ts` —
    expect 2 hits (P1.M1.T1.S1/S2 prerequisites). If absent, STOP.
  - RUN: `grep -n "const cacheInputs: CacheKeyInputs" src/core/agent.ts` — confirm the sole
    consumer still omits `harness` (basis of the Scope Decision). If it ALREADY passes harness,
    re-evaluate (P3.M1.T2.S3 may have landed).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before touching anything.

Task 1: MODIFY src/cache/cache-key.ts — Part A (interface)
  - FILE: src/cache/cache-key.ts (EDIT).
  - ADD the type import immediately after the existing `import type { Tool, MCPServer, Skill } from
    '../types/index.js';` line:
        import type { HarnessId, ModelProviderId } from '../types/harnesses.js';
  - IN the `CacheKeyInputs` interface, immediately AFTER the `model: string;` field, ADD:
        /**
         * Agent runtime identifier (PRD §7.2 / §7.14.5 cache isolation).
         *
         * Optional during the harness migration window: the Agent cache build-site (P3.M1.T2.S3)
         * does not yet pass it, so omitting it preserves the pre-task key. Once P3.M1.T2.S3 rewires
         * `agent.ts` to always pass the resolved harness, this field may be tightened to required.
         * When provided, it becomes a component of the SHA-256 cache key so `pi` and `claude-code`
         * runs never share cache entries.
         */
        harness?: HarnessId;
        /**
         * LLM host / model provider (PRD §7.8 / §7.14.5 cache isolation).
         *
         * The LLM-vendor axis (NOT the harness) — e.g. 'anthropic', 'openai', 'google', 'zai', or
         * any open-set provider string. Optional; resolved from the ModelSpec. When provided, it
         * becomes a component of the SHA-256 cache key so provider-qualified models with colliding
         * bare ids get distinct entries.
         */
        provider?: ModelProviderId;
  - VERIFY: `grep -n "harness?: HarnessId\|provider?: ModelProviderId" src/cache/cache-key.ts` → 2 hits.

Task 2: MODIFY src/cache/cache-key.ts — Part B (generateCacheKey threading)
  - IN `generateCacheKey(inputs)`, locate the initial `const normalized: Record<string, unknown> =
    { user: inputs.user, model: inputs.model };` literal.
  - IMMEDIATELY AFTER that literal (BEFORE the existing `if (inputs.data !== undefined)` block —
    placement is cosmetic per GOTCHA #6 but grouping identity axes near `model` reads cleanly), ADD:
        // PRD §7.14.5: incorporate the harness + provider axes for cross-harness/provider isolation.
        // Conditional append (matches the optional-field pattern below) — omitting them yields the
        // exact pre-task key, so the Agent build-site stays green until P3.M1.T2.S3 rewires it.
        if (inputs.harness !== undefined) {
          normalized.harness = inputs.harness;
        }
        if (inputs.provider !== undefined) {
          normalized.provider = inputs.provider;
        }
  - DO NOT modify any other line: keep the data/system/temperature/maxTokens/tools/mcps/skills
    blocks, the `normalized.schemaHash = getSchemaHash(...)` line, and the
    `createHash('sha256').update(serialized, 'utf8').digest('hex')` return EXACTLY as-is.
  - VERIFY: `grep -n "inputs.harness\|inputs.provider" src/cache/cache-key.ts` → 2 hits in
    generateCacheKey (the `!== undefined` guards); 0 unconditional assignments.

Task 3: MODIFY src/__tests__/unit/cache-key.test.ts — append isolation cases (ADDITIVE)
  - APPEND a new describe-block at the END of the file (do NOT alter existing tests):
      describe('cache key isolation — harness + provider (PRD §7.14.5)', () => {
        const base = { user: 'Hello', model: 'claude-sonnet-4-20250514' };

        it('produces different keys for different harnesses (same model)', () => {
          const pi = generateCacheKey({ ...base, harness: 'pi' });
          const cc = generateCacheKey({ ...base, harness: 'claude-code' });
          expect(pi).not.toBe(cc);
          expect(pi).toMatch(/^[a-f0-9]{64}$/);
          expect(cc).toMatch(/^[a-f0-9]{64}$/);
        });

        it('produces different keys for different providers (same harness + model)', () => {
          const anthropic = generateCacheKey({ ...base, harness: 'pi', provider: 'anthropic' });
          const openai    = generateCacheKey({ ...base, harness: 'pi', provider: 'openai' });
          expect(anthropic).not.toBe(openai);
        });

        it('produces distinct keys per (harness, provider, model) tuple', () => {
          const keys = new Set<string>([
            generateCacheKey({ ...base, harness: 'pi',          provider: 'anthropic' }),
            generateCacheKey({ ...base, harness: 'pi',          provider: 'openai' }),
            generateCacheKey({ ...base, harness: 'claude-code', provider: 'anthropic' }),
            generateCacheKey({ ...base, harness: 'claude-code', provider: 'openai' }),
            generateCacheKey({ ...base, model: 'gpt-4o', harness: 'pi', provider: 'openai' }),
          ]);
          expect(keys.size).toBe(5);   // all 5 tuples distinct
        });

        it('produces the same key when harness + provider are identical', () => {
          const a = generateCacheKey({ ...base, harness: 'pi', provider: 'anthropic' });
          const b = generateCacheKey({ ...base, harness: 'pi', provider: 'anthropic' });
          expect(a).toBe(b);
        });

        it('participates: omitting harness yields a different key than providing it', () => {
          const without = generateCacheKey({ ...base });
          const withPi  = generateCacheKey({ ...base, harness: 'pi' });
          expect(without).not.toBe(withPi);   // proves harness actually feeds the digest
        });

        it('participates: omitting provider yields a different key than providing it', () => {
          const without = generateCacheKey({ ...base, harness: 'pi' });
          const withP   = generateCacheKey({ ...base, harness: 'pi', provider: 'anthropic' });
          expect(without).not.toBe(withP);
        });

        it('accepts open-set provider strings (e.g. zai, google, custom)', () => {
          const zai     = generateCacheKey({ ...base, harness: 'pi', provider: 'zai' });
          const google  = generateCacheKey({ ...base, harness: 'pi', provider: 'google' });
          const custom  = generateCacheKey({ ...base, harness: 'pi', provider: 'my-self-hosted' });
          const set = new Set([zai, google, custom]);
          expect(set.size).toBe(3);   // open-set ModelProviderId — all distinct
        });

        it('is unaffected by other-field ordering (deterministic via key sort)', () => {
          // harness/provider declared in opposite order + data interleaved — must stay equal
          const a = generateCacheKey({ user: 'Hi', model: 'm', harness: 'pi', provider: 'anthropic', data: { x: 1 } });
          const b = generateCacheKey({ data: { x: 1 }, provider: 'anthropic', model: 'm', harness: 'pi', user: 'Hi' });
          expect(a).toBe(b);
        });

        it('backward-compat: omitting both harness + provider preserves the pre-task key shape', () => {
          // Same call shape as the existing 'identical inputs' test — must still be a valid 64-hex key
          // and equal to another identical omission (zero behavioral regression for agent.ts today).
          const a = generateCacheKey({ user: 'Hello', model: 'claude-sonnet-4-20250514' });
          const b = generateCacheKey({ user: 'Hello', model: 'claude-sonnet-4-20250514' });
          expect(a).toBe(b);
          expect(a).toMatch(/^[a-f0-9]{64}$/);
        });
      });
  - NAMING/PLACEMENT: append at end of `src/__tests__/unit/cache-key.test.ts`. No new file.
  - COVERAGE: harness isolation, provider isolation, full (harness,provider,model) distinctness,
    determinism, field-participation proofs, open-set provider, ordering-independence, backward-compat.
  - NOTE: no new imports needed — `generateCacheKey` is already imported; the new fields are passed
    as plain object literals (harness: 'pi'|'claude-code', provider: 'anthropic'|'openai'|...).

Task 4: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: grep (contract), npm run lint, npm test, npm run build, git diff --name-only.
  - ANY lint failure → almost certainly `harness` was made required (re-read Scope Decision) or an
    unconditional `normalized.harness = inputs.harness` injected `undefined` (re-read GOTCHA #2).
```

### Implementation Patterns & Key Details

```ts
// === The interface delta (after `model: string;`) ===
export interface CacheKeyInputs {
  // ... existing fields ...
  /** Model identifier */
  model: string;
  /** Agent runtime identifier (PRD §7.2 / §7.14.5). Optional during the migration window. */
  harness?: HarnessId;
  /** LLM host / model provider (PRD §7.8 / §7.14.5). Open set; resolved from the ModelSpec. */
  provider?: ModelProviderId;
  /** Temperature setting */
  temperature?: number;
  // ... rest unchanged ...
}

// === The generateCacheKey delta (immediately after the `normalized` literal) ===
export function generateCacheKey(inputs: CacheKeyInputs): string {
  const normalized: Record<string, unknown> = {
    user: inputs.user,
    model: inputs.model,
  };

  // PRD §7.14.5: harness + provider axes for cross-harness/provider cache isolation.
  // Conditional append — omitting yields the exact pre-task key (keeps agent.ts green until
  // P3.M1.T2.S3 rewires the build-site). NEVER assign unconditionally (undefined→'undefined' drift).
  if (inputs.harness !== undefined) {
    normalized.harness = inputs.harness;
  }
  if (inputs.provider !== undefined) {
    normalized.provider = inputs.provider;
  }

  // ... existing optional data/system/temperature/maxTokens/tools/mcps/skills blocks unchanged ...
  normalized.schemaHash = getSchemaHash(inputs.responseFormat);
  const serialized = deterministicStringify(normalized);
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}
```

### Integration Points

```yaml
SOURCE EDIT:
  - src/cache/cache-key.ts : +1 type import, +2 optional interface fields, +2 conditional appends.

TEST EDIT (additive):
  - src/__tests__/unit/cache-key.test.ts : append `describe('cache key isolation — harness +
    provider (PRD §7.14.5)', ...)` block. Existing tests UNCHANGED.

CONSUMERS (kept green — NO source edits):
  - src/core/agent.ts:624   : sole CacheKeyInputs construction site; omits harness/provider today →
                              compiles because fields are OPTIONAL. P3.M1.T2.S3 owns the rewire
                              (pass harness from resolveHarnessConfig().harness + provider from
                              the resolved ModelSpec).

BARRELS (auto-track — NO edit):
  - src/cache/index.ts:7-8  : re-exports generateCacheKey + type CacheKeyInputs by name.
  - src/index.ts:160,162    : public-API re-export by name.

NOT IN SCOPE (do not touch — owned downstream):
  - agent.ts cache build-site threading (harness + provider values)   → P3.M1.T2.S3
  - Tightening harness? to required (after all consumers pass it)      → P3.M1.T2.S3 / follow-up
  - AgentConfig.harness / PromptOverrides.harness fields               → P3.M2
  - Public Harness*/CacheKeyInputs export changes in src/index.ts      → P3.M3.T1.S1 (none needed)
  - Cross-harness parity test suite (incl. cache isolation e2e)        → P4.M2.T1.S2
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates non-test
> `src/` INCLUDING `src/cache/cache-key.ts` AND `src/core/agent.ts`). `npm test` = `vitest run`
> (esbuild transpile-only; the new isolation block + existing tests). `npm run build` = `tsc`.
> No eslint/prettier. **Run BOTH lint and test** — lint is the proof that `agent.ts` still compiles
> (the optional-field Scope Decision); test is the proof of §7.14.5 isolation.

### Level 1: Syntax & Type Check (run after Tasks 1–2)

```bash
# Non-test type check — THE proof that optional fields keep agent.ts compiling.
npm run lint
# Expected: exit 0. An error naming agent.ts = `harness` was made REQUIRED (TS2741) → re-read Scope
# Decision. An error naming cache-key.ts = a bad type import (use `import type`, from
# '../types/harnesses.js') or an unconditional assignment that failed to compile.
```

### Level 2: Unit Tests (run after Task 3)

```bash
# The extended cache-key suite (existing tests UNCHANGED + new isolation block)
npm test -- src/__tests__/unit/cache-key.test.ts
# Expected: all pass. A failure in the new block = the field isn't actually threaded (check the
# `!== undefined` guards) or a copy-paste error in the case. A failure in an EXISTING test =
# behavioral regression (you broke the optional-field pattern) — STOP and re-read GOTCHA #2.

# Full suite (catch anything else — agent integration tests that hit the cache path, etc.)
npm test
# Expected: all pass. agent.ts still calls generateCacheKey with no harness → identical keys → its
# cache tests stay green (zero behavioral regression).
```

### Level 3: Contract Verification (grep gates)

```bash
# Both new fields exist on the interface (OPTIONAL — note the `?`):
grep -n "harness?: HarnessId\|provider?: ModelProviderId" src/cache/cache-key.ts
# Expected: 2 hits, each with `?`. If `?` is missing → required → breaks agent.ts → fix.

# generateCacheKey threads both behind `!== undefined` guards (no unconditional assignment):
grep -n "inputs.harness !== undefined\|inputs.provider !== undefined" src/cache/cache-key.ts
# Expected: 2 hits. Then confirm no bare `normalized.harness = inputs.harness` without a guard:
grep -nE "normalized\.(harness|provider) = inputs\.(harness|provider)" src/cache/cache-key.ts
# Expected: 2 hits (the guarded assignments). If a guard is missing, this still shows the line —
# cross-check manually that each is inside an `if (... !== undefined)` block.

# The type import is present and type-only:
grep -n "import type { HarnessId, ModelProviderId } from '../types/harnesses.js'" src/cache/cache-key.ts
# Expected: 1 hit.

# Exactly 2 files changed (agent.ts + barrels + types/* UNTOUCHED):
git diff --name-only
# Expected: exactly
#   src/cache/cache-key.ts
#   src/__tests__/unit/cache-key.test.ts
```

### Level 4: Behavioral Spot-Check (isolation proof)

```bash
# Confirm distinct keys per (harness, provider, model) + zero regression for omission.
npx tsx -e '
  import { generateCacheKey } from "./src/cache/cache-key.js";
  const base = { user: "Hello", model: "claude-sonnet-4-20250514" };
  const pi  = generateCacheKey({ ...base, harness: "pi" });
  const cc  = generateCacheKey({ ...base, harness: "claude-code" });
  const pa  = generateCacheKey({ ...base, harness: "pi", provider: "anthropic" });
  const po  = generateCacheKey({ ...base, harness: "pi", provider: "openai" });
  const none = generateCacheKey({ ...base });   // agent.ts today (omits both)
  console.log("pi != cc        :", pi !== cc);     // true  (harness isolation)
  console.log("pa != po        :", pa !== po);     // true  (provider isolation)
  console.log("pi != pa        :", pi !== pa);     // true  (provider participates)
  console.log("none != pi      :", none !== pi);   // true  (harness participates)
  console.log("none is 64-hex  :", /^[a-f0-9]{64}$/.test(none));  // true (format preserved)
'
# Expected: pi != cc: true ; pa != po: true ; pi != pa: true ; none != pi: true ; none is 64-hex: true
```

### Level 5: Build (declaration-emit sanity)

```bash
npm run build
# Expected: exit 0; dist/cache/cache-key.d.ts shows `harness?: HarnessId;` + `provider?:
# ModelProviderId;` on the CacheKeyInputs interface.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` exits 0 (agent.ts compiles — the optional-field Scope Decision proof).
- [ ] `npm test` exits 0 (existing cache-key tests UNCHANGED + new isolation block passes).
- [ ] `npm run build` exits 0; `dist/cache/cache-key.d.ts` shows the 2 new optional fields.
- [ ] `git diff --name-only` shows exactly `src/cache/cache-key.ts` + `src/__tests__/unit/cache-key.test.ts`.

### Feature Validation

- [ ] `CacheKeyInputs` has `harness?: HarnessId` and `provider?: ModelProviderId` (both OPTIONAL).
- [ ] `generateCacheKey` appends each field to `normalized` only when `!== undefined` (no unconditional
      assignment; no `undefined`→`'undefined'` key drift).
- [ ] Distinct keys per (harness, provider, model) tuple (Level 4 spot-check: all `true`).
- [ ] Omitting both fields yields the byte-for-byte pre-task key (backward-compat for `agent.ts` today).
- [ ] All existing `cache-key.test.ts` assertions pass UNCHANGED (zero behavioral regression).

### Code Quality Validation

- [ ] Optional-field decision respected (Scope Decision): `harness` is `harness?: HarnessId`, NOT required.
- [ ] `import type` used for `HarnessId` / `ModelProviderId` (isolatedModules).
- [ ] New interface fields carry JSDoc citing PRD §7.14.5 + the migration-window note.
- [ ] Existing `deterministicStringify` / `getSchemaHash` / `extractSchemaStructure` untouched.
- [ ] Barrels (`src/cache/index.ts`, `src/index.ts`) untouched (auto-track the interface).

### Documentation & Deployment

- [ ] JSDoc on both new fields explains WHY they are optional (P3.M1.T2.S3 owns the rewire).
- [ ] No new environment variables; no config-file changes; no dependency changes.

---

## Anti-Patterns to Avoid

- ❌ **Don't make `harness` required.** The sole consumer (`agent.ts:624`, owned by P3.M1.T2.S3)
  omits it → TS2741 → `npm run lint` fails. Make BOTH new fields optional. (Scope Decision +
  `research/scope-and-consumer-analysis.md §2`.)
- ❌ **Don't assign `normalized.harness = inputs.harness` unconditionally.** `deterministicStringify`
  stringifies `undefined` as `'undefined'`, injecting `"harness":undefined` and drifting EVERY key
  (breaks backward compat + the existing "identical inputs" regression baseline). Always guard with
  `!== undefined`, exactly like the existing `data`/`system`/`temperature` blocks. (GOTCHA #2.)
- ❌ **Don't edit `agent.ts`, the barrels, or `types/*`.** `agent.ts` is P3.M1.T2.S3's domain; the
  barrels auto-track the interface; the types are already shipped by P1.M1. Editing them is out of
  scope and risks merge conflicts with parallel/downstream tasks.
- ❌ **Don't rewrite the existing `cache-key.test.ts` tests.** They omit `harness`/`provider` and
  assert identical-input→identical-key; with optional fields they pass unchanged. Add a NEW
  describe-block for the isolation cases.
- ❌ **Don't conflate `provider` with `harness`.** `provider` is the LLM host (`ModelProviderId`,
  PRD §7.8); `harness` is the runtime (`HarnessId`, PRD §7.2). They are independent axes — both must
  be separate key components (PRD §7.14.5).
- ❌ **Don't change `model` to a `ModelSpec`.** This task adds orthogonal axes; it does not refactor
  the `model: string` representation. Provider-qualified model strings are P3.M1.T2.S3's concern.
- ❌ **Don't add key versioning / namespace prefixes / a "cache schema version".** PRD §7.14.5 only
  requires the two axes be incorporated. Keep the change minimal: +2 fields, +2 conditional appends.
- ❌ **Don't skip `npm run lint`.** It is the ONLY gate that type-checks `agent.ts` (the proof that
  the optional-field decision holds). `npm test` excludes nothing but uses esbuild transpile-only,
  so it would NOT catch a TS2741 in agent.ts.

---

## Hand-off Notes for Downstream Tasks

- **P3.M1.T2.S3 (Agent cache build-site threading):** edit `agent.ts:624` to pass `harness` +
  `provider` into `CacheKeyInputs`. Obtain `harness` from `resolveHarnessConfig(globalConfig,
  this.harness, this.harnessOptions, promptHarness, promptOptions).harness` (shipped by P1.M2.T2.S1
  via `src/utils/harness-config.ts`). Obtain `provider` from the resolved `ModelSpec.provider` via
  `parseModelSpec(effectiveModel, defaultModelProvider)` (shipped by P1.M1.T2.S1 via
  `src/utils/model-spec.ts`) or `harness.normalizeModel(effectiveModel).provider`. After ALL
  consumers pass `harness`, you MAY tighten `harness?: HarnessId` → `harness: HarnessId` (required)
  in a follow-up — but only after confirming no other construction site omits it.
- **P4.M2.T1.S2 (cross-harness parity tests):** add an end-to-end cache-isolation test asserting
  that two Agent runs differing only by harness (`pi` vs `claude-code`) produce distinct cache keys
  and never share entries. The unit-level isolation is covered by THIS task's test block; the e2e
  level is yours.
- **P3.M3.T1.S1 (public API):** no action needed for `CacheKeyInputs` — the barrels auto-track the
  new fields. (You WILL export the Harness surface + deprecated aliases, but that is independent.)

---

**Confidence Score: 9/10** — A 2-file, ~15-line source change with copy-paste-ready snippets, a
fully-specified test block, and a decisive Scope Decision (optional fields) that is the ONLY
ship-green path given the sole-consumer constraint. The -1 is residual risk that the implementing
agent ignores the Scope Decision and makes `harness` required (the lint gate + grep gates catch it).
