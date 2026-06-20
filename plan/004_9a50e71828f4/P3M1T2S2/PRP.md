# PRP — P3.M1.T2.S2: `stream()` — harness resolution + streaming `HarnessRequest`

**PRD reference:** §7.3 (`Harness.execute<T>` returning
`Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`), §7.4
(capabilities `streaming: true`), §7.7 (Configuration Cascade), §7.9 (`AgentConfig`),
§7.10 (Tool Execution), §7.11 (Hook Adaptation — `AgentHooks`→`HarnessHookEvents`), §7.14 (Feature
Parity — identical streaming across harnesses). **Plan:** `plan/004_9a50e71828f4/` — S2 of P3.M1.T2
("Agent executePrompt + stream + cache key rewire"). **Consumes** the Agent fields from the
parallel **P3.M1.T1.S1** (`this.harness: Harness`, `this.harnessId?: HarnessId`, `this.harnessOptions?:
HarnessOptions`, the `HarnessRegistry` import) AND assumes the parallel **P3.M1.T2.S1**
`executePrompt()` rewire has landed — in particular the harnesses type-import extension
`import type { …, HarnessRequest, HarnessHookEvents } from '../types/harnesses.js';` and (conditionally)
`PromptOverrides.harness?`/`harnessOptions?` (see `../P3M1T2S1/PRP.md`). **Unblocks** P4.M2.T1.S1
(cross-harness streaming parity tests). **Scope tag:** (a) in `stream()` **REPLACE**
`overrides?.provider`/`overrides?.providerOptions` reads with harness-vocabulary reads **+ legacy
fallback**; (b) **RENAME** all method-local identifiers to harness vocabulary; (c) **BUILD**
`HarnessRequest` (typed, with `streaming: true`) instead of `ProviderRequest`; (d) **CALL**
`harness.execute<T>(...)` from the `HarnessRegistry`-resolved instance (cast `as Harness | undefined`);
(e) **MAP** `AgentHooks`→`HarnessHookEvents` (identical mapping, retyped); (f) **PRESERVE VERBATIM**
the `streamGenerator` async-generator + `AbortController` + cancellation logic + `Symbol.asyncIterator`
branching + `.next()` final-value pull; (g) **UPDATE** the 2 regex assertions in the legacy stream
test; (h) **ADD** a new `agent-stream-harness-override.test.ts` mocking harness streaming. **The
throw-on-missing-harness location (top of `stream()`, synchronous at call time), the
`streaming: true` flag, the cancellation/STREAM_ERROR paths are PRESERVED.**

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** S2 mirrors S1's executePrompt rewire for the
> streaming path. The same four load-bearing decisions apply — keep the legacy global-config bridge
> (`resolveProviderConfig`/`getGlobalProviderConfig`), the field fallback
> (`overrides?.harness ?? overrides?.provider`), the `Provider`→`Harness` cast, and keeping the error
> code (`STREAM_ERROR`) — plus **three stream-specific quirks** (§Scope Decisions 4–6): `stream()`
> THROWS on a missing harness (it does not return an error response), the throw happens at the TOP of
> the method (synchronous at call time, before the generator is created — the existing test wraps the
> call in an async fn + `.rejects.toThrow(…)`), and the `streamGenerator`/`AbortController`/cancellation
> logic is preserved byte-for-byte apart from local-name renames.

---

## Goal

**Feature Goal:** Make `Agent.stream()` run the streaming prompt through the **`Harness`
abstraction**: read the per-call harness override from `PromptOverrides.harness` (with a legacy
`provider` fallback), resolve it through the PRD §7.7 cascade, fetch the harness from
`HarnessRegistry`, build a `HarnessRequest` with `streaming: true`, and call `harness.execute<T>(...)`.
The `AgentHooks`→hook-events mapping is retyped to `HarnessHookEvents`. After S2, the streaming path
is harness-vocabulary internally while remaining **streaming parity** with today (identical
`AsyncStream<T>` shape, identical `StreamEvent` flow, identical cancellation/error semantics — PRD
§7.14 point 4: identical behaviour across harnesses).

**Deliverable:**
1. **MODIFY `src/core/agent.ts`** — in `stream()` swap the two `overrides?.provider*` reads to the
   harness-vocabulary + fallback form; rename all method-local identifiers to harness vocabulary
   (`promptHarness`, `resolvedHarness`, `harnessInstance`, `harness`, `harnessHooks`, `harnessRequest`,
   `harnessResult`, `harnessStream`); build `HarnessRequest` (KEEP `streaming: true`); call
   `harness.execute<T>`; retype the hooks map to `HarnessHookEvents`; reword the throw message to
   harness vocabulary (`Harness '${resolvedHarness}' is not registered`); **PRESERVE** the throw
   location, the generator, the `AbortController`, the cancellation branch, the `Symbol.asyncIterator`
   branching, the `.next()` final-value pull, and the `STREAM_ERROR` catch (byte-identical apart from
   the renames).
2. **MODIFY `src/types/agent.ts`** — add `harness?: HarnessId` + `harnessOptions?: HarnessOptions` to
   `PromptOverrides` (CONDITIONAL — only if a pre-flight grep shows them absent; T2.S1 / P3.M2.T2.S1
   may add them first — idempotent).
3. **MODIFY `src/__tests__/unit/agent-stream-provider-override.test.ts`** — update the 2
   `.rejects.toThrow(/Provider 'opencode' is not registered/)` regex assertions to the
   `/Harness 'opencode' is not registered/` form (surgical 2-line edit for the reworded throw;
   every other assertion stays green via the bridge + fallback).
4. **CREATE `src/__tests__/unit/agent-stream-harness-override.test.ts`** — `createMockHarness` (whose
   `execute` defaults to an `async function*` streaming generator) + `HarnessRegistry` setup + a
   `describe('Agent.stream() harness override')` block covering explicit-harness, agent-level
   harness, prompt-beats-agent, legacy-provider fallback, unregistered-harness THROW,
   `HarnessRequest` shape (incl. `streaming: true`), `AgentHooks`→`HarnessHookEvents` wiring,
   streaming events flow, and parity on success + on `STREAM_ERROR`.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit` on `src/`, **excludes `src/__tests__`**) exits 0 — the
   `HarnessRequest`/`HarnessHookEvents` imports (assumed added by S1; S2 adds them if absent), the
   `as Harness | undefined` cast, the `harness.execute<T>` call, and the `PromptOverrides.harness`
   field all type-check.
2. `npm test` (`vitest run`) exits 0 — the NEW `agent-stream-harness-override.test.ts` passes, the
   legacy `agent-stream-provider-override.test.ts` passes **with only the 2 regex assertions updated**,
   AND **the entire existing suite stays green** (the bridge + field fallback preserve legacy
   `{provider:'opencode'}` / `{provider:'anthropic'}` streaming behaviour).
3. `npm run build` (`tsc`) exits 0 — `dist/core/agent.js` + `dist/types/agent.js` emit reflect the
   harness-vocabulary `stream`.
4. Runtime spot-check (vitest): `agent.stream(prompt, { harness: 'pi' })` with a `'pi'` streaming stub
   registered calls `pi.execute` with a `HarnessRequest` whose `options.streaming === true` and yields
   `StreamEvent`s + returns the final `AgentResponse`; `agent.stream(prompt, { provider: 'anthropic' })`
   (legacy) resolves the anthropic stub and streams; `agent.stream(prompt, { harness: 'claude-code' })`
   with no `'claude-code'` stub **THROWS** `Harness 'claude-code' is not registered` (synchronously at
   call time).
5. Contract (grep): `HarnessRequest`, `HarnessHookEvents`, `harness.execute`, `streaming: true`,
   `overrides?.harness`, `resolvedHarness`, `streamGenerator`, `AbortController`, `Symbol.asyncIterator`
   present in `stream()`; `ProviderRequest`/`ProviderHookEvents`/`overrides?.provider`/`provider.execute`/
   `providerRequest`/`providerHooks`/`providerStream` **absent** from `stream()` (and now absent from
   `executePrompt` too, post-S1).

---

## ⚠️ SCOPE DECISIONS — the load-bearing details

### Decision 1 — KEEP the legacy global-config bridge (`resolveProviderConfig` / `getGlobalProviderConfig`)

Identical to S1 Decision 1. `stream()` today reads the global source via `getGlobalProviderConfig()`
and resolves via `resolveProviderConfig(...)`. `src/utils/harness-config.ts` L367–368 **proves**
`resolveProviderConfig` DELEGATES to `resolveHarnessConfig`, so the canonical harness cascade already
runs through the bridge. Switching to `getGlobalHarnessConfig` (default `'pi'`) breaks the legacy
stream test ("should use global default provider when agent has no provider": `new Agent()` +
`agent.stream(prompt)` with no override → cascade resolves to the global default; legacy singleton +
`configureProviders({defaultProvider:'anthropic'})` ⇒ `'anthropic'` stub registered ✓; harness singleton
⇒ `'pi'` (no stub) ⇒ **THROWS** ✗). **KEEP** `resolveProviderConfig(getGlobalProviderConfig(), …)`.
The global-singleton + test-vocabulary migration is deferred (P3.M2.T2.S1 / P4 cleanup). (Mirrors S1.)

### Decision 2 — Field fallback: `overrides?.harness ?? overrides?.provider`

Identical to S1 Decision 2. Read harness as the **primary**, with the legacy `provider` as a
**fallback** so every existing caller/test (`agent.stream(prompt, { provider: 'opencode' })`) keeps
working during the v1.2 migration:

```ts
const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);
const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;
```

The `as HarnessId` cast is runtime-safe (`resolveProviderConfig`→`resolveHarnessConfig` treats the id
as an opaque string key; `HarnessRegistry.get` does a raw `Map.get`). Mirrors the cast S1 used in
`executePrompt` + the constructor + inside `resolveProviderConfig` itself. (Mirrors S1.)

### Decision 3 — `HarnessRegistry.get(...)` returns `Provider`; cast to `Harness` (runtime-safe)

Identical to S1 Decision 3. `HarnessRegistry.get(id: ProviderId): Provider | undefined` returns the
legacy `Provider` type (NOT assignable to `Harness` — `Provider.id` is wider). So:

```ts
const harnessInstance = registry.get(resolvedHarness) as Harness | undefined;
```

Runtime-safe: `Provider` and `Harness` are structurally identical (identical method surface); every
`Provider*` parameter type is a `@deprecated` alias for the matching `Harness*` type (research §2).
The cast bridges only the id-type width gap. The missing-harness check runs on the cast value, so a
genuinely-missing harness still hits the throw. (Mirrors S1.)

### Decision 4 — `stream()` THROWS on a missing harness (NOT a returned error response) — PRESERVE the throw location

**This is the core difference from S1.** `executePrompt` RETURNS a `PROVIDER_NOT_FOUND`
`AgentResponse` on a missing harness; `stream()` **THROWS** `new Error(...)` and the throw is at the
**TOP of `stream()` (L377–381)** — synchronous at call time, **BEFORE** the `streamGenerator` is even
created. The existing legacy test (`agent-stream-provider-override.test.ts`) wraps the call in an
async fn and asserts `.rejects.toThrow(/... is not registered/)`; if the throw moved inside the
generator, the `.rejects.toThrow()` shape would break (the generator would instead yield an error
event). **PRESERVE the throw location** (top of `stream()`, outside the generator):

```ts
const harnessInstance = registry.get(resolvedHarness) as Harness | undefined;
if (!harnessInstance) {
  throw new Error(`Harness '${resolvedHarness}' is not registered`);   // ← reworded; SAME location
}
const harness = harnessInstance;
```

The `streamGenerator`'s own `try/catch` is for **execution errors** (the harness throws while
streaming) → yields a `{type:'error', code:'STREAM_ERROR'}` event + returns a `STREAM_ERROR`
`AgentResponse`. That catch is a **separate concern** from the missing-harness throw and is preserved
verbatim (Decision 6).

### Decision 4b — Reword the throw message AND update the 2 legacy-test regex assertions

The legacy stream test asserts (2 sites) `.rejects.toThrow(/Provider 'opencode' is not registered/)`.
Rewording the throw to `Harness '${resolvedHarness}' is not registered` (vocabulary consistency with
S1's executePrompt + the contract's "same rewire as S1") **breaks** that regex. **Resolution:**
reword the throw AND **UPDATE the 2 regex assertions** in `agent-stream-provider-override.test.ts`
from `/Provider 'opencode' is not registered/` to `/Harness 'opencode' is not registered/`. This is a
surgical 2-line edit (not a rewrite); every other assertion in that file stays green via the bridge +
fallback (Decision 1 + Decision 2). Pre-flight guard:
`grep -n "is not registered" src/__tests__/unit/agent-stream-provider-override.test.ts` → expect
exactly 2 hits, both the regex form. (S1 did not need this edit because its legacy prompt test used
`.toContain('not registered')` which is reword-safe; the stream test is stricter.)

### Decision 5 — Rename method-local identifiers to harness vocabulary (the actual logic swap)

This is the substance of T2.S2. Inside `stream()` ONLY:

| Before | After (T2.S2) |
|---|---|
| `const promptProvider = overrides?.provider;` | `const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId \| undefined);` |
| `const promptProviderOptions = overrides?.providerOptions;` | `const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;` |
| `const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(...)` (args `…, promptProvider, promptProviderOptions`) | `const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(...)` (args `…, promptHarness, promptHarnessOptions`) |
| `const providerInstance = registry.get(resolvedProvider);` | `const harnessInstance = registry.get(resolvedHarness) as Harness \| undefined;` |
| `throw new Error(`Provider '${resolvedProvider}' is not registered`);` | `throw new Error(`Harness '${resolvedHarness}' is not registered`);` |
| `const provider = providerInstance;` | `const harness = harnessInstance;` |
| `const providerHooks: ProviderHookEvents = {};` (+ the 4 if-blocks) | `const harnessHooks: HarnessHookEvents = {};` (+ the 4 if-blocks: `providerHooks.onToolStart`→`harnessHooks.onToolStart`, etc. — WIRING byte-identical) |
| `const providerRequest: ProviderRequest = { … options: { …, sessionId: resolvedProviderOptions.sessionId, hooks: providerHooks, streaming: true } };` | `const harnessRequest: HarnessRequest = { … options: { …, sessionId: resolvedHarnessOptions.sessionId, hooks: harnessHooks, streaming: true } };` (**KEEP `streaming: true`**) |
| `const providerResult = provider.execute<T>(providerRequest, self.toolExecutor.bind(self), providerHooks);` | `const harnessResult = harness.execute<T>(harnessRequest, self.toolExecutor.bind(self), harnessHooks);` |
| `if (Symbol.asyncIterator in providerResult) {` | `if (Symbol.asyncIterator in harnessResult) {` |
| `const providerStream = providerResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;` | `const harnessStream = harnessResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;` |
| `for await (const event of providerStream) { … }` | `for await (const event of harnessStream) { … }` |
| `const finalResult = await providerStream.next();` | `const finalResult = await harnessStream.next();` |
| `const responsePromise = providerResult as Promise<AgentResponse<T>>;` (else branch) | `const responsePromise = harnessResult as Promise<AgentResponse<T>>;` |

**KEEP** `const self = this;` + `streamGenerator.call(this)` + `const controller = new AbortController();`
+ the `return { stream: streamGenerator.call(this), controller };` shape — these are not
provider-vocabulary. The `controller.signal.aborted` cancellation branch, the `CANCELLED` event +
`createErrorResponse('CANCELLED', …)` return, and the `STREAM_ERROR` catch (`yield {type:'error', …,
code:'STREAM_ERROR'}; return createErrorResponse('STREAM_ERROR', …)`) are **byte-identical** apart
from the local renames. (Mirrors S1 Decision 5.)

### Decision 6 — The `resolveProviderConfig` destructure key stays `provider` (bridge contract)

Identical to S1 Decision 6. Because we KEEP `resolveProviderConfig` (Decision 1), its return shape is
`{ provider, options }` (legacy keys — it wraps `resolveHarnessConfig`'s `{ harness, options }`). So
the destructure MUST read `{ provider: resolvedHarness, options: resolvedHarnessOptions }` — the
**key** is `provider` (the legacy return field) but the **local name** is `resolvedHarness`.

### Decision 7 — Conditionally ADD `harness`/`harnessOptions` to `PromptOverrides` (idempotent with S1)

Identical to S1 Decision 7. `overrides.harness` is a `tsc` error today unless T2.S1 / P3.M2.T2.S1 has
added it. **Resolution:** S2 does a pre-flight grep
`grep -nE '^\s+(provider|harness|providerOptions|harnessOptions)\??:' src/types/agent.ts`. If
`harness?:` is ABSENT on `PromptOverrides`, S2 adds it (after the existing `model?: string;` field,
inside `PromptOverrides`). If PRESENT (S1 or P3.M2.T2.S1 landed first), SKIP — idempotent. Add
`import type { HarnessId, HarnessOptions } from './harnesses.js';` at the top of `src/types/agent.ts`
**only if absent** (S1's Task 2 / the AgentConfig work likely added it — verify). **Do NOT remove**
`provider`/`providerOptions` (legacy, kept for the fallback + existing tests).

### Decision 8 — New test FILE + minimal update to the legacy stream test

S2 **CREATES** a NEW `src/__tests__/unit/agent-stream-harness-override.test.ts` that visibly exercises
the NEW `{harness}` streaming path + `harness.execute` streaming mock + `HarnessRequest` shape (incl.
`streaming: true`) + `AgentHooks`→`HarnessHookEvents` wiring + parity. S2 **UPDATES** the existing
`agent-stream-provider-override.test.ts` ONLY at the 2 `.rejects.toThrow(/… is not registered/)`
regex sites (Decision 4b); everything else in that file is left green as legacy-fallback regression
coverage. The new file uses a per-file `createMockHarness` helper (the repo convention — each agent
test file declares its own mock factory). (Adapts S1 Decision 8 for streaming; adds the 2-line legacy
edit per Decision 4b.)

### Decision 9 — Import assumptions (idempotent with S1)

S2 ASSUMES S1 extended the harnesses type import to
`import type { Harness, HarnessId, HarnessOptions, HarnessRequest, HarnessHookEvents } from '../types/harnesses.js';`
(S1's Task 1, for executePrompt). **Pre-flight grep:** if `HarnessRequest, HarnessHookEvents` are
ABSENT from that import line, S2 adds them. **KEEP** the providers.js import block (S1 left it;
`ProviderRequest`/`ProviderHookEvents` become unused in `agent.ts` after S1+S2 but `tsconfig.json`
has NO `noUnusedLocals`, so unused type imports do NOT break `tsc --noEmit`; removal deferred to P4
cleanup). **KEEP** `import type { AsyncStream, StreamEvent } from '../types/streaming.js';` unchanged
(stream's return type + generator yield/return types).

---

## User Persona

**Target User:** Groundswell core maintainers + the T2.S3 implementer + downstream `Agent` consumers
who stream.
- **T2.S3 (cache key)** — needs the streaming path off provider vocabulary so the cache-key threading
  is uniform; S2 completes the Agent-method rewire (executePrompt in S1, stream in S2).
- **P4.M2.T1.S1 (parity tests)** — needs `stream()` running through `Harness.execute` so the
  cross-harness streaming-parity suite can assert identical `StreamEvent` flow on `pi` vs
  `claude-code` (PRD §7.14).
- **Agent consumers** — `agent.stream(prompt, { harness: 'pi', model: 'anthropic/claude-sonnet-4' })`
  (PRD §7.13) now streams through the Harness abstraction; legacy
  `agent.stream(prompt, { provider: 'anthropic' })` callers keep working via the fallback.

**Use Case:** A workflow constructs `new Agent({ harness: 'pi', model: 'anthropic/claude-sonnet-4' })`
and calls `agent.stream(prompt)`. `stream` reads no prompt override, resolves the cascade (agent
harness `'pi'` wins), fetches `HarnessRegistry.get('pi')`, builds a `HarnessRequest` with
`streaming: true`, and calls `pi.execute<T>(request, toolExecutor, harnessHooks)` which returns an
`AsyncGenerator<StreamEvent, AgentResponse<T>>`; `streamGenerator` iterates it, yielding each event
(with cancellation checks) and pulling the final `AgentResponse<T>` via `.next()`. A second call
`agent.stream(prompt, { harness: 'claude-code' })` overrides per-call. A legacy call
`agent.stream(prompt, { provider: 'opencode' })` falls back through `overrides?.provider`.

**Pain Points Addressed:** Today `stream` builds a `ProviderRequest` and calls `provider.execute` —
provider vocabulary, blocking the §7 harness/provider split at the streaming site. S2 makes the
streaming path harness-native while preserving every external behaviour (`AsyncStream<T>` shape,
`StreamEvent` flow, cancellation, error events) — completing the Agent-method rewire that S1 began.

---

## Why

- **Realises PRD §7.3 + §7.4** — `stream` calls `Harness.execute<T>(HarnessRequest, toolExecutor,
  HarnessHookEvents)` with `streaming: true`, consuming the `AsyncGenerator<StreamEvent, …>` return.
- **Realises PRD §7.7 + §7.9** — per-call harness resolution honours the cascade (global → agent →
  prompt) and reads `PromptOverrides.harness`.
- **Realises PRD §7.11** — `AgentHooks`→`HarnessHookEvents` mapping at the streaming execution site.
- **Realises PRD §7.14** — streaming parity across harnesses (point 4: identical behaviour; the
  `Harness.execute` streaming contract is the single source of truth).
- **Completes P3.M1.T2's Agent rewire** — executePrompt (S1) + stream (S2) are both harness-native,
  leaving only the cache-key threading (S3).
- **Keeps the migration safe** — the bridge + fallback mean S2 lands green without forcing a
  simultaneous rewrite of the legacy stream test (only the 2 regex assertions move).

---

## What

1. **MODIFY `src/core/agent.ts`** — in `stream()` swap the two override reads + rename all
   method-locals to harness vocabulary + build `HarnessRequest` (KEEP `streaming: true`) + call
   `harness.execute<T>` + retype the hooks map + reword the throw message (KEEP throw location) +
   PRESERVE the generator/controller/cancellation/`STREAM_ERROR` logic.
2. **MODIFY `src/types/agent.ts`** — conditionally add `harness?`/`harnessOptions?` to `PromptOverrides`.
3. **MODIFY `src/__tests__/unit/agent-stream-provider-override.test.ts`** — update the 2
   `is not registered` regex assertions (`Provider`→`Harness`).
4. **CREATE `src/__tests__/unit/agent-stream-harness-override.test.ts`** — harness-vocabulary
   streaming coverage.
5. **VALIDATE** — lint / new test / updated legacy test / full suite / build / grep contracts.
6. **DO NOT edit:** `executePrompt()` (S1 — assume landed); the `CacheKeyInputs` build-site (S3); the
   constructor (S1); `AgentConfig` (S1/P3.M2.T1.S1); `agent.test.ts` / `agent-prompt-*.test.ts` (S1);
   `harness-config.ts`/`harness-registry.ts`/types (P1/P2 done); `src/index.ts` (P3.M3.T1.S1).

### Success Criteria

- [ ] `stream` reads `overrides?.harness ?? overrides?.provider` (cast) +
      `overrides?.harnessOptions ?? overrides?.providerOptions`.
- [ ] `stream` keeps `resolveProviderConfig(getGlobalProviderConfig(), this.harnessId,
      this.harnessOptions, promptHarness, promptHarnessOptions)` (the bridge — delegates to
      `resolveHarnessConfig`).
- [ ] `stream` fetches `HarnessRegistry.getInstance().get(resolvedHarness) as Harness | undefined` and
      **THROWS** `Harness '${resolvedHarness}' is not registered` (at the TOP of `stream()`, before
      the generator — synchronous at call time) when missing.
- [ ] `stream` builds a `harnessRequest: HarnessRequest` with `options.streaming === true` and calls
      `harness.execute<T>(harnessRequest, this.toolExecutor.bind(this), harnessHooks)`.
- [ ] The `AgentHooks`→`HarnessHookEvents` mapping (`onToolStart`/`onToolEnd`/`onSessionStart`/
      `onSessionEnd`) is retyped to `HarnessHookEvents` (identical wiring).
- [ ] The `streamGenerator`, `AbortController`, `controller.signal.aborted` cancellation branch, the
      `CANCELLED` event/response, the `Symbol.asyncIterator` branching, the `harnessStream.next()`
      final-value pull, and the `STREAM_ERROR` catch are **byte-identical** apart from the local-name
      renames.
- [ ] `PromptOverrides` has `harness?: HarnessId` + `harnessOptions?: HarnessOptions` (added by S2
      only if absent at pre-flight — idempotent with S1).
- [ ] `agent-stream-harness-override.test.ts` passes (explicit harness, agent-level harness,
      prompt-beats-agent, legacy fallback, unregistered-harness THROW, HarnessRequest shape incl.
      `streaming:true`, hook wiring, streaming events flow, parity on success + on STREAM_ERROR).
- [ ] `agent-stream-provider-override.test.ts` passes with **only** the 2 regex assertions updated.
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0; the full suite stays green.
- [ ] grep: `ProviderRequest`/`ProviderHookEvents`/`overrides?.provider`/`provider.execute`/
      `providerRequest`/`providerHooks`/`providerStream`/`providerResult`/`resolvedProvider` ABSENT from
      `stream()`.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement T2.S2 using
only (a) this PRP, (b) read-only access to `src/core/agent.ts` (the post-S1 `stream()` body — override
reads L359–360, cascade L362–369, registry fetch + throw L371–381, merge config L386–413, user message
L416, hooks map L419–466, AbortController L469, request build `streaming:true` L472–486, generator
L489–545, return L550–553; imports L34–46), `src/types/agent.ts` (`PromptOverrides` L174–253),
`src/types/harnesses.ts` (`HarnessRequest` L194, `HarnessExecutionOptions.streaming?` L179,
`HarnessHookEvents` L98, `Harness.execute` L349–353), `src/types/streaming.ts` (`StreamEvent` + `AsyncStream<T>`
+ the `is*Event` guards), `src/types/providers.ts` (the alias identities), `src/utils/harness-config.ts`
(L367–368 delegation proof + `resolveHarnessConfig` L192), `src/harnesses/harness-registry.ts`
(`getInstance`/`get`/`register`/`_resetForTesting`), `src/__tests__/unit/agent-stream-provider-override.test.ts`
(the `createMockProvider` streaming-mock pattern to mirror + the 2 regex assertions to update), and
(c) the copy-paste-ready snippets in "Implementation Patterns" +
`research/stream-rewire-analysis.md` (stream shape §1, type identities §2, regex rationale §3,
import/build facts §4, scope boundaries §5, test strategy §6). The nine load-bearing decisions are all
proven in the research note. S2 ALSO assumes the parallel S1 has landed (its pre-flight grep Task 0
detects + self-heals if not).

### Documentation & References

```yaml
# MUST READ — the file to REWIRE (stream — the whole method).
- file: src/core/agent.ts
  why: L354–553 = stream (override reads L359–360 = the block to swap to harness-vocab + fallback;
       cascade L362–369; registry fetch + THROW L371–381 = the missing-harness throw — PRESERVE
       location, reword message; merge config L386–413 = UNCHANGED; user message L416 = UNCHANGED;
       hooks map L419–466 = retype providerHooks→harnessHooks: HarnessHookEvents, wiring identical;
       AbortController L469 = UNCHANGED; request build L472–486 = ProviderRequest→HarnessRequest, KEEP
       streaming: true; generator L489–545 = provider.execute→harness.execute, providerResult→harnessResult,
       providerStream→harnessStream, PRESERVE cancellation + Symbol.asyncIterator branching + .next()
       final-value pull + STREAM_ERROR catch; return L550–553 = UNCHANGED); L34–46 = imports (assume S1
       extended the harnesses type import with HarnessRequest, HarnessHookEvents; KEEP the providers.js
       block + the streaming.js import).
  pattern: override reads → cascade → registry fetch → null-guard (THROW) → merge config → hooks map →
           AbortController → build request (streaming:true) → generator (execute + asyncIterator branch +
           cancellation + .next()) → return {stream, controller}.
  gotcha: executePrompt (L578–880) was rewired by S1 — DO NOT touch. The throw MUST stay at the TOP of
          stream() (synchronous at call time); moving it inside the generator breaks the legacy test's
          .rejects.toThrow() shape.

# MUST READ — the streaming types (the contract the generator implements).
- file: src/types/streaming.ts
  why: StreamEvent discriminated union (text_delta/text_done/tool_call_*/metadata/usage/done/error —
       the events the generator yields + the cancellation/error event shapes it constructs); AsyncStream<T>
       { stream: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>; controller?: AbortController }
       (the return shape of stream()); the isTextDeltaEvent/isToolCallEvent/isErrorEvent guards (handy
       in the new test). stream's return type is AsyncStream<T> — UNCHANGED by S2.
  critical: the generator's yield + return types reference these directly; the rewire renames locals
            only, the types are identical (Harness.execute's AsyncGenerator<StreamEvent, AgentResponse<T>>
            return == provider.execute's).

# MUST READ — the Harness types (the contract the request/hooks implement).
- file: src/types/harnesses.ts
  why: L194 HarnessRequest { prompt: string; options: HarnessExecutionOptions }; L167–181
       HarnessExecutionOptions { model?, systemPrompt?, tools?, hooks?: HarnessHookEvents, sessionId?,
       streaming? } (SAME shape as the current ProviderRequest.options — the build is identical; the
       streaming?: boolean slot at L179 is where streaming: true goes); L98 HarnessHookEvents
       { onToolStart?, onToolEnd?(tool,result,duration), onSessionStart?, onSessionEnd?(totalDuration),
       onStream?(chunk) } (identical to the current ProviderHookEvents wiring; onStream NOT wired today);
       L349–353 Harness.execute<T>(request, toolExecutor, hooks?) returns
       Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> (identical to
       provider.execute — the Symbol.asyncIterator branching + the generator consume loop type-check
       unchanged).
  pattern: `import type { Harness, HarnessId, HarnessOptions, HarnessRequest, HarnessHookEvents }
           from '../types/harnesses.js';` (type-only — isolatedModules: true; S1 already extended this
           import for executePrompt — S2 reuses it; pre-flight adds the two names only if absent).

# MUST READ — the type identities (proves the swap is a pure rename).
- file: src/types/providers.ts
  why: L90 ProviderRequest = HarnessRequest; L66 ProviderHookEvents = HarnessHookEvents; L40 ProviderId =
       HarnessId | 'anthropic' | 'opencode' (wider — justifies Decision 2's cast); L127 ProviderOptions
       (⊃ HarnessOptions — assignable, no cast).
  critical: the Provider* aliases are @deprecated but FULLY functional — swapping to Harness* in stream
            is zero-structural-change.

# MUST READ — the cascade (confirms resolveProviderConfig delegates to resolveHarnessConfig).
- file: src/utils/harness-config.ts
  why: L367–368 = proof resolveProviderConfig DELEGATES to resolveHarnessConfig (justifies Decision 1's
       bridge); L192–210 = resolveHarnessConfig signature (NO id validation — opaque string key,
       justifies Decision 2's cast). resolveProviderConfig returns { provider, options } (legacy keys —
       justifies Decision 6's destructure key).

# MUST READ — the registry (HarnessRegistry IS ProviderRegistry).
- file: src/harnesses/harness-registry.ts
  why: getInstance() (singleton); get(id: ProviderId): Provider | undefined (returns the LEGACY Provider
       type — Decision 3's cast target); register(provider: Provider) (accepts a structurally-identical
       Harness-typed mock — used by the new test); _resetForTesting() (static, for afterEach).
  gotcha: get() returns Provider, NOT Harness — cast `as Harness | undefined` (Decision 3).

# MUST READ — PromptOverrides (the conditional edit target).
- file: src/types/agent.ts
  why: L174–253 = PromptOverrides (provider? L228, providerOptions? L253 — the legacy fields KEPT; add
       harness?/harnessOptions? after model? ~L200 IF absent — Decision 7). Verify the
       `import type { HarnessId, HarnessOptions } from './harnesses.js';` exists (S1 / AgentConfig work
       likely added it); PromptOverrides is in the same file so the import is shared.
  gotcha: the pre-flight grep (Task 0) decides whether this file is edited at all (idempotent with S1).

# MUST READ — the legacy stream shim import (what agent.ts KEEPS).
- file: src/utils/provider-config.ts
  why: confirms resolveProviderConfig + getGlobalProviderConfig + configureProviders + resetGlobalConfig
       are re-exported (deprecated shim) from harness-config.js — agent.ts L45 imports the first two and
       KEEPS them (Decision 1). The new test imports resetGlobalConfig (+ optionally configureProviders)
       from here.

# MUST READ — the existing stream-override test (the pattern to MIRROR + the 2 regex assertions to UPDATE).
- file: src/__tests__/unit/agent-stream-provider-override.test.ts
  why: createMockProvider(id, executeImpl?) helper (L26–67 — its default execute is an `async function*`
       yielding StreamEvents + returning createSuccessResponse — clone as createMockHarness); beforeEach
       registers 'anthropic'+'opencode' stubs + resetGlobalConfig; afterEach calls
       ProviderRegistry['_resetForTesting']() + resetGlobalConfig; the cascade assertions; the 2
       `.rejects.toThrow(/Provider 'opencode' is not registered/)` sites (UPDATE to /Harness/… per
       Decision 4b — `grep -n "is not registered"` finds both). This file stays GREEN apart from those
       2 regex edits — the NEW file mirrors its structure in harness vocabulary.

# SHOULD READ — the sibling S1 PRP (executePrompt) — the reference pattern + the shared pre-conditions.
- file: plan/004_9a50e71828f4/P3M1T2S1/PRP.md
  why: defines the harnesses type-import extension (S1 Task 1) + the conditional PromptOverrides edit
       (S1 Task 3) that S2 assumes/consumes; S1's Decision 1 (legacy bridge) + Decision 2 (field
       fallback) + Decision 3 (Provider→Harness cast) + Decision 6 (destructure key) are the templates
       for S2's Decisions 1/2/3/6. S1's "DO NOT touch stream() logic" = S2's scope.

# SHOULD READ — the previous PRP (P3.M1.T1.S1) — the Agent fields S2 consumes.
- file: plan/004_9a50e71828f4/P3M1T1S1/PRP.md
  why: defines the post-S1 Agent state (this.harness/harnessId/harnessOptions fields; HarnessRegistry
       import) that S2 reads.

# SHOULD READ — the research note (stream shape + quirks + regex rationale + scope boundaries).
- file: plan/004_9a50e71828f4/P3M1T2S2/research/stream-rewire-analysis.md
  why: §1 = the current stream() shape (annotated, with the 3 stream-specific quirks flagged); §2 = the
       Provider*=Harness* alias identities; §3 = the legacy-test regex rationale (Decision 4b); §4 =
       import/build facts (noUnusedLocals OFF → unused type imports harmless); §5 = scope-boundary
       table; §6 = the test strategy.
```

### Current Codebase tree (relevant slice)

```bash
src/core/agent.ts                                            # MODIFY — stream() harness rewire
src/types/agent.ts                                           # MODIFY (CONDITIONAL) — add harness?/harnessOptions? to PromptOverrides if absent
src/__tests__/unit/agent-stream-provider-override.test.ts    # MODIFY (2 lines) — update the 2 'is not registered' regex assertions (Provider→Harness)
src/__tests__/unit/agent-stream-harness-override.test.ts     # CREATE — harness-vocabulary stream coverage
# READ-ONLY:
src/types/harnesses.ts                                       # HarnessRequest / HarnessExecutionOptions.streaming / HarnessHookEvents / Harness.execute
src/types/streaming.ts                                       # StreamEvent / AsyncStream<T> / is*Event guards
src/types/providers.ts                                       # ProviderRequest=HarnessRequest, ProviderHookEvents=HarnessHookEvents aliases
src/utils/harness-config.ts                                  # resolveProviderConfig delegates to resolveHarnessConfig (L367-368)
src/utils/provider-config.ts                                 # legacy shim re-exporting resolveProviderConfig/getGlobalProviderConfig/resetGlobalConfig
src/harnesses/harness-registry.ts                            # HarnessRegistry.getInstance/get/register/_resetForTesting
src/__tests__/unit/agent-stream-provider-override.test.ts    # MIRROR streaming-mock pattern + 2 regex edits
# UNTOUCHED by T2.S2: executePrompt (S1), CacheKeyInputs build-site (S3), constructor (S1),
#   AgentConfig (S1/P3.M2.T1.S1), agent.test.ts / agent-prompt-*.test.ts (S1), src/index.ts (P3.M3.T1.S1).
```

### Desired Codebase tree with files to be modified

```bash
src/core/agent.ts                                               # MODIFIED — stream() harness-vocabulary + HarnessRequest(streaming:true) + harness.execute + preserved generator
src/types/agent.ts                                              # MODIFIED (conditional) — PromptOverrides.harness?/harnessOptions? added if absent
src/__tests__/unit/agent-stream-provider-override.test.ts       # MODIFIED (2 lines) — regex assertions Provider→Harness
src/__tests__/unit/agent-stream-harness-override.test.ts        # CREATED — createMockHarness (streaming generator) + harness override describe
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — KEEP resolveProviderConfig/getGlobalProviderConfig (NOT resolveHarnessConfig/getGlobalHarnessConfig)
//   in stream. resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368), so the
//   canonical harness cascade runs. The legacy global singleton is used deliberately to keep the legacy stream
//   test ("should use global default provider when agent has no provider") green: new Agent() + agent.stream(prompt)
//   with no override resolves the global 'anthropic' stub (registered via configureProviders). Switching to
//   getGlobalHarnessConfig (default 'pi', no stub) makes stream THROW. The global-singleton + test-vocabulary
//   migration is a LATER lockstep change. (Decision 1.)

// CRITICAL #2 — overrides?.provider cast as HarnessId is runtime-safe. resolveHarnessConfig performs NO id validation
//   (opaque string key); HarnessRegistry.get does a raw Map.get. So 'anthropic'/'opencode' legacy literals flow
//   through unchanged and resolve the registered stub. Mirrors the cast S1 used in executePrompt + the constructor +
//   inside resolveProviderConfig itself. (Decision 2.)

// CRITICAL #3 — registry.get(...) returns Provider, NOT Harness. Cast `as Harness | undefined`. Provider and Harness
//   are structurally identical (same methods; Provider* params are deprecated Harness* aliases); the cast bridges
//   only the id-type width gap. The missing-harness check runs on the cast value, so a missing harness still hits
//   the throw. (Decision 3.)

// CRITICAL #4 — stream() THROWS on a missing harness (it does NOT return a PROVIDER_NOT_FOUND AgentResponse like
//   executePrompt). The throw is at the TOP of stream() (L377-381) — SYNCHRONOUS AT CALL TIME, BEFORE the generator
//   is created. The legacy test wraps the call in an async fn + .rejects.toThrow(/... is not registered/). PRESERVE
//   the throw location — DO NOT move it inside the generator (that would yield an error event instead, breaking the
//   .rejects.toThrow() shape). Reword the message to harness vocab AND update the 2 legacy-test regex assertions.
//   (Decisions 4 + 4b.)

// CRITICAL #5 — The resolveProviderConfig destructure key STAYS `provider` (because we keep resolveProviderConfig,
//   whose return shape is { provider, options }). So: `const { provider: resolvedHarness, options: resolvedHarnessOptions } = …`.
//   The KEY is `provider` (legacy return field); the LOCAL NAME is `resolvedHarness`. (Decision 6.)

// CRITICAL #6 — streaming: true MUST survive the rename. HarnessExecutionOptions.streaming? (harnesses.ts L179) is
//   the slot that flips Harness.execute into AsyncGenerator mode. If it's dropped, execute returns a Promise and the
//   generator's else-branch (non-streaming fallback) runs instead — the test's streaming-event assertions fail.

// CRITICAL #7 — PRESERVE the streamGenerator + AbortController + cancellation + Symbol.asyncIterator branching +
//   .next() final-value pull + STREAM_ERROR catch VERBATIM (apart from local renames). The contract literally says
//   "preserve the streamGenerator + AbortController + cancellation logic verbatim." (Decision 5.)

// GOTCHA #8 — isolatedModules: true (tsconfig.json). The type imports (HarnessRequest, HarnessHookEvents) MUST be
//   `import type` (extend S1's existing harnesses type import — pre-flight adds the names only if absent). KEEP the
//   providers.js import block + the streaming.js import (noUnusedLocals is OFF, so unused ProviderRequest/
//   ProviderHookEvents imports after S1+S2 do NOT break tsc --noEmit; removal is deferred to P4 cleanup).

// GOTCHA #9 — npm run lint EXCLUDES src/__tests__ (tsconfig "exclude"). It type-checks agent.ts + types/agent.ts
//   (proving the impl compiles + the HarnessRequest/HarnessHookEvents imports resolve + the cast + the PromptOverrides
//   field). Test type errors surface in `npm test` (vitest/esbuild). Run BOTH gates.

// GOTCHA #10 — HarnessRegistry.register(provider: Provider) accepts a structurally-identical Harness-typed mock in
//   tests (structural typing). createMockHarness returns a Harness whose execute is an async generator; the streaming
//   mock yields StreamEvents + returns the final AgentResponse (mirror the legacy createMockProvider default).

// GOTCHA #11 — DO NOT touch executePrompt (L578–880, S1's scope). DO NOT touch the CacheKeyInputs build-site (S3).
//   DO NOT touch the constructor or agent.test.ts / agent-prompt-*.test.ts (S1).

// GOTCHA #12 — The Hooks mapping's 4 if-blocks are byte-identical in WIRING; only the local object name + type change
//   (providerHooks: ProviderHookEvents → harnessHooks: HarnessHookEvents). The onStream slot is NOT wired today —
//   leave it unwired.

// GOTCHA #13 — agent-stream-provider-override.test.ts is left GREEN apart from the 2 regex assertions (Decision 4b).
//   If MORE than the 2 regex lines go red, the bridge was implemented wrong (most likely overrides?.provider was read
//   exclusively without the ?? fallback, or getGlobalHarnessConfig was used — re-read Decisions 1+2).
```

---

## Implementation Blueprint

### Data models and structure

NO new runtime data models. T2.S2 consumes the existing `HarnessRequest` / `HarnessExecutionOptions` /
`HarnessHookEvents` (`src/types/harnesses.ts`) + `StreamEvent` / `AsyncStream<T>`
(`src/types/streaming.ts`) — structurally identical to the legacy types they replace (type aliases).
The only structural addition is two optional fields on `PromptOverrides` (conditional) and the
harness-vocabulary method-local identifiers inside `stream()`.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify post-S1 baseline + green + import state)
  - RUN: `git status --short` — note baseline (S1 may be partially/fully landed; this task assumes S1's
        executePrompt rewire + the harnesses type-import extension + the conditional PromptOverrides edit).
  - RUN: `grep -nE "HarnessRequest|HarnessHookEvents" src/core/agent.ts`
        → if ABSENT from the harnesses import line (L44), Task 1 ADDS them (idempotent with S1); if
        PRESENT (S1 landed), Task 1 is a no-op.
  - RUN: `grep -nE "^\s+(provider|harness|providerOptions|harnessOptions)\??:" src/types/agent.ts`
        → if `harness?:` is ABSENT on PromptOverrides, Task 3 runs; if PRESENT (S1 / P3.M2.T2.S1
        landed), SKIP Task 3 (idempotent).
  - RUN: `grep -n "is not registered" src/__tests__/unit/agent-stream-provider-override.test.ts`
        → expect exactly 2 hits (the regex assertions to update in Task 4).
  - RUN: `grep -nE "this\.harnessId|this\.harnessOptions|HarnessRegistry" src/core/agent.ts`
        → confirm post-S1 fields/imports present. If `this.harnessId` is absent, S1 (P3.M1.T1.S1) hasn't
        landed — rebase/wait, then re-run pre-flight.
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before editing. If S1 is mid-flight (executePrompt
        not yet rewired), coordinate: S2's edits assume S1's imports; if `HarnessRequest`/`HarnessHookEvents`
        imports are absent, Task 1 self-heals.

Task 1: MODIFY src/core/agent.ts — ENSURE the harnesses type import includes HarnessRequest, HarnessHookEvents (no-op if S1 added them)
  - FIND (S1 extended this for executePrompt; verify present):
        import type { Harness, HarnessId, HarnessOptions, HarnessRequest, HarnessHookEvents } from '../types/harnesses.js';
  - IF the line reads `import type { Harness, HarnessId, HarnessOptions } from '../types/harnesses.js';`
        (S1 not yet landed), CHANGE it to include `HarnessRequest, HarnessHookEvents`.
  - KEEP the providers.js import block + the `import type { AsyncStream, StreamEvent } from '../types/streaming.js';` line.
  - VERIFY: `npm run lint` → 0 errors.

Task 2: MODIFY src/core/agent.ts — REWIRE stream() (the core of T2.S2)
  - In the override-reads block (L359–360), REPLACE:
        // Extract prompt-level provider overrides
        const promptProvider = overrides?.provider;
        const promptProviderOptions = overrides?.providerOptions;
    WITH:
        // Extract prompt-level harness overrides (PRD §7.7, §7.9).
        // Backward-compat bridge: prefer the new `harness` field; fall back to the legacy `provider`
        // field so existing callers (`agent.stream(p, { provider: 'opencode' })`) keep working during
        // the v1.2 migration. The fallback + legacy global-config singleton are removed once
        // PromptOverrides + the test suite are fully on harness vocabulary (later lockstep milestone).
        const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);
        const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;
  - In the cascade + fetch + throw block (L362–381), REPLACE:
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
          throw new Error(`Provider '${resolvedProvider}' is not registered`);
        }

        // Capture non-null provider instance for use in closure (TypeScript strict mode requirement)
        const provider = providerInstance;
    WITH:
        // Resolve the effective harness via the configuration cascade (PRD §7.7): global → agent → prompt.
        // resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368);
        // getGlobalProviderConfig is used as the global source to honour the legacy configureProviders()
        // singleton still consumed by executePrompt + the existing test suite.
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
          // THROW (synchronous at call time, before the generator is created) — preserves the existing
          // .rejects.toThrow(...) contract. Reworded to harness vocab; message still contains the id +
          // 'is not registered' so the updated legacy-test regex still matches.
          throw new Error(`Harness '${resolvedHarness}' is not registered`);
        }

        // Capture non-null harness instance for use in closure (TypeScript strict mode requirement)
        const harness = harnessInstance;
  - LEAVE the merge-config block (effectiveSystem/Model/MaxTokens/Temperature/Tools/Hooks + userMessage)
        byte-identical (it uses overrides?.model / this.config.* / prompt.*Override — no provider vocab).
  - In the hooks-map block (L404–466): rename `const providerHooks: ProviderHookEvents = {};` →
        `const harnessHooks: HarnessHookEvents = {};` and the 4 if-block assignments
        (`providerHooks.onToolStart`→`harnessHooks.onToolStart`, `.onToolEnd`, `.onSessionStart`,
        `.onSessionEnd`). The WIRING inside each callback is byte-identical (no logic change). Update the
        comment `// Convert Agent.hooks to ProviderHookEvents` → `// Convert Agent.hooks to HarnessHookEvents`.
  - In the request-build block (L459–486), REPLACE:
        // Build ProviderRequest with streaming enabled
        const providerRequest: ProviderRequest = {
          prompt: userMessage,
          options: {
            model: effectiveModel,
            systemPrompt: effectiveSystem,
            tools: effectiveTools,
            sessionId: resolvedProviderOptions.sessionId,
            hooks: providerHooks,
            streaming: true, // CRITICAL: Enable streaming mode
          },
        };
    WITH:
        // Build HarnessRequest with streaming enabled (PRD §7.3, §7.4). Identical shape to the legacy
        // ProviderRequest — the swap is a type rename (ProviderRequest = HarnessRequest alias).
        // streaming: true flips Harness.execute into AsyncGenerator mode.
        const harnessRequest: HarnessRequest = {
          prompt: userMessage,
          options: {
            model: effectiveModel,
            systemPrompt: effectiveSystem,
            tools: effectiveTools,
            sessionId: resolvedHarnessOptions.sessionId,
            hooks: harnessHooks,
            streaming: true, // CRITICAL: Enable streaming mode
          },
        };
  - In the streamGenerator (L489–545): rename ALL provider-vocabulary locals:
        `provider.execute<T>(providerRequest, self.toolExecutor.bind(self), providerHooks)` →
            `harness.execute<T>(harnessRequest, self.toolExecutor.bind(self), harnessHooks)`;
        the result var `providerResult` → `harnessResult` (declaration + the `Symbol.asyncIterator in`
        check + the else-branch `as Promise<...>` cast);
        the generator var `providerStream` → `harnessStream` (the cast + the `for await` + the `.next()`
        final-value pull).
        KEEP the `try { … } catch (error) { … }` structure, the `controller.signal.aborted` cancellation
        branch + the `CANCELLED` event/response, and the `STREAM_ERROR` event/response byte-identical.
        Update inline comments "provider returned …" → "harness returned …".
        KEEP `const self = this;` + `streamGenerator.call(this)` + the return shape unchanged.
  - VERIFY: `npm run lint` → 0 errors.
  - VERIFY (grep): `awk 'NR>=354 && NR<=553' src/core/agent.ts | grep -nE "ProviderRequest|ProviderHookEvents|overrides\?\.provider|provider\.execute|providerRequest|providerHooks|providerStream|providerResult|providerInstance|resolvedProvider|promptProvider"` → no hits (CLEAN).

Task 3: MODIFY src/types/agent.ts — ADD PromptOverrides.harness/harnessOptions (SKIP if pre-flight found `harness?:` on PromptOverrides — idempotent with S1)
  - VERIFY the harnesses type import exists at the top of types/agent.ts (`import type { HarnessId, HarnessOptions } from './harnesses.js';`).
        If ABSENT, add it.
  - ADD to PromptOverrides (after the `model?: string;` field, ~L200):
        /** Override harness for this prompt (PRD §7.7, §7.9). Highest priority in the harness cascade. */
        harness?: HarnessId;
        /** Override harness options for this prompt (PRD §7.7). Merged via last-write-wins. */
        harnessOptions?: HarnessOptions;
  - DO NOT touch AgentConfig (S1/P3.M2.T1.S1) and DO NOT remove provider/providerOptions (legacy, kept).
  - VERIFY: `npm run lint` → 0 errors.

Task 4: MODIFY src/__tests__/unit/agent-stream-provider-override.test.ts — UPDATE the 2 regex assertions (surgical)
  - FIND (2 sites — `grep -n "is not registered"`):
        }).rejects.toThrow(/Provider 'opencode' is not registered/);
    REPLACE BOTH with:
        }).rejects.toThrow(/Harness 'opencode' is not registered/);
  - DO NOT change any other assertion in this file (the bridge + field fallback keep them green).
  - VERIFY: `npx vitest run src/__tests__/unit/agent-stream-provider-override.test.ts -v` → all pass.

Task 5: CREATE src/__tests__/unit/agent-stream-harness-override.test.ts
  - MIRROR the structure of agent-stream-provider-override.test.ts but in harness vocabulary.
  - IMPORTS:
        import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
        import { Agent } from '../../core/agent.js';
        import { Prompt } from '../../core/prompt.js';
        import { HarnessRegistry } from '../../harnesses/harness-registry.js';
        import { resetGlobalConfig } from '../../utils/provider-config.js';   // legacy singleton (stream bridge)
        import type { Harness, HarnessId, HarnessCapabilities, HarnessRequest } from '../../types/harnesses.js';
        import type { ModelSpec } from '../../types/providers.js';
        import type { StreamEvent } from '../../types/streaming.js';
        import type { AgentResponse } from '../../types/agent.js';
        import { createSuccessResponse } from '../../types/agent.js';
        import { z } from 'zod';
  - HELPER (default execute is an async generator — the streaming mock pattern):
        function createMockHarness(
          id: HarnessId,
          executeImpl?: (request: HarnessRequest) => AsyncGenerator<StreamEvent, AgentResponse<any>, unknown> | Promise<any>
        ): Harness {
          const capabilities: HarnessCapabilities = {
            mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false,
          };
          const mockExecute = vi.fn();
          if (executeImpl) mockExecute.mockImplementation(executeImpl);
          else mockExecute.mockImplementation(async function* () {
            yield { type: 'text_delta', delta: 'Hello', index: 0 } as StreamEvent;
            yield { type: 'text_delta', delta: ' World', index: 1 } as StreamEvent;
            yield { type: 'done', finishReason: 'stop' } as StreamEvent;
            return createSuccessResponse({ result: 'Hello World' }, { agentId: 'test-agent', timestamp: Date.now() });
          });
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
  - describe('Agent.stream() harness override') with:
      beforeEach: resetGlobalConfig(); HarnessRegistry.getInstance().register(createMockHarness('pi'));
        HarnessRegistry.getInstance().register(createMockHarness('claude-code'));
      afterEach:  HarnessRegistry['_resetForTesting'](); resetGlobalConfig();
    Cases (consume each stream with `for await (const _event of stream) { /* consume */ }` unless
    asserting events):
      1. 'resolves an explicit prompt-level harness override and calls harness.execute':
         new Agent(); agent.stream(prompt, { harness: 'pi' }); consume → expect pi.execute called.
      2. 'uses the agent-level harness when no prompt override':
         new Agent({ harness: 'pi' }); agent.stream(prompt); consume → expect pi.execute called.
      3. 'prompt harness override beats the agent harness':
         new Agent({ harness: 'pi' }); agent.stream(prompt, { harness: 'claude-code' }); consume
         → expect cc.execute called; pi.execute NOT called (vi.clearAllMocks before the call).
      4. 'falls back to the legacy provider override':
         register createMockHarness('anthropic' as HarnessId) too; new Agent();
         agent.stream(prompt, { provider: 'anthropic' }); consume → expect anthropic.execute called.
      5. 'THROWS Harness "... is not registered" for an unregistered harness':
         new Agent(); await expect(async () => {
           const { stream } = agent.stream(prompt, { harness: 'claude-code' as HarnessId });
           for await (const _event of stream) { /* consume */ }
         }).rejects.toThrow(/Harness 'claude-code' is not registered/);
         (Do this in a bespoke beforeEach that registers ONLY 'pi', or unregister cc first.)
      6. 'builds a HarnessRequest with streaming: true and the expected options shape':
         capture the request arg: (pi.execute as any).mockImplementation(async function* (req: HarnessRequest) {
           captured = req;
           yield { type: 'text_delta', delta: 'x', index: 0 } as StreamEvent;
           return createSuccessResponse({ result: 'x' }, { agentId: 't', timestamp: Date.now() });
         });
         agent.stream(prompt, { harness: 'pi' }); consume → expect captured = { prompt: <string>,
         options: expect.objectContaining({ model, systemPrompt, tools, sessionId, hooks, streaming: true }) }.
      7. 'maps AgentHooks.preToolUse/postToolUse to HarnessHookEvents.onToolStart/onToolEnd':
         supply hooks: { preToolUse: [vi.fn()], postToolUse: [vi.fn()] }; make the harness executeImpl
         invoke its received hooks.onToolStart({name,input}) + onToolEnd({name,input},{content,isError},5)
         (inside the async generator, before yielding) → expect both AgentHooks fired with
         { toolName, toolInput, agentId, ... } (+ duration for postToolUse).
      8. 'streams events from the overridden harness':
         cc.execute yields {text_delta 'A'},{text_delta 'B'},{done}; collect events → expect length 3 +
         the deltas + done finishReason 'stop'; expect cc.execute called.
      9. 'preserves streaming parity on success (final AgentResponse)':
         const mockResp = createSuccessResponse({ result: 'final' }, { agentId:'t', timestamp:Date.now(), duration:5 });
         pi.execute yields {text_delta 's'}; return mockResp; consume + read the generator's return value
         (const result = await streamGeneratorDone) → expect it equals mockResp. (Simplest: collect events,
         then `const final = await (async () => { for await (const e of s) {} /* exhausted */ })()` is not
         enough — instead iterate and after the loop the generator is done; capture via a wrapper.)
         NOTE: AsyncGenerator return value is obtained by the generator's `.next()` after the loop
         (exactly as stream() itself does). For the test, assert the events flow + status via the data
         path; if asserting the final value, iterate the raw generator from the harness mock directly.
      10. 'yields a STREAM_ERROR event on harness execution failure (parity)':
         pi.execute = async function* () { throw new Error('boom'); }; collect events → expect an event
         with type 'error', code 'STREAM_ERROR', error.message 'boom'.
  - VERIFY: `npx vitest run src/__tests__/unit/agent-stream-harness-override.test.ts -v` → all pass.
  - VERIFY (regression): `npx vitest run src/__tests__/unit/agent-stream-provider-override.test.ts -v` → all pass
        (with only the 2 regex edits from Task 4).

Task 6: VALIDATE (full suite + build + grep contracts)
  - RUN: `npm run lint`   → 0 errors.
  - RUN: `npm test`       → 0 failures (new harness-override stream test green AND the existing suite green
        via the bridge — if agent-stream-provider-override/provider-switching/provider-agent/etc. go red,
        re-read Decisions 1+2: most likely overrides?.provider was read exclusively or getGlobalHarnessConfig
        was used).
  - RUN: `npm run build`  → 0 errors; dist emits.
  - RUN (grep contracts):
        echo "--- stream() (L354-553) must NOT contain provider-vocabulary logic ---"
        awk 'NR>=354 && NR<=553' src/core/agent.ts | grep -nE "ProviderRequest|ProviderHookEvents|overrides\?\.provider|provider\.execute|providerRequest|providerHooks|providerStream|providerResult|providerInstance|resolvedProvider|promptProvider" || echo "CLEAN ✓"
        echo "--- stream() MUST contain harness vocabulary + preserved streaming logic ---"
        awk 'NR>=354 && NR<=553' src/core/agent.ts | grep -nE "HarnessRequest|HarnessHookEvents|overrides\?\.harness|harness\.execute|harnessRequest|harnessHooks|harnessStream|harnessResult|harnessInstance|resolvedHarness|streaming: true|streamGenerator|AbortController|Symbol\.asyncIterator|STREAM_ERROR"
```

### Implementation Patterns & Key Details

```ts
// === Resolution + fetch + throw block — src/core/agent.ts stream (the core of T2.S2) ===
const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);   // Decision 2
const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;

const globalConfig = getGlobalProviderConfig();                                                // Decision 1 (bridge)
const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig( // Decision 6 (key=provider, name=resolvedHarness)
  globalConfig, this.harnessId, this.harnessOptions, promptHarness, promptHarnessOptions,
);

const registry = HarnessRegistry.getInstance();
const harnessInstance = registry.get(resolvedHarness) as Harness | undefined;                  // Decision 3 (cast)
if (!harnessInstance) {
  // THROW — synchronous at call time, before the generator (preserves .rejects.toThrow contract).
  throw new Error(`Harness '${resolvedHarness}' is not registered`);                            // Decision 4 + 4b
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

// === Request build (KEEP streaming: true) ===
const harnessRequest: HarnessRequest = {
  prompt: userMessage,
  options: {
    model: effectiveModel,
    systemPrompt: effectiveSystem,
    tools: effectiveTools,
    sessionId: resolvedHarnessOptions.sessionId,
    hooks: harnessHooks,
    streaming: true,                              // CRITICAL — flips Harness.execute into generator mode
  },
};

// === Generator — PRESERVE structure; rename locals only ===
const self = this;
async function* streamGenerator(): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
  try {
    const harnessResult = harness.execute<T>(harnessRequest, self.toolExecutor.bind(self), harnessHooks);
    if (Symbol.asyncIterator in harnessResult) {              // streaming mode
      const harnessStream = harnessResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
      let finalValue: AgentResponse<T> | undefined;
      for await (const event of harnessStream) {
        if (controller.signal.aborted) {                      // cancellation — PRESERVE
          yield { type: 'error', error: new Error('Stream cancelled'), code: 'CANCELLED', retryable: false };
          return createErrorResponse('CANCELLED', 'Stream cancelled by user', {}, false) as AgentResponse<T>;
        }
        yield event;
      }
      const finalResult = await harnessStream.next();         // pull final AgentResponse<T>
      finalValue = finalResult.value as AgentResponse<T>;
      return finalValue;
    } else {                                                  // non-streaming fallback — PRESERVE
      const responsePromise = harnessResult as Promise<AgentResponse<T>>;
      const response = await responsePromise;
      yield { type: 'done', finishReason: response.status === 'error' ? 'error' : 'stop' };
      return response;
    }
  } catch (error) {                                           // STREAM_ERROR — PRESERVE
    yield { type: 'error', error: error instanceof Error ? error : new Error(String(error)), code: 'STREAM_ERROR', retryable: false };
    return createErrorResponse('STREAM_ERROR', error instanceof Error ? error.message : String(error), {}, false) as AgentResponse<T>;
  }
}
return { stream: streamGenerator.call(this), controller };

// === Test helper — createMockHarness (streaming generator; accepted by HarnessRegistry.register) ===
function createMockHarness(id: HarnessId, executeImpl?: (r: HarnessRequest) => any): Harness {
  const mockExecute = vi.fn();
  if (executeImpl) mockExecute.mockImplementation(executeImpl);
  else mockExecute.mockImplementation(async function* () {
    yield { type: 'text_delta', delta: 'Hello', index: 0 } as StreamEvent;
    yield { type: 'done', finishReason: 'stop' } as StreamEvent;
    return createSuccessResponse({ result: 'Hello' }, { agentId: 't', timestamp: Date.now() });
  });
  return {
    id,
    capabilities: { mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false },
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
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
  - consumer: "src/core/agent.ts stream (rewired)"
  - api: "HarnessRegistry.getInstance().get(resolvedHarness) as Harness | undefined — returns the registered Harness stub"
  - note: "S1 already renamed the identifier in executePrompt; S2 adds the cast + the harness-vocabulary locals to stream()"

CONFIG CASCADE:
  - consumer: "src/core/agent.ts stream"
  - api: "resolveProviderConfig(getGlobalProviderConfig(), this.harnessId, this.harnessOptions, promptHarness, promptHarnessOptions) — delegates to resolveHarnessConfig"
  - note: "legacy global singleton used deliberately (Decision 1); the global-singleton migration is deferred"

PROMPTOVERRIDES:
  - add to: "src/types/agent.ts PromptOverrides (conditional on pre-flight grep — idempotent with S1)"
  - fields: "harness?: HarnessId; harnessOptions?: HarnessOptions;"
  - note: "AgentConfig.harness is owned by S1/P3.M2.T1.S1 (not S2)"

HARNESS EXECUTE (streaming):
  - consumer: "src/core/agent.ts stream"
  - api: "harness.execute<T>(HarnessRequest{options.streaming:true}, toolExecutor, HarnessHookEvents) → AsyncGenerator<StreamEvent, AgentResponse<T>>"
  - note: "identical signature to the legacy provider.execute — the Symbol.asyncIterator branching + generator consume loop is unchanged"

STREAM CONTRACT:
  - return: "AsyncStream<T> { stream: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>; controller: AbortController } — UNCHANGED"
  - events: "StreamEvent discriminated union (src/types/streaming.ts) — UNCHANGED"

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
#   - "Property 'providerRequest'/'providerHooks'/'providerStream'/'providerResult' does not exist" → a rename was missed in stream().
#   - "Cannot find name 'HarnessRequest'/'HarnessHookEvents'" → Task 1: the harnesses type import wasn't extended (S1 not landed / self-heal).
#   - "Type 'Provider' is not assignable to type 'Harness'" → missing the `as Harness | undefined` cast (Decision 3).
#   - "Property 'resolvedProvider' does not exist" → a catch-block or comment still references the old local name.
```

### Level 2: Unit Tests (Component Validation)

```bash
# The new harness-vocabulary streaming test
npx vitest run src/__tests__/unit/agent-stream-harness-override.test.ts -v
# Expected: all cases pass (incl. unregistered-harness THROW + HarnessRequest shape incl. streaming:true
#   + hook wiring + streaming events flow + STREAM_ERROR parity).

# The legacy-fallback regression (MUST stay green apart from the 2 regex edits — proves the bridge)
npx vitest run src/__tests__/unit/agent-stream-provider-override.test.ts -v
# Expected: all pass with only the 2 `/Harness 'opencode' is not registered/` regex updates. If MORE goes
#   red → the bridge was implemented wrong (re-read Decisions 1+2; most likely overrides?.provider was read
#   exclusively without the ?? fallback, or getGlobalHarnessConfig was used).

# The rest of the Agent-constructing suite (bridge keeps them green with ZERO edits)
npx vitest run src/__tests__/unit/agent-prompt-provider-override.test.ts -v
npx vitest run src/__tests__/unit/agent-prompt-harness-override.test.ts -v   # S1's new file
npx vitest run src/__tests__/unit/agent-tool-executor.test.ts -v
npx vitest run src/__tests__/unit/agent.test.ts -v
npx vitest run src/__tests__/integration/provider-switching.test.ts -v
npx vitest run src/__tests__/integration/provider-agent.test.ts -v
# Expected: all pass unchanged.
```

### Level 3: Integration Testing (System Validation)

```bash
# Full suite — the green-suite guarantee is the primary T2.S2 gate
npm test
# Expected: 0 failures. This is the proof the bridge + field fallback preserved streaming behaviour
# across all Agent-streaming/prompting test files while the NEW harness-override file exercises the
# harness streaming path.

# Build — proves dist emits with the harness-vocabulary stream
npm run build
# Expected: exit 0.
```

### Level 4: Contract & Runtime Validation

```bash
# Grep contracts (must all hold)
echo "--- stream() (L354-553) must NOT contain provider-vocabulary logic ---"
awk 'NR>=354 && NR<=553' src/core/agent.ts | grep -nE "ProviderRequest|ProviderHookEvents|overrides\?\.provider|provider\.execute|providerRequest|providerHooks|providerStream|providerResult|providerInstance|resolvedProvider|promptProvider" || echo "CLEAN ✓"
echo "--- stream() MUST contain harness vocabulary + preserved streaming logic ---"
awk 'NR>=354 && NR<=553' src/core/agent.ts | grep -nE "HarnessRequest|HarnessHookEvents|overrides\?\.harness|harness\.execute|harnessRequest|harnessHooks|harnessStream|harnessResult|harnessInstance|resolvedHarness|streaming: true|streamGenerator|AbortController|Symbol\.asyncIterator|STREAM_ERROR"

# Runtime spot-check is covered by the 'Agent.stream() harness override' vitest cases (Task 5):
#   - explicit harness resolves + calls harness.execute with streaming:true; agent-level harness used;
#     prompt beats agent; legacy provider fallback; unregistered-harness THROWS /Harness '...' is not registered/;
#     HarnessRequest shape (streaming:true); hook wiring; streaming events flow; STREAM_ERROR parity.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (agent.ts + types/agent.ts type-check; cast resolves; imports resolve;
      HarnessRequest/HarnessHookEvents type-only imports; PromptOverrides.harness field).
- [ ] `npm test` exits 0 — new `agent-stream-harness-override.test.ts` green, legacy
      `agent-stream-provider-override.test.ts` green (only 2 regex edits), AND the existing suite green.
- [ ] `npm run build` exits 0.
- [ ] grep: no `ProviderRequest`/`ProviderHookEvents`/`overrides?.provider`/`provider.execute`/
      `providerRequest`/`providerHooks`/`providerStream`/`providerResult`/`resolvedProvider`/`promptProvider`
      in stream() (L354–553).

### Feature Validation

- [ ] `stream` reads `overrides?.harness ?? overrides?.provider` +
      `overrides?.harnessOptions ?? overrides?.providerOptions`.
- [ ] `stream` resolves via `resolveProviderConfig(getGlobalProviderConfig(), …)` (delegates to
      `resolveHarnessConfig`).
- [ ] `stream` fetches `HarnessRegistry.getInstance().get(resolvedHarness) as Harness | undefined` and
      THROWS `Harness '${resolvedHarness}' is not registered` (at the TOP of stream(), before the
      generator — synchronous at call time) when missing.
- [ ] `stream` builds a `HarnessRequest` with `options.streaming === true` and calls
      `harness.execute<T>(harnessRequest, toolExecutor, harnessHooks)`.
- [ ] `AgentHooks`→`HarnessHookEvents` mapping is retyped (identical wiring).
- [ ] The `streamGenerator`, `AbortController`, cancellation branch, `CANCELLED` event/response,
      `Symbol.asyncIterator` branching, `harnessStream.next()` final-value pull, and `STREAM_ERROR`
      catch are preserved byte-for-byte apart from local renames.
- [ ] `new Agent().stream(prompt, { harness: 'pi' })` calls `pi.execute` with a `HarnessRequest` whose
      `options.streaming === true` and yields `StreamEvent`s; `agent.stream(prompt, { provider:
      'anthropic' })` (legacy) resolves the anthropic stub and streams; `agent.stream(prompt, { harness:
      'claude-code' })` with no stub THROWS `Harness 'claude-code' is not registered`.
- [ ] Streaming parity: identical `AsyncStream<T>` shape + `StreamEvent` flow on success + `STREAM_ERROR`
      on failure (PRD §7.14).

### Code Quality Validation

- [ ] Follows existing agent.ts conventions (local `const` naming, inline comments, error style).
- [ ] Type-only imports use `import type` (isolatedModules).
- [ ] The harnesses type import is EXTENDED (not duplicated) with `HarnessRequest`/`HarnessHookEvents`
      (only if S1 didn't already).
- [ ] The backward-compat bridge + cast + fallback + throw-location preservation are documented inline
      (point to the later lockstep migration for removal).
- [ ] No scope creep into executePrompt logic, the cache-key build-site, the constructor, AgentConfig,
      agent.test.ts / agent-prompt-*.test.ts, or src/index.ts.

### Documentation & Deployment

- [ ] stream() comments explain the bridge + the field fallback + the throw-location invariant + the
      later migration target.
- [ ] No new environment variables, dependencies, or config files.

---

## Anti-Patterns to Avoid

- ❌ Don't switch stream() to `getGlobalHarnessConfig`/`resolveHarnessConfig`/`configureHarnesses`
  directly — it breaks the legacy stream test + every `{provider:…}` caller. Use the legacy-wrapper
  bridge (Decision 1); the lockstep migration is deferred.
- ❌ Don't read `overrides?.harness` EXCLUSIVELY (dropping the `?? overrides?.provider` fallback) — it
  breaks `agent-stream-provider-override.test.ts` and every legacy `{provider:…}` streaming caller. Use
  the fallback (Decision 2).
- ❌ Don't rename the `STREAM_ERROR` / `CANCELLED` codes — they are part of the `StreamEvent`/`AgentResponse`
  error contract (asserted by tests + PRD §7.14 parity). Reword the THROW message only (Decision 4 + 4b).
- ❌ Don't move the missing-harness throw INSIDE the generator — it MUST stay at the TOP of stream()
  (synchronous at call time) to preserve the `.rejects.toThrow()` contract (Decision 4). Moving it
  inside would yield an error event instead, breaking the legacy test shape.
- ❌ Don't drop `streaming: true` from the `HarnessRequest.options` — it's what flips `Harness.execute`
  into AsyncGenerator mode; without it the else-branch (non-streaming fallback) runs and the streaming
  tests fail (Gotcha #6).
- ❌ Don't rewrite the `streamGenerator`/cancellation/`STREAM_ERROR` logic — PRESERVE it verbatim apart
  from the local-name renames (Decision 5 + Decision 7 / Gotcha #7).
- ❌ Don't skip the `as Harness | undefined` cast on `registry.get(...)` — `Provider` is not assignable
  to `Harness` (id-type width); `tsc` will error (Decision 3).
- ❌ Don't touch `executePrompt()` (L578–880, S1's scope) — assume S1 has rewired it.
- ❌ Don't touch the `CacheKeyInputs` build-site — it is T2.S3's scope.
- ❌ Don't edit `agent-prompt-*.test.ts` / `agent.test.ts` — they are S1's scope; only the 2 regex
  assertions in `agent-stream-provider-override.test.ts` move (Decision 4b).
- ❌ Don't remove the legacy `provider`/`providerOptions` fields from `PromptOverrides` — they are kept
  for the fallback + existing tests.
- ❌ Don't change the `resolveProviderConfig` destructure KEY to `harness` — `resolveProviderConfig`
  returns `{ provider, options }` (legacy keys). The KEY stays `provider`; only the LOCAL NAME becomes
  `resolvedHarness` (Decision 6).

---

## Confidence Score

**9/10** for one-pass implementation success. The change is mechanically a method-local rename +
type swap inside one method (`stream`), proven type-safe by the `ProviderRequest = HarnessRequest` /
`ProviderHookEvents = HarnessHookEvents` alias identities and the identical `Harness.execute` signature
(returning the same `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>>` union).
The streaming-specific risk is concentrated in three invariants — (a) the throw stays at the TOP of
`stream()` (synchronous at call time), (b) `streaming: true` survives the rename, (c) the generator +
`AbortController` + cancellation + `STREAM_ERROR` logic is preserved verbatim — all explicitly flagged
in Decisions 4/5/6/7 + Gotchas #4/#6/#7 and asserted by the new test file (cases 5/6/8/10) + the
updated legacy regex (Decision 4b). The four shared decisions (legacy bridge, field fallback,
`Provider`→`Harness` cast, keep the error codes) are all **proven** by the existing test assertions
(the bridge delegates to `resolveHarnessConfig`; the fallback keeps `{provider:'opencode'}` streaming
callers green; the cast bridges only the id-type width; `STREAM_ERROR`/`CANCELLED` are asserted). The
only residual risks are (i) the conditional `PromptOverrides` edit colliding with a concurrent S1 /
P3.M2.T2.S1 (fully mitigated by the pre-flight grep Task 0 + conditional Task 3 — idempotent), and
(ii) the parallel-S1 dependency (S2 assumes S1's executePrompt rewire + import extension landed) —
mitigated by Task 0's baseline gate + Task 1's self-healing import check.
