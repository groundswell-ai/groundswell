# PRP — P1.M1.T1.S2: Add `GlobalHarnessConfig` and `ModelSpec` (open provider set)

**PRD reference:** §7.6 (Global Harness Configuration), §7.8 (Model & Provider Specification
— `ModelSpec` + `parseModelSpec`/`formatModelForProvider` signatures + open `ModelProviderId`).
**Plan:** `plan/004_9a50e71828f4/` — second subtask of P1.M1.T1 (Define Harness Type Surface).
**Scope tag:** PURE TYPES (append-only to `src/types/harnesses.ts`). No runtime code, no
re-export wiring, no `configureHarnesses` (owned by P1.M2.T2.S1), no function bodies (owned
by P1.M1.T2.S1). This PRP assumes **S1 is already complete** (verified — see "Current State").

---

## Goal

**Feature Goal:** Extend the already-shipped `src/types/harnesses.ts` (created in S1) with the
v1.2 *global configuration* and *model-parsing* **type contract**: the `GlobalHarnessConfig`
interface and the **type-only** ambient declarations of `parseModelSpec()` and
`formatModelForProvider()`. These complete the harness type surface so that P1.M1.T2.S1 can
implement the runtime and P1.M2 / P2 / P3 can consume it.

**Deliverable:** A pure-types, **append-only** edit to `src/types/harnesses.ts` adding exactly:
1. `export interface GlobalHarnessConfig { … }` (PRD §7.6 shape).
2. `export declare function parseModelSpec(model, defaultProvider?): ModelSpec` — signature only, **no body**.
3. `export declare function formatModelForProvider(spec, targetProvider): string` — signature only, **no body**.

> **`ModelSpec` and `ModelProviderId` are NOT redefined here.** S1 already exports both
> (`ModelSpec.provider` is already `ModelProviderId`). This task imports/reuses them. S1's
> `harnesses.ts` JSDoc explicitly flags the S2 hand-off: *"S2 adds GlobalHarnessConfig +
> parseModelSpec/formatModelForProvider FUNCTIONS and must NOT redefine this interface."*

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) passes with the appended declarations (exit 0).
2. `GlobalHarnessConfig`, `parseModelSpec`, `formatModelForProvider` are all exported from
   `src/types/harnesses.ts` and importable via `import type { … } from './harnesses.js'`.
3. The three additions are **type-only**: no runtime values are emitted by `harnesses.ts`
   (`declare function` is erased by `tsc`; the file remains import-only types per S1's contract).
4. `GlobalHarnessConfig` exactly matches PRD §7.6 (incl. the open-set `defaultModelProvider?:
   ModelProviderId` field added alongside `defaultHarness`).
5. The `parseModelSpec` / `formatModelForProvider` signatures EXACTLY match PRD §7.8 verbatim
   — they are the canonical contract that P1.M1.T2.S1's `utils/model-spec.ts` implementation
   must satisfy.
6. No other file is modified. `ModelSpec`/`ModelProviderId` are NOT redefined.

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agents implementing:
- **P1.M1.T2.S1** (open-set model-spec parsing) — consumes these declarations as its INPUT type contract.
- **P1.M2.T2.S1** (`configureHarnesses` + `getGlobalHarnessConfig` + `resolveHarnessConfig`) —
  consumes `GlobalHarnessConfig`.
- **P2.M1 / P2.M2** (ClaudeCodeHarness / PiHarness) — consume `parseModelSpec` + `GlobalHarnessConfig`.
- **P3.M3.T1.S1** (public API) — re-exports the full surface.

**Use Case:** `GlobalHarnessConfig` is the type of the object passed to `configureHarnesses()`
(PRD §7.6 example). `parseModelSpec`/`formatModelForProvider` are the canonical model-string
parsing/formatting signatures every harness adapter and the Agent runtime rely on (PRD §7.8).

**Pain Points Addressed:** The legacy `providers.ts` has `GlobalProviderConfig` (closed
`defaultProvider: ProviderId`) and a `ModelSpec` whose `provider` is the closed `ProviderId`.
v1.2 needs (a) a global config that carries the **independent** `defaultModelProvider` axis
and (b) a parsing contract against the **open** `ModelProviderId` set. S1 introduced the types;
S2 introduces the config + parsing **contract** that ties them together.

---

## Why

- **Completes the harness type surface.** S1 shipped the per-harness types (`Harness`,
  `HarnessId`, `ModelProviderId`, `ModelSpec`, etc.) but deliberately deferred the *global
  config* and *model-spec function contract* to S2 (see S1 PRP "Hand-off Notes"). This task
  closes that gap — after S2, `harnesses.ts` is the single source of truth for the ENTIRE
  v1.2 type vocabulary.
- **Unblocks the model-spec implementation.** P1.M1.T2.S1's contract reads verbatim:
  *"INPUT: ModelSpec/ModelProviderId/parseModelSpec/formatModelForProvider **types** from S1
  (src/types/harnesses.ts)."* Without S2's declarations, T2.S1 has no canonical signature to
  implement against and no `GlobalHarnessConfig` to source `defaultModelProvider` from.
- **Codifies the two-axis split at the type level.** `GlobalHarnessConfig.defaultHarness`
  (runtime axis) and `GlobalHarnessConfig.defaultModelProvider` (LLM-vendor axis) live
  side-by-side but independent — exactly the §7.6 / §7.7 mandate.
- **Zero-risk landing.** Pure-type append to a module that (per S1) currently has **no
  runtime consumers** (`grep -rln "from.*types/harnesses" src/` returns nothing until S3 wires
  re-exports). Cannot break the build; ships independently and reversibly.

---

## What

A pure-types, append-only edit to `src/types/harnesses.ts` that adds:

- **`GlobalHarnessConfig`** interface (PRD §7.6) — `defaultHarness: HarnessId` +
  `harnessDefaults?: Partial<Record<HarnessId, HarnessOptions>>` + the v1.2-added
  `defaultModelProvider?: ModelProviderId` (independent of harness).
- **`parseModelSpec`** as a `declare function` (type-only signature; PRD §7.8) — parses
  `"provider/model"` or a plain model id into a `ModelSpec`, resolving the plain form against
  `defaultProvider`.
- **`formatModelForProvider`** as a `declare function` (type-only signature; PRD §7.8) — renders
  a `ModelSpec` for a target provider.

The declarations carry **no function bodies** — they reference the runtime implementations
that live in `src/utils/model-spec.ts` (owned by P1.M1.T2.S1).

### Success Criteria

- [ ] `src/types/harnesses.ts` exports `GlobalHarnessConfig`, `parseModelSpec`, `formatModelForProvider`.
- [ ] `npm run lint` passes (zero `tsc` errors).
- [ ] `GlobalHarnessConfig.defaultModelProvider` is typed `ModelProviderId` (open set), NOT `ProviderId`.
- [ ] `parseModelSpec` / `formatModelForProvider` are `declare function` (no body, no runtime emission).
- [ ] `ModelSpec` and `ModelProviderId` are NOT redefined (reused from S1).
- [ ] No file other than `src/types/harnesses.ts` is touched.
- [ ] `configureHarnesses` is NOT added (owned by P1.M2.T2.S1).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: A developer who has never seen this repo can implement this task
using only (a) this PRP, (b) the complete reference declarations in the Implementation
Blueprint, and (c) read-only access to `src/types/harnesses.ts` (S1 output), `src/types/providers.ts`
(legacy shapes to mirror), and `src/utils/model-spec.ts` (the future implementation whose
contract is being declared). Every dependency type and its exact location is named below.

### Documentation & References

```yaml
# MUST READ — the authoritative contract being defined (verbatim interfaces + signatures).
- url: PRD.md §7.6 + §7.8   (in repo root; also plan/004_9a50e71828f4/prd_snapshot.md)
  why: §7.6 gives the exact GlobalHarnessConfig field list (incl. the v1.2-added
       defaultModelProvider); §7.8 gives the exact parseModelSpec/formatModelForProvider
       signatures + ModelSpec shape + the open ModelProviderId union.
  critical: §7.8 critical rule — "the harness is never part of the model string"; this is WHY
       parseModelSpec must accept the open provider set and reject harness-qualified strings
       (the rejection logic itself is T2.S1's job; S2 only declares the signature).

# MUST READ — the file you are editing (S1 output). Read it FIRST to see exactly where to append
# and to confirm ModelSpec/ModelProviderId/HarnessId/HarnessOptions are already exported.
- file: src/types/harnesses.ts
  why: S1 already defines HarnessId, ModelProviderId (open union), HarnessOptions, ModelSpec
        (provider: ModelProviderId), and the Harness interface. S2 APPENDS GlobalHarnessConfig
        + the two declare-function declarations. Do NOT duplicate any S1 export.
  pattern: 'export interface HarnessOptions { ... }' and 'export interface ModelSpec { ... }'
  gotcha: ModelSpec's JSDoc contains an explicit "NOTE: ... S2 ... must NOT redefine this
          interface" comment — honor it. Append, don't rewrite.

# MUST READ — the legacy shape to mirror 1:1 (JSDoc density + field naming).
- file: src/types/providers.ts
  why: GlobalProviderConfig (search for "Global Provider Configuration") is the 1:1 structural
        template for GlobalHarnessConfig. Its JSDoc block + cascade comment is the style to
        match (then update vocabulary Provider→Harness and add defaultModelProvider).
  pattern: 'export interface GlobalProviderConfig { defaultProvider: ProviderId; providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>; }'
  gotcha: GlobalProviderConfig has ONLY two fields (no model axis) — GlobalHarnessConfig adds
          the independent defaultModelProvider?: ModelProviderId field per §7.6.

# MUST READ — the runtime implementation whose SIGNATURE S2 declares (do NOT edit it).
- file: src/utils/model-spec.ts
  why: This file ALREADY implements parseModelSpec/formatModelForProvider (closed ProviderId).
        S2 declares the canonical OPEN-SET signature in harnesses.ts; P1.M1.T2.S1 then rewrites
        this file to (a) import ModelSpec/ModelProviderId from '../types/harnesses.js' and
        (b) implement against S2's declared signature with open-set validation.
  critical: The current default parameter is `defaultProvider: ProviderId = 'anthropic'`. S2's
        declared signature must use `defaultProvider?: ModelProviderId` (open set, OPTIONAL).
        Keep the default value behavior to T2.S1 (S2 only declares the type; no default value
        in a `declare function`).

# Architecture context (read-only confidence checks).
- file: plan/004_9a50e71828f4/docs/system_context.md
  why: §3 mapping table confirms GlobalProviderConfig→GlobalHarnessConfig (+defaultModelProvider)
        and ModelSpec.provider→ModelProviderId; §6 step 1 (foundation types) + step 3 (model
        spec open-set) sequence this exact split; §4.4/§4.5 confirm model-spec parsing is a
        concern SEPARATE from the harness config cascade.
- file: plan/004_9a50e71828f4/P1M1T1S1/PRP.md
  why: The predecessor PRP. Its "Hand-off Notes for Downstream Tasks" explicitly assigns this
        task: "S2: Add GlobalHarnessConfig + parseModelSpec() + formatModelForProvider() to
        this same file. Do NOT redefine ModelSpec or ModelProviderId."

# Test pattern to mirror if you add the optional type-test (Task 2).
- file: src/__tests__/unit/provider-result-types.test.ts
  why: The codebase's convention for validating pure-type modules via vitest `expectTypeOf` /
        `import type` + object-literal construction. (S1's recommended harnesses-types.test.ts
        follows the same pattern.)
```

### Current State (verified at PRP-writing time)

```bash
$ grep -rln "from.*types/harnesses" src/        # → (empty: no runtime consumers yet — S3 wires them)
$ npm run lint                                   # → exit 0 (green baseline; S1 complete)
```

S1 already exports from `src/types/harnesses.ts`: `HarnessId`, `ModelProviderId`
(`'anthropic' | 'openai' | 'google' | 'zai' | (string & {})`), `HarnessCapabilities`,
`HarnessOptions`, `HarnessHookEvents`, `ToolExecutionRequest`, `ToolExecutionResult`,
`HarnessExecutionOptions`, `HarnessRequest`, `ModelSpec` (`provider: ModelProviderId`), and
the `Harness` interface. **These are S2's inputs — do not redefine them.**

### Current Codebase Tree (relevant slice)

```bash
src/types/
├── agent.ts            # (unrelated to S2)
├── harnesses.ts        # ← EDIT (append GlobalHarnessConfig + 2 declare functions)
├── providers.ts        # legacy Provider* family (READ-ONLY; mirrored for JSDoc style)
├── sdk-primitives.ts   # (unrelated to S2)
├── streaming.ts        # (unrelated to S2)
└── index.ts            # barrel — DO NOT TOUCH (S3 / P3.M3.T1.S1 wires Harness re-exports)
src/utils/
└── model-spec.ts       # future runtime impl — DO NOT TOUCH (owned by P1.M1.T2.S1)
src/
└── index.ts            # public API — DO NOT TOUCH (P3.M3.T1.S1)
```

### Desired Codebase Tree (this task edits exactly one file)

```bash
src/types/
└── harnesses.ts        # MODIFIED (append-only): + GlobalHarnessConfig, + parseModelSpec (declare), + formatModelForProvider (declare)
src/__tests__/unit/
└── harnesses-config-types.test.ts   # NEW (RECOMMENDED, optional Task 2) — type-shape assertions
```

> No other file is created or modified by THIS task. Re-exports (`types/index.ts`,
> `src/index.ts`), `configureHarnesses`, deprecated aliases, and the `utils/model-spec.ts`
> rewrite are all owned by later subtasks — see "Boundary Validation" below.

### Known Gotchas of Our Codebase & Library Quirks

```ts
// CRITICAL — "type-only declaration" mechanism = `export declare function`.
// A `declare function foo(): T` is an AMBIENT declaration: tsc ERASES it at emit time
// (no JS output). harnesses.ts therefore remains a pure-types module (consistent with S1's
// "Zero runtime code" contract). The REAL runtime implementations live in utils/model-spec.ts
// (owned by P1.M1.T2.S1). Consumers wanting the RUNTIME VALUE must import from
// '../utils/model-spec.js'; consumers wanting the TYPE/SIGNATURE import from './harnesses.js'.
// Document this prominently in the JSDoc on each declare function (see reference impl).

// CRITICAL — `declare function` creates a PHANTOM VALUE binding. TypeScript believes the value
// exists in this module, but at runtime the export is absent (erased). If a consumer does
// `import { parseModelSpec } from './harnesses.js'` and CALLS it, they get a runtime error
// (undefined is not a function). Mitigation: (1) JSDoc warning, (2) P3.M3.T1.S1 public-API
// re-export MUST source the value from utils/model-spec.ts, NOT from harnesses.ts. S2 only
// declares; it does not control downstream wiring.

// CRITICAL — ESM + isolatedModules. harnesses.ts uses `import type` with `.js` extensions
// (see S1 lines 1-3). GlobalHarnessConfig references HarnessId / HarnessOptions / ModelProviderId
// which are ALL defined in the SAME file — no new imports needed. The declare functions
// reference ModelSpec / ModelProviderId, also same-file. DO NOT add a cross-file import.

// GOTCHA — Do NOT add a default value to `declare function parseModelSpec(model, defaultProvider = 'anthropic')`.
// Ambient declarations cannot have implementation defaults. The default-value behavior is
// T2.S1's responsibility in the runtime impl. S2's signature is `defaultProvider?: ModelProviderId`
// (optional, no default in the type).

// GOTCHA — Do NOT add `configureHarnesses` here. PRD §7.6 shows it next to GlobalHarnessConfig,
// but it is a RUNTIME util (system_context.md §3: "configureProviders → configureHarnesses
// (util rename)"), owned by P1.M2.T2.S1 and implemented in src/utils/harness-config.ts. S2
// ships ONLY the type interface. (If you also want a `declare function configureHarnesses`,
// do NOT — it is explicitly out of scope and P1.M2.T2.S1 will declare/implement it.)

// GOTCHA — `ModelProviderId` is the OPEN union from S1. GlobalHarnessConfig.defaultModelProvider
// and both function signatures MUST use it (NOT the legacy closed ProviderId). This is the
// whole point of "open provider set" in the work-item title.

// GOTCHA — `harnessDefaults?: Partial<Record<HarnessId, HarnessOptions>>` keys by HarnessId
// ('pi' | 'claude-code'), NOT by ModelProviderId. The two maps are independent (one per axis).
```

---

## Implementation Blueprint

### Data Models and Structure

This task adds one interface and two ambient function declarations. The complete, compilable
reference text is in "Implementation Patterns" — paste it at the END of `src/types/harnesses.ts`
(after the existing `Harness` interface), adjusting JSDoc wording as desired. No classes, no
runtime values, no imports.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: APPEND to src/types/harnesses.ts   (PRIMARY — mandatory)
  FILES:
    - MODIFY: src/types/harnesses.ts   (append-only; do NOT rewrite S1 content)
  IMPLEMENT, appended in this order after the existing `Harness` interface:
    1. export interface GlobalHarnessConfig (PRD §7.6 — see reference impl for exact fields)
    2. export declare function parseModelSpec(model: string, defaultProvider?: ModelProviderId): ModelSpec
    3. export declare function formatModelForProvider(spec: ModelSpec, targetProvider: ModelProviderId): string
  FOLLOW pattern: src/types/providers.ts GlobalProviderConfig (JSDoc density + cascade comment),
         and the existing S1 ModelSpec/HarnessOptions JSDoc blocks in harnesses.ts.
  NAMING: `GlobalHarnessConfig` (PascalCase interface); `parseModelSpec` / `formatModelForProvider`
         (camelCase functions, verbatim from PRD §7.8).
  PLACEMENT: end of src/types/harnesses.ts (after `export interface Harness { … }`).
  IMPORTS: NONE — HarnessId, HarnessOptions, ModelProviderId, ModelSpec are all same-file
         exports from S1. Do NOT add any `import` statement.
  MOCK/RUNTIME: NONE — `declare function` emits no code.

Task 2: CREATE src/__tests__/unit/harnesses-config-types.test.ts   (RECOMMENDED — TDD convention)
  FILES:
    - CREATE: src/__tests__/unit/harnesses-config-types.test.ts
  IMPLEMENT: vitest TYPE-SHAPE tests (mirror provider-result-types.test.ts / S1's test):
    - construct a GlobalHarnessConfig object literal with defaultHarness:'pi',
      harnessDefaults:{'claude-code':{apiKey:'x'}}, defaultModelProvider:'openai' → compiles.
    - assert defaultModelProvider accepts an ARBITRARY string (open set), e.g. 'mistral'.
    - assert harnessDefaults is keyed by HarnessId (narrow 'pi' | 'claude-code').
    - using `import type { parseModelSpec, formatModelForProvider } from '../../types/harnesses.js'`
      + vitest `expectTypeOf<typeof parseModelSpec>()`: assert .parameters match
      [string, ModelProviderId?] and .returns is ModelSpec; same for formatModelForProvider.
  FOLLOW pattern: src/__tests__/unit/provider-result-types.test.ts (uses `import type` +
         `describe/it/expectTypeOf` from 'vitest').
  NAMING: test_{concept}_{scenario}.
  NOTE: src/__tests__ is EXCLUDED from tsc build (tsconfig exclude), so this file never affects
        `npm run lint`. It is a green-field safety net + living documentation of the contract.
  COVERAGE: GlobalHarnessConfig shape (all 3 fields incl. optionality) + both signatures.

# OUT OF SCOPE — do NOT do these (owned by other tasks):
#   - Re-export GlobalHarnessConfig / parseModelSpec / formatModelForProvider from
#     src/types/index.ts or src/index.ts                         → S3 / P3.M3.T1.S1
#   - Add configureHarnesses / getGlobalHarnessConfig / resolveHarnessConfig  → P1.M2.T2.S1
#   - Implement parseModelSpec/formatModelForProvider bodies in utils/model-spec.ts → P1.M1.T2.S1
#   - Add deprecated Provider*/GlobalProviderConfig aliases                    → P1.M1.T3.S1
#   - Redefine ModelSpec or ModelProviderId (already in S1)                    → DO NOT
#   - Touch src/utils/model-spec.ts, src/types/providers.ts, or any runtime file
```

### Implementation Patterns & Key Details

> Complete reference text to **append** to `src/types/harnesses.ts`. It compiles against the
> current repo (all referenced types — `HarnessId`, `HarnessOptions`, `ModelProviderId`,
> `ModelSpec` — are same-file S1 exports; no new imports). JSDoc is dense on purpose: it is
> the only thing protecting future implementers from the `declare function` phantom-value trap.

```ts
/**
 * Global harness configuration (PRD §7.6).
 *
 * Configures the default harness, optional per-harness options, and the default LLM provider
 * that resolve unqualified model strings (PRD §7.8). Set once at application startup via
 * `configureHarnesses()` (owned by P1.M2.T2.S1) — it cascades to all agents unless explicitly
 * overridden (PRD §7.7).
 *
 * The two default axes are INDEPENDENT:
 *  - `defaultHarness`        — the agent RUNTIME ('pi' | 'claude-code').
 *  - `defaultModelProvider`  — the LLM HOST / vendor (open `ModelProviderId` set).
 *
 * This is the v1.2 successor to the legacy `GlobalProviderConfig`: it adds the orthogonal
 * `defaultModelProvider` field and re-keys `harnessDefaults` by `HarnessId` (the legacy
 * `providerDefaults` was keyed by the conflated `ProviderId`).
 *
 * @example
 * ```ts
 * const config: GlobalHarnessConfig = {
 *   defaultHarness: 'pi',                  // vendor-neutral default runtime
 *   defaultModelProvider: 'anthropic',     // LLM host — independent of harness
 *   harnessDefaults: {
 *     'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY },
 *   },
 * };
 * ```
 */
export interface GlobalHarnessConfig {
  /** Default agent runtime used when none is specified (PRD §7.6 / §7.7 cascade root). */
  defaultHarness: HarnessId;

  /** Optional per-harness default options, keyed by HarnessId (runtime axis). */
  harnessDefaults?: Partial<Record<HarnessId, HarnessOptions>>;

  /**
   * Default LLM provider used to resolve unqualified (plain) model strings (PRD §7.8).
   *
   * Open `ModelProviderId` set — independent of `defaultHarness`. When a caller passes a
   * plain model id like `'claude-sonnet-4-20250514'`, `parseModelSpec` resolves its
   * `provider` against this value.
   */
  defaultModelProvider?: ModelProviderId;
}

// ---------------------------------------------------------------------------
// Model-spec parsing contract (PRD §7.8)
// ---------------------------------------------------------------------------
//
// TYPE-ONLY AMBIENT DECLARATIONS.
//
// These `declare function`s declare the CANONICAL SIGNATURE of the model-spec
// helpers. They have NO body here and are ERASED at compile time — `harnesses.ts`
// remains a pure-types module (no runtime emission, per S1's contract).
//
// The RUNTIME IMPLEMENTATIONS live in `src/utils/model-spec.ts` (owned by
// P1.M1.T2.S1). P1.M1.T2.S1 imports `ModelSpec` / `ModelProviderId` from this
// file and implements both functions against the signatures below, with open-set
// validation (reject empty strings; reject harness-qualified 3-segment strings
// like `pi/anthropic/...`; no closed-union provider check).
//
// CONSUMER GUIDANCE:
//   - Need the TYPE / SIGNATURE?  → `import type { parseModelSpec } from './harnesses.js'`
//   - Need the RUNTIME VALUE?     → `import { parseModelSpec } from '../utils/model-spec.js'`
//   Importing the value from `./harnesses.js` and calling it is a RUNTIME ERROR
//   (the binding is erased). The public API (P3.M3.T1.S1) MUST re-export the
//   value from `utils/model-spec.ts`, not from here.
// ---------------------------------------------------------------------------

/**
 * Parse a model specification string into a {@link ModelSpec} (PRD §7.8).
 *
 * Accepts two formats:
 *  - Qualified: `"anthropic/claude-sonnet-4-20250514"` → `{ provider: 'anthropic', model: 'claude-sonnet-4-20250514', raw: … }`
 *  - Plain:     `"claude-sonnet-4-20250514"`           → resolved against `defaultProvider`.
 *
 * `provider` is the LLM host (`ModelProviderId`, open set) — NEVER the harness
 * (PRD §7.8 critical rule). Harness-qualified strings (`pi/anthropic/...`) are
 * invalid and rejected by the implementation (P1.M1.T2.S1).
 *
 * @param model - Model string (`"provider/model"` or plain model id).
 * @param defaultProvider - Provider used when `model` is unqualified (open set;
 *        implementation default is `'anthropic'`).
 * @returns Parsed {@link ModelSpec} (provider, model, raw).
 *
 * @remarks TYPE-ONLY ambient declaration — see file-level block comment.
 *          Runtime implementation: `src/utils/model-spec.ts` (P1.M1.T2.S1).
 */
export declare function parseModelSpec(
  model: string,
  defaultProvider?: ModelProviderId,
): ModelSpec;

/**
 * Format a {@link ModelSpec} for a specific target provider (PRD §7.8).
 *
 * Pass-through (returns `spec.model`) when `spec.provider === targetProvider`;
 * otherwise the implementation throws a cross-translation error (MVP behavior —
 * same-provider validation / API preparation is the primary use case).
 *
 * @param spec - {@link ModelSpec} from `parseModelSpec()` or `Harness.normalizeModel()`.
 * @param targetProvider - The LLM host to format the model for (open `ModelProviderId` set).
 * @returns Formatted model string (model name only, when providers match).
 *
 * @remarks TYPE-ONLY ambient declaration — see file-level block comment.
 *          Runtime implementation: `src/utils/model-spec.ts` (P1.M1.T2.S1).
 */
export declare function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ModelProviderId,
): string;
```

### Integration Points

```yaml
# NONE for this task — harnesses.ts remains a leaf type module with no runtime consumers
# until S3 wires re-exports. Downstream wiring (reference only — DO NOT implement here):
TYPES_BARREL: src/types/index.ts        # S3 adds: export type { GlobalHarnessConfig, parseModelSpec, formatModelForProvider } from './harnesses.js'
PUBLIC_API:    src/index.ts             # P3.M3.T1.S1 re-exports parseModelSpec/formatModelForProvider VALUES from utils/model-spec.js (NOT from harnesses.ts)
CONFIG_UTIL:   src/utils/harness-config.ts   # P1.M2.T2.S1 implements configureHarnesses(config: GlobalHarnessConfig) + getGlobalHarnessConfig + resolveHarnessConfig
MODEL_SPEC:    src/utils/model-spec.ts       # P1.M1.T2.S1 implements parseModelSpec/formatModelForProvider against these signatures (open-set validation)
CONSUMERS:     src/core/agent.ts, src/providers/*, src/harnesses/*   # rewired in P2/P3
```

---

## Validation Loop

> TypeScript / ESM project. The template's Python commands (ruff/mypy/pytest/uv) DO NOT APPLY.
> Use the project's real toolchain below.

### Level 1: Syntax & Type (Immediate Feedback)

```bash
# PRIMARY GATE — type-check the whole project (harnesses.ts is covered by `src/**/*`).
npm run lint          # == tsc --noEmit ; MUST exit 0

# Targeted sanity check that the appended declarations are valid ambient ESM TypeScript.
npx tsc --noEmit src/types/harnesses.ts   # bundler resolution; expect 0 errors
```

Expected: **Zero errors.** Likely failure causes to read for: (a) accidentally giving a
`declare function` a body (`{ … }`) — ambient declarations cannot have implementations;
(b) typo in `ModelProviderId` / `ModelSpec` / `HarnessId` / `HarnessOptions` (all same-file
S1 exports); (c) adding a stray `import` for a type already defined in this file.

### Level 2: Unit / Type Tests (Component Validation) — only if Task 2 is done

```bash
npm test -- src/__tests__/unit/harnesses-config-types.test.ts   # vitest run, targeted
```

Expected: All `expectTypeOf` / construction assertions pass. If Task 2 was skipped, this level
is N/A — the work item accepts `npm run lint` as the gate (mirrors S1's acceptance).

### Level 3: Integration (System Validation) — NOT YET POSSIBLE in S2

No consumer imports the new declarations until **S3** wires re-exports and **P1.M1.T2.S1**
implements the runtime. Therefore integration validation is intentionally deferred. Do NOT
attempt `import { parseModelSpec } from 'groundswell'` here — that path is built in S3, and
the VALUE must always come from `utils/model-spec.ts` (see Gotchas).

### Level 4: Domain-Specific Validation

```bash
# Confirm the three additions are present and exported.
grep -nE "export interface GlobalHarnessConfig" src/types/harnesses.ts        # expect 1 match
grep -nE "export declare function parseModelSpec" src/types/harnesses.ts      # expect 1 match
grep -nE "export declare function formatModelForProvider" src/types/harnesses.ts  # expect 1 match

# Confirm ModelSpec / ModelProviderId were NOT redefined (S1 owns them; S2 must not duplicate).
grep -ncE "export interface ModelSpec" src/types/harnesses.ts        # expect exactly 1 (S1's)
grep -ncE "export type ModelProviderId" src/types/harnesses.ts       # expect exactly 1 (S1's)

# Confirm configureHarnesses was NOT added (owned by P1.M2.T2.S1).
grep -nE "configureHarnesses" src/types/harnesses.ts && echo "FAIL: configureHarnesses leaked in" || echo "OK: configureHarnesses not in harnesses.ts"

# Confirm no NEW imports were added (S2 is same-file only).
grep -nE "^import" src/types/harnesses.ts                            # expect exactly S1's 3 import-type lines

# Confirm the declare functions have NO body (ambient — no `{` on the declaration line).
grep -nE "export declare function (parseModelSpec|formatModelForProvider)" src/types/harnesses.ts
# Each match must END with ';' (semicolon-terminated signature), not '{' (no body).
```

Expected: all match counts / `OK` outcomes exactly as annotated above.

---

## Final Validation Checklist

### Technical Validation
- [ ] `npm run lint` passes (zero `tsc --noEmit` errors) — verified green baseline before editing.
- [ ] `src/types/harnesses.ts` remains type-only: no new `import` (value) lines; declare functions erased.
- [ ] (If Task 2 done) targeted vitest type test passes.

### Feature Validation
- [ ] `GlobalHarnessConfig`, `parseModelSpec`, `formatModelForProvider` all exported from `harnesses.ts`.
- [ ] `GlobalHarnessConfig.defaultModelProvider` typed `ModelProviderId` (open set) — NOT `ProviderId`.
- [ ] `GlobalHarnessConfig.harnessDefaults` keyed by `HarnessId` (not `ModelProviderId`).
- [ ] `parseModelSpec` / `formatModelForProvider` signatures match PRD §7.8 verbatim (parameter names + types + return type).
- [ ] Both functions are `declare function` with semicolon-terminated signatures (no body).

### Code Quality & Boundary Validation
- [ ] JSDoc density matches `src/types/providers.ts` `GlobalProviderConfig` + S1's blocks; cross-references PRD §7.6 / §7.8.
- [ ] The `declare function` phantom-value trap is documented (file-level block comment + per-function `@remarks`).
- [ ] **Boundary respected:** NO edits to `types/index.ts`, `src/index.ts`, `utils/model-spec.ts`, `providers.ts`, or any runtime file.
- [ ] **Scope respected:** `ModelSpec` / `ModelProviderId` NOT redefined (S1 owns them). `configureHarnesses` NOT added (P1.M2.T2.S1). Function bodies NOT added (P1.M1.T2.S1). Re-exports NOT added (S3 / P3.M3.T1.S1). Deprecated aliases NOT added (P1.M1.T3).

### Documentation
- [ ] Inline JSDoc cross-references PRD section numbers (§7.6, §7.8, §7.7 cascade).
- [ ] The hand-off to P1.M1.T2.S1 (runtime impl) is documented on each declare function.

---

## Anti-Patterns to Avoid

- ❌ Don't give the `declare function`s bodies (`{ … }`) or default parameter values — ambient
  declarations are signatures only; defaults/bodies belong in the runtime impl (P1.M1.T2.S1).
- ❌ Don't redefine `ModelSpec` or `ModelProviderId` — S1 already ships both with the correct
  open-set `provider` axis. Importing/reusing them is the whole point of S1→S2 sequencing.
- ❌ Don't add `configureHarnesses` (even as a `declare function`) — it is a runtime util owned
  by P1.M2.T2.S1. S2 ships the `GlobalHarnessConfig` TYPE only.
- ❌ Don't wire re-exports in `types/index.ts` or `src/index.ts` "while you're here" — that is
  S3 / P3.M3.T1.S1's job and doing it here blurs boundaries and risks merge conflicts.
- ❌ Don't import `ModelSpec` / `ModelProviderId` from the legacy `./providers.js` — they are
  same-file S1 exports; adding a cross-file import would be both redundant and wrong-axis
  (`providers.ts` still has the closed `ProviderId`).
- ❌ Don't use bare `import` for any dependency — S2 adds NO imports at all (everything referenced
  is same-file from S1). Adding imports would violate the pure-types, no-new-deps contract.
- ❌ Don't key `harnessDefaults` by `ModelProviderId` — it is per-HARNESS options (`HarnessId`),
  reflecting the two-axis independence. `defaultModelProvider` is the separate provider-axis field.
- ❌ Don't write runtime code, consts, or classes. This remains a pure-types module.

---

## Hand-off Notes for Downstream Tasks

- **P1.M1.T2.S1 (open-set model-spec impl):** Implement `parseModelSpec` / `formatModelForProvider`
  in `src/utils/model-spec.ts` against the signatures declared here. Import `ModelSpec` +
  `ModelProviderId` from `'../types/harnesses.js'` (switch off the legacy `./providers.js`).
  Validation changes from closed-union (`isValidProviderId`) to non-empty-string check; reject
  harness-qualified 3-segment strings (`pi/anthropic/...`). Update `src/__tests__/unit/utils/model-spec.test.ts`
  for open-set semantics.
- **P1.M2.T2.S1 (harness config utils):** Implement `configureHarnesses(config: GlobalHarnessConfig)`,
  `getGlobalHarnessConfig()`, and `resolveHarnessConfig()` in `src/utils/harness-config.ts`. This
  task ships the `GlobalHarnessConfig` TYPE you consume.
- **S3 / P3.M3.T1.S1 (public API):** Re-export `GlobalHarnessConfig` from `types/index.ts` +
  `src/index.ts`. For `parseModelSpec` / `formatModelForProvider`, re-export the **values** from
  `utils/model-spec.ts` (NOT from `harnesses.ts` — that binding is erased). Re-export the
  **types** alongside if desired.
- **P2.M1 / P2.M2 (adapters):** `ClaudeCodeHarness.normalizeModel` / `PiHarness.normalizeModel`
  call `parseModelSpec(model, defaultProvider)` — import the value from `utils/model-spec.ts`.

---

**Confidence Score: 9/10** for one-pass implementation success.
Rationale: S1 is verified complete and green, so the target file and all referenced types
(`HarnessId`, `HarnessOptions`, `ModelProviderId`, `ModelSpec`) already exist and compile. The
three additions are mechanically specified (exact PRD §7.6 / §7.8 shapes), a complete compilable
reference is provided, and the only non-obvious decision — the `declare function` type-only
mechanism and its phantom-value trap — is documented exhaustively (Gotchas + file-level comment
+ per-function `@remarks` + Hand-off Notes). Residual risk is purely whether a downstream task
mistakenly imports the value from `harnesses.ts`; the prominent warnings mitigate that.
