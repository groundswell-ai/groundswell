# Research Findings — P4.M2.T1.S2 (Cache isolation + deterministic hook ordering tests)

## §0. Contract recap (verbatim from work item)

> LOGIC: Add cache-isolation cases (same prompt, different harness OR different provider → distinct keys;
> same harness+provider+model → identical key). Add hook-ordering tests asserting onToolStart before
> onToolEnd, onSessionStart before onSessionEnd, deterministic sequence across both harnesses. Mock SDKs.
> OUTPUT: PRD §7.14.3/5 verified; cache & hook regressions protected.

PRD refs: **§7.14.3** (hooks fire with consistent ordering) + **§7.14.5** (cache keys incorporate both
harness and provider/model) + **§7.11** (Hook Adaptation mapping table). Section selectors provided:
`h1.7` (Agent Harness System), `h2.24` (7.14 Feature Parity), `h2.21` (7.11 Hook Adaptation).

---

## §1. What already EXISTS (DO NOT duplicate)

| File | Covers | Status |
|---|---|---|
| `src/__tests__/unit/cache-key.test.ts` — describe "cache key isolation — harness + provider (PRD §7.14.5)" | generateCacheKey UNIT: distinct per (harness,provider,model); identical when same; harness/provider feed the digest; open-set providers; deterministic key-sort; backward-compat | ✅ COMPLETE (9 cases) |
| `src/__tests__/unit/agent-cache-key-isolation.test.ts` | AGENT executePrompt build-site threads harness+provider → distinct cache keys per tuple; cache HIT on identical config; `parseModelSpec` rejects harness-qualified strings | ✅ COMPLETE (7 cases) |
| `src/__tests__/unit/providers/pi-harness-hooks.test.ts` | PiHarness per-harness: onToolStart/onToolEnd/onStream SHAPE; session hooks; "fire hooks BEFORE StreamEvents" (streaming path only); fidelity (real isError) | ✅ per-harness only |
| `src/__tests__/unit/providers/claude-code-harness-hooks.test.ts` | `buildAgentSDKHooks()` in isolation (Pre/Post/SessionStart/SessionEnd mapping + shapes) | ✅ adapter-method only; never through execute() |
| `src/__tests__/integration/harness-parity.test.ts` | **S1 deliverable** — §7.14.1/4/6 cross-harness parity (AgentResponse + tools + workflow events) | ✅ EXISTS — S2 must NOT collide; use a different filename |

**Conclusion:** the cache-isolation *cases* already exist at unit + Agent level. The genuine DELTA for S2 is:
**(A)** cross-harness hook-ORDERING parity (no test asserts both harnesses produce the same deterministic
sequence), and **(B)** a thin cross-harness cache-PARITY framing that proves the two harnesses, given the
same prompt, produce DISTINCT cache entries (so they never share cache) — i.e. the §7.14.5 guarantee seen
*as a parity property across the two shipped adapters*, complementing (not re-testing) the unit/Agent files.

---

## §2. The hook-firing ASYMMETRY (the critical gotcha — read before writing any `it`)

The two harnesses fire `HarnessHookEvents` through DIFFERENT mechanisms, so they have DIFFERENT test seams:

### PiHarness — end-to-end through `execute()`
`src/harnesses/pi-harness.ts` non-streaming `execute()` registers ONE `AgentSessionEventListener`.
Each incoming event is dispatched in listener-call order:
1. `fireHookEvents(event, hooks, hookCtx)` — handles `tool_execution_start`→`onToolStart`, `tool_execution_end`→`onToolEnd`, `message_update`→`onStream` (private method, line ~575).
2. THEN the inline `switch(e.type)`: `session_start`→`void hooks?.onSessionStart?.()`, `session_shutdown`→`void hooks?.onSessionEnd?.(Date.now()-startTime)`.

The fake session's `prompt()` replays a scripted event array sequentially via the captured listener, so the
emitted Groundswell-hook sequence is EXACTLY the scripted event order:
`[session_start, tool_execution_start, tool_execution_end, session_shutdown]`
→ `[onSessionStart, onToolStart, onToolEnd, onSessionEnd]`. Deterministic & end-to-end.

Mocking recipe (verbatim from `pi-harness-hooks.test.ts`):
```ts
const harness = new PiHarness(); await harness.initialize();
// @ts-expect-error - private field access for testing
harness.sdk = { ...harness.sdk, createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }) };
// fakeSession.subscribe captures the listener; fakeSession.prompt replays events.
```

### ClaudeCodeHarness — `buildAgentSDKHooks()` seam (execute() with mocked query does NOT fire hooks)
`src/harnesses/claude-code-harness.ts` `execute()` calls `buildAgentSDKHooks(hooks)` and passes the result
to `query({ ..., hooks: sdkHooks })`. The Anthropic SDK invokes those SDK callbacks at the right times.
**BUT** a mocked `query` (an async generator yielding `SDKMessage`s) NEVER invokes SDK hooks — it just
yields messages. Therefore onToolStart/onToolEnd/onSessionStart/onSessionEnd do NOT fire through a mocked
`execute()` for claude-code. (Confirmed: `claude-code-harness-hooks.test.ts` has 19 `buildAgentSDKHooks`
references and ZERO `execute()` hook assertions.)

Deterministic seam: invoke the returned SDK callbacks in the order the real SDK fires them
(`SessionStart` → `PreToolUse` → `PostToolUse` → `SessionEnd`) and assert the underlying Groundswell hooks
fire in the mapped order. This proves (a) correct mapping AND (b) when the SDK drives them in order, the
Groundswell sequence is `onSessionStart → onToolStart → onToolEnd → onSessionEnd`.

```ts
const provider = new ClaudeCodeHarness(); await provider.initialize();
const gwHooks: HarnessHookEvents = { onSessionStart:..., onToolStart:..., onToolEnd:..., onSessionEnd:... };
// @ts-expect-error - Testing private method
const sdkHooks = provider.buildAgentSDKHooks(gwHooks);
await sdkHooks['SessionStart'][0].hooks[0](sdkSessionStartInput, undefined, { signal });
await sdkHooks['PreToolUse'][0].hooks[0](sdkPreToolUseInput, 'id', { signal });
await sdkHooks['PostToolUse'][0].hooks[0](sdkPostToolUseInput, 'id', { signal });
await sdkHooks['SessionEnd'][0].hooks[0](sdkSessionEndInput, undefined, { signal });
// assert gwHooks fired in order [onSessionStart, onToolStart, onToolEnd, onSessionEnd]
```

### The parity assertion (works for BOTH)
Record call labels via side-effect spies into a shared `order: string[]`; both harnesses must produce
`['onSessionStart','onToolStart','onToolEnd','onSessionEnd']`. That is the §7.14.3 "deterministic ordering
across both harnesses" guarantee, executable.

---

## §3. Cache parity framing (§7.14.5 — the complement, not a re-test)

`generateCacheKey(inputs: CacheKeyInputs)` (`src/cache/cache-key.ts`) is a PURE deterministic SHA-256 over
`deterministicStringify(normalized)`. `harness` and `provider` are conditionally appended (lines ~209-220).
Agent build-site: `src/core/agent.ts` executePrompt ~line 678 (`cacheKey = generateCacheKey(cacheInputs)`),
with harness + provider threaded by P3.M1.T2.S3 (verified working in `agent-cache-key-isolation.test.ts`).

Parity framing for S2 (thin, non-duplicative):
1. **Pure-function harness-agnosticism**: `generateCacheKey({...base, harness:'pi', provider:'anthropic'})`
   returns the SAME bytes regardless of "which harness asked" — i.e. the function has no harness-specific
   branching; the key is a pure function of inputs. (Assertable trivially but documents the parity property.)
2. **Cross-harness Agent-level isolation**: run the SAME `Prompt` through `new Agent({enableCache:true})`
   once with `{harness:'pi'}` and once with `{harness:'claude-code'}` (mocked harnesses) → BOTH execute
   (cache MISS) and the two captured `defaultCache.set` keys differ. (The unit file proves key-distinctness;
   this proves it holds when routed through two different real adapter instances end-to-end.)
3. **Same-config HIT still works** (smoke that the cache layer itself isn't broken by the new file).

Reuses the `agent-cache-key-isolation.test.ts` idiom verbatim: `resetGlobalConfig()` +
`HarnessRegistry._resetForTesting()` + register mocks + `vi.spyOn(defaultCache,'set')` + `defaultCache.clear()`.

---

## §4. Proven mocking factories (copy verbatim — do NOT reinvent)

- **PiHarness fake session + scripted events**: `pi-harness-hooks.test.ts` lines 18-40 (`makeFakeSession`,
  `wireFakeSession`) + payload builders `SESSION_START`, `TOOL_START`, `TOOL_END_OK`, `turnEndText`,
  `AGENT_END`, `SESSION_SHUTDOWN`. `dummyToolExecutor = async () => ({content:'', isError:false})`.
- **ClaudeCodeHarness `buildAgentSDKHooks` invocation**: `claude-code-harness-hooks.test.ts` — the exact
  `sdkInput` shapes for PreToolUse/PostToolUse/SessionStart/SessionEnd (incl. `tool_name`, `tool_input`,
  `tool_response`, `hook_event_name`, `{ signal: new AbortController().signal }`).
- **Agent + cache + registry**: `agent-cache-key-isolation.test.ts` `createMockHarness(id, executeImpl)`
  (returns a structural `Harness` with `normalizeModel` returning `{provider:id, model, raw:model}`),
  the `setSpy = vi.spyOn(defaultCache,'set')` capture, and the beforeEach/afterEach isolation discipline.
- **Registry reset helpers**: `HarnessRegistry._resetForTesting()` (static) +
  `HarnessRegistry.getInstance()._resetInitStateForTesting()` (instance). `resetGlobalConfig()` from
  `../../utils/provider-config.js`.
- **Call-order recording**: `const order: string[] = []; const onToolStart = vi.fn(()=>order.push('onToolStart'));`
  — same idiom already used in `pi-harness-hooks.test.ts` streaming-ordering block.

## §5. Validation commands (verified)
- `npm test -- harness-cache-hooks-parity` (run only the new file; vitest `include` glob already covers it).
- `npm test` (full suite — prove no regression).
- `npm run lint` (`tsc --noEmit` on `src/` — new file must type-check; every `@ts-expect-error` must be
  USED or tsc errors with "Unused '@ts-expect-error' directive").

## §6. Naming / collision
S1 already produced `src/__tests__/integration/harness-parity.test.ts`. S2's file MUST be distinct →
`src/__tests__/integration/harness-cache-hooks-parity.test.ts`. No other file in the codebase matches that
name (confirmed via `ls src/__tests__/integration/`).
