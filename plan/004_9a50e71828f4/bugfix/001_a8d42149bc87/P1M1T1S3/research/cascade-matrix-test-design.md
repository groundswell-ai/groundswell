# Cascade Matrix Test Design — P1.M1.T1.S3

Research notes for the 4-scenario Agent-level cascade matrix regression test.
Author: PRP research agent. Companion to `../PRP.md`.

---

## 1. Dependency & sequencing state (verified at PRP time)

| Subtask | Status | Commit | Relevance to S3 |
|---|---|---|---|
| **P1.M1.T1.S1** (rewire Agent → `getGlobalHarnessConfig`/`resolveHarnessConfig`) | ✅ Complete | `adbdc5c` | **Hard prereq.** S3 scenarios 1-3 pass only because S1 swapped all 3 call sites in `src/core/agent.ts`. Verified: `src/core/agent.ts:45` imports ONLY `getGlobalHarnessConfig, resolveHarnessConfig` (legacy `getGlobalProviderConfig` import is GONE); constructor L114-120, `stream()` L367-373, `executePrompt()` L609-615 all use the new utilities. |
| **P1.M1.T1.S2** (scenario-1 default-resolution test) | ✅ Complete | `63bf81f` | Scenario 1 is ALREADY covered at `src/__tests__/unit/agent.test.ts:145-189` (`describe('Agent default harness resolution via configureHarnesses() (PRD §7.7 scenario 1)')`). S3 RE-ENCODES scenario 1 inside the unified matrix (intentional co-location per architecture §8 — not redundant duplication). S3 must NOT delete/modify the S2 block. |
| **P1.M1.T2.S1** (export `registerDefaultHarnesses` + lazy auto-registration) | ⏳ Planned | — | **HARD DEPENDENCY for S3 scenario 4.** `registerDefaultHarnesses()` EXISTS (`src/harnesses/register-defaults.ts:28`, idempotent) but is NOT exported from `src/index.ts` and NOT auto-invoked. The registry starts EMPTY. Therefore `new Agent()` with ZERO setup currently THROWS "Harness 'pi' is not registered". Scenario 4 (zero-setup → 'pi') CANNOT PASS until T2.S1 lands. |

### Sequencing tension

The plan_status sequences **S3 BEFORE T2.S1**. But S3 scenario 4 REQUIRES T2.S1. Two safe resolutions (PRP recommends #A):

- **(A) Gate scenario 4 behind a capability probe** — `it.skipIf(!AUTO_REGISTER_ACTIVE)` where `AUTO_REGISTER_ACTIVE` is probed at module load by attempting a cold `new Agent()` and catching the throw. Keeps `npm test` GREEN whether or not T2.S1 has landed; auto-activates the moment T2.S1 ships. vitest 1.6.1 supports `it.skipIf`.
- **(B) Land S3 immediately after T2.S1** — scenario 4 written as a plain `it()` that passes once T2.S1 is in. Requires orchestrator to reorder.

Either way, the FINAL state (after T2.S1) must have all 4 scenarios active and passing.

---

## 2. The 4 canonical scenarios → assertion points

`resolveHarnessConfig(global, agentHarness?, agentOptions?, promptHarness?, promptOptions?)` (verified at `src/utils/harness-config.ts:192-215`): `harness = promptHarness ?? agentHarness ?? globalConfig.defaultHarness` (first-defined-wins). The constructor can supply global (via `configureHarnesses`) + agent (`AgentConfig.harness`); the **prompt axis is only resolvable at `prompt()`/`stream()`** time via `PromptOverrides.harness`.

| # | global.defaultHarness | agent.harness | prompt.harness | resolved | Assertion point |
|---|---|---|---|---|---|
| 1 | `'pi'` | — | — | `'pi'` | **Constructor** — `new Agent()` (S2 also covers this standalone) |
| 2 | `'pi'` | `'claude-code'` | — | `'claude-code'` | **Constructor** — `new Agent({harness:'claude-code'})` |
| 3 | `'pi'` | `'claude-code'` | `'pi'` | `'pi'` (prompt wins) | **`Agent.prompt()` + `Agent.stream()`** — assert `pi.execute` called, `claude-code.execute` NOT called |
| 4 | (default `'pi'`, no `configureHarnesses`) | — | — | `'pi'` | **Constructor** — ZERO setup; REQUIRES T2.S1 auto-registration |

### Why scenario 3 cannot be a pure constructor test
The constructor only sees global + agent axes (`AgentConfig` has no prompt field). Scenario 3's distinctive value — **prompt-wins** — is observable ONLY through `prompt()`/`stream()`. This is exactly what `agent-prompt-harness-override.test.ts:96-116` ("prompt harness override beats the agent harness") already tests standalone; S3 co-locates it as the matrix's row 3.

---

## 3. Fail-on-pre-fix proof (regression value)

Scenarios 1-3 **MUST fail on pre-S1 code** (proving they guard the S1 fix):

| Scenario | Pre-S1 behavior (legacy `getGlobalProviderConfig` → default 'anthropic') | Post-S1 behavior |
|---|---|---|
| 1 | `new Agent()` → resolves 'anthropic' → registry (only 'pi' registered) → THROWS "Harness 'anthropic' is not registered" → `expect(agent.harness.id).toBe('pi')` never runs → **FAIL** | resolves 'pi' → **PASS** |
| 2 | `new Agent({harness:'claude-code'})` → harnessId 'claude-code' wins (prompt??agent??global) → resolves 'claude-code' regardless of singleton → resolves → **PASSES even pre-fix** ⚠️ |
| 3 | `prompt({harness:'pi'})` → promptHarness 'pi' wins → resolves 'pi' → **PASSES even pre-fix** ⚠️ |

**⚠️ Important nuance**: Because `resolveHarnessConfig` is first-defined-wins and the agent/prompt axes OVERRIDE the global default, **scenarios 2 and 3 pass even on pre-S1 code** (the global singleton is never consulted when agent/prompt is set). Only **scenario 1** (pure global-default resolution) actually fails on pre-S1 code. This matches the S2 PRP's finding that scenario 1 is the true regression guard.

**Therefore**: the PRP must be HONEST about which scenarios fail-on-pre-fix. Scenario 1 is the genuine regression guard for Issue 1 (S1's fix). Scenarios 2 and 3 are **behavioral documentation** of the cascade priority (they codify the contract but don't independently catch the S1 regression). Scenario 4 guards Issue 4 (T2.S1). The item's "Scenarios 1-3 must FAIL on pre-fix" claim is **partially accurate** — only scenario 1 truly fails-on-pre-fix at the constructor level; the matrix as a whole is the regression surface, and scenario 1 is its keystone. The PRP documents this precisely rather than overclaiming.

(If the item's intent was "scenarios 1-3 of a DIFFERENT pre-fix baseline" — e.g., a baseline where the agent/prompt axes were also broken — that's not the actual S1 bug. S1's bug was specifically the global-default singleton mismatch. The PRP states the truth.)

---

## 4. Reusable assets & idioms (no new patterns needed)

- **`createMockHarness(id, executeImpl?)`** — copy from `src/__tests__/unit/agent-prompt-harness-override.test.ts:33-72` (the variant WITH `executeImpl`, needed for the prompt/stream axes). The constructor-only matrix can use the simpler `(id)`-only variant from `agent.test.ts:20`, but for one consistent file, use the override-file variant (supports both). Default execute returns `createSuccessResponse(...)`; the streaming variant returns an async generator (see `agent-stream-harness-override.test.ts:33-62`).
- **Lifecycle reset**: `HarnessRegistry['_resetForTesting']()` + `resetGlobalHarnessConfig()` + `resetGlobalConfig()` (legacy, for safety) + `vi.clearAllMocks()` in BOTH beforeEach and afterEach. (The override files reset only `resetGlobalConfig`; S3 must ALSO reset `resetGlobalHarnessConfig` since it calls `configureHarnesses` — mirror `agent.test.ts:107-113`.)
- **Private-field assertion**: `// @ts-expect-error - private field access for testing` directly above `expect(agent.harness.id).toBe(...)`. Confirmed `src/core/agent.ts:92` `private readonly harness: Harness;`, no public accessor.
- **Prompt-axis assertion** (scenario 3): mirror `agent-prompt-harness-override.test.ts:96-116` — `vi.clearAllMocks()` after construction, then `agent.prompt(p,{harness:'pi'})`, then `expect(registry.get('pi')!.execute).toHaveBeenCalled()` and `expect(registry.get('claude-code')!.execute).not.toHaveBeenCalled()`.
- **Stream-axis assertion** (scenario 3): mirror `agent-stream-harness-override.test.ts:101-128` — `const { stream } = agent.stream(p,{harness:'pi'}); for await (const _ of stream) {}` then the same execute assertions.

---

## 5. File placement decision

**Primary**: NEW dedicated file `src/__tests__/unit/agent-harness-cascade-matrix.test.ts`.

Rationale:
- Co-locates the 4 canonical scenarios as a unified matrix (architecture §8's explicit goal — "NO single dedicated test exists").
- Spans constructor + prompt + stream axes — too broad to cleanly append into the already-large `agent.test.ts` (which S2 already extended at L145-189).
- Mirrors the dedicated-file pattern of `agent-prompt-harness-override.test.ts` / `agent-stream-harness-override.test.ts` (its sibling idioms).
- Keeps S2's scenario-1 block in `agent.test.ts` untouched (S2 is Complete/committed; do not modify).

**Acceptable alternative**: append to `agent.test.ts` as a sibling `describe` (consistent with S2's choice). Either satisfies the contract; the PRP specifies the dedicated file.

---

## 6. Open question resolved: capability-probe for scenario 4

The probe to detect T2.S1's auto-registration safety net, computed at module load:

```ts
// Probe ONCE at module load whether the P1.M1.T2.S1 auto-registration safety net is active.
// (registerDefaultHarnesses exported + lazily auto-invoked so a cold new Agent() resolves 'pi'.)
const AUTO_REGISTER_ACTIVE = (() => {
  HarnessRegistry['_resetForTesting']();
  resetGlobalHarnessConfig();
  resetGlobalConfig();
  try {
    const probe = new Agent();
    // @ts-expect-error - private field access for testing
    return probe.harness?.id === 'pi';
  } catch {
    return false; // throws "Harness 'pi' is not registered" → safety net not yet active
  } finally {
    HarnessRegistry['_resetForTesting']();
    resetGlobalHarnessConfig();
    resetGlobalConfig();
  }
})();

// Scenario 4 — auto-skipped until T2.S1 lands, then runs + asserts.
it.skipIf(!AUTO_REGISTER_ACTIVE)('scenario 4: zero setup resolves to "pi" (requires P1.M1.T2.S1 safety net)', () => { ... });
```

vitest 1.6.1 (installed) supports `it.skipIf`. The probe is isolated per-file (vitest runs each test file in its own module scope) and cleans up in `finally`. The first `beforeEach` re-establishes state for subsequent tests regardless.

---

## 7. Confidence notes

- All code paths verified against current `src/` (post-S1). The S1 fix is committed and present.
- The T2.S1 dependency is the SOLE source of implementation uncertainty; the capability probe neutralizes the sequencing risk.
- No external research needed — this is a pure internal test task; all idioms exist in-repo.
