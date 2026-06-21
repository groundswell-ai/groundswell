# Research Notes — P1.M1.T2.S2

> End-to-end regression test: `new Agent({ model })` with ZERO setup works + example-02 launch smoke.
> TEST-ONLY subtask. Both dependencies are **Complete** and merged.

## 1. Dependency state (verified via git log + source read)

| Dependency | Status | Commit | Evidence in source |
|---|---|---|---|
| P1.M1.T1.S1 (rewire Agent to new cascade) | ✅ Complete | `adbdc5c` | `src/core/agent.ts` constructor reads `getGlobalHarnessConfig()` + `resolveHarnessConfig()` (var `effectiveHarness`); legacy `getGlobalProviderConfig` import removed from the harness axis |
| P1.M1.T2.S1 (export + lazy auto-register) | ✅ Complete | `b529564` | `src/index.ts:135` exports `registerDefaultHarnesses`; `src/core/agent.ts` constructor has the safety-net block guarded on `'pi' \|\| 'claude-code'` with `registerDefaultHarnesses(registry)` retry |

**Implication**: this subtask writes NO production code. It only adds regression tests that prove
the already-landed fix works end-to-end. Pre-fix these tests would have thrown
`Harness 'anthropic' is not registered` (legacy singleton default) — now they must pass.

## 2. vitest glob constraint (decides test placement)

`vitest.config.ts` (read in full, 14 lines):
```ts
include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx', 'examples/__tests__/**/*.test.tsx'],
```
- `examples/__tests__` glob catches **`.test.tsx` only**, not `.test.ts`.
- Existing examples/__tests__ files are all ink-component `.tsx` tests (workflow-tree*.test.tsx) —
  unrelated to this harness work.
- Forcing our smoke test to `.tsx` just to use that glob would be artificial (no JSX/ink involved).
- **Decision**: place BOTH the zero-setup test and the example-02 smoke replication in
  `src/__tests__/unit/` as `.test.ts`. This matches the work item's fallback:
  "otherwise replicate the sequence in src/__tests__/".

## 3. Example 02 import hazard (why we REPLICATE, not import)

`examples/harnesses/02-harness-configuration.ts`:
- **L36-40** top-level guard: `if (!process.env.ANTROPIC_API_KEY) { console.error(...); process.exit(1); }`
  → importing the module without the env var **kills the test process**.
- **L271-273** execution guard: `if (import.meta.url === \`file://${process.argv[1]}\`) { runHarnessConfigurationExample()... }`
  → importing does NOT auto-run the body (good), but the top-level guard still fires on import.
- `runHarnessConfigurationExample()` calls `agent.prompt()` 4 times → **real SDK / network calls**.
  Unsuitable for a CI unit test.
- **Conclusion**: the work item's "OR replicates its exact sequence" branch is the correct path.
  Replicate the LAUNCH sequence through the construction crash point (L121) and stop BEFORE any
  `agent.prompt()` (no SDK). This is exactly the "smoke-test example 02 launch" intent — prove the
  example no longer crashes on launch.

## 4. Exact example-02 sequence to replicate (the reproducer)

```ts
// L70-77: global config
configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic', harnessDefaults: { 'claude-code': {...} } });
// L98-99: manual register (the example is "old-style" — auto-register makes this redundant but it still works)
registry.register(new ClaudeCodeHarness());
registry.register(new PiHarness());
// L121-124: the crash point — no harness field, inherits global 'pi'
const agent2 = new Agent({ name: 'DefaultAgent' });
```
Pre-fix: threw `Harness 'anthropic' is not registered` at L121. Post-fix: resolves to `'pi'`.
We stop here (do NOT call `registry.initializeProvider('claude-code', {apiKey})` at L100-103 nor
any `agent.prompt()`). Rationale: the crash reproducer is the construction; initialize/prompt are
out of scope for a launch smoke and would require a real API key / SDK client.

## 5. Distinction from the existing cascade-matrix scenario 4

`src/__tests__/unit/agent-harness-cascade-matrix.test.ts` already has (lines 95-114 + 155-165):
- An `AUTO_REGISTER_ACTIVE` module-level IIFE probe (constructs `new Agent()`, checks `.harness.id === 'pi'`).
- `it.skipIf(!AUTO_REGISTER_ACTIVE)` scenario 4: zero-setup, asserts `agent.harness.id === 'pi'`.

This S2 task must NOT duplicate that. The dedicated acceptance test adds **stronger, distinct** assertions:
- `expect(() => new Agent({ model })).not.toThrow()` — explicit no-throw (cascade-matrix only checks the resolved id).
- After construction, `registry.has('pi') === true` AND `registry.has('claude-code') === true`
  (proves auto-register materialized the FULL default set, not just the resolved one).
- `agent.config.harness === 'pi'` (public observable, not private-field access).
- Documents the M1 acceptance criterion in one place + adds the example-02 smoke (absent from the matrix).

## 6. Test isolation conventions (from test-patterns-and-conventions.md §5/§10)

- `beforeEach`/`afterEach`: `HarnessRegistry['_resetForTesting']()` + `resetGlobalHarnessConfig()`.
  - The zero-setup test triggers auto-register → populates singleton with real PiHarness + ClaudeCodeHarness.
  - Reset is MANDATORY so the next test (and other files) start clean.
- Imports use `.js` specifiers for `.ts` source (bundler resolution); `import type` for types (`isolatedModules`).
- Private-field access needs `// @ts-expect-error - Testing private property` — but prefer the public
  `agent.config.harness` for the harness-id assertion (no @ts-expect-error needed).
- `import { describe, it, expect, beforeEach, afterEach } from 'vitest';` (globals:true but explicit).
- `npm run lint` (`tsc --noEmit`) EXCLUDES `src/__tests__` — test type errors surface only at `vitest run`.

## 7. No SDK mocking needed

Constructor-only assertions do not call the Pi/Anthropic SDK. The work item's mocking note
("If exercising execute/stream, mock the Pi SDK via makeFakeSession") does NOT apply — we stop at
construction. No `makeFakeSession`, no `wirePi`, no async-generator mocks required.

## 8. Fail-on-pre-fix honesty

Cannot re-verify against pre-fix code (deps already merged), but the expectation is documentable:
- Zero-setup test: pre-T1.S1 threw `Harness 'anthropic' is not registered` (legacy singleton default `'anthropic'`, empty registry). Post-fix passes.
- Example-02 smoke: pre-T1.S1 crashed at L121 with the same error. Post-fix: constructs, resolves `'pi'`.
