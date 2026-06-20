# P1.M2.T2.S1 — Consumer & Design Analysis

Research findings that drive the PRP's load-bearing decisions. Every fact below was
verified against the working tree on 2026-06-20.

## 1. The file being migrated: `src/utils/provider-config.ts`

Exports exactly **4 functions** (verified `grep -n "^export"`):

| Line | Export | Signature (abridged) |
|------|--------|----------------------|
| 159  | `configureProviders(config: GlobalProviderConfig)` | validates `defaultProvider ∈ {'anthropic','opencode'}`; stores in module-private `let globalConfig` |
| 228  | `getGlobalProviderConfig()` | returns `globalConfig ?? DEFAULT_CONFIG` where `DEFAULT_CONFIG = { defaultProvider: 'anthropic' as ProviderId, providerDefaults: undefined }` |
| 245  | `resetGlobalConfig()` | testing-only reset (`globalConfig = null`) |
| 338  | `resolveProviderConfig(globalConfig, agentProvider?, agentOptions?, promptProvider?, promptOptions?)` | PURE fn: `provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider`; `options = { ...global.providerDefaults?.[provider], ...agentOptions, ...promptOptions }` |

**Module-private singleton pattern** (`let globalConfig: GlobalProviderConfig | null = null`)
is confirmed — exactly the pattern the contract references.

## 2. Consumers that MUST stay green WITHOUT being edited

| Consumer | Imports | Why it must not be touched |
|----------|---------|----------------------------|
| `src/core/agent.ts:45` | `resolveProviderConfig`, `getGlobalProviderConfig` from `'../utils/provider-config.js'` | NON-TEST; P3.M1.T1 owns the agent→harness rewire. Reads legacy singleton via `getGlobalProviderConfig()`, then `resolveProviderConfig(globalConfig, this.providerId, this.providerOptions)` destructuring `{ provider: resolvedProvider, options: resolvedProviderOptions }` (lines 110-111, 356-357, 586-587), then `registry.get(effectiveProvider)`. |
| `src/utils/index.ts:3` | `export { configureProviders } from './provider-config.js';` | internal barrel |
| `src/__tests__/integration/provider-switching.test.ts:47` | `configureProviders`, `resetGlobalConfig` | calls `configureProviders({ defaultProvider: 'opencode' })` and `'anthropic'` (lines 278, 361, 454, 627) |
| `src/__tests__/integration/provider-agent.test.ts:23` | `resetGlobalConfig` | resets singleton |
| `src/__tests__/unit/agent-prompt-provider-override.test.ts:13` | `configureProviders`, `resetGlobalConfig` | calls `configureProviders({ defaultProvider: 'opencode' })` / `'anthropic'` (lines 153, 314, 352, 494) |
| `src/__tests__/unit/agent-stream-provider-override.test.ts:13` | `configureProviders`, `resetGlobalConfig` | same pattern (lines 167, 331, 372) |
| `src/__tests__/unit/utils/provider-config.test.ts` | all 4 fns | **the file this task renames** |

**CRITICAL:** All 4 legacy consumers + agent.ts pass `'anthropic'` / `'opencode'` as valid
`defaultProvider` values and destructure `{ provider, options }` from `resolveProviderConfig`.

## 3. The target types — `src/types/harnesses.ts` (P1.M1.T1.S2 output, already shipped)

```ts
export type HarnessId = 'pi' | 'claude-code';
export interface GlobalHarnessConfig {
  defaultHarness: HarnessId;
  harnessDefaults?: Partial<Record<HarnessId, HarnessOptions>>;
  defaultModelProvider?: ModelProviderId;   // open set — NO validation
}
export interface HarnessOptions {
  endpoint?: string; apiKey?: string; sessionId?: string; timeout?: number;
  headers?: Record<string, string>;
}
```

`DEFAULT_CONFIG` per contract = `{ defaultHarness: 'pi' as HarnessId }` (**pi is default** —
PRD §7.1, NOT 'anthropic').

## 4. THE LOAD-BEARING DESIGN CONSTRAINT — incompatible validation domains

The contract says: *"Export deprecated `configureProviders`/`getGlobalProviderConfig`/
`resolveProviderConfig` aliases delegating to the new fns."* But the new and legacy functions
have **incompatible validation domains**:

- NEW `configureHarnesses` validates `defaultHarness ∈ {'pi', 'claude-code'}`.
- LEGACY `configureProviders` is consumed by agent.ts + 4 tests that pass
  `defaultProvider: 'anthropic'` / `'opencode'` — which are NOT valid `HarnessId` values
  (`ProviderId = HarnessId | 'anthropic' | 'opencode'` is a SUPERSET).

Therefore `configureProviders` **CANNOT** delegate to `configureHarnesses` — doing so would
reject `'anthropic'`/`'opencode'` and break agent.ts + all 4 test files (which this task must
NOT edit). The legacy `configureProviders` must keep its permissive validation + own storage.

### Resolution — dual-singleton with partial delegation

- **`configureProviders` / `getGlobalProviderConfig` / `resetGlobalConfig`** keep a
  **legacy singleton** (`let globalProviderConfig: GlobalProviderConfig | null`) with permissive
  `ProviderId`-superset validation + legacy DEFAULT (`defaultProvider: 'anthropic'`).
- **`resolveProviderConfig` DOES delegate** to `resolveHarnessConfig`. This is SAFE because
  `resolveHarnessConfig` is a **pure function that performs NO id validation** (only
  `configureHarnesses` validates). It treats ids as opaque string keys for the
  `harnessDefaults?.[harness]` lookup. So `resolveProviderConfig` translates its
  `GlobalProviderConfig` arg → `GlobalHarnessConfig` shape (field renames + unsound-but-
  runtime-safe `as HarnessId` casts for the opaque id keys), calls `resolveHarnessConfig`, then
  maps the `{ harness, options }` result back to `{ provider, options }`.
- **`configureHarnesses` / `getGlobalHarnessConfig` / `resetGlobalHarnessConfig`** own a
  **harness singleton** (`let globalHarnessConfig: GlobalHarnessConfig | null`) with strict
  validation + harness DEFAULT (`defaultHarness: 'pi'`).

This is analogous to **P1.M2.T1.S2's "Approach A"** — honor the contract's intent (new file,
new vocabulary, aliases live in the new file) and defer the *literal* collapse (single shared
singleton) to P3.M1 (agent rewire) + P4.M1 (legacy literal removal). Once agent.ts reads the
harness path and the legacy `'anthropic'`/`'opencode'` literals are gone, the legacy singleton
is removed and the aliases truly delegate.

## 5. `provider-config.ts` becomes a re-export shim

Since the legacy implementation MOVES into `harness-config.ts` (so the aliases "live there" per
the contract), `provider-config.ts` becomes a 1-block re-export shim:

```ts
export { configureProviders, getGlobalProviderConfig, resolveProviderConfig, resetGlobalConfig }
  from './harness-config.js';
```

This keeps `agent.ts:45`, `utils/index.ts:3`, and all 4 legacy test files green with **zero
edits** (they all import from `'...provider-config.js'`).

## 6. Type-compatibility facts enabling the delegation

- `ProviderOptions` is a **superset** of `HarnessOptions` (adds sessionStore/sessionPersistence/
  sessionTtl/sessionPath — see `src/types/providers.ts`). So `{ ...HarnessOptions }` spread is
  assignable to `ProviderOptions`; the `options as ProviderOptions` cast on the return is sound.
- `resolveHarnessConfig` does NOT validate ids — it only does nullish-coalescing + object-spread.
  The `'anthropic'`/`'opencode'` literals pass through as opaque keys.
- `isolatedModules: true` in tsconfig → must use `import type` for type-only imports (the codebase
  already does this).

## 7. Validation gates (verified)

| Command | What it does | What it catches |
|---------|--------------|-----------------|
| `npm run lint` | `tsc --noEmit` (**excludes `src/__tests__`**) | broken non-test types (agent.ts, utils barrels) |
| `npm test` | `vitest run` (esbuild transpile-only) | test failures + module-resolution errors |
| `npm run build` | `tsc` | declaration-emit sanity |

`npm run lint` is the ONLY gate that type-checks non-test `src/`. tsconfig has NO
`noUnusedLocals`/`noUnusedParameters` → unused imports are not lint errors.

## 8. PRD §7.7 cascade ordering (for the test)

Contract is explicit: `harness = promptHarness ?? agentHarness ?? globalConfig.defaultHarness`
(first-defined-wins via nullish-coalescing). Options merge with last-write-wins:
`{ ...global.harnessDefaults?.[harness], ...agentOptions, ...promptOptions }`. This is byte-for-byte
the existing `resolveProviderConfig` algorithm, renamed. (PRD §7.7's top-down diagram lists
global→agent→prompt as "priority for defaults"; the nullish-coalescing makes prompt win — the
contract resolves this ambiguity in favor of prompt-wins, matching the existing code.)
