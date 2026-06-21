# Regression Test Design — P1.M1.T1.S2

Research notes supporting the PRP. Captures the precise facts an implementer
needs to write a test that (a) passes after P1.M1.T1.S1, (b) FAILS on the
pre-fix code, and (c) does not duplicate existing coverage.

## 1. Why this test is NOT a duplicate of the existing `agent.test.ts` block

P1.M1.T1.S1 (commit `adbdc5c`) already added a `describe('Agent harness resolution')`
block to `src/__tests__/unit/agent.test.ts` with 4 tests. One of them —
`'uses the configured global default harness'` — looks superficially similar:

```ts
it('uses the configured global default harness', () => {
  HarnessRegistry.getInstance().register(createMockHarness('pi' as HarnessId));
  const agent = new Agent();                       // no throw
  expect(agent.name).toBe('Agent');                // ← WEAK: true regardless of harness
});
```

This test is a **weak guard** and does NOT satisfy S2's contract for three reasons:

1. **It never calls `configureHarnesses(...)`.** It relies on the *implicit* default
   (`globalHarnessConfig === null` → `DEFAULT_HARNESS_CONFIG.defaultHarness === 'pi'`).
   The entire root cause of **Issue 1** is that the *public* `configureHarnesses()` API
   was disconnected from the Agent. A test that does not *invoke* `configureHarnesses()`
   cannot prove that wiring is fixed. S2 MUST call
   `configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' })`.

2. **Its assertion (`agent.name === 'Agent'`) is harness-independent.** `name` defaults to
   `'Agent'` regardless of which harness resolved. The test would pass even if the Agent
   resolved to a *different* registered harness. S2 MUST assert the **resolved harness id**
   (`agent.harness.id === 'pi'`), which is the actual regression surface.

3. **It passes no `model`.** S2 must construct `new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })`
   to mirror the shipped `examples/harnesses/02-harness-configuration.ts` / PRD §7.6 quickstart
   that crashed in Issue 1.

→ Conclusion: S2 is a **sibling test**, not a modification of the existing block
(matches the contract: *"do NOT modify it (it guards the legacy regression contract);
add a SIBLING test"* and the architecture doc residual-risk note).

## 2. The resolved harness has NO public accessor

`src/core/agent.ts`:
- Line 92: `private readonly harness: Harness;`
- Line 130: `this.harness = harnessInstance;` (assigned in the constructor)

There is **no `getHarness()` / `getResolvedHarness()` / public getter** (verified by grep —
only `getMcpHandler()` is public, at line 569). Therefore asserting `agent.harness.id`
requires private-field access. Two sanctioned idioms exist in this codebase:

- Bracket notation (used for `_resetForTesting`): `HarnessRegistry['_resetForTesting']()`
- `// @ts-expect-error - private field access for testing` + direct member access
  (used in `harness-parity.test.ts` for `harness.sdk = ...`)

The contract explicitly mandates: *"@ts-expect-error for private field access."*
Recommended assertion:

```ts
// @ts-expect-error - private field access for testing
expect(agent.harness.id).toBe('pi');
```

(Read-only access; no assignment — so bracket `agent['harness'].id` also works without
`@ts-expect-error`, but the contract mandates the `@ts-expect-error` idiom.)

## 3. Fail-on-pre-fix proof (the primary acceptance criterion)

Pre-fix `src/core/agent.ts:117-119` resolved via the LEGACY singleton:

```ts
const globalConfig = getGlobalProviderConfig();   // defaults to defaultProvider: 'anthropic'
const resolved = resolveProviderConfig(globalConfig, this.harnessId, this.harnessOptions);
```

The S2 test sets up:
- `configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' })` → writes the
  **NEW** singleton only (legacy singleton stays `null` → defaults `'anthropic'`)
- Registers **only** `createMockHarness('pi')` (NO `'anthropic'` mock)
- `new Agent({ model: '...' })` with NO harness field

| Code state        | Singleton read       | Resolved id | `registry.get(id)` | Result                              |
|-------------------|-----------------------|-------------|--------------------|-------------------------------------|
| **Pre-fix**       | legacy → `'anthropic'`| `'anthropic'`| `undefined`        | ❌ throws `Harness 'anthropic' is not registered` → **test FAILS** |
| **Post-fix**      | new → `'pi'`          | `'pi'`      | mock pi harness    | ✅ `agent.harness.id === 'pi'` → **test PASSES** |

This is exactly why S2 isolates Issue 1: it uses the **new public API** +
**new default id** and registers only the **new** harness — so only a correctly-rewired
Agent can pass. (It does NOT depend on Issue 4's auto-register, since it registers
`'pi'` manually — per contract point 4.)

## 4. The inverse / "global-default-wins-over-registry" assertion

Contract: *"without `configureHarnesses` and with the registry holding only a mock
`'claude-code'`, `new Agent()` resolves to `'pi'` only if `'pi'` is registered."*

This documents PRD §7.7: the cascade root is `GlobalHarnessConfig.defaultHarness`
(= `'pi'` by default), **not** "the first / only harness present in the registry."

- Registry holds ONLY `createMockHarness('claude-code')`; global config reset (null → default `'pi'`).
- `new Agent()` → resolves `'pi'` → `registry.get('pi')` is `undefined` →
  throws `/Harness 'pi' is not registered/`.
- Then register `'pi'` as well → `new Agent()` → `agent.harness.id === 'pi'`.

This proves the default is the global config value, decoupled from registry contents.
(It complements — does not duplicate — the existing `'throws when the resolved harness
is not registered'` test, which registers neither harness.)

## 5. Reusable assets already present in `agent.test.ts` (no new imports needed)

- Line 8: `import { configureHarnesses, resetGlobalHarnessConfig } from '../../utils/harness-config.js';`
- Line 20: `function createMockHarness(id: HarnessId): Harness` — returns a fully-shaped mock
  (capabilities + all `Harness` methods as `vi.fn()`s). `normalizeModel` is a stub, but the
  Agent constructor never calls it — so the mock is sufficient for a construction-level test.
- Line 9: `import { HarnessRegistry } from '../../harnesses/harness-registry.js';`

A new `describe` block in the same file therefore needs **zero** new imports.

## 6. Constructor does NOT touch the SDK

Verified from `src/core/agent.ts:113-134`: the constructor only does
`registry.get(effectiveHarness)` + `this.harness = harnessInstance` + MCP handler init.
It never calls `harness.initialize()`, `harness.execute()`, or `harness.normalizeModel()`.
→ A `createMockHarness('pi')` is fully sufficient; no Pi/Anthropic SDK mocking required.
(Contrast with `harness-parity.test.ts`, which needs `wirePi`/`wireCc` — those are for
execute-level tests, not construction.)

## 7. Runner / lint facts (from architecture doc §4, §5, §9)

- `npm test` = `vitest run` (single pass, exits).
- Run one file: `npx vitest run src/__tests__/unit/agent.test.ts`.
- Run one describe block: `npx vitest run src/__tests__/unit/agent.test.ts -t "<name substring>"`.
- `npm run lint` = `tsc --noEmit`, but `tsconfig.json` **excludes** `src/__tests__` → the test
  file is NOT type-checked by lint. Type errors surface only at `vitest run` (esbuild, permissive).
  → The `@ts-expect-error` directive is still REQUIRED (esbuild honors it; an unused
  `@ts-expect-error` is reported by some tooling, so only place it directly over private access).
- Imports MUST use `.js` extensions even for `.ts` source (bundler resolution).
- `isolatedModules: true` → type-only imports use `import type`.
