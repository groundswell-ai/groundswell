# Breakage Surface Analysis — P1.M1.T2.S1 Lazy Auto-Registration

**Question**: Which existing tests break when the Agent lazily auto-registers the built-in
harness ids `'pi'` / `'claude-code'` on a missing `registry.get(...)`?

**TL;DR**: **6 tests break** (across 4 files) — all of them DELIBERATELY omit registration of a
built-in id so they can assert the throw/error path. The cascade-matrix test self-adapts via a
capability probe (no change needed). Tests that register their own mock for the id under test
are SAFE (the `has()` guard preserves their mock).

---

## Why the has() guard is NOT sufficient to protect all tests

The contract claims tests aren't broken because `registerDefaultHarnesses` is idempotent
(`has()` guards skip already-registered ids). That is true ONLY for tests that **register a
mock for the id they then exercise**. It does NOT protect tests whose entire premise is
"this built-in id is missing → expect a throw." Those tests intentionally leave the id
unregistered; auto-registration defeats their premise.

---

## BREAKING tests (6) — must be updated to keep `npm test` green

Each currently asserts a throw / error response when a built-in id (`'pi'` or `'claude-code'`)
is missing. After T2.S1, the safety net materializes a REAL harness for that id, so the
throw/error never fires.

| # | File:lines | What it asserts | Built-in id omitted | Fix |
|---|---|---|---|---|
| 1 | `src/__tests__/unit/agent.test.ts:138-141` | `new Agent()` throws `/Harness 'pi' is not registered/` (registry empty) | `'pi'` | Switch to a NON-built-in id: `new Agent({ harness: 'nonexistent' as any })` → expects `/Harness 'nonexistent' is not registered/`. (Precedent: `provider-agent.test.ts:165`, `provider-switching.test.ts:164` use `'nonexistent-provider'`.) |
| 2 | `src/__tests__/unit/agent.test.ts:175-181` (P1.M1.T1.S2 inverse) | register ONLY `'claude-code'`; `new Agent()` throws `/Harness 'pi' is not registered/` | `'pi'` | PURPOSE ("default is `'pi'`, config-driven not registry-driven") stays valid; OUTCOME flips. Update to: `new Agent()` resolves (auto-registers real `'pi'`) → assert `agent.harness.id === 'pi'`. |
| 3 | `src/__tests__/unit/agent-stream-harness-override.test.ts:145-160` | register ONLY `'pi'`; `agent.stream(prompt, { harness: 'claude-code' })` rejects `/Harness 'claude-code' is not registered/` | `'claude-code'` | Change prompt override to a non-built-in id: `{ harness: 'nonexistent' as HarnessId }` → expects `/Harness 'nonexistent' is not registered/`. |
| 4 | `src/__tests__/unit/agent-stream-provider-override.test.ts:201-221` | register ONLY `'anthropic'`; `agent.stream(prompt, { provider: 'claude-code' })` rejects `/Harness 'claude-code' is not registered/` | `'claude-code'` | Change to `{ provider: 'nonexistent-provider' as ProviderId }` → expects `/Harness 'nonexistent-provider' is not registered/`. |
| 5 | `src/__tests__/unit/agent-stream-provider-override.test.ts:~540-553` | identical pattern to #4 | `'claude-code'` | Same fix as #4. |
| 6 | `src/__tests__/unit/agent-prompt-provider-override.test.ts:185-206` | register ONLY `'anthropic'`; `agent.prompt(prompt, { provider: 'claude-code' })` → expects `response.status === 'error'` (PROVIDER_NOT_FOUND via executePrompt) | `'claude-code'` | Change to `{ provider: 'nonexistent-provider' as ProviderId }` → still returns PROVIDER_NOT_FOUND error. |

### Why a non-built-in id is the correct fix for the throw/error-path tests

The safety net ONLY fires for `'pi'` and `'claude-code'` (the two built-in defaults —
matches `isValidHarnessId` in `src/utils/harness-config.ts`). Any other id (`'nonexistent'`,
`'nonexistent-provider'`, `'anthropic'`) is left untouched → `registry.get(...)` returns
undefined → the existing throw / `createErrorResponse('PROVIDER_NOT_FOUND', ...)` fires exactly
as before. This preserves the test's INTENT (exercise the missing-harness error path) without
fighting the new auto-registration contract.

> NOTE on `'anthropic'`: `'anthropic'` is also non-built-in (not auto-registered), so it is a
> valid choice too — but the 2 existing integration tests already established the
> `'nonexistent-provider'` convention for the "not registered" path; reuse it for consistency.

---

## SAFE tests (no change needed)

### A. Tests that register their own mock for the id under test

These call `HarnessRegistry.getInstance().register(createMockHarness('pi'))` (or `'claude-code'`)
and then exercise that same id. The safety net sees `registry.has('pi') === true` → skips
registration → the mock is preserved → the mock's `execute` is the one called. Examples:

- `agent.test.ts:127-135` (`'uses the configured global default harness'` — registers `'pi'`).
- `agent.test.ts:157-172` (P1.M1.T1.S2 primary — registers `'pi'`).
- The cascade-matrix scenarios 1, 2, 3 (`agent-harness-cascade-matrix.test.ts`) — all register
  every id they exercise.
- `agent-prompt-harness-override.test.ts` / `agent-stream-harness-override.test.ts` happy-path
  tests (register `'pi'` + `'claude-code'`).

### B. Tests using a non-built-in id for the missing path (already correct)

- `provider-agent.test.ts:156-165` — uses `'nonexistent-provider'`. ✅
- `provider-switching.test.ts:155-164` — uses `'nonexistent-provider'`. ✅
- `harness-registry.test.ts:495-499` — tests `HarnessRegistry` directly (not the Agent), uses
  `'anthropic'`. ✅ (unaffected — the safety net lives in `agent.ts`, not the registry).

### C. The self-adapting cascade matrix

`src/__tests__/unit/agent-harness-cascade-matrix.test.ts` was DESIGNED to anticipate T2.S1:

```ts
const AUTO_REGISTER_ACTIVE = (() => {
  HarnessRegistry['_resetForTesting']();
  resetGlobalHarnessConfig();
  resetGlobalConfig();
  try {
    const probe = new Agent();
    return probe.harness?.id === 'pi';   // true once T2.S1 lands
  } catch {
    return false;                         // "Harness 'pi' is not registered" → pre-T2.S1
  } finally { /* cleanup */ }
})();

it.skipIf(!AUTO_REGISTER_ACTIVE)(
  'scenario 4: zero setup ... resolves to "pi" via default + auto-registration safety net',
  () => { ... expect(agent.harness.id).toBe('pi'); }
);
```

When T2.S1 lands, the probe flips to `true` and scenario 4 auto-activates and passes. **No edit
required** — but the implementing agent should RUN this file and confirm scenario 4 now runs
(was `.skip`-masked before) and is green.

---

## Scope boundary vs. P1.M1.T2.S2

| Concern | Owner |
|---|---|
| Production: export `registerDefaultHarnesses` + 3-call-site safety net in `agent.ts` | **S1** (this task) |
| Keep `npm test` green → UPDATE the 6 obsolete throw/error-path tests above | **S1** (this task) |
| NEW positive regression test: `new Agent({model})` with ZERO setup resolves to `'pi'` + example 02 smoke | **S2** (`P1.M1.T2.S2`) — do NOT build here (the cascade-matrix scenario 4 already covers the zero-setup path as a side effect, but the dedicated standalone test + example launch is S2's deliverable) |

---

## Verified facts (exact line numbers, post-P1.M1.T1 codebase)

- `src/index.ts` — `registerDefaultHarnesses` is ABSENT (grep confirms). Export block at
  `// Harness configuration & model-spec utilities` (~L92-93) is the insertion point.
- `src/core/agent.ts:43` — `import { HarnessRegistry } from '../harnesses/index.js';`
  (extend this line to also import `registerDefaultHarnesses` — it IS exported from that barrel
  at `src/harnesses/index.ts:21`).
- `src/core/agent.ts:45` — `import { getGlobalHarnessConfig, resolveHarnessConfig } from '../utils/harness-config.js';`
- Constructor call site: L114 `getGlobalHarnessConfig()`, L115-118 `resolveHarnessConfig(...)`,
  L120 `effectiveHarness = resolved.harness`, L125 `registry = getInstance()`,
  L126 `const harnessInstance = registry.get(effectiveHarness)`, L127-129 throw block. Variable: `effectiveHarness`.
- `stream()` call site: L367-373 resolve, L379 `registry`, L380 `registry.get(resolvedHarness)`,
  L381-385 throw block. Variable: `resolvedHarness`.
- `executePrompt()` call site: L609-615 resolve, L621 `registry`, L622 `registry.get(resolvedHarness)`,
  L623-626 `return createErrorResponse('PROVIDER_NOT_FOUND', ...)`. Variable: `resolvedHarness`.
  **Does NOT throw — returns an error AgentResponse.**
- Built-in id set = `'pi'` | `'claude-code'` (source: `isValidHarnessId` in harness-config.ts;
  registered by `registerDefaultHarnesses` in register-defaults.ts L36/L45).
