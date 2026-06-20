# Research Findings — P3.M2.T2.S1: Add harness/harnessOptions to PromptOverrides

> Research date: 2026-06-20. **This is a COMPLETION / contract-closure task**, structurally
> identical to P3.M2.T1.S1 (AgentConfig) which landed DURING this research session (the file
> changed under us: AgentConfig.provider/providerOptions went from a one-liner `@deprecated` to
> full BEFORE/AFTER migration JSDoc at src/types/agent.ts L106/L128/L133). Same pattern, applied
> to the sibling `PromptOverrides` interface.

---

## 1. Verified current state of `src/types/agent.ts` — PromptOverrides (L158–244)

Re-read fresh on 2026-06-20 (after P3.M2.T1.S1 landed). `PromptOverrides` interface spans **L158–244**.

| Field | Line | Has `@deprecated`? | Current JSDoc |
|---|---|---|---|
| `harness?: HarnessId` | **L196** | n/a (new field) | `/** Override harness for this prompt (PRD §7.7, §7.9). Highest priority in the harness cascade. */` |
| `harnessOptions?: HarnessOptions` | **L199** | n/a (new field) | `/** Override harness options for this prompt (PRD §7.7). Merged via last-write-wins. */` |
| `provider?: ProviderId` | **L218** | ❌ **NO** | 3-line cascade JSDoc ("highest priority in the provider cascade"), `@example` shows `provider: 'opencode'` |
| `providerOptions?: ProviderOptions` | **L243** | ❌ **NO** | merge-semantics JSDoc ("last write wins"), `@example` shows `{ temperature, timeout }` |

**Conclusion:** The `harness`/`harnessOptions` fields ALREADY EXIST (added by P3.M1.T2.S1 —
the consumer). What remains for THIS item is the **deprecation contract** on `provider` /
`providerOptions` (BEFORE/AFTER migration JSDoc) + a type-validation test. The TypeScript
*types* do not change — `@deprecated` is a JSDoc tag, not a type.

### `grep -c "@deprecated" src/types/agent.ts` today = **3** (all in AgentConfig: L106, L128, L133).
After this task it should be **≥ 5** (two more added inside `PromptOverrides`).

---

## 2. Runtime consumption contract (PROVES the harness fields already work)

`src/core/agent.ts` reads `PromptOverrides.harness` / `harnessOptions` in BOTH call paths
(added by P3.M1.T2.S1.S1 + S2, both Complete):

```ts
// prompt() path — src/core/agent.ts L365-366
// PromptOverrides + the test suite are fully on harness vocabulary (later lockstep milestone).
const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);
const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;

// stream() path — src/core/agent.ts L609-610 (identical)
const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);
const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;
```

**Interpretation:**
- The harness axis is **already wired end-to-end** at the prompt/stream call sites. No runtime
  change is needed for this item.
- The legacy `provider` / `providerOptions` fall through as the harness value via the `as HarnessId`
  cast ("lockstep milestone" — they are kept working during migration, NOT removed).
- Therefore this item is **purely advisory + defensive**: (a) mark the legacy fields `@deprecated`
  with migration guidance so consumers stop using them; (b) add a type-validation test that locks
  the surface against regression.

---

## 3. Sibling precedent — P3.M2.T1.S1 (AgentConfig) JUST landed identically

The P3.M2.T1.S1 PRP (read in full) specifies the EXACT same operation on the sibling
`AgentConfig` interface. It landed during this research session. Its contract for the
deprecation JSDoc (verbatim pattern to mirror for PromptOverrides) is:

```
@deprecated Since v1.2. Use {@link PromptOverrides.harness} (and
{@link PromptOverrides.harnessOptions} for options) instead. The runtime/harness
axis ('pi' | 'claude-code') is now independent of the LLM provider/model (PRD §7):
the harness is chosen separately, and the model string is never harness-qualified.
Retained for backward compatibility during the v1.2 migration.

```ts
// BEFORE (v1.x)
const response = await agent.prompt(myPrompt, { provider: 'anthropic' });
// AFTER (v1.2)
const response = await agent.prompt(myPrompt, {
  harness: 'claude-code',
  model: 'anthropic/claude-sonnet-4-20250514',
});
```
```

And for `providerOptions`, the additional note that **`HarnessOptions` is SLIMMED** (omits
`sessionStore`, `sessionPersistence`, `sessionTtl`, `sessionPath`).

---

## 4. Canonical JSDoc BEFORE/AFTER convention

From `src/types/providers.ts` (the alias shim, fully @deprecated by P1.M1.T3.S1). The
established migration-JSDoc shape:

```
/**
 * <one-line description>
 *
 * @deprecated Since v1.2. Use {@link <HarnessType>} from types/harnesses.ts.
 *
 * <rationale / gotchas>
 *
 * ```ts
 * // BEFORE (v1.x)
 * <old usage>
 * // AFTER (v1.2)
 * <new usage>
 * ```
 */
```

Bucket A examples (`ProviderCapabilities` → `HarnessCapabilities`, etc.) at providers.ts
L45-99 follow this exactly. **PromptOverrides.provider/providerOptions must match it.**

---

## 5. Gotcha: the current `provider?` example references `'opencode'`

The existing `PromptOverrides.provider` JSDoc `@example` (L225-227) shows:
```ts
const result = await agent.prompt(prompt, { provider: 'opencode' });
```
`'opencode'` is being **deleted** in P4.M1 (OpenCodeProvider removal). The migration JSDoc
we write must NOT recommend opencode. Use the P3.M2.T1.S1 precedent: BEFORE example uses
`provider: 'anthropic'`, AFTER uses `harness: 'claude-code'` + `model: 'anthropic/...'`.
(REPLACE the whole cascade JSDoc block — do not append; the v1.x provider-cascade prose is
stale post-migration; the cascade is now the harness cascade per PRD §7.7.)

---

## 6. Test pattern — mirror P3.M2.T1.S1's `agent-config-types.test.ts`

P3.M2.T1.S1 (parallel sibling) CREATES `src/__tests__/unit/agent-config-types.test.ts`.
This item CREATES the sibling `src/__tests__/unit/prompt-overrides-types.test.ts` with the
same shape:
- `import { describe, it, expect } from 'vitest'`
- `import type { PromptOverrides } from '../../types/agent.js'`
- `import type { HarnessId, HarnessOptions } from '../../types/harnesses.js'`
- Runtime `expect()` assertions on type-annotated object literals (`const o: PromptOverrides = {...}`)

**CRITICAL test gotcha:** `tsconfig.json` `"exclude": ["src/__tests__"]` means `tsc` (lint +
build) does NOT type-check the test dir; vitest's esbuild strips types without checking. So
`@ts-expect-error` directives in tests are UNVERIFIED (esbuild drops them). Every assertion
MUST be a runtime `expect()` on a value. Type *annotations* document intent; a broken
`PromptOverrides` field would still fail `npm run lint` via the SOURCE file
(`src/types/agent.ts` IS in the lint set). Pattern source: `src/__tests__/unit/harnesses-types.test.ts`.

---

## 7. Scope boundaries (DO NOT TOUCH)

| Region | Owner | Why not |
|---|---|---|
| `AgentConfig` interface (L15-152) | **P3.M2.T1.S1** (just landed) | Same file, different interface — zero overlap if edits use unique oldText, but it is their region. |
| `src/core/agent.ts` | P3.M1.* (Complete; L365/L609 already read the fields) | Runtime consumer; no change needed — fields already wired. |
| `src/types/providers.ts` | P1.M1.T3.S1 alias shim (Complete) | Already fully @deprecated. |
| `src/types/index.ts` | public barrel (P3.M3) | `PromptOverrides` already re-exported; no change. |
| The harnesses.ts / providers.ts types themselves | P1.* | Source of `HarnessId`/`HarnessOptions`; read-only for this task. |

**File overlap with P3.M2.T1.S1:** both edit `src/types/agent.ts`, but in **different,
non-overlapping interfaces** (AgentConfig L15-152 vs PromptOverrides L158-244). As long as
edits target unique JSDoc blocks via the `edit` tool, there is no merge conflict. P3.M2.T1.S1
explicitly left PromptOverrides untouched ("DO NOT touch PromptOverrides"); reciprocate.

---

## 8. Validation gates (verified against package.json / tsconfig.json)

```bash
npm run lint    # tsc --noEmit on src/**/* (EXCLUDES src/__tests__). EXPECT: exit 0.
npm test        # vitest run. EXPECT: exit 0, full suite green + new test passes.
npm run build   # tsc → emits dist/types/agent.{js,d.ts}. EXPECT: exit 0.

# Contract greps (load-bearing — JSDoc-only changes won't trip tsc):
grep -c "@deprecated" src/types/agent.ts        # expect >= 5 (was 3; +2 in PromptOverrides)
grep -n "harness?: HarnessId" src/types/agent.ts # expect 2 hits (AgentConfig + PromptOverrides)
grep -n "harnessOptions?: HarnessOptions" src/types/agent.ts  # expect >= 2 hits
grep -c "// BEFORE (v1.x)" src/types/agent.ts    # expect >= 4 (was 2 from AgentConfig; +2)
grep -c "// AFTER (v1.2)" src/types/agent.ts     # expect >= 4
grep -A3 "@deprecated" dist/types/agent.d.ts | head -60  # deprecation tags in emitted .d.ts
```

---

## 9. Confidence: 9/10

The change is mechanically tiny (two JSDoc block rewrites + one additive test), the exact
target text is derivable verbatim from the P3.M2.T1.S1 precedent (which just landed
successfully), the pattern files are named, and the validation commands are verified. The
one residual risk is the implementer double-adding fields that already exist — mitigated by
the pre-flight grep (Task 0) + the "don't re-add" anti-pattern. No type signatures change →
no ripple into P3.M1.* consumers (already proven by the harness fields flowing through
src/core/agent.ts L365-366 / L609-610 today).
