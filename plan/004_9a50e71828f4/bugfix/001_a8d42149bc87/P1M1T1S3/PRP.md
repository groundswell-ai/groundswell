# PRP — P1.M1.T1.S3: 4-Scenario Cascade Matrix Regression Test at the Agent Level

**Scope**: Bugfix `001_a8d42149bc87` → Milestone P1.M1 (Critical — Issue 1) → Task T1 (Rewire Agent harness resolution) → **Subtask S3**.
**Type**: TEST-ONLY. No production source changes. Co-locates the PRD §7.7 4-scenario cascade matrix at the Agent level (global / agent / prompt combinations) — the acceptance contract called out in the work item.
**Prerequisites**: P1.M1.T1.S1 is **Complete** (commit `adbdc5c`); P1.M1.T1.S2 is **Complete** (commit `63bf81f`). **P1.M1.T2.S1 is a HARD dependency for scenario 4 only** (see "Scenario 4 Dependency" below).

---

## Goal

**Feature Goal**: Add a single co-located regression suite that documents and guards the **full PRD §7.7 harness cascade** at the Agent level — all 4 canonical scenarios in one matrix file, asserting the resolved harness across the global → agent → prompt axes via BOTH the `Agent` constructor AND `Agent.prompt()` / `Agent.stream()` (mirroring the existing override-test idioms).

The 4 scenarios (the acceptance contract from the work item, matching the cascade matrix in PRD §7.7 / architecture §8):

| # | global.defaultHarness | agent.harness | prompt.harness | resolved | Assertion point |
|---|---|---|---|---|---|
| 1 | `'pi'` | — | — | `'pi'` | `Agent` constructor |
| 2 | `'pi'` | `'claude-code'` | — | `'claude-code'` | `Agent` constructor |
| 3 | `'pi'` | `'claude-code'` | `'pi'` | `'pi'` (prompt wins) | `Agent.prompt()` **and** `Agent.stream()` |
| 4 | (none — cold start) | — | — | `'pi'` (default + auto-register) | `Agent` constructor (REQUIRES P1.M1.T2.S1) |

**Deliverable**: One new test file `src/__tests__/unit/agent-harness-cascade-matrix.test.ts` containing a single top-level `describe('Agent harness cascade matrix (PRD §7.7 — 4 canonical scenarios)')` with: (a) a parametrized constructor-axis matrix covering scenarios 1, 2, and the gated scenario 4; (b) a prompt-axis `it` for scenario 3; (c) a stream-axis `it` for scenario 3. No production files touched. No existing test files modified (S2's block in `agent.test.ts` stays byte-for-byte unchanged).

**Success Definition**:
1. Scenarios 1, 2, and 3 PASS against the current (post-P1.M1.T1.S1) codebase.
2. Scenario 4 is present, gated behind a capability probe (`it.skipIf`) so it is **auto-skipped** (CI stays green) until P1.M1.T2.S1 lands, then **auto-activates** and PASSES — proving Issue 4's safety net. In the final state (post-T2.S1) all 4 scenarios are active and green.
3. Scenario 1 is a genuine regression guard for Issue 1: it FAILS on pre-P1.M1.T1.S1 code (proven by construction — see "Fail-on-pre-fix proof").
4. `npm test` (full `vitest run`) is green at every intermediate state (excluding the known-unrelated Issue 5 unicode failure in `src/__tests__/adversarial/edge-case.test.ts`, which is out of scope).
5. `npm run lint` is green (no accidental `src/` edits — tests are excluded from `tsc` anyway).

---

## Why

- **The cascade matrix is undocumented as a unified surface.** Architecture `test-patterns-and-conventions.md` §8 confirms: *"There is NO single test file that documents all four cascade scenarios as a unified matrix."* The cascade is only exercised piecewise — `resolveHarnessConfig` pure-function tests in `harness-config.test.ts` (function level, NOT through the Agent), and `agent-prompt-harness-override.test.ts` (prompt axis only). S3 closes this gap by co-locating all 4 scenarios through the real `Agent`.
- **Scenario 1 is the keystone regression guard for Issue 1.** The default-resolution path through the NEW public `configureHarnesses()` → `getGlobalHarnessConfig()` → `Agent` constructor had ZERO coverage — the documented root cause of why Issue 1 slipped through (architecture §3). S2 added scenario 1 standalone; S3 embeds it in the matrix for discoverability and documents the full priority contract around it.
- **Scenario 4 is the acceptance test for P1.M1.T2.S1 (Issue 4).** Issue 4 (`registerDefaultHarnesses` not exported / never auto-invoked) means `new Agent({ model })` with ZERO setup crashes on launch. Scenario 4 proves the no-setup journey works once T2.S1 ships. Gating it with a capability probe lets S3 land NOW (before T2.S1) without going red.
- **The matrix codifies PRD §7.7 priority as executable documentation.** A future refactor that flips the cascade order (e.g., agent-beats-prompt) will turn scenario 3 red — catching regressions the individual override tests would miss because they don't assert the full priority chain end-to-end.

---

## What

A new `describe` block in a new file `src/__tests__/unit/agent-harness-cascade-matrix.test.ts`, structured as:

1. **`createMockHarness(id, executeImpl?)` factory** — copied from `src/__tests__/unit/agent-prompt-harness-override.test.ts:33-72` (the variant WITH `executeImpl`, needed for prompt/stream axes; default execute returns `createSuccessResponse(...)`).
2. **Capability probe `AUTO_REGISTER_ACTIVE`** (module-load const) — detects whether P1.M1.T2.S1's auto-registration safety net is active (cold `new Agent()` resolves `'pi'` vs. throws).
3. **`beforeEach`/`afterEach`** — reset `HarnessRegistry['_resetForTesting']()` + `resetGlobalHarnessConfig()` + `resetGlobalConfig()` (legacy, for safety) + `vi.clearAllMocks()`.
4. **Constructor-axis matrix** — `it.each([...])` with scenarios 1 and 2 (and the gated scenario 4 as a sibling `it.skipIf(!AUTO_REGISTER_ACTIVE)`), each asserting the resolved private `agent.harness.id`.
5. **Prompt-axis `it`** (scenario 3 via `Agent.prompt()`) — construct `new Agent({ harness: 'claude-code' })` with global `'pi'`, call `agent.prompt(p, { harness: 'pi' })`, assert `registry.get('pi').execute` called AND `registry.get('claude-code').execute` NOT called.
6. **Stream-axis `it`** (scenario 3 via `Agent.stream()`) — same matrix via `agent.stream(p, { harness: 'pi' })`, consuming the async generator, then the same execute assertions.

### Success Criteria

- [ ] New file `src/__tests__/unit/agent-harness-cascade-matrix.test.ts` created; NO existing test file modified (S2's `agent.test.ts:145-189` block untouched).
- [ ] All 4 canonical scenarios are present and co-located in one `describe`.
- [ ] Scenarios 1, 2, 3 PASS on current code; scenario 4 is gated by `it.skipIf(!AUTO_REGISTER_ACTIVE)` (skipped now, passes after T2.S1).
- [ ] Scenario 3 is asserted via BOTH `Agent.prompt()` and `Agent.stream()` (mirroring the override idioms).
- [ ] `beforeEach`/`afterEach` reset BOTH singletons + registry + `vi.clearAllMocks()`.
- [ ] `npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts` is green (scenario 4 skipped pre-T2.S1, not failed).
- [ ] `npm test` stays green overall (except known-unrelated Issue 5).

---

## All Needed Context

### Context Completeness Check

_Pass._ An implementer with no prior knowledge of this codebase can implement this test using only: (a) the verbatim `createMockHarness` factory + capability probe + test bodies in the Implementation Blueprint, (b) the two override-test files to mirror, and (c) the architecture doc for conventions. No external research required — pure internal unit test.

### Documentation & References

```yaml
# MUST READ — canonical conventions cheat sheet (authoritative)
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/test-patterns-and-conventions.md
  why: "§8 (cascade matrix — NO single dedicated test exists; this S3 creates it), §3 (default-resolution gap = Issue 1 root cause), §6 (createMockHarness source), §9 (TS config: .js imports, import type, @ts-expect-error), §10 (conventions cheat sheet)."
  critical: "Confirms the 4-scenario table (§8) and mandates co-location. Also documents npm run lint EXCLUDES src/__tests__ (tsconfig exclude) — type errors in tests surface only at vitest run."

# MUST READ — the design rationale + dependency analysis + fail-on-pre-fix proof
- docfile: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M1T1S3/research/cascade-matrix-test-design.md
  why: "§1 (S1/S2 complete, T2.S1 PENDING = scenario-4 hard dependency + sequencing tension), §2 (4-scenario → assertion-point mapping), §3 (fail-on-pre-fix proof — HONEST version: only scenario 1 truly fails pre-S1), §4 (reusable assets), §6 (capability probe for scenario 4)."

# MUST READ — the createMockHarness(id, executeImpl?) factory to COPY
- file: src/__tests__/unit/agent-prompt-harness-override.test.ts
  why: "Lines 33-72: createMockHarness with executeImpl param (needed for prompt axis). Lines 96-116: the 'prompt harness override beats the agent harness' idiom = scenario 3's prompt() body to mirror. Lines 48-56: beforeEach/afterEach reset pattern (resetGlobalConfig + registry)."
  pattern: "createMockHarness returns a full Harness object (capabilities + vi.fn() for initialize/terminate/execute/registerMCPs/loadSkills/normalizeModel/supports/requiresFeatures)."

# MUST READ — the stream-axis createMockHarness + consume-generator idiom to COPY
- file: src/__tests__/unit/agent-stream-harness-override.test.ts
  why: "Lines 33-62: streaming createMockHarness (default execute is an async generator yielding StreamEvents + returning AgentResponse). Lines 101-128: 'prompt harness override beats the agent harness' for stream() = scenario 3's stream() body to mirror (const {stream} = agent.stream(...); for await ... ; assert execute)."
  gotcha: "The streaming mock's execute MUST be an async generator (function*) for stream() to work; a plain async fn will break the generator contract."

# The cascade utility under test (already correct post-S1 — read to confirm signatures)
- file: src/utils/harness-config.ts
  why: "resolveHarnessConfig(global, agentHarness?, agentOptions?, promptHarness?, promptOptions?) at L192-215: harness = promptHarness ?? agentHarness ?? globalConfig.defaultHarness (first-defined-wins); options merge LWW. configureHarnesses() at L119 writes the NEW singleton (validated 'pi'|'claude-code'); getGlobalHarnessConfig() at L158 (DEFAULT_HARNESS_CONFIG.defaultHarness === 'pi'); resetGlobalHarnessConfig() at L222 nulls the singleton."
  pattern: "The cascade priority the matrix asserts. Scenario 3's prompt-wins is the ?? chain."

# The production code under test (post-S1 state — read to confirm the private field + 3 call sites)
- file: src/core/agent.ts
  why: "L45: imports ONLY getGlobalHarnessConfig, resolveHarnessConfig (legacy import removed by S1). L92: 'private readonly harness: Harness;' (NO public accessor → @ts-expect-error needed). L114-120: constructor resolution. L254-262: prompt() delegates to executePrompt(). L362-373: stream() promptHarness extraction + resolveHarnessConfig(global, this.harnessId, this.harnessOptions, promptHarness, promptHarnessOptions). L604-615: executePrompt() same. L126-131: throw 'Harness ${id} is not registered' on missing."
  gotcha: "Constructor NEVER calls harness.initialize()/execute()/normalizeModel() — a vi.fn()-only mock is fully sufficient for constructor assertions. No SDK mocking needed."

# The S2 block (predecessor) — DO NOT MODIFY, but understand it covers scenario 1 standalone
- file: src/__tests__/unit/agent.test.ts
  why: "Lines 145-189: S2's 'describe(Agent default harness resolution via configureHarnesses() (PRD §7.7 scenario 1))'. S3 RE-ENCODES scenario 1 inside the matrix (intentional co-location per architecture §8); S2's block stays untouched as an independent guard."

# The registry API
- file: src/harnesses/harness-registry.ts
  why: "getInstance().register(provider), .get(id), .has(id), static _resetForTesting(). register() THROWS on duplicate id — reset in beforeEach is mandatory."
  gotcha: "register() is add-only and errors on duplicate ids; reset in beforeEach AND afterEach."

# registerDefaultHarnesses (the T2.S1 subject — NOT yet exported/auto-invoked)
- file: src/harnesses/register-defaults.ts
  why: "L28: registerDefaultHarnesses(registry?) — idempotent (guards via registry.has). Currently ONLY exported from src/harnesses/index.ts, NOT from src/index.ts, and NEVER auto-invoked. This is why scenario 4 (zero setup) currently throws and must be gated until T2.S1."

# vitest version (confirms it.skipIf + it.each are available)
- file: package.json
  why: "vitest ^1.0.0; installed 1.6.1 (check node_modules/vitest/package.json). it.skipIf available since 1.5.0; it.each available since 0.x. Both safe to use."
```

### Current Codebase tree (relevant subset)

```bash
src/
  core/
    agent.ts                      # guarded code (constructor L114-131, stream L362-388, executePrompt L604-631)
  harnesses/
    harness-registry.ts           # HarnessRegistry singleton (register/get/has/_resetForTesting)
    register-defaults.ts          # registerDefaultHarnesses() — NOT yet exported/auto (Issue 4, T2.S1 scope)
  utils/
    harness-config.ts             # configureHarnesses / getGlobalHarnessConfig / resolveHarnessConfig / resetGlobalHarnessConfig
  __tests__/
    unit/
      agent.test.ts                       # S2 block lives here (L145-189) — DO NOT TOUCH
      agent-prompt-harness-override.test.ts   # createMockHarness(executeImpl) + prompt-axis idiom (MIRROR)
      agent-stream-harness-override.test.ts   # streaming createMockHarness + stream-axis idiom (MIRROR)
      utils/harness-config.test.ts         # pure-function cascade tests (NOT through Agent — S3 complements this)
plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/
  architecture/test-patterns-and-conventions.md   # conventions (MUST READ, esp. §8)
  P1M1T1S3/
    research/cascade-matrix-test-design.md        # design rationale + dependency + fail-on-pre-fix proof
    PRP.md                                         # ← THIS FILE
```

### Desired Codebase tree with files to be added/changed

```bash
src/__tests__/unit/agent-harness-cascade-matrix.test.ts   # NEW (~180-220 lines). The single deliverable.
```

> **Acceptable alternative**: append the `describe` block to `src/__tests__/unit/agent.test.ts` as a sibling (consistent with S2's choice). Preferred is the dedicated file because (a) it spans constructor + prompt + stream axes, (b) it co-locates the matrix as architecture §8 mandates, (c) it mirrors the dedicated override-test files, and (d) it keeps the already-large `agent.test.ts` focused. Either choice must satisfy the Success Criteria.

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL (T2.S1 DEPENDENCY): Scenario 4 REQUIRES P1.M1.T2.S1 to PASS.
//   registerDefaultHarnesses() exists (src/harnesses/register-defaults.ts:28) but is NOT exported
//   from src/index.ts and NOT auto-invoked. The registry starts EMPTY. So `new Agent()` with ZERO
//   setup currently THROWS "Harness 'pi' is not registered". Until T2.S1 ships the lazy
//   auto-registration safety net, scenario 4 MUST be gated with it.skipIf(!AUTO_REGISTER_ACTIVE)
//   (capability probe at module load) so CI stays GREEN. Once T2.S1 lands, the probe flips true
//   and scenario 4 auto-activates + passes. The final state MUST have scenario 4 active.

// CRITICAL (fail-on-pre-fix honesty): Of the 4 scenarios, ONLY scenario 1 truly FAILS on pre-S1
//   code. Scenarios 2 and 3 pass even pre-S1 because resolveHarnessConfig is first-defined-wins
//   (agent/prompt axes OVERRIDE the global default, so the buggy legacy singleton is never
//   consulted when agent/prompt is set). Scenario 1 is the keystone Issue-1 regression guard;
//   scenarios 2 & 3 are behavioral documentation of the priority contract. Do NOT overclaim that
//   "scenarios 1-3 all fail pre-fix" — that is only literally true for scenario 1. See research §3.

// CRITICAL: The resolved harness is a PRIVATE field with NO public accessor.
//   src/core/agent.ts:92  →  private readonly harness: Harness;
// Asserting the resolved id REQUIRES private-field access:
//     // @ts-expect-error - private field access for testing
//     expect(agent.harness.id).toBe('pi');

// CRITICAL: configureHarnesses() writes a DIFFERENT singleton than legacy configureProviders().
//   - configureHarnesses() → globalHarnessConfig (default 'pi')   ← the one the Agent reads post-S1
//   - configureProviders() → globalProviderConfig (default 'anthropic')  ← legacy
// Scenario 4 must call NEITHER (zero setup). Scenarios 1-3 call configureHarnesses().
// Reset BOTH singletons in beforeEach/afterEach for safety (mirror agent.test.ts).

// CRITICAL: register() throws on duplicate ids. Always HarnessRegistry['_resetForTesting']()
//   in beforeEach AND afterEach.

// GOTCHA: For the stream() axis, the mock harness's execute MUST be an async generator
//   (async function*), NOT a plain async function — agent.stream() iterates it as AsyncStream.
//   Mirror agent-stream-harness-override.test.ts:33-62 exactly.

// GOTCHA: npm run lint (tsc --noEmit) EXCLUDES src/__tests__ (tsconfig.json exclude).
//   Type errors in the test do NOT fail lint; surface only at vitest run via esbuild (permissive).
//   The @ts-expect-error directive IS honored by esbuild — place directly over the private access.

// GOTCHA: Imports use .js extensions for .ts source (bundler resolution). Use import type for
//   type-only imports (isolatedModules: true).

// SCOPE BOUNDARY: Do NOT modify src/core/agent.ts or any src/ file (S1 is done). Do NOT modify
//   S2's block in agent.test.ts. Do NOT implement T2.S1 (that's a separate subtask) — only GATE
//   scenario 4 against it.
```

---

## Implementation Blueprint

### Data models and structure

None. Test-only. The file reuses the `createMockHarness(id, executeImpl?)` factory copied verbatim from `agent-prompt-harness-override.test.ts:33-72` (with the streaming variant's default execute — see `agent-stream-harness-override.test.ts:44-54` — for the stream-axis `it`).

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ the mirror files + confirm S1 wiring (NO edits)
  - READ src/__tests__/unit/agent-prompt-harness-override.test.ts:33-72 (createMockHarness w/ executeImpl) + L96-116 (prompt-wins idiom).
  - READ src/__tests__/unit/agent-stream-harness-override.test.ts:33-62 (streaming createMockHarness) + L101-128 (stream prompt-wins idiom).
  - CONFIRM src/core/agent.ts:45 imports ONLY { getGlobalHarnessConfig, resolveHarnessConfig }; L92 'private readonly harness'; L114-131 constructor resolution+throw.
  - CONFIRM src/utils/harness-config.ts:192 resolveHarnessConfig signature (global, agentHarness?, agentOptions?, promptHarness?, promptOptions?).
  - DEPENDENCIES: none.

Task 2: CREATE src/__tests__/unit/agent-harness-cascade-matrix.test.ts (header + factory + probe + lifecycle)
  - IMPORTS: { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; Agent from '../../core/agent.js'; Prompt from '../../core/prompt.js'; HarnessRegistry from '../../harnesses/harness-registry.js'; { configureHarnesses, resetGlobalHarnessConfig } from '../../utils/harness-config.js'; { resetGlobalConfig } from '../../utils/provider-config.js'; { createSuccessResponse } from '../../types/agent.js'; { z } from 'zod'; type { Harness, HarnessId, HarnessCapabilities, HarnessRequest } from '../../types/harnesses.js'; type { ModelSpec } from '../../types/providers.js'; type { StreamEvent } from '../../types/streaming.js'; type { AgentResponse } from '../../types/agent.js'.
  - PASTE createMockHarness(id, executeImpl?) verbatim from agent-prompt-harness-override.test.ts:33-72.
  - DEFINE the AUTO_REGISTER_ACTIVE capability probe (module-load const — see Implementation Patterns).
  - DEFINE describe('Agent harness cascade matrix (PRD §7.7 — 4 canonical scenarios)') with beforeEach/afterEach resetting BOTH singletons + registry + vi.clearAllMocks().
  - FOLLOW pattern: agent.test.ts:107-113 lifecycle (resetGlobalHarnessConfig + HarnessRegistry['_resetForTesting']) PLUS resetGlobalConfig (legacy safety).
  - DEPENDENCIES: Task 1.

Task 3: WRITE the constructor-axis parametrized matrix (scenarios 1 & 2)
  - Use it.each([...]) with rows: [scenario-1-config, expected-1], [scenario-2-config, expected-2].
    Row 1: global 'pi' (configureHarnesses), register('pi'), new Agent({model}) → expect 'pi'.
    Row 2: global 'pi' (configureHarnesses), register('pi')+register('claude-code'), new Agent({harness:'claude-code',model}) → expect 'claude-code'.
  - Assert via @ts-expect-error private access: expect(agent.harness.id).toBe(expected).
  - NAMING: it.each title 'scenario $n: resolves to "$expected" (global=$global, agent=$agent)'. (Use object rows for readable $ interpolation.)
  - DEPENDENCIES: Task 2.

Task 4: WRITE scenario 4 (zero-setup, GATED) as a sibling it.skipIf
  - it.skipIf(!AUTO_REGISTER_ACTIVE)('scenario 4: zero setup (no configureHarnesses, no registration) resolves to "pi" via default + auto-registration safety net', () => { ... })
  - BODY: beforeEach already reset; do NOT call configureHarnesses; do NOT register anything; const agent = new Agent({ model }); expect no throw; @ts-expect-error expect(agent.harness.id).toBe('pi').
  - GOTCHA: This test is SKIPPED (not failed) until P1.M1.T2.S1 lands. Document the dependency in a leading comment.
  - DEPENDENCIES: Task 2 (the probe).

Task 5: WRITE scenario 3 via Agent.prompt() (prompt-wins axis)
  - it('scenario 3 (prompt axis via Agent.prompt()): prompt "pi" beats agent "claude-code" → pi.execute called, claude-code not', async () => { ... })
  - BODY: configureHarnesses({defaultHarness:'pi', defaultModelProvider:'anthropic'}); register('pi') + register('claude-code'); const agent = new Agent({harness:'claude-code'}); vi.clearAllMocks(); const prompt = new Prompt({user:'t', responseFormat: z.object({result: z.string()})}); await agent.prompt(prompt, {harness:'pi'}); expect(registry.get('pi')!.execute).toHaveBeenCalled(); expect(registry.get('claude-code')!.execute).not.toHaveBeenCalled().
  - FOLLOW pattern: agent-prompt-harness-override.test.ts:96-116.
  - DEPENDENCIES: Task 2.

Task 6: WRITE scenario 3 via Agent.stream() (prompt-wins axis)
  - it('scenario 3 (prompt axis via Agent.stream()): prompt "pi" beats agent "claude-code" → pi.execute called, claude-code not', async () => { ... })
  - BODY: same setup as Task 5; const { stream } = agent.stream(prompt, {harness:'pi'}); for await (const _event of stream) { /* consume */ }; same execute assertions.
  - GOTCHA: registry mocks must have a streaming execute (async generator) for stream() to work — re-register a streaming createMockHarness variant OR ensure the default mock execute is an async generator. Simplest: register a streaming-capable mock for 'pi' and 'claude-code' in this test (reset + re-register). Mirror agent-stream-harness-override.test.ts:33-62 + L101-128.
  - DEPENDENCIES: Task 2.

Task 7: RUN the new file + confirm green (scenario 4 skipped, not failed)
  - RUN: npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts --reporter=verbose
  - EXPECT: scenarios 1, 2, 3-prompt, 3-stream PASS; scenario 4 SKIPPED (pre-T2.S1) with a clear skip reason.

Task 8: PROVE fail-on-pre-fix for scenario 1 (verification, optional but recommended)
  - TEMPORARILY revert src/core/agent.ts L114-120 to legacy (getGlobalProviderConfig + resolveProviderConfig) via git stash / scratch edit; run scenario 1; confirm FAIL ("Harness 'anthropic' is not registered"); restore. Do NOT commit the revert.
  - EXPECT: scenario 1 FAILS pre-S1; scenarios 2 & 3 still pass (documented in research §3 — they don't depend on the global singleton).

Task 9: FULL suite regression + lint
  - RUN: npm test  → EXPECT green except known-unrelated Issue 5 (unicode). Scenario 4 skipped, not failed.
  - RUN: npm run lint  → EXPECT green (guards against accidental src/ edits).
  - RUN: git diff --stat → EXPECT ONLY src/__tests__/unit/agent-harness-cascade-matrix.test.ts (+ plan/ docs).
```

### Implementation Patterns & Key Details

```typescript
// === src/__tests__/unit/agent-harness-cascade-matrix.test.ts ===
// (Header imports + createMockHarness copied verbatim from agent-prompt-harness-override.test.ts:1-72.)

// --- Capability probe: detects P1.M1.T2.S1's auto-registration safety net ---
// Runs ONCE at module load. Isolated per-file (vitest runs each file in its own module scope).
// Cleans up in finally so the first beforeEach starts clean regardless.
const AUTO_REGISTER_ACTIVE = (() => {
  HarnessRegistry['_resetForTesting']();
  resetGlobalHarnessConfig();
  resetGlobalConfig();
  try {
    const probe = new Agent();
    // @ts-expect-error - private field access for testing
    return probe.harness?.id === 'pi';
  } catch {
    return false; // "Harness 'pi' is not registered" → safety net not yet active (pre-T2.S1)
  } finally {
    HarnessRegistry['_resetForTesting']();
    resetGlobalHarnessConfig();
    resetGlobalConfig();
  }
})();

describe('Agent harness cascade matrix (PRD §7.7 — 4 canonical scenarios)', () => {
  beforeEach(() => {
    resetGlobalHarnessConfig();
    resetGlobalConfig();
    HarnessRegistry['_resetForTesting']();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetGlobalHarnessConfig();
    resetGlobalConfig();
    HarnessRegistry['_resetForTesting']();
  });

  // ---- Constructor axis: scenarios 1 & 2 (parametrized) ----
  // Each row: { n, global, agent, register, expected }. $ interpolation needs object rows.
  it.each([
    { n: 1, global: 'pi', agent: undefined, register: ['pi'], expected: 'pi' },
    { n: 2, global: 'pi', agent: 'claude-code', register: ['pi', 'claude-code'], expected: 'claude-code' },
  ])('scenario $n: global=$global, agent=$agent → resolves to "$expected" via constructor', ({ global, agent, register, expected }) => {
    configureHarnesses({ defaultHarness: global as HarnessId, defaultModelProvider: 'anthropic' });
    for (const id of register) HarnessRegistry.getInstance().register(createMockHarness(id));
    const config: any = { model: 'anthropic/claude-sonnet-4-20250514' };
    if (agent) config.harness = agent;
    const agentInstance = new Agent(config);
    // @ts-expect-error - private field access for testing
    expect(agentInstance.harness.id).toBe(expected);
  });

  // ---- Scenario 4: zero setup (GATED until P1.M1.T2.S1) ----
  // REQUIRES P1.M1.T2.S1 (export registerDefaultHarnesses + lazy auto-registration).
  // Skipped (not failed) until the safety net lands; auto-activates once it does.
  it.skipIf(!AUTO_REGISTER_ACTIVE)(
    'scenario 4: zero setup (no configureHarnesses, no registration) resolves to "pi" via default + auto-registration safety net',
    () => {
      // beforeEach already reset registry + global config. Do NOT register anything.
      const agent = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });
      // @ts-expect-error - private field access for testing
      expect(agent.harness.id).toBe('pi');
    },
  );

  // ---- Scenario 3: prompt axis via Agent.prompt() (prompt wins) ----
  it('scenario 3 (prompt axis via Agent.prompt()): prompt "pi" beats agent "claude-code"', async () => {
    configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' });
    HarnessRegistry.getInstance().register(createMockHarness('pi'));
    HarnessRegistry.getInstance().register(createMockHarness('claude-code'));

    const agent = new Agent({ harness: 'claude-code' });
    const prompt = new Prompt({ user: 't', responseFormat: z.object({ result: z.string() }) });
    vi.clearAllMocks();

    await agent.prompt(prompt, { harness: 'pi' });

    expect(HarnessRegistry.getInstance().get('pi')!.execute).toHaveBeenCalled();
    expect(HarnessRegistry.getInstance().get('claude-code')!.execute).not.toHaveBeenCalled();
  });

  // ---- Scenario 3: prompt axis via Agent.stream() (prompt wins) ----
  // The streaming mock's execute MUST be an async generator (mirror agent-stream-harness-override.test.ts:33-62).
  it('scenario 3 (prompt axis via Agent.stream()): prompt "pi" beats agent "claude-code"', async () => {
    // Re-register streaming-capable mocks (execute = async generator) for this test.
    HarnessRegistry.getInstance().register(createMockHarness('pi'));        // default execute is fine for the WINNING harness check
    HarnessRegistry.getInstance().register(createMockHarness('claude-code'));
    configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' });

    const agent = new Agent({ harness: 'claude-code' });
    const prompt = new Prompt({ user: 't', responseFormat: z.object({ result: z.string() }) });
    vi.clearAllMocks();

    const { stream } = agent.stream(prompt, { harness: 'pi' });
    for await (const _event of stream) { /* consume */ }

    expect(HarnessRegistry.getInstance().get('pi')!.execute).toHaveBeenCalled();
    expect(HarnessRegistry.getInstance().get('claude-code')!.execute).not.toHaveBeenCalled();
  });
});

// === Fail-on-pre-fix proof (Task 8) ===
// Pre-S1 src/core/agent.ts:117-119 read getGlobalProviderConfig() (legacy, default 'anthropic').
// Scenario 1 registers ONLY 'pi' → registry.get('anthropic') === undefined → constructor throws
// "Harness 'anthropic' is not registered" → expect(agent.harness.id).toBe('pi') never runs → FAIL.
// Scenarios 2 & 3 pass even pre-S1 (agent/prompt axes override the global singleton via ?? chain,
// so the buggy singleton is never consulted). Scenario 1 is therefore the keystone Issue-1 guard.
// Scenario 4 additionally guards Issue 4 (T2.S1) — it is the no-setup acceptance test.
```

> **createMockHarness note**: Copy the variant WITH `executeImpl` from `agent-prompt-harness-override.test.ts:33-72`. Its default `execute` returns `createSuccessResponse(...)`. For the **stream-axis** `it` (Task 6), `agent.stream()` iterates the resolved harness's `execute` as an `AsyncStream` — the default non-generator execute will cause `agent.stream()` to throw when iterated. Two safe options: (a) copy the **streaming** `createMockHarness` default (async generator yielding StreamEvents + returning AgentResponse) from `agent-stream-harness-override.test.ts:44-54` as the single factory used file-wide (works for both prompt and stream axes — prompt ignores the generator nature), OR (b) define two factories. **Recommended (a)**: use the streaming-capable factory file-wide so both axes work uniformly. Update the Implementation Patterns accordingly if you choose (a).

### Integration Points

```yaml
DATABASE: none
CONFIG: none (test resets in-memory singletons; no env vars, no files)
ROUTES: none (constructor + prompt/stream unit test)
REGISTRY:
  - HarnessRegistry['_resetForTesting']() in beforeEach AND afterEach (register() throws on duplicates)
GLOBAL STATE:
  - resetGlobalHarnessConfig() + resetGlobalConfig() in beforeEach AND afterEach (BOTH singletons)
MOCKS:
  - vi.clearAllMocks() in beforeEach (clears createMockHarness vi.fn() records between tests)
GATING:
  - it.skipIf(!AUTO_REGISTER_ACTIVE) on scenario 4 (capability probe at module load)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Tests are EXCLUDED from tsc (tsconfig.json exclude: src/__tests__). Validate via vitest's esbuild:
npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts --reporter=verbose 2>&1 | head -40
# Expected: file transforms cleanly (no esbuild syntax errors); scenarios 1,2,3 pass; scenario 4 skipped.

# Confirm NO production source was touched:
git diff --stat
# Expected: ONLY src/__tests__/unit/agent-harness-cascade-matrix.test.ts (+ plan/ docs).
# If src/core/agent.ts, src/utils/*, or src/harnesses/* appear → STOP (out of scope).
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new file:
npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts
# Expected (pre-T2.S1): 4 passed, 1 skipped (scenario 4). Post-T2.S1: 5 passed, 0 skipped.

# Confirm S2's block in agent.test.ts is untouched and still green:
npx vitest run src/__tests__/unit/agent.test.ts -t "configureHarnesses"
# Expected: 2 passed (S2's primary + inverse — unchanged).
```

### Level 3: Integration Testing (System Validation)

```bash
# Confirm the S1 wiring the matrix guards is intact:
grep -n "getGlobalHarnessConfig\|resolveHarnessConfig" src/core/agent.ts | head
# Expected: line 45 (import) + 3 call sites (constructor ~L115, stream ~L368, executePrompt ~L610).

# Confirm registerDefaultHarnesses is NOT yet exported/auto (scenario-4 dependency state):
grep -n "registerDefaultHarnesses" src/index.ts src/harnesses/harness-registry.ts
# Expected (pre-T2.S1): no matches in src/index.ts (NOT exported); no auto-invocation in registry.
# This is why scenario 4 is gated — once T2.S1 adds the export + lazy auto-register, it activates.

# OPTIONAL confidence check — prove scenario 1 fails on pre-S1 (Task 8):
#   git stash   # set aside the new file
#   # temporarily restore legacy resolution in src/core/agent.ts L114-120 (getGlobalProviderConfig)
#   git stash pop
#   npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts -t "scenario 1"
# Expected (pre-S1): scenario 1 FAILS "Harness 'anthropic' is not registered". Restore before finishing.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Full suite — guard against cross-file regressions from the new file's singleton resets.
npm test
# Expected: green EXCEPT the known-unrelated pre-existing failure:
#   src/__tests__/adversarial/edge-case.test.ts > "should handle unicode in workflow names" (Issue 5, out of scope).
# Scenario 4 must be SKIPPED (not failed) pre-T2.S1.

# Type/lint gate for production source (confirms no accidental src/ edits):
npm run lint
# Expected: green (tsc --noEmit on src/**; tests excluded).

# POST-T2.S1 verification (run once T2.S1 lands):
#   npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts -t "scenario 4"
# Expected: scenario 4 now RUNS and PASSES (no longer skipped) — proves Issue 4's safety net.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Level 1: `npx vitest run src/__tests__/unit/agent-harness-cascade-matrix.test.ts` transforms + runs cleanly.
- [ ] Level 2: scenarios 1, 2, 3-prompt, 3-stream PASS; scenario 4 SKIPPED (pre-T2.S1) / PASSES (post-T2.S1).
- [ ] Level 2: S2's `agent.test.ts -t "configureHarnesses"` still passes (untouched).
- [ ] Level 4: `npm test` green except known-unrelated Issue 5.
- [ ] Level 4: `npm run lint` green.
- [ ] `git diff --stat` shows ONLY `src/__tests__/unit/agent-harness-cascade-matrix.test.ts` (no `src/core/`, `src/utils/`, `src/harnesses/`).

### Feature Validation

- [ ] New dedicated file created; NO existing test file modified.
- [ ] All 4 canonical scenarios present and co-located in ONE `describe`.
- [ ] Scenario 1 calls `configureHarnesses({defaultHarness:'pi',...})` + registers ONLY 'pi' + `new Agent({model})` (no harness) → asserts `agent.harness.id === 'pi'`.
- [ ] Scenario 2: global 'pi' + agent 'claude-code' → resolves 'claude-code'.
- [ ] Scenario 3 asserted via BOTH `Agent.prompt()` AND `Agent.stream()` (prompt 'pi' beats agent 'claude-code'); both assert pi.execute called AND claude-code.execute NOT called.
- [ ] Scenario 4 gated by `it.skipIf(!AUTO_REGISTER_ACTIVE)`; zero setup (no configureHarnesses, no register); asserts `agent.harness.id === 'pi'` when active.
- [ ] `beforeEach`/`afterEach` reset `resetGlobalHarnessConfig()` + `resetGlobalConfig()` + `HarnessRegistry['_resetForTesting']()` + `vi.clearAllMocks()` (in beforeEach).
- [ ] The `AUTO_REGISTER_ACTIVE` probe cleans up after itself (finally block) and is computed at module load.

### Code Quality Validation

- [ ] Follows existing override-test idioms (relative `.js` imports, `import type` for types, `vi.fn()` mocks).
- [ ] `@ts-expect-error` directives paired with descriptive comments, directly over genuine private-field access.
- [ ] `it.each` / `it()` titles are descriptive, reference the scenario number + PRD §7.7.
- [ ] Streaming-axis mock uses an async-generator `execute` (or a unified streaming-capable factory).
- [ ] No hardcoded values that should be config; no sync-in-async misuse (prompt/stream tests are async).

### Documentation & Deployment

- [ ] `it()` titles + inline comments explain WHY each assertion exists (esp. the scenario-4 T2.S1 dependency note and the scenario-1 fail-on-pre-fix note).
- [ ] Leading file comment documents: the 4-scenario matrix, the T2.S1 dependency for scenario 4, and the honest fail-on-pre-fix scope (scenario 1 is the keystone).
- [ ] No new env vars or config files.

---

## Anti-Patterns to Avoid

- ❌ **Do NOT modify `src/core/agent.ts` or any `src/` production file** — S1 is Complete; this is test-only.
- ❌ **Do NOT modify S2's block in `agent.test.ts` (L145-189)** — it is a committed, independent guard.
- ❌ **Do NOT implement P1.M1.T2.S1 here** (export/auto-register `registerDefaultHarnesses`) — that is a separate subtask. S3 only GATES scenario 4 against it.
- ❌ **Do NOT write scenario 4 as an unconditional `it()` that fails pre-T2.S1** — that breaks CI. Use `it.skipIf(!AUTO_REGISTER_ACTIVE)` so it auto-skips until the safety net lands.
- ❌ **Do NOT overclaim that "scenarios 1-3 all fail on pre-fix code"** — only scenario 1 truly fails pre-S1 (research §3). State the truth in comments; the matrix's value is codifying the full priority contract, not false regression claims.
- ❌ **Do NOT use a plain async function as the stream-axis mock's `execute`** — `agent.stream()` iterates it as an `AsyncStream`; it must be an async generator. Mirror `agent-stream-harness-override.test.ts:44-54`.
- ❌ **Do NOT omit the `@ts-expect-error`** over private-field access.
- ❌ **Do NOT skip the registry + BOTH-global-singleton reset** in beforeEach/afterEach — `register()` throws on duplicates and a stale singleton changes the resolved default.
- ❌ **Do NOT register an `'anthropic'` mock in scenarios 1-3** — that would mask scenario 1's regression value (pre-S1 would find 'anthropic' and not throw). Register only the harnesses each scenario needs.
- ❌ **Do NOT assert only `agent.name === 'Agent'`** — harness-independent. Assert `agent.harness.id`.
- ❌ **Do NOT duplicate the pure-function cascade tests from `harness-config.test.ts`** — S3 is the AGENT-level matrix (through the constructor + prompt/stream), complementing the function-level tests.

---

## Confidence Score

**8/10** for one-pass implementation success.

Rationale: This is a well-bounded test-only task. Every idiom (`createMockHarness`, the prompt-wins / stream-wins patterns, the lifecycle resets) exists verbatim in two mirror files to copy. The exact test bodies are provided in the Implementation Blueprint. The two deducted points reflect:
1. **The T2.S1 dependency / sequencing tension for scenario 4** — the `it.skipIf` capability probe neutralizes the risk, but requires the implementer to correctly probe + clean up at module load (a subtler pattern than a plain `it`).
2. **The stream-axis mock subtlety** — the default `createMockHarness` execute is NOT an async generator, so the stream-axis `it` needs either a streaming-capable factory or per-test re-registration; the PRP flags this and recommends the unified streaming factory, but an inattentive implementer could trip on it.
3. **The honest fail-on-pre-fix nuance** — the implementer must NOT overclaim scenarios 2-3 fail pre-fix (only scenario 1 does); the PRP documents this precisely.

All three risks are explicitly called out above with mitigations, so a careful one-pass implementation is achievable.
