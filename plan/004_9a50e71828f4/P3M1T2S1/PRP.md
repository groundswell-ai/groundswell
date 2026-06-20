# PRP — P3.M1.T2.S1: `executePrompt()` — per-call harness resolution + `HarnessRequest`

**PRD reference:** §7.3 (`Harness` interface / `execute<T>`), §7.7 (Configuration Cascade),
§7.9 (`AgentConfig`), §7.10 (Tool Execution), §7.11 (Hook Adaptation — `AgentHooks`→
`HarnessHookEvents`). **Plan:** `plan/004_9a50e71828f4/` — S1 of P3.M1.T2 ("Agent executePrompt +
stream + cache key rewire"). **Consumes** the Agent fields delivered by the parallel
**P3.M1.T1.S1** (`this.harness: Harness`, `this.harnessId?: HarnessId`, `this.harnessOptions?:
HarnessOptions`, the `HarnessRegistry` import, and S1's **mechanical** rename of
`ProviderRegistry`→`HarnessRegistry` + `this.providerId`→`this.harnessId` inside `executePrompt` —
see `../P3M1T1S1/PRP.md`); the type aliases in `src/types/providers.ts`
(`ProviderRequest = HarnessRequest`, `ProviderHookEvents = HarnessHookEvents`); and the
`resolveProviderConfig`→`resolveHarnessConfig` delegation in `src/utils/harness-config.ts` (L367–368).
**Unblocks** P3.M1.T2.S3 (cache-key harness+provider threading — T2.S1 leaves the `CacheKeyInputs`
build-site byte-identical so S3 can extend it). **Scope tag:** (a) in `executePrompt()` **REPLACE**
`overrides?.provider`/`overrides?.providerOptions` reads with the harness-vocabulary reads **+ legacy
fallback**; (b) **RENAME** the method-local identifiers to harness vocabulary (`promptHarness`,
`resolvedHarness`, `harnessInstance`, `harness`, `harnessHooks`, `harnessRequest`, `harnessResult`);
(c) **BUILD `HarnessRequest`** (typed) instead of `ProviderRequest`; (d) **CALL**
`harness.execute<T>(...)` from the `HarnessRegistry`-resolved instance (cast `as Harness | undefined`);
(e) **MAP** `AgentHooks`→`HarnessHookEvents` (identical mapping, retyped); (f) **CONDITIONALLY ADD**
`harness?`/`harnessOptions?` to `PromptOverrides`; (g) **ADD** a new test file mocking
`harness.execute`. **Cache hit/miss, env setup/restore, workflow-event emission, structured-output
validation, `createSuccessResponse`/`createErrorResponse` paths are UNCHANGED.**

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** The contract literally says "Replace
> overrides?.provider→overrides?.harness" and S1's PRP says "T2 … migrate … to
> `configureHarnesses`/`getGlobalHarnessConfig`." This PRP honours the **essential** deliverable
> (harness-vocabulary request/response + `harness.execute`) but **deliberately keeps the legacy
> global-config bridge** (`resolveProviderConfig`/`getGlobalProviderConfig`) and a **field fallback**
> (`overrides?.harness ?? overrides?.provider`). Both are **proven** to keep the ~7
> `configureProviders`-based test files green (the bridge delegates to `resolveHarnessConfig`;
> `Provider`/`ProviderOptions` are structurally compatible with `Harness`/`HarnessOptions`). The
> global-singleton migration + full test-vocabulary rewrite is a LATER, larger change (P3.M2.T2.S1 /
> P4) that would need all test files rewritten in lockstep — doing it here explodes scope and
> conflicts with the parallel S1.

---

## Goal

**Feature Goal:** Make `Agent.executePrompt()` run the prompt through the **`Harness` abstraction**:
read the per-call harness override from `PromptOverrides.harness` (with a legacy `provider` fallback),
resolve it through the PRD §7.7 cascade, fetch the harness from `HarnessRegistry`, build a
`HarnessRequest`, and call `harness.execute<T>(...)`. The `AgentHooks`→hook-events mapping is retyped
to `HarnessHookEvents`. After S1 of T2, `executePrompt` is harness-vocabulary internally while
remaining **agent-response parity** with today (identical `AgentResponse<T>` shape, identical error
codes, identical cache/event/validation behaviour).

**Deliverable:**
1. **MODIFY `src/core/agent.ts`** — extend the harnesses type import with `HarnessRequest`,
   `HarnessHookEvents`; in `executePrompt()` swap the two `overrides?.provider*` reads to the
   harness-vocabulary + fallback form; rename all method-local identifiers to harness vocabulary;
   build `HarnessRequest`; call `harness.execute<T>`; retype the hooks map to `HarnessHookEvents`;
   reword the two error messages + details keys to harness vocabulary (KEEP the error codes).
2. **MODIFY `src/types/agent.ts`** — add `harness?: HarnessId` + `harnessOptions?: HarnessOptions`
   to `PromptOverrides` (CONDITIONAL — only if a pre-flight grep shows them absent; P3.M2.T2.S1 may
   add them first).
3. **CREATE `src/__tests__/unit/agent-prompt-harness-override.test.ts`** — `createMockHarness` +
   `HarnessRegistry` setup + a `describe('Agent.prompt() harness override')` block covering
   explicit-harness, agent-level harness, prompt-beats-agent, legacy-provider fallback,
   `PROVIDER_NOT_FOUND`, `HarnessRequest` shape, `AgentHooks`→`HarnessHookEvents` wiring, and
   agent-response parity.
4. **LEAVE GREEN & UNCHANGED** — `src/__tests__/unit/agent-prompt-provider-override.test.ts`
   (regression coverage for the legacy `{provider}` fallback path via the bridge).

**Success Definition:**
1. `npm run lint` (`tsc --noEmit` on `src/`, **excludes `src/__tests__`**) exits 0 — the
   `HarnessRequest`/`HarnessHookEvents` imports, the `as Harness | undefined` cast, the
   `harness.execute<T>` call, and the `PromptOverrides.harness` field all type-check.
2. `npm test` (`vitest run`) exits 0 — the NEW `agent-prompt-harness-override.test.ts` passes AND
   **the entire existing suite stays green** (the bridge + field fallback preserve legacy
   `{provider:'opencode'}` behaviour in `agent-prompt-provider-override.test.ts`,
   `agent-stream-provider-override.test.ts`, `provider-switching.test.ts`, `provider-agent.test.ts`,
   `agent-tool-executor.test.ts`, `workflow-validation.test.ts`, `agent.test.ts` — zero changes).
3. `npm run build` (`tsc`) exits 0 — `dist/core/agent.js` + `dist/types/agent.js` emit reflect the
   harness-vocabulary `executePrompt`.
4. Runtime spot-check (vitest): `agent.prompt(prompt, { harness: 'pi' })` with a `'pi'` stub
   registered calls `pi.execute` with a `HarnessRequest` and returns a success `AgentResponse`;
   `agent.prompt(prompt, { provider: 'anthropic' })` (legacy) resolves the anthropic stub;
   `agent.prompt(prompt, { harness: 'claude-code' })` with no `'claude-code'` stub returns
   `status:'error'`, `code:'PROVIDER_NOT_FOUND'`.
5. Contract (grep): `HarnessRequest`, `HarnessHookEvents`, `harness.execute`, `overrides?.harness`,
   `resolvedHarness` present in `executePrompt`; `ProviderRequest`/`ProviderHookEvents`/
   `overrides?.provider`/`provider.execute`/`providerRequest`/`providerHooks` **absent** from
   `executePrompt` (still present in `stream()` — owned by T2.S2).

---

## ⚠️ SCOPE DECISIONS — the load-bearing details

### Decision 1 — KEEP the legacy global-config bridge (`resolveProviderConfig` / `getGlobalProviderConfig`)

`executePrompt` today reads the global source via `getGlobalProviderConfig()` and resolves via
`resolveProviderConfig(...)`. `src/utils/harness-config.ts` L367–368 **proves** `resolveProviderConfig`
DELEGATES to `resolveHarnessConfig`:

```ts
const { harness, options } = resolveHarnessConfig(harnessGlobal, agentProvider, agentOptions, promptProvider, promptOptions);
```

So the **canonical harness cascade already runs** through the bridge. The only thing the bridge does
NOT do is read the *harness* global singleton (`getGlobalHarnessConfig`, default `'pi'`) — it reads
the *legacy* singleton (`getGlobalProviderConfig`, default `'anthropic'`, mutated by
`configureProviders`).

**Switching to `getGlobalHarnessConfig` breaks the suite.** Concrete failing case (proven in
`research/executePrompt-rewire-analysis.md` §3): `agent-prompt-provider-override.test.ts` "should use
global default provider when agent has no provider" does `new Agent()` (→ `this.harnessId` undefined)
+ `agent.prompt(prompt)` (no override) → cascade resolves to the GLOBAL default. Legacy singleton +
`configureProviders({defaultProvider:'anthropic'})` ⇒ `'anthropic'` (stub registered) ✓. Harness
singleton ⇒ `'pi'` (default, no stub) ⇒ `PROVIDER_NOT_FOUND` ✗. ~7 Agent-constructing test files
share this blast radius.

The contract's "**per-call harness resolution**" = resolve the harness from the **agent + prompt
cascade** (which the bridge already does via delegation). It is satisfied WITHOUT switching the global
source. **KEEP** `import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';`
(agent.ts L45, preserved by S1) and the existing `resolveProviderConfig(getGlobalProviderConfig(), …)`
call. Do NOT "improve" it to `resolveHarnessConfig`/`getGlobalHarnessConfig` — it will turn the suite
red. The global-singleton + test-vocabulary migration is deferred (P3.M2.T2.S1 / P4 cleanup) and must
be done in lockstep with all ~7 test files. (Mirrors S1 Decision 1 exactly.)

### Decision 2 — Field fallback: `overrides?.harness ?? overrides?.provider`

The contract says "Replace `overrides?.provider`→`overrides?.harness`." Read harness as the
**primary**, with the legacy `provider` as a **fallback** so every existing caller/test
(`agent.prompt(prompt, { provider: 'opencode' })`) keeps working during the v1.2 migration:

```ts
const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);
const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;
```

`overrides.provider` is `ProviderId` (= `HarnessId | 'anthropic' | 'opencode'`); the `as HarnessId`
cast is **unsound at the type level but runtime-safe** — `resolveProviderConfig`→`resolveHarnessConfig`
treats the id as an **opaque string key** (harness-config.ts: "resolveHarnessConfig performs NO id
validation") and `HarnessRegistry.get(id)` does a raw `Map.get(id)`. So a legacy literal like
`'opencode'`/`'anthropic'` flows through unchanged and resolves whatever stub is registered under it.
This cast **mirrors the EXACT pattern** S1 used in the constructor
(`config.harness ?? (config.provider as HarnessId | undefined)`) and the one inside
`resolveProviderConfig` itself. The fallback is removed once `PromptOverrides` + the test suite are
fully on harness vocabulary (later milestone). (Mirrors S1 Decision 2.)

### Decision 3 — `HarnessRegistry.get(...)` returns `Provider`; cast to `Harness` (runtime-safe)

Same as S1 Decision 3. `HarnessRegistry.get(id: ProviderId): Provider | undefined` returns the legacy
`Provider` type. `Provider` is NOT assignable to `Harness` (`Provider.id: ProviderId` is wider than
`Harness.id: HarnessId`), so:

```ts
const harnessInstance = registry.get(resolvedHarness) as Harness | undefined;
```

Runtime-safe: `Provider` and `Harness` are **structurally identical** (identical method surface —
`id`, `capabilities`, `initialize`, `terminate`, `execute`, `registerMCPs`, `loadSkills`,
`normalizeModel`, `supports`, `requiresFeatures`); every `Provider*` parameter type is a
`@deprecated` alias for the matching `Harness*` type (research §2). The cast bridges only the
id-type width gap. The `PROVIDER_NOT_FOUND` guard runs on the cast value, so a genuinely-missing
harness still returns the error.

### Decision 4 — KEEP the error codes `PROVIDER_NOT_FOUND` / `PROVIDER_EXECUTION_FAILED`

`agent-prompt-provider-override.test.ts` asserts `expect(response.error.code).toBe('PROVIDER_NOT_FOUND')`
AND `expect(response.error.message).toContain('not registered')` AND `.toContain('opencode')` (the
resolved id). The codes are part of the `AgentResponse` error contract (PRD §6.2 — machine-readable,
downstream may key on them). The contract says "Keep … createErrorResponse paths." **KEEP both
codes.** Reword the human messages to harness vocabulary (still containing the id + `'not registered'`
so the assertions hold) and rename the details keys:

```ts
// PROVIDER_NOT_FOUND path
return createErrorResponse(
  'PROVIDER_NOT_FOUND',                                   // ← KEEP code
  `Harness '${resolvedHarness}' is not registered`,      // ← reworded (still has id + 'not registered')
  { harnessId: resolvedHarness },                         // ← providerId → harnessId
  false,
) as AgentResponse<T>;

// catch block
return createErrorResponse(
  'PROVIDER_EXECUTION_FAILED',                            // ← KEEP code
  `Harness execution error: ${message}`,                 // ← reworded
  { duration, harnessId: resolvedHarness },               // ← providerId → harnessId
  true,
) as AgentResponse<T>;
```

The `'opencode'`-in-message assertion still holds because `resolvedHarness` carries the id
(`'opencode'`). The "execution errors gracefully" test only checks `status === 'error'` — safe.

### Decision 5 — Rename method-local identifiers to harness vocabulary (the actual logic swap)

This is the substance of T2.S1 (vs S1's mechanical field rename). Inside `executePrompt` ONLY:

| Before (post-S1) | After (T2.S1) |
|---|---|
| `const promptProvider = overrides?.provider;` | `const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId \| undefined);` |
| `const promptProviderOptions = overrides?.providerOptions;` | `const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;` |
| `const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(...)` with args `..., promptProvider, promptProviderOptions` | `const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(...)` with args `..., promptHarness, promptHarnessOptions` |
| `const providerInstance = registry.get(resolvedProvider);` | `const harnessInstance = registry.get(resolvedHarness) as Harness \| undefined;` |
| `const provider = providerInstance;` | `const harness = harnessInstance;` |
| `const providerHooks: ProviderHookEvents = {};` | `const harnessHooks: HarnessHookEvents = {};` (+ the 4 hook-wiring `if`-blocks: `providerHooks.onToolStart`→`harnessHooks.onToolStart`, etc.) |
| `const providerRequest: ProviderRequest = { ... options: { ..., sessionId: resolvedProviderOptions.sessionId, hooks: providerHooks } };` | `const harnessRequest: HarnessRequest = { ... options: { ..., sessionId: resolvedHarnessOptions.sessionId, hooks: harnessHooks } };` |
| `const providerResult = provider.execute<T>(providerRequest, this.toolExecutor.bind(this), providerHooks);` | `const harnessResult = harness.execute<T>(harnessRequest, this.toolExecutor.bind(this), harnessHooks);` |
| references to `providerResult` in the union-return handling | `harnessResult` |

**KEEP** the union-return handling logic (`Symbol.asyncIterator in harnessResult ? … : …`) byte-
identical — just rename the variable. The `Harness.execute` return type
(`Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`) is identical to
`provider.execute`'s, so the handling type-checks unchanged.

**Do NOT touch** `stream()` (T2.S2 owns it — it still uses `ProviderRequest`/`ProviderHookEvents`/
`provider.execute` until S2 lands). **Do NOT touch** the `CacheKeyInputs` build-site (T2.S3).

### Decision 6 — The `resolveProviderConfig` destructure key stays `provider` (bridge contract)

Because we KEEP `resolveProviderConfig` (Decision 1), its return shape is `{ provider, options }`
(legacy keys — it wraps `resolveHarnessConfig`'s `{ harness, options }`). So the destructure MUST
read `{ provider: resolvedHarness, options: resolvedHarnessOptions }` — i.e. the **key** is
`provider` (the legacy return field) but the **local name** is `resolvedHarness`. (If you switch to
`resolveHarnessConfig` directly, the key becomes `harness` — but Decision 1 says don't.) This is a
cosmetic oddity of the bridge; it compiles and runs identically.

### Decision 7 — Conditionally ADD `harness`/`harnessOptions` to `PromptOverrides`

`overrides.harness` is a `tsc` error today (`PromptOverrides` has only `provider`/`providerOptions`
at types/agent.ts L228/L253 — confirmed by grep). The contract lists `PromptOverrides.harness/
harnessOptions (P3.M2.T2.S1)` as an INPUT, but that work item is `Planned` (not done). **Resolution:**
S1 of T2 adds the two optional fields to `PromptOverrides` as a **Task gated on a pre-flight grep** —
`grep -nE '^\s+(provider|harness|providerOptions|harnessOptions)\??:' src/types/agent.ts`. If the
grep finds `harness?:` on `PromptOverrides`, P3.M2.T2.S1 already landed and the task is **skipped**
(zero conflict). If absent, add (after the existing `model?: string;` field, ~L200, inside
`PromptOverrides`):

```ts
  /** Override harness for this prompt (PRD §7.7, §7.9). Highest priority in the harness cascade. */
  harness?: HarnessId;

  /** Override harness options for this prompt (PRD §7.7). Merged via last-write-wins. */
  harnessOptions?: HarnessOptions;
```

plus `import type { HarnessId, HarnessOptions } from './harnesses.js';` at the top of `agent.ts`
(types) — **S1's Task 2 already added this import for `AgentConfig`**; verify it exists (if so, no
new import needed; `PromptOverrides` is in the same file). **Do NOT remove** `provider`/
`providerOptions` from `PromptOverrides` (legacy, kept for the fallback + `stream()` + existing
tests). (Mirrors S1 Decision 5.)

### Decision 8 — New test FILE (not editing the existing provider-override test)

S1's PRP lists `agent-prompt-provider-override.test.ts` under "NOT edited by S1" — so it is in T2's
lane. But the bridge + field fallback (Decisions 1+2) keep that file **green unchanged** (it becomes
regression coverage for the legacy `{provider}` fallback path). Rather than heavily rewrite it
(risk + churn), T2.S1 **creates a NEW** `src/__tests__/unit/agent-prompt-harness-override.test.ts`
that visibly exercises the NEW `{harness}` path + `harness.execute` mock + `HarnessRequest` shape +
`AgentHooks`→`HarnessHookEvents` wiring + parity. This satisfies the contract's "Mock harness.execute
in tests" cleanly and avoids merge risk with S1 (which owns `agent.test.ts`). The new file uses
per-file helpers (`createMockHarness`) — the repo convention (each agent test file declares its own
`createMockProvider`).

---

## User Persona

**Target User:** Groundswell core maintainers + the T2.S2/T2.S3 implementers + downstream `Agent`
consumers.
- **T2.S2 (stream)** — needs `executePrompt` harness-vocabulary as the reference pattern for the
  streaming rewire (same cascade + `HarnessRequest` + `HarnessHookEvents`, plus `streaming: true`).
- **T2.S3 (cache key)** — needs `executePrompt`'s `resolvedHarness` + resolved provider available
  to thread into `CacheKeyInputs`; T2.S1 leaves the cache build-site intact so S3 can extend it.
- **Agent consumers** — `agent.prompt(prompt, { harness: 'pi', model: 'anthropic/claude-sonnet-4' })`
  (PRD §7.13) now runs through the Harness abstraction; legacy `agent.prompt(prompt, { provider:
  'anthropic' })` callers keep working via the fallback.

**Use Case:** A workflow constructs `new Agent({ harness: 'pi', model: 'anthropic/claude-sonnet-4' })`
and calls `agent.prompt(prompt)`. `executePrompt` reads no prompt override, resolves the cascade
(agent harness `'pi'` wins), fetches `HarnessRegistry.get('pi')`, builds a `HarnessRequest`, and
calls `pi.execute<T>(request, toolExecutor, harnessHooks)` → `AgentResponse<T>`. A second call
`agent.prompt(prompt, { harness: 'claude-code' })` overrides per-call to the `'claude-code'` harness.
A legacy call `agent.prompt(prompt, { provider: 'opencode' })` falls back through `overrides?.provider`
and resolves the `'opencode'` stub.

**Pain Points Addressed:** Today `executePrompt` builds a `ProviderRequest` and calls
`provider.execute` — provider vocabulary, blocking the §7 harness/provider split at the execution
site. S1 of T2 makes the prompt-execution path harness-native while preserving every external
behaviour (response shape, error codes, cache, events, validation) — the prerequisite for T2.S2
(stream) and T2.S3 (cache-key) to finish the Agent rewire.

---

## Why

- **Realises PRD §7.3** — `executePrompt` calls `Harness.execute<T>(HarnessRequest, toolExecutor,
  HarnessHookEvents)` per the shared interface.
- **Realises PRD §7.7 + §7.9** — per-call harness resolution honours the cascade
  (global → agent → prompt) and reads `PromptOverrides.harness`.
- **Realises PRD §7.11** — `AgentHooks`→`HarnessHookEvents` mapping at the execution site.
- **Unblocks P3.M1.T2.S2/S3** — establishes the harness-vocabulary execution pattern + the
  `resolvedHarness` value that S3 threads into the cache key.
- **Keeps the migration safe** — the bridge + fallback mean S1 lands green without forcing a
  simultaneous rewrite of ~7 test files (deferred to a later lockstep migration).

---

## What

1. **MODIFY `src/core/agent.ts`** — extend the harnesses type import (`HarnessRequest`,
   `HarnessHookEvents`); in `executePrompt()` swap the two override reads + rename all method-locals
   to harness vocabulary + build `HarnessRequest` + call `harness.execute<T>` + retype the hooks map
   + reword the two error messages/details (keep codes).
2. **MODIFY `src/types/agent.ts`** — conditionally add `harness?`/`harnessOptions?` to
   `PromptOverrides`.
3. **CREATE `src/__tests__/unit/agent-prompt-harness-override.test.ts`** — harness-vocabulary
   `executePrompt` coverage.
4. **VALIDATE** — lint / new test / full suite / build / grep contracts.
5. **DO NOT edit:** `stream()` logic (T2.S2); the `CacheKeyInputs` build-site (T2.S3); the
   constructor (S1); `AgentConfig` (S1/P3.M2.T1.S1); `agent.test.ts` (S1);
   `agent-prompt-provider-override.test.ts` (left green as legacy-fallback regression);
   `harness-config.ts`/`harness-registry.ts`/types (P1/P2 done); `src/index.ts` (P3.M3.T1.S1).

### Success Criteria

- [ ] `executePrompt` reads `overrides?.harness ?? overrides?.provider` (cast) +
      `overrides?.harnessOptions ?? overrides?.providerOptions`.
- [ ] `executePrompt` keeps `resolveProviderConfig(getGlobalProviderConfig(), this.harnessId,
      this.harnessOptions, promptHarness, promptHarnessOptions)` (the bridge — delegates to
      `resolveHarnessConfig`).
- [ ] `executePrompt` fetches `HarnessRegistry.getInstance().get(resolvedHarness) as Harness |
      undefined` and returns `PROVIDER_NOT_FOUND` (code kept) when missing.
- [ ] `executePrompt` builds a `harnessRequest: HarnessRequest` and calls
      `harness.execute<T>(harnessRequest, this.toolExecutor.bind(this), harnessHooks)`.
- [ ] The `AgentHooks`→`HarnessHookEvents` mapping (`onToolStart`/`onToolEnd`/`onSessionStart`/
      `onSessionEnd`) is retyped to `HarnessHookEvents` (identical wiring).
- [ ] Cache hit/miss, env setup/restore, `agentPromptStart`/`agentPromptEnd` events, structured-
      output validation, `createSuccessResponse`/`createErrorResponse` paths are byte-identical
      (apart from the renamed locals + reworded error messages).
- [ ] `PromptOverrides` has `harness?: HarnessId` + `harnessOptions?: HarnessOptions` (added by
      T2.S1 only if absent at pre-flight).
- [ ] `agent-prompt-harness-override.test.ts` passes (explicit harness, agent-level harness,
      prompt-beats-agent, legacy fallback, PROVIDER_NOT_FOUND, HarnessRequest shape, hook wiring,
      parity).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0; the full suite stays green.
- [ ] grep: `ProviderRequest`/`ProviderHookEvents`/`overrides?.provider`/`provider.execute`/
      `providerRequest`/`providerHooks` ABSENT from `executePrompt` (still present in `stream()`).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement T2.S1 using
only (a) this PRP, (b) read-only access to `src/core/agent.ts` (the post-S1 `executePrompt` body —
resolution L590–612, hooks map L700–760, request+execute L762–790, union-return L792–815, validation
+ cache + events L817–865, catch L867–877; imports L40–46), `src/types/agent.ts` (`PromptOverrides`
L174–253), `src/types/harnesses.ts` (`HarnessRequest` L194, `HarnessExecutionOptions` L167,
`HarnessHookEvents` L98, `Harness.execute` L350), `src/types/providers.ts` (the alias identities
L66/L78/L90 + `ProviderOptions` L127), `src/utils/harness-config.ts` (L367–368 delegation proof +
`resolveHarnessConfig` L192), `src/harnesses/harness-registry.ts` (`getInstance`/`get`/`register`/
`_resetForTesting`), and `src/__tests__/unit/agent-prompt-provider-override.test.ts` (the existing
`createMockProvider` + `configureProviders`/`resetGlobalConfig` pattern to mirror for the new file),
and (c) the copy-paste-ready snippets in "Implementation Patterns" +
`research/executePrompt-rewire-analysis.md` (type-identity table §2, bridge rationale §3, error-code
rationale §4, scope boundaries §5). The eight load-bearing decisions (legacy bridge, field fallback,
`Provider`→`Harness` cast, keep error codes, rename method-locals, destructure key, conditional
PromptOverrides add, new test file) are all proven in the research note.

### Documentation & References

```yaml
# MUST READ — the file to REWIRE (executePrompt — the whole method).
- file: src/core/agent.ts
  why: L578–880 = executePrompt (resolution block L590–612 = the override reads + cascade +
       registry.get + PROVIDER_NOT_FOUND — the block to rewire; hooks map L700–760 = the 4 if-blocks
       wiring onToolStart/onToolEnd/onSessionStart/onSessionEnd — retype to HarnessHookEvents;
       request+execute L762–790 = ProviderRequest build + provider.execute call — swap to
       HarnessRequest + harness.execute; union-return L792–815 = rename providerResult→harnessResult,
       keep logic; validation+cache+events L817–865 = UNCHANGED; catch L867–877 = reword message +
       details key, keep PROVIDER_EXECUTION_FAILED code); L40–46 = imports (extend the harnesses
       type import S1 added with HarnessRequest, HarnessHookEvents; KEEP the providers.js import —
       stream still uses ProviderRequest/ProviderHookEvents).
  pattern: resolution → registry fetch → null-guard → build request → execute → handle union →
           validate → cache → events.
  gotcha: stream() (L330–540) STILL uses ProviderRequest/ProviderHookEvents/provider.execute — DO NOT
          touch (T2.S2). The providers.js type import stays for that reason.

# MUST READ — the type identities (proves the swap is a pure rename).
- file: src/types/providers.ts
  why: L90 ProviderRequest = HarnessRequest; L66 ProviderHookEvents = HarnessHookEvents; L54
       ProviderCapabilities = HarnessCapabilities; L78 ProviderExecutionOptions =
       HarnessExecutionOptions; L40 ProviderId = HarnessId | 'anthropic' | 'opencode' (wider —
       justifies Decision 2's cast); L127 ProviderOptions (⊃ HarnessOptions — assignable, no cast).
  critical: the Provider* aliases are @deprecated but FULLY functional — swapping to Harness* in
            executePrompt is zero-structural-change.

# MUST READ — the Harness types (the contract the request/hooks implement).
- file: src/types/harnesses.ts
  why: L194 HarnessRequest { prompt: string; options: HarnessExecutionOptions }; L167
       HarnessExecutionOptions { model?, systemPrompt?, tools?, hooks?: HarnessHookEvents,
       sessionId?, streaming? } (SAME shape as the current ProviderRequest.options — the build is
       identical); L98 HarnessHookEvents { onToolStart?, onToolEnd?(tool,result,duration),
       onSessionStart?, onSessionEnd?(totalDuration), onStream?(chunk) } (identical to the current
       ProviderHookEvents wiring); L350 Harness.execute<T>(request, toolExecutor, hooks?) returns
       Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> (identical
       to provider.execute — the union-return handling is unchanged).
  pattern: `import type { Harness, HarnessId, HarnessOptions, HarnessRequest, HarnessHookEvents }
           from '../types/harnesses.js';` (type-only — isolatedModules: true; S1 already imports the
           first three — extend that import).

# MUST READ — the cascade (confirms resolveProviderConfig delegates to resolveHarnessConfig).
- file: src/utils/harness-config.ts
  why: L367–368 = proof resolveProviderConfig DELEGATES to resolveHarnessConfig (justifies Decision
       1's bridge); L192–210 = resolveHarnessConfig signature (globalConfig, agentHarness?,
       agentOptions?, promptHarness?, promptOptions?) => { harness, options } (NO id validation —
       opaque string key, justifies Decision 2's cast). resolveProviderConfig returns { provider,
       options } (legacy keys — justifies Decision 6's destructure key).
  critical: the legacy singleton (configureProviders/getGlobalProviderConfig) and the harness singleton
            (configureHarnesses/getGlobalHarnessConfig) are SEPARATE — that is exactly why T2.S1
            keeps resolveProviderConfig/getGlobalProviderConfig (to keep configureProviders-based
            tests green).

# MUST READ — the registry (HarnessRegistry IS ProviderRegistry).
- file: src/harnesses/harness-registry.ts
  why: getInstance() (singleton); get(id: ProviderId): Provider | undefined (returns the LEGACY
       Provider type — Decision 3's cast target); register(provider: Provider) (accepts a
       structurally-identical Harness — used by the new test); _resetForTesting() (static, for
       afterEach).
  gotcha: get() returns Provider, NOT Harness — cast `as Harness | undefined` (Decision 3).

# MUST READ — PromptOverrides (the conditional edit target).
- file: src/types/agent.ts
  why: L174–253 = PromptOverrides (provider? L228, providerOptions? L253 — the legacy fields KEPT;
       add harness?/harnessOptions? after model? ~L200 IF absent — Decision 7). S1's Task 2 already
       added `import type { HarnessId, HarnessOptions } from './harnesses.js';` for AgentConfig —
       verify it exists (PromptOverrides is in the same file, so the import is shared).
  gotcha: the pre-flight grep (Task 0) decides whether this file is edited at all.

# MUST READ — the legacy provider-config shim (the import agent.ts KEEPS).
- file: src/utils/provider-config.ts
  why: confirms resolveProviderConfig + getGlobalProviderConfig + configureProviders + resetGlobalConfig
       are re-exported (deprecated shim) from harness-config.js — agent.ts L45 imports the first two
       and KEEPS them (Decision 1). The new test imports resetGlobalConfig (+ optionally
       configureProviders) from here.

# MUST READ — the existing provider-override test (the pattern to MIRROR, not edit).
- file: src/__tests__/unit/agent-prompt-provider-override.test.ts
  why: createMockProvider(id, executeImpl?) helper (L26–67 — clone as createMockHarness returning
       Harness-typed); beforeEach registers 'anthropic'+'opencode' stubs + resetGlobalConfig;
       afterEach calls ProviderRegistry['_resetForTesting']() + resetGlobalConfig; the cascade
       assertions (agent provider used, prompt override wins, global default, PROVIDER_NOT_FOUND).
       This file stays GREEN UNCHANGED (legacy-fallback regression) — the NEW file mirrors its
       structure with harness vocabulary.

# SHOULD READ — the previous PRP (P3.M1.T1.S1) — the CONTRACT for what exists when T2.S1 starts.
- file: plan/004_9a50e71828f4/P3M1T1S1/PRP.md
  why: defines the post-S1 Agent state T2.S1 consumes (this.harness/harnessId/harnessOptions fields;
       HarnessRegistry import; the mechanical rename already applied to executePrompt's
       this.harnessId/harnessOptions + HarnessRegistry identifier — but NOT the logic). S1's Decision
       1 (legacy bridge) + Decision 2 (field fallback) + Decision 3 (Provider→Harness cast) are the
       templates for T2.S1's Decisions 1/2/3. S1's "DO NOT touch executePrompt logic" = T2.S1's scope.

# SHOULD READ — the research note (type identities + bridge rationale + scope boundaries).
- file: plan/004_9a50e71828f4/P3M1T2S1/research/executePrompt-rewire-analysis.md
  why: §1 = the post-S1 executePrompt shape (exact before/after); §2 = the Provider*=Harness* alias
       identities + ProviderOptions ⊃ HarnessOptions assignability; §3 = the bridge rationale + the
       concrete failing test if you switch to getGlobalHarnessConfig; §4 = the error-code rationale;
       §5 = the scope-boundary table (stream/cache/constructor/etc. ownership); §6 = the test strategy.
```

### Current Codebase tree (relevant slice)

```bash
src/core/agent.ts                                      # MODIFY — executePrompt harness rewire + import extension
src/types/agent.ts                                     # MODIFY (CONDITIONAL) — add harness?/harnessOptions? to PromptOverrides if absent
src/__tests__/unit/agent-prompt-harness-override.test.ts  # CREATE — harness-vocabulary executePrompt coverage
# READ-ONLY:
src/types/harnesses.ts                                 # HarnessRequest / HarnessExecutionOptions / HarnessHookEvents / Harness.execute
src/types/providers.ts                                 # ProviderRequest=HarnessRequest, ProviderHookEvents=HarnessHookEvents aliases
src/utils/harness-config.ts                            # resolveProviderConfig delegates to resolveHarnessConfig (L367-368)
src/utils/provider-config.ts                           # legacy shim re-exporting resolveProviderConfig/getGlobalProviderConfig/resetGlobalConfig
src/harnesses/harness-registry.ts                      # HarnessRegistry.getInstance/get/register/_resetForTesting
src/__tests__/unit/agent-prompt-provider-override.test.ts  # MIRROR pattern, leave green unchanged
# UNTOUCHED by T2.S1: stream() (T2.S2), CacheKeyInputs build-site (T2.S3), constructor (S1),
#   AgentConfig (S1/P3.M2.T1.S1), agent.test.ts (S1), src/index.ts (P3.M3.T1.S1).
```

### Desired Codebase tree with files to be modified

```bash
src/core/agent.ts                                          # MODIFIED — executePrompt harness-vocabulary + HarnessRequest + harness.execute
src/types/agent.ts                                        # MODIFIED (conditional) — PromptOverrides.harness?/harnessOptions? added if absent
src/__tests__/unit/agent-prompt-harness-override.test.ts   # CREATED — createMockHarness + harness override describe
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — KEEP resolveProviderConfig/getGlobalProviderConfig (NOT resolveHarnessConfig/getGlobalHarnessConfig)
//   in executePrompt. resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368), so the
//   canonical harness cascade runs. The legacy global singleton is used deliberately to keep the ~7 test files that
//   call configureProviders() green. Switching to getGlobalHarnessConfig (default 'pi') makes every
//   `new Agent()` + `agent.prompt()` with no override resolve 'pi' and return PROVIDER_NOT_FOUND (no stub). The
//   global-singleton + test-vocabulary migration is a LATER lockstep change. (Decision 1.)

// CRITICAL #2 — overrides?.provider cast as HarnessId is runtime-safe. resolveHarnessConfig performs NO id validation
//   (opaque string key); HarnessRegistry.get does a raw Map.get. So 'anthropic'/'opencode' legacy literals flow
//   through unchanged and resolve the registered stub. Mirrors the cast S1 used in the constructor + inside
//   resolveProviderConfig itself. (Decision 2.)

// CRITICAL #3 — registry.get(...) returns Provider, NOT Harness. Cast `as Harness | undefined`. Provider and Harness
//   are structurally identical (same methods; Provider* params are deprecated Harness* aliases); the cast bridges
//   only the id-type width gap (Provider.id: ProviderId wider than Harness.id: HarnessId). The PROVIDER_NOT_FOUND
//   guard runs on the cast value, so a missing harness still returns the error. (Decision 3.)

// CRITICAL #4 — KEEP the error codes PROVIDER_NOT_FOUND + PROVIDER_EXECUTION_FAILED. agent-prompt-provider-override.test.ts
//   asserts `.toBe('PROVIDER_NOT_FOUND')` + message `.toContain('not registered')` + `.toContain(<id>)`. Reword the
//   messages to harness vocab (`Harness '<id>' is not registered`) — they still contain the id + 'not registered'.
//   Rename the details keys (providerId → harnessId). The codes are public AgentResponse contract (PRD §6.2). (Decision 4.)

// CRITICAL #5 — The resolveProviderConfig destructure key STAYS `provider` (because we keep resolveProviderConfig, whose
//   return shape is { provider, options }). So: `const { provider: resolvedHarness, options: resolvedHarnessOptions } = …`.
//   The KEY is `provider` (legacy return field); the LOCAL NAME is `resolvedHarness`. Cosmetic bridge oddity. (Decision 6.)

// GOTCHA #6 — isolatedModules: true (tsconfig.json). The new type imports (HarnessRequest, HarnessHookEvents) MUST be
//   `import type`. Extend S1's existing `import type { Harness, HarnessId, HarnessOptions } from '../types/harnesses.js';`
//   to include them. KEEP the providers.js import block (stream still uses ProviderRequest/ProviderHookEvents).

// GOTCHA #7 — npm run lint EXCLUDES src/__tests__ (tsconfig "exclude"). It type-checks agent.ts + types/agent.ts
//   (proving the impl compiles + the HarnessRequest/HarnessHookEvents imports resolve + the cast + the PromptOverrides
//   field). Test type errors surface in `npm test` (vitest/esbuild). Run BOTH gates.

// GOTCHA #8 — HarnessRegistry.register(provider: Provider) accepts a structurally-identical Harness-typed mock in tests
//   (structural typing). createMockHarness returns a Harness; registry.register(harness) type-checks.

// GOTCHA #9 — DO NOT touch stream() (L330–540). It still builds ProviderRequest + calls provider.execute until T2.S2.
//   DO NOT touch the CacheKeyInputs build-site (T2.S3). DO NOT touch the constructor or agent.test.ts (S1).

// GOTCHA #10 — The union-return handling (`Symbol.asyncIterator in harnessResult ? … : …`) stays byte-identical; only
//   the variable name changes (providerResult → harnessResult). Harness.execute's return type matches provider.execute's.

// GOTCHA #11 — The Hooks mapping's 4 if-blocks are byte-identical in WIRING; only the local object name + type change
//   (providerHooks: ProviderHookEvents → harnessHooks: HarnessHookEvents). The onStream slot is NOT wired today (no
//   AgentHooks equivalent) — leave it unwired (streaming is T2.S2's concern via the AsyncGenerator path).

// GOTCHA #12 — agent-prompt-provider-override.test.ts is LEFT GREEN & UNCHANGED (legacy-fallback regression). New
//   harness coverage goes in a NEW file. If the existing file goes red, the bridge was implemented wrong (most likely
//   overrides?.provider was read exclusively without the ?? fallback, or getGlobalHarnessConfig was used — re-read
//   Decisions 1+2).
```

---

## Implementation Blueprint

### Data models and structure

NO new runtime data models. T2.S1 consumes the existing `HarnessRequest` / `HarnessExecutionOptions`
/ `HarnessHookEvents` (`src/types/harnesses.ts`) — structurally identical to the legacy
`ProviderRequest` / `ProviderExecutionOptions` / `ProviderHookEvents` they replace (type aliases).
The only structural addition is two optional fields on `PromptOverrides` (conditional) and the
harness-vocabulary method-local identifiers inside `executePrompt`.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify post-S1 baseline + green)
  - RUN: `git status --short` — note baseline (S1 may be partially/fully landed; this task assumes S1's field + import + identifier renames are present).
  - RUN: `grep -nE "this\.harnessId|this\.harnessOptions|HarnessRegistry|overrides\?\.provider|ProviderRequest|provider\.execute|providerHooks|providerRequest" src/core/agent.ts`
        → confirm executePrompt POST-S1 state: this.harnessId/harnessOptions + HarnessRegistry present (S1 done); overrides?.provider + ProviderRequest + provider.execute + providerHooks/providerRequest STILL present (S1 left the logic — T2.S1's job).
  - RUN: `grep -nE "^\s+(provider|harness|providerOptions|harnessOptions)\??:" src/types/agent.ts`
        → if `harness?:` is ABSENT on PromptOverrides, Task 3 runs; if PRESENT (P3.M2.T2.S1 landed), SKIP Task 3.
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before editing. If S1 is mid-flight (not yet landed), coordinate: T2.S1's edits assume S1's renames; if `this.harnessId` is absent, S1 hasn't landed — rebase/wait, then re-run pre-flight.

Task 1: MODIFY src/core/agent.ts — EXTEND the harnesses type import
  - FIND (S1 added this; verify present):
        import type { Harness, HarnessId, HarnessOptions } from '../types/harnesses.js';
  - CHANGE to:
        import type { Harness, HarnessId, HarnessOptions, HarnessRequest, HarnessHookEvents } from '../types/harnesses.js';
  - KEEP the providers.js import block (ProviderId, ProviderOptions, ProviderRequest, ProviderHookEvents, ToolExecutionRequest, ToolExecutionResult) — stream still uses ProviderRequest/ProviderHookEvents; executePrompt still uses ToolExecutionRequest/ToolExecutionResult.
  - VERIFY: `npm run lint` → 0 errors (imports resolve; isolatedModules-safe type-only imports).

Task 2: MODIFY src/core/agent.ts — REWIRE executePrompt() (the core of T2.S1)
  - In the resolution block (L588–612), REPLACE:
        // Extract prompt-level provider overrides
        const promptProvider = overrides?.provider;
        const promptProviderOptions = overrides?.providerOptions;

        // Resolve provider configuration with cascade: global → agent → prompt
        const globalConfig = getGlobalProviderConfig();
        const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(
          globalConfig,
          this.harnessId,
          this.harnessOptions,
          promptProvider,
          promptProviderOptions
        );

        // Get provider instance for resolved provider (may differ from this.harness)
        const registry = HarnessRegistry.getInstance();
        const providerInstance = registry.get(resolvedProvider);
        if (!providerInstance) {
          return createErrorResponse(
            'PROVIDER_NOT_FOUND',
            `Provider '${resolvedProvider}' is not registered`,
            { providerId: resolvedProvider },
            false
          ) as AgentResponse<T>;
        }

        // Capture non-null provider instance for use in closure (TypeScript strict mode requirement)
        const provider = providerInstance;
    WITH:
        // Extract prompt-level harness overrides (PRD §7.7, §7.9).
        // Backward-compat bridge: prefer the new `harness` field; fall back to the legacy `provider`
        // field so existing callers (`agent.prompt(p, { provider: 'opencode' })`) keep working during
        // the v1.2 migration. The fallback + legacy global-config singleton are removed once
        // PromptOverrides + the test suite are fully on harness vocabulary (later lockstep milestone).
        const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);
        const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;

        // Resolve the effective harness via the configuration cascade (PRD §7.7): global → agent → prompt.
        // resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368);
        // getGlobalProviderConfig is used as the global source to honour the legacy configureProviders()
        // singleton still consumed by stream() + the existing test suite.
        const globalConfig = getGlobalProviderConfig();
        const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(
          globalConfig,
          this.harnessId,
          this.harnessOptions,
          promptHarness,
          promptHarnessOptions
        );

        // Fetch the harness instance from HarnessRegistry (may differ from this.harness when a prompt
        // override is supplied). The cast bridges the legacy Provider return type to the Harness contract
        // — structurally identical at runtime; the cast exists only because Provider.id is wider than Harness.id.
        const registry = HarnessRegistry.getInstance();
        const harnessInstance = registry.get(resolvedHarness) as Harness | undefined;
        if (!harnessInstance) {
          return createErrorResponse(
            'PROVIDER_NOT_FOUND',
            `Harness '${resolvedHarness}' is not registered`,
            { harnessId: resolvedHarness },
            false
          ) as AgentResponse<T>;
        }

        // Capture non-null harness instance for use in closure (TypeScript strict mode requirement)
        const harness = harnessInstance;
  - In the hooks-map block (~L700–760): rename `const providerHooks: ProviderHookEvents = {};` →
        `const harnessHooks: HarnessHookEvents = {};` and the 4 if-block assignments
        (`providerHooks.onToolStart`→`harnessHooks.onToolStart`, `.onToolEnd`, `.onSessionStart`,
        `.onSessionEnd`). The WIRING inside each callback is byte-identical (no logic change).
  - In the request+execute block (~L762–790): REPLACE:
        // Build ProviderRequest with nested structure
        const providerRequest: ProviderRequest = {
          prompt: userMessage,
          options: {
            model: effectiveModel,
            systemPrompt: effectiveSystem,
            tools: effectiveTools,
            sessionId: resolvedProviderOptions.sessionId,
            hooks: providerHooks,
          },
        };

        // Execute via provider abstraction
        const providerResult = provider.execute<T>(
          providerRequest,
          this.toolExecutor.bind(this),
          providerHooks
        );
    WITH:
        // Build HarnessRequest with nested structure (PRD §7.3). Identical shape to the legacy
        // ProviderRequest — the swap is a type rename (ProviderRequest = HarnessRequest alias).
        const harnessRequest: HarnessRequest = {
          prompt: userMessage,
          options: {
            model: effectiveModel,
            systemPrompt: effectiveSystem,
            tools: effectiveTools,
            sessionId: resolvedHarnessOptions.sessionId,
            hooks: harnessHooks,
          },
        };

        // Execute via the Harness abstraction (PRD §7.3).
        // Harness returns: Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>>
        // For non-streaming mode, it returns Promise<AgentResponse<T>>.
        const harnessResult = harness.execute<T>(
          harnessRequest,
          this.toolExecutor.bind(this),
          harnessHooks
        );
  - In the union-return handling (~L792–815): rename `providerResult` → `harnessResult` (3–4 sites).
        KEEP the `Symbol.asyncIterator in harnessResult ? … : …` logic + the AsyncGenerator
        consume loop byte-identical. Update the inline comments "Provider returned …" → "Harness returned …".
  - In the catch block (~L867–877): REPLACE:
        return createErrorResponse(
          'PROVIDER_EXECUTION_FAILED',
          `Provider execution error: ${message}`,
          { duration, providerId: resolvedProvider },
          true
        ) as AgentResponse<T>;
    WITH:
        return createErrorResponse(
          'PROVIDER_EXECUTION_FAILED',
          `Harness execution error: ${message}`,
          { duration, harnessId: resolvedHarness },
          true
        ) as AgentResponse<T>;
  - LEAVE the cache hit/miss block, env setup/restore, agentPromptStart/agentPromptEnd events,
        structured-output validation (prompt.safeValidateResponse / createSuccessResponse /
        createErrorResponse VALIDATION_ERROR), and validateResponse byte-identical (apart from any
        `resolvedProvider`/`provider` references inside them — there are none; those blocks use
        `response`/`validatedResponse`/`finalResponse`).
  - VERIFY: `npm run lint` → 0 errors.
  - VERIFY (grep): `grep -nE "ProviderRequest|ProviderHookEvents|overrides\?\.provider|provider\.execute|providerRequest|providerHooks|providerInstance|providerResult" src/core/agent.ts`
        → hits ONLY inside stream() (L330–540), NONE inside executePrompt (L578–880).

Task 3: MODIFY src/types/agent.ts — ADD PromptOverrides.harness/harnessOptions (SKIP if pre-flight found `harness?:` on PromptOverrides)
  - VERIFY the harnesses type import exists at the top of types/agent.ts (S1's Task 2 added
        `import type { HarnessId, HarnessOptions } from './harnesses.js';` for AgentConfig). If
        ABSENT, add it.
  - ADD to PromptOverrides (after the `model?: string;` field, ~L200):
        /** Override harness for this prompt (PRD §7.7, §7.9). Highest priority in the harness cascade. */
        harness?: HarnessId;
        /** Override harness options for this prompt (PRD §7.7). Merged via last-write-wins. */
        harnessOptions?: HarnessOptions;
  - DO NOT touch AgentConfig (S1/P3.M2.T1.S1) and DO NOT remove provider/providerOptions (legacy, kept).
  - VERIFY: `npm run lint` → 0 errors.

Task 4: CREATE src/__tests__/unit/agent-prompt-harness-override.test.ts
  - MIRROR the structure of agent-prompt-provider-override.test.ts but in harness vocabulary.
  - IMPORTS:
        import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
        import { Agent } from '../../core/agent.js';
        import { Prompt } from '../../core/prompt.js';
        import { HarnessRegistry } from '../../harnesses/harness-registry.js';
        import { resetGlobalConfig } from '../../utils/provider-config.js';   // legacy singleton (executePrompt bridge)
        import type { Harness, HarnessId, HarnessCapabilities, HarnessRequest } from '../../types/harnesses.js';
        import type { ModelSpec } from '../../types/providers.js';
        import { z } from 'zod';
        import { createSuccessResponse, isError } from '../../types/agent.js';
  - HELPER:
        function createMockHarness(
          id: HarnessId,
          executeImpl?: (request: HarnessRequest) => Promise<any>
        ): Harness {
          const capabilities: HarnessCapabilities = {
            mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false,
          };
          const mockExecute = vi.fn();
          if (executeImpl) mockExecute.mockImplementation(executeImpl);
          else mockExecute.mockImplementation(async () => createSuccessResponse(
            { result: 'test response' }, { agentId: 'test-agent', timestamp: Date.now() }
          ));
          return {
            id, capabilities,
            initialize: vi.fn().mockResolvedValue(undefined),
            terminate: vi.fn().mockResolvedValue(undefined),
            execute: mockExecute,
            registerMCPs: vi.fn().mockResolvedValue([]),
            loadSkills: vi.fn().mockResolvedValue(undefined),
            normalizeModel: vi.fn((model: string): ModelSpec => ({ provider: 'anthropic', model, raw: model })),
            supports: vi.fn(() => true),
            requiresFeatures: vi.fn(() => true),
          };
        }
    (A Harness-typed object is structurally accepted by HarnessRegistry.register(provider: Provider).)
  - describe('Agent.prompt() harness override') with:
      beforeEach: resetGlobalConfig(); HarnessRegistry.getInstance().register(createMockHarness('pi'));
        HarnessRegistry.getInstance().register(createMockHarness('claude-code'));
      afterEach:  HarnessRegistry['_resetForTesting'](); resetGlobalConfig();
    Cases:
      1. 'resolves an explicit prompt-level harness override and calls harness.execute':
         new Agent(); agent.prompt(prompt, { harness: 'pi' }); → expect pi.execute called.
      2. 'uses the agent-level harness when no prompt override':
         new Agent({ harness: 'pi' }); agent.prompt(prompt); → expect pi.execute called.
      3. 'prompt harness override beats the agent harness':
         new Agent({ harness: 'pi' }); agent.prompt(prompt, { harness: 'claude-code' });
         → expect cc.execute called; pi.execute NOT called (vi.clearAllMocks before the call).
      4. 'falls back to the legacy provider override':
         register createMockHarness('anthropic' as HarnessId) too; new Agent();
         agent.prompt(prompt, { provider: 'anthropic' }); → expect anthropic.execute called.
      5. 'returns PROVIDER_NOT_FOUND for an unregistered harness':
         new Agent(); const r = await agent.prompt(prompt, { harness: 'claude-code' as HarnessId })
         AFTER unregistering cc (or in a bespoke beforeEach that registers only 'pi');
         → expect r.status === 'error'; isError(r) && r.error.code === 'PROVIDER_NOT_FOUND'
         && r.error.message.toContain('not registered') && r.error.message.toContain('claude-code')
         && r.error.recoverable === false.
      6. 'builds a HarnessRequest with the expected options shape':
         capture the request arg: (pi.execute as any).mockImplementation(async (req: HarnessRequest) => {
           captured = req; return createSuccessResponse(...); });
         agent.prompt(prompt, { harness: 'pi' }); → expect captured = { prompt: <string>,
         options: expect.objectContaining({ model, systemPrompt, tools, sessionId, hooks }) }.
      7. 'maps AgentHooks.preToolUse/postToolUse to HarnessHookEvents.onToolStart/onToolEnd':
         supply hooks: { preToolUse: [vi.fn()], postToolUse: [vi.fn()] }; make harness.execute invoke
         its received hooks.onToolStart({name,input}) + onToolEnd({name,input},{content,isError},5);
         → expect both AgentHooks fired with { toolName, toolInput, agentId, ... }.
         (Simplest: in the mock executeImpl, call `await hooks?.onToolStart?.({name:'t',input:{}})` etc.)
      8. 'preserves agent-response parity on success with structured output':
         schema = z.object({ result: z.string() }); cc.execute returns createSuccessResponse({result:'ok'},...);
         const r = await agent.prompt(prompt, { harness: 'claude-code' }); → r.status==='success' && r.data.result==='ok'.
      9. 'preserves agent-response parity on harness execution error':
         pi.execute throws new Error('boom'); const r = await agent.prompt(prompt, { harness: 'pi' });
         → r.status==='error' (code PROVIDER_EXECUTION_FAILED; message contains 'Harness execution error').
  - VERIFY: `npx vitest run src/__tests__/unit/agent-prompt-harness-override.test.ts` → all pass.
  - VERIFY (regression): `npx vitest run src/__tests__/unit/agent-prompt-provider-override.test.ts` → all pass UNCHANGED.

Task 5: VALIDATE (full suite + build + grep contracts)
  - RUN: `npm run lint`   → 0 errors.
  - RUN: `npm test`       → 0 failures (new harness-override test green AND the existing suite green
        via the bridge — if agent-prompt-provider-override/provider-switching/provider-agent/etc. go
        red, re-read Decisions 1+2: most likely overrides?.provider was read exclusively or
        getGlobalHarnessConfig was used).
  - RUN: `npm run build`  → 0 errors; dist emits.
  - RUN (grep contracts):
        echo "--- executePrompt (L578-880) must NOT contain provider-vocabulary logic ---"
        awk 'NR>=578 && NR<=880' src/core/agent.ts | grep -nE "ProviderRequest|ProviderHookEvents|overrides\?\.provider|provider\.execute|providerRequest|providerHooks|providerInstance|providerResult|resolvedProvider" || echo "CLEAN ✓"
        echo "--- executePrompt MUST contain harness vocabulary ---"
        awk 'NR>=578 && NR<=880' src/core/agent.ts | grep -nE "HarnessRequest|HarnessHookEvents|overrides\?\.harness|harness\.execute|harnessRequest|harnessHooks|harnessInstance|harnessResult|resolvedHarness"
        echo "--- stream() (T2.S2) STILL uses provider vocabulary (expected) ---"
        awk 'NR>=330 && NR<=540' src/core/agent.ts | grep -nE "ProviderRequest|provider\.execute" || echo "UNEXPECTED — stream() changed"
```

### Implementation Patterns & Key Details

```ts
// === Resolution block — src/core/agent.ts executePrompt (the core of T2.S1) ===
const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);   // Decision 2
const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;

const globalConfig = getGlobalProviderConfig();                                                // Decision 1 (bridge)
const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig( // Decision 6 (key=provider, name=resolvedHarness)
  globalConfig, this.harnessId, this.harnessOptions, promptHarness, promptHarnessOptions,
);

const registry = HarnessRegistry.getInstance();
const harnessInstance = registry.get(resolvedHarness) as Harness | undefined;                  // Decision 3 (cast)
if (!harnessInstance) {
  return createErrorResponse(                                                                  // Decision 4 (KEEP code)
    'PROVIDER_NOT_FOUND',
    `Harness '${resolvedHarness}' is not registered`,
    { harnessId: resolvedHarness },
    false,
  ) as AgentResponse<T>;
}
const harness = harnessInstance;

// === Hooks map (retyped; wiring identical) ===
const harnessHooks: HarnessHookEvents = {};
if (effectiveHooks.preToolUse?.length) {
  harnessHooks.onToolStart = async (tool: ToolExecutionRequest) => {
    for (const hook of effectiveHooks.preToolUse!) {
      await hook({ toolName: tool.name, toolInput: tool.input as Record<string, unknown>, agentId: this.id });
    }
  };
}
// … onToolEnd / onSessionStart / onSessionEnd identical wiring, just on `harnessHooks` …

// === Request + execute ===
const harnessRequest: HarnessRequest = {
  prompt: userMessage,
  options: {
    model: effectiveModel,
    systemPrompt: effectiveSystem,
    tools: effectiveTools,
    sessionId: resolvedHarnessOptions.sessionId,
    hooks: harnessHooks,
  },
};
const harnessResult = harness.execute<T>(
  harnessRequest,
  this.toolExecutor.bind(this),
  harnessHooks,
);

// === Union-return handling (rename only; logic identical) ===
const response: AgentResponse<T> = Symbol.asyncIterator in harnessResult
  ? (await (async () => {
      const generator = harnessResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
      for await (const _event of generator) { /* discard */ }
      const finalResult = await generator.next();
      return finalResult.value as AgentResponse<T>;
    })())
  : await (harnessResult as Promise<AgentResponse<T>>);

// === Catch (KEEP code; reword message + details key) ===
return createErrorResponse(
  'PROVIDER_EXECUTION_FAILED',
  `Harness execution error: ${message}`,
  { duration, harnessId: resolvedHarness },
  true,
) as AgentResponse<T>;

// === Test helper — createMockHarness (Harness-typed, accepted by HarnessRegistry.register) ===
function createMockHarness(id: HarnessId, executeImpl?: (r: HarnessRequest) => Promise<any>): Harness {
  return {
    id,
    capabilities: { mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false },
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: executeImpl ? vi.fn(executeImpl) : vi.fn(async () => createSuccessResponse({ result: 'ok' }, { agentId: 't', timestamp: Date.now() })),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((m: string): ModelSpec => ({ provider: 'anthropic', model: m, raw: m })),
    supports: vi.fn(() => true),
    requiresFeatures: vi.fn(() => true),
  };
}
```

### Integration Points

```yaml
REGISTRY:
  - consumer: "src/core/agent.ts executePrompt (rewired)"
  - api: "HarnessRegistry.getInstance().get(resolvedHarness) as Harness | undefined — returns the registered Harness stub"
  - note: "S1 already renamed the identifier in executePrompt; T2.S1 adds the cast + the harness-vocabulary locals"

CONFIG CASCADE:
  - consumer: "src/core/agent.ts executePrompt"
  - api: "resolveProviderConfig(getGlobalProviderConfig(), this.harnessId, this.harnessOptions, promptHarness, promptHarnessOptions) — delegates to resolveHarnessConfig"
  - note: "legacy global singleton used deliberately (Decision 1); the global-singleton migration is deferred"

PROMPTOVERRIDES:
  - add to: "src/types/agent.ts PromptOverrides (conditional on pre-flight grep)"
  - fields: "harness?: HarnessId; harnessOptions?: HarnessOptions;"
  - note: "AgentConfig.harness is owned by S1/P3.M2.T1.S1 (not T2.S1)"

HARNESS EXECUTE:
  - consumer: "src/core/agent.ts executePrompt"
  - api: "harness.execute<T>(HarnessRequest, toolExecutor, HarnessHookEvents) → Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>>"
  - note: "identical signature to the legacy provider.execute — the union-return handling is unchanged"

NO DATABASE / NO ROUTES / NO NEW DEPENDENCIES.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after editing src/core/agent.ts + src/types/agent.ts
npm run lint            # tsc --noEmit on src/ (excludes src/__tests__)
# Expected: Zero errors. If errors:
#   - "Property 'harness' does not exist on PromptOverrides" → run Task 3 (add the fields).
#   - "Property 'providerRequest' does not exist" or "'providerHooks' does not exist" → a rename was missed in executePrompt.
#   - "Type 'Provider' is not assignable to type 'Harness'" → missing the `as Harness | undefined` cast (Decision 3).
#   - "Property 'resolvedProvider' does not exist" → a catch-block or comment still references the old local name.
```

### Level 2: Unit Tests (Component Validation)

```bash
# The new harness-vocabulary test
npx vitest run src/__tests__/unit/agent-prompt-harness-override.test.ts -v
# Expected: all 9 cases pass (incl. PROVIDER_NOT_FOUND + HarnessRequest shape + hook wiring + parity).

# The legacy-fallback regression (MUST stay green UNCHANGED — proves the bridge)
npx vitest run src/__tests__/unit/agent-prompt-provider-override.test.ts -v
# Expected: all pass unchanged. If red → the bridge was implemented wrong (re-read Decisions 1+2;
#   most likely overrides?.provider was read exclusively without the ?? fallback).

# The rest of the Agent-constructing suite (bridge keeps them green with ZERO edits)
npx vitest run src/__tests__/unit/agent-stream-provider-override.test.ts -v
npx vitest run src/__tests__/unit/agent-tool-executor.test.ts -v
npx vitest run src/__tests__/unit/agent.test.ts -v
npx vitest run src/__tests__/integration/provider-switching.test.ts -v
npx vitest run src/__tests__/integration/provider-agent.test.ts -v
npx vitest run src/__tests__/unit/workflow-validation.test.ts -v
# Expected: all pass unchanged.
```

### Level 3: Integration Testing (System Validation)

```bash
# Full suite — the green-suite guarantee is the primary T2.S1 gate
npm test
# Expected: 0 failures. This is the proof the bridge + field fallback preserved behaviour across
# all Agent-prompting test files while the NEW harness-override file exercises the harness path.

# Build — proves dist emits with the harness-vocabulary executePrompt
npm run build
# Expected: exit 0.
```

### Level 4: Contract & Runtime Validation

```bash
# Grep contracts (must all hold)
echo "--- executePrompt (L578-880) must NOT contain provider-vocabulary logic ---"
awk 'NR>=578 && NR<=880' src/core/agent.ts | grep -nE "ProviderRequest|ProviderHookEvents|overrides\?\.provider|provider\.execute|providerRequest|providerHooks|providerInstance|providerResult|resolvedProvider" || echo "CLEAN ✓"
echo "--- executePrompt MUST contain harness vocabulary ---"
awk 'NR>=578 && NR<=880' src/core/agent.ts | grep -nE "HarnessRequest|HarnessHookEvents|overrides\?\.harness|harness\.execute|harnessRequest|harnessHooks|harnessInstance|harnessResult|resolvedHarness"
echo "--- stream() (T2.S2) STILL uses provider vocabulary (expected; proves T2.S1 did NOT creep into stream) ---"
awk 'NR>=330 && NR<=540' src/core/agent.ts | grep -nE "ProviderRequest|provider\.execute" || echo "UNEXPECTED — stream() changed (T2.S2 territory)"

# Runtime spot-check is covered by the 9 'Agent.prompt() harness override' vitest cases (Task 4):
#   - explicit harness resolves + calls harness.execute; agent-level harness used; prompt beats agent;
#     legacy provider fallback; PROVIDER_NOT_FOUND for unregistered; HarnessRequest shape; hook wiring;
#     parity on success + on execution error.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (agent.ts + types/agent.ts type-check; cast resolves; imports resolve;
      HarnessRequest/HarnessHookEvents type-only imports; PromptOverrides.harness field).
- [ ] `npm test` exits 0 — new `agent-prompt-harness-override.test.ts` green AND the existing suite
      green (unchanged — the bridge + fallback preserve behaviour).
- [ ] `npm run build` exits 0.
- [ ] grep: no `ProviderRequest`/`ProviderHookEvents`/`overrides?.provider`/`provider.execute`/
      `providerRequest`/`providerHooks`/`providerInstance`/`providerResult`/`resolvedProvider` in
      executePrompt (L578–880); they remain only in stream() (L330–540).

### Feature Validation

- [ ] `executePrompt` reads `overrides?.harness ?? overrides?.provider` +
      `overrides?.harnessOptions ?? overrides?.providerOptions`.
- [ ] `executePrompt` resolves via `resolveProviderConfig(getGlobalProviderConfig(), …)` (delegates
      to `resolveHarnessConfig`).
- [ ] `executePrompt` fetches `HarnessRegistry.getInstance().get(resolvedHarness) as Harness |
      undefined` and returns `PROVIDER_NOT_FOUND` (code kept) when missing.
- [ ] `executePrompt` builds a `HarnessRequest` and calls `harness.execute<T>(harnessRequest,
      toolExecutor, harnessHooks)`.
- [ ] `AgentHooks`→`HarnessHookEvents` mapping is retyped (identical wiring).
- [ ] Cache hit/miss, env setup/restore, `agentPromptStart`/`agentPromptEnd` events, structured-
      output validation, `createSuccessResponse`/`createErrorResponse` paths unchanged.
- [ ] `new Agent().prompt(prompt, { harness: 'pi' })` calls `pi.execute` with a `HarnessRequest`;
      `agent.prompt(prompt, { provider: 'anthropic' })` (legacy) resolves the anthropic stub;
      `agent.prompt(prompt, { harness: 'claude-code' })` with no stub returns `PROVIDER_NOT_FOUND`.
- [ ] Error codes `PROVIDER_NOT_FOUND` + `PROVIDER_EXECUTION_FAILED` preserved (messages reworded).

### Code Quality Validation

- [ ] Follows existing agent.ts conventions (local `const` naming, inline comments, error style).
- [ ] Type-only imports use `import type` (isolatedModules).
- [ ] The harnesses type import is EXTENDED (not duplicated) with `HarnessRequest`/`HarnessHookEvents`.
- [ ] The backward-compat bridge + cast + fallback are documented inline (point to the later
      lockstep migration for removal).
- [ ] No scope creep into stream() logic, the cache-key build-site, the constructor, AgentConfig,
      agent.test.ts, or src/index.ts.

### Documentation & Deployment

- [ ] executePrompt comments explain the bridge + the field fallback + the later migration target.
- [ ] No new environment variables, dependencies, or config files.

---

## Anti-Patterns to Avoid

- ❌ Don't switch executePrompt to `getGlobalHarnessConfig`/`resolveHarnessConfig`/`configureHarnesses`
  directly — it breaks ~7 test files that use `configureProviders`. Use the legacy-wrapper bridge
  (Decision 1); the lockstep migration is deferred.
- ❌ Don't read `overrides?.harness` EXCLUSIVELY (dropping the `?? overrides?.provider` fallback) —
  it breaks `agent-prompt-provider-override.test.ts` and every legacy `{provider:…}` caller. Use
  the fallback (Decision 2).
- ❌ Don't rename the error codes `PROVIDER_NOT_FOUND`/`PROVIDER_EXECUTION_FAILED` to `HARNESS_*` —
  they are asserted by tests and are part of the public `AgentResponse` error contract (PRD §6.2).
  Keep the codes; reword only the messages (Decision 4).
- ❌ Don't skip the `as Harness | undefined` cast on `registry.get(...)` — `Provider` is not
  assignable to `Harness` (id-type width); `tsc` will error (Decision 3).
- ❌ Don't touch `stream()` (L330–540) — it is T2.S2's scope; it legitimately still uses
  `ProviderRequest`/`provider.execute` until S2 lands.
- ❌ Don't touch the `CacheKeyInputs` build-site — it is T2.S3's scope (threading harness+provider
  into the key).
- ❌ Don't edit `agent-prompt-provider-override.test.ts` — leave it green as legacy-fallback
  regression; put new harness coverage in a NEW file (Decision 8).
- ❌ Don't remove the legacy `provider`/`providerOptions` fields from `PromptOverrides` — they are
  kept for the fallback + `stream()` + existing tests.
- ❌ Don't change the `resolveProviderConfig` destructure KEY to `harness` — `resolveProviderConfig`
  returns `{ provider, options }` (legacy keys). The KEY stays `provider`; only the LOCAL NAME
  becomes `resolvedHarness` (Decision 6).

---

## Confidence Score

**9/10** for one-pass implementation success. The change is mechanically a method-local rename +
type swap inside one method (`executePrompt`), proven type-safe by the `ProviderRequest =
HarnessRequest` / `ProviderHookEvents = HarnessHookEvents` alias identities and the identical
`Harness.execute` signature. The four load-bearing decisions — keep the legacy global bridge
(Decision 1), the `overrides?.harness ?? overrides?.provider` field fallback (Decision 2), the
`Provider`→`Harness` cast (Decision 3), and keeping the error codes (Decision 4) — are all **proven**
by the existing test assertions (the bridge delegates to `resolveHarnessConfig`; the fallback keeps
`{provider:'opencode'}` callers green; the cast bridges only the id-type width; `PROVIDER_NOT_FOUND`
is asserted). The only residual risk is the conditional `PromptOverrides` edit colliding with a
concurrent P3.M2.T2.S1, fully mitigated by the pre-flight grep (Task 0) + conditional Task 3; and
the parallel-S1 dependency (T2.S1 assumes S1's field/import/identifier renames landed), mitigated by
Task 0's baseline gate.
