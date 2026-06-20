# PRP — P3.M3.T1.S1: Export Harness surface + deprecated aliases in src/index.ts

**PRD reference:** §7 (Harness System — harness ⊥ provider/model), §7.2 (`HarnessId`), §7.3 (`Harness`
interface), §7.4 (`HarnessCapabilities`), §7.5 (`HarnessOptions`), §7.6 (`GlobalHarnessConfig` +
`configureHarnesses`), §7.8 (`ModelProviderId`, `ModelSpec`, `parseModelSpec`, `formatModelForProvider` —
"the harness never appears in the model string"), §7.10 (`HarnessRequest` / tool-exec types),
§7.11 (`HarnessHookEvents`), §16 (acceptance: public API exposes the harness system). **Plan:**
`plan/004_9a50e71828f4/` — S1 of P3.M3.T1 ("Update src/index.ts public exports"). **Consumes:** all
`Harness*` types from `src/types/harnesses.ts` (P1.M1.T1.S1/S2 — Complete), `ClaudeCodeHarness` +
`AnthropicProvider` from `src/harnesses/claude-code-harness.ts` (P2.M1.T1.S1 — Complete),
`PiHarness` from `src/harnesses/pi-harness.ts` (P2.M2./P2.M3.* — Complete), `HarnessRegistry` +
`ProviderRegistry` from `src/harnesses/harness-registry.ts` (P1.M2.T1.S2 — Complete),
`configureHarnesses` from `src/utils/harness-config.ts` (P1.M2.T2.S1 — Complete), and
`parseModelSpec`/`formatModelForProvider` RUNTIME impls from `src/utils/model-spec.ts` (P1.M1.T2.S1 —
Complete). **Produces:** a public API (`src/index.ts`) that exposes the full harness type surface, the
three concrete harness classes (`PiHarness`, `ClaudeCodeHarness`, `HarnessRegistry`), and the
harness/model-spec configuration entry points — while keeping every legacy `Provider*` type +
`AnthropicProvider`/`ProviderRegistry` class as intact (deprecated) aliases. **Unblocks:** P4.M1
(OpenCode removal) — external consumers can now migrate to the harness surface before opencode is deleted.
**Scope tag:** (a) **MODIFY `src/types/index.ts`** — add a `// Harness types` re-export block from
`./harnesses.js` and MOVE `ModelSpec` out of the `// Provider types` block into it (the single
load-bearing dedup — see Gotcha #1); (b) **MODIFY `src/index.ts`** — add a `// Harness types` comment
section (in the existing big `export type {}` block) + export `PiHarness` from
`./harnesses/pi-harness.js`, `configureHarnesses` from `./utils/harness-config.js`, and
`parseModelSpec`/`formatModelForProvider` from `./utils/model-spec.js`; (c) **CREATE**
`src/__tests__/unit/harness-public-api.test.ts` mirroring the canonical
`src/__tests__/unit/agent-response-public-api.test.ts`. **DO NOT touch** `src/types/harnesses.ts`,
`src/types/providers.ts`, any `src/harnesses/*.ts` source, `src/utils/*.ts` source, `src/core/agent.ts`,
or the legacy `Provider*`/`AnthropicProvider`/`ProviderRegistry` exports (kept as deprecated aliases).

> **READ "THE MODELSPEC DEDUP GOTCHA" + "SCOPE DECISIONS" BEFORE WRITING CODE.** This is a barrel-edit
> task, but it has ONE non-obvious trap: `ModelSpec` is canonically defined in `harnesses.ts` and merely
> re-exported (aliased) from `providers.ts`. Re-exporting `ModelSpec` from BOTH `./providers.js` AND
> `./harnesses.js` inside the same barrel (`src/types/index.ts`) is a hard `tsc` duplicate-export error.
> The fix is to MOVE `ModelSpec` (one entry) from the provider block to the new harness block — not
> duplicate it. No consumer breaks because the type identity is unchanged.

---

## Goal

**Feature Goal:** Make `src/index.ts` (the public API entry point) expose the complete PRD §7 **harness**
surface so external consumers can adopt the v1.2 harness vocabulary directly — the nine harness types
(`Harness`, `HarnessId`, `ModelProviderId`, `HarnessCapabilities`, `HarnessOptions`, `HarnessRequest`,
`HarnessHookEvents`, `GlobalHarnessConfig`, `ModelSpec`), the three concrete harness classes
(`PiHarness`, `ClaudeCodeHarness`, `HarnessRegistry`), and the harness/model-spec configuration entry
points (`configureHarnesses`, `parseModelSpec`, `formatModelForProvider`) — while every legacy
`Provider*` type and the `AnthropicProvider`/`ProviderRegistry` class aliases remain exported and
unchanged for backward compatibility. This realises PRD §16's acceptance criterion ("public API exposes
the harness system") and unblocks the P4.M1 OpenCode removal by giving consumers a forward migration path.

**Deliverable:**
1. **MODIFY `src/types/index.ts`** (the TYPE barrel that feeds `src/index.ts`):
   - **REMOVE** `ModelSpec,` from the `// Provider types` re-export block (currently sourced from
     `./providers.js`, where it is only an alias of the harnesses.ts original).
   - **ADD** a new `// Harness types (PRD §7.2–§7.8)` re-export block sourcing from `./harnesses.js`:
     `Harness, HarnessId, ModelProviderId, HarnessCapabilities, HarnessOptions, HarnessRequest,
     HarnessHookEvents, GlobalHarnessConfig, ModelSpec` (9 names — `ModelSpec` appears here ONCE).
   - PRESERVE every other re-export byte-for-byte (the entire `// Provider types` block except the moved
     `ModelSpec`, the `// Provider classes` ClaudeCodeHarness/AnthropicProvider line, all other blocks).
2. **MODIFY `src/index.ts`** (the PUBLIC API barrel):
   - In the existing big `export type { ... } from './types/index.js'` block (lines 2–76), add a
     `// Harness types (PRD §7.2–§7.8)` comment section listing `Harness, HarnessId, ModelProviderId,
     HarnessCapabilities, HarnessOptions, HarnessRequest, HarnessHookEvents, GlobalHarnessConfig,
     ModelSpec`, and MOVE the existing `ModelSpec,` entry out of the `// Provider types` section into it
     (single source of truth, no duplicate name in the block).
   - **ADD** `export { PiHarness } from './harnesses/pi-harness.js';` alongside the existing
     `ClaudeCodeHarness`/`HarnessRegistry` class exports (lines 117–118).
   - **ADD** a new `// Harness configuration & model-spec utilities (PRD §7.6 / §7.8)` export block:
     `export { configureHarnesses } from './utils/harness-config.js';` and
     `export { parseModelSpec, formatModelForProvider } from './utils/model-spec.js';`.
   - PRESERVE the existing `Provider*` type exports, `AnthropicProvider`/`ProviderRegistry` class
     exports, and ALL other exports unchanged (they are the deprecated backward-compat aliases).
3. **CREATE `src/__tests__/unit/harness-public-api.test.ts`** — mirror
   `src/__tests__/unit/agent-response-public-api.test.ts`: import the new harness surface from
   `../../index.js` and assert (via runtime `expect()` + type-annotated literals) that every harness
   type, the three classes, and the three functions are reachable from the public API, AND that the
   legacy `Provider*`/`AnthropicProvider`/`ProviderRegistry` aliases are still exported (backward-compat guard).

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`, covers `src/**/*` excluding `src/__tests__`) exits **0** — proves no
   duplicate-export / unresolved-symbol errors were introduced by the barrel edits.
2. `npm run build` (`tsc`) exits **0** — `dist/index.{js,d.ts}` + `dist/types/index.{js,d.ts}` emit
   cleanly with the harness surface present.
3. `npm test` (`vitest run`) exits **0** — the NEW `harness-public-api.test.ts` passes AND the entire
   existing suite stays green (notably any test that imports from `../../index.js` and the provider-
   switching / override suites that rely on the legacy aliases).
4. **Contract grep checks** (all must pass):
   - `grep -n "Harness types" src/types/index.ts` → **1 hit** (new block).
   - `grep -c "ModelSpec" src/types/index.ts` → **1** (moved, NOT duplicated — was 1, still 1).
   - `grep -n "from './harnesses.js'" src/types/index.ts` → **≥ 1 hit** (the new harness block).
   - `grep -n "PiHarness" src/index.ts` → **1 hit** (new class export).
   - `grep -n "configureHarnesses" src/index.ts` → **1 hit** (new function export).
   - `grep -n "parseModelSpec\|formatModelForProvider" src/index.ts` → **1 hit each**.
   - `grep -n "AnthropicProvider\|ProviderRegistry" src/index.ts` → **still present** (aliases intact).
   - `grep -c "ModelSpec" src/index.ts` → **1** (single entry in the big types block).
5. **No scope leak** — `src/types/harnesses.ts`, `src/types/providers.ts`, `src/harnesses/*.ts`,
   `src/utils/*.ts`, `src/core/agent.ts` byte-identical to HEAD.

---

## Why

- **Completes the public migration surface.** Every harness type/class/function has existed and been
  wired into the runtime since P1/P2/early-P3, but none of the harness surface was lifted into the
  public entry point (`src/index.ts`). External consumers importing from `groundswell` still see only
  the legacy `Provider*`/`AnthropicProvider`/`ProviderRegistry` vocabulary and have no forward path.
  This item opens the harness surface to public consumers, realising PRD §16's acceptance criterion.
- **Unblocks P4.M1 (OpenCode removal).** Once the harness surface is public, downstream code can migrate
  off `Provider*` naming and the `'opencode'` literal before P4.M1.T1.S1 deletes `OpenCodeProvider`.
- **Zero runtime risk.** The change is purely to re-export barrels (`src/index.ts`, `src/types/index.ts`)
  + an additive test. No runtime logic, no type signatures, no behavior changes — only which symbols are
  reachable from the package entry point. The single subtlety (`ModelSpec` dedup) is mechanical.

## What

User-visible behavior: **none at runtime**. The package's public type/value surface grows by the harness
vocabulary; the legacy vocabulary remains. Developers can now `import { PiHarness, configureHarnesses,
parseModelSpec, type Harness, type HarnessId } from 'groundswell';`.

### Success Criteria

- [ ] `src/types/index.ts` has a `// Harness types` block re-exporting the 9 harness types from
      `./harnesses.js`; `ModelSpec` appears exactly ONCE (moved out of the provider block).
- [ ] `src/index.ts` exposes the 9 harness types (via the existing `./types/index.js` block), the
      `PiHarness` class, and `configureHarnesses` / `parseModelSpec` / `formatModelForProvider`.
- [ ] Legacy `Provider*` types + `AnthropicProvider` + `ProviderRegistry` remain exported (untouched).
- [ ] `src/__tests__/unit/harness-public-api.test.ts` asserts the new surface + backward-compat aliases.
- [ ] `npm run lint`, `npm run build`, `npm test` all exit 0; existing suite stays green.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes** — this PRP gives: the exact two target files + their current line structure, the
verbatim blocks to add, the single dedup move (`ModelSpec`), the pattern files to mirror, the verified
validation commands, and the explicit out-of-scope list. The only judgment call (why `ModelSpec` must be
moved, not duplicated) is resolved in **The ModelSpec Dedup Gotcha**.

### Documentation & References

```yaml
# MUST READ — include these in your context window
- url: plan/004_9a50e71828f4/prd_snapshot.md
  why: "PRD §7.2 (HarnessId), §7.3 (Harness), §7.4 (HarnessCapabilities), §7.5 (HarnessOptions), §7.6 (GlobalHarnessConfig + configureHarnesses), §7.8 (ModelProviderId, ModelSpec, parseModelSpec, formatModelForProvider — harness NEVER in model string), §7.10/§7.11 (HarnessRequest, HarnessHookEvents), §16 (public API exposes harness system)."
  critical: "§7.8 critical rule: the harness is never part of the model string. §7.6 shows configureHarnesses as the public configuration entry. The 9-type harness list in the item maps 1:1 to PRD §7.2–§7.8."

- file: src/index.ts
  why: "PUBLIC API barrel — THE primary edit target. Lines 1–76 = one big `export type {} from './types/index.js'` block (has a `// Provider types` section incl. ModelSpec). Lines 117–118 = class exports (ClaudeCodeHarness/AnthropicProvider + HarnessRegistry/ProviderRegistry, ALREADY present). Add: harness-type section + ModelSpec move + PiHarness + configureHarnesses + parseModelSpec/formatModelForProvider."
  pattern: "Existing sections use `// <Domain> types` comment headers inside the single export-type block. Class exports use `export { Name } from './path/file.js';` one per line. Mirror exactly."
  gotcha: "Do NOT add a SECOND `export type {} from './types/index.js'` block — fold the harness types INTO the existing block (a second block re-exporting the same source is legal in TS but breaks the file's convention). ModelSpec must appear ONCE."

- file: src/types/index.ts
  why: "TYPE barrel — the SECOND edit target (must be edited for src/index.ts to compile). Currently has NO harness types. `// Provider types` block (from './providers.js') INCLUDES `ModelSpec` at L41 — MUST be removed from here."
  pattern: "Mirror the existing `export type { ... } from './providers.js';` block style for the new `from './harnesses.js';` block."
  gotcha: "ModelSpec, ToolExecutionRequest, ToolExecutionResult are ALL defined in harnesses.ts and only ALIASED by providers.ts (providers.ts L23–25 imports them, L103/L108 re-exports). Re-exporting ModelSpec from BOTH barrels in THIS file = TS2308 duplicate-export error. MOVE ModelSpec (item lists it in the harness block). ToolExecutionRequest/ToolExecutionResult are NOT in the item's harness list — LEAVE them in the provider block (no dedup needed)."

- file: src/types/harnesses.ts
  why: "CANONICAL source of all 9 harness types to re-export. Confirms exact export names: HarnessId, ModelProviderId, HarnessCapabilities, HarnessOptions, HarnessHookEvents, ToolExecutionRequest, ToolExecutionResult, HarnessExecutionOptions, HarnessRequest, ModelSpec, Harness, GlobalHarnessConfig."
  pattern: "READ-ONLY — do not edit. Just confirms the names + that `parseModelSpec`/`formatModelForProvider` here are TYPE-ONLY `declare function`s (erased at compile) — the RUNTIME impls live in src/utils/model-spec.ts. Re-export the VALUE from utils/model-spec.ts, NOT from here."
  gotcha: "Lines 492–496 explicit consumer guidance: importing parseModelSpec as a VALUE from './harnesses.js' is a RUNTIME ERROR (binding erased). Public API MUST source it from '../utils/model-spec.js'."

- file: src/types/providers.ts
  why: "Confirms providers.ts is now an ALIAS SHIM (P1.M1.T3.S1). L23–25 import ModelSpec/ToolExecutionRequest/ToolExecutionResult from './harnesses.js'; L103/L108 re-export them. This is WHY moving ModelSpec in types/index.ts is safe — same type identity either way."
  pattern: "READ-ONLY — do not edit. Confirms the legacy Provider* types already carry @deprecated JSDoc at their source, so the barrels need no JSDoc edits."

- file: src/harnesses/pi-harness.ts
  why: "Source of `PiHarness` (class at L78: `export class PiHarness implements Harness`). Confirms the export name + that it's NOT in src/harnesses/index.ts barrel — so src/index.ts imports it DIRECTLY from the source file (precedent: ClaudeCodeHarness imported from './harnesses/claude-code-harness.js')."
  pattern: "READ-ONLY. Import path for the new public export: './harnesses/pi-harness.js'."

- file: src/utils/harness-config.ts
  why: "Source of `configureHarnesses` (exported function, PRD §7.6). Confirms the export name + signature. getGlobalHarnessConfig/resolveHarnessConfig/resetGlobalHarnessConfig are ALSO exported here but are NOT in this item's scope (consumed internally by src/core/agent.ts)."
  pattern: "READ-ONLY. Import path: './utils/harness-config.js'."

- file: src/utils/model-spec.ts
  why: "Source of the RUNTIME `parseModelSpec` + `formatModelForProvider` (P1.M1.T2.S1 implementations). These are the VALUES to re-export — NOT the type-only `declare` versions in harnesses.ts."
  pattern: "READ-ONLY. Import path: './utils/model-spec.js'."

- file: src/__tests__/unit/agent-response-public-api.test.ts
  why: "THE canonical public-API export test pattern. Imports from '../../index.js'; vitest describe/it/expect; asserts each exported type via a type-annotated object literal + a runtime expect() on a value; asserts each exported value/function is defined + callable."
  pattern: "Mirror its structure exactly for harness-public-api.test.ts: import type {...} + import {...} from '../../index.js'; describe('Harness Public API Exports') with sub-describes for Types / Classes / Functions / Backward-compat aliases."

- file: src/utils/index.ts
  why: "Confirms configureHarnesses/parseModelSpec/formatModelForProvider are ALREADY re-exported from the INTERNAL utils barrel — so lifting them to src/index.ts is consistent with how the codebase already surfaces utils (just one more level up)."
  pattern: "READ-ONLY reference."
```

### Current Codebase tree (relevant slice)

```bash
src/
├── index.ts                              # EDIT — public API barrel (add harness types section, PiHarness, configureHarnesses, parseModelSpec/formatModelForProvider)
├── types/
│   ├── index.ts                          # EDIT — type barrel (add // Harness types block; MOVE ModelSpec out of provider block)
│   ├── harnesses.ts                      # READ — canonical source of all 9 harness types (do NOT edit)
│   └── providers.ts                      # READ — alias shim; confirms ModelSpec identity is shared (do NOT edit)
├── harnesses/
│   ├── pi-harness.ts                     # READ — source of PiHarness class export
│   ├── claude-code-harness.ts            # READ — ClaudeCodeHarness + AnthropicProvider alias (already exported)
│   ├── harness-registry.ts               # READ — HarnessRegistry + ProviderRegistry alias (already exported)
│   └── index.ts                          # READ — internal barrel (PiHarness NOT here; import from source)
├── utils/
│   ├── harness-config.ts                 # READ — source of configureHarnesses
│   ├── model-spec.ts                     # READ — source of runtime parseModelSpec/formatModelForProvider
│   └── index.ts                          # READ — internal barrel (already re-exports these)
└── __tests__/unit/
    ├── agent-response-public-api.test.ts # READ — the public-API test pattern to mirror
    └── harness-public-api.test.ts        # CREATE — new harness public-API + backward-compat test (THIS task)
plan/004_9a50e71828f4/
└── P3M3T1S1/
    ├── PRP.md                             # THIS FILE
    └── research/findings.md
```

### Desired Codebase tree with files added/modified

```bash
src/types/index.ts                              # MODIFY — add // Harness types block (from ./harnesses.js);
                                                #          MOVE ModelSpec from // Provider types → // Harness types
src/index.ts                                    # MODIFY — add // Harness types section in the big export-type block
                                                #          (+ move ModelSpec entry); ADD PiHarness class export;
                                                #          ADD configureHarnesses + parseModelSpec/formatModelForProvider
src/__tests__/unit/harness-public-api.test.ts   # CREATE — harness public-API surface + backward-compat alias test
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — THE MODELSPEC DEDUP. ModelSpec is DEFINED in src/types/harnesses.ts and only ALIASED
//   (re-exported) by src/types/providers.ts (providers.ts L23 import, L103 `export type { ModelSpec };`).
//   If src/types/index.ts re-exports ModelSpec from BOTH './providers.js' AND './harnesses.js', tsc errors:
//   TS2308 "Module './harnesses.js' has already exported a member named 'ModelSpec'" (duplicate export).
//   FIX: in src/types/index.ts REMOVE ModelSpec from the // Provider types block and place it (ONCE) in
//   the new // Harness types block. Same type identity → zero consumer impact.
//   (ToolExecutionRequest/ToolExecutionResult are ALSO aliased by providers.ts but are NOT in the item's
//   harness-types list — LEAVE them in the provider block; no dedup needed for them.)

// CRITICAL #2 — parseModelSpec/formatModelForProvider have TWO homes. In src/types/harnesses.ts they are
//   TYPE-ONLY `export declare function` (ERASED at compile — calling them is a runtime error; see
//   harnesses.ts L492–496). The RUNTIME implementations are in src/utils/model-spec.ts (P1.M1.T2.S1).
//   The public API MUST re-export the VALUES from './utils/model-spec.js', NOT from './types/harnesses.js'.
//   Re-exporting the type-only version would compile but throw at call time.

// CRITICAL #3 — src/index.ts uses ONE big `export type { ... } from './types/index.js'` block (L2–76).
//   Do NOT create a second `export type {} from './types/index.js'` block. FOLD the new harness type
//   names INTO the existing block under a new `// Harness types (PRD §7.2–§7.8)` comment header, and
//   MOVE the existing `ModelSpec,` line from the `// Provider types` section into the new section.
//   (A second block is technically legal TS but violates the file's single-block convention and risks
//   a duplicate `ModelSpec` entry if not careful.)

// CRITICAL #4 — PiHarness is NOT in src/harnesses/index.ts barrel. Import it DIRECTLY from its source
//   file: `export { PiHarness } from './harnesses/pi-harness.js';` — exactly as ClaudeCodeHarness is
//   imported directly from './harnesses/claude-code-harness.js' (src/index.ts L117). Do NOT first add it
//   to the harnesses barrel (out of scope; not required).

// CRITICAL #5 — tsconfig "exclude": ["src/__tests__"]. tsc (lint + build) does NOT type-check the test
//   dir; vitest's esbuild strips types without checking. So the new test MUST use runtime expect()
//   assertions on values (mirror agent-response-public-api.test.ts). Type annotations on object literals
//   document intent and ARE checked indirectly when src/index.ts itself compiles (it's in the lint set),
//   so a broken export would still fail `npm run lint` via the barrel.

// CRITICAL #6 — DO NOT add getGlobalHarnessConfig / resolveHarnessConfig / resetGlobalHarnessConfig to
//   the public API. They are consumed internally by src/core/agent.ts; the item lists ONLY configureHarnesses.
//   Adding them is scope creep. Same for configureProviders (legacy alias) — it was NEVER in src/index.ts;
//   do not add it.

// CRITICAL #7 — DO NOT remove or alter any legacy Provider* type export or the AnthropicProvider /
//   ProviderRegistry class exports. They are the backward-compat aliases the item explicitly requires to
//   remain ("Keep the existing Provider*/AnthropicProvider/ProviderRegistry exports"). The @deprecated
//   JSDoc lives on the source types in providers.ts (P1.M1.T3.S1) — barrels carry no JSDoc, so no edit.
```

## Implementation Blueprint

### Data models and structure

No data models change. This task only re-exports already-defined types/values from the package entry
point. No new types, no new classes, no new functions. This section is intentionally empty — see
**Implementation Patterns** for the verbatim barrel edits.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/index.ts — add Harness types block + dedup ModelSpec
  - SCOPE: edit ONLY the type re-export blocks. Do NOT touch source type files.
  - STEP 1: REMOVE the single line `ModelSpec,` from the `// Provider types` block
            (the `export type { ... } from './providers.js';` block, currently L41).
            Leave ToolExecutionRequest / ToolExecutionResult / ToolExecutor in that block untouched.
  - STEP 2: ADD a new block IMMEDIATELY AFTER the `// Provider types` block (or directly before it —
            placement is cosmetic; recommended: right after the provider block for narrative flow):
              // Harness types (PRD §7.2–§7.8) — canonical in types/harnesses.ts
              export type {
                Harness,
                HarnessId,
                ModelProviderId,
                HarnessCapabilities,
                HarnessOptions,
                HarnessRequest,
                HarnessHookEvents,
                GlobalHarnessConfig,
                ModelSpec,
              } from './harnesses.js';
  - FOLLOW pattern: the existing `export type { ... } from './providers.js';` block (alphabetical-ish,
            one name per line, trailing comma). Match it.
  - NAMING: the 9 names exactly as exported by harnesses.ts (see harnesses.ts grep).
  - PRESERVE: every other block in src/types/index.ts byte-for-byte.
  - VERIFY after edit: `grep -c "ModelSpec" src/types/index.ts` → must be 1 (not 2).

Task 2: MODIFY src/index.ts — surface harness types + PiHarness + config/model-spec functions
  - SCOPE: the big `export type {} from './types/index.js'` block (L2–76) + class/function export lines.
  - STEP 1: In the big export-type block, ADD a new comment section and move ModelSpec:
            - REMOVE `ModelSpec,` from the `// Provider types` section (currently ~L50 in that block).
            - ADD a new section inside the SAME block:
                // Harness types (PRD §7.2–§7.8)
                Harness,
                HarnessId,
                ModelProviderId,
                HarnessCapabilities,
                HarnessOptions,
                HarnessRequest,
                HarnessHookEvents,
                GlobalHarnessConfig,
                ModelSpec,
              (ModelSpec now listed once, under the harness section.)
  - STEP 2: ADD the PiHarness class export. Place it adjacent to the existing harness class exports
            (L117–118). Recommended:
                export { PiHarness } from './harnesses/pi-harness.js';
            (Keep the existing ClaudeCodeHarness/AnthropicProvider + HarnessRegistry/ProviderRegistry
            lines exactly as-is — they are the deprecated aliases that must remain.)
  - STEP 3: ADD the harness configuration + model-spec function exports. Place near the existing
            utility exports (e.g., after the `// Utilities` block or alongside the class exports —
            pick the most natural spot; recommended: a dedicated block right after the class exports):
                // Harness configuration & model-spec utilities (PRD §7.6 / §7.8)
                export { configureHarnesses } from './utils/harness-config.js';
                export { parseModelSpec, formatModelForProvider } from './utils/model-spec.js';
  - FOLLOW pattern: existing `export { Name } from './path/file.js';` one-per-line style (L117–118, L144–147).
  - NAMING: PiHarness, configureHarnesses, parseModelSpec, formatModelForProvider — exactly as exported
            by their source files.
  - PRESERVE: ALL legacy Provider* type entries (minus the moved ModelSpec), AnthropicProvider,
            ProviderRegistry, and every other existing export.
  - VERIFY after edit:
      grep -c "ModelSpec" src/index.ts   → 1
      grep -n "PiHarness\|configureHarnesses\|parseModelSpec\|formatModelForProvider" src/index.ts → 1 each.

Task 3: CREATE src/__tests__/unit/harness-public-api.test.ts
  - IMPLEMENT: vitest describe/it/expect asserting the harness public surface + backward compat.
            Mirror src/__tests__/unit/agent-response-public-api.test.ts (imports from '../../index.js').
  - ASSERT (each MUST have a runtime expect()):
      (a) TYPES reachable from public API — type-annotated object literals + runtime expect() on a value:
            HarnessId ('pi' | 'claude-code'), ModelProviderId ('anthropic' etc.), HarnessCapabilities
            (full 6-flag shape), HarnessOptions (endpoint/apiKey/sessionId/timeout/headers),
            HarnessRequest ({ prompt, options }), HarnessHookEvents (5 callbacks), GlobalHarnessConfig
            ({ defaultHarness, harnessDefaults?, defaultModelProvider? }), ModelSpec
            ({ provider, model, raw }), Harness (referenced via PiHarness implements Harness — or just
            assert the type annotates an object literal).
      (b) CLASSES: `import { PiHarness, ClaudeCodeHarness, HarnessRegistry } from '../../index.js';`
            → expect them all to be defined (typeof === 'function'); instantiate HarnessRegistry
            (`new HarnessRegistry()`) and assert it has expected methods (get/getInstance/register per
            harness-registry.ts); confirm AnthropicProvider === ClaudeCodeHarness (alias) and
            ProviderRegistry === HarnessRegistry (alias) are still exported (backward compat).
      (c) FUNCTIONS: `import { configureHarnesses, parseModelSpec, formatModelForProvider } from '../../index.js';`
            → expect all typeof === 'function'; call parseModelSpec('anthropic/claude-sonnet-4') and
            assert the returned ModelSpec ({ provider:'anthropic', model:'claude-sonnet-4', raw });
            call formatModelForProvider(spec, 'anthropic') and assert pass-through; call
            configureHarnesses({ defaultHarness:'pi' }) and assert no throw.
      (d) BACKWARD-COMPAT aliases: `import type { Provider, ProviderId, GlobalProviderConfig } from '../../index.js'`
            still type-check; `import { AnthropicProvider, ProviderRegistry } from '../../index.js'`
            still resolve. (Runtime expect: AnthropicProvider === ClaudeCodeHarness.)
  - FOLLOW pattern: src/__tests__/unit/agent-response-public-api.test.ts (imports from '../../index.js';
            describe/it/expect; runtime assertions; type-annotated literals).
  - NAMING: file = harness-public-api.test.ts; top describe = 'Harness Public API Exports'.
  - COVERAGE: all 9 harness types + 3 classes + 3 functions + the legacy aliases.
  - PLACEMENT: src/__tests__/unit/harness-public-api.test.ts.
  - DO NOT: instantiate PiHarness/ClaudeCodeHarness fully (they need SDK clients / initialize() — heavy);
            only assert they are exported (typeof === 'function') and (for HarnessRegistry) cheaply
            constructible. Do NOT use @ts-expect-error as a load-bearing assertion (tsc excludes __tests__).

Task 4: VALIDATE (no code change — run the gates)
  - RUN: npm run lint && npm run build && npm test
  - RUN: the contract greps in "Success Definition #4".
  - EXPECT: all exit 0; grep counts/locations match.
```

### Implementation Patterns & Key Details

**Task 1 — `src/types/index.ts` new Harness types block (verbatim):**

```ts
// Harness types (PRD §7.2–§7.8) — canonical in types/harnesses.ts
export type {
  Harness,
  HarnessId,
  ModelProviderId,
  HarnessCapabilities,
  HarnessOptions,
  HarnessRequest,
  HarnessHookEvents,
  GlobalHarnessConfig,
  ModelSpec,
} from './harnesses.js';
```
> And in the existing `// Provider types` block, **remove** the single `ModelSpec,` line (keep
> `ToolExecutionRequest,`, `ToolExecutionResult,`, `ToolExecutor,`).

**Task 2 — `src/index.ts` additions (verbatim):**

Inside the existing big `export type { ... } from './types/index.js';` block — remove `ModelSpec,` from
the `// Provider types` section and add a new section:
```ts
  // Harness types (PRD §7.2–§7.8)
  Harness,
  HarnessId,
  ModelProviderId,
  HarnessCapabilities,
  HarnessOptions,
  HarnessRequest,
  HarnessHookEvents,
  GlobalHarnessConfig,
  ModelSpec,
```

New class + function exports (place after the existing `HarnessRegistry, ProviderRegistry` line, ~L118):
```ts
// Harness adapters (PRD §7.3) — PiHarness joins the already-exported ClaudeCodeHarness/HarnessRegistry
export { PiHarness } from './harnesses/pi-harness.js';

// Harness configuration & model-spec utilities (PRD §7.6 / §7.8)
export { configureHarnesses } from './utils/harness-config.js';
export { parseModelSpec, formatModelForProvider } from './utils/model-spec.js';
```

**Task 3 — `harness-public-api.test.ts` skeleton (mirror agent-response-public-api.test.ts):**

```ts
/**
 * Test file: harness-public-api.test.ts
 *
 * Purpose: Verify the PRD §7 harness surface is exported from the public API (src/index.ts)
 * AND that the legacy Provider*/AnthropicProvider/ProviderRegistry aliases remain (backward compat).
 *
 * PRP: P3.M3.T1.S1 - Export Harness surface + deprecated aliases in src/index.ts
 */
import { describe, it, expect } from 'vitest';
// Import from MAIN INDEX (public API entry point)
import type {
  Harness,
  HarnessId,
  ModelProviderId,
  HarnessCapabilities,
  HarnessOptions,
  HarnessRequest,
  HarnessHookEvents,
  GlobalHarnessConfig,
  ModelSpec,
  // Legacy aliases (backward compat)
  Provider,
  ProviderId,
  GlobalProviderConfig,
} from '../../index.js';
import {
  PiHarness,
  ClaudeCodeHarness,
  AnthropicProvider,
  HarnessRegistry,
  ProviderRegistry,
  configureHarnesses,
  parseModelSpec,
  formatModelForProvider,
} from '../../index.js';

describe('Harness Public API Exports', () => {
  describe('Harness types (PRD §7.2–§7.8)', () => {
    it('exports HarnessId ("pi" | "claude-code")', () => {
      const ids: HarnessId[] = ['pi', 'claude-code'];
      expect(ids).toEqual(['pi', 'claude-code']);
    });
    it('exports ModelProviderId (open set incl. anthropic/openai)', () => {
      const p: ModelProviderId = 'anthropic';
      expect(p).toBe('anthropic');
    });
    it('exports HarnessCapabilities shape', () => {
      const caps: HarnessCapabilities = {
        mcp: true, skills: true, lsp: true, streaming: true, sessions: true, extendedThinking: false,
      };
      expect(caps.mcp).toBe(true);
      expect(caps.extendedThinking).toBe(false);
    });
    it('exports HarnessOptions shape', () => {
      const opts: HarnessOptions = { endpoint: 'https://x', apiKey: 'k', sessionId: 's', timeout: 1, headers: {} };
      expect(opts.endpoint).toBe('https://x');
    });
    it('exports HarnessRequest shape', () => {
      const req: HarnessRequest = { prompt: 'hi', options: {} };
      expect(req.prompt).toBe('hi');
    });
    it('exports HarnessHookEvents shape', () => {
      const hooks: HarnessHookEvents = { onStream: () => {} };
      expect(typeof hooks.onStream).toBe('function');
    });
    it('exports GlobalHarnessConfig shape', () => {
      const cfg: GlobalHarnessConfig = { defaultHarness: 'pi', defaultModelProvider: 'anthropic' };
      expect(cfg.defaultHarness).toBe('pi');
    });
    it('exports ModelSpec shape', () => {
      const spec: ModelSpec = { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'anthropic/claude-sonnet-4' };
      expect(spec.provider).toBe('anthropic');
    });
  });

  describe('Harness classes (PRD §7.3)', () => {
    it('exports PiHarness', () => {
      expect(typeof PiHarness).toBe('function');
    });
    it('exports ClaudeCodeHarness', () => {
      expect(typeof ClaudeCodeHarness).toBe('function');
    });
    it('exports HarnessRegistry and it is constructible', () => {
      expect(typeof HarnessRegistry).toBe('function');
      const reg = new HarnessRegistry();
      expect(reg).toBeInstanceOf(HarnessRegistry);
    });
  });

  describe('Harness configuration & model-spec functions (PRD §7.6 / §7.8)', () => {
    it('exports configureHarnesses (callable, accepts valid config)', () => {
      expect(typeof configureHarnesses).toBe('function');
      expect(() => configureHarnesses({ defaultHarness: 'pi' })).not.toThrow();
    });
    it('exports parseModelSpec (parses qualified model)', () => {
      expect(typeof parseModelSpec).toBe('function');
      const spec = parseModelSpec('anthropic/claude-sonnet-4-20250514');
      expect(spec.provider).toBe('anthropic');
      expect(spec.model).toBe('claude-sonnet-4-20250514');
      expect(spec.raw).toBe('anthropic/claude-sonnet-4-20250514');
    });
    it('exports formatModelForProvider (same-provider pass-through)', () => {
      expect(typeof formatModelForProvider).toBe('function');
      const spec = parseModelSpec('anthropic/claude-sonnet-4-20250514');
      expect(formatModelForProvider(spec, 'anthropic')).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('Backward compatibility (deprecated aliases retained)', () => {
    it('still exports AnthropicProvider === ClaudeCodeHarness', () => {
      expect(AnthropicProvider).toBe(ClaudeCodeHarness);
    });
    it('still exports ProviderRegistry === HarnessRegistry', () => {
      expect(ProviderRegistry).toBe(HarnessRegistry);
    });
    it('still exports legacy Provider* types (compile-time reachability)', () => {
      const pid: ProviderId = 'anthropic' as ProviderId;
      expect(pid).toBe('anthropic');
      const gpc: GlobalProviderConfig = { defaultProvider: 'anthropic' } as GlobalProviderConfig;
      expect(gpc.defaultProvider).toBe('anthropic');
    });
  });
});
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (no runtime config touched — configureHarnesses is merely re-exported, not called)
ROUTES: none
PUBLIC API:
  - src/index.ts: + 9 harness types (via ./types/index.js), + PiHarness, + configureHarnesses,
    + parseModelSpec/formatModelForProvider. Legacy Provider*/AnthropicProvider/ProviderRegistry retained.
  - src/types/index.ts: + // Harness types block (from ./harnesses.js); ModelSpec MOVED (provider → harness block).
IMPORTS: no new runtime imports in source — src/index.ts gains re-export lines only.
RUNTIME: none. src/core/agent.ts is NOT touched; it already consumes the harness path (P3.M1.* — Complete).
```

## ⚠️ THE MODELSPEC DEDUP GOTCHA — the single load-bearing detail

`ModelSpec` is **defined** in `src/types/harnesses.ts` (L229) and only **aliased** by
`src/types/providers.ts` (L23 import from `./harnesses.js`, L103 `export type { ModelSpec };`). The same
identity, two re-export paths. The current `src/types/index.ts` exposes `ModelSpec` via the provider path
(`from './providers.js'`). The item requires a new `// Harness types` block that ALSO lists `ModelSpec`
(sourced from `./harnesses.js`). Naïvely adding that block while leaving the provider entry in place
produces:

```
src/types/index.ts: error TS2308: Module './harnesses.js' has already exported a member named 'ModelSpec'.
```
(or the symmetric duplicate-identifier diagnostic depending on tsc version.)

**The ONLY correct fix is to MOVE `ModelSpec`**: remove the single `ModelSpec,` line from the
`// Provider types` block in `src/types/index.ts` and place it (once) in the new `// Harness types`
block. Because providers.ts re-exports the exact same type, every consumer that previously got
`ModelSpec` via `./providers.js` now gets the identical type via `./harnesses.js` — zero behavioral
change. The same move applies in `src/index.ts`'s big export-type block (move the `ModelSpec,` entry
from the `// Provider types` section into the new `// Harness types` section) — though there it's a
cosmetic single-block relocation, not a dedup necessity (the block re-exports from one source).

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after editing the two barrels — the ModelSpec dedup + new exports must compile.
npm run lint            # tsc --noEmit on src/**/* (excludes src/__tests__). EXPECT: exit 0.
npm run build           # tsc → emits dist/index.{js,d.ts} + dist/types/index.{js,d.ts}. EXPECT: exit 0.

# Expected: Zero errors. If you see TS2308 "has already exported a member named 'ModelSpec'", you forgot
# the MOVE in src/types/index.ts (Gotcha #1) — remove ModelSpec from the provider block.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the NEW public-API test in isolation first.
npm test -- harness-public-api   # vitest run, filters to the new file. EXPECT: all green.

# Full suite — confirm no regression.
npm test                          # vitest run. EXPECT: exit 0, entire suite green.

# Expected: New test passes; existing suite unchanged (barrel re-exports cannot break runtime tests
# unless a duplicate-export or wrong source-path snuck in — Level 1 would catch both).
```

### Level 3: Integration Testing (System Validation)

```bash
# Contract grep checks — the load-bearing gates for THIS task.
echo "--- src/types/index.ts: // Harness types block (expect 1) ---"
grep -n "Harness types" src/types/index.ts

echo "--- src/types/index.ts: ModelSpec count (expect 1 — NOT duplicated) ---"
grep -c "ModelSpec" src/types/index.ts

echo "--- src/types/index.ts: harnesses.js source (expect >= 1) ---"
grep -n "from './harnesses.js'" src/types/index.ts

echo "--- src/index.ts: PiHarness (expect 1) ---"
grep -n "PiHarness" src/index.ts

echo "--- src/index.ts: configureHarnesses (expect 1) ---"
grep -n "configureHarnesses" src/index.ts

echo "--- src/index.ts: parseModelSpec + formatModelForProvider (expect 1 each) ---"
grep -n "parseModelSpec\|formatModelForProvider" src/index.ts

echo "--- src/index.ts: ModelSpec count (expect 1 — single entry in the big types block) ---"
grep -c "ModelSpec" src/index.ts

echo "--- src/index.ts: legacy aliases intact (expect all present) ---"
grep -n "AnthropicProvider\|ProviderRegistry" src/index.ts
grep -n "GlobalProviderConfig\|ProviderCapabilities" src/index.ts   # a couple of representative legacy types

# Expected: counts/locations match Success Definition #4.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Verify the emitted declarations carry the harness surface (downstream consumers see it).
grep -n "PiHarness\|configureHarnesses\|parseModelSpec" dist/index.d.ts | head
grep -n "Harness types\|HarnessId\|GlobalHarnessConfig" dist/types/index.d.ts | head
# Expected: all present in the emitted .d.ts.

# (Optional) Smoke-test the public API at runtime exactly as a consumer would.
node -e "const g = require('./dist/index.js'); console.log(typeof g.PiHarness, typeof g.configureHarnesses, typeof g.parseModelSpec, typeof g.formatModelForProvider, typeof g.HarnessRegistry);"
# Expected: function function function function function

# (Optional) Confirm the legacy aliases still resolve at runtime.
node -e "const g = require('./dist/index.js'); console.log(g.AnthropicProvider === g.ClaudeCodeHarness, g.ProviderRegistry === g.HarnessRegistry);"
# Expected: true true
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 passed: `npm run lint` exit 0 AND `npm run build` exit 0.
- [ ] Level 2 passed: `npm test` exit 0 (new `harness-public-api.test.ts` green + full suite green).
- [ ] Level 3 passed: all contract greps match (`// Harness types` ×1 in types/index.ts; ModelSpec ×1
      in each barrel; PiHarness/configureHarnesses/parseModelSpec/formatModelForProvider ×1 each in
      index.ts; legacy aliases still present).
- [ ] Level 4 passed: `dist/index.d.ts` + `dist/types/index.d.ts` carry the harness surface.

### Feature Validation

- [ ] `src/types/index.ts` has the `// Harness types` block (9 types from `./harnesses.js`); `ModelSpec`
      moved out of the provider block (count = 1).
- [ ] `src/index.ts` exposes the 9 harness types + `PiHarness` + `configureHarnesses` +
      `parseModelSpec`/`formatModelForProvider`.
- [ ] Legacy `Provider*` types + `AnthropicProvider` + `ProviderRegistry` remain exported (untouched).
- [ ] New `harness-public-api.test.ts` asserts the surface + backward-compat aliases (incl.
      `AnthropicProvider === ClaudeCodeHarness`, `ProviderRegistry === HarnessRegistry`).
- [ ] Error cases: N/A (pure barrel re-export; no runtime error paths beyond `configureHarnesses`
      validation, which the test exercises with valid input).

### Code Quality Validation

- [ ] Barrel edits follow the existing `// <Domain> types` comment-header + one-name-per-line convention.
- [ ] No duplicate `ModelSpec` export anywhere (the dedup gotcha is handled).
- [ ] Anti-patterns avoided (see below).
- [ ] No scope leak: `src/types/harnesses.ts`, `src/types/providers.ts`, `src/harnesses/*.ts`,
      `src/utils/*.ts`, `src/core/agent.ts` untouched.

### Documentation & Deployment

- [ ] The new `// Harness types (PRD §7.2–§7.8)` headers are self-documenting (PRD section anchors).
- [ ] No new environment variables or config.
- [ ] `dist/*.d.ts` emits the harness surface for downstream consumers + IDE autocomplete.

---

## Anti-Patterns to Avoid

- ❌ Don't **duplicate** `ModelSpec` — re-exporting it from BOTH `./providers.js` and `./harnesses.js` in
  `src/types/index.ts` is a hard TS2308 error. MOVE it (remove from provider block, add to harness block).
- ❌ Don't re-export `parseModelSpec`/`formatModelForProvider` as VALUES from `./types/harnesses.js` —
  those are type-only `declare function`s (erased at compile); the runtime impls are in
  `./utils/model-spec.js`. Re-export the utils version or callers hit a runtime "not a function" error.
- ❌ Don't create a SECOND `export type {} from './types/index.js'` block in `src/index.ts` — fold the
  harness types INTO the existing big block under a new comment header (consistency + avoids accidental
  `ModelSpec` duplication).
- ❌ Don't add `PiHarness` to `src/harnesses/index.ts` first — out of scope; `src/index.ts` imports it
  directly from `./harnesses/pi-harness.js` (precedent: ClaudeCodeHarness).
- ❌ Don't add `getGlobalHarnessConfig` / `resolveHarnessConfig` / `resetGlobalHarnessConfig` /
  `configureProviders` to the public API — out of scope (item lists ONLY `configureHarnesses` +
  `parseModelSpec`/`formatModelForProvider`). `configureProviders` was never public to begin with.
- ❌ Don't remove or alter ANY legacy `Provider*` type export or `AnthropicProvider`/`ProviderRegistry` —
  they are the backward-compat aliases the item explicitly requires to remain.
- ❌ Don't edit `src/types/harnesses.ts`, `src/types/providers.ts`, `src/harnesses/*.ts`,
  `src/utils/*.ts`, or `src/core/agent.ts` — all owned by earlier (Complete) items; barrel-only changes here.
- ❌ Don't instantiate `PiHarness`/`ClaudeCodeHarness` in the test (they need SDK clients + initialize());
  only assert they're exported (`typeof === 'function'`). `HarnessRegistry` is cheaply constructible.
- ❌ Don't rely on `@ts-expect-error` as a load-bearing assertion — `tsconfig` excludes `src/__tests__`,
  so it's unverified; use runtime `expect()`.
- ❌ Don't skip the contract greps — barrel edits won't trip `tsc` for missing exports IF the source
  already exports them (it does), so the greps are the real proof the surface landed.

---

## Confidence Score

**9 / 10** for one-pass implementation success.

**Rationale:** The task is mechanically small (two barrel edits + one additive test) and every symbol
it surfaces already exists and is already wired into the runtime (P1/P2/early-P3 — all Complete). The
implementation is a pure re-export with no new types, classes, functions, or runtime logic. The single
non-obvious trap — the `ModelSpec` duplicate-export between `./providers.js` and `./harnesses.js` in
`src/types/index.ts` — is called out with its exact TS2308 symptom and the exact fix (MOVE, don't
duplicate) in **The ModelSpec Dedup Gotcha**, Gotcha #1, Task 1, and the Anti-Patterns. The verbatim
blocks to add are provided in **Implementation Patterns**, the test pattern is a direct mirror of the
existing `agent-response-public-api.test.ts`, and the validation commands are verified against
`package.json`/`tsconfig.json`. The one residual risk is an implementer ignoring the dedup guidance and
hitting the TS2308 error — fully mitigated by three redundant callouts + the Level 1 "if you see TS2308,
you forgot the move" hint. The parallel-running P3.M2.T2.S1 edits `src/types/agent.ts` only (JSDoc) and
does not touch either barrel or any harness type, so there is no merge-conflict surface with this item.
