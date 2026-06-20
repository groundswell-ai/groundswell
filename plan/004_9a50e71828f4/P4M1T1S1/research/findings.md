# Research Findings — P4.M1.T1.S1 (Delete OpenCodeProvider + scrub `opencode` literal)

> Companion to `../PRP.md`. This file holds the exhaustive evidence/inventory the PRP is built on.

## 1. Authoritative scope sources (READ-ONLY)

- `plan/004_9a50e71828f4/docs/migration-scope.md` §6 — "OpenCodeProvider + its 9 test files + the
  literal `'opencode'` member of `ProviderId` + `docs/migration-opencode-removal.md` as **deletion
  items**, not renames." §3 confirms `backward-compatibility.test.ts` has ZERO opencode refs.
- `plan/004_9a50e71828f4/docs/consumer-analysis.md` §2 — confirms: delete `opencode-provider.ts`,
  **narrow `ProviderId`** (remove `'opencode'`), drop `"@opencode-ai/sdk": "1.1.36"` from package.json,
  update the ~564 test occurrences.
- `docs/migration-opencode-removal.md` — published migration guide. Breaking changes §27-32: class
  removed, dep removed, `ProviderId` no longer includes `'opencode'`, multi-provider gateway removed.
  (This DOC is finalized by **P4.M1.T1.S2**, NOT this subtask — do NOT touch here.)

## 2. The contract's OUTPUT criterion is absolute

Work-item contract OUTPUT: *"Zero opencode references in src/. Verifiable via `grep -rni opencode src/`
returning empty (excluding intentional migration-doc references)."* There are **no** "migration-doc
references" inside `src/` today (the migration-guide URL lives only in `opencode-provider.ts`, which is
deleted). ⇒ **every** `opencode` occurrence in `src/` must be removed.

This is materially LARGER than the contract's named subset ("9 test files + model-spec/provider-config
examples & error strings"). The catch-all LOGIC bullet ("grep-and-remove the 'opencode' literal from any
non-deprecated code") + the absolute OUTPUT criterion together cover **27 files**.

## 3. Exhaustive file inventory (`grep -ci opencode` per file, verified at research time)

### A. SOURCE — DELETE (1)
| File | Hits | Action |
|---|---|---|
| `src/harnesses/opencode-provider.ts` | 94 | **DELETE entire file** (the `OpenCodeProvider` class + `@opencode-ai/sdk` importer) |

### B. SOURCE — EDIT (6)
| File | Hits | What changes |
|---|---|---|
| `src/types/providers.ts` | 7 | L40 `export type ProviderId = HarnessId \| 'anthropic' \| 'opencode';` → drop `\| 'opencode'`. + scrub JSDoc at L36-37, L556-557, L580, L709. |
| `src/utils/harness-config.ts` | 8 | `isValidProviderId()`: drop `value === 'opencode' \|\|`. `getSupportedProvidersList()`: `'"anthropic", "opencode"'` → `'"anthropic", "pi", "claude-code"'`. + scrub module/JSDoc at L16,18,257,262,271-272,275,289. |
| `src/core/agent.ts` | 3 | JSDoc/comments L5, L362, L606 (examples `provider:'opencode'`). Replace → `'claude-code'`. |
| `src/types/agent.ts` | 4 | JSDoc examples L57, L77, L80, L81. ⚠️ P3.M2.T2.S1 (Complete) already added harness fields here — grep for opencode, do NOT touch harness fields. |
| `src/harnesses/harness-registry.ts` | 2 | JSDoc examples L102, L508. |
| `src/harnesses/claude-code-harness.ts` | 2 | JSDoc `normalizeModel` example L1200-1201 (`opencode/gpt-4` → `openai/gpt-4`). |

### C. TESTS — DELETE (9)  (all `opencode-provider-*.test.ts`)
`src/__tests__/unit/providers/opencode-provider-{deprecation,execute,hooks,initialize,loadskills,normalizemodel,registermcps,supports,terminate}.test.ts`

### D. TESTS — EDIT (11)
| File | Hits | Replacement category (see §4) |
|---|---|---|
| `src/__tests__/integration/provider-switching.test.ts` | 111 | harness-mock → `'claude-code'` |
| `src/__tests__/unit/providers/provider-lifecycle.test.ts` | 103 | harness-mock → `'claude-code'` |
| `src/__tests__/unit/providers/harness-registry.test.ts` | 82 | harness-mock → `'claude-code'` |
| `src/__tests__/unit/agent-prompt-provider-override.test.ts` | 56 | harness-mock → `'claude-code'` |
| `src/__tests__/unit/agent-stream-provider-override.test.ts` | 41 | harness-mock → `'claude-code'` |
| `src/__tests__/unit/utils/model-spec.test.ts` | 24 | model-host → `'openai'` |
| `src/__tests__/unit/provider-result-types.test.ts` | 23 | model-host → `'openai'` |
| `src/__tests__/unit/utils/harness-config.test.ts` | 16 | **flip acceptance→rejection + new error text** |
| `src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts` | 9 | `'opencode/gpt-4'` → `'openai/gpt-4'` |
| `src/__tests__/unit/provider-interface.test.ts` | 5 | narrow union assertion |
| `src/__tests__/unit/providers/provider-alias-shim.test.ts` | 4 | narrow union assertion |

### E. UNCHANGED — verify only
| File | Note |
|---|---|
| `src/__tests__/compatibility/backward-compatibility.test.ts` | contract + migration-scope §3: ZERO opencode refs. Grep to CONFIRM, then leave alone. |
| `src/index.ts`, `src/types/index.ts`, `src/harnesses/index.ts` | OpenCodeProvider **NOT** exported anywhere (verified). No edit. (P3.M3.T1.S1 adds harness exports here — no conflict; opencode was never public.) |

## 4. Replacement strategy by CONTEXT (the load-bearing decision)

The literal `opencode` is used in 4 distinct semantic contexts. Blind find/replace breaks tests.

**R1 — HarnessId/ProviderId MOCK id** (registry, switching, override, lifecycle tests): replace
`'opencode'` → **`'claude-code'`**. These tests need TWO distinct ids to exercise switching; the primary
is `'anthropic'`, the secondary was `'opencode'` → now `'claude-code'`. Mocks are generic
(`createMockProvider`), so semantics (switching/cascade/override) are preserved.

**R2 — ModelProviderId EXAMPLE** (model-spec, provider-result-types, claude-code normalizemodel): replace
`'opencode'` → **`'openai'`**. The model axis is an OPEN set (PRD §7.8); `'openai'` is a realistic
non-anthropic LLM host, so `claude-code` correctly rejects `openai/gpt-4` (same semantics as the old
`opencode/gpt-4` rejection test).

**R3 — configureHarnesses REJECTION test** (`harness-config.test.ts:129`): replace the invalid
`'opencode'` → a clearly-invalid sentinel like **`'invalid-harness'`** (still rejected; proves the gate).

**R4 — configureProviders ACCEPTANCE tests** (`harness-config.test.ts:429-582`): **FLIP**. After removal,
`configureProviders({ defaultProvider: 'opencode' })` THROWS (opencode no longer valid). Rewrite to (a)
assert 'opencode' is now REJECTED, and (b) keep an acceptance path on `'claude-code'`/`'anthropic'`. The
error-message test (L465-473) must assert the NEW text `'"anthropic", "pi", "claude-code"'` and assert
'opencode' is ABSENT.

**R5 — Union-membership assertions** (`provider-alias-shim.test.ts`, `provider-interface.test.ts`):
assert the NARROWED set `['pi','claude-code','anthropic']`; optionally assert `'opencode'` is no longer
assignable to `ProviderId`.

## 5. The coordinated source change (hardest part)

`src/utils/harness-config.ts` — `isValidProviderId()` + `getSupportedProvidersList()` are coupled to
`src/__tests__/unit/utils/harness-config.test.ts` via the error-message TEXT. Changing the source
function output WITHOUT updating the test assertions = failing `npm test`. Must change both atomically.
Detail + exact before/after in PRP "Implementation Patterns".

## 6. Dependency removal

`package.json:61` → `"@opencode-ai/sdk": "1.1.36"` (pinned, no caret). Only importer is
`src/harnesses/opencode-provider.ts` (deleted in step A). `npm uninstall @opencode-ai/sdk` cleans
package.json + package-lock.json (3 refs) + node_modules. Confirmed no other `@opencode-ai/sdk` import in
src/ (grep).

## 7. Validation gates (verified against package.json/tsconfig.json)

- `npm run lint` = `tsc --noEmit` — covers `src/**/*`, **EXCLUDES** `src/__tests__`. ⇒ a stray `'opencode'`
  literal in a .test.ts does NOT fail lint; only the source-side ProviderId-narrowing + harness-config
  edit are checked here.
- `npm run build` = `tsc` — emits dist/ (regenerates the stale `dist/**/opencode-provider.*` artifacts).
- `npm test` = `vitest run` — the REAL gate for the test edits. Expects green after R1-R5 rewrites.
- The OUTPUT contract gate: `grep -rni opencode src/` → **must print nothing**.

## 8. Coordination / conflict surface

- **Parallel item P3.M3.T1.S1** edits `src/index.ts` + `src/types/index.ts` (adds harness exports) and
  creates `harness-public-api.test.ts`. It does NOT touch opencode and opencode was never exported from
  `src/index.ts` ⇒ **NO conflict** with this task. P3.M3.T1.S1 KEEPS the legacy `Provider*`/
  `AnthropicProvider`/`ProviderRegistry` aliases; narrowing `ProviderId` (drop `'opencode'`) does not
  break those aliases (`'anthropic'` remains valid).
- **P3.M2.T2.S1** (Complete) already added harness fields to `src/types/agent.ts`. This task scrubs the
  SEPARATE opencode JSDoc examples there — grep-targeted edits, do not touch harness fields.
- **Out of scope (other items):** `examples/providers/*` + `docs/migration-opencode-removal.md` (P4.M1.T1.S2);
  `docs/providers.md` (P4.M3.T1.S1); `dist/`,`coverage/` (regenerated by build).
