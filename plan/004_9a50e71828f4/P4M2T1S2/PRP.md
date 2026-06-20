# PRP — P4.M2.T1.S2: Cache isolation + deterministic hook ordering tests

**PRD reference:** §7.14.3 (hooks fire with consistent ordering), §7.14.5 (cache keys incorporate **both**
harness and provider/model), §7.11 (Hook Adaptation mapping table).
**Plan:** `plan/004_9a50e71828f4/` — S2 of P4.M2.T1 ("Feature-parity and adversarial test suites").
**Consumes:** `generateCacheKey`/`CacheKeyInputs` (`src/cache/cache-key.ts`) + the two shipped harness
adapters `PiHarness` (`src/harnesses/pi-harness.ts`) and `ClaudeCodeHarness`
(`src/harnesses/claude-code-harness.ts`) + their shared `Harness`/`HarnessHookEvents` contract
(`src/types/harnesses.ts`) + `HarnessRegistry` (`src/harnesses/harness-registry.ts`) + `defaultCache`
(`src/cache/index.ts`) + the `Agent` cache build-site (`src/core/agent.ts` executePrompt ~line 678).
**Produces:** ONE new regression-protected integration test file
`src/__tests__/integration/harness-cache-hooks-parity.test.ts` that proves the §7.14.3 deterministic
hook-ordering guarantee is identical across both harnesses and the §7.14.5 cache-isolation guarantee holds
as a cross-harness parity property. **Scope tag:** (1) **CREATE** one test file; (2) **EDIT** nothing in
`src/`. **DO NOT** modify either harness, the cache module, the types, the Agent, the registry, `PRD.md`,
`tasks.json`, `prd_snapshot.md`, or any existing test.

> **READ "§THE HOOK-FIRING ASYMMETRY (§7.14.3 SEAM SPLIT)" AND "§CACHE COVERAGE ALREADY EXISTS — DO NOT
> DUPLICATE" BEFORE WRITING A SINGLE `it(...)`.** The two harnesses fire `HarnessHookEvents` through
> DIFFERENT mechanisms, so they have DIFFERENT test seams (PiHarness: end-to-end via `execute()` + scripted
> session events; ClaudeCodeHarness: the private `buildAgentSDKHooks()` seam, because a mocked `query()`
> never invokes SDK hooks). Cache isolation is ALREADY comprehensively covered at unit + Agent level —
> this file adds ONLY the cross-harness PARITY framing, not a re-test.

---

## Goal

**Feature Goal:** Create a single, self-contained Vitest integration suite with two top-level
`describe` blocks — one per PRD section — that proves, with both SDKs mocked: (§7.14.3) the two registered
harnesses (`PiHarness` and `ClaudeCodeHarness`) fire `HarnessHookEvents` in the **identical deterministic
sequence** `onSessionStart → onToolStart → onToolEnd → onSessionEnd` for an equivalent scripted turn; and
(§7.14.5) the cache-isolation guarantee holds **as a cross-harness parity property** — the same prompt
routed through `pi` vs `claude-code` yields distinct cache keys (cache MISS on both), while identical
`(harness, provider, model)` yields a cache HIT, and `generateCacheKey` is a pure harness-agnostic function.

**Deliverable:** `src/__tests__/integration/harness-cache-hooks-parity.test.ts` — a Vitest file with two
top-level `describe` blocks (one per PRD section), shared fixtures (mocked-SDK factories, the proven
`buildAgentSDKHooks`-invocation payloads, the `createMockHarness` + `defaultCache.set` spy from
`agent-cache-key-isolation.test.ts`), and `beforeEach`/`afterEach` that reset `HarnessRegistry` and
`resetGlobalConfig()`. Zero new production code, zero new dependencies.

**Success Definition:**
1. `npm test -- harness-cache-hooks-parity` passes and `npm test` stays green (no other test regresses).
2. `npm run lint` (`tsc --noEmit`) exits 0 with the new file included (every `@ts-expect-error` is used).
3. The suite asserts, for an equivalent scripted turn, that BOTH harnesses produce the identical hook
   call-label sequence `['onSessionStart','onToolStart','onToolEnd','onSessionEnd']`; that PiHarness
   achieves this end-to-end through `execute()` while ClaudeCodeHarness achieves it via the
   `buildAgentSDKHooks()` adapter seam driven in SDK event order; and that cache keys differ across
   harnesses but match across identical configs.
4. The known claude-code `isError:false` / `duration:0` SDK limitation (claude-code-harness.ts ~line 1127)
   is documented inline and asserted at SHAPE level — the suite must not falsely assert value-equality it
   cannot honour.

## Why

- **Locks in the v1.2 harness/provider split (PRD §7) for the two parity sections S1 did not cover.** S1
  (`harness-parity.test.ts`) proved §7.14.1/4/6 (tools, AgentResponse, workflow events). S2 closes the loop
  on §7.14.3 (hook ordering) and §7.14.5 (cache isolation) — the remaining two of the six §7.14 parity
  guarantees. Without it, a future refactor of one adapter can silently break hook ordering or cache
  isolation for the other harness, and no test catches it.
- **Regression protection for the §7.14 "Adapter non-functional requirements."** PRD §7.14 promises
  "Deterministic hook ordering" and "Caching: cache keys incorporate both the harness and the
  provider/model for isolation." This suite is the executable evidence for those two bullets.
- **Foundation that completes P4.M2.T1.** Together S1 + S2 give the full §7.14 parity surface executable
  coverage, which P4.M3 (docs) and future harness additions can point at.
- **Low blast radius.** Pure test-file addition. No production code changes; the only risk is a brittle
  assertion, which the Validation Loop + the asymmetry notes guard against.

## What

User-visible behaviour: **none.** Test-only deliverable. Developers get a green CI signal that the two
harnesses fire hooks in the same deterministic order and never share cache entries.

### Success Criteria

- [ ] New file `src/__tests__/integration/harness-cache-hooks-parity.test.ts` exists and is discovered by
      `npm test` (vitest `include: src/__tests__/**/*.test.ts`).
- [ ] **Hook ordering parity (§7.14.3):** for an equivalent scripted turn, BOTH harnesses record the
      identical call-label sequence `['onSessionStart','onToolStart','onToolEnd','onSessionEnd']`; the
      pairwise "start before end" invariants hold for both (`onToolStart` index < `onToolEnd` index;
      `onSessionStart` index < `onSessionEnd` index).
- [ ] **PiHarness-specific:** the sequence is produced END-TO-END through `execute()` via scripted session
      events (`session_start`, `tool_execution_start`, `tool_execution_end`, `session_shutdown`).
- [ ] **ClaudeCodeHarness-specific:** the sequence is produced via the private `buildAgentSDKHooks()` seam
      by invoking the returned SDK callbacks in SDK event order (`SessionStart` → `PreToolUse` →
      `PostToolUse` → `SessionEnd`); the `isError:false`/`duration:0` SDK limitation is asserted as the
      documented value (not compared against PiHarness's real values).
- [ ] **Cache parity (§7.14.5):** the same `Prompt` routed through `pi` then `claude-code` (mocked
      harnesses, cache enabled) causes BOTH to execute (cache MISS) and the two captured `defaultCache.set`
      keys to differ; identical `(harness, provider, model)` re-runs produce a cache HIT (execute called
      once); `generateCacheKey` returns identical bytes for identical inputs regardless of caller.
- [ ] No production file is modified; `npm test` and `npm run lint` both green.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes.** This PRP supplies: the exact two-seam mocking technique (PiHarness private-`sdk`
overwrite + ClaudeCodeHarness `buildAgentSDKHooks()` invocation, both with verbatim fake-session /
SDK-input payloads copied from the proven unit tests), the precise hook call-label sequence both must
produce, the **critical** hook-firing asymmetry explanation (so the implementer uses the right seam per
harness instead of trying to make a mocked claude-code `query()` fire hooks — which it cannot), the cache
parity assertion recipes (reused from `agent-cache-key-isolation.test.ts`), and verified validation
commands.

### Documentation & References

```yaml
# MUST READ — include these in your context window
- file: src/cache/cache-key.ts
  why: "generateCacheKey(inputs: CacheKeyInputs) — PURE deterministic SHA-256. harness?: HarnessId and
        provider?: ModelProviderId are conditionally appended to the normalized object (lines ~209-220);
        omitting them yields the pre-task key. This purity is what the §7.14.5 parity block relies on."
  pattern: "normalized = {user, model}; if(inputs.harness!==undefined) normalized.harness=...; same for
        provider; then optional data/system/temperature/maxTokens/tools(sorted names)/mcps/skills/
        schemaHash; deterministicStringify → sha256 hex (64 chars)."
  gotcha: "No harness-specific branching exists — the key is a pure function of inputs. Asserting
        identical inputs → identical key is sufficient to prove harness-agnosticism."

- file: src/harnesses/pi-harness.ts
  why: "The adapter whose hook ordering is tested END-TO-END. Non-streaming execute() registers ONE
        AgentSessionEventListener; each event is dispatched by (1) fireHookEvents(event,hooks,hookCtx)
        [tool/stream hooks] THEN (2) inline switch: session_start→onSessionStart, session_shutdown→
        onSessionEnd(Date.now()-startTime). fireHookEvents maps tool_execution_start→onToolStart,
        tool_execution_end→onToolEnd, message_update→onStream."
  pattern: "lazy `await import('@earendil-works/pi-coding-agent')` in initialize() stores private
        this.sdk — overwrite after a real initialize(). Scripted events replay in array order via the
        captured listener, so the emitted hook sequence == scripted event order."
  gotcha: "fireHookEvents reports the REAL isError and a REAL duration (stashed from
        tool_execution_start). Fidelity advantage over claude-code — do not assume claude-code matches."

- file: src/harnesses/claude-code-harness.ts
  why: "The second adapter. buildAgentSDKHooks(hooks) (private, line ~1063) returns the sdkHooks map:
        PreToolUse→onToolStart, PostToolUse→onToolEnd({content,isError:false},0), SessionStart→
        onSessionStart(), SessionEnd→onSessionEnd(0). execute() passes this map to query() via
        options.hooks."
  pattern: "lazy `await import('@anthropic-ai/claude-agent-sdk')` in initialize() → private this.sdk."
  gotcha: "CRITICAL — a MOCKED query (async generator yielding SDKMessages) NEVER invokes SDK hooks, so
        onToolStart/onToolEnd/onSessionStart/onSessionEnd do NOT fire through a mocked execute(). The
        deterministic seam is buildAgentSDKHooks() + invoking the returned callbacks in SDK event order.
        onToolEnd ALWAYS reports isError:false and duration:0 (hard-coded SDK limitation, ~line 1127)."

- file: src/__tests__/unit/providers/pi-harness-hooks.test.ts
  why: "THE proven PiHarness mocking recipe + the call-order recording idiom. Copy makeFakeSession(),
        wireFakeSession(), the scripted event payloads (SESSION_START, TOOL_START, TOOL_END_OK,
        turnEndText, AGENT_END, SESSION_SHUTDOWN), and the `order: string[]` + vi.fn(()=>order.push(...))
        pattern from its 'streaming path' → 'should fire hooks BEFORE their corresponding StreamEvents'
        block (already proves PRD §7.14.3 ordering WITHIN pi)."
  pattern: "harness = new PiHarness(); await harness.initialize(); then `harness.sdk = {...harness.sdk,
        createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession })}` via
        `// @ts-expect-error - private field access for testing`."

- file: src/__tests__/unit/providers/claude-code-harness-hooks.test.ts
  why: "THE proven buildAgentSDKHooks() invocation recipe. Copy the exact sdkInput shapes for each hook
        event (PreToolUse: {session_id,transcript_path,cwd,hook_event_name:'PreToolUse',tool_name,
        tool_input,tool_use_id}; PostToolUse: +tool_response; SessionStart: {...,hook_event_name:
        'SessionStart',source:'startup'}; SessionEnd: {...,hook_event_name:'SessionEnd',reason:
        'completed'}) and the invocation `await sdkHooks['PreToolUse'][0].hooks[0](input, 'id',
        {signal: new AbortController().signal})`."
  pattern: "provider = new ClaudeCodeHarness(); await provider.initialize(); then
        `// @ts-expect-error - Testing private method` + `const sdkHooks = provider.buildAgentSDKHooks(gwHooks)`."

- file: src/__tests__/unit/agent-cache-key-isolation.test.ts
  why: "THE proven Agent + cache + registry idiom. Copy createMockHarness(id, executeImpl) (returns a
        structural Harness with normalizeModel → {provider:id, model, raw:model}), the
        setSpy = vi.spyOn(defaultCache,'set') capture, defaultCache.clear() in beforeEach, and the
        resetGlobalConfig() + HarnessRegistry._resetForTesting() isolation discipline."
  pattern: "new Agent({enableCache:true} as any); agent.prompt(prompt, {harness:'pi'|'claude-code' as any,
        model:'anthropic/x'}); then assert HarnessRegistry.get(id).execute call counts + captured set keys."

- file: src/__tests__/unit/cache-key.test.ts
  why: "Reference for what is ALREADY covered at unit level (the §7.14.5 block). DO NOT re-test these
        cases — your cache block is the cross-harness PARITY framing only."
  pattern: "shows the assertions to AVOID duplicating: distinct-per-(harness,provider,model); identical
        when same; harness/provider feed digest; open-set providers."

- file: src/types/harnesses.ts
  why: "The shared HarnessHookEvents contract you import: { onToolStart?(req): void|Promise<void>;
        onToolEnd?(req,result,duration): void|Promise<void>; onSessionStart?(): void|Promise<void>;
        onSessionEnd?(totalDuration): void|Promise<void>; onStream?(chunk): void } + ToolExecutionRequest
        {name,input} + ToolExecutionResult {content,isError} + HarnessId 'pi'|'claude-code'."
  pattern: "import type { HarnessHookEvents, HarnessId, ToolExecutionRequest, ToolExecutionResult,
        HarnessRequest } from '../../types/harnesses.js'"

- file: src/core/agent.ts  (executePrompt ~line 678: cacheKey = generateCacheKey(cacheInputs);
        harnessHooks wiring ~418-465)
  why: "Confirms the Agent threads harness + provider into CacheKeyInputs (P3.M1.T2.S3, verified by
        agent-cache-key-isolation.test.ts) and that Agent.hooks → harnessHooks mapping is identical for
        both harnesses (so the parity block can run hooks through EITHER via the Agent, though the hook-
        ordering block tests the adapters directly for determinism)."

- file: src/__tests__/integration/harness-parity.test.ts
  why: "S1's deliverable — the STRUCTURAL sibling. Mirror its three-describe layout, its registry-reset
        beforeEach/afterEach, and its 'assert SHAPE not value on asymmetric fields' discipline. DO NOT
        duplicate its §7.14.1/4/6 coverage — your file covers §7.14.3/5 only."
  pattern: "one describe per PRD section; shared fixtures at top; beforeEach resets registry + mocks."

- docfile: plan/004_9a50e71828f4/P4M2T1S2/research/findings.md
  why: "Exhaustive findings: the two-seam mocking recipes, the hook-firing asymmetry, what already EXISTS
        (do-not-duplicate list), and the cache parity framing rationale."
  section: "§2 (hook-firing asymmetry), §3 (cache parity framing), §4 (proven mocking factories)"
```

### Current Codebase tree (relevant slice)

```bash
src/
├── cache/
│   ├── cache-key.ts                  # generateCacheKey + CacheKeyInputs (harness?, provider?)
│   └── index.ts                      # defaultCache singleton
├── harnesses/
│   ├── pi-harness.ts                 # adapter — hooks fire via execute() + fireHookEvents
│   ├── claude-code-harness.ts        # adapter — hooks via buildAgentSDKHooks() seam
│   └── harness-registry.ts           # HarnessRegistry._resetForTesting() + getInstance().register()
├── types/
│   ├── harnesses.ts                  # HarnessHookEvents, HarnessId, ToolExecutionRequest/Result
│   └── agent.ts                      # createSuccessResponse (for mock harness execute)
├── core/
│   └── agent.ts                      # executePrompt cache build-site + harnessHooks wiring
└── __tests__/
    ├── integration/
    │   ├── harness-cache-hooks-parity.test.ts  # ⬅ CREATE THIS FILE (the deliverable)
    │   └── harness-parity.test.ts              # S1 sibling — structural reference, do NOT touch
    └── unit/
        ├── cache-key.test.ts                          # §7.14.5 unit coverage (do NOT duplicate)
        ├── agent-cache-key-isolation.test.ts          # cache Agent idiom reference
        └── providers/
            ├── pi-harness-hooks.test.ts               # PiHarness mock factory reference
            └── claude-code-harness-hooks.test.ts      # buildAgentSDKHooks invocation reference
```

### Desired Codebase tree with files added

```bash
src/__tests__/integration/
└── harness-cache-hooks-parity.test.ts    # NEW — the only file created/modified by this task
# No other files touched. No package.json, tsconfig, or vitest.config changes (the glob already covers it).
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — THE HOOK-FIRING ASYMMETRY (§7.14.3 SEAM SPLIT). The two harnesses fire HarnessHookEvents
//   through DIFFERENT mechanisms, so they have DIFFERENT test seams:
//     • PiHarness: hooks fire END-TO-END through execute(). A single AgentSessionEventListener dispatches
//       each scripted session event in order: fireHookEvents (tool/stream) THEN inline switch (session).
//       Scripting [session_start, tool_execution_start, tool_execution_end, session_shutdown] yields the
//       exact Groundswell sequence [onSessionStart, onToolStart, onToolEnd, onSessionEnd].
//     • ClaudeCodeHarness: hooks do NOT fire through a mocked execute(). buildAgentSDKHooks(hooks) returns
//       an sdkHooks map passed to query() via options.hooks; the REAL Anthropic SDK invokes those callbacks,
//       but a MOCKED query (async generator yielding SDKMessages) NEVER does. So the deterministic seam is:
//       buildAgentSDKHooks() + manually invoking the returned callbacks in SDK event order (SessionStart →
//       PreToolUse → PostToolUse → SessionEnd). (Confirmed: claude-code-harness-hooks.test.ts uses
//       buildAgentSDKHooks 19× and execute() 0× for hooks.)
//   CONSEQUENCE: the parity assertion is on the PRODUCED GROUNDSWELL HOOK SEQUENCE (the call-label array),
//   achieved via two different seams. Do NOT try to make claude-code execute() fire hooks via a mocked
//   query — it cannot. Do NOT abandon end-to-end for PiHarness — it CAN and should be exercised end-to-end.
//   Both produce the SAME sequence ['onSessionStart','onToolStart','onToolEnd','onSessionEnd'] — that is
//   the §7.14.3 "deterministic ordering across both harnesses" guarantee.

// CRITICAL #2 — CACHE COVERAGE ALREADY EXISTS — DO NOT DUPLICATE. cache-key.test.ts (§7.14.5 unit block,
// 9 cases) and agent-cache-key-isolation.test.ts (7 Agent-level cases) ALREADY prove: distinct-per-
//   (harness,provider,model); identical when same; harness/provider feed the digest; open-set providers;
//   parseModelSpec rejects harness-qualified strings; cache HIT on identical config. Your cache block is
//   the CROSS-HARNESS PARITY FRAMING only: (a) generateCacheKey is pure/harness-agnostic (identical inputs
//   → identical bytes regardless of caller); (b) the SAME Prompt routed through BOTH mocked harnesses via
//   Agent produces distinct cache keys + both execute (cache MISS) — proving the two adapters never share
//   cache END-TO-END. Re-test any of the existing cases = duplication; narrow to the parity angle.

// CRITICAL #3 — MOCKING: OVERWRITE THE PRIVATE `sdk` FIELD / CALL THE PRIVATE METHOD, DO NOT USE vi.mock.
//   PiHarness lazy-`await import(...)` in initialize() stores private this.sdk — overwrite AFTER a real
//   initialize() (pattern across all 26 harness unit tests). ClaudeCodeHarness.buildAgentSDKHooks() is
//   private — access via `// @ts-expect-error - Testing private method`. vi.mock would fight the lazy
//   import and require hoisted factories; the private-access pattern is proven and readable.

// CRITICAL #4 — onToolEnd isError/duration ASYMMETRY. ClaudeCodeHarness hard-codes isError:false and
//   duration:0 (SDK limitation, claude-code-harness.ts ~line 1127); PiHarness reports REAL values. Assert
//   SHAPE/type only on the claude-code side (result has {content,isError:boolean}; duration is a number
//   === 0 documented). Do NOT assert `pi.isError === cc.isError` across harnesses — it is wrong by design.
//   (This mirrors S1's documented tool-execution asymmetry.)

// CRITICAL #5 — REGISTRY + GLOBAL CONFIG ISOLATION. HarnessRegistry is a shared singleton and the global
//   harness/provider config is a singleton too. Reset BOTH in beforeEach AND afterEach:
//   HarnessRegistry._resetForTesting(); HarnessRegistry.getInstance()._resetInitStateForTesting();
//   resetGlobalConfig(); vi.clearAllMocks(); AND `await defaultCache.clear()` for the cache block.
//   Without this, mocked harnesses / cache entries leak across files and randomly break other suites.

// CRITICAL #6 — RECORD HOOK ORDER VIA SIDE-EFFECT SPIES, not vi.fn().mock.invocationCallOrder. The proven
//   idiom (pi-harness-hooks.test.ts streaming block) is: `const order: string[] = []; const onToolStart =
//   vi.fn(() => { order.push('onToolStart'); });` etc. Then `expect(order).toEqual([...])`. This is robust
//   across both seams (end-to-end pi + manual-invoke cc) and reads deterministically.

// CRITICAL #7 — DO NOT TOUCH PRODUCTION CODE. If a hook-ordering or cache assertion fails, that is a
//   test-shape problem (wrong seam for claude-code; value-equality on isError; duplicating an existing
//   case) — NOT a license to edit the harnesses/cache/Agent/types. The only legitimate fixes are: use the
//   buildAgentSDKHooks seam for claude-code; narrow isError to shape; drop the duplicate cache case.

// CRITICAL #8 — NO NETWORK, NO REAL API KEYS. Both SDKs are fully mocked; never call initialize() with a
//   real key or let a test hit the network. initialize() with NO args is fine.
```

## Implementation Blueprint

### Data models and structure

No production data models. The file defines **test-local helper types** only — local `FakeEvent` (Pi) and
the inline `SDKMessage`-shaped input objects (CC) for the mocked payloads, plus a `HookLabel` string union
`'onSessionStart'|'onToolStart'|'onToolEnd'|'onSessionEnd'`. Everything asserted against is an existing
exported type: `HarnessHookEvents`, `ToolExecutionRequest`, `ToolExecutionResult`, `HarnessId`,
`HarnessRequest`, `AgentResponse`.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/integration/harness-cache-hooks-parity.test.ts — shared fixtures + helpers (TOP of file)
  - IMPORTS: `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';` plus
        `import { PiHarness } from '../../harnesses/pi-harness.js';`,
        `import { ClaudeCodeHarness } from '../../harnesses/claude-code-harness.js';`,
        `import { HarnessRegistry } from '../../harnesses/harness-registry.js';`,
        `import { resetGlobalConfig } from '../../utils/provider-config.js';`,
        `import { generateCacheKey, defaultCache } from '../../cache/index.js';`,
        `import { Agent } from '../../core/agent.js';`,
        `import { Prompt } from '../../core/prompt.js';`,
        `import { createSuccessResponse } from '../../types/agent.js';`,
        `import type { Harness, HarnessId, HarnessCapabilities, HarnessRequest, HarnessHookEvents,
            ToolExecutionRequest, ToolExecutionResult } from '../../types/harnesses.js';`
        `import { z } from 'zod';`
  - PiHarness scripted payloads (copy from pi-harness-hooks.test.ts): SESSION_START, SESSION_SHUTDOWN,
        AGENT_END, turnEndText(text,{input,output}), TOOL_START {type:'tool_execution_start',toolCallId,
        toolName:'search',args:{q:'x'}}, TOOL_END_OK {type:'tool_execution_end',toolCallId,toolName,
        result:'found it',isError:false}.
  - makeFakePiSession(events) + wirePi(harness, events) — overwrite private `sdk` via @ts-expect-error
        (copy verbatim from pi-harness-hooks.test.ts).
  - ClaudeCode SDK input builders (copy from claude-code-harness-hooks.test.ts):
        ccPreToolUseInput(name,input) → {session_id,transcript_path,cwd,hook_event_name:'PreToolUse',
        tool_name:name,tool_input:input,tool_use_id:'id'};
        ccPostToolUseInput(name,input,response) → +tool_response:response;
        ccSessionStartInput() → {...,hook_event_name:'SessionStart',source:'startup'};
        ccSessionEndInput() → {...,hook_event_name:'SessionEnd',reason:'completed'};
        ABORT = { signal: new AbortController().signal }.
  - makeOrderRecordingHooks() → returns { hooks: HarnessHookEvents, order: string[] } where each callback
        is `vi.fn(()=>{ order.push('<label>'); })`. THE central parity instrument.
  - invokeCcSdkHooks(provider, gwHooks) helper: `// @ts-expect-error - Testing private method`;
        `const sdkHooks = provider.buildAgentSDKHooks(gwHooks);` then await the 4 callbacks in SDK order:
        SessionStart → PreToolUse → PostToolUse → SessionEnd (using the cc*Input builders + ABORT).
  - createMockHarness(id, executeImpl?) (copy from agent-cache-key-isolation.test.ts) — structural Harness
        with normalizeModel→{provider:id,model,raw:model}; used by the cache block.
  - dummyToolExecutor = async () => ({content:'', isError:false}).

Task 2: §7.14.3 Hook ordering parity — describe('PRD §7.14.3 — deterministic hook ordering across harnesses')
  - beforeEach: HarnessRegistry._resetForTesting(); getInstance()._resetInitStateForTesting();
        resetGlobalConfig(); vi.clearAllMocks().
  - it('PiHarness fires onSessionStart → onToolStart → onToolEnd → onSessionEnd END-TO-END via execute()'):
        • const { hooks, order } = makeOrderRecordingHooks();
        • wirePi(pi, [SESSION_START, TOOL_START, TOOL_END_OK, turnEndText('ok',{input:5,output:3}), AGENT_END, SESSION_SHUTDOWN]);
        • await pi.execute({ prompt:'x', options:{} }, dummyToolExecutor, hooks);
        • ASSERT order === ['onSessionStart','onToolStart','onToolEnd','onSessionEnd'].
        • ASSERT pairwise invariants: order.indexOf('onSessionStart') < order.indexOf('onSessionEnd');
          order.indexOf('onToolStart') < order.indexOf('onToolEnd').
  - it('ClaudeCodeHarness fires the SAME sequence via the buildAgentSDKHooks() seam (SDK event order)'):
        • const provider = new ClaudeCodeHarness(); await provider.initialize();
        • const { hooks, order } = makeOrderRecordingHooks();
        • await invokeCcSdkHooks(provider, hooks);  // SessionStart→PreToolUse→PostToolUse→SessionEnd
        • ASSERT order === ['onSessionStart','onToolStart','onToolEnd','onSessionEnd']  (IDENTICAL to pi).
        • ASSERT pairwise invariants (start<end for both pairs).
  - it('BOTH harnesses produce byte-identical call-label arrays (the §7.14.3 parity guarantee)'):
        • Run the pi end-to-end sequence and the cc seam sequence; collect both order arrays.
        • ASSERT JSON.stringify(piOrder) === JSON.stringify(ccOrder).
        • This is the single cross-harness parity assertion the work item names ("deterministic sequence
          across both harnesses").
  - it('onToolStart always precedes onToolEnd; onSessionStart always precedes onSessionEnd (both harnesses)'):
        • Explicit pairwise guard on BOTH orders (defensive — the work item names these two invariants
          directly). Loop over [piOrder, ccOrder] and assert each invariant.
  - it('ClaudeCodeHarness onToolEnd reports the documented SDK limitation (isError:false, duration:0)'):
        • const onToolEnd = vi.fn(); build gwHooks with it; invokeCcSdkHooks.
        • ASSERT onToolEnd called with (req, {content, isError:false}, 0). Inline comment:
          `// claude-code onToolEnd.isError is ALWAYS false and duration ALWAYS 0 (SDK limitation,
          //  claude-code-harness.ts ~L1127) — assert SHAPE/value, never compare to PiHarness's real values.`
  - it('no-hooks safety: both harnesses accept undefined hooks without throwing'):
        • pi.execute(req, dummyToolExecutor, undefined) → success; cc.buildAgentSDKHooks(undefined) → {}.
        • Documents that omitting hooks is safe on both seams (parity of the degenerate case).

Task 3: §7.14.5 Cache isolation parity — describe('PRD §7.14.5 — cross-harness cache isolation parity')
  - beforeEach: resetGlobalConfig(); HarnessRegistry._resetForTesting(); getInstance()._resetInitStateForTesting();
        register createMockHarness('pi') + createMockHarness('claude-code') + createMockHarness('anthropic')
        (anthropic is the legacy global default the Agent constructor needs — copy from
        agent-cache-key-isolation.test.ts); `await defaultCache.clear();`; `setSpy = vi.spyOn(defaultCache,'set')`.
  - afterEach: HarnessRegistry._resetForTesting(); getInstance()._resetInitStateForTesting();
        resetGlobalConfig(); vi.restoreAllMocks(); `await defaultCache.clear()`.
  - it('generateCacheKey is harness-agnostic: identical inputs → identical bytes regardless of caller'):
        • const base = { user:'Hi', model:'claude-sonnet-4-20250514', harness:'pi' as HarnessId,
          provider:'anthropic' };
        • ASSERT generateCacheKey(base) === generateCacheKey({...base})  (pure-function determinism).
        • ASSERT the key matches generateCacheKey({user:'Hi',model:'...',harness:'pi',provider:'anthropic'})
          — proves no hidden harness branching (complements the unit file's per-axis cases with the parity
          property). Note inline: unit-level distinctness cases live in cache-key.test.ts — not re-tested here.
  - it('same Prompt through pi THEN claude-code → both execute (cache MISS) + distinct keys (end-to-end)'):
        • const agent = new Agent({enableCache:true} as any); const makePrompt = () => new Prompt({user:'Hi',
          responseFormat: z.object({result: z.string()})});
        • await agent.prompt(makePrompt(), {harness:'pi' as any});
        • await agent.prompt(makePrompt(), {harness:'claude-code' as any});
        • ASSERT HarnessRegistry.get('pi').execute called 1× AND get('claude-code').execute called 1×
          (both MISS — different harness axis → different key).
        • const keys = setSpy.mock.calls.map(c=>c[0]); ASSERT keys[0] !== keys[1]; each matches /^[a-f0-9]{64}$/.
  - it('identical (harness,provider,model) re-runs → cache HIT (execute called once)'):
        • const agent = new Agent({enableCache:true, harness:'pi'} as any); const prompt = new Prompt({user:'Hi',
          responseFormat: z.object({result: z.string()})});
        • await agent.prompt(prompt); await agent.prompt(prompt);
        • ASSERT HarnessRegistry.get('pi').execute called 1× (2nd = HIT). ASSERT setSpy called 1× (only the
          MISS writes). Smoke that the cache layer behaves under the new file.

Task 4: VERIFY all gates (see Validation Loop)
  - `npm test -- harness-cache-hooks-parity` green; `npm test` green (no regressions); `npm run lint` green.
```

### Implementation Patterns & Key Details

**§ The canonical hook-order instrument (works for BOTH seams):**
```ts
type HookLabel = 'onSessionStart' | 'onToolStart' | 'onToolEnd' | 'onSessionEnd';
function makeOrderRecordingHooks() {
  const order: HookLabel[] = [];
  const push = (l: HookLabel) => () => { order.push(l); };
  const hooks: HarnessHookEvents = {
    onSessionStart: vi.fn(push('onSessionStart')),
    onToolStart:    vi.fn(() => { order.push('onToolStart'); }),    // or push(...) — keep consistent
    onToolEnd:      vi.fn(() => { order.push('onToolEnd'); }),
    onSessionEnd:   vi.fn(() => { order.push('onSessionEnd'); }),
  };
  return { hooks, order };
}
// SEAM A — PiHarness end-to-end:
wirePi(pi, [SESSION_START, TOOL_START, TOOL_END_OK, turnEndText('ok',{input:5,output:3}), AGENT_END, SESSION_SHUTDOWN]);
await pi.execute({ prompt:'x', options:{} }, dummyToolExecutor, hooks);
// SEAM B — ClaudeCodeHarness buildAgentSDKHooks() in SDK event order:
// @ts-expect-error - Testing private method
const sdkHooks = provider.buildAgentSDKHooks(hooks);
await sdkHooks['SessionStart'][0].hooks[0](ccSessionStartInput(), undefined, ABORT);
await sdkHooks['PreToolUse'][0].hooks[0](ccPreToolUseInput('search',{q:'x'}), 'id', ABORT);
await sdkHooks['PostToolUse'][0].hooks[0](ccPostToolUseInput('search',{q:'x'},'found it'), 'id', ABORT);
await sdkHooks['SessionEnd'][0].hooks[0](ccSessionEndInput(), undefined, ABORT);

// THE parity assertion (identical for both seams):
expect(order).toEqual(['onSessionStart', 'onToolStart', 'onToolEnd', 'onSessionEnd']);
// Cross-harness byte-identical:
expect(JSON.stringify(piOrder)).toBe(JSON.stringify(ccOrder));
// Pairwise invariants (the work item names these directly):
for (const o of [piOrder, ccOrder]) {
  expect(o.indexOf('onSessionStart')).toBeLessThan(o.indexOf('onSessionEnd'));
  expect(o.indexOf('onToolStart')).toBeLessThan(o.indexOf('onToolEnd'));
}
```

**§ The claude-code isError/duration limitation (assert SHAPE, documented value — NOT cross-harness value):**
```ts
const onToolEnd = vi.fn();
await invokeCcSdkHooks(provider, { onToolEnd });
const [, ccResult, ccDuration] = onToolEnd.mock.calls[0];
expect(ccResult).toMatchObject({ content: 'found it', isError: false }); // documented SDK value
expect(ccDuration).toBe(0);                                              // documented SDK value
// claude-code onToolEnd.isError is ALWAYS false and duration ALWAYS 0 (SDK limitation,
// claude-code-harness.ts ~L1127) — assert the documented value, never compare to PiHarness's real values.
```

**§ The cache parity framing (complements cache-key.test.ts — does NOT duplicate):**
```ts
// (a) pure-function harness-agnosticism:
const base = { user:'Hi', model:'claude-sonnet-4-20250514', harness:'pi' as HarnessId, provider:'anthropic' };
expect(generateCacheKey(base)).toBe(generateCacheKey({ ...base }));

// (b) end-to-end cross-harness isolation via Agent:
const agent = new Agent({ enableCache: true } as any);
await agent.prompt(makePrompt(), { harness: 'pi' as any });
await agent.prompt(makePrompt(), { harness: 'claude-code' as any });
expect(HarnessRegistry.getInstance().get('pi')!.execute).toHaveBeenCalledTimes(1);
expect(HarnessRegistry.getInstance().get('claude-code')!.execute).toHaveBeenCalledTimes(1);
const keys = setSpy.mock.calls.map((c) => c[0] as string);
expect(keys[0]).not.toBe(keys[1]);                       // distinct → never share cache
keys.forEach((k) => expect(k).toMatch(/^[a-f0-9]{64}$/));
```

**§ Registry + global-config + cache isolation (every describe's beforeEach/afterEach):**
```ts
beforeEach(async () => {
  HarnessRegistry._resetForTesting();
  HarnessRegistry.getInstance()._resetInitStateForTesting();
  resetGlobalConfig();
  vi.clearAllMocks();
  await defaultCache.clear();                 // cache block only — harmless elsewhere
});
afterEach(async () => {
  HarnessRegistry._resetForTesting();
  HarnessRegistry.getInstance()._resetInitStateForTesting();
  resetGlobalConfig();
  vi.restoreAllMocks();
  await defaultCache.clear();
});
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (do NOT call configureHarnesses — the Agent cascade defaults suffice; if a test needs a
        default it scopes locally and resetGlobalConfig() in afterEach)
ROUTES: none
PUBLIC API: none (src/index.ts unchanged)
TYPE SURFACE: none (consumes existing exported types only)
DEPS: none (no package.json change; vitest + vi + zod already available)
BUILD: the new file is under src/__tests__/, compiled by npm run lint (tsc --noEmit on src/) and picked up
        by the existing vitest include glob — no config change. Every @ts-expect-error must suppress a REAL
        error or tsc fails with "Unused '@ts-expect-error' directive".
```

## Validation Loop

### Level 1: Syntax & Style (type-check the new file)

```bash
# The new test file must type-check under the project tsconfig (npm run lint runs tsc --noEmit on src/).
npm run lint
# Expected: exit 0. If lint reports "Unused '@ts-expect-error' directive", the private field/method path
# changed — fix the access (or drop the directive). Do NOT silence by editing production code.
```

### Level 2: Unit/Integration Tests (the suite itself + no regressions)

```bash
# Run ONLY the new suite (fast feedback loop while authoring).
npm test -- harness-cache-hooks-parity
# Expected: all tests pass. If a hook-ordering test fails for claude-code, you almost certainly tried to
# fire hooks via a mocked execute()/query — they don't fire there. Switch to the buildAgentSDKHooks() seam
# (Critical #1). If a cache case fails because it duplicates an existing assertion, narrow to the parity
# angle (Critical #2). Do NOT edit the harnesses/cache/Agent.

# Full suite — prove no other test regressed (the file is additive; nothing else should move).
npm test
# Expected: exit 0. If a previously-passing test now fails, the registry/global-config/cache reset is
# leaking state — ensure the beforeEach/afterEach in BOTH describes run _resetForTesting() +
# _resetInitStateForTesting() + resetGlobalConfig() + defaultCache.clear().
```

### Level 3: Manual parity sanity (optional, one-shot confirmation)

```bash
# Confirm vitest discovers the file and lists the two describe blocks:
npx vitest run src/__tests__/integration/harness-cache-hooks-parity.test.ts --reporter=verbose | tail -40
# Expected: the two top-level describes (§7.14.3 hook ordering, §7.14.5 cache isolation) all listed + passing.
```

### Level 4: Contract coverage self-check

```bash
# Confirm the two PRD sections named in the contract are each represented by a describe:
grep -nE "§7\.14\.(3|5)" src/__tests__/integration/harness-cache-hooks-parity.test.ts
# Expected: matches for BOTH sections. Confirms the contract's OUTPUT ("PRD §7.14.3/5 verified").

# Confirm the file did NOT duplicate the existing unit cache cases (should NOT mirror cache-key.test.ts
# verbatim — it should be parity-framed):
grep -c "generateCacheKey" src/__tests__/integration/harness-cache-hooks-parity.test.ts   # small (≤3)
grep -c "defaultCache"     src/__tests__/integration/harness-cache-hooks-parity.test.ts   # present (spy)
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 passed: `npm run lint` exit 0 (new file type-checks; all `@ts-expect-error` are used).
- [ ] Level 2 passed: `npm test -- harness-cache-hooks-parity` green AND `npm test` green (no regressions).
- [ ] Level 4 passed: grep confirms BOTH PRD §7.14.3 and §7.14.5 describes are present.

### Feature Validation

- [ ] §7.14.3: BOTH harnesses produce the identical hook call-label sequence
      `['onSessionStart','onToolStart','onToolEnd','onSessionEnd']`; pairwise start-before-end invariants
      hold for both; PiHarness proven end-to-end via `execute()`; ClaudeCodeHarness proven via the
      `buildAgentSDKHooks()` seam in SDK event order.
- [ ] §7.14.3: claude-code `onToolEnd` `isError:false`/`duration:0` SDK limitation asserted as the
      documented value (not compared to PiHarness's real values).
- [ ] §7.14.5: `generateCacheKey` proven harness-agnostic (identical inputs → identical bytes); the same
      Prompt through `pi` then `claude-code` via Agent → both execute (MISS) + distinct keys; identical
      config → HIT.
- [ ] The cache block does NOT duplicate the existing `cache-key.test.ts` / `agent-cache-key-isolation.test.ts`
      cases (parity framing only).

### Code Quality Validation

- [ ] Follows existing harness-test idioms (private-`sdk`-field overwrite; private-method access via
      `@ts-expect-error`; explicit vitest imports; `_resetForTesting` + `_resetInitStateForTesting`).
- [ ] No production file modified; no new dependency; no config change.
- [ ] Uses the correct seam per harness (PiHarness end-to-end; ClaudeCodeHarness buildAgentSDKHooks) —
      documented inline so a future reader understands WHY the two blocks differ.
- [ ] Shared fixtures (scripted payloads, makeOrderRecordingHooks, createMockHarness) are DRY.

### Documentation & Deployment

- [ ] Inline comments cite the PRD section + the hook-firing asymmetry + the claude-code SDK limitation so a
      future reader understands WHY the two seams differ and WHY isError is shape-only.
- [ ] No new env vars / config / dependencies.

---

## Anti-Patterns to Avoid

- ❌ Don't **try to make a mocked ClaudeCodeHarness `execute()`/`query()` fire hooks**. The SDK invokes
  hook callbacks; a mocked async-generator query never does. Use the private `buildAgentSDKHooks()` seam and
  invoke the returned callbacks in SDK event order (SessionStart → PreToolUse → PostToolUse → SessionEnd).
  See Critical #1. (This is the mirror of S1's tool-execution asymmetry.)
- ❌ Don't **abandon end-to-end testing for PiHarness**. PiHarness CAN and SHOULD be exercised end-to-end via
  `execute()` with scripted session events — that is the stronger proof and matches the existing
  pi-harness-hooks.test.ts recipe.
- ❌ Don't **duplicate the existing cache-isolation cases**. cache-key.test.ts (unit, 9 cases) and
  agent-cache-key-isolation.test.ts (Agent, 7 cases) already cover distinct-per-tuple, identical-when-same,
  digest-participation, open-set providers, HIT/MISS. Your cache block is the cross-harness PARITY framing
  only. See Critical #2.
- ❌ Don't **assert value-equality on `onToolEnd`'s `isError`/`duration` across harnesses**. ClaudeCodeHarness
  hard-codes `isError:false` / `duration:0` (SDK limitation); PiHarness reports real values. Assert the
  documented claude-code value + shape. See Critical #4.
- ❌ Don't **edit `src/harnesses/*`, `src/cache/*`, `src/core/agent.ts`, or any production file** to make a
  test pass. A failure is a test-shape problem — fix the seam/assertion. Editing risks regressing 50+ existing
  harness/cache unit tests and is a hard scope violation.
- ❌ Don't **skip the registry + global-config + cache resets**. All three singletons leak across files.
  `_resetForTesting()` + `_resetInitStateForTesting()` + `resetGlobalConfig()` + `defaultCache.clear()` in
  BOTH beforeEach and afterEach of BOTH describes.
- ❌ Don't **use `vi.mock('@anthropic-ai/claude-agent-sdk', ...)` / `vi.mock('@earendil-works/pi-coding-
  agent', ...)`**. Both SDKs are lazy-imported inside initialize(); the proven pattern is private-`sdk`
  overwrite after a real initialize() (PiHarness) or private-method access (ClaudeCodeHarness).
- ❌ Don't **collide with S1's file**. S1 already produced `src/__tests__/integration/harness-parity.test.ts`
  (§7.14.1/4/6). Your file is `harness-cache-hooks-parity.test.ts` (§7.14.3/5) — distinct name, distinct
  sections, no overlap.
- ❌ Don't **compare hook call ORDER via `vi.fn().mock.invocationCallOrder`** — it is fragile across two
  different seams. Use the shared `order: string[]` side-effect-push idiom (Critical #6), proven in
  pi-harness-hooks.test.ts.

---

## Confidence Score

**8 / 10** for one-pass implementation success.

**Rationale:** Both mocking recipes (PiHarness private-`sdk` overwrite + scripted events; ClaudeCodeHarness
`buildAgentSDKHooks()` invocation) and the cache Agent+registry idiom are lifted verbatim from proven,
already-passing unit tests, and the expected hook sequence is fully determined by the code paths documented
above — so the core assertions are low-risk. The residual risk is concentrated in the one genuinely subtle
area, fully documented in Critical #1 + §2 of findings.md: an implementer who does not read the **hook-firing
asymmetry** will try to fire claude-code hooks through a mocked `execute()` (impossible) and may then wrongly
try to edit the harness; the two-seam blueprint + Anti-Patterns mitigate this. The cache block is the
lower-risk of the two (pure-function parity + a small reuse of the agent-cache-key-isolation idiom), with
its main hazard being accidental duplication of existing cases — guarded by Critical #2 and the do-not-
duplicate list. No external/library research was needed; this is a self-contained test fully specified by the
codebase + the referenced unit tests + findings.md. The parallel item S1 is already implemented as
`harness-parity.test.ts` and touches only that one file (never `src/` production, never this filename), so
there is zero merge conflict.
