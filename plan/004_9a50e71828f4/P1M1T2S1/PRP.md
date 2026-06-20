# PRP — P1.M1.T2.S1: Open-set model spec parsing and formatting

**PRD reference:** §7.8 (Model & Provider Specification) + §7 (Harness ⊥ Provider split).
**Plan:** `plan/004_9a50e71828f4/` — first subtask of P1.M1.T2 (Migrate model-spec parsing to
open `ModelProviderId` set).
**Scope tag:** RUNTIME IMPLEMENTATION + a transitional type alias to keep the build green.
This PRP assumes **P1.M1.T1 (S1 + S2) is complete** — verified: `src/types/harnesses.ts` already
exports `ModelProviderId` (open set), `ModelSpec` (provider: `ModelProviderId`), and the type-only
`declare function parseModelSpec/formatModelForProvider` signatures that THIS task implements.

---

## Goal

**Feature Goal:** Rewrite `src/utils/model-spec.ts` so `parseModelSpec()` / `formatModelForProvider()`
operate on the **open** `ModelProviderId` set (PRD §7.8): provider validation changes from a
closed-union check (`'anthropic' | 'opencode'`) to a **non-empty-string** check, the parse **rejects
harness-qualified strings** (more than one `/`, e.g. `pi/anthropic/x`), and the duplicated
`isValidProviderId` helper is removed. The functions return `ModelSpec` sourced from
`src/types/harnesses.ts` (NOT the legacy `providers.ts`).

**Deliverable:**
1. Rewritten `src/utils/model-spec.ts` importing `ModelSpec` / `ModelProviderId` from
   `../types/harnesses.js`, implementing the open-set parsing contract (PRD §7.8) — non-empty
   validation, single-`/` qualified format, 3+ segment rejection, no closed provider union.
2. A **transitional `ModelSpec` re-export** in `src/types/providers.ts` so the legacy consumers
   (`anthropic-provider.ts`, `opencode-provider.ts`) keep compiling (see "Known Gotchas").
3. Updated `src/__tests__/unit/utils/model-spec.test.ts` reflecting open-set semantics.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) passes with exit 0 across the WHOLE repo (no transient break).
2. `npm test` (`vitest run`) passes — including the updated `model-spec.test.ts` AND the existing
   `anthropic-provider-normalizemodel.test.ts` / `opencode-provider-normalizemodel.test.ts`.
3. `parseModelSpec('openai/gpt-4o')`, `parseModelSpec('google/gemini-2.5-pro')`, and
   `parseModelSpec('custom-llm/my-model')` all succeed (open set) and return the correct `ModelSpec`.
4. `parseModelSpec('pi/anthropic/claude-sonnet-4')` and `parseModelSpec('cc/anthropic/x')` THROW
   with a message matching `/harness must not appear in model string/i` (PRD §7.8 critical rule).
5. `parseModelSpec('anthropic/claude-sonnet-4')` and the plain form `parseModelSpec('claude-sonnet-4')`
   behave identically to today (regression-safe).
6. `isValidProviderId` and `getSupportedProvidersList` no longer exist in `src/utils/model-spec.ts`.
7. The closed-union `'anthropic' | 'opencode'` check is gone from model-spec parsing.

---

## User Persona

**Target User:** Groundswell core maintainers + downstream PRP agents implementing:
- **P2.M1** (ClaudeCodeHarness — rename of AnthropicProvider) — consumes `parseModelSpec`.
- **P2.M2** (PiHarness) — consumes `parseModelSpec` for `normalizeModel` / `ModelSpec → Model<any>`.
- **P3.M3.T1.S1** (public API) — re-exports `parseModelSpec` / `formatModelForProvider` from
  `utils/model-spec.ts` (NOT from `types/harnesses.ts`, whose `declare function`s are erased).

**Use Case:** Every harness adapter + the Agent runtime resolves model strings via
`parseModelSpec('anthropic/claude-sonnet-4')` → `{ provider, model, raw }`. Because v1.2 makes the
LLM provider an **open set** (Pi runs any provider; only `claude-code` is Anthropic-only), the parser
must accept arbitrary non-empty provider strings instead of the old two-value union.

**Pain Points Addressed:**
- The legacy parser hard-codes `isValidProviderId === 'anthropic' || 'opencode'` (DUPLICATED verbatim
  in `src/utils/provider-config.ts`), which rejects every v1.2 provider (`openai`, `google`, `zai`,
  custom) — blocking Pi's multi-provider runtime.
- The legacy parser uses `split('/', 2)`, silently truncating `pi/anthropic/x` to
  `{ provider:'pi', model:'anthropic' }` instead of rejecting the harness-qualified form that PRD §7.8
  forbids.

---

## Why

- **Unblocks the v1.2 provider axis.** PRD §7.8 makes `ModelProviderId` an open set; the harness
  (`pi` | `claude-code`) is NEVER in the model string. The parser is the single chokepoint every
  adapter flows model strings through, so it must accept the open set and enforce the harness-never-
  in-string rule BEFORE P2.M2 (PiHarness) lands.
- **Removes the duplicated guard.** `isValidProviderId` exists identically in `model-spec.ts` and
  `provider-config.ts`; with open-set semantics the model-spec copy is obsolete (a non-empty check
  replaces it), so the duplicate is removed and `provider-config.ts` retains its own copy for the
  closed-set `GlobalProviderConfig` validation it still owns (relocated/rewritten in P1.M2).
- **Codifies the harness ⊥ provider rule at parse time.** Rejecting 3-segment strings turns the PRD
  §7.8 "critical rule" into a deterministic runtime guarantee instead of a documentation hope.
- **Zero behavior change for valid v1.1 strings.** `anthropic/claude-...` and plain model ids parse
  identically — the only removed capability is accepting arbitrary multi-slash junk.

---

## What

Rewrite `src/utils/model-spec.ts` to implement the open-set contract:

1. **Import the canonical types** from `../types/harnesses.js`: `ModelSpec`, `ModelProviderId`.
   Stop importing the legacy `ModelSpec` / `ProviderId` from `../types/providers.js`.
2. **`parseModelSpec(model: string, defaultProvider: ModelProviderId = 'anthropic'): ModelSpec`**:
   - Preserve `raw = model` (original, untrimmed — existing tests assert whitespace is preserved here).
   - `const trimmed = model.trim();` → throw if `trimmed.length === 0`.
   - `const parts = trimmed.split('/')` (**NO `limit` argument** — must observe ALL segments).
   - `parts.length === 1` → plain format: return `{ provider: defaultProvider, model: parts[0], raw }`.
   - `parts.length === 2` → qualified format: if `parts[0]` empty → throw "Provider cannot be empty …";
     if `parts[1]` empty → throw "Model name cannot be empty …"; else return
     `{ provider: parts[0], model: parts[1], raw }`. **No closed-union check** — any non-empty
     `parts[0]` is a valid `ModelProviderId`.
   - `parts.length >= 3` → **throw** `Harness must not appear in model string …` (harness-qualified
     form, e.g. `pi/anthropic/x`, `cc/anthropic/...`).
3. **`formatModelForProvider(spec: ModelSpec, targetProvider: ModelProviderId): string`** — keep the
   current MVP behavior: pass-through (`return spec.model`) when `spec.provider === targetProvider`,
   else throw the cross-translation error. Only the parameter/field TYPES change to `ModelProviderId`.
4. **Delete** the local `isValidProviderId` and `getSupportedProvidersList` helpers (open-set makes
   them obsolete). Update error messages to drop any "Supported providers:" list.
5. **Transitional build-green alias**: in `src/types/providers.ts`, replace the local
   `export interface ModelSpec { provider: ProviderId; … }` (currently at lines ~249–256) with a
   re-export of the harness `ModelSpec`, so the legacy consumers compile. (See Known Gotchas — this
   is mandatory, not optional.)

### Success Criteria

- [ ] `npm run lint` passes (exit 0).
- [ ] `npm test` passes (all suites).
- [ ] `parseModelSpec` accepts any non-empty provider (open set) and rejects 3+ segment strings.
- [ ] `formatModelForProvider` pass-through + cross-translation error unchanged in behavior.
- [ ] `isValidProviderId` / `getSupportedProvidersList` removed from `src/utils/model-spec.ts`.
- [ ] `src/utils/model-spec.ts` imports `ModelSpec`/`ModelProviderId` from `../types/harnesses.js`.
- [ ] No other behavior regressions; legacy valid strings still parse identically.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: A developer who has never seen this repo can implement this task using
only (a) this PRP, (b) read-only access to the five files named below, and (c) the exact reference
implementation + test rewrites in the Implementation Blueprint. Every file path, line number, and the
one non-obvious compile-break (and its fix) are spelled out.

### Documentation & References

```yaml
# MUST READ — the authoritative contract.
- url: PRD.md §7.8  (repo root; also plan/004_9a50e71828f4/prd_snapshot.md)
  why: §7.8 defines ModelSpec, ModelProviderId (open union incl. `(string & {})`), and the
       parseModelSpec/formatModelForProvider signatures this task implements, PLUS the
       "critical rule": the harness is NEVER part of the model string → 3-segment strings are invalid.
  critical: §7.8 shows ModelProviderId = 'anthropic' | 'openai' | 'google' | 'zai' | (string & {}).
            The `(string & {})` idiom = "open branded string": IDE autocompletes the literals but
            ANY string type-checks. This is WHY validation becomes a non-empty check, not a union check.

# MUST READ — the file you are REWRITING (current closed-set implementation).
- file: src/utils/model-spec.ts
  why: Contains the current parseModelSpec/formatModelForProvider (closed ProviderId), the
       isValidProviderId + getSupportedProvidersList helpers to DELETE, and the split('/',2) bug
       to replace with full-segment rejection.
  pattern: 'const parts = trimmed.split("/", 2);'  ← REMOVE the limit-2; must see all segments.
  gotcha: 'raw' MUST stay the ORIGINAL untrimmed input (existing tests assert
          parseModelSpec('  anthropic/x  ').raw === '  anthropic/x  ').

# MUST READ — the SOURCE OF TRUTH for the types you now import (S1+S2 output).
- file: src/types/harnesses.ts
  why: Exports ModelProviderId (open set), ModelSpec (provider: ModelProviderId), and the
       type-only `declare function parseModelSpec/formatModelForProvider` whose SIGNATURES this
       runtime must satisfy exactly. Read the file-level block comment above those declarations —
       it documents the import guidance (value from utils/model-spec.ts, never from harnesses.ts).
  pattern: "export type ModelProviderId = 'anthropic' | 'openai' | 'google' | 'zai' | (string & {});"
  gotcha: harnesses.ts has NO runtime emission (declare functions erased). Do NOT import the
          VALUE from harnesses.ts — only the TYPES. The runtime value comes from utils/model-spec.ts.

# MUST READ — the legacy types file needing the transitional alias.
- file: src/types/providers.ts
  why: Still DEFINES its own `export interface ModelSpec { provider: ProviderId; … }` (~line 249)
       AND the closed `ProviderId = "anthropic" | "opencode"` (~line 9). The legacy providers
       (`anthropic-provider.ts`, `opencode-provider.ts`) import THIS ModelSpec + `implements Provider`
       (Provider.normalizeModel returns providers.ModelSpec). After model-spec.ts switches to
       harnesses.ModelSpec, those return types mismatch → BUILD BREAKS unless you alias.
  critical: Make providers.ModelSpec === harnesses.ModelSpec via re-export (see Implementation
            Blueprint Task 2). Leave ProviderId CLOSED for now — aliasing ProviderId is T3's job.

# MUST READ — the test file you must UPDATE.
- file: src/__tests__/unit/utils/model-spec.test.ts
  why: Asserts the OLD closed-set behavior (e.g. "should throw on invalid provider", "multiple
       slashes (limit to first slash)", ProviderId type import). Must be rewritten for open-set.
  gotcha: Several assertions become INVERTED — e.g. parseModelSpec('invalid/model') now SUCCEEDS
          (provider='invalid'), and parseModelSpec('anthropic/claude/3') now THROWS (harness rule).

# Architecture context (read-only confidence checks).
- file: plan/004_9a50e71828f4/docs/system_context.md
  why: §3 mapping table (ModelSpec.provider → ModelProviderId) + §6 sequencing (foundation types
       → model-spec open-set) confirm this is the intended split and that consumers are migrated
       in P2.M1 (ClaudeCodeHarness rename) / P4.M1 (opencode removal).
- file: plan/004_9a50e71828f4/P1M1T1S2/PRP.md
  why: The predecessor PRP. Its "Success Definition" item 5 states the declare-function signatures
       are "the canonical contract that P1.M1.T2.S1's utils/model-spec.ts implementation must satisfy."
```

### Current Codebase tree (relevant slice)

```bash
src/
├── types/
│   ├── harnesses.ts        # S1+S2: ModelProviderId (open), ModelSpec, declare fn signatures  ← IMPORT FROM HERE
│   └── providers.ts        # LEGACY: ProviderId (closed), ModelSpec (closed), Provider iface   ← ALIAS ModelSpec HERE
├── utils/
│   ├── model-spec.ts       # ← REWRITE (this task)
│   ├── provider-config.ts  # duplicate isValidProviderId (LEAVE — owned by P1.M2)
│   └── index.ts            # barrel: `export { parseModelSpec, formatModelForProvider } from './model-spec.js'`  (no change)
├── providers/
│   ├── anthropic-provider.ts   # imports parseModelSpec; normalizeModel(): ModelSpec   (compiles via the alias)
│   └── opencode-provider.ts    # imports parseModelSpec; normalizeModel(): ModelSpec   (compiles via the alias)
└── __tests__/
    └── unit/
        ├── utils/model-spec.test.ts                          # ← REWRITE (this task)
        ├── providers/anthropic-provider-normalizemodel.test.ts # verify (may need tweaks)
        ├── providers/opencode-provider-normalizemodel.test.ts  # verify (may need tweaks)
        └── harnesses-config-types.test.ts                      # verify (type test; should still pass)
```

### Desired Codebase tree with files to be added/changed

```bash
src/utils/model-spec.ts               # REWRITE — open-set parse/format, no closed-union guard
src/types/providers.ts                # MODIFY  — replace local ModelSpec iface with re-export of harnesses.ModelSpec
src/__tests__/unit/utils/model-spec.test.ts  # REWRITE — open-set + harness-rejection assertions
# (No new files.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Direction of assignability CAUSES A BUILD BREAK.
//   ModelProviderId = 'anthropic'|'openai'|'google'|'zai'|(string & {})   (open)
//   ProviderId      = 'anthropic' | 'opencode'                            (closed)
//   ProviderId ⊂ ModelProviderId, so ProviderId IS assignable to ModelProviderId,
//   but ModelProviderId is NOT assignable to ProviderId.
//   parseModelSpec('anthropic/x', 'anthropic')  ← 'anthropic' arg is ProviderId-literal, assignable to the
//                                                   ModelProviderId PARAMETER ✓ (call sites don't break).
//   BUT parseModelSpec now RETURNS harnesses.ModelSpec (provider: ModelProviderId). The legacy providers
//   annotate `normalizeModel(): ModelSpec` against providers.ModelSpec (provider: ProviderId) and
//   `implements Provider`. Returning a ModelProviderId-typed field where ProviderId is expected → TS error
//   at BOTH the return statement AND the `implements Provider` check.
//   FIX: make providers.ModelSpec === harnesses.ModelSpec via re-export (Implementation Task 2).
//   Do NOT alias ProviderId here — that is P1.M1.T3's deprecated-alias job. Leave it closed.

// CRITICAL #2 — split('/', 2) HIDES the harness-qualified form. The legacy `trimmed.split('/', 2)`
//   truncates 'pi/anthropic/x' to ['pi','anthropic'] (length 2) and silently "accepts" it. You MUST
//   drop the limit: `trimmed.split('/')` and branch on parts.length (1=plain, 2=qualified, >=3=throw).

// GOTCHA #3 — `raw` must stay the ORIGINAL (untrimmed) input. Existing tests assert
//   parseModelSpec('  anthropic/claude  ').raw === '  anthropic/claude  '  (whitespace preserved).
//   Only `trimmed` (used for splitting) drops whitespace.

// GOTCHA #4 — harnesses.ts `declare function`s are ERASED at compile time (type-only). The runtime
//   VALUES live ONLY in utils/model-spec.ts. Importing the value from harnesses.ts and calling it is a
//   RUNTIME ERROR. The public API (P3.M3.T1.S1) must re-export the value from utils/model-spec.ts.

// GOTCHA #5 — provider-config.ts ALSO has a verbatim copy of isValidProviderId + getSupportedProvidersList.
//   LEAVE IT. That file validates the closed ProviderId set for GlobalProviderConfig (still legitimately
//   closed until P1.M2 relocates/renames it). Removing it would break configureProviders(). Full
//   reconciliation happens in P1.M2 (provider-config → harness-config relocation).

// GOTCHA #6 — `npm run lint` IS the type-check (`tsc --noEmit`). There is NO eslint/prettier in
//   package.json scripts. Validation gates = `npm run lint` + `npm test` only.
```

---

## Implementation Blueprint

### Data models and structure

No new data models. This task CONSUMES the types from `src/types/harnesses.ts` (S1+S2 output):

```ts
// From src/types/harnesses.ts (already shipped — DO NOT redefine)
export type ModelProviderId =
  | 'anthropic' | 'openai' | 'google' | 'zai' | (string & {});

export interface ModelSpec {
  provider: ModelProviderId;  // LLM host — NOT the harness
  model: string;
  raw: string;                // original (untrimmed) input
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: REWRITE src/utils/model-spec.ts
  - CHANGE import: `import type { ModelSpec, ModelProviderId } from '../types/harnesses.js';`
    (remove the old `import type { ProviderId, ModelSpec } from '../types/providers.js';`)
  - DELETE: the module-private `isValidProviderId` and `getSupportedProvidersList` helpers.
  - IMPLEMENT parseModelSpec(model: string, defaultProvider: ModelProviderId = 'anthropic'): ModelSpec
      * raw = model (UNTRIMMED — preserve original).
      * trimmed = model.trim(); if (trimmed.length === 0) throw 'Model specification cannot be empty. ...'.
      * parts = trimmed.split('/')   ← NO limit arg.
      * if (parts.length === 1) return { provider: defaultProvider, model: parts[0], raw }.
      * if (parts.length === 2):
          - provider = parts[0]; if (provider.length === 0) throw '... Provider cannot be empty ...'.
          - modelName = parts[1]; if (modelName.length === 0) throw '... Model name cannot be empty ...'.
          - return { provider, model: modelName, raw }.   // open set — NO union check, ANY non-empty ok.
      * if (parts.length >= 3) throw new Error(
          `Harness must not appear in model string. ` +
          `Expected format "provider/model" (e.g. "anthropic/claude-sonnet-4"), got "${raw}".`
        );
  - IMPLEMENT formatModelForProvider(spec: ModelSpec, targetProvider: ModelProviderId): string
      * if (spec.provider === targetProvider) return spec.model;   // pass-through
      * throw new Error(
          `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
          `Cross-provider model translation is not supported.`
        );
  - UPDATE JSDoc: remove "Provider must be one of: 'anthropic', 'opencode'"; drop examples that imply a
    closed set; add open-set examples (openai/google/zai/custom) and a harness-qualified rejection example.
  - NAMING: keep `parseModelSpec` / `formatModelForProvider` (consumed by name in utils/index.ts + providers).
  - PLACEMENT: same file (full rewrite via `write` or targeted `edit`).

Task 2: MODIFY src/types/providers.ts  (TRANSITIONAL ALIAS — MANDATORY to keep build green)
  - FIND: the local `export interface ModelSpec { provider: ProviderId; model: string; raw: string; }`
    (≈ lines 249–256, immediately after the `parseModelSpec('opencode/gpt-4')` JSDoc example).
  - REPLACE that interface definition with a re-export of the harness ModelSpec so both refer to the
    SAME type. Concretely:
        // v1.2: ModelSpec is owned by types/harnesses.ts (provider is the open ModelProviderId set).
        // Re-exported here as a TRANSITIONAL alias so legacy Provider* consumers compile until they
        // are renamed/removed (P2.M1 ClaudeCodeHarness, P4.M1 opencode removal). Full deprecated
        // Provider*→Harness* alias shim is P1.M1.T3.
        export type { ModelSpec } from './harnesses.js';
        import type { ModelSpec } from './harnesses.js';   // for internal use (Provider.normalizeModel)
  - WHY BOTH LINES: `export type { X } from` does NOT bring X into local scope, but the `Provider`
    interface (≈ line 817: `normalizeModel(model: string): ModelSpec;`) references ModelSpec internally,
    so a plain `import type { ModelSpec }` is also needed. (Two statements is fine; or use
    `import type { ModelSpec } from './harnesses.js'; export type { ModelSpec };`.)
  - PRESERVE: everything else in providers.ts — `ProviderId` stays CLOSED ("anthropic" | "opencode"),
    GlobalProviderConfig, ProviderCapabilities, etc. Do NOT touch ProviderId (that is T3's scope).
  - GOTCHA: keep the JSDoc `@see`/example block above (the parseModelSpec('opencode/gpt-4') doc) intact
    or trim it to match — just don't leave a dangling interface. Simplest: leave the preceding JSDoc and
    replace only the `export interface ModelSpec { ... }` block with the two alias lines.

Task 3: REWRITE src/__tests__/unit/utils/model-spec.test.ts  (open-set semantics)
  - CHANGE type import: `import type { ModelSpec, ModelProviderId } from '../../../types/harnesses.js';`
    (was: `import type { ModelSpec, ProviderId } from '../../../types/providers.js';`).
  - KEEP: empty/whitespace throws, empty-provider throws ('/model'), empty-model throws ('anthropic/'),
    raw-preserves-whitespace, same-provider pass-through, cross-translation error message tests.
  - REMOVE/INVERT:
      * "should throw on invalid provider" (`parseModelSpec('invalid/model')`) → now SUCCEEDS. Replace
        with an open-set acceptance test: parseModelSpec('invalid/model') → { provider:'invalid', model:'model', raw }.
      * "should include supported providers in error message" (checks 'anthropic' + 'opencode') → DELETE
        (no closed set, no supported-providers list).
      * "should handle multiple slashes (limit to first slash)" (`anthropic/claude/3/5` → provider:'anthropic',
        model:'claude') → INVERT: now THROWS. Replace with a harness-rejection test asserting
        `expect(() => parseModelSpec('anthropic/claude/3/5')).toThrow(/harness must not appear/i)`.
      * "type safety" tests using `const provider: ProviderId = result.provider;` → change to ModelProviderId.
  - ADD open-set acceptance tests: openai/gpt-4o, google/gemini-2.5-pro, zai/glm-4.6, custom-llm/my-model.
  - ADD harness-qualified rejection tests: 'pi/anthropic/claude-sonnet-4', 'cc/anthropic/x', 'pi/openai/gpt-4o'
    all throw /harness must not appear in model string/i.
  - REFRAIN from opencode-specific closed-set assertions (opencode is removed in P4.M1); if you keep any
    opencode usage, treat it as just-another-non-empty-provider (it is valid under open-set).

Task 4: VERIFY adjacent test suites still pass  (NO code change expected — run and fix only if broken)
  - RUN: `npm test -- src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts`
         `npm test -- src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts`
         `npm test -- src/__tests__/unit/harnesses-config-types.test.ts`
  - anthropic normalizeModel throws if spec.provider !== 'anthropic'; with open-set that behavior is
    unchanged for valid input. FIX any test that asserted the OLD "invalid provider" closed-set throw
    by flipping it to an open-set acceptance or a harness-rejection expectation.
  - harnesses-config-types.test.ts is a TYPE test against the (unchanged) declare-function signatures;
    it should pass as-is. If it asserts runtime behavior, it is out of contract — adjust minimally.
```

### Implementation Patterns & Key Details

```ts
// src/utils/model-spec.ts — canonical open-set implementation
import type { ModelSpec, ModelProviderId } from '../types/harnesses.js';

export function parseModelSpec(
  model: string,
  defaultProvider: ModelProviderId = 'anthropic',
): ModelSpec {
  const raw = model;                       // preserve ORIGINAL (untrimmed) input
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new Error(
      'Model specification cannot be empty. Expected format: "provider/model" or "model"',
    );
  }

  const parts = trimmed.split('/');        // NOTE: NO limit — observe every segment

  if (parts.length === 1) {
    // Plain format — resolve against defaultProvider (open set)
    return { provider: defaultProvider, model: parts[0], raw };
  }

  if (parts.length === 2) {
    const [provider, modelName] = parts;
    if (provider.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". Provider cannot be empty. ` +
        'Expected format: "provider/model"',
      );
    }
    if (modelName.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". Model name cannot be empty. ` +
        'Expected format: "provider/model"',
      );
    }
    // Open set: ANY non-empty provider string is a valid ModelProviderId (PRD §7.8).
    return { provider, model: modelName, raw };
  }

  // parts.length >= 3 → harness-qualified form (e.g. pi/anthropic/x). PRD §7.8 critical rule:
  // the harness must NEVER appear in the model string.
  throw new Error(
    `Harness must not appear in model string. ` +
    `Expected format "provider/model" (e.g. "anthropic/claude-sonnet-4-20250514"), got "${raw}".`,
  );
}

export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ModelProviderId,
): string {
  // MVP behavior unchanged: pass-through when providers match, else cross-translation error.
  if (spec.provider === targetProvider) {
    return spec.model;
  }
  throw new Error(
    `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
    'Cross-provider model translation is not supported.',
  );
}
```

```ts
// src/types/providers.ts — transitional alias (Task 2). Replace the local interface with:
import type { ModelSpec } from './harnesses.js';   // internal use (Provider.normalizeModel refs it)
export type { ModelSpec };                          // re-export so legacy consumers see the SAME type
// (Leave `ProviderId`, GlobalProviderConfig, ProviderCapabilities, etc. UNCHANGED.)
```

### Integration Points

```yaml
TYPES:
  - src/types/harnesses.ts : SOURCE OF TRUTH for ModelSpec + ModelProviderId (no edit; S1+S2 own it).
  - src/types/providers.ts : ModelSpec re-exported as transitional alias (Task 2). ProviderId stays closed.

BARREL (no change needed):
  - src/utils/index.ts already does `export { parseModelSpec, formatModelForProvider } from './model-spec.js';`
    — values still exported by the same names; types now resolve to harnesses.ModelSpec. Leave as-is.

CONSUMERS (compile via the alias — no edit expected):
  - src/providers/anthropic-provider.ts : normalizeModel(): ModelSpec + implements Provider.
  - src/providers/opencode-provider.ts  : normalizeModel(): ModelSpec + implements Provider.
  - src/types/agent.ts                  : references parseModelSpec/ModelSpec in JSDoc @see only; uses
                                          ProviderId for AgentConfig.provider (unrelated axis). No edit.

NOT IN SCOPE (do not touch):
  - src/utils/provider-config.ts (duplicate isValidProviderId — owned by P1.M2 relocation).
  - ProviderId aliasing, GlobalHarnessConfig.configureHarnesses — owned by P1.M1.T3 / P1.M2.T2.
```

---

## Validation Loop

> **Toolchain note:** this repo is TypeScript + vitest. `npm run lint` IS `tsc --noEmit` (the type
> check). There is NO eslint/prettier/ruff/mypy. Validation = `npm run lint` + `npm test`.

### Level 1: Syntax & Type Check (run after Task 1 + Task 2)

```bash
# Type-check the whole repo — MUST be exit 0 (this catches the consumer compile-break if the
# providers.ts alias from Task 2 was missed or malformed).
npm run lint

# If errors mention anthropic-provider.ts / opencode-provider.ts normalizeModel return type or
# `implements Provider`, the providers.ts ModelSpec alias (Task 2) is missing/wrong — re-check it.
# Expected: zero errors.
```

### Level 2: Unit Tests (run after Task 3)

```bash
# The rewritten model-spec suite
npm test -- src/__tests__/unit/utils/model-spec.test.ts

# The adjacent suites that exercise normalizeModel (parseModelSpec consumers) + the type test
npm test -- src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
npm test -- src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts
npm test -- src/__tests__/unit/harnesses-config-types.test.ts

# Full suite (catch anything else)
npm test

# Expected: all pass. If a provider-normalizemodel test asserts the old "invalid provider" closed-set
# throw, flip it to open-set acceptance or harness-rejection (see Task 4).
```

### Level 3: Targeted Behavior Verification (manual one-liners)

```bash
# Open-set acceptance + harness rejection smoke test (uses the project's tsx via vitest node, or a quick
# `npx tsx -e` one-liner). Run from repo root:
npx tsx -e '
  import("./src/utils/model-spec.ts").then(({ parseModelSpec }) => {
    console.log(parseModelSpec("openai/gpt-4o"));          // { provider:"openai", model:"gpt-4o", ... }
    console.log(parseModelSpec("claude-sonnet-4"));        // { provider:"anthropic", model:"claude-sonnet-4", ... }
    try { parseModelSpec("pi/anthropic/x"); } catch (e) { console.log("REJECTED:", e.message); }
  });
'
# Expected: openai/gpt-4o parses; plain form resolves to anthropic; "pi/anthropic/x" prints
# "REJECTED: Harness must not appear in model string ...".
```

### Level 4: Build (emit sanity check)

```bash
# Confirms declaration emit (.d.ts) is consistent with the re-export alias.
npm run build
# Expected: exit 0, dist/ regenerated without errors.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` (tsc --noEmit) passes with exit 0.
- [ ] `npm test` (vitest run) passes — full suite.
- [ ] `npm run build` succeeds.
- [ ] No file other than `src/utils/model-spec.ts`, `src/types/providers.ts`, and
      `src/__tests__/unit/utils/model-spec.test.ts` was modified (Task 4 fixes only IF a test breaks).

### Feature Validation

- [ ] `parseModelSpec('openai/gpt-4o')` → `{ provider:'openai', model:'gpt-4o', raw:'openai/gpt-4o' }`.
- [ ] `parseModelSpec('google/gemini-2.5-pro')` → provider `'google'` (open set accepted).
- [ ] `parseModelSpec('custom-llm/my-model')` → provider `'custom-llm'` (arbitrary string accepted).
- [ ] `parseModelSpec('anthropic/claude-sonnet-4')` → identical to current behavior (regression-safe).
- [ ] `parseModelSpec('claude-sonnet-4')` → provider resolves to default `'anthropic'`.
- [ ] `parseModelSpec('pi/anthropic/claude-sonnet-4')` THROWS `/harness must not appear/i`.
- [ ] `parseModelSpec('')` and `parseModelSpec('   ')` THROWS `/cannot be empty/i`.
- [ ] `parseModelSpec('/model')` THROWS (empty provider); `parseModelSpec('anthropic/')` THROWS (empty model).
- [ ] `formatModelForProvider(spec, spec.provider)` returns `spec.model` (pass-through).
- [ ] `formatModelForProvider(spec, 'other')` THROWS `/Cannot translate .* Cross-provider/`.
- [ ] `raw` preserves original untrimmed input (whitespace kept).

### Code Quality Validation

- [ ] `isValidProviderId` and `getSupportedProvidersList` no longer present in `src/utils/model-spec.ts`.
- [ ] No closed-union (`'anthropic' | 'opencode'`) check remains in model-spec parsing.
- [ ] `src/utils/model-spec.ts` imports types from `../types/harnesses.js` (not providers.js).
- [ ] JSDoc updated to reflect the open provider set (no "Supported providers" list).
- [ ] `src/types/providers.ts` change is MINIMAL (ModelSpec alias only); ProviderId left closed.

---

## Anti-Patterns to Avoid

- ❌ Don't keep `split('/', 2)` — it silently accepts harness-qualified 3-segment strings (the exact
  thing PRD §7.8 forbids). Use `split('/')` and branch on `parts.length`.
- ❌ Don't add a closed-union provider check back "for safety" — that re-breaks the open set and
  rejects `openai`/`google`/`zai`/custom providers (the whole point of v1.2).
- ❌ Don't import the `parseModelSpec`/`formatModelForProvider` VALUE from `types/harnesses.ts` — those
  are erased `declare function`s. The value comes from `utils/model-spec.ts` only.
- ❌ Don't alias `ProviderId` to `ModelProviderId` in `providers.ts` — that is P1.M1.T3's job and would
  expand this task's blast radius. Only alias `ModelSpec`.
- ❌ Don't delete the duplicate `isValidProviderId` from `src/utils/provider-config.ts` — that file is
  owned by P1.M2 and still legitimately validates the closed ProviderId set for GlobalProviderConfig.
- ❌ Don't change the `raw` semantics — it MUST stay the original untrimmed input (existing tests rely on it).
- ❌ Don't skip `npm run lint` — it is the ONLY thing that catches the consumer compile-break; "tests
  pass" is not sufficient (vitest uses esbuild transpilation which skips full type-checking).

---

## Hand-off Notes for Downstream Tasks

- **P1.M1.T3 (Provider* → Harness* deprecated alias shim):** This task added a MINIMAL `ModelSpec`
  alias in `providers.ts`. T3 should extend it to the full alias surface (ProviderId, ProviderCapabilities,
  ProviderOptions, GlobalProviderConfig, etc. → harness types), at which point the `ModelSpec` re-export
  added here becomes part of the formal alias shim (no conflict).
- **P2.M1 (ClaudeCodeHarness):** Consumes `parseModelSpec` (now open-set). The Anthropic-only
  constraint is enforced at `initialize()`/`execute()` (throw if `spec.provider !== 'anthropic'`),
  NOT in the parser — the parser stays provider-agnostic.
- **P2.M2 (PiHarness):** Consumes `parseModelSpec` for `normalizeModel` and `ModelSpec → Model<any>`.
  The open set is exactly what enables Pi's multi-provider runtime.
- **P3.M3.T1.S1 (public API):** Re-export `parseModelSpec`/`formatModelForProvider` VALUES from
  `utils/model-spec.ts` (NOT from `types/harnesses.ts`).
```
