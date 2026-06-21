---
name: "P1.M1.T1.S1 — Rewire agent.ts harness resolution to the new cascade (Issue 1 core fix)"
description: |
  Swap all three harness-resolution call sites in src/core/agent.ts from the legacy
  getGlobalProviderConfig()/resolveProviderConfig() (which read the WRONG singleton —
  default 'anthropic', not in the registry) to getGlobalHarnessConfig()/resolveHarnessConfig()
  (default 'pi'). Remove the legacy import. Update destructuring `provider`→`harness`.
  Triage incidental test breakage caused by the global default changing 'anthropic'→'pi'.
---

## Goal

**Feature Goal**: Make `src/core/agent.ts` resolve its harness through the **new** cascade utilities
(`getGlobalHarnessConfig()` + `resolveHarnessConfig()`) in all three resolution call sites
(constructor, `stream()`, `executePrompt()`), so that `configureHarnesses({ defaultHarness: 'pi' })`
— the documented public API (PRD §7.6/§7.7) — actually reaches the `Agent`. After this change,
`new Agent({ model })` with the global default resolves to `'pi'` instead of throwing
`Harness 'anthropic' is not registered`.

**Deliverable**: A modified `src/core/agent.ts` (3 call sites rewired + legacy import removed) plus
minimal, surgical updates to any tests that incidentally break because the global default flipped
from `'anthropic'` to `'pi'`.

**Success Definition**:
- `grep -n 'getGlobalProviderConfig\|resolveProviderConfig' src/core/agent.ts` returns **nothing**.
- `npm run lint` (tsc --noEmit) is green.
- `npm test` is green **except** the known out-of-scope pre-existing failure
  `src/__tests__/adversarial/edge-case.test.ts` (Issue 5, unicode in workflow names).
- The literal substring `is not registered` is preserved in all three error paths
  (constructor throw, `stream()` throw, `executePrompt()` `PROVIDER_NOT_FOUND` return).
- Every test-file change made for triage is documented in the commit message.

## User Persona (if applicable)

**Target User**: Library consumer / SDK user (and the maintainer running the example suite).
**Use Case**: Construct an `Agent` that inherits the global default harness via `configureHarnesses()`,
or — the absolute minimal case — `new Agent({ model })` with no global config and no explicit harness.
**User Journey**: `configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' })` →
`new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })` → Agent resolves harness `'pi'` and runs.
**Pain Points Addressed**: The shipped example `examples/harnesses/02-harness-configuration.ts` currently
crashes on launch (`Harness 'anthropic' is not registered`); the most basic `new Agent({ model })` usage
fails. This PRP fixes the root cause (Agent reads the wrong singleton).

## Why

- **Business value**: Restores the documented primary user journey (PRD §7.6/§7.7, `docs/harnesses.md`,
  and the shipped example 02). Without this, the entire harness migration's public API is non-functional.
- **Integration**: This is the **core** fix for Issue 1. It unblocks P1.M1.T1.S2 (default-resolution
  regression test) and P1.M1.T1.S3 (4-scenario cascade matrix). It is a prerequisite for the later
  removal of the legacy `provider-config.ts` shim (P3.M1).
- **Root cause**: `configureHarnesses()` writes `globalHarnessConfig`; `getGlobalProviderConfig()` reads a
  *separate* singleton (`globalProviderConfig`, hardcoded default `'anthropic'`). The Agent reads the wrong
  one for the harness axis. (The model axis at line 661 already reads `getGlobalHarnessConfig()` correctly —
  only the harness axis is broken.)

## What

Rewire the three call sites; remove the legacy import; preserve all error-path behaviour; triage the
predictable test cascade. **No** changes to: the model axis (L661), the `this.harnessId` legacy-`provider`
fallback (L111), the `provider-config.ts` shim, the legacy singleton, or `edge-case.test.ts`.

### Success Criteria

- [ ] `grep -n 'getGlobalProviderConfig\|resolveProviderConfig' src/core/agent.ts` → empty output.
- [ ] `npm run lint` green.
- [ ] `npm test` green except `edge-case.test.ts` unicode test.
- [ ] Constructor still throws `Harness '<id>' is not registered` (substring preserved) for unregistered ids.
- [ ] `stream()` still throws synchronously (substring `is not registered` preserved) before generator creation.
- [ ] `executePrompt()` still returns `createErrorResponse('PROVIDER_NOT_FOUND', ...)` (not a throw).
- [ ] Any incidentally-broken test fixed via mock-registration/config update (NOT by reverting agent.ts).

## All Needed Context

### Context Completeness Check

_Pass_: Every code change is specified with verified exact line numbers and verbatim source. The new API
signatures are quoted. The test-cascade blast radius is enumerated file-by-line with the fix pattern for
each. An implementer with zero prior knowledge of this codebase can execute this with the research notes
alone.

### Documentation & References

```yaml
# MUST READ — primary research artifact (verified exact code + line numbers + blast-radius map)
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M1T1S1/research/blast-radius-and-call-sites.md
  why: Verbatim source of all 3 call sites, the new API signatures, the MUST-NOT-TOUCH list, and the
       file-by-line test triage map (§6). This is the single source of truth for the implementation.
  critical: The test breakage list in §6a is NOT optional reading — without it the implementer will be
            surprised by ~4-5 failing tests that all follow the same 1-line fix pattern.

# Architecture verification report (quoted verbatim from codebase)
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/issue1-agent-harness-resolution.md
  why: Independent confirmation of the bug, the data-flow diagram, and the constraints. §5 confirms the
       constructor throw is at L128 (variable `harnessInstance`); §6 proves the model axis (L661) is fine.
  pattern: "Start Here" §1-4 lists the exact files + the reproducer example.

# System context
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/system_context.md
  why: §2 documents the dual-singleton architecture (globalHarnessConfig vs globalProviderConfig).
  section: "§2"

# The file being modified
- file: src/core/agent.ts
  why: The ONLY production file changed in this task. Three call sites (L117-123, L372-379, L616-623)
       and the import block (L45-46).
  pattern: Resolution → registry.get → throw/return. Preserve error substrings.
  gotcha: Do NOT touch L661 (model axis, already correct) or L111 (legacy provider fallback, intentional).

# The new API source (read for exact signatures — do NOT modify)
- file: src/utils/harness-config.ts
  why: getGlobalHarnessConfig() (L158), resolveHarnessConfig() (L192, returns {harness, options}),
       DEFAULT_HARNESS_CONFIG = {defaultHarness:'pi'} (L63), resetGlobalHarnessConfig() (L222).
  pattern: resolveHarnessConfig is PURE — performs NO id validation (ids are opaque string keys).
  gotcha: Return key is `harness` not `provider` — update destructuring names accordingly.

# The legacy shim (read only — do NOT delete in this task)
- file: src/utils/provider-config.ts
  why: Confirms it is a pure re-export shim; other tests still import the legacy fns directly, so the
       shim + singleton must remain for now (removal is a later task).
  gotcha: Deleting it here would break src/__tests__/unit/utils/harness-config.test.ts and the
          integration tests that import configureProviders/resetGlobalConfig from it.

# Reproducer / smoke test (NOT modified — used to manually confirm the fix)
- file: examples/harnesses/02-harness-configuration.ts
  why: L70 configureHarnesses({defaultHarness:'pi'}) + L121 new Agent({name:'DefaultAgent'}) with no
       harness — currently crashes; after fix must launch cleanly.

# Registry defaults (read only)
- file: src/harnesses/register-defaults.ts
  why: Confirms registry keys are only 'pi' + 'claude-code' (so 'anthropic' literal now throws — intended).
```

### Current Codebase tree (relevant slice)

```bash
src/core/agent.ts                      # MODIFY — 3 call sites + import (lines 45-46, 117-123, 372-379, 616-623)
src/utils/harness-config.ts            # READ — new API (getGlobalHarnessConfig, resolveHarnessConfig, reset*)
src/utils/provider-config.ts           # READ — legacy shim (do NOT delete)
src/harnesses/harness-registry.ts      # READ — ProviderRegistry === HarnessRegistry (L623)
src/harnesses/register-defaults.ts     # READ — registry keys 'pi' + 'claude-code'
examples/harnesses/02-harness-configuration.ts  # smoke test (do NOT modify)
src/__tests__/unit/agent.test.ts       # LIKELY MODIFY — 2 tests in 'Agent harness resolution' block
src/__tests__/integration/provider-switching.test.ts   # LIKELY MODIFY — ~2 no-harness default tests
src/__tests__/integration/provider-agent.test.ts       # LIKELY MODIFY — 1 'uses default' test
src/__tests__/adversarial/edge-case.test.ts            # DO NOT TOUCH (Issue 5, out of scope)
```

### Desired Codebase tree with files to be added/changed

```bash
# No new files. Only edits:
src/core/agent.ts                      # rewired (3 call sites + import swap)
src/__tests__/unit/agent.test.ts       # 2 assertions updated to 'pi' reality (IF they fail)
src/__tests__/integration/*.test.ts    # only the specific no-harness-default tests that fail (see tasks)
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: TWO separate module-private singletons in harness-config.ts:
//   globalHarnessConfig  ← what configureHarnesses() writes; getGlobalHarnessConfig() reads; default 'pi'
//   globalProviderConfig  ← what configureProviders() writes; getGlobalProviderConfig() reads; default 'anthropic'
// The Agent MUST read the harness singleton for harness resolution. Mixing them = the bug.

// CRITICAL: resolveHarnessConfig returns { harness, options } — NOT { provider, options }.
// Update every destructure: `provider: resolvedHarness` → `harness: resolvedHarness`.

// CRITICAL: resolveHarnessConfig performs NO id validation. So a literal 'anthropic' flows through
// unchecked to registry.get('anthropic') → undefined → throws. This is INTENDED post-migration.

// GOTCHA: ProviderRegistry === HarnessRegistry (harness-registry.ts:623). Integration tests that
// `ProviderRegistry.getInstance().register(mock)` populate the SAME store the Agent reads. So a mock
// registered as id 'anthropic' is visible to registry.get('anthropic') but NOT to registry.get('pi').

// GOTCHA: After the swap, the global default for the harness axis flips 'anthropic' → 'pi'. Any test
// doing `new Agent({})` with no harness + no 'pi' mock registered will throw 'Harness pi is not registered'.
// Any test relying on `configureProviders({defaultProvider})` to set the Agent's harness default breaks
// (Agent no longer reads that singleton). See Implementation Task 5 for the triage decision tree.

// PRESERVE: error substring `is not registered` appears in 3 places — keep it verbatim so existing
// `.rejects.toThrow(/is not registered/)` and `.toThrow(/Harness '...' is not registered/)` tests still match.
```

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: SWAP the import block in src/core/agent.ts (lines 45-46)
  - REMOVE line 45: `import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';`
  - REPLACE line 46: `import { getGlobalHarnessConfig } from '../utils/harness-config.js';`
    WITH:           `import { getGlobalHarnessConfig, resolveHarnessConfig } from '../utils/harness-config.js';`
  - VERIFY: `grep -n "provider-config" src/core/agent.ts` returns nothing.
  - NOTE: getGlobalHarnessConfig is ALREADY imported (L46); you are only ADDING resolveHarnessConfig
          and DELETING the legacy line. Do not create a duplicate import.

Task 2: REWIRE the constructor call site (src/core/agent.ts lines 117-123)
  - CURRENT (verbatim):
      const globalConfig = getGlobalProviderConfig();
      const resolved = resolveProviderConfig(
        globalConfig,
        this.harnessId,
        this.harnessOptions,
      );
      const effectiveHarness = resolved.provider;
  - REPLACE WITH:
      const globalConfig = getGlobalHarnessConfig();
      const resolved = resolveHarnessConfig(
        globalConfig,
        this.harnessId,
        this.harnessOptions,
      );
      const effectiveHarness = resolved.harness;
  - PRESERVE: the throw at L128 `throw new Error(\`Harness '${effectiveHarness}' is not registered\`)` UNCHANGED.
  - PRESERVE: the surrounding comments may stay, but UPDATE the now-stale comment at L114-116 that says
    "getGlobalProviderConfig is used as the global source" → reflect that it now reads getGlobalHarnessConfig.

Task 3: REWIRE the stream() call site (src/core/agent.ts lines 372-379)
  - CURRENT (verbatim):
      const globalConfig = getGlobalProviderConfig();
      const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(
        globalConfig,
        this.harnessId,
        this.harnessOptions,
        promptHarness,
        promptHarnessOptions
      );
  - REPLACE WITH (same 5 args, destructure `harness` not `provider`):
      const globalConfig = getGlobalHarnessConfig();
      const { harness: resolvedHarness, options: resolvedHarnessOptions } = resolveHarnessConfig(
        globalConfig,
        this.harnessId,
        this.harnessOptions,
        promptHarness,
        promptHarnessOptions
      );
  - PRESERVE: the synchronous throw at L390 `throw new Error(\`Harness '${resolvedHarness}' is not registered\`)` UNCHANGED.
  - PRESERVE: the variable names `resolvedHarness` / `resolvedHarnessOptions` (downstream code uses them).

Task 4: REWIRE the executePrompt() call site (src/core/agent.ts lines 616-623)
  - CURRENT (verbatim): identical shape to stream() (5 args, destructure `provider: resolvedHarness`).
  - REPLACE WITH: same swap as Task 3 — getGlobalHarnessConfig()/resolveHarnessConfig(), destructure `harness`.
  - PRESERVE: the RETURN (not throw) at L633 — `createErrorResponse('PROVIDER_NOT_FOUND', ...)`. Do NOT
              convert it to a throw. Only the resolve functions change.
  - DO NOT TOUCH: line 661 `const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;`
                  (model axis — already correct).

Task 5: TRIAGE incidental test breakage (run npm test, apply decision tree per failure)
  - EXPECTED BREAKS (pre-verified — see research/blast-radius-and-call-sites.md §6a):
      * src/__tests__/unit/agent.test.ts:127-132  'uses the configured global default harness'
          → change `register(createMockHarness('anthropic'))` → `register(createMockHarness('pi'))`; update comment.
      * src/__tests__/unit/agent.test.ts:134-138  'throws when the resolved harness is not registered'
          → change regex `/Harness 'anthropic' is not registered/` → `/Harness 'pi' is not registered/`; update comment.
      * src/__tests__/integration/provider-switching.test.ts:144-151  'uses global default'
          → add `configureHarnesses({ defaultHarness: 'anthropic' })` (mock 'anthropic' is registered) OR register 'pi'.
      * src/__tests__/integration/provider-switching.test.ts:427-432  'use global default when agent has no provider'
          → same fix as above.
      * src/__tests__/integration/provider-agent.test.ts:182-188  'without provider config (uses default)'
          → replace `configureProviders({ defaultProvider: 'claude-code' })` with `configureHarnesses({ defaultHarness: 'claude-code' })`
            (the registered mock resolves to 'claude-code') OR register a 'pi' mock.
  - DECISION TREE for any OTHER failure not listed above:
      1. Failing test does `new Agent()` / `new Agent({})` with NO harness?
         → it now resolves 'pi'. If no 'pi' mock registered: register createMockHarness('pi'),
           OR add configureHarnesses({defaultHarness: <registered-mock-id>}).
      2. Failing test calls configureProviders({defaultProvider: X}) expecting Agent to honour it?
         → Agent no longer reads that singleton for harness. Add configureHarnesses({defaultHarness: X})
           (ensure a mock with id X is registered). Leave the configureProviders call if other assertions need it.
      3. Failing test asserts `Harness 'anthropic' is not registered` for a no-harness default path?
         → update literal/regex to 'pi'.
      4. Failing test is src/__tests__/adversarial/edge-case.test.ts (unicode)?
         → STOP. Out of scope (Issue 5). Do not modify.
  - CONSTRAINT: Prefer the MINIMAL change that mirrors the test's original intent. Do NOT rewrite test
                logic. Do NOT revert agent.ts to make a test pass.
  - DOCUMENT: every test file you touch in the commit message with the reason.

Task 6: VERIFY (do not skip — run all gates)
  - grep -n 'getGlobalProviderConfig\|resolveProviderConfig' src/core/agent.ts   # MUST be empty
  - npm run lint                                                                  # MUST be green (tsc --noEmit)
  - npm test                                                                      # MUST be green except edge-case.test.ts unicode
```

### Implementation Patterns & Key Details

```typescript
// PATTERN: All three call sites follow the identical swap. The shape is a near drop-in:

// --- Before (legacy, WRONG singleton) ---
const globalConfig = getGlobalProviderConfig();
const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(
  globalConfig, this.harnessId, this.harnessOptions, promptHarness, promptHarnessOptions,
);

// --- After (new cascade, correct singleton) ---
const globalConfig = getGlobalHarnessConfig();
const { harness: resolvedHarness, options: resolvedHarnessOptions } = resolveHarnessConfig(
  globalConfig, this.harnessId, this.harnessOptions, promptHarness, promptHarnessOptions,
);

// CRITICAL: only TWO things change — (1) the function names, (2) the destructure key `provider`→`harness`.
// The argument list is IDENTICAL (resolveHarnessConfig has the same 5 params in the same order).
// The downstream variable names (resolvedHarness, resolvedHarnessOptions, effectiveHarness) stay the same.

// PATTERN: The constructor uses a slightly different local shape (assigns to `resolved` then reads `.provider`).
//   Swap `resolved.provider` → `resolved.harness`. Everything else identical.

// GOTCHA: Do NOT "clean up" the legacy provider-config.ts shim or the globalProviderConfig singleton.
//   Other tests (harness-config.test.ts, the integration tests) still import configureProviders /
//   resetGlobalConfig / getGlobalProviderConfig directly. Removing them is a LATER task (P3.M1).

// GOTCHA: The `this.harnessId = config.harness ?? (config.provider as HarnessId | undefined);` line (L111)
//   MUST stay. `new Agent({ provider: 'claude-code' })` must keep resolving (claude-code is registered).
//   `new Agent({ provider: 'anthropic' })` will now throw — that is the intended post-migration behaviour.
```

### Integration Points

```yaml
PRODUCTION CODE:
  - modify: src/core/agent.ts (ONLY production file changed)
  - lines: 45-46 (import), 117-123 (constructor), 372-379 (stream), 616-623 (executePrompt)

TESTS (only if they fail npm test — see Task 5 decision tree):
  - likely: src/__tests__/unit/agent.test.ts
  - likely: src/__tests__/integration/provider-switching.test.ts
  - likely: src/__tests__/integration/provider-agent.test.ts

DO NOT TOUCH:
  - src/utils/provider-config.ts (shim — removal is a later task)
  - src/utils/harness-config.ts (the new API — read only)
  - src/core/agent.ts line 111 (legacy provider fallback — intentional)
  - src/core/agent.ts line 661 (model axis — already correct)
  - src/__tests__/adversarial/edge-case.test.ts (Issue 5 — out of scope)
  - PRD.md, tasks.json, prd_snapshot.md, .gitignore (never)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After editing src/core/agent.ts — fix before proceeding.
npm run lint                  # = tsc --noEmit. MUST be green (zero errors).
# (This project uses tsc --noEmit as its lint step; there is no separate ruff/eslint step for TS.)

# Expected: Zero errors. If errors appear, they are almost certainly:
#   - a leftover reference to getGlobalProviderConfig/resolveProviderConfig (re-check the import swap)
#   - a `provider` destructure key you forgot to rename to `harness`
# Read the TS output, fix, re-run.
```

### Level 2: The Core Verification (Deterministic)

```bash
# CRITICAL gate — the whole point of the task.
grep -n 'getGlobalProviderConfig\|resolveProviderConfig' src/core/agent.ts
# Expected: NO output (empty). If anything prints, a call site was missed.

# Confirm the new functions are now used (sanity):
grep -n 'getGlobalHarnessConfig\|resolveHarnessConfig' src/core/agent.ts
# Expected: line ~46 (import), ~117 & ~123 (constructor), ~372 & ~373 (stream), ~616 & ~617 (executePrompt),
#           and ~661 (model axis, pre-existing).

# Confirm error substrings preserved:
grep -n "is not registered" src/core/agent.ts
# Expected: 3 matches — constructor throw (~L128), stream() throw (~L390), executePrompt() error-return (~L633).
```

### Level 3: Unit + Integration Tests (Component & System Validation)

```bash
# Full suite — this project uses vitest.
npm test
# Expected: ALL GREEN except exactly ONE pre-existing failure:
#   src/__tests__/adversarial/edge-case.test.ts > "should handle unicode in workflow names"
# That failure is Issue 5 (out of scope — do NOT attempt to fix it).

# If OTHER tests fail, apply the Task 5 decision tree. Each failure should be a 1-line fix
# (register a 'pi' mock, add configureHarnesses, or update an 'anthropic'→'pi' assertion).

# Targeted re-run after a triage fix (example):
npx vitest run src/__tests__/unit/agent.test.ts
npx vitest run src/__tests__/integration/provider-switching.test.ts
```

### Level 4: End-to-End Smoke (the actual user journey)

```bash
# The shipped example that currently CRASHES — after the fix it must launch.
# (Note: the example also depends on P1.M1.T2.S1's registerDefaultHarnesses auto-registration to fully
#  work with ZERO setup. If the registry is empty, register defaults first. For this task's smoke test,
#  run it as-is — it calls configureHarnesses itself; the crash we are fixing is the 'anthropic' throw.)
ANTHROPIC_API_KEY=sk-dummy npx tsx examples/harnesses/02-harness-configuration.ts 2>&1 | head -20
# Expected BEFORE fix: "Error: Harness 'anthropic' is not registered" at src/core/agent.ts:~128
# Expected AFTER fix:  no 'is not registered' error in the first 20 lines (example proceeds to run agents).
```

## Final Validation Checklist

### Technical Validation

- [ ] `grep -n 'getGlobalProviderConfig\|resolveProviderConfig' src/core/agent.ts` → empty.
- [ ] `npm run lint` green (tsc --noEmit).
- [ ] `npm test` green except `edge-case.test.ts` unicode test.
- [ ] `grep -n "is not registered" src/core/agent.ts` → exactly 3 matches (constructor/stream/executePrompt).
- [ ] No new `getGlobalProviderConfig`/`resolveProviderConfig` references introduced anywhere in `src/core/`.

### Feature Validation

- [ ] Constructor still throws `Harness '<id>' is not registered` for unregistered ids (substring preserved).
- [ ] `stream()` still throws synchronously before generator creation (substring preserved).
- [ ] `executePrompt()` still RETURNS `createErrorResponse('PROVIDER_NOT_FOUND', ...)`, not throws.
- [ ] `examples/harnesses/02-harness-configuration.ts` no longer crashes with the `'anthropic'` error.
- [ ] Every incidentally-broken test fixed via mock/config update (NOT by reverting agent.ts).

### Code Quality Validation

- [ ] Only `src/core/agent.ts` changed in production code (plus minimal test edits).
- [ ] Legacy `provider-config.ts` shim and `globalProviderConfig` singleton left intact (later task).
- [ ] Line 111 (`this.harnessId` legacy fallback) and line 661 (model axis) untouched.
- [ ] `edge-case.test.ts` untouched.
- [ ] All test-file changes documented in the commit message.

### Documentation & Deployment

- [ ] Stale comments referencing `getGlobalProviderConfig`/`resolveProviderConfig` in agent.ts updated.
- [ ] Commit message lists each test file changed and why (e.g. "updated default-resolution test from
      'anthropic' to 'pi' to match the new global default after the cascade rewire").

---

## Anti-Patterns to Avoid

- ❌ Don't delete `src/utils/provider-config.ts` or the `globalProviderConfig` singleton — other tests still
  import the legacy functions directly; removal is a separate, later task.
- ❌ Don't touch line 661 (model axis) or line 111 (legacy `provider` fallback) — both are correct/intentional.
- ❌ Don't convert `executePrompt()`'s `createErrorResponse(...)` return into a `throw` — preserve the
  error-return contract (it differs from `stream()`/constructor on purpose).
- ❌ Don't rename the local variables `resolvedHarness` / `resolvedHarnessOptions` / `effectiveHarness` —
  downstream code references them; only the destructure KEY (`provider`→`harness`) changes.
- ❌ Don't "fix" `edge-case.test.ts` — it is Issue 5, explicitly out of scope.
- ❌ Don't revert agent.ts to make a failing test pass — fix the test via mock registration / configureHarnesses.
- ❌ Don't skip the `grep` verification gate — it is the single most reliable proof the task is complete.

---

## Confidence Score

**9 / 10** for one-pass implementation success.

Rationale: The core change (3 call sites + import swap) is a verified, mechanical near-drop-in —
exact verbatim source, exact line numbers, and the only semantic delta is `provider`→`harness` in the
destructure plus the two function names. The new API is a pure function with identical arg order. The
sole residual risk is the test cascade (4-5 predictable failures, each a 1-line fix per the decision
tree in Task 5 / research §6c). No external services, no async mocking, no schema changes. The -1 is
for the small chance an unlisted test follows a variant of the `configureProviders`-default pattern not
covered by the enumerated list — but the decision tree handles that case generically.
