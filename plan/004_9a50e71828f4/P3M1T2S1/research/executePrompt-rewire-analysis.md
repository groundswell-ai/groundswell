# Research Note — P3.M1.T2.S1: `executePrompt()` per-call harness resolution + `HarnessRequest`

**Scope:** `src/core/agent.ts` `executePrompt()` (L578–880) ONLY. Runs in parallel with
P3.M1.T1.S1 (constructor rewire — see `../P3M1T1S1/PRP.md`). This note assumes S1 LANDED
exactly as specified: the Agent holds `this.harness: Harness`, `this.harnessId?: HarnessId`,
`this.harnessOptions?: HarnessOptions`; `HarnessRegistry` is imported; and `stream()` +
`executePrompt()` already received S1's **mechanical** rename (`this.providerId`→`this.harnessId`,
`this.providerOptions`→`this.harnessOptions`, `ProviderRegistry`→`HarnessRegistry`, comment
"this.provider"→"this.harness"). S1 deliberately left the **logic** (cascade-fn, `ProviderRequest`
build, `provider.execute` call, `PROVIDER_NOT_FOUND` path) for THIS task (T2.S1).

---

## 1. Current `executePrompt()` shape (POST-S1, the starting point)

`src/core/agent.ts` L578–880. The resolution block S1 left untouched (logic-wise):

```ts
// Extract prompt-level provider overrides
const promptProvider = overrides?.provider;                    // ← T2.S1: → overrides?.harness ?? overrides?.provider
const promptProviderOptions = overrides?.providerOptions;      // ← T2.S1: → overrides?.harnessOptions ?? overrides?.providerOptions

// Resolve provider configuration with cascade: global → agent → prompt
const globalConfig = getGlobalProviderConfig();                // ← KEEP (bridge — see §3)
const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(
  globalConfig, this.harnessId, this.harnessOptions, promptProvider, promptProviderOptions,
);

const registry = HarnessRegistry.getInstance();                // ← S1 renamed identifier (kept)
const providerInstance = registry.get(resolvedProvider);       // ← T2.S1: rename locals + cast `as Harness | undefined`
if (!providerInstance) {
  return createErrorResponse(
    'PROVIDER_NOT_FOUND',                                      // ← KEEP code (tests assert it — §4)
    `Provider '${resolvedProvider}' is not registered`,        // ← message → harness vocab (keep id + 'not registered')
    { providerId: resolvedProvider },                          // ← → { harnessId: resolvedHarness }
    false,
  ) as AgentResponse<T>;
}
const provider = providerInstance;                             // ← → const harness = harnessInstance
```

The hooks→request→execute block (L700–780, paraphrased):

```ts
const providerHooks: ProviderHookEvents = {};                  // ← → harnessHooks: HarnessHookEvents
// ... 4 if-blocks wiring onToolStart/onToolEnd/onSessionStart/onSessionEnd from effectiveHooks ...

const providerRequest: ProviderRequest = {                     // ← → harnessRequest: HarnessRequest
  prompt: userMessage,
  options: {
    model: effectiveModel, systemPrompt: effectiveSystem, tools: effectiveTools,
    sessionId: resolvedProviderOptions.sessionId,              // ← resolvedHarnessOptions.sessionId
    hooks: providerHooks,                                     // ← harnessHooks
  },
};

const providerResult = provider.execute<T>(                    // ← → const harnessResult = harness.execute<T>(
  providerRequest, this.toolExecutor.bind(this), providerHooks,//     harnessRequest, ..., harnessHooks
);
// ... union-return handling (AsyncGenerator | Promise) UNCHANGED ...
```

Catch block (L867–877):

```ts
return createErrorResponse(
  'PROVIDER_EXECUTION_FAILED',                                 // ← KEEP code
  `Provider execution error: ${message}`,                      // ← message → harness vocab
  { duration, providerId: resolvedProvider },                  // ← → { duration, harnessId: resolvedHarness }
  true,
) as AgentResponse<T>;
```

**Everything else in `executePrompt` (cache hit/miss, env setup/restore, workflow events
`agentPromptStart`/`agentPromptEnd`, structured-output validation via `prompt.safeValidateResponse`,
`validateResponse`, `createSuccessResponse`/`createErrorResponse` paths) is UNCHANGED** — the
contract: "Keep the AgentResponse validation + cache + workflow-event emission + env setup logic
intact."

---

## 2. Type identity — `Provider*` are `@deprecated` aliases for `Harness*`

`src/types/providers.ts`:
- L90: `export type ProviderRequest = HarnessRequest;`
- L66: `export type ProviderHookEvents = HarnessHookEvents;`
- L40: `export type ProviderId = HarnessId | 'anthropic' | 'opencode';` (wider)
- L54: `export type ProviderCapabilities = HarnessCapabilities;`
- L78: `export type ProviderExecutionOptions = HarnessExecutionOptions;`

`src/types/harnesses.ts`:
- L194: `HarnessRequest { prompt: string; options: HarnessExecutionOptions }`
- L167: `HarnessExecutionOptions { model?, systemPrompt?, tools?, hooks?: HarnessHookEvents, sessionId?, streaming? }`
- L98: `HarnessHookEvents { onToolStart?, onToolEnd?(tool,result,duration), onSessionStart?, onSessionEnd?(totalDuration), onStream?(chunk) }`
- L350: `Harness.execute<T>(request: HarnessRequest, toolExecutor, hooks?): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`

**Consequence:** swapping `ProviderRequest`→`HarnessRequest` and `ProviderHookEvents`→
`HarnessHookEvents` in `executePrompt` is a **pure type rename** — zero structural change. The
`Harness.execute` signature is byte-identical to the current `provider.execute` call. So
`harness.execute<T>(harnessRequest, this.toolExecutor.bind(this), harnessHooks)` type-checks
unchanged.

**`ProviderOptions` ⊃ `HarnessOptions`** (providers.ts L127 vs harnesses.ts L70): ProviderOptions
adds `sessionStore` / `sessionPersistence` / `sessionPath` / `sessionTtl`. `ProviderOptions` IS
assignable to `HarnessOptions` (structural — extra props OK for non-fresh assignability). The only
field `executePrompt` reads from the resolved options is `.sessionId` (present in both). S1 set
`this.harnessOptions = config.harnessOptions ?? config.providerOptions` — runtime may carry extra
ProviderOptions fields, which flow harmlessly through `resolveHarnessConfig`'s spread merge. **No
cast needed** when passing `this.harnessOptions`/prompt options into `resolveProviderConfig`/the
destructure.

---

## 3. WHY keep the legacy global-config bridge (`resolveProviderConfig`/`getGlobalProviderConfig`)

`src/utils/harness-config.ts` L367–368: `resolveProviderConfig` **DELEGATES** to
`resolveHarnessConfig`:

```ts
const { harness, options } = resolveHarnessConfig(harnessGlobal, agentProvider, agentOptions, promptProvider, promptOptions);
```

So calling `resolveProviderConfig(getGlobalProviderConfig(), …)` **runs the canonical harness
cascade**. The ONLY difference from `resolveHarnessConfig(getGlobalHarnessConfig(), …)` is the
*global-config source*:
- legacy singleton (`getGlobalProviderConfig`, default `'anthropic'`, mutated by `configureProviders`)
- harness singleton (`getGlobalHarnessConfig`, default `'pi'`, mutated by `configureHarnesses`)

**Switching the global source to `getGlobalHarnessConfig` breaks the test suite.** Concrete case:
`agent-prompt-provider-override.test.ts` "should use global default provider when agent has no
provider" does `new Agent()` (no config → `this.harnessId` undefined) then `agent.prompt(prompt)`
(no override). The cascade resolves to the GLOBAL default. With the legacy singleton +
`configureProviders({defaultProvider:'anthropic'})` that is `'anthropic'` (stub registered). With
the harness singleton it is `'pi'` (default) — no `'pi'` stub registered → `PROVIDER_NOT_FOUND` →
test FAILS. Same blast radius across ~7 Agent-constructing test files (see S1's
`research/agent-ctor-rewire-analysis.md` §2).

**S1's explicit posture** (`P3M1T1S1/PRP.md` Decision 1 + Decision 4): "T2 (P3.M1.T2) is the natural
place to migrate agent.ts + those tests to `configureHarnesses`/`getGlobalHarnessConfig`" BUT S1
also says the legacy-wrapper bridge "keeps the entire existing test suite GREEN" and that the full
migration is deferred. **T2.S1's contract** ("Replace overrides?.provider→overrides?.harness; build
HarnessRequest instead of ProviderRequest; call this.harness.execute; Convert AgentHooks→
HarnessHookEvents; Keep cache + createSuccessResponse/createErrorResponse paths") is SATISFIED
without switching the global source — "per-call harness resolution" means resolving the harness
from the **agent + prompt cascade** (which the bridge already does via delegation).

**Net:** T2.S1 keeps `resolveProviderConfig(getGlobalProviderConfig(), …)` (the bridge), exactly as
S1 did in the constructor. The global-singleton migration + the test vocabulary migration
(`configureProviders`→`configureHarnesses`, `{provider}`→`{harness}`) is a LATER, larger change
(P3.M2.T2.S1 / P4 cleanup) that would need all ~7 test files rewritten in lockstep. Doing it here
would explode scope and conflict with the parallel S1 + the green-suite mandate.

---

## 4. WHY keep the error codes `PROVIDER_NOT_FOUND` / `PROVIDER_EXECUTION_FAILED`

`agent-prompt-provider-override.test.ts` asserts (L ~225, L ~330):
```ts
expect(response.error.code).toBe('PROVIDER_NOT_FOUND');
expect(response.error.message).toContain('not registered');
expect(response.error.message).toContain('opencode');   // the resolved id
```
- The **code** is part of the `AgentResponse` error contract (PRD §6.2 — machine-readable). Renaming
  it is a public-API break. The contract says "Keep … createErrorResponse paths." → KEEP both codes.
- The **message** must still contain the resolved id + `'not registered'`. `Harness '${id}' is not
  registered` satisfies both assertions. Safe to reword "Provider"→"Harness".
- The catch block's `PROVIDER_EXECUTION_FAILED` code: no test asserts it (the "execution errors
  gracefully" test only checks `status === 'error'`). KEEP the code for API stability; reword the
  message + details key (`providerId`→`harnessId`) for vocabulary consistency.

---

## 5. Scope boundaries — what T2.S1 does NOT touch

| Concern | Owner | Why T2.S1 leaves it |
|---|---|---|
| `stream()` (L330–540) | **P3.M1.T2.S2** | Parallel sibling subtask; own PRP. |
| Cache-key build-site (`CacheKeyInputs` @ L ~660) | **P3.M1.T2.S3** | Threads harness+provider into the key. T2.S1 keeps `CacheKeyInputs` byte-identical. |
| Constructor (`this.harness` resolution) | **P3.M1.T1.S1** (parallel) | Already delivers the held `Harness` instance T2.S1 consumes. |
| `AgentConfig.harness`/`harnessOptions` | P3.M1.T1.S1 / P3.M2.T1.S1 | S1 adds conditionally. |
| `PromptOverrides.harness`/`harnessOptions` | **this task adds conditionally** (P3.M2.T2.S1 is "Planned") | Gated on pre-flight grep — mirrors S1's AgentConfig pattern. |
| `agent.test.ts` | P3.M1.T1.S1 | S1 owns it; listed in S1's "do not edit" for T2. |
| `agent-prompt-provider-override.test.ts` | **left GREEN & UNCHANGED** by T2.S1 | Regression coverage for the legacy `{provider}` fallback path (the bridge). New harness coverage goes in a NEW file. |
| `src/index.ts` exports | P3.M3.T1.S1 | |
| `harness-config.ts` / `harness-registry.ts` / types | P1/P2 (done) | Read-only. |

---

## 6. Test strategy — new file `agent-prompt-harness-override.test.ts`

The contract: "Mock harness.execute in tests." The existing `agent-prompt-provider-override.test.ts`
mocks `provider.execute` via a `Provider`-typed stub registered through `HarnessRegistry`; because
`Provider` ≡ `Harness` structurally and `HarnessRegistry.register(provider: Provider)` accepts a
`Harness`-typed mock, those mocks ALREADY exercise `harness.execute` at runtime — they stay green via
the bridge (regression). To make the NEW `{harness}` path **visibly** tested, ADD a dedicated file:

- `createMockHarness(id: HarnessId, executeImpl?)` → returns a `Harness` (capabilities + vi.fn
  methods; structurally accepted by `HarnessRegistry.register`).
- `beforeEach`: `resetGlobalConfig()` + register `'pi'` and `'claude-code'` harness stubs.
- `afterEach`: `HarnessRegistry['_resetForTesting']()` + `resetGlobalConfig()`.
- Cases: (a) explicit `{ harness:'pi' }` → `pi.execute` called; (b) agent-level
  `new Agent({harness:'pi'})` used when no prompt override; (c) prompt harness beats agent harness;
  (d) legacy `{provider:'anthropic'}` fallback resolves anthropic stub; (e) unregistered harness →
  `status:'error'`, `code:'PROVIDER_NOT_FOUND'`, message contains id + `'not registered'`; (f)
  captures the request arg → asserts `{prompt, options:{model,systemPrompt,tools,sessionId,hooks}}`
  shape (proves `HarnessRequest` is built); (g) `AgentHooks` (`preToolUse`/`postToolUse`) →
  `harnessHooks.onToolStart`/`onToolEnd` are wired; (h) parity: structured-output validation +
  execution-error → `status:'error'`.

Uses the **legacy** `resetGlobalConfig`/`configureProviders` (NOT `configureHarnesses`) because
`executePrompt` reads the legacy global singleton (bridge). Explicit `{harness:…}` overrides do not
depend on the global source, so most cases need no global config at all.

---

## 7. Confidence

**9/10.** The swap is mechanically a local-variable + type rename inside one method, proven
type-safe by the `Provider* = Harness*` alias identities (§2). The two load-bearing decisions —
keep the legacy global bridge (§3) and keep the error codes (§4) — are both **proven** by the
existing test assertions. Residual risk: the conditional `PromptOverrides` edit colliding with a
concurrent P3.M2.T2.S1, fully mitigated by the pre-flight grep (Task 0) + conditional Task.
