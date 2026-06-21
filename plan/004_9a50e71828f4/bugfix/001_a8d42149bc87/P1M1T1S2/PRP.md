# PRP — P1.M1.T1.S2: Regression test for `configureHarnesses({defaultHarness:'pi'})` + `new Agent()` (no harness) → resolves to `'pi'`

**Scope**: Bugfix `001_a8d42149bc87` → Milestone P1.M1 (Critical — Issue 1) → Task T1 (Rewire Agent harness resolution) → **Subtask S2**.
**Type**: TEST-ONLY. No production source changes. Adds a single focused regression test (PRD §7.7 cascade scenario 1) that guards the P1.M1.T1.S1 fix.
**Prerequisite**: P1.M1.T1.S1 is **Complete** (commit `adbdc5c` — `agent.ts` now reads `getGlobalHarnessConfig()`/`resolveHarnessConfig()` in all three call sites).

---

## Goal

**Feature Goal**: Add a precise, fail-on-regression unit test proving that the public `configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' })` API (PRD §7.6) actually controls the `Agent` constructor's harness resolution — i.e. `new Agent({ model })` with **no** `harness` field resolves to the `'pi'` harness from the global config (PRD §7.7 cascade scenario 1).

**Deliverable**: A new `describe(...)` block (and its tests) added to `src/__tests__/unit/agent.test.ts` (a sibling to — NOT a modification of — the existing `describe('Agent harness resolution')` block). The test calls the real public `configureHarnesses()`, registers a mock `'pi'` harness, constructs `new Agent({ model })` with no harness, and asserts the resolved private `agent.harness.id === 'pi'`. It also encodes the inverse "global-default-wins-over-registry-contents" assertion per PRD §7.7.

**Success Definition**:
1. The new test PASSES against the current (post-P1.M1.T1.S1) codebase.
2. The new test FAILS against the pre-P1.M1.T1.S1 code (proven by construction — see "Fail-on-pre-fix proof" in Implementation Blueprint). This is what makes it a genuine regression guard for Issue 1.
3. `npm test` (full `vitest run`) is green (excluding the known-unrelated Issue 5 unicode failure in `src/__tests__/adversarial/edge-case.test.ts`, which is out of scope).
4. The existing `describe('Agent harness resolution')` block (4 tests) is **untouched** — it is not modified, only joined by a sibling.

---

## Why

- **Root cause of Issue 1**: The shipped `examples/harnesses/02-harness-configuration.ts` and the PRD §7.6 quickstart both call `configureHarnesses({ defaultHarness: 'pi', ... })` then construct `new Agent({ model })` with no harness — and crashed with `Harness 'anthropic' is not registered` because the Agent read the *legacy* singleton. P1.M1.T1.S1 fixed the wiring; **S2 prevents it from regressing**.
- **The existing `'uses the configured global default harness'` test (agent.test.ts) is a WEAK guard** — it never calls `configureHarnesses()` (relies on the implicit default) and asserts `agent.name === 'Agent'` (true regardless of which harness resolved). It cannot detect a reversion of the `configureHarnesses → getGlobalHarnessConfig → Agent` wiring. See `research/regression-test-design.md` §1 for the full rationale.
- **Zero coverage of the default-resolution path through the NEW public API at the Agent constructor level** was the documented root cause of why Issue 1 slipped through (architecture `test-patterns-and-conventions.md` §3, §8).
- This test **isolates Issue 1**: it manually registers `'pi'`, so it does NOT depend on Issue 4's auto-registration (P1.M1.T2). It is scoped strictly to PRD §7.7 cascade **scenario 1** — the 4-scenario matrix is a separate subtask (P1.M1.T1.S3) and must NOT be built here.

---

## What

A new `describe` block in `src/__tests__/unit/agent.test.ts` containing **two** `it(...)` cases:

1. **Primary (scenario 1 — explicit `configureHarnesses` + no-harness Agent resolves to `'pi'`)**:
   reset registry + global config; `configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' })`; register `createMockHarness('pi')`; `const agent = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })`; assert it does not throw AND `agent.harness.id === 'pi'` (via `@ts-expect-error` private-field access).

2. **Inverse (global-default-wins-over-registry — PRD §7.7)**:
   reset registry + global config (do NOT call `configureHarnesses`); register ONLY `createMockHarness('claude-code')`; assert `new Agent()` throws `/Harness 'pi' is not registered/` (proving the default is `'pi'` from `getGlobalHarnessConfig()`, not "whatever is in the registry"); then register `'pi'` and assert `new Agent()` resolves to `'pi'`.

### Success Criteria

- [ ] New `describe` block added to `src/__tests__/unit/agent.test.ts`; existing `describe('Agent harness resolution')` block is byte-for-byte unchanged.
- [ ] Primary test asserts BOTH "no throw" AND `agent.harness.id === 'pi'`.
- [ ] Primary test calls `configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' })` (NOT `configureProviders`) and registers ONLY a `'pi'` mock (NOT `'anthropic'`).
- [ ] Inverse test proves the resolved default is `'pi'` even when only `'claude-code'` is registered.
- [ ] `beforeEach`/`afterEach` reset BOTH `HarnessRegistry['_resetForTesting']()` AND `resetGlobalHarnessConfig()` AND `vi.clearAllMocks()`.
- [ ] `npx vitest run src/__tests__/unit/agent.test.ts` is green.

---

## All Needed Context

### Context Completeness Check

_Pass._ An implementer with no prior knowledge of this codebase can implement this test using only: (a) the reusable `createMockHarness`/`configureHarnesses`/`resetGlobalHarnessConfig` already imported in the target file, (b) the exact code snippets in the Implementation Blueprint, and (c) the architecture doc for conventions. No external research required — this is a pure internal unit test.

### Documentation & References

```yaml
# MUST READ — the canonical conventions cheat sheet (authoritative for this task)
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/test-patterns-and-conventions.md
  why: "§3 (default-resolution gap), §8 (cascade matrix + scenario-1 NOT covered), §10 (conventions cheat sheet), 'Start Here' item 3, 'Residual risks' note on the misleadingly-named test."
  critical: "Confirms NO existing test covers configureHarnesses()→new Agent() default resolution at the constructor; mandates adding a SIBLING test, not modifying the legacy one."

# MUST READ — the design rationale + fail-on-pre-fix proof table
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M1T1S2/research/regression-test-design.md
  why: "§1 (why not a duplicate), §2 (no public harness accessor), §3 (fail-on-pre-fix proof table), §5 (reusable assets already imported)."

# The file being edited — read the FULL header (imports + createMockHarness) and the existing resolution block
- file: src/__tests__/unit/agent.test.ts
  why: "Lines 1-72 (imports + createMockHarness factory) and lines 105-141 (existing describe('Agent harness resolution') block) define the exact idiom to mirror. configureHarnesses + resetGlobalHarnessConfig are already imported (line 8); createMockHarness is defined (line 20)."
  pattern: "describe → beforeEach(resetGlobalHarnessConfig + HarnessRegistry['_resetForTesting']) / afterEach(same) → it(...). Private access via @ts-expect-error."
  gotcha: "Do NOT touch the existing 4 tests in describe('Agent harness resolution'). Add a NEW sibling describe block."

# The cascade utilities under test (already correct post-fix — read to confirm signatures/defaults)
- file: src/utils/harness-config.ts
  why: "configureHarnesses() writes the NEW singleton (validated to 'pi'|'claude-code'); getGlobalHarnessConfig() returns it (or DEFAULT_HARNESS_CONFIG {defaultHarness:'pi'} when null); resolveHarnessConfig() is the pure cascade (first-defined-wins via ??). resetGlobalHarnessConfig() nulls the singleton for test isolation."
  pattern: "DEFAULT_HARNESS_CONFIG.defaultHarness === 'pi'. This default is what the inverse test relies on (no configureHarnesses call → still 'pi')."

# The production code this test guards (post-fix state — read to confirm the private field name)
- file: src/core/agent.ts
  why: "Line 92: 'private readonly harness: Harness;'. Line 114-120: constructor calls getGlobalHarnessConfig() + resolveHarnessConfig(globalConfig, this.harnessId, this.harnessOptions). Line 126-131: registry.get(effectiveHarness); throws 'Harness \${id} is not registered' if missing."
  pattern: "Resolved harness instance stored in private field 'harness'. NO public accessor exists (getMcpHandler() is unrelated)."
  gotcha: "Constructor NEVER calls harness.initialize()/execute()/normalizeModel() — a vi.fn()-only mock (createMockHarness) is fully sufficient; no SDK mocking needed."

# The mock-harness pattern source (referenced by the contract)
- file: src/__tests__/unit/agent-prompt-harness-override.test.ts
  why: "Lines 33-72: the createMockHarness(id, executeImpl?) factory. The agent.test.ts copy is an equivalent subset (no executeImpl) — either is fine; reuse the one already in agent.test.ts to avoid a second definition."
  pattern: "Capabilities object + vi.fn() for initialize/terminate/execute/registerMCPs/loadSkills/normalizeModel/supports/requiresFeatures."

# Registry API
- file: src/harnesses/harness-registry.ts
  why: "getInstance().register(provider), .get(id), .has(id), static _resetForTesting(). register() THROWS on duplicate id — so always reset before registering."
  gotcha: "register() is add-only and errors on duplicate ids; reset in beforeEach is mandatory."
```

### Current Codebase tree (relevant subset)

```bash
src/
  core/
    agent.ts                       # ← guarded code (constructor harness resolution, lines 113-131)
  harnesses/
    harness-registry.ts            # HarnessRegistry singleton (register/get/has/_resetForTesting)
    register-defaults.ts           # registerDefaultHarnesses() (NOT used by this test — Issue 4 scope)
  utils/
    harness-config.ts              # configureHarnesses / getGlobalHarnessConfig / resolveHarnessConfig / resetGlobalHarnessConfig
  __tests__/
    unit/
      agent.test.ts                # ← EDIT TARGET (add sibling describe block; reuse existing imports/factory)
      agent-prompt-harness-override.test.ts   # createMockHarness pattern source (reference only)
plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/
  architecture/test-patterns-and-conventions.md   # conventions (MUST READ)
  P1M1T1S2/
    research/regression-test-design.md            # design rationale + fail-on-pre-fix proof
    PRP.md                                         # ← THIS FILE
```

### Desired Codebase tree with files to be added/changed

```bash
src/__tests__/unit/agent.test.ts   # MODIFIED — append ONE new describe block (~45-60 lines). No other file changes.
```

> **Alternative (acceptable, not preferred)**: create `src/__tests__/unit/agent-default-harness-resolution.test.ts`
> as a dedicated file. Preferred is appending to `agent.test.ts` because (a) all required
> imports + the `createMockHarness` factory already exist there, (b) it co-locates with the
> existing harness-resolution tests, and (c) the architecture doc's "Start Here" item 3 directs
> edits to this file. Either choice must satisfy the Success Criteria.

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: The resolved harness is a PRIVATE field with NO public accessor.
//   src/core/agent.ts:92  →  private readonly harness: Harness;
// There is NO getHarness(). Asserting the resolved id REQUIRES private-field access:
//     // @ts-expect-error - private field access for testing
//     expect(agent.harness.id).toBe('pi');
// (Read-only access; bracket notation agent['harness'].id also works, but the contract
//  mandates the @ts-expect-error idiom — mirror it.)

// CRITICAL: configureHarnesses() writes a DIFFERENT singleton than the legacy configureProviders().
//   - configureHarnesses() → globalHarnessConfig (default 'pi')   ← the one the Agent now reads
//   - configureProviders() → globalProviderConfig (default 'anthropic')  ← legacy, pre-fix path
// The test MUST call configureHarnesses() (the public API from Issue 1), NOT configureProviders().
// This is what makes the test fail on pre-fix code (pre-fix Agent read the legacy singleton → 'anthropic').

// CRITICAL: register() throws on duplicate ids. Always HarnessRegistry['_resetForTesting']()
// in beforeEach AND afterEach. Reset BOTH the registry AND the global config singleton —
// a stale globalHarnessConfig from a prior test would silently change the resolved default.

// GOTCHA: npm run lint (tsc --noEmit) EXCLUDES src/__tests__ (tsconfig.json exclude).
//   Type errors in the test file do NOT fail `npm run lint`; they surface only at `vitest run`
//   via esbuild (permissive). The @ts-expect-error directive is still honored by esbuild —
//   place it on the line directly above the private access, and ensure it is actually "used"
//   (i.e., the next line genuinely has a type error that the directive suppresses).

// GOTCHA: Imports use .js extensions for .ts source (bundler resolution). All imports in the
//   target file already follow this; do not introduce bare specifiers.

// GOTCHA: isolatedModules: true → type-only imports MUST be `import type { ... }`.
//   The target file already does this for Harness/HarnessId/HarnessCapabilities/ModelSpec.

// SCOPE BOUNDARY: Do NOT build the 4-scenario cascade matrix here (that is P1.M1.T1.S3).
//   Do NOT touch Issue 4 (auto-registration) — this test registers 'pi' MANUALLY by design,
//   so it isolates Issue 1's wiring fix.
```

---

## Implementation Blueprint

### Data models and structure

None. This is a test-only task. No production types, schemas, or models are created.
The test reuses the existing `createMockHarness(id: HarnessId): Harness` factory already
defined at `src/__tests__/unit/agent.test.ts:20-48`.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ the target file's reusable assets (NO edits)
  - READ src/__tests__/unit/agent.test.ts lines 1-141.
  - CONFIRM line 8 already imports { configureHarnesses, resetGlobalHarnessConfig } from '../../utils/harness-config.js'.
  - CONFIRM line 20-48 defines createMockHarness(id: HarnessId): Harness.
  - CONFIRM lines 105-141 contain the existing describe('Agent harness resolution') block (4 tests) — these are OFF LIMITS.
  - NOTE: createMockHarness signature here is (id) only (no executeImpl) — sufficient because the constructor never calls execute().

Task 2: APPEND a new sibling describe block to src/__tests__/unit/agent.test.ts
  - PLACEMENT: after the existing describe('Agent harness resolution') block (i.e., after its closing }); around line 141) and before describe('MCPHandler', ...).
  - NAMING: describe('Agent default harness resolution via configureHarnesses() (PRD §7.7 scenario 1)', () => { ... })
  - IMPORTS: none new — reuse configureHarnesses, resetGlobalHarnessConfig (line 8), createMockHarness (line 20), HarnessRegistry (line 9), Agent (line 2).
  - FOLLOW pattern: the existing describe('Agent harness resolution') beforeEach/afterEach (reset BOTH singleton + registry).
  - DEPENDENCIES: Task 1 (confirm assets exist).

Task 3: WRITE the primary test (scenario 1 — explicit configureHarnesses + no-harness Agent)
  - it('resolves new Agent({model}) with no harness to the global default "pi" after configureHarnesses()', () => { ... })
  - BODY (exact — see "Implementation Patterns" below):
      resetGlobalHarnessConfig() and HarnessRegistry['_resetForTesting']() are handled by beforeEach; register createMockHarness('pi');
      configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' });
      const agent = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });  // NO harness field
      expect(agent).toBeDefined();
      // @ts-expect-error - private field access for testing
      expect(agent.harness.id).toBe('pi');
  - NAMING: descriptive it() title referencing configureHarnesses + 'pi'.
  - COVERAGE: positive path (no throw) + resolved-id assertion (the weak existing test asserts only name).

Task 4: WRITE the inverse test (global-default-wins-over-registry — PRD §7.7)
  - it('uses the global default "pi" even when only "claude-code" is registered (default is config-driven, not registry-driven)', () => { ... })
  - BODY:
      // beforeEach already reset; do NOT call configureHarnesses (rely on DEFAULT_HARNESS_CONFIG.defaultHarness === 'pi')
      HarnessRegistry.getInstance().register(createMockHarness('claude-code'));
      expect(() => new Agent()).toThrow(/Harness 'pi' is not registered/);
      // now register 'pi' → resolves
      HarnessRegistry.getInstance().register(createMockHarness('pi'));
      const agent = new Agent();
      // @ts-expect-error - private field access for testing
      expect(agent.harness.id).toBe('pi');
  - COVERAGE: proves the cascade root is GlobalHarnessConfig.defaultHarness, NOT registry contents.

Task 5: RUN the new tests and confirm green
  - RUN: npx vitest run src/__tests__/unit/agent.test.ts -t "configureHarnesses"
  - RUN: npx vitest run src/__tests__/unit/agent.test.ts   (whole file)
  - EXPECT: all tests pass, including the 2 new ones. Existing 4 tests in describe('Agent harness resolution') still pass (untouched).

Task 6: PROVE fail-on-pre-fix (verification, optional but recommended)
  - TEMPORARILY revert src/core/agent.ts line 114-120 to the legacy path
    (getGlobalProviderConfig + resolveProviderConfig) via git stash / a scratch edit,
    run the new primary test, confirm it FAILS with "Harness 'anthropic' is not registered",
    then restore. (See "Fail-on-pre-fix proof" below — the table explains why it must fail.)
  - DO NOT commit the revert. This is a confidence check only.

Task 7: FULL suite regression check
  - RUN: npm test   (vitest run, full suite)
  - EXPECT: green EXCEPT the known-unrelated Issue 5 unicode failure in src/__tests__/adversarial/edge-case.test.ts (out of scope, pre-existing).
  - RUN: npm run lint   (tsc --noEmit) — EXPECT green (tests are excluded; this guards against accidental src/ edits).
```

### Implementation Patterns & Key Details

```typescript
// === The exact new describe block to append to src/__tests__/unit/agent.test.ts ===
// (Mirrors the existing describe('Agent harness resolution') lifecycle exactly.)

describe('Agent default harness resolution via configureHarnesses() (PRD §7.7 scenario 1)', () => {
  beforeEach(() => {
    resetGlobalHarnessConfig();
    HarnessRegistry['_resetForTesting']();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetGlobalHarnessConfig();
    HarnessRegistry['_resetForTesting']();
  });

  it('resolves new Agent({model}) with no harness to the global default "pi" after configureHarnesses()', () => {
    // Arrange: register ONLY a 'pi' mock (NO 'anthropic' mock). This is what makes the test
    // fail on pre-fix code — pre-fix Agent read the legacy singleton (default 'anthropic')
    // and would throw "Harness 'anthropic' is not registered".
    HarnessRegistry.getInstance().register(createMockHarness('pi'));

    // Act: the EXACT public API documented in PRD §7.6 (the one disconnected in Issue 1).
    configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' });

    // Construct with a realistic model and NO harness field (mirrors examples/harnesses/02).
    const agent = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });

    // Assert: did not throw, and the RESOLVED harness is 'pi' (not just "some harness").
    expect(agent).toBeDefined();
    // @ts-expect-error - private field access for testing
    expect(agent.harness.id).toBe('pi');
  });

  it('uses the global default "pi" even when only "claude-code" is registered (default is config-driven, not registry-driven)', () => {
    // Arrange: do NOT call configureHarnesses → getGlobalHarnessConfig() returns the
    // DEFAULT_HARNESS_CONFIG { defaultHarness: 'pi' }. Register ONLY 'claude-code'.
    HarnessRegistry.getInstance().register(createMockHarness('claude-code'));

    // Assert: the resolved default is 'pi' (from global config), NOT 'claude-code' (registry).
    expect(() => new Agent()).toThrow(/Harness 'pi' is not registered/);

    // Now register 'pi' → the same construction resolves to 'pi'.
    HarnessRegistry.getInstance().register(createMockHarness('pi'));
    const agent = new Agent();
    // @ts-expect-error - private field access for testing
    expect(agent.harness.id).toBe('pi');
  });
});

// === Fail-on-pre-fix proof (why Task 6 will see a failure) ===
// Pre-fix src/core/agent.ts:117-119 read the LEGACY singleton:
//     const globalConfig = getGlobalProviderConfig();   // → { defaultProvider: 'anthropic' }
//     const resolved = resolveProviderConfig(globalConfig, this.harnessId, this.harnessOptions);
// configureHarnesses() writes ONLY the NEW singleton; the legacy singleton stays null → 'anthropic'.
// The primary test registers ONLY a 'pi' mock → registry.get('anthropic') === undefined →
// constructor throws "Harness 'anthropic' is not registered" → expect(agent.harness.id).toBe('pi')
// never runs → test FAILS. Post-fix reads getGlobalHarnessConfig() → 'pi' → resolves → PASS.
```

### Integration Points

```yaml
DATABASE:
  - none (no persistence)
CONFIG:
  - none (test resets the in-memory global config singleton; no env vars, no files)
ROUTES:
  - none (no API surface; this is a constructor-level unit test)
REGISTRY:
  - HarnessRegistry['_resetForTesting']() in beforeEach AND afterEach (mandatory — register() throws on duplicates)
GLOBAL STATE:
  - resetGlobalHarnessConfig() in beforeEach AND afterEach (the NEW singleton under test)
MOCKS:
  - vi.clearAllMocks() in beforeEach (clears createMockHarness vi.fn() call records between tests)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# The test file is EXCLUDED from tsc (tsconfig.json exclude: src/__tests__).
# So `npm run lint` will NOT type-check it. Validate syntax via vitest's esbuild transform:

npx vitest run src/__tests__/unit/agent.test.ts --reporter=verbose 2>&1 | head -40
# Expected: the file transforms cleanly (no esbuild syntax errors) and the 2 new tests appear.

# Confirm you did NOT accidentally edit production source:
git diff --stat
# Expected: ONLY src/__tests__/unit/agent.test.ts changed (and this PRP/research files under plan/).
# If src/core/agent.ts or src/utils/harness-config.ts appear in the diff, STOP — that is out of scope.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run ONLY the new describe block (by title substring):
npx vitest run src/__tests__/unit/agent.test.ts -t "configureHarnesses"
# Expected: 2 tests passed (the primary + the inverse).

# Run the entire target file (must stay green — existing 4 resolution tests untouched):
npx vitest run src/__tests__/unit/agent.test.ts
# Expected: all tests pass (the file had 34 tests pre-S2; expect 36 post-S2).
```

### Level 3: Integration Testing (System Validation)

```bash
# Confirm the production-code wiring the test guards is intact (re-read the guarded lines):
grep -n "getGlobalHarnessConfig\|resolveHarnessConfig\|Harness '\${" src/core/agent.ts | head
# Expected: 3 call sites (constructor ~L114, stream ~L367, executePrompt ~L609) all use
# getGlobalHarnessConfig/resolveHarnessConfig; the throw template uses the resolved id.

# OPTIONAL confidence check — prove the test fails on pre-fix (Task 6):
#   git stash   # set aside the new test
#   # temporarily restore legacy resolution in src/core/agent.ts L114-120
#   git stash pop
#   npx vitest run src/__tests__/unit/agent.test.ts -t "configureHarnesses"
# Expected (pre-fix): primary test FAILS with "Harness 'anthropic' is not registered".
# Restore post-fix code before finishing. Do NOT commit the revert.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Full test suite — guard against regressions elsewhere from the new test's registry/config resets.
npm test
# Expected: green EXCEPT the known-unrelated pre-existing failure:
#   src/__tests__/adversarial/edge-case.test.ts > "should handle unicode in workflow names"
# (Issue 5, out of scope — do NOT attempt to fix it here.)

# Type/lint gate for production source (confirms no accidental src/ edits leaked in):
npm run lint
# Expected: green (tsc --noEmit on src/**; tests excluded).
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Level 1: `npx vitest run src/__tests__/unit/agent.test.ts` transforms and runs cleanly.
- [ ] Level 2: `npx vitest run src/__tests__/unit/agent.test.ts -t "configureHarnesses"` → 2 passed.
- [ ] Level 2: whole `agent.test.ts` file green; test count rose by exactly 2.
- [ ] Level 4: `npm test` green except the known-unrelated Issue 5 unicode failure.
- [ ] Level 4: `npm run lint` green (no accidental production-source edits).
- [ ] `git diff --stat` shows ONLY `src/__tests__/unit/agent.test.ts` (no `src/core/`, no `src/utils/`).

### Feature Validation

- [ ] New `describe` block is a SIBLING — the existing `describe('Agent harness resolution')` (4 tests) is unchanged.
- [ ] Primary test calls `configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' })` (the public API from Issue 1).
- [ ] Primary test registers ONLY a `'pi'` mock (no `'anthropic'` mock) — this is what forces fail-on-pre-fix.
- [ ] Primary test constructs `new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })` with NO harness field.
- [ ] Primary test asserts BOTH no-throw AND `agent.harness.id === 'pi'` (via `@ts-expect-error`).
- [ ] Inverse test proves the default is `'pi'` even when only `'claude-code'` is registered.
- [ ] `beforeEach`/`afterEach` reset `resetGlobalHarnessConfig()` + `HarnessRegistry['_resetForTesting']()` (+ `vi.clearAllMocks()` in beforeEach).
- [ ] Scope respected: NO 4-scenario matrix (that is S3); NO auto-registration (that is Issue 4 / T2).

### Code Quality Validation

- [ ] Follows existing `agent.test.ts` idiom (relative `.js` imports, `import type` for types, `vi.fn()` mocks).
- [ ] `@ts-expect-error` directives paired with descriptive comments; placed directly over genuine private-field access.
- [ ] `it()` titles are descriptive and reference `configureHarnesses` / PRD §7.7 for discoverability.
- [ ] No new imports introduced (reuses existing `configureHarnesses`, `resetGlobalHarnessConfig`, `createMockHarness`, `HarnessRegistry`, `Agent`).
- [ ] No hardcoded values that should be config; no sync-in-async misuse (tests are synchronous — the constructor is synchronous).

### Documentation & Deployment

- [ ] Test `it()` titles and inline comments explain WHY each assertion exists (esp. the "registers ONLY 'pi' → fails on pre-fix" note).
- [ ] No new env vars or config files.

---

## Anti-Patterns to Avoid

- ❌ **Do NOT modify the existing `describe('Agent harness resolution')` block** (lines 105-141). It guards the legacy regression contract; the architecture doc explicitly says add a SIBLING.
- ❌ **Do NOT call `configureProviders()` instead of `configureHarnesses()`** — the whole point of Issue 1 is the public `configureHarnesses()` API. Using the legacy alias would not guard the fix.
- ❌ **Do NOT register an `'anthropic'` mock in the primary test** — that would mask the regression (pre-fix would find 'anthropic' in the registry and not throw). Register ONLY `'pi'`.
- ❌ **Do NOT assert only `agent.name === 'Agent'`** — that is harness-independent and the exact weakness of the existing test. Assert `agent.harness.id === 'pi'`.
- ❌ **Do NOT omit the `@ts-expect-error`** over private-field access — it is the mandated idiom; omitting it produces a type error (caught only at vitest run, but still wrong).
- ❌ **Do NOT skip the registry/global-config reset** in `beforeEach`/`afterEach` — `register()` throws on duplicates and a stale singleton changes the resolved default.
- ❌ **Do NOT build the full 4-scenario cascade matrix** here — that is P1.M1.T1.S3. S2 is strictly scenario 1 + its inverse.
- ❌ **Do NOT depend on `registerDefaultHarnesses()` / Issue 4's auto-registration** — register `'pi'` manually so the test isolates Issue 1's wiring.
- ❌ **Do NOT catch all exceptions / swallow the constructor throw** in the inverse test — use `expect(() => new Agent()).toThrow(/Harness 'pi' is not registered/)` to assert the specific regression message.

---

## Confidence Score

**9/10** for one-pass implementation success.

Rationale: This is a small (2-test), well-bounded test-only task. Every required asset
(`configureHarnesses`, `resetGlobalHarnessConfig`, `createMockHarness`, `HarnessRegistry`)
is already imported/defined in the target file, the exact code is provided verbatim in the
Implementation Blueprint, and the fail-on-pre-fix behavior is proven by construction (the
pre/post-fix resolution table). The only residual uncertainty is the implementer remembering
the scope boundaries (no matrix, no auto-register, sibling-not-modification) — which are
called out repeatedly above. Deducted 1 point for the `@ts-expect-error`-placement nuance
(esbuild honors it but a misplaced/unused directive can occasionally trip stricter tooling).
