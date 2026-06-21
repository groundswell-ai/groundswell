# PRP — P1.M1.T2.S1: Export `registerDefaultHarnesses` + guarded lazy auto-registration of the built-in `'pi'` / `'claude-code'` harnesses

**Scope**: Bugfix `001_a8d42149bc87` → Milestone P1.M1 (Critical — Issues 1 + 4) → Task T2 (Default harness registration safety net — Issue 4) → **Subtask S1**.
**Type**: PRODUCTION + TEST-MAINTENANCE. Two production edits (`src/index.ts`, `src/core/agent.ts`) plus updates to 6 existing tests whose throw/error-path assertions become obsolete once auto-registration lands.
**Prerequisite**: P1.M1.T1.S1/S2/S3 are **Complete** — `agent.ts` already reads `getGlobalHarnessConfig()`/`resolveHarnessConfig()` in all three call sites (constructor ~L114, `stream()` ~L367, `executePrompt()` ~L609), and the regression/matrix tests exist.

---

## Goal

**Feature Goal**: Make `registerDefaultHarnesses` a first-class public API symbol AND add a test-safe, idempotent lazy auto-registration safety net so that `new Agent({ model })` — with **zero** `configureHarnesses()` and **zero** manual `registry.register(...)` — resolves to a real `'pi'` harness instead of throwing `Harness 'pi' is not registered`. This is the "OR auto-registration" half of PRD §h3.3's Expected Behavior, implemented in the most test-safe way possible (targeted to the Agent's three `registry.get()` sites, never at module-import time, never inside `HarnessRegistry.getInstance()`).

**Deliverable**:
1. `src/index.ts` re-exports `registerDefaultHarnesses` from the harnesses barrel (grep confirms it is now a public symbol).
2. `src/core/agent.ts` gains a guarded, idempotent lazy auto-registration block at **all three** harness-resolution sites (constructor, `stream()`, `executePrompt()`), plus the import for `registerDefaultHarnesses`.
3. The 6 existing tests whose premise is "built-in id `'pi'`/`'claude-code'` is missing → throw/error" are updated so `npm test` stays green (see research note `breakage-surface-analysis.md`).

**Success Definition**:
1. `grep -n "registerDefaultHarnesses" src/index.ts` returns a match (public export present).
2. `new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })` with an EMPTY registry and NO `configureHarnesses()` call resolves to a real `'pi'` harness (no throw) — verifiable via the cascade-matrix scenario 4 which auto-activates via its `AUTO_REGISTER_ACTIVE` capability probe.
3. `npm run lint` (`tsc --noEmit`) is green (no production-source type errors).
4. `npm test` (`vitest run`) is green EXCEPT the known-unrelated pre-existing Issue 5 unicode failure (`src/__tests__/adversarial/edge-case.test.ts`).
5. Tests that register their own mock `'pi'`/`'claude-code'` (e.g. the P1.M1.T1.S2 primary test, the cascade-matrix scenarios 1-3) STILL pass — proving the `has()` guard preserves test mocks (no test pollution).

---

## Why

- **PRD §h3.3 (Issue 4)** explicitly supersedes the earlier P2.M1.T1.S2 decision that kept `registerDefaultHarnesses` out of the public barrel and forbade import-time auto-invocation. The Expected Behavior is *"a convenient way to register both built-in harnesses, OR auto-registration, so users do not have to hand-register."* This task delivers BOTH safety nets, in a test-safe way.
- **Compounds the Issue 1 fix (P1.M1.T1)**: even after the cascade rewire, `new Agent({ model })` with no setup STILL fails because `HarnessRegistry.getInstance()` starts EMPTY (no auto-registration) and no example/user registers `'pi'`. Without this safety net, the shipped example `examples/harnesses/02-harness-configuration.ts` and the PRD §7.6 quickstart remain broken at construction time.
- **Why lazy + targeted (not import-time, not in `getInstance()`)**: Calling `registerDefaultHarnesses()` unconditionally at module import time pollutes the singleton in every test file (the exact failure mode P2.M1.T1.S2 originally avoided). Modifying `HarnessRegistry.getInstance()` to auto-register is "too broad — called everywhere" (contract §3). The chosen seam — the Agent's three `registry.get()` sites, guarded to built-in ids and gated on a missing lookup — is minimal: it only materializes defaults when an Agent actually NEEDS a missing built-in harness, and the `has()` idempotency guard means it NEVER overwrites a mock a test has already registered.

---

## What

### Production behavior

1. **Public export**: `import { registerDefaultHarnesses } from 'groundswell'` now works.
2. **Lazy auto-registration**: At each of the Agent's three harness-resolution sites, AFTER computing the resolved harness id and the initial `registry.get(...)` lookup, IF the lookup returned `undefined` AND the resolved id is a built-in default (`'pi'` or `'claude-code'`), call `registerDefaultHarnesses(registry)` ONCE and retry the lookup. Non-built-in ids (e.g. `'anthropic'`, `'nonexistent'`) are left untouched → the existing throw / `PROVIDER_NOT_FOUND` error path fires unchanged.

### Test-maintenance behavior (consequence of #2)

Six existing tests assert a throw / error response for a MISSING built-in id. Their premise is now obsolete (the id auto-registers). They are updated to exercise the missing-harness error path with a NON-built-in id instead (preserving intent) — OR, for the P1.M1.T1.S2 inverse test, re-asserted to reflect the new auto-registration outcome. See Implementation Tasks 5-10.

### Success Criteria

- [ ] `grep -n "registerDefaultHarnesses" src/index.ts` matches.
- [ ] `grep -n "registerDefaultHarnesses" src/core/agent.ts` matches (import + 3 call-site invocations).
- [ ] Cascade-matrix scenario 4 (`it.skipIf(!AUTO_REGISTER_ACTIVE)`) now RUNS (was skip-masked) and passes — proving zero-setup resolution works.
- [ ] All 6 previously-breaking tests updated and green.
- [ ] `npm test` green except the known-unrelated Issue 5 unicode failure.
- [ ] `npm run lint` green.

---

## All Needed Context

### Context Completeness Check

_Pass._ An implementer with no prior knowledge can do this using: (a) the exact line-precise call-site snippets below, (b) the breakage-surface research note (which lists every test to touch and the exact fix), (c) the architecture docs for conventions. No external/library research required — this is internal wiring + mechanical test edits.

### Documentation & References

```yaml
# MUST READ — the authoritative breakage analysis (the highest-risk part of this task)
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M1T2S1/research/breakage-surface-analysis.md
  why: "Enumerates the EXACT 6 tests that break, with file:line, the built-in id each omits, and the precise fix (switch to a non-built-in id, or re-assert resolution). Also documents the self-adapting cascade-matrix probe and the SAFE-test categories."
  critical: "Without this, npm test will fail in 6 places and the implementer will not know why. The has()-guard claim in the contract is INCOMPLETE — it does not protect tests whose premise is 'built-in id is missing'."

# MUST READ — original Issue 4 scout report (exact code locations verified)
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/issue3-4-metadata-and-exports.md
  why: "Issue 4 section (Finding 4.1–4.5): confirms registerDefaultHarnesses is exported ONLY from src/harnesses/index.ts:21, ABSENT from src/index.ts, registry starts empty (Finding 4.4), zero production callers (Finding 4.5). Notes the P2M1T1S2 policy tension this task resolves."
  critical: "Finding 4.4 confirms getInstance() starts empty; Finding 4.5 confirms src/core/ has zero callers today (so adding the call sites is net-new)."

# MUST READ — test conventions (lifecycle resets, mock idioms, @ts-expect-error discipline)
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/test-patterns-and-conventions.md
  why: "§5 (npm scripts: test=vitest run, lint=tsc --noEmit which EXCLUDES src/__tests__), §9 (tsconfig: isolatedModules → import type; .js specifiers for .ts; tests NOT type-checked by lint), §10 (registry reset + vi.clearAllMocks conventions)."
  critical: "lint does NOT type-check tests — type errors in the 6 edited test files surface only at vitest run. Keep edits type-clean anyway."

# The three call sites being edited (post-P1.M1.T1 state — variable names verified)
- file: src/core/agent.ts
  why: "Constructor L114-129 (var: effectiveHarness, THROWS Error); stream() L367-385 (var: resolvedHarness, THROWS Error); executePrompt() L609-626 (var: resolvedHarness, RETURNS createErrorResponse('PROVIDER_NOT_FOUND')). Import HarnessRegistry at L43; getGlobalHarnessConfig/resolveHarnessConfig at L45."
  pattern: "Each site is: const registry = HarnessRegistry.getInstance(); const harnessInstance = registry.get(<id>) as Harness | undefined; if (!harnessInstance) { throw|return-error }."
  gotcha: "Variable name DIFFERS per site (effectiveHarness vs resolvedHarness). executePrompt does NOT throw — it returns an AgentResponse error. The harnessInstance binding is currently `const` → must become `let` (it is reassigned after the retry)."

# The function being exported + auto-invoked (already correct — read to confirm signature + idempotency)
- file: src/harnesses/register-defaults.ts
  why: "L28-48: registerDefaultHarnesses(registry = HarnessRegistry.getInstance()): HarnessRegistry. Idempotent via registry.has('claude-code')/registry.has('pi') guards (L37, L46). Registers ClaudeCodeHarness then PiHarness. Returns the registry."
  pattern: "Default arg is the singleton — pass the Agent's own `registry` explicitly at the call sites (defensive: if a test passes a non-singleton registry, we populate THAT one)."

# The public barrel to edit (insertion point)
- file: src/index.ts
  why: "registerDefaultHarnesses is ABSENT. The '// Harness configuration & model-spec utilities (PRD §7.6 / §7.8)' block (~L92-93) exports configureHarnesses + parseModelSpec. Add the registerDefaultHarnesses re-export ADJACENT to configureHarnesses (conceptually paired setup helpers)."
  pattern: "export { registerDefaultHarnesses } from './harnesses/index.js';   # the harnesses barrel already re-exports it (src/harnesses/index.ts:21)"

# The harnesses barrel (confirms the symbol is available to re-export)
- file: src/harnesses/index.ts
  why: "L21: export { registerDefaultHarnesses } from './register-defaults.js'; — already exported internally; src/index.ts just needs to re-export through."

# The registry API the safety net depends on (has/get/register/getInstance/_resetForTesting)
- file: src/harnesses/harness-registry.ts
  why: "getInstance() (L166, lazy-empty singleton), get(id) (L221, returns Provider|undefined — does NOT throw), has(id) (L90), register(provider) (L193, THROWS on duplicate id — which is why registerDefaultHarnesses guards with has())."
  gotcha: "get() returns undefined (not throws) for missing ids — this undefined is exactly what the safety net checks."

# Built-in id set definition (the guard condition)
- file: src/utils/harness-config.ts
  why: "isValidHarnessId() checks `value === 'pi' || value === 'claude-code'` — this is the EXACT set the safety net must gate on. DEFAULT_HARNESS_CONFIG.defaultHarness === 'pi' (so the common case is: effectiveHarness='pi', missing → auto-register)."
  pattern: "Mirror this literal set in the guard: `(effectiveHarness === 'pi' || effectiveHarness === 'claude-code')`. Do NOT import isValidHarnessId (it is not exported) — inline the two literals."

# The capability-probe test that self-adapts (NO edit needed — but RUN to confirm)
- file: src/__tests__/unit/agent-harness-cascade-matrix.test.ts
  why: "L95-114: AUTO_REGISTER_ACTIVE IIFE probe + it.skipIf(!AUTO_REGISTER_ACTIVE) scenario 4. When T2.S1 lands the probe returns true and scenario 4 auto-runs. The matrix's scenarios 1-3 register their own mocks → unaffected."
  gotcha: "Do NOT edit this file. Just run it and confirm scenario 4 now executes (was skip-masked) and passes."

# The 6 breaking tests (each needs a one-line id swap or re-assertion — see Implementation Tasks 5-10)
- file: src/__tests__/unit/agent.test.ts
  why: "L138-141 (throw test, 'pi') and L175-181 (P1.M1.T1.S2 inverse, 'pi'). Both break."
- file: src/__tests__/unit/agent-stream-harness-override.test.ts
  why: "L145-160: register only 'pi', stream with {harness:'claude-code'}, expect throw. Breaks."
- file: src/__tests__/unit/agent-stream-provider-override.test.ts
  why: "L201-221 and ~L540-553: register only 'anthropic', stream with {provider:'claude-code'}, expect throw. Both break."
- file: src/__tests__/unit/agent-prompt-provider-override.test.ts
  why: "L185-206: register only 'anthropic', prompt with {provider:'claude-code'}, expect PROVIDER_NOT_FOUND error response. Breaks."
```

### Current Codebase tree (relevant subset)

```bash
src/
  core/
    agent.ts                                   # ← EDIT (3 call sites + 1 import line)
  harnesses/
    index.ts                                   # already exports registerDefaultHarnesses (L21) — no edit
    register-defaults.ts                       # the function body — no edit (already idempotent)
    harness-registry.ts                        # getInstance/get/has/register — no edit
  utils/
    harness-config.ts                          # isValidHarnessId set = 'pi'|'claude-code' — no edit
  index.ts                                     # ← EDIT (add 1 re-export line)
  __tests__/
    unit/
      agent.test.ts                            # ← EDIT 2 tests (L138-141, L175-181)
      agent-stream-harness-override.test.ts    # ← EDIT 1 test (L145-160)
      agent-stream-provider-override.test.ts   # ← EDIT 2 tests (L201-221, ~L540-553)
      agent-prompt-provider-override.test.ts   # ← EDIT 1 test (L185-206)
      agent-harness-cascade-matrix.test.ts     # NO EDIT (self-adapts via AUTO_REGISTER_ACTIVE probe)
plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/
  architecture/issue3-4-metadata-and-exports.md
  architecture/test-patterns-and-conventions.md
  P1M1T2S1/
    research/breakage-surface-analysis.md      # ← THIS TASK's research (MUST READ)
    PRP.md                                     # ← THIS FILE
```

### Desired Codebase tree with files to be added/changed

```bash
src/index.ts                                   # MODIFIED — +1 export line
src/core/agent.ts                              # MODIFIED — +1 import symbol, 3 safety-net blocks
src/__tests__/unit/agent.test.ts               # MODIFIED — 2 tests updated
src/__tests__/unit/agent-stream-harness-override.test.ts        # MODIFIED — 1 test updated
src/__tests__/unit/agent-stream-provider-override.test.ts       # MODIFIED — 2 tests updated
src/__tests__/unit/agent-prompt-provider-override.test.ts       # MODIFIED — 1 test updated
# NO new files. NO changes to register-defaults.ts, harness-registry.ts, harness-config.ts.
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: The three call sites have DIFFERENT variable names and DIFFERENT error handling.
//   Constructor  (~L120):  variable `effectiveHarness`, throws `new Error(...)`.
//   stream()     (~L373):  variable `resolvedHarness`,  throws `new Error(...)`.
//   executePrompt() (~L615): variable `resolvedHarness`, RETURNS createErrorResponse('PROVIDER_NOT_FOUND',...).
// Mirror the EXISTING error style at each site — do not unify them (out of scope; would touch test regexes).

// CRITICAL: `harnessInstance` is currently declared `const` at each site and is NOT reassigned.
//   The safety net reassigns it after registerDefaultHarnesses(registry). Change `const` → `let`
//   ONLY for the harnessInstance binding at each of the 3 sites. (tsc strict will flag a reassign of const.)

// CRITICAL: registerDefaultHarnesses is exported from the harnesses barrel (src/harnesses/index.ts:21)
//   AND agent.ts ALREADY imports HarnessRegistry from '../harnesses/index.js' (L43). The cleanest edit is
//   to EXTEND that existing import line: `import { HarnessRegistry, registerDefaultHarnesses } from '../harnesses/index.js';`
//   Do NOT add a second import from '../harnesses/register-defaults.js' (redundant; lint prefers one statement).

// CRITICAL: The guard literal set MUST be exactly `'pi' | 'claude-code'` (matches isValidHarnessId in
//   harness-config.ts and the two ids register-defaults.ts registers). Do NOT generalize to "any HarnessId"
//   — that would auto-register on misspelled ids and mask user errors. Do NOT import isValidHarnessId
//   (not exported) — inline the two-string check.

// CRITICAL: 6 existing tests break (see breakage-surface-analysis.md). The has() guard does NOT save them
//   because their PREMISE is "built-in id is missing." Fix = switch the missing-path id to a NON-built-in
//   id ('nonexistent' / 'nonexistent-provider'), which the safety net leaves alone. Precedent:
//   provider-agent.test.ts:165 + provider-switching.test.ts:164 already use 'nonexistent-provider'.

// GOTCHA: npm run lint (tsc --noEmit) EXCLUDES src/__tests__ (tsconfig.json exclude). Test type errors
//   surface only at `vitest run`. Keep test edits type-clean regardless (use `as HarnessId` / `as ProviderId`
//   casts on the non-built-in id, mirroring existing tests).

// GOTCHA: isolatedModules: true → the `as HarnessId` cast on 'nonexistent' is a VALUE-position cast (fine).
//   Type-only imports in the edited test files already use `import type` — do not regress.

// GOTCHA: The cascade-matrix test (agent-harness-cascade-matrix.test.ts) has a MODULE-LEVEL IIFE probe
//   (AUTO_REGISTER_ACTIVE) that constructs `new Agent()` at import time. After T2.S1 this probe auto-registers
//   a real 'pi' into the singleton — but the probe's `finally` resets the registry, so it does NOT leak.
//   Do NOT "fix" the probe; it is intentional.

// SCOPE BOUNDARIES:
//   - Do NOT add the NEW zero-setup standalone positive test (that is P1.M1.T2.S2). The cascade-matrix
//     scenario 4 already exercises zero-setup as a side effect; the dedicated standalone test + example-02
//     smoke test belong to S2.
//   - Do NOT modify register-defaults.ts, harness-registry.ts, or harness-config.ts.
//   - Do NOT auto-register at import time or inside getInstance() (contract §3 forbids both — test pollution).
//   - Do NOT touch Issue 3 (metadata.provider) or Issue 2 (PiHarness toolExecutor) — separate milestones.
```

---

## Implementation Blueprint

### Data models and structure

None. No types, schemas, or models are created or changed. `registerDefaultHarnesses`
already exists with the correct signature and idempotency; this task only wires it into the
public barrel and the Agent's resolution sites.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ the breakage analysis (NO edits)
  - READ plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M1T2S1/research/breakage-surface-analysis.md IN FULL.
  - NOTE the 6 breaking tests (table) + the self-adapting cascade matrix + the SAFE-test categories.
  - NOTE the exact variable names per call site (effectiveHarness vs resolvedHarness) and that executePrompt returns (not throws).

Task 2: EXPORT registerDefaultHarnesses from src/index.ts
  - FILE: src/index.ts
  - FIND: the '// Harness configuration & model-spec utilities (PRD §7.6 / §7.8)' block:
      export { configureHarnesses } from './utils/harness-config.js';
      export { parseModelSpec, formatModelForProvider } from './utils/model-spec.js';
  - ADD immediately after the configureHarnesses line (conceptually paired setup helper):
      // Built-in harness registration helper (PRD §7.6 / Issue 4). Re-exported through the harnesses barrel.
      export { registerDefaultHarnesses } from './harnesses/index.js';
  - VERIFY: grep -n "registerDefaultHarnesses" src/index.ts  → 1 match.
  - DEPENDENCIES: none.

Task 3: ADD the import in src/core/agent.ts
  - FILE: src/core/agent.ts
  - FIND line 43:  import { HarnessRegistry } from '../harnesses/index.js';
  - CHANGE to:     import { HarnessRegistry, registerDefaultHarnesses } from '../harnesses/index.js';
  - WHY one line: registerDefaultHarnesses is already exported from that barrel (src/harnesses/index.ts:21).
  - VERIFY: grep -n "registerDefaultHarnesses" src/core/agent.ts  → 4 matches (1 import + 3 call sites after Task 4).
  - DEPENDENCIES: Task 2 (not strictly, but keeps the symbol public-consistent).

Task 4: ADD the lazy auto-registration safety net at all THREE call sites in src/core/agent.ts
  - Each site: change `const harnessInstance` → `let harnessInstance`, then insert the guard between the get() and the existing throw/return-error.
  - SITE A — Constructor (~L125-129, variable `effectiveHarness`, THROWS):
      BEFORE:
        const registry = HarnessRegistry.getInstance();
        const harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
        if (!harnessInstance) {
          throw new Error(`Harness '${effectiveHarness}' is not registered`);
        }
      AFTER:
        const registry = HarnessRegistry.getInstance();
        let harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
        // Lazy auto-registration safety net (PRD §7.6 / Issue 4 h3.3): if the resolved harness is a
        // built-in default ('pi' | 'claude-code') that isn't registered yet, materialize the defaults
        // once. registerDefaultHarnesses is idempotent (has() guards) → never overwrites a test's mock.
        if (!harnessInstance && (effectiveHarness === 'pi' || effectiveHarness === 'claude-code')) {
          registerDefaultHarnesses(registry);
          harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
        }
        if (!harnessInstance) {
          throw new Error(`Harness '${effectiveHarness}' is not registered`);
        }
  - SITE B — stream() (~L379-385, variable `resolvedHarness`, THROWS):
      Mirror SITE A exactly, substituting `resolvedHarness` for `effectiveHarness`. Keep the existing
      `// THROW (synchronous at call time...)` comment above the throw if present.
  - SITE C — executePrompt() (~L621-626, variable `resolvedHarness`, RETURNS createErrorResponse):
      Mirror the guard (const→let, insert the if-block), but PRESERVE the existing return-createErrorResponse
      shape for the final `if (!harnessInstance)`:
        if (!harnessInstance) {
          return createErrorResponse(
            'PROVIDER_NOT_FOUND',
            `Harness '${resolvedHarness}' is not registered`,
            { harnessId: resolvedHarness },
            false
          ) as AgentResponse<T>;
        }
  - VERIFY each site:
        grep -n "registerDefaultHarnesses(registry)" src/core/agent.ts  → 3 matches.
  - NAMING: keep `harnessInstance` as the binding name (existing code + downstream `const harness = harnessInstance;` capture depend on it).
  - DEPENDENCIES: Task 3 (import must exist).

Task 5: UPDATE breaking test #1 — src/__tests__/unit/agent.test.ts L138-141
  - TEST: it('throws when the resolved harness is not registered', ...)
  - CURRENT: (registry empty) expect(() => new Agent()).toThrow(/Harness 'pi' is not registered/);
  - PROBLEM: 'pi' now auto-registers → no throw.
  - FIX: switch to a NON-built-in id so the error path is still exercised:
      it('throws when the resolved harness is not registered (non-built-in id)', () => {
        // 'pi'/'claude-code' auto-register (P1.M1.T2.S1); use a non-built-in id to exercise the throw path.
        expect(() => new Agent({ harness: 'nonexistent' as HarnessId })).toThrow(/Harness 'nonexistent' is not registered/);
      });
  - GOTCHA: the existing test's beforeEach already resets registry + global config. Keep it.

Task 6: UPDATE breaking test #2 — src/__tests__/unit/agent.test.ts L175-181 (P1.M1.T1.S2 inverse)
  - TEST: it('uses the global default "pi" even when only "claude-code" is registered ...', ...)
  - CURRENT: register ONLY 'claude-code'; expect(() => new Agent()).toThrow(/Harness 'pi' is not registered/); then register 'pi' + assert resolves.
  - PROBLEM: 'pi' auto-registers on the first new Agent() → no throw.
  - FIX: the PURPOSE ("default is 'pi', config-driven not registry-driven") is still valid — only the OUTCOME flips:
      it('uses the global default "pi" even when only "claude-code" is registered (auto-registration materializes the missing default)', () => {
        // Do NOT call configureHarnesses → getGlobalHarnessConfig() returns DEFAULT { defaultHarness: 'pi' }.
        // Register ONLY 'claude-code'. 'pi' is missing but is a built-in default → the constructor's
        // lazy safety net (P1.M1.T2.S1) auto-registers a REAL PiHarness.
        HarnessRegistry.getInstance().register(createMockHarness('claude-code'));
        const agent = new Agent();   // no throw — 'pi' auto-registered
        // @ts-expect-error - private field access for testing
        expect(agent.harness.id).toBe('pi');   // default is 'pi' (config), NOT 'claude-code' (registry)
      });
  - NOTE: delete the now-dead "then register 'pi'" tail of the old test (it asserted the post-throw resolution; the throw no longer happens).
  - SCOPE: this EVOLVES the P1.M1.T1.S2 test to the new contract (PRD h3.3 supersedes the old "throw when missing" expectation). Do not preserve the obsolete throw assertion.

Task 7: UPDATE breaking test #3 — src/__tests__/unit/agent-stream-harness-override.test.ts L145-160
  - TEST: it('THROWS Harness "..." is not registered for an unregistered harness', ...)
  - CURRENT: register ONLY 'pi'; agent.stream(prompt, { harness: 'claude-code' }); expect reject /Harness 'claude-code' is not registered/.
  - FIX: change the stream override to a non-built-in id:
      const { stream } = agent.stream(prompt, { harness: 'nonexistent' as HarnessId });
      ... }).rejects.toThrow(/Harness 'nonexistent' is not registered/);
  - KEEP: the rest of the arrange (register only 'pi', construct agent with { harness: 'pi' }).

Task 8: UPDATE breaking test #4 — src/__tests__/unit/agent-stream-provider-override.test.ts L201-221
  - TEST: it('should throw error when provider is not registered', ...)
  - CURRENT: register ONLY 'anthropic'; agent.stream(prompt, { provider: 'claude-code' }); expect reject /Harness 'claude-code' is not registered/.
  - FIX: change to a non-built-in id (reuse the 'nonexistent-provider' convention from provider-agent.test.ts:165):
      const { stream } = agent.stream(prompt, { provider: 'nonexistent-provider' as ProviderId });
      ... }).rejects.toThrow(/Harness 'nonexistent-provider' is not registered/);

Task 9: UPDATE breaking test #5 — src/__tests__/unit/agent-stream-provider-override.test.ts ~L540-553
  - TEST: the SECOND 'should throw ... when provider is not registered' (or similarly-named) instance.
  - SAME FIX as Task 8: swap 'claude-code' → 'nonexistent-provider' in the stream override + the toThrow regex.
  - VERIFY: grep -n "Harness 'claude-code' is not registered" src/__tests__/unit/agent-stream-provider-override.test.ts → 0 matches after edit.

Task 10: UPDATE breaking test #6 — src/__tests__/unit/agent-prompt-provider-override.test.ts L185-206
  - TEST: it('should return error response when provider is not registered', ...)
  - CURRENT: register ONLY 'anthropic'; agent.prompt(prompt, { provider: 'claude-code' }); expect response2.status === 'error' (PROVIDER_NOT_FOUND).
  - FIX: change to a non-built-in id so the executePrompt PROVIDER_NOT_FOUND path still fires:
      const response2 = await agent.prompt(prompt, { provider: 'nonexistent-provider' as ProviderId });
      ... expect(response2.status).toBe('error');  // PROVIDER_NOT_FOUND — unchanged
  - KEEP: the surrounding isError(response2) assertions (they still hold for PROVIDER_NOT_FOUND).
  - NOTE: this test calls agent.prompt() TWICE (the first uses 'claude-code' before the reset). Update BOTH occurrences of the 'claude-code' override in this test to 'nonexistent-provider' (the first call at ~L193 and the second at ~L201). Read the full test body first to be sure.

Task 11: RUN lint + the full test suite
  - RUN: npm run lint              # tsc --noEmit on src/** (tests excluded) — EXPECT green.
  - RUN: npm test                  # vitest run — EXPECT green EXCEPT Issue 5 unicode (pre-existing, unrelated).
  - RUN: npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts -t "scenario 4"
        # EXPECT: scenario 4 now RUNS (AUTO_REGISTER_ACTIVE flipped to true) and PASSES. Pre-S1 it was skip-masked.
  - DEPENDENCIES: Tasks 2-10 complete.
```

### Implementation Patterns & Key Details

```typescript
// === The safety-net block (SITE A — constructor) ===
// Insert between the existing registry.get() and the existing throw. Only TWO lines change
// from the current code: `const` → `let`, and the inserted `if`-block.

const registry = HarnessRegistry.getInstance();
let harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
// Lazy auto-registration safety net (PRD §7.6 / Issue 4 h3.3).
if (!harnessInstance && (effectiveHarness === 'pi' || effectiveHarness === 'claude-code')) {
  registerDefaultHarnesses(registry);   // idempotent — has() guards skip already-registered ids
  harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
}
if (!harnessInstance) {
  throw new Error(`Harness '${effectiveHarness}' is not registered`);
}
this.harness = harnessInstance;

// === SITE B (stream) is identical with `resolvedHarness` substituted for `effectiveHarness`. ===
// === SITE C (executePrompt) is identical EXCEPT the final block returns createErrorResponse  ===
//   instead of throwing (preserve the existing return shape verbatim — see Task 4 SITE C).

// === Why this is test-safe (the contract's core requirement) ===
//   registerDefaultHarnesses() guards each registration with registry.has(id):
//     if (!registry.has('pi')) registry.register(new PiHarness());
//   So if a test's beforeEach did registry.register(createMockHarness('pi')), the safety net's
//   registerDefaultHarnesses(registry) sees has('pi')===true → SKIPS → the mock is preserved.
//   The safety net ONLY fires when the resolved built-in id is genuinely missing. This is why
//   the P1.M1.T1.S2 PRIMARY test (registers mock 'pi', asserts agent.harness.id==='pi') still
//   passes: get('pi') returns the mock → the if(!harnessInstance) is false → net never runs.

// === The export line (src/index.ts) ===
export { registerDefaultHarnesses } from './harnesses/index.js';
// (The harnesses barrel src/harnesses/index.ts:21 already does:
//    export { registerDefaultHarnesses } from './register-defaults.js';
//  so this is a pure re-export — no new implementation.)

// === The test-id swap pattern (Tasks 5,7,8,9,10) ===
// BEFORE (breaks — 'claude-code' auto-registers):
//   agent.stream(prompt, { harness: 'claude-code' as HarnessId })
//   ...rejects.toThrow(/Harness 'claude-code' is not registered/);
// AFTER (exercises the throw path via a non-built-in id the safety net ignores):
//   agent.stream(prompt, { harness: 'nonexistent' as HarnessId })
//   ...rejects.toThrow(/Harness 'nonexistent' is not registered/);
```

### Integration Points

```yaml
DATABASE:
  - none
CONFIG:
  - none (no env vars, no files; the global config singleton + registry are in-memory)
ROUTES:
  - none
REGISTRY:
  - The safety net WRITES to HarnessRegistry (via registerDefaultHarnesses) on a cache miss for a
    built-in id. This is the intended side-effect. Tests that reset the registry in beforeEach are
    unaffected on their HAPPY paths (they register mocks → has() guard → no overwrite); only tests
    whose premise is "built-in id missing → throw" need updating (Tasks 5-10).
PUBLIC API:
  - src/index.ts gains ONE new exported symbol: registerDefaultHarnesses. This is additive — no
    existing export is removed or renamed.
IMPORTS:
  - src/core/agent.ts L43: extend the existing '../harnesses/index.js' import (one symbol added).
    No new import line.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Type-check production source (tests are EXCLUDED from tsc per tsconfig.json):
npm run lint
# Expected: zero errors. If errors: READ them — most likely a `const`→`let` miss on one of the 3
# harnessInstance bindings, or a stray type from the test edits (but tests aren't lint-checked).

# Confirm the export + import + 3 call sites are present:
grep -n "registerDefaultHarnesses" src/index.ts          # → 1 match (the new export)
grep -n "registerDefaultHarnesses" src/core/agent.ts     # → 4 matches (1 import + 3 invocations)
grep -c "registerDefaultHarnesses(registry)" src/core/agent.ts   # → 3

# Confirm NO stray 'claude-code'/'pi' throw-path assertions remain in the 6 edited tests:
grep -rn "Harness 'claude-code' is not registered\|Harness 'pi' is not registered" \
  src/__tests__/unit/agent.test.ts \
  src/__tests__/unit/agent-stream-harness-override.test.ts \
  src/__tests__/unit/agent-stream-provider-override.test.ts \
  src/__tests__/unit/agent-prompt-provider-override.test.ts
# Expected: 0 matches in agent.test.ts + the 3 override files. (The integration files
# provider-agent.test.ts / provider-switching.test.ts use 'nonexistent-provider' already — leave them.)
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run each edited test file in isolation first (fast feedback on the test edits):
npx vitest run src/__tests__/unit/agent.test.ts -t "not registered"
npx vitest run src/__tests__/unit/agent.test.ts -t "configureHarnesses"
npx vitest run src/__tests__/unit/agent-stream-harness-override.test.ts
npx vitest run src/__tests__/unit/agent-stream-provider-override.test.ts
npx vitest run src/__tests__/unit/agent-prompt-provider-override.test.ts
# Expected: all green.

# CRITICAL — the self-adapting cascade matrix: scenario 4 must now RUN (was skip-masked) and PASS:
npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts --reporter=verbose 2>&1 | grep -i "scenario 4"
# Expected: scenario 4 shows as PASSED (not skipped). This proves zero-setup resolution works
# AND that the AUTO_REGISTER_ACTIVE probe flipped to true.

# Confirm the P1.M1.T1.S2 PRIMARY test still passes (proves has()-guard preserves test mocks):
npx vitest run src/__tests__/unit/agent.test.ts -t "resolves new Agent"
# Expected: PASS — the mock 'pi' is preserved (registerDefaultHarnesses skips it via has()).
```

### Level 3: Integration Testing (System Validation)

```bash
# Full test suite — the real gate:
npm test
# Expected: GREEN except the known-unrelated pre-existing failure:
#   src/__tests__/adversarial/edge-case.test.ts > "should handle unicode in workflow names"
# (Issue 5 — OUT OF SCOPE; do not attempt to fix it here.)
# If ANY other test fails: it likely also asserts a throw/error for a missing built-in id that
# the breakage analysis didn't catch. grep for it:
#   grep -rn "is not registered" src/__tests__ --include="*.test.ts"
# and apply the same non-built-in-id swap. (The analysis found 6; verify none were missed.)

# Smoke-test the minimal reproduction from the PRD (Issue 4 / Issue 1 compound):
cat > /tmp/gs-smoke.ts <<'EOF'
import { Agent, HarnessRegistry } from './src/index.js';
HarnessRegistry._resetForTesting();
const agent = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });
// @ts-expect-error - private field access for testing
console.log('resolved harness:', agent.harness.id);   // expect: pi
console.log('registry has pi:', HarnessRegistry.getInstance().has('pi'));        // true
console.log('registry has claude-code:', HarnessRegistry.getInstance().has('claude-code')); // true
EOF
npx tsx /tmp/gs-smoke.ts
# Expected output:
#   resolved harness: pi
#   registry has pi: true
#   registry has claude-code: true
# (Before S1 this threw "Harness 'pi' is not registered".)
rm -f /tmp/gs-smoke.ts
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Public-API export audit — registerDefaultHarnesses is now importable from the package root:
node --input-type=module -e "import('./src/index.js').then(m => console.log('exported:', typeof m.registerDefaultHarnesses))"
# Expected: exported: function

# Confirm the production diff is minimal (only the 2 src files intended):
git diff --stat -- src/
# Expected: ONLY src/index.ts and src/core/agent.ts changed. If register-defaults.ts,
# harness-registry.ts, or harness-config.ts appear, STOP — those are out of scope.

# Confirm the test diff touches only the 4 intended files:
git diff --stat -- src/__tests__/
# Expected: agent.test.ts, agent-stream-harness-override.test.ts,
#           agent-stream-provider-override.test.ts, agent-prompt-provider-override.test.ts.
#           NOT agent-harness-cascade-matrix.test.ts (self-adapts — must be unchanged).
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` green (production source type-checks; no `const`→`let` misses).
- [ ] `npm test` green EXCEPT the known-unrelated Issue 5 unicode failure.
- [ ] `grep -c "registerDefaultHarnesses(registry)" src/core/agent.ts` → 3.
- [ ] `grep -n "registerDefaultHarnesses" src/index.ts` → 1 match.
- [ ] Cascade-matrix scenario 4 now RUNS (not skipped) and passes.
- [ ] `git diff --stat -- src/` shows ONLY `src/index.ts` + `src/core/agent.ts`.
- [ ] `git diff --stat -- src/__tests__/` shows ONLY the 4 intended test files (NOT the cascade matrix).

### Feature Validation

- [ ] `new Agent({ model })` with EMPTY registry + NO `configureHarnesses()` resolves to `'pi'` (smoke test / scenario 4).
- [ ] Auto-registration populates BOTH `'pi'` AND `'claude-code'` in the registry (smoke test asserts both `has(...)`).
- [ ] Tests that register their own mock `'pi'`/`'claude-code'` still pass (P1.M1.T1.S2 primary, cascade-matrix scenarios 1-3) — proves the `has()` guard prevents test pollution.
- [ ] The throw / PROVIDER_NOT_FOUND error path is STILL exercised (via the non-built-in id swaps in Tasks 5,7-10) — no regression in error handling for genuinely-unknown harnesses.
- [ ] `registerDefaultHarnesses` is importable from the package root (`import { registerDefaultHarnesses } from 'groundswell'`).

### Code Quality Validation

- [ ] The 3 safety-net blocks are byte-for-byte identical except for the variable name (`effectiveHarness` vs `resolvedHarness`) and the final error shape (throw vs createErrorResponse) — matching each site's pre-existing convention.
- [ ] The guard literal set is exactly `'pi' || 'claude-code'` (not generalized, not imported from an unexported helper).
- [ ] `harnessInstance` is `let` (not `const`) at all 3 sites.
- [ ] Test edits use the existing `as HarnessId` / `as ProviderId` cast idiom for the non-built-in id; `@ts-expect-error` directives preserved on private-field access.
- [ ] Comments at each safety-net site explain WHY (lazy, idempotent, test-safe) and reference PRD §7.6 / Issue 4 h3.3.

### Documentation & Deployment

- [ ] The new `src/index.ts` export has a one-line comment noting it is the built-in registration helper (PRD §7.6 / Issue 4).
- [ ] No new env vars or config files.
- [ ] The 6 updated tests have inline comments explaining the non-built-in-id choice (so a future reader doesn't "simplify" it back to `'pi'`/`'claude-code'` and re-break the suite).

---

## Anti-Patterns to Avoid

- ❌ **Do NOT auto-register at module-import time** (`registerDefaultHarnesses()` called as a top-level statement). That pollutes the singleton in every test file — the exact failure P2.M1.T1.S2 avoided. The safety net must live inside the Agent's resolution sites, gated on a genuine miss.
- ❌ **Do NOT modify `HarnessRegistry.getInstance()` or its constructor to auto-register.** The contract (§3) forbids this — it is "too broad, called everywhere." The seam is the Agent's three `registry.get()` sites.
- ❌ **Do NOT generalize the guard** to "any `HarnessId`" or to a dynamic check. It must be the literal two built-in ids (`'pi'`, `'claude-code'`) — anything else would auto-register on misspelled/unknown ids and mask real user errors.
- ❌ **Do NOT change `registerDefaultHarnesses`, `HarnessRegistry`, or `harness-config.ts`.** They are already correct (idempotent, empty-by-default, validating). This task only WIRES them.
- ❌ **Do NOT delete the 6 breaking tests.** Update them (non-built-in id swap, or re-assert resolution) — they still guard the throw/error path and the config-driven default, just for the new contract.
- ❌ **Do NOT unify the three call sites' error handling** (e.g. make executePrompt throw, or make the constructor return an error response). Each site's error style is a pre-existing contract that downstream test regexes depend on — preserve them verbatim.
- ❌ **Do NOT forget `const` → `let`** on `harnessInstance` at each of the 3 sites. tsc strict WILL flag the reassignment; lint will fail.
- ❌ **Do NOT add the standalone zero-setup positive test or the example-02 smoke test** — those are P1.M1.T2.S2. (The cascade-matrix scenario 4 already covers zero-setup as a side effect; do not duplicate.)
- ❌ **Do NOT touch Issue 2 (PiHarness toolExecutor) or Issue 3 (metadata.provider)** — they are separate milestones (P1.M2 / P1.M3).
- ❌ **Do NOT "fix" the `AUTO_REGISTER_ACTIVE` probe** in the cascade-matrix test. It is an intentional capability-detection seam; editing it defeats its purpose.

---

## Confidence Score

**9/10** for one-pass implementation success.

Rationale: The production change is small and fully specified (1 export line + 1 import symbol + 3 near-identical safety-net blocks with exact before/after snippets). The function being wired (`registerDefaultHarnesses`) already exists and is already idempotent. The genuine risk is the **6-test breakage surface** — but the research note enumerates each test with file:line, the built-in id it omits, and the exact one-line fix, and the self-adapting cascade-matrix needs no edit. The 1-point deduction is for the possibility that a 7th throw-path test was missed by the grep (mitigated by the Level 3 fallback grep instruction) and for the P1.M1.T1.S2 inverse test edit (Task 6) being a semantic re-assertion rather than a pure mechanical swap — an implementer skimming might preserve the obsolete throw assertion. Both are called out explicitly above.
