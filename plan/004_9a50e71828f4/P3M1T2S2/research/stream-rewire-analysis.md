# Research Note — P3.M1.T2.S2: `stream()` harness resolution + streaming `HarnessRequest`

**Companion to** `../P3M1T2S1/PRP.md` (executePrompt) — S2 mirrors S1's rewire for the **streaming**
path. This note captures the stream-specific nuances (throw-not-return, the generator/cancellation
logic, the legacy stream test's regex assertion) so the PRP is self-contained.

---

## §1 — The current `stream()` shape (src/core/agent.ts L354–553)

```ts
public stream<T>(prompt: Prompt<T>, overrides?: PromptOverrides): AsyncStream<T> {
  // (1) override reads — L359-360
  const promptProvider = overrides?.provider;
  const promptProviderOptions = overrides?.providerOptions;

  // (2) cascade resolve — L362-369  (resolveProviderConfig DELEGATES to resolveHarnessConfig)
  const globalConfig = getGlobalProviderConfig();
  const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(
    globalConfig, this.harnessId, this.harnessOptions, promptProvider, promptProviderOptions);

  // (3) registry fetch — L371-376
  const registry = HarnessRegistry.getInstance();
  const providerInstance = registry.get(resolvedProvider);

  // (4) *** THROWS (not returns error response) *** — L377-381
  if (!providerInstance) {
    throw new Error(`Provider '${resolvedProvider}' is not registered`);
  }
  const provider = providerInstance;

  // (5) merge config — L386-413 (system/model/maxTokens/temperature/tools/hooks)
  // (6) user message — L416
  // (7) hooks map: providerHooks: ProviderHookEvents = {}; 4 if-blocks — L419-466
  // (8) AbortController — L469
  // (9) build ProviderRequest { ... streaming: true } — L472-486

  // (10) generator — L489-545
  const self = this;
  async function* streamGenerator(): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    try {
      const providerResult = provider.execute<T>(providerRequest, self.toolExecutor.bind(self), providerHooks);
      if (Symbol.asyncIterator in providerResult) {            // streaming mode
        const providerStream = providerResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
        let finalValue: AgentResponse<T> | undefined;
        for await (const event of providerStream) {
          if (controller.signal.aborted) {                     // cancellation
            yield { type: 'error', error: new Error('Stream cancelled'), code: 'CANCELLED', retryable: false };
            return createErrorResponse('CANCELLED', 'Stream cancelled by user', {}, false) as AgentResponse<T>;
          }
          yield event;
        }
        const finalResult = await providerStream.next();       // pull final AgentResponse<T>
        finalValue = finalResult.value as AgentResponse<T>;
        return finalValue;
      } else {                                                 // non-streaming fallback
        const responsePromise = providerResult as Promise<AgentResponse<T>>;
        const response = await responsePromise;
        yield { type: 'done', finishReason: response.status === 'error' ? 'error' : 'stop' };
        return response;
      }
    } catch (error) {                                          // STREAM_ERROR path
      yield { type: 'error', error: error instanceof Error ? error : new Error(String(error)), code: 'STREAM_ERROR', retryable: false };
      return createErrorResponse('STREAM_ERROR', error instanceof Error ? error.message : String(error), {}, false) as AgentResponse<T>;
    }
  }

  // (11) return — L550-553
  return { stream: streamGenerator.call(this), controller };
}
```

### The three stream-specific quirks (vs executePrompt)

| # | Quirk | Impact on S2 |
|---|---|---|
| **A** | **THROWS on missing harness** (executePrompt RETURNS a `PROVIDER_NOT_FOUND` `AgentResponse`). The throw is at the TOP of `stream()` — **synchronous at call time**, BEFORE the generator is created. The existing test wraps the call in an async fn + `.rejects.toThrow(/Provider 'opencode' is not registered/)`. | **PRESERVE the throw location** (top of stream, outside the generator). Reword the message to `Harness '${resolvedHarness}' is not registered` → **UPDATE the 2 regex assertions** in the legacy stream test (Decision 4b). |
| **B** | Builds `ProviderRequest` with `streaming: true` (CRITICAL flag in the source). | `HarnessRequest` with `streaming: true` — the flag MUST survive the rename (it's what flips `execute` into generator mode). |
| **C** | Wraps `harness.execute` in a local `streamGenerator` async-generator + AbortController + cancellation + `Symbol.asyncIterator` branching + `.next()` for the final value. | **PRESERVE VERBATIM** (contract: "preserve the streamGenerator + AbortController + cancellation logic verbatim"). Only rename locals (`provider.execute`→`harness.execute`, `providerRequest`→`harnessRequest`, `providerResult`→`harnessResult`, `providerStream`→`harnessStream`, `providerHooks`→`harnessHooks`). |

---

## §2 — Type identities (proves the swap is a pure rename)

From `src/types/providers.ts` (confirmed via grep): `ProviderRequest = HarnessRequest`,
`ProviderHookEvents = HarnessHookEvents`, `ProviderExecutionOptions = HarnessExecutionOptions`,
`ProviderCapabilities = HarnessCapabilities`. `ProviderId = HarnessId | 'anthropic' | 'opencode'`
(wider — justifies the `overrides?.provider as HarnessId` cast, identical to S1). `ProviderOptions`
⊃ `HarnessOptions` (assignable, no cast). **So swapping to `Harness*` in `stream()` is zero
structural change** — the build is identical; only the annotations + local names move.

`Harness.execute<T>` (`src/types/harnesses.ts` L349–353) returns
`Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>` — **identical**
to `provider.execute`, so the `Symbol.asyncIterator in harnessResult` branching + the generator
consume loop type-check unchanged.

`HarnessExecutionOptions` has `streaming?: boolean` (L179) — same slot the current `ProviderRequest.options.streaming`
uses. `HarnessHookEvents` has the same 4 slots wired today (`onToolStart/onToolEnd/onSessionStart/onSessionEnd`)
+ an unused `onStream` (NOT wired — leave unwired, no `AgentHooks` equivalent).

---

## §3 — The legacy stream test's strict regex (Decision 4b)

`src/__tests__/unit/agent-stream-provider-override.test.ts` asserts (2 sites):

```ts
await expect(async () => {
  const { stream } = agent.stream(prompt, { provider: 'opencode' as ProviderId });
  for await (const _event of stream) { /* consume */ }
}).rejects.toThrow(/Provider 'opencode' is not registered/);
```

This regex matches the literal `Provider 'opencode' is not registered`. If S2 rewords the throw to
`Harness '${resolvedHarness}' is not registered` (vocabulary consistency with S1's executePrompt),
**this regex breaks**. S1 avoided editing its legacy prompt test because that test used
`.toContain('not registered')` (reword-safe). The stream test is stricter.

**Resolution (Decision 4b):** reword the throw (consistency with S1 + "same rewire as S1") AND
update the 2 regex assertions from `/Provider 'opencode' is not registered/` to
`/Harness 'opencode' is not registered/`. This is a surgical 2-line edit to the legacy test (not a
rewrite); every other assertion in that file stays green via the bridge + field fallback. The
alternative (keeping "Provider '...' is not registered" in stream while executePrompt says
"Harness '...' is not registered") creates a confusing cross-method inconsistency.

**Pre-flight guard:** confirm with
`grep -n "is not registered" src/__tests__/unit/agent-stream-provider-override.test.ts` → expect
exactly 2 hits, both the regex form above.

---

## §4 — Import / build facts

- `src/core/agent.ts` L35–42 = `import { ProviderId, ProviderOptions, ProviderRequest, ProviderHookEvents, ToolExecutionRequest, ToolExecutionResult } from '../types/providers.js';` (REGULAR import — works under isolatedModules today; S2 leaves it).
- L44 = `import type { Harness, HarnessId, HarnessOptions } from '../types/harnesses.js';` — **S1 extends this** to `…, HarnessRequest, HarnessHookEvents`. **S2 ASSUMES S1 did this** (pre-flight grep; if absent, S2 adds them — idempotent with S1).
- L46 = `import type { AsyncStream, StreamEvent } from '../types/streaming.js';` — stream still needs `AsyncStream` (return type) + `StreamEvent` (generator yield/return types). **KEEP unchanged.**
- `tsconfig.json`: `strict: true`, `isolatedModules: true`, **NO `noUnusedLocals`**. So after S1+S2 both land, `ProviderRequest`/`ProviderHookEvents` become unused in `agent.ts` but **do NOT break `tsc --noEmit`** (unused imports are allowed). S2 leaves them (minimize diff/merge risk; P4 cleanup removes them). `npm run lint` = `tsc --noEmit` on `src/` **excluding `src/__tests__`**.

---

## §5 — Scope-boundary table (who owns what)

| Surface | Owner | S2 action |
|---|---|---|
| `stream()` logic (L354–553) | **T2.S2 (this PRP)** | REWIRE to harness vocabulary |
| `executePrompt()` (L578–880) | T2.S1 (parallel) | DO NOT touch (assume S1 lands) |
| `CacheKeyInputs` build-site | T2.S3 | DO NOT touch |
| Agent constructor / fields (`this.harness`, `this.harnessId`, `this.harnessOptions`) | P3.M1.T1.S1 (done) | consume read-only |
| `PromptOverrides.harness/harnessOptions` | T2.S1 (conditional) / P3.M2.T2.S1 | S2 adds ONLY if pre-flight shows absent (idempotent) |
| `harness-config.ts` / `harness-registry.ts` / types | P1/P2 (done) | consume read-only |
| `agent-stream-provider-override.test.ts` | S2 (minimal edit — 2 regex assertions) | update regex for reworded throw |
| `agent-prompt-*.test.ts` / `agent.test.ts` | S1 | DO NOT touch |
| `src/index.ts` | P3.M3.T1.S1 | DO NOT touch |

---

## §6 — Test strategy (mirror S1's Decision 8)

- **CREATE** `src/__tests__/unit/agent-stream-harness-override.test.ts` — `createMockHarness` whose
  `execute` defaults to an `async function*` yielding `StreamEvent`s + returning a final
  `AgentResponse` (the streaming mock pattern from the legacy stream test L46–67). `describe('Agent.stream() harness override')`
  covering: explicit harness, agent-level harness, prompt-beats-agent, legacy-provider fallback,
  unregistered-harness THROW (`.rejects.toThrow(/Harness '...' is not registered/)`), `HarnessRequest`
  shape (incl. `streaming: true`), `AgentHooks`→`HarnessHookEvents` wiring, streaming events flow,
  parity on success + on STREAM_ERROR.
- **UPDATE (minimal)** `src/__tests__/unit/agent-stream-provider-override.test.ts` — the 2 regex
  assertions (`Provider`→`Harness`). Everything else green via the bridge + fallback.

The new test imports `HarnessRegistry` from `'../../harnesses/harness-registry.js'` + `resetGlobalConfig`
from `'../../utils/provider-config.js'` (the legacy singleton the bridge reads).
