# P1.M2.T1.S2 — Reference Enumeration & Type-Compatibility Analysis

Ground-truth grep output + the decisive type-compatibility reasoning for the
`ProviderRegistry → HarnessRegistry` rename. All paths are **post-S1** (S1 is
COMPLETE in the working tree: `src/harnesses/` exists, `src/providers/` is gone).

---

## 1. The renamed source file (INPUT)

`src/harnesses/provider-registry.ts` (post-S1 location) → rename to
`src/harnesses/harness-registry.ts`.

Current public surface (verified by reading the file):
- `export enum InitializationStatus { UNINITIALIZED, INITIALIZING, INITIALIZED, FAILED }`
- `export class ProviderRegistry` — singleton (`private static instance`).
  - Static: `getInstance(): ProviderRegistry`, `_resetForTesting(): void`.
  - Instance: `register(provider: Provider)`, `get(id: ProviderId)`,
    `has(id: ProviderId)`, `initializeProvider(id, options?)`, `initializeAll(config)`,
    `terminateAll()`, `getStatus(id)`, `isReady(id)`, `getAllStatuses()`,
    `_resetInitStateForTesting()`.
  - Internal: `private providers: Map<ProviderId, Provider>`,
    `private states: Map<ProviderId, ProviderInitState>`.
- Imports: `import type { Provider, ProviderId, ProviderOptions, GlobalProviderConfig } from '../types/providers.js';`

> **Contract discrepancy noted:** the item's RESEARCH NOTE lists `terminateProvider`
> among the methods. The actual source has **`terminateAll()` only** — there is NO
> per-harness `terminateProvider`. We follow the SOURCE (keep `terminateAll` verbatim).

---

## 2. Files importing the `provider-registry.js` MODULE PATH (→ `harness-registry.js`)

22 test files + barrel + public barrel (verified: `grep -rln "provider-registry" src/`):

```
src/harnesses/index.ts                                   # barrel — from './provider-registry.js'
src/harnesses/provider-registry.ts                       # the file being renamed (self)
src/index.ts                                             # L118: from './harnesses/provider-registry.js'
src/__tests__/integration/provider-switching.test.ts     # from '../../harnesses/provider-registry.js'
src/__tests__/integration/provider-agent.test.ts
src/__tests__/unit/providers/provider-registry.test.ts   # ← ALSO renamed to harness-registry.test.ts
src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
src/__tests__/unit/providers/anthropic-provider-terminate.test.ts
src/__tests__/unit/providers/anthropic-provider-registermcps.test.ts
src/__tests__/unit/providers/anthropic-provider-loadskills.test.ts
src/__tests__/unit/providers/anthropic-provider.test.ts
src/__tests__/unit/providers/provider-lifecycle.test.ts
src/__tests__/unit/providers/opencode-provider-deprecation.test.ts   # + 2 dynamic imports (L248, L265)
src/__tests__/unit/providers/opencode-provider-initialize.test.ts
src/__tests__/unit/providers/opencode-provider-terminate.test.ts
src/__tests__/unit/providers/opencode-provider-registermcps.test.ts
src/__tests__/unit/providers/opencode-provider-loadskills.test.ts
src/__tests__/unit/providers/anthropic-provider-execute.test.ts
src/__tests__/unit/providers/anthropic-provider-sessions.test.ts
src/__tests__/unit/providers/anthropic-provider-sessionconfig.test.ts
src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
src/__tests__/unit/agent.test.ts
src/__tests__/unit/agent-tool-executor.test.ts
src/__tests__/unit/agent-prompt-provider-override.test.ts
src/__tests__/unit/agent-stream-provider-override.test.ts
```

NOTE: `src/__tests__/unit/workflow-validation.test.ts` imports `ProviderRegistry`
from `'../../index.js'` (the PUBLIC barrel) — NOT from the provider-registry file.
It needs NO path edit; it only requires `src/index.ts` to keep exporting
`ProviderRegistry` (the alias), which S2 does.

Safe path-rewrite sed (only matches the `.js` module specifier — does NOT touch the
`ProviderRegistry` symbol, which has different casing and no `.js`):
```bash
sed -i 's#provider-registry\.js#harness-registry.js#g' $(grep -rl "provider-registry\.js" src/__tests__)
```

---

## 3. Production consumers of the `ProviderRegistry` SYMBOL (untouched — alias keeps them green)

```
src/core/agent.ts:43   import { ProviderRegistry } from '../harnesses/index.js';   # via barrel alias
src/core/agent.ts:119  const registry = ProviderRegistry.getInstance();
src/core/agent.ts:366  const registry = ProviderRegistry.getInstance();
src/core/agent.ts:596  const registry = ProviderRegistry.getInstance();
src/core/agent.ts:54,232,637  ProviderRegistry['_resetForTesting']();              # static via alias
```
`agent.ts` is owned by **P3.M1** — S2 must NOT rewire it. The alias
(`ProviderRegistry = HarnessRegistry`) is what keeps it compiling. ✓

Cosmetic-only mentions (comments / error-message strings — do NOT break the build;
optional to update):
```
src/harnesses/anthropic-provider.ts:200,279,301  # comments
src/harnesses/anthropic-provider.ts:1170         # error string: `Use ProviderRegistry.get('${spec.provider}') instead.`
src/harnesses/opencode-provider.ts:239           # comment
src/types/providers.ts:36                         # JSDoc comment
src/harnesses/index.ts:4                          # barrel header comment
```

---

## 4. DECISIVE: type-compatibility analysis (why Map stays `Map<ProviderId, Provider>` in S2)

The contract literally says `Change Map<ProviderId,Provider>→Map<HarnessId,Harness>;
update all method signatures (id: HarnessId, provider: Harness)`. **A strict reading
BREAKS the build.** Proof from the live tree:

1. **Adapters carry legacy ids (NOT HarnessId):**
   - `src/harnesses/anthropic-provider.ts:69` → `readonly id: ProviderId = "anthropic";`
   - `src/harnesses/opencode-provider.ts:99` → `readonly id: ProviderId = "opencode";`
   - `ProviderId = HarnessId | 'anthropic' | 'opencode'` (superset). `Provider.id: ProviderId`
     is WIDER than `Harness.id: HarnessId` → a `Provider` is **NOT assignable** to `Harness`.
   - So `register(harness: Harness)` would type-error on every `registry.register(adapter)`.

2. **`agent.ts` looks up by `ProviderId` (rewiring owned by P3.M1, frozen in S2):**
   - `resolveProviderConfig(...): { provider: ProviderId; ... }` (`src/utils/provider-config.ts:344`)
   - `agent.ts:84` → `private readonly providerId?: ProviderId;`
   - `agent.ts:119/366/596` → `registry.get(effectiveProvider)` where arg is `ProviderId`.
   - `get(id: HarnessId)` would type-error → `npm run lint` (`tsc --noEmit`, covers non-test
     `src/`) FAILS. S2 cannot ship red; P3.M1 is the task that rewires agent to harness.

3. **20 test files register `Provider`-typed mocks with ids `'anthropic'`/`'opencode'`** and
   call `registry.get('anthropic')` etc. A strict `Map<HarnessId, Harness>` would require
   rewriting ALL of them (mock ids → `'pi'`/`'claude-code'`, mock type → `Harness`, every
   literal lookup) — which is P2.M1's job (adapter id renames) and contradicts the contract's
   own OUTPUT clause ("test passes against the alias" with "update path + rename" only).

4. **The contract's OUTPUT clause itself REQUIRES `ProviderId`/`Provider` acceptance:**
   "existing ... provider-registry.test.ts (**update path + rename**) passes against the alias."
   Minimal-change + alias-passing is only possible if the registry still accepts `ProviderId`/`Provider`.

### Resolution (Approach A — vocabulary migration, type-narrowing deferred)

S2 adopts the harness **vocabulary** (class rename, file rename, alias export, JSDoc prose)
while KEEPING the deprecated `ProviderId`/`Provider`/`ProviderOptions`/`GlobalProviderConfig`
types on the Map + method signatures. This:
- keeps `npm run lint` green (agent.ts `get(ProviderId)` compiles),
- keeps all 20 registry-consuming tests passing (Provider mocks / ProviderId literals valid),
- exports `ProviderRegistry = HarnessRegistry` so every existing import resolves,
- sets up **automatic collapse**: once P2.M1 (adapters→`id: HarnessId`), P3.M1 (agent rewire),
  and P4.M1 (remove legacy `'anthropic'`/`'opencode'` literals) land, the `Provider`/`ProviderId`
  aliases collapse toward `Harness`/`HarnessId` and the registry becomes `Map<HarnessId, Harness>`
  with **zero further edits to this file** (it uses the alias types).

This deviation from the literal type-change is documented prominently in the PRP's
"Scope Decision" section so the implementer does NOT blindly write `Map<HarnessId, Harness>`.

---

## 5. Alias pattern (type + value, so it works in all positions)

Tests use `ProviderRegistry` as: value (`getInstance()`, `_resetForTesting()`,
`toBeInstanceOf(ProviderRegistry)`) AND type (`const instances: ProviderRegistry[]`).
A bare `const` alias lacks the type binding; a bare `type` alias lacks the value binding.
TypeScript permits both with the same name (distinct namespaces):

```ts
export class HarnessRegistry { /* ... unchanged body ... */ }

/** @deprecated Since v1.2. Use HarnessRegistry. */
export type ProviderRegistry = HarnessRegistry;
/** @deprecated Since v1.2. Use HarnessRegistry. */
export const ProviderRegistry = HarnessRegistry;   // inferred typeof HarnessRegistry (has statics)
```

Barrel re-export carries both bindings: `export { HarnessRegistry, ProviderRegistry } from './harness-registry.js';`
Dynamic-import destructure works: `const { ProviderRegistry } = await import('...harness-registry.js')`.

---

## 6. Toolchain facts (verified `package.json`)

- `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` per tsconfig → only validates
  non-test `src/`: `src/harnesses/**`, `src/core/agent.ts`, `src/index.ts`, `src/types/**`).
- `npm test` = `vitest run` (esbuild transpile-only — type errors in tests do NOT fail it,
  but module-resolution failures / assertion failures do).
- `npm run build` = `tsc` (emits `dist/`).
- No eslint/prettier. Both `lint` AND `test` MUST run: lint covers the 4 non-test edit sites;
  test covers the 22 test files + the renamed test file.
