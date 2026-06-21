# PRP — P1.M1.T2.S2: End-to-end regression test — `new Agent({ model })` with ZERO setup works; smoke-test example 02 launch

**Scope**: Bugfix `001_a8d42149bc87` → Milestone P1.M1 (Critical — Issues 1 + 4) → Task T2 (Default harness registration safety net — Issue 4) → **Subtask S2**.
**Type**: TEST-ONLY. This subtask writes **zero production code** — it adds the regression tests that prove the already-landed Milestone M1 fix works end-to-end. It is the **ultimate acceptance criterion for Milestone M1**.
**Prerequisites (both Complete & merged)**:
- **P1.M1.T1.S1** (commit `adbdc5c`) — `src/core/agent.ts` rewired to `getGlobalHarnessConfig()` / `resolveHarnessConfig()` at all three resolution sites; legacy `getGlobalProviderConfig` no longer drives the harness axis.
- **P1.M1.T2.S1** (commit `b529564`) — `registerDefaultHarnesses` exported from `src/index.ts:135`; lazy auto-registration safety net active in `src/core/agent.ts` at all three sites (guarded on `'pi' | 'claude-code'`).

---

## Goal

**Feature Goal**: Add a dedicated regression test proving the **documented primary user journey** works end-to-end with **zero setup**: `new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })` — with NO `configureHarnesses()` call, NO `registerDefaultHarnesses()` call, and NO manual `registry.register(...)` — does NOT throw and resolves to a real `'pi'` harness, with both built-in harnesses (`'pi'` + `'claude-code'`) materialized in the registry by the auto-registration safety net. Additionally add a smoke test that **replicates the exact launch sequence of `examples/harnesses/02-harness-configuration.ts`** (the shipped reproducer) and asserts it no longer crashes on construction.

**Deliverable**:
1. **`src/__tests__/unit/agent-zero-setup.test.ts`** — a NEW test file containing two `describe` blocks:
   - **Block A** — "Zero-setup journey (PRD §7.6 / Issue 1 + Issue 4)": construct `new Agent({ model })` in a freshly-reset registry with NO setup calls; assert no-throw, `agent.config.harness === 'pi'`, and `registry.has('pi') && registry.has('claude-code')` (auto-register populated BOTH defaults).
   - **Block B** — "Example 02 launch smoke (the shipped reproducer)": replicate the example's launch sequence (`configureHarnesses({ defaultHarness: 'pi', ... })` + manual `registry.register(new ClaudeCodeHarness())` / `new PiHarness()` + `new Agent({ name: 'DefaultAgent' })` with NO harness) and assert no-throw + resolves to `'pi'`. Stops BEFORE any `agent.prompt()` (no SDK / network).
2. (Optional) a short research note at `plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M1T2S2/research/research-notes.md` (already written during planning — not required for the implementer).

**Success Definition**:
1. `npm test` (`vitest run`) is GREEN for the new file and the full suite remains green except the known-unrelated pre-existing Issue 5 unicode failure (`src/__tests__/adversarial/edge-case.test.ts`).
2. `npm run lint` (`tsc --noEmit`) remains GREEN (no production-source changes; tests are excluded from tsc anyway, but keep them type-clean).
3. The zero-setup test asserts `agent.config.harness === 'pi'` via the PUBLIC API (no private-field access needed for the primary assertion).
4. The zero-setup test asserts BOTH `HarnessRegistry.getInstance().has('pi')` AND `.has('claude-code')` are `true` after construction — proving the full default set was auto-registered (distinct from cascade-matrix scenario 4, which only checks the resolved id).
5. The example-02 smoke replicates the exact sequence through the construction crash point (example L70-99 + L121) and asserts no throw.
6. The file header documents the "fail-on-pre-fix" expectation: pre-T1.S1 both assertions threw `Harness 'anthropic' is not registered`; post-fix they pass.

---

## User Persona

**Target User**: Groundswell core maintainers + CI. This is the **Milestone M1 acceptance gate** — the proof that Issue 1 + Issue 4 are resolved end-to-end and that the shipped example + the PRD §7.6 quickstart (`new Agent({ model })`) work on first use.

**Use Case**: A new user follows the PRD §7.6 quickstart (or runs the shipped `02-harness-configuration.ts` example) with no prior `configureHarnesses()` / `registerDefaultHarnesses()` / `registry.register(...)` calls. Their `new Agent({ model })` must construct successfully and resolve to the `'pi'` default harness. This test encodes that contract as a permanent regression guard so the bug (which slipped through precisely because this default-resolution path had **zero** test coverage — see PRD §h2.4) can never silently return.

**Pain Points Addressed**:
- The shipped example crashed on launch (`Harness 'anthropic' is not registered`) — PRD §h3.0 reproducer.
- The PRD §7.6 minimal repro (`configureHarnesses({defaultHarness:'pi'}) + new Agent({model})`) failed — Issue 1.
- The even stricter "nothing configured" case failed — Issue 4 (compounds Issue 1: empty registry + no auto-register).
- None of these paths had regression coverage (PRD §h2.4 "Areas needing more attention").

---

## Why

- **Closes the coverage gap that let the bug ship.** PRD §h2.4 explicitly flags "integration of the new public API with the `Agent` (the default-resolution cascade path had zero test coverage — root cause of Issue 1)." This test is the direct remediation.
- **Encodes the documented primary user journey (architecture/system_context.md §3) as a contract.** The quickstart `new Agent({ model })` and the example-02 launch are the two most-trafficked entry points; both must be regression-guarded.
- **Proves the Issue 1 + Issue 4 compound fix together** — neither dependency alone suffices. T1.S1 (cascade rewire) makes the global default `'pi'` reach the Agent; T2.S1 (auto-register) materializes a real `'pi'` instance when the registry is empty. Only the combination makes zero-setup work. This test is the ONLY place that asserts the compound outcome with the "both defaults registered" strengthening.
- **Distinct from cascade-matrix scenario 4.** The matrix's scenario 4 (`agent-harness-cascade-matrix.test.ts`) asserts only `agent.harness.id === 'pi'` via private-field access. This dedicated test adds: explicit `not.toThrow()`, the public `agent.config.harness` assertion, the BOTH-defaults-registered assertion, and the example-02 launch smoke. Do not collapse them — see Anti-Patterns.

---

## What

### User-visible behavior (test-encoded)

1. **Zero-setup construction**: `new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })` with a freshly-reset registry and NO global config / NO registration calls does NOT throw; the resulting Agent resolves to the `'pi'` harness; the registry ends up containing BOTH `'pi'` and `'claude-code'` (the auto-registration safety net materialized the full default set).
2. **Example-02 launch**: the exact launch sequence of `examples/harnesses/02-harness-configuration.ts` (lines 70-99 + 121) runs through Agent construction without throwing, resolving to `'pi'`.

### Technical requirements

- **File placement**: `src/__tests__/unit/agent-zero-setup.test.ts` (rationale in Context §"Glob constraint" — the `examples/__tests__` glob collects `.test.tsx` only, so a `.test.ts` smoke test belongs under `src/__tests__/`).
- **Test isolation**: `beforeEach`/`afterEach` reset BOTH the registry (`HarnessRegistry['_resetForTesting']()`) and the global harness config (`resetGlobalHarnessConfig()`). The zero-setup test triggers auto-register (side-effect: populates the singleton), so reset is mandatory for inter-test / inter-file cleanliness.
- **No SDK mocking**: construction does not call the Pi/Anthropic SDK. The smoke stops BEFORE `agent.prompt()` / `registry.initializeProvider()` (no network, no API key needed).
- **Public-API assertions preferred**: use `agent.config.harness` (public) for the primary harness-id assertion. Private-field access (`agent.harness.id`) is allowed as a secondary assertion with `// @ts-expect-error - Testing private property`.

### Success Criteria

- [ ] New file `src/__tests__/unit/agent-zero-setup.test.ts` exists and is collected by `vitest run` (matches `src/__tests__/**/*.test.ts` glob).
- [ ] Block A "zero-setup" test passes: `new Agent({ model })` with empty registry + NO setup → no throw, `agent.config.harness === 'pi'`, `registry.has('pi') && registry.has('claude-code')`.
- [ ] Block B "example-02 launch smoke" passes: replicated L70-99 + L121 sequence → no throw, resolves to `'pi'`.
- [ ] `npm test` green except the known-unrelated Issue 5 unicode failure.
- [ ] `npm run lint` green.
- [ ] No production source files modified (`git diff --stat -- src/` shows ZERO non-test changes; the only change is the new test file).
- [ ] File header documents the fail-on-pre-fix expectation (`Harness 'anthropic' is not registered`).

---

## All Needed Context

### Context Completeness Check

✅ **Pass.** An implementer with no prior knowledge can do this using only: (a) the two exact test bodies in the Implementation Blueprint (copy-adapt), (b) read-only access to `examples/harnesses/02-harness-configuration.ts` (the sequence to replicate), `src/core/agent.ts` (to confirm the resolution variable / public `config.harness`), `src/harnesses/register-defaults.ts` (to confirm both ids register), and the existing `src/__tests__/unit/agent-harness-cascade-matrix.test.ts` (the lifecycle-reset idiom to mirror). No external/library research required.

### Documentation & References

```yaml
# MUST READ — the file whose launch sequence Block B replicates (the shipped reproducer).
- file: examples/harnesses/02-harness-configuration.ts
  why: "Block B replicates its exact LAUNCH sequence to prove the example no longer crashes on construction.
        L70-77 configureHarnesses({defaultHarness:'pi',...}); L98-99 manual register of ClaudeCodeHarness + PiHarness;
        L121-124 new Agent({name:'DefaultAgent'}) with NO harness — the crash point."
  pattern: "configureHarnesses({defaultHarness:'pi', defaultModelProvider:'anthropic', harnessDefaults:{...}})
            → registry.register(new ClaudeCodeHarness()) → registry.register(new PiHarness())
            → new Agent({name:'DefaultAgent'}) → assert no throw + resolves 'pi'."
  gotcha: "STOP before L100-103 registry.initializeProvider('claude-code',{apiKey}) and before any agent.prompt()
           (L193+). Those call the real SDK / need a real API key — out of scope for a launch smoke. The crash
           reproducer is the construction at L121, so that is where the smoke ends."

# MUST READ — confirms the public assertion target + the resolution variable name.
- file: src/core/agent.ts
  why: "Constructor (post-T1.S1/T2.S1): reads getGlobalHarnessConfig()/resolveHarnessConfig(); var `effectiveHarness`;
        safety-net block guarded on ('pi' || 'claude-code') calls registerDefaultHarnesses(registry) on miss;
        sets this.harness = harnessInstance. ALSO confirms the public surface: agent.config exposes `harness`."
  pattern: "this.harnessId = config.harness ?? (config.provider as HarnessId | undefined);  ... effectiveHarness = resolved.harness; ...
            if (!harnessInstance && (effectiveHarness === 'pi' || effectiveHarness === 'claude-code')) { registerDefaultHarnesses(registry); harnessInstance = registry.get(effectiveHarness)... }"
  gotcha: "Prefer asserting agent.config.harness (public) over the private agent.harness.id — avoids @ts-expect-error.
           `config.harness` reflects the resolved id once the constructor runs the cascade (see AgentConfig in src/types/agent.ts)."

# MUST READ — confirms registerDefaultHarnesses registers BOTH ids (justifies the strengthened assertion).
- file: src/harnesses/register-defaults.ts
  why: "L28-48: registerDefaultHarnesses registers ClaudeCodeHarness (id 'claude-code') AND PiHarness (id 'pi'),
        each guarded by registry.has(id). This is WHY the zero-setup test can assert BOTH has('pi') and has('claude-code')."
  pattern: "if (!registry.has('claude-code')) registry.register(new ClaudeCodeHarness()); if (!registry.has('pi')) registry.register(new PiHarness());"

# MUST READ — the existing cascade-matrix test (the lifecycle-reset idiom to mirror; the test to NOT duplicate).
- file: src/__tests__/unit/agent-harness-cascade-matrix.test.ts
  why: "Mirror its beforeEach/afterEach reset pattern (resetGlobalHarnessConfig + resetGlobalConfig + HarnessRegistry['_resetForTesting'] + vi.clearAllMocks).
        Its scenario 4 (it.skipIf(!AUTO_REGISTER_ACTIVE)) already covers zero-setup at the 'resolves to pi' level —
        DO NOT duplicate; this task's Block A is STRONGER (no-throw + both-defaults-registered + public config.harness)."
  pattern: "beforeEach(() => { resetGlobalHarnessConfig(); HarnessRegistry['_resetForTesting'](); vi.clearAllMocks(); });"
  gotcha: "resetGlobalConfig (legacy singleton) is imported from '../../utils/provider-config.js'. Include BOTH resets
           for defense-in-depth (the matrix does). resetGlobalHarnessConfig is the one that matters for the new cascade."

# MUST READ — the test conventions cheat sheet.
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/test-patterns-and-conventions.md
  why: "§4 (vitest.config.ts glob — examples/__tests__ is .tsx-only), §5 (npm scripts: test=vitest run, lint=tsc --noEmit
        EXCLUDES src/__tests__), §9 (.js specifiers for .ts; import type; isolatedModules), §10 (registry reset +
        vi.clearAllMocks conventions; @ts-expect-error discipline for private access)."
  critical: "lint does NOT type-check tests — type errors surface only at vitest run. Keep tests type-clean regardless."

# SHOULD READ — the Issue 1 scout report (the documented primary user journey + the example reproducer).
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/issue1-agent-harness-resolution.md
  why: "§8 quotes example 02 L70-71 + L121-124 verbatim and confirms the crash. §3 (system_context.md) documents the
        primary user journey. These are the authoritative references for what 'launch' means."
  section: "§8 (Example reproducer) + §Start Here #3."

# SHOULD READ — the T2.S1 PRP (the auto-registration contract this test proves).
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M1T2S1/PRP.md
  why: "Documents the lazy auto-registration safety net (guarded on 'pi'|'claude-code', idempotent via has()). Its
        Success Definition #2 is exactly what Block A asserts. Confirms no production code is this task's scope."
```

### Current Codebase tree (relevant slice)

```bash
src/
  core/
    agent.ts                       # post-T1.S1/T2.S1: cascade + safety net LIVE here (read-only for this task)
  harnesses/
    register-defaults.ts           # registers BOTH 'pi' + 'claude-code' (read-only)
    harness-registry.ts            # getInstance/has/get/register/_resetForTesting (read-only)
  utils/
    harness-config.ts              # configureHarnesses/resetGlobalHarnessConfig/getGlobalHarnessConfig (read-only)
    provider-config.ts             # resetGlobalConfig (legacy singleton reset, read-only)
  index.ts                         # exports Agent, configureHarnesses, HarnessRegistry, PiHarness, ClaudeCodeHarness, registerDefaultHarnesses (read-only)
  __tests__/
    unit/
      agent.test.ts                              # EXISTING — has a configureHarnesses block (do not edit)
      agent-harness-cascade-matrix.test.ts       # EXISTING — scenario 4 covers zero-setup at id level (do not duplicate)
      agent-zero-setup.test.ts                   # ← CREATE (this task)
examples/
  harnesses/
    02-harness-configuration.ts     # the shipped reproducer (Block B replicates its launch sequence; do not edit)
  utils/
    helpers.ts                      # NOT needed (we stop before any prompt/printing)
  __tests__/                        # glob collects .test.tsx ONLY — NOT where this test goes
    workflow-tree*.test.tsx
```

### Desired Codebase tree with files to be added/changed

```bash
src/__tests__/unit/agent-zero-setup.test.ts   # NEW — Block A (zero-setup) + Block B (example-02 launch smoke)
# (No other files modified. Zero production changes.)
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL #1 — Test placement: examples/__tests__ glob is .tsx-ONLY.
//   vitest.config.ts: include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx',
//                                   'examples/__tests__/**/*.test.tsx']
//   A `.test.ts` file under examples/__tests__ would NOT be collected. Our smoke has no JSX/ink,
//   so forcing .tsx would be artificial. Place BOTH blocks in src/__tests__/unit/agent-zero-setup.test.ts.

// CRITICAL #2 — DO NOT import examples/harnesses/02-harness-configuration.ts directly.
//   It has a TOP-LEVEL guard (L36-40): if (!process.env.ANTHROPIC_API_KEY) { ... process.exit(1); }
//   Importing it without the env var KILLS the test process. And runHarnessConfigurationExample()
//   calls agent.prompt() 4× (real SDK / network). REPLICATE the launch sequence instead (stop at L121).
//   The work item explicitly allows this: "imports ... OR replicates its exact sequence".

// CRITICAL #3 — Stop the example smoke BEFORE any SDK call.
//   Replicate through L121 (new Agent construction). Do NOT call registry.initializeProvider('claude-code',{apiKey})
//   (L100-103) or agent.prompt() (L193+). The crash reproducer is the construction; everything after needs a real
//   API key / SDK client and is out of scope for a unit-level launch smoke.

// CRITICAL #4 — The zero-setup test TRIGGERS auto-register (a side-effect on the singleton).
//   After `new Agent({model})` the registry contains real PiHarness + ClaudeCodeHarness. beforeEach/afterEach MUST
//   reset (HarnessRegistry['_resetForTesting']() + resetGlobalHarnessConfig()) or the populated registry leaks into
//   the next test / other files. Mirror agent-harness-cascade-matrix.test.ts's lifecycle exactly.

// GOTCHA #5 — Prefer the PUBLIC agent.config.harness for the primary harness-id assertion.
//   It avoids @ts-expect-error. Private agent.harness.id is fine as a SECONDARY assertion (with the directive).
//   Read src/types/agent.ts (AgentConfig) to confirm the `harness` field is exposed on config.

// GOTCHA #6 — imports use `.js` specifiers for `.ts` source (bundler resolution); types via `import type`.
//   isolatedModules: true. e.g. import { Agent } from '../../core/agent.js';
//                     import type { HarnessId } from '../../types/harnesses.js';

// GOTCHA #7 — npm run lint (tsc --noEmit) EXCLUDES src/__tests__. Test type errors surface ONLY at vitest run.
//   Keep tests type-clean anyway (esbuild is permissive but don't rely on that).

// GOTCHA #8 — `new PiHarness()` and `new ClaudeCodeHarness()` constructors are SAFE and synchronous (no SDK calls).
//   The test-patterns doc confirms initialize() is also SDK-free ("REAL initialize() — no SDK calls yet"), but we
//   do not even need initialize() for a construction smoke — so Block B's manual register of real instances is safe.

// SCOPE BOUNDARIES (DO NOT):
//   - Do NOT modify any production source (src/core/agent.ts, src/harnesses/*, src/utils/*, src/index.ts).
//   - Do NOT modify the example file (examples/harnesses/02-harness-configuration.ts) — replicate, don't edit.
//   - Do NOT edit the existing cascade-matrix test or agent.test.ts — add a SIBLING file, don't duplicate.
//   - Do NOT add tests under examples/__tests__ (glob won't collect .test.ts).
//   - Do NOT attempt to fix Issue 5 (unicode workflow names) — pre-existing, out of scope.
//   - Do NOT touch Issue 2 (PiHarness toolExecutor) or Issue 3 (metadata.provider) — separate milestones.
```

---

## Implementation Blueprint

### Data models and structure

None. This task creates no types, no schemas, no production code. It only consumes the public API
(`Agent`, `configureHarnesses`, `HarnessRegistry`, `PiHarness`, `ClaudeCodeHarness`) and asserts behavior.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ the references (NO edits)
  - READ examples/harnesses/02-harness-configuration.ts (L36-40 guard, L70-77 configureHarnesses, L98-99 register,
        L121-124 the crash point). Confirm the exact sequence Block B must replicate and where to STOP (before L100).
  - READ src/__tests__/unit/agent-harness-cascade-matrix.test.ts (the beforeEach/afterEach reset idiom + the
        AUTO_REGISTER_ACTIVE probe — mirror the lifecycle, do NOT duplicate scenario 4).
  - READ src/core/agent.ts constructor (confirm effectiveHarness + the safety-net block + that agent.config.harness
        is the public reflection of the resolved id).
  - READ src/harnesses/register-defaults.ts (confirm BOTH 'pi' + 'claude-code' register).

Task 2: CREATE src/__tests__/unit/agent-zero-setup.test.ts — file header + imports + lifecycle
  - FILE: src/__tests__/unit/agent-zero-setup.test.ts  (NEW)
  - HEADER: a block comment documenting purpose ("Milestone M1 acceptance gate — zero-setup Agent construction
        + example-02 launch smoke, PRD §7.6 / §h3.0 / §h3.3 / architecture §3"), the dependency chain
        (requires P1.M1.T1.S1 + P1.M1.T2.S1, both Complete), and the fail-on-pre-fix expectation:
        "Pre-T1.S1/T2.S1 both assertions threw 'Harness \'anthropic\' is not registered'; post-fix they pass."
  - IMPORTS (relative + .js; `import type` for types):
        import { describe, it, expect, beforeEach, afterEach } from 'vitest';
        import { Agent } from '../../core/agent.js';
        import { HarnessRegistry } from '../../harnesses/harness-registry.js';
        import { PiHarness } from '../../harnesses/pi-harness.js';
        import { ClaudeCodeHarness } from '../../harnesses/claude-code-harness.js';
        import { configureHarnesses, resetGlobalHarnessConfig } from '../../utils/harness-config.js';
        import { resetGlobalConfig } from '../../utils/provider-config.js';
        import type { HarnessId } from '../../types/harnesses.js';
  - LIFECYCLE (mirror agent-harness-cascade-matrix.test.ts): in beforeEach AND afterEach call:
        resetGlobalHarnessConfig();
        resetGlobalConfig();
        HarnessRegistry['_resetForTesting']();
        (vi.clearAllMocks() not strictly needed — no mocks — but harmless to omit; do not import vi if unused.)
  - NAMING: the two top-level describes:
        'Zero-setup Agent construction (PRD §7.6 / §h3.0 — Issues 1 + 4 end-to-end)'
        'Example 02 launch smoke (examples/harnesses/02-harness-configuration.ts reproducer)'
  - PLACEMENT: src/__tests__/unit/ (matches `src/__tests__/**/*.test.ts` glob).

Task 3: Block A — zero-setup test (inside the first describe)
  - TEST NAME: it('constructs new Agent({model}) with NO setup (empty registry, no configureHarnesses) and resolves to "pi"', ...)
  - ARRANGE: beforeEach already reset the registry + global config. Do NOT call configureHarnesses.
            Do NOT call registerDefaultHarnesses. Do NOT call registry.register.
  - ACT+ASSERT (constructor-only — no SDK):
        // 1. Does not throw (the keystone Issue-1 regression guard — explicit, where the matrix only checks the id).
        const agent = expect(() => new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })).not.toThrow();
        // 2. Resolves to 'pi' via the PUBLIC config (preferred — no @ts-expect-error).
        const a = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });
        expect(a.config.harness).toBe('pi');
        // 3. Auto-register materialized BOTH built-in defaults (distinct from cascade-matrix scenario 4).
        expect(HarnessRegistry.getInstance().has('pi')).toBe(true);
        expect(HarnessRegistry.getInstance().has('claude-code')).toBe(true);
        // 4. (optional secondary) private-field confirmation with the directive:
        //    // @ts-expect-error - Testing private property
        //    expect(a.harness.id).toBe('pi');
  - NOTE: construct the Agent ONCE and reuse the reference; the sketch above constructs twice only to show the
          `not.toThrow()` form vs the instance form — collapse to one `const a = new Agent(...)` after the not.toThrow.
          Cleanest: `const a = new Agent({ model: '...' }); expect(a.config.harness).toBe('pi'); ...`
          and a SEPARATE `expect(() => new Agent({ model: '...' })).not.toThrow();` if you want the explicit no-throw
          line (two constructions are cheap — no SDK). Pick ONE style and be consistent.

Task 4: Block B — example-02 launch smoke (inside the second describe)
  - TEST NAME: it('replicates example 02 launch (configureHarnesses + manual register + no-harness Agent) without throwing', ...)
  - ARRANGE/ACT — replicate examples/harnesses/02-harness-configuration.ts L70-99 + L121, stopping BEFORE L100:
        // L70-77 equivalent: global config (harnessDefaults can be trimmed; the crash reproducer only needs defaultHarness).
        configureHarnesses({
          defaultHarness: 'pi',
          defaultModelProvider: 'anthropic',
          harnessDefaults: {
            'claude-code': { apiKey: 'dummy-not-used-construction-only', timeout: 30000 },
          },
        });
        // L98-99 equivalent: the example's manual registration (old-style; auto-register makes this redundant but
        // the example still does it — replicating faithfully proves the example launches).
        const registry = HarnessRegistry.getInstance();
        registry.register(new ClaudeCodeHarness());
        registry.register(new PiHarness());
        // L121-124 equivalent: the CRASH POINT — no harness field, inherits global 'pi'.
        const agent = new Agent({ name: 'DefaultAgent' /* no harness */ });
  - ASSERT:
        expect(() => new Agent({ name: 'DefaultAgent' })).not.toThrow();  // explicit no-throw at the crash point
        expect(agent.config.harness).toBe('pi');                          // resolves to global default 'pi'
  - DO NOT call registry.initializeProvider('claude-code', {apiKey}) (L100-103) or agent.prompt() (L193+).
  - GOTCHA: registry.register() THROWS on duplicate id. Because beforeEach reset the registry, the manual register
            here is safe. But if you ALSO trigger auto-register in the same test, registerDefaultHarnesses's has()
            guard prevents the duplicate. Either way — reset-first keeps it clean.

Task 5: RUN validation (lint + targeted + full suite)
  - RUN: npm run lint                                   # EXPECT green (no src/ changes; tests excluded from tsc).
  - RUN: npx vitest run src/__tests__/unit/agent-zero-setup.test.ts   # EXPECT both blocks green.
  - RUN: npm test                                       # EXPECT green except Issue 5 unicode (pre-existing, unrelated).
  - RUN: git diff --stat -- src/                        # EXPECT only the new test file (zero production changes).
  - DEPENDENCIES: Tasks 2-4 complete.
```

### Implementation Patterns & Key Details

```typescript
// === File header (paste at top of agent-zero-setup.test.ts) ===
/**
 * Milestone M1 acceptance gate — zero-setup Agent construction + example-02 launch smoke.
 *
 * Proves the documented primary user journey (architecture/system_context.md §3) works end-to-end
 * with NO setup: `new Agent({ model })` — no configureHarnesses(), no registerDefaultHarnesses(),
 * no registry.register() — resolves to a real 'pi' harness with BOTH built-in defaults materialized
 * by the auto-registration safety net. Also replicates the shipped example 02 launch sequence.
 *
 * Dependencies (BOTH Complete):
 *   - P1.M1.T1.S1 (commit adbdc5c): Agent reads getGlobalHarnessConfig/resolveHarnessConfig (Issue 1).
 *   - P1.M1.T2.S1 (commit b529564): registerDefaultHarnesses exported + lazy auto-register safety net (Issue 4).
 *
 * Fail-on-pre-fix honesty: pre-T1.S1/T2.S1 both assertions threw
 *   `Harness 'anthropic' is not registered` (legacy singleton default 'anthropic', empty registry).
 * Post-fix they pass. This file is the permanent regression guard for that compound journey.
 */

// === Lifecycle (mirror agent-harness-cascade-matrix.test.ts) ===
beforeEach(() => {
  resetGlobalHarnessConfig();
  resetGlobalConfig();
  HarnessRegistry['_resetForTesting']();
});

afterEach(() => {
  resetGlobalHarnessConfig();
  resetGlobalConfig();
  HarnessRegistry['_resetForTesting']();
});

// === Block A — zero-setup (CONSTRUCTOR-ONLY, no SDK) ===
it('constructs new Agent({model}) with NO setup and resolves to "pi"; auto-registers BOTH defaults', () => {
  // beforeEach reset everything. Do NOT configureHarnesses / registerDefaultHarnesses / registry.register.
  const a = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });
  expect(a.config.harness).toBe('pi');                              // public-API assertion (no @ts-expect-error)
  expect(HarnessRegistry.getInstance().has('pi')).toBe(true);       // auto-register materialized BOTH
  expect(HarnessRegistry.getInstance().has('claude-code')).toBe(true);
});

it('does not throw when constructing with zero setup', () => {
  expect(() => new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })).not.toThrow();
});

// === Block B — example-02 launch smoke (replicate L70-99 + L121; STOP before L100/prompt) ===
it('replicates example 02 launch without throwing (configureHarnesses + manual register + no-harness Agent)', () => {
  // L70-77: global config (harnessDefaults trimmed to the reproducer-relevant key).
  configureHarnesses({
    defaultHarness: 'pi',
    defaultModelProvider: 'anthropic',
    harnessDefaults: { 'claude-code': { apiKey: 'dummy-not-used-construction-only', timeout: 30000 } },
  });
  // L98-99: the example's manual registration (old-style; still works post-auto-register).
  const registry = HarnessRegistry.getInstance();
  registry.register(new ClaudeCodeHarness());
  registry.register(new PiHarness());
  // L121-124: the CRASH POINT — no harness field, inherits global 'pi'.
  const agent = new Agent({ name: 'DefaultAgent' /* no harness */ });
  expect(agent.config.harness).toBe('pi');
});

// === Why this is distinct from cascade-matrix scenario 4 ===
//   scenario 4 (agent-harness-cascade-matrix.test.ts) asserts ONLY agent.harness.id === 'pi' via private-field
//   access, behind it.skipIf(!AUTO_REGISTER_ACTIVE). Block A here adds: explicit not.toThrow(), the PUBLIC
//   config.harness assertion, the BOTH-defaults-registered strengthening, and the example-02 launch smoke.
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (no env vars — Block B uses a dummy apiKey string that is NEVER sent; construction does not call the SDK)
ROUTES: none
REGISTRY:
  - Block A READS HarnessRegistry.getInstance().has('pi'/'claude-code') after construction (auto-register side-effect).
  - Block B WRITES via registry.register(new ClaudeCodeHarness()/new PiHarness()) (replicating the example).
  - Both blocks reset the registry in beforeEach/afterEach → no cross-test leakage.
PUBLIC API:
  - Consumes only already-exported symbols: Agent, configureHarnesses, HarnessRegistry, PiHarness, ClaudeCodeHarness.
    (registerDefaultHarnesses is also exported but Block A deliberately does NOT call it — that is the point.)
IMPORTS:
  - All from relative paths with .js specifiers. No new public exports needed (this is test-only).
```

---

## Validation Loop

> **Toolchain note:** TypeScript + vitest. `npm run lint` = `tsc --noEmit` (production source only; tests EXCLUDED
> per tsconfig). `npm test` = `vitest run`. There is NO eslint/prettier/ruff/mypy.

### Level 1: Syntax & Type Check

```bash
# Type-check production source (should be unchanged → green). Tests are excluded from tsc.
npm run lint
# Expected: zero errors. (This task changes no production source, so this is a regression-guard that
# nothing was accidentally edited.)

# Confirm the new file is syntactically clean (vitest's esbuild will transpile it; tsc won't check it):
npx vitest run src/__tests__/unit/agent-zero-setup.test.ts --reporter=verbose
# Expected: the file loads (no syntax/import errors) and both describe blocks run.
```

### Level 2: Unit Tests (Component Validation)

```bash
# The new file in isolation — fast feedback:
npx vitest run src/__tests__/unit/agent-zero-setup.test.ts --reporter=verbose
# Expected: 3 tests pass (Block A: zero-setup resolves 'pi' + both-defaults-registered; Block A: no-throw;
#           Block B: example-02 launch smoke resolves 'pi').

# Confirm we did NOT accidentally break the existing harness-resolution tests:
npx vitest run src/__tests__/unit/agent.test.ts
npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts --reporter=verbose
# Expected: both green. Cascade-matrix scenario 4 STILL runs (AUTO_REGISTER_ACTIVE stayed true) — unaffected.

# Full suite:
npm test
# Expected: GREEN except the known-unrelated pre-existing failure:
#   src/__tests__/adversarial/edge-case.test.ts > "should handle unicode in workflow names"
# (Issue 5 — OUT OF SCOPE; do not attempt to fix it here.)
```

### Level 3: Integration / Launch Validation (manual one-liners)

```bash
# Smoke-test the exact PRD §h3.0 minimal repro by hand (proves the journey outside vitest too):
npx tsx -e '
  import("./src/index.js").then(async ({ Agent, HarnessRegistry }) => {
    HarnessRegistry["_resetForTesting"]();
    const a = new Agent({ model: "anthropic/claude-sonnet-4-20250514" });
    console.log("config.harness:", a.config.harness);                          // expect: pi
    console.log("has pi:", HarnessRegistry.getInstance().has("pi"));           // expect: true
    console.log("has claude-code:", HarnessRegistry.getInstance().has("claude-code")); // expect: true
  });
'
# Expected:
#   config.harness: pi
#   has pi: true
#   has claude-code: true
# (Before T1.S1/T2.S1 this threw "Harness 'anthropic' is not registered".)

# Launch the shipped example to confirm the real reproducer is gone (needs a dummy key to pass the L36 guard;
# it will then construct agents fine and only fail later at agent.prompt() with a network/auth error — that is
# EXPECTED and OUT OF SCOPE: the launch crash at L121 is what we fixed, and it no longer occurs):
ANTHROPIC_API_KEY=sk-dummy npx tsx examples/harnesses/02-harness-configuration.ts 2>&1 | head -40
# Expected: reaches Part 2/3 (Agent construction + prompt attempts). It must NOT throw
# "Harness 'anthropic' is not registered" at any point. A later network/401 error from agent.prompt()
# is acceptable (the example is a live SDK demo; we only smoke the LAUNCH = construction).

# Confirm the production diff is empty (this task is test-only):
git diff --stat -- src/core src/harnesses src/utils src/index.ts
# Expected: NO output (zero production changes). If anything appears, STOP — out of scope.
git diff --stat -- src/__tests__/
# Expected: ONLY src/__tests__/unit/agent-zero-setup.test.ts (new file).
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Confirm test isolation: run the new file TWICE in sequence (within-file auto-register must not leak
# into the second run — proves beforeEach/afterEach reset works):
npx vitest run src/__tests__/unit/agent-zero-setup.test.ts && npx vitest run src/__tests__/unit/agent-zero-setup.test.ts
# Expected: both runs green.

# Confirm no test-ordering coupling with the cascade matrix (run them together):
npx vitest run src/__tests__/unit/agent-zero-setup.test.ts src/__tests__/unit/agent-harness-cascade-matrix.test.ts
# Expected: all green. (vitest isolates files by module scope; the matrix's module-load probe is contained.)

# Public-API export sanity (registerDefaultHarnesses must still be importable — T2.S1 contract preserved):
node --input-type=module -e "import('./src/index.js').then(m => console.log('Agent:', typeof m.Agent, 'registerDefaultHarnesses:', typeof m.registerDefaultHarnesses))"
# Expected: Agent: function  registerDefaultHarnesses: function
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` green (production source unchanged).
- [ ] `npx vitest run src/__tests__/unit/agent-zero-setup.test.ts` green (both blocks).
- [ ] `npm test` green except the known-unrelated Issue 5 unicode failure.
- [ ] `git diff --stat -- src/core src/harnesses src/utils src/index.ts` → empty (zero production changes).
- [ ] `git diff --stat -- src/__tests__/` → only the new `agent-zero-setup.test.ts`.

### Feature Validation

- [ ] Block A: `new Agent({ model })` with empty registry + NO setup does NOT throw.
- [ ] Block A: `agent.config.harness === 'pi'` (public-API assertion).
- [ ] Block A: `registry.has('pi') && registry.has('claude-code')` (auto-register materialized BOTH defaults).
- [ ] Block B: replicated example-02 launch (L70-99 + L121) does NOT throw and resolves to `'pi'`.
- [ ] Block B STOPS before `registry.initializeProvider` / `agent.prompt()` (no SDK / network).
- [ ] Existing `agent.test.ts` + `agent-harness-cascade-matrix.test.ts` still green (no duplication, no regression).
- [ ] Manual `npx tsx -e` repro prints `config.harness: pi`, `has pi: true`, `has claude-code: true`.
- [ ] File header documents the fail-on-pre-fix expectation (`Harness 'anthropic' is not registered`).

### Code Quality Validation

- [ ] Imports use `.js` specifiers for `.ts` source; types via `import type` (`isolatedModules`).
- [ ] `beforeEach`/`afterEach` reset BOTH singletons + the registry (mirrors cascade-matrix lifecycle).
- [ ] Primary harness-id assertion uses PUBLIC `agent.config.harness` (no unnecessary `@ts-expect-error`).
- [ ] Any private-field access uses `// @ts-expect-error - Testing private property`.
- [ ] Block B faithfully replicates the example's launch sequence (configureHarnesses + manual register + no-harness Agent) and includes an inline comment citing the example line numbers.
- [ ] No production files modified; no examples edited; no other test files edited.

### Documentation & Deployment

- [ ] File header cites PRD §7.6 / §h3.0 / §h3.3 + the two dependency commits.
- [ ] Inline comments explain WHY Block A is stronger than cascade-matrix scenario 4 (so a future reader doesn't "consolidate" them).
- [ ] Inline comment on Block B explains WHY it stops before L100 (no SDK) and that it replicates rather than imports (top-level ANTHROPIC_API_KEY guard hazard).
- [ ] No new env vars or config files.

---

## Anti-Patterns to Avoid

- ❌ **Do NOT import `examples/harnesses/02-harness-configuration.ts` directly.** Its top-level `if (!process.env.ANTHROPIC_API_KEY) process.exit(1)` guard kills the test process on import, and `runHarnessConfigurationExample()` makes real SDK/network calls. Replicate the launch sequence instead (the work item's explicit "OR replicates its exact sequence" branch).
- ❌ **Do NOT call `agent.prompt()` or `registry.initializeProvider()` in the smoke test.** Those need a real API key + SDK client + network. The crash reproducer is the Agent construction (L121); stop there.
- ❌ **Do NOT place the test under `examples/__tests__/`.** That glob collects `.test.tsx` only; a `.test.ts` file there is silently NOT collected. Use `src/__tests__/unit/agent-zero-setup.test.ts`.
- ❌ **Do NOT duplicate cascade-matrix scenario 4.** Add STRONGER, DISTINCT assertions (explicit `not.toThrow()`, public `config.harness`, BOTH-defaults-registered, example-02 smoke). If you only re-assert `agent.harness.id === 'pi'`, the test adds no value over the matrix.
- ❌ **Do NOT edit the cascade-matrix test, `agent.test.ts`, or any production file.** This task is purely additive (one new test file).
- ❌ **Do NOT skip the registry/global-config reset in `beforeEach`/`afterEach`.** Block A triggers auto-register (populates the singleton with real harnesses); without reset, that leaks into subsequent tests/files and causes flaky duplicate-register throws or false positives.
- ❌ **Do NOT assert only via private-field access (`agent.harness.id`).** Prefer the public `agent.config.harness` for the primary assertion; reserve `@ts-expect-error` private access for an optional secondary check.
- ❌ **Do NOT modify the example file to "make it testable."** The example is the reproducer under test; replicating its sequence is the correct approach.
- ❌ **Do NOT bundle a fix for Issue 5 (unicode workflow names).** It is pre-existing and explicitly out of scope; `npm test` is allowed to keep that one failure.
- ❌ **Do NOT assert that `configureHarnesses` was NOT called by spying on it.** The zero-setup contract is about the USER not calling it; the implementation may read `getGlobalHarnessConfig()` internally. Assert observable outcomes (resolved id, registry contents), not call counts.

---

## Confidence Score

**9.5/10** for one-pass implementation success.

Rationale:
- **Test-only** — no production risk; the fix it guards is already merged and verified by the dependency PRPs' own smoke tests (`adbdc5c`, `b529564`).
- **Exact test bodies and lifecycle are spelled out** (copy-adapt from the cascade-matrix idiom; assertions enumerated).
- **The two genuine gotchas — (a) the `examples/__tests__` glob being `.tsx`-only and (b) example 02's top-level `ANTHROPIC_API_KEY` guard + live SDK calls — are both called out with the workaround (place under `src/__tests__/`; replicate, don't import, and stop before `prompt()`).**
- The 0.5 deduction is for the small judgment call of how faithfully to replicate the example's `harnessDefaults`/manual-register block (the PRP says trim is OK and stop before L100) — an implementer might over-replicate and accidentally call `initializeProvider`. The Validation Loop's `npx tsx` repro + the `git diff --stat` guard make any such slip immediately visible.
