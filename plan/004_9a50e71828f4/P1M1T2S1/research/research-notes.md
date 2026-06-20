# Research Notes — P1.M1.T2.S1 (Open-set model spec parsing)

## Key findings (in order of importance for one-pass success)

### 1. THE NON-OBVIOUS BUILD BREAK (most important)

Rewriting `src/utils/model-spec.ts` to return `harnesses.ModelSpec` (provider: `ModelProviderId`)
**breaks the build** in two legacy consumers, because of assignability direction:

- `ModelProviderId = 'anthropic'|'openai'|'google'|'zai'|(string & {})`  (OPEN)
- `ProviderId      = 'anthropic' | 'opencode'`                            (CLOSED)
- `ProviderId ⊂ ModelProviderId`  →  ProviderId IS assignable to ModelProviderId,
  but **ModelProviderId is NOT assignable to ProviderId**.

Affected sites (verified via grep + line reads):
- `src/providers/anthropic-provider.ts:1162` — `normalizeModel(model): ModelSpec` imports `ModelSpec`
  from `../types/providers.js` (closed) and `implements Provider`. Returns `parseModelSpec(...)` which
  now returns the open `ModelSpec`. Breaks at the `return spec` AND the `implements Provider` check.
- `src/providers/opencode-provider.ts:1027` — same pattern (`return spec` directly at :1030).
- The call-site ARGUMENTS (`parseModelSpec(model, "anthropic")`) do NOT break, because a `ProviderId`
  literal is assignable to a `ModelProviderId` parameter.

**FIX (prescribed in PRP Task 2):** transitional `ModelSpec` re-export in `src/types/providers.ts`
(make providers.ModelSpec === harnesses.ModelSpec). Leave `ProviderId` CLOSED — aliasing it is
P1.M1.T3's job. This is a ~2-line change and unblocks both consumers without touching them.

### 2. The `split('/', 2)` bug

Current `src/utils/model-spec.ts` uses `trimmed.split('/', 2)`, which TRUNCATES `'pi/anthropic/x'`
to `['pi','anthropic']` (length 2) and silently accepts it. PRD §7.8 forbids harness-qualified
strings, so the rewrite must drop the limit and branch on `parts.length` (1=plain, 2=qualified,
>=3=throw "Harness must not appear in model string").

### 3. Toolchain reality (NOT Python)

The PRP template is Python-centric (ruff/mypy/pytest). This repo is **TypeScript + vitest**:
- `npm run lint`  = `tsc --noEmit`  (the type check — THIS is what catches break #1)
- `npm test`      = `vitest run`    (unit tests)
- `npm run build` = `tsc`           (emit)
- **No eslint/prettier.** vitest uses esbuild transpilation, so `npm test` passing does NOT prove
  types are correct — `npm run lint` is mandatory.

### 4. Duplicate `isValidProviderId`

- `src/utils/model-spec.ts` — has it (closed-set guard) → **DELETE** (open-set obsoletes it).
- `src/utils/provider-config.ts` — has a VERBATIM copy, used by `configureProviders()` to validate
  the closed `ProviderId` set for `GlobalProviderConfig`. **LEAVE IT** — that file is owned by P1.M2
  (relocation to harness-config) and its closed-set validation is still correct until then.

### 5. Test files affected (4, not 1)

The contract names `src/__tests__/unit/utils/model-spec.test.ts`, but THREE other suites touch these
functions and must be verified:
- `src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts`
- `src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts`
- `src/__tests__/unit/harnesses-config-types.test.ts` (type test vs. the unchanged `declare function`s)

The model-spec test has assertions that INVERT under open-set semantics (e.g. `parseModelSpec('invalid/model')`
now SUCCEEDS; `parseModelSpec('anthropic/claude/3/5')` now THROWS).

### 6. Scope boundaries respected

- `src/types/harnesses.ts` — READ ONLY (S1+S2 own it; this task implements its declared signatures).
- `src/utils/provider-config.ts` — NOT touched (P1.M2 owns relocation).
- `ProviderId` aliasing — NOT done here (P1.M1.T3 owns the full deprecated alias shim).
- Consumers `anthropic-provider.ts` / `opencode-provider.ts` — NOT directly edited; they compile via
  the transitional `ModelSpec` alias. They are renamed/removed in P2.M1 / P4.M1.

## Confidence

**9/10** for one-pass success. Residual risk: the `providers.ts` `ModelSpec` alias overlaps T3's
intent, but it is documented as minimal/transitional with explicit "do not alias ProviderId" guard.
All file paths, line numbers, and the exact reference implementation are in the PRP.
