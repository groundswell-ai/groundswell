# Scope & Consumer Analysis — P1.M3.T1.S1 (CacheKeyInputs harness + provider axes)

**Question:** The contract (item description) says *"`CacheKeyInputs` requires harness"*
(field declared `harness: HarnessId`, no `?`). Is making it **required** safe to ship green?
**Answer: NO.** This task must declare `harness?: HarnessId` (optional) to avoid breaking the
sole consumer (`agent.ts`), which is owned by **P3.M1.T2.S3** and is NOT rewired in this window.
This mirrors the dual-singleton Scope Decision in the parallel predecessor PRP (P1.M2.T2.S1).

---

## 1. Consumer enumeration (verified live in working tree)

`grep -rn "CacheKeyInputs\|generateCacheKey" src/` (excluding cache-key.ts itself + its test):

| File:line | Usage | Owned by |
|-----------|-------|----------|
| `src/core/agent.ts:33` | `import { generateCacheKey, defaultCache } from '../cache/index.js';` | P3.M1.T2.S3 |
| `src/core/agent.ts:34` | `import type { CacheKeyInputs } from '../cache/index.js';` | P3.M1.T2.S3 |
| `src/core/agent.ts:624` | `const cacheInputs: CacheKeyInputs = { user, data, system, model, temperature, maxTokens, tools, mcps, skills, responseFormat }` — **NO harness, NO provider** | P3.M1.T2.S3 |
| `src/core/agent.ts:636` | `cacheKey = generateCacheKey(cacheInputs);` | P3.M1.T2.S3 |
| `src/cache/index.ts:7-8` | re-exports `generateCacheKey` + type `CacheKeyInputs` | (barrel — auto-tracks) |
| `src/index.ts:160,162` | public-API re-export (barrel — auto-tracks) | P3.M3.T1.S1 |

**Conclusion:** The ONLY construction site of `CacheKeyInputs` is `agent.ts:624`, and it does NOT
pass `harness`. It is explicitly owned by **P3.M1.T2.S3 ("Thread harness + provider into the cache
key build-site")** per `plan/004_9a50e71828f4/tasks.json`. This task is **forbidden** from editing
`agent.ts` (same boundary as P1.M2.T2.S1, which states "P3.M1 owns rewire").

## 2. Why `required` breaks the build (proof)

`npm run lint` = `tsc --noEmit`. `tsconfig.json:23` → `"exclude": ["node_modules", "dist",
"src/__tests__"]`. Therefore `tsc --noEmit` **DOES type-check `src/core/agent.ts`** (it is non-test
source). If `CacheKeyInputs.harness: HarnessId` is required:

```ts
// agent.ts:624 — current code (UNTOUCHED by this task)
const cacheInputs: CacheKeyInputs = {
  user: prompt.buildUserMessage(),
  // ... NO harness field ...
};
```

→ TypeScript error **TS2741**: *Property 'harness' is missing in type '{ user: string; ... }' but
required in type 'CacheKeyInputs'.* → `npm run lint` exits ≠ 0 → task FAILS the green contract.

This directly undoes the green contract the parallel predecessor (P1.M2.T2.S1) works to preserve:
its PRP states agent.ts "imports resolveProviderConfig/getGlobalProviderConfig via shim. Untouched
(P3.M1 owns rewire)." Breaking agent.ts here would break that PRP's success criteria too.

## 3. The established codebase pattern: ship-green during migration windows

The predecessor PRP (P1.M2.T2.S1) faced an isomorphic tension: its contract said the deprecated
`configureProviders` should "delegate to the new fns", but literal delegation broke 4 test files +
agent.ts. Its documented resolution: **dual-singleton** — honor the contract's INTENT (new
utilities exist; delegation happens where type-safe) while preserving every existing consumer's
compilation until the downstream owner (P3.M1) rewires them. Literal contract achievement is
deferred to the task that owns its prerequisites.

This task applies the SAME principle: honor the contract's INTENT (the `harness` + `provider` axes
exist on `CacheKeyInputs` and are threaded into the SHA-256 normalized object → distinct keys per
(harness, provider, model) per PRD §7.14.5) while keeping the sole consumer (`agent.ts`) compiling
by making the new fields OPTIONAL. P3.M1.T2.S3 then rewires `agent.ts` to always pass `harness`
(resolved via `resolveHarnessConfig(...).harness` from P1.M2.T2.S1) and `provider` (resolved via
the `ModelSpec`/`parseModelSpec`).

## 4. Why optional is also the CORRECT steady-state design (not just a migration hack)

- **PRD §7.14.5** requires keys "incorporate both the harness and the provider/model **for
  isolation**". The isolation property is satisfied whenever the axes are PRESENT and distinct;
  optionality does not weaken isolation for callers that provide them.
- **Zero behavioral regression.** Following `generateCacheKey`'s existing optional-field pattern
  (only append a field to `normalized` when `!== undefined`), a call that omits `harness`/`provider`
  produces the BYTE-FOR-BYTE IDENTICAL key as before this task. Any existing (test or runtime) cache
  entries remain valid; existing `cache-key.test.ts` assertions are unchanged.
- **`provider` is already optional per the contract** (`provider?: ModelProviderId`). Treating
  `harness` identically (optional, conditional append) is consistent and uniform.
- **No persistent cache in tests** → even the theoretical "key drift" concern is moot for the
  validation gates.

## 5. Downstream handoff (what P3.M1.T2.S3 must do)

After P3.M1.T2.S3 rewires `agent.ts:624` to pass `harness` + `provider`, the field MAY be tightened
to required (`harness: HarnessId`) in a follow-up — but ONLY after every consumer passes it. That
tightening is out of scope here (it requires editing agent.ts, which P3.M1.T2.S3 owns). The
`harness?`/`provider?` shape shipped by this task is the contract P3.M1.T2.S3 consumes.

## 6. Type-source facts (verified)

- `HarnessId` and `ModelProviderId` are exported from `src/types/harnesses.ts` (P1.M1.T1.S1/S2).
- `src/types/index.ts` does **NOT** re-export harness types (only `AnthropicProvider` from
  `../harnesses/`). → Import directly: `import type { HarnessId, ModelProviderId } from
  '../types/harnesses.js';` (matches the predecessor PRP convention).
- `isolatedModules: true` (tsconfig.json:20) → type-only imports MUST use `import type`.
- `deterministicStringify` sorts object keys → insertion order of `harness`/`provider` in the
  `normalized` object is COSMETIC (does not affect the hash). Place them for readability.
- `deterministicStringify(undefined)` returns the literal `'undefined'` → NEVER unconditionally
  assign `normalized.harness = inputs.harness` when it may be undefined (would inject
  `"harness":undefined` and drift the key). ALWAYS guard with `!== undefined` (matches the existing
  optional-field pattern for `data`/`system`/`temperature`/etc.).
