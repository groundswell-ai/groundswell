# PRP — P2.M1.T1.S1: Rename `AnthropicProvider` → `ClaudeCodeHarness` and align to the `Harness` interface

**PRD reference:** §7.1 (claude-code harness wraps `@anthropic-ai/claude-agent-sdk`),
§7.2 (`HarnessId = 'pi' | 'claude-code'`), §7.3 (`Harness` interface + `execute()` signature),
§7.5 (harness MAY extend `HarnessOptions` with harness-specific fields), §7.8 (claude-code runs
`anthropic/*` only), §7.11 (hook adaptation). `consumer-analysis.md §1` confirms the existing
`anthropic-provider.ts` `execute()` ALREADY matches the §7.3 shape — this is a **RENAME +
interface-alignment**, not a rewrite.
**Plan:** `plan/004_9a50e71828f4/` — subtask 1 of P2.M1.T1, the first subtask of P2.M1
(ClaudeCodeHarness = AnthropicProvider rename). S2 (register default harnesses + anthropic-only
enforcement at the registry layer) consumes this class.
**Scope tag:** RENAME + REINTERFACE of ONE source file + forced propagation to 2 barrels, 12
renamed unit tests, and 1 integration test. **All SDK wrapping logic stays verbatim.**

> **READ THE "SCOPE DECISION" SECTION BEFORE WRITING CODE.** It explains the two non-obvious,
> load-bearing decisions: (1) `normalizeModel` must compare against the literal `'anthropic'`, NOT
> `this.id` (a naive id rename silently breaks ALL claude-code execution); and (2) `initialize` keeps
> its session-store fields via a new `ClaudeCodeHarnessOptions extends HarnessOptions` (verified to
> satisfy `implements Harness`). It also explains why the 2 barrels + the integration test MUST be
> updated even though the contract only names the unit tests.

---

## Goal

**Feature Goal:** Rename `src/harnesses/anthropic-provider.ts` → `src/harnesses/claude-code-harness.ts`,
rename the class `AnthropicProvider` → `ClaudeCodeHarness`, change `readonly id` from `'anthropic'` to
`'claude-code'` (`HarnessId`), and re-declare it `implements Harness` (swapping `Provider*` types for
`Harness*` types) — while keeping every line of SDK-wrapping logic (`query`, `createSdkMcpServer`,
`buildAgentSDKHooks`, `streamInput` resume, sessions, MCP, skills) byte-for-byte identical. Ship a
deprecated `AnthropicProvider = ClaudeCodeHarness` alias so every existing consumer keeps compiling.

**Deliverable:**
1. **RENAME + REINTERFACE `src/harnesses/anthropic-provider.ts` → `src/harnesses/claude-code-harness.ts`:**
   - `export class ClaudeCodeHarness implements Harness` (was `AnthropicProvider implements Provider`).
   - `readonly id: HarnessId = "claude-code";` (was `ProviderId = "anthropic"`).
   - Swap type imports: `ProviderRequest`→`HarnessRequest`, `ProviderHookEvents`→`HarnessHookEvents`,
     `ToolExecutor`→inline `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>`,
     `ProviderCapabilities`→`HarnessCapabilities`, `ModelSpec` from `harnesses.js`. (See Blueprint Task 1.)
   - **FIX `normalizeModel`:** `spec.provider !== this.id` → `spec.provider !== "anthropic"` (PRD §7.8
     anthropic-only gate). Update the error message to reference `ClaudeCodeHarness` + `HarnessRegistry`.
   - **ADD `ClaudeCodeHarnessOptions extends HarnessOptions`** (session fields) + type
     `initialize(options?: ClaudeCodeHarnessOptions)`. Body verbatim.
   - `export const AnthropicProvider = ClaudeCodeHarness;` (deprecated alias) at end of file.
2. **MODIFY the 2 barrels (forced path fix):** `src/types/index.ts:52` + `src/index.ts:117` — point at
   `claude-code-harness.js` and export BOTH `ClaudeCodeHarness` and the `AnthropicProvider` alias.
3. **RENAME + UPDATE the 12 unit tests** `anthropic-provider-*.test.ts` → `claude-code-harness-*.test.ts`
   (per contract OUTPUT). Apply the Role A/B `'anthropic'` replacement rule (research/test-rename-rules.md).
4. **MODIFY `src/__tests__/integration/provider-agent.test.ts`** (forced — keeps `npm test` green):
   import path + `'anthropic'`→`'claude-code'` id references + default-config for the "uses default" test.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — proves `claude-code-harness.ts` compiles, the 2 barrels
   resolve, `harness-registry.ts` + `agent.ts` still compile (structural assignability holds).
2. `npm test` (`vitest run`) exits 0 — all 12 renamed `claude-code-harness-*.test.ts` pass, the
   integration test passes, and no other suite regresses.
3. `npm run build` exits 0 — `dist/harnesses/claude-code-harness.{js,d.ts}` emitted (old
   `anthropic-provider.{js,d.ts}` gone).
4. Contract verification (grep): class is `ClaudeCodeHarness implements Harness`; `id` is `'claude-code'`;
   alias exported; normalizeModel compares against `'anthropic'`; no `implements Provider` remains in the file.

---

## ⚠️ SCOPE DECISION — two load-bearing fixes + the forced-propagation set

The contract says "rename + reinterface + keep logic verbatim." Three things are NOT obvious from that
one-liner and WILL cause silent failure or a red build if missed. Read this before editing.

### Decision 1 — `normalizeModel` must compare against the LITERAL `'anthropic'`, not `this.id`

Current: `if (spec.provider !== this.id) throw ...`. `this.id` was `'anthropic'` (conflated axis). After
the rename `this.id === 'claude-code'` — a HARNESS id, which is NEVER equal to a MODEL provider
(`'anthropic'`/`'openai'`/…). So `spec.provider !== this.id` becomes **always true** → `normalizeModel`
throws on EVERY call → every `execute()`/`executeStreaming()` dies at model resolution. This is a silent
correctness regression (compiles fine, fails at runtime).

**Fix:** compare against the literal LLM-host `"anthropic"` (PRD §7.8: claude-code runs anthropic-only):
`if (spec.provider !== "anthropic") throw ...`. The happy path is unchanged; only non-anthropic providers
are rejected (same behavior as today). normalizeModel is explicitly carved out of the "verbatim" list
(the contract lists only `query/createSdkMcpServer/hooks/resume`), so this edit is in-scope. Full diff +
test-message updates in `research/normalize-model-fix.md`.

### Decision 2 — `initialize` keeps its session fields via `ClaudeCodeHarnessOptions extends HarnessOptions`

`HarnessOptions` (types/harnesses.ts) is INTENTIONALLY SLIMMED — it omits `sessionStore`/
`sessionPersistence`/`sessionTtl`/`sessionPath` (adapter internals, system_context §7). But the existing
`initialize()` body reads all four. Typing the param as `HarnessOptions` breaks the body type-check.

**Fix:** define `export interface ClaudeCodeHarnessOptions extends HarnessOptions { sessionStore?; sessionPersistence?; sessionTtl?; sessionPath? }` in `claude-code-harness.ts` and type
`initialize(options?: ClaudeCodeHarnessOptions)`. The body stays verbatim.

**PROOF this satisfies `implements Harness` under `strict: true`:** TypeScript checks method-shorthand
members BIVARIANTLY (`strictFunctionTypes` exempts method syntax), so a narrower specialized param is
accepted. Verified empirically with a minimal repro against TS 5.2 + `strict:true` → `tsc --noEmit` exit 0.
(Fallback if desired: keep `initialize(options?: ProviderOptions)` — also ships green via bivariance — but
that couples the new Harness class to a deprecated type; `ClaudeCodeHarnessOptions` is recommended.)
See `research/type-swap-and-options.md`.

### Decision 3 — the 2 barrels + the integration test are FORCED edits (not scope creep)

- **Barrels (`src/types/index.ts:52`, `src/index.ts:117`):** they `export { AnthropicProvider } from
  '.../anthropic-provider.js'`. Renaming the source file breaks the PATH → `npm run lint` fails. These
  are NOT auto-tracking (they re-export by file path, not just symbol). Must update path + export both
  `ClaudeCodeHarness` and the alias. (The FULL Harness-surface public export is P3.M3.T1.S1 — out of
  scope here; this task only fixes the broken path + adds the new symbol.)
- **Integration test (`provider-agent.test.ts`):** it `new AnthropicProvider()`s the REAL class and
  looks it up via `new Agent({ provider: 'anthropic' })` + the global default. After the id→`'claude-code'`
  rename, the harness registers under `'claude-code'` but the test looks up `'anthropic'` → 33 tests fail.
  It's the ONLY non-unit test instantiating the real class (every other suite uses local
  `createMockProvider('anthropic')` stubs — see `research/breakage-map.md §2b` — and is untouched). A
  minimal forced fix keeps `npm test` green.

> This mirrors the dual-singleton / optional-field Scope Decisions in the parallel predecessors
> (P1.M2.T2.S1, P1.M3.T1.S1): honor the contract's intent, ship green, and keep downstream consumers
> (registry=S2, Agent=P3.M1) compiling without editing their owned files.

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agents:
- **P2.M1.T1.S2** — "Enforce anthropic-only constraint and register default harnesses." It will register
  `ClaudeCodeHarness` (and `PiHarness`) as defaults in `HarnessRegistry` (keyed by `HarnessId`). This task
  ships the class + `'claude-code'` id it consumes.
- **P3.M1** (Agent Harness Rewire) — will resolve a `Harness` via `HarnessRegistry.get('claude-code')`
  and call `harness.execute(...)` with a `HarnessRequest`. This task ships the `Harness`-implementing class.

**Use Case:** PRD §7.1 — Claude Code is the optional, Anthropic-ecosystem harness. Renaming the adapter
to `ClaudeCodeHarness` (id `'claude-code'`) makes the runtime axis explicit and orthogonal to the LLM
provider, unblocking the registry-by-`HarnessId` lookup and the `pi`/`claude-code` selection cascade.

**Pain Points Addressed:** Today the adapter is named `AnthropicProvider` with id `'anthropic'`, conflating
the runtime with the LLM vendor. That blocks the §7 split (registry keyed by `HarnessId`, harness ⊥ model,
`pi` as default). This rename + interface alignment makes it a proper `Harness`.

---

## Why

- **Realizes PRD §7.1/§7.2/§7.3** for the claude-code adapter: a `Harness`-implementing class named
  `ClaudeCodeHarness` with id `'claude-code'`.
- **Unblocks S2 (default registration) and P3.M1 (Agent rewire).** Both need a `Harness` keyed by
  `HarnessId`; without this task they'd have to do the rename themselves (scope creep / merge conflict).
- **Zero behavioral change for anthropic models.** The SDK wrapping is verbatim; only the type surface
  and the harness identity change. The deprecated alias keeps every external `new AnthropicProvider()`
  working through the migration.
- **Low-risk, mechanical, reversible.** The only semantic edit is the `normalizeModel` fix (which
  PRESERVES existing behavior for anthropic models and only changes an error message for non-anthropic).

---

## What

1. **RENAME** `src/harnesses/anthropic-provider.ts` → `src/harnesses/claude-code-harness.ts` (use `git mv`).
2. **REINTERFACE** the class per Blueprint Task 1 (class name, `implements Harness`, `id`, type swaps,
   `ClaudeCodeHarnessOptions`, `normalizeModel` fix, deprecated alias).
3. **FIX the 2 barrels** per Blueprint Task 2 (`src/types/index.ts`, `src/index.ts`).
4. **RENAME + UPDATE the 12 unit tests** per Blueprint Task 3 (git mv + Role A/B replacements).
5. **FIX the integration test** per Blueprint Task 4.
6. **VALIDATE** all gates (Blueprint Task 5).

### Success Criteria

- [ ] `claude-code-harness.ts` declares `export class ClaudeCodeHarness implements Harness` with
      `readonly id: HarnessId = "claude-code"`.
- [ ] `export const AnthropicProvider = ClaudeCodeHarness;` (deprecated alias) present.
- [ ] `normalizeModel` compares `spec.provider !== "anthropic"` (NOT `!== this.id`).
- [ ] `initialize(options?: ClaudeCodeHarnessOptions)`; `ClaudeCodeHarnessOptions extends HarnessOptions`
      with the 4 session fields; body unchanged.
- [ ] `execute`/`executeStreaming`/`buildAgentSDKHooks` use `HarnessRequest`/`HarnessHookEvents`/
      `(req)=>Promise<ToolExecutionResult>` and have UNCHANGED bodies.
- [ ] The 2 barrels export `ClaudeCodeHarness` + `AnthropicProvider` from `claude-code-harness.js`.
- [ ] The 12 unit tests are renamed to `claude-code-harness-*.test.ts` and pass (Role A updated,
      Role B preserved).
- [ ] `provider-agent.test.ts` passes (import path + id refs updated).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S1 using only (a)
this PRP, (b) read-only access to `src/harnesses/anthropic-provider.ts` (the file to rename),
`src/types/harnesses.ts` (the `Harness` interface + `Harness*` types), `src/types/providers.ts` (the
deprecated alias shim + `SessionState`), and the 13 test files, plus (c) the copy-paste-ready snippets in
the Blueprint and the four `research/*.md` notes. The two non-obvious load-bearing details (the
`normalizeModel` `this.id` bug and the `ClaudeCodeHarnessOptions` bivariance) are proven in the research
notes.

### Documentation & References

```yaml
# MUST READ — the authoritative contract.
- url: PRD.md §7.1–§7.3, §7.5, §7.8, §7.11  (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.1 = claude-code wraps @anthropic-ai/claude-agent-sdk; §7.2 = HarnessId 'pi'|'claude-code';
       §7.3 = the Harness interface (the target shape); §7.5 = harness MAY extend HarnessOptions;
       §7.8 = claude-code runs anthropic/* ONLY (the normalizeModel gate); §7.11 = hook adaptation.
  critical: §7.8 is the reason normalizeModel compares against the literal 'anthropic', not this.id.

# MUST READ — the file being renamed/reinterfaced (the entire change is here).
- file: src/harnesses/anthropic-provider.ts
  why: Holds the class (L83), id (L89), capabilities (L104), supports/requiresFeatures (L125/L135),
        initialize (L164 — reads sessionStore/sessionPersistence/sessionPath/sessionTtl), execute (L338),
        executeStreaming (private), registerMCPs, loadSkills, buildAgentSDKHooks, normalizeModel (L~893 —
        the spec.provider !== this.id bug), sessions. Rename to claude-code-harness.ts + reinterface.
  pattern: keep every SDK-wrapping line verbatim; change ONLY type annotations + id + normalizeModel gate.
  gotcha: normalizeModel's `spec.provider !== this.id` becomes always-true after id→'claude-code' →
          silent runtime break. MUST change to `!== "anthropic"`. (Scope Decision 1.)

# MUST READ — the Harness interface + Harness* types (target contract, shipped by P1.M1.T1.S1).
- file: src/types/harnesses.ts
  why: Defines Harness (L~232 — the interface to implement), HarnessId (L11), HarnessCapabilities,
        HarnessHookEvents, HarnessRequest, HarnessExecutionOptions, ToolExecutionRequest,
        ToolExecutionResult, ModelSpec, HarnessOptions (SLIMMED — no session fields).
  pattern: import type { Harness, HarnessId, HarnessCapabilities, HarnessRequest, HarnessHookEvents,
           ToolExecutionRequest, ToolExecutionResult, ModelSpec, HarnessOptions } from "../types/harnesses.js"
  gotcha: HarnessOptions omits session fields → ClaudeCodeHarnessOptions must extend it. (Scope Decision 2.)

# MUST READ — the deprecated alias shim (P1.M1.T3.S1) + SessionState.
- file: src/types/providers.ts
  why: Confirms ProviderRequest===HarnessRequest, ProviderHookEvents===HarnessHookEvents, ProviderCapabilities
        ===HarnessCapabilities, ToolExecutor===(req)=>Promise<ToolExecutionResult> (aliases — so the body is
        runtime-identical after the type swap). SessionState is KEPT CONCRETE here (Bucket C, Anthropic-SDK
        shaped) — import it from here for the session-store logic. ProviderOptions is the deprecated superset
        (fallback for initialize typing if ClaudeCodeHarnessOptions is undesired).
  gotcha: SessionState stays imported from providers.js (NOT swapped — adapter-internal concrete type).

# MUST READ — the consumer/integration analysis (confirms this is a rename, not a rewrite).
- file: plan/004_9a50e71828f4/docs/consumer-analysis.md
  why: §1 documents anthropic-provider.ts end-to-end and confirms execute() ALREADY matches §7.3 (only type
        names change). §"Key Integration Seams" #1 shows the exact execute() old→new signature. §"Start Here"
        names anthropic-provider.ts as the ClaudeCodeHarness basis.
  critical: §1 confirms the rename is mechanical; the SDK wrapping is preserved verbatim.

# MUST READ — this task's breakage map (the exact file set + why the barrels/integration test are forced).
- file: plan/004_9a50e71828f4/P2M1T1S1/research/breakage-map.md
  why: §1 = the 2 barrels that break lint (path fix). §2a = the 13 tests that break (12 unit + 1 integration).
        §2b = the suites that use LOCAL MOCKS and stay green UNCHANGED (agent.test.ts, provider-switching,
        provider-lifecycle, harness-registry, provider-alias-shim, provider-interface). §3 = consumers kept
        green by structural assignability (agent.ts, registry). §4 = the exact touched-file list.

# MUST READ — the type-swap table + the ClaudeCodeHarnessOptions bivariance proof.
- file: plan/004_9a50e71828f4/P2M1T1S1/research/type-swap-and-options.md
  why: §1 = the exact old→new type swap table. §2 = the ClaudeCodeHarnessOptions definition + the TS-verified
        proof it satisfies implements Harness. §3 = why execute/executeStreaming/buildAgentSDKHooks bodies
        stay verbatim. §4 = the alias export.

# MUST READ — the normalizeModel bug + fix + test-message updates.
- file: plan/004_9a50e71828f4/P2M1T1S1/research/normalize-model-fix.md
  why: The one behavioral edit. Shows the exact new normalizeModel body + which test assertions change.

# MUST READ — the Role A/B test-replacement rule (CRITICAL: 'anthropic' means two different things).
- file: plan/004_9a50e71828f4/P2M1T1S1/research/test-rename-rules.md
  why: Role A (harness id/registry/this.id-derived metadata) → CHANGE to 'claude-code'. Role B (ModelSpec.
        provider / model strings) → KEEP 'anthropic'. Getting this wrong breaks ~20 assertions. Includes the
        per-file mechanical change set + the integration-test minimal fix.

# SHOULD READ — the registry (consumer; structural assignability proof).
- file: src/harnesses/harness-registry.ts
  why: register(provider: Provider) keys by provider.id (L193-201). After rename, ClaudeCodeHarness registers
        under 'claude-code'. ClaudeCodeHarness is structurally assignable to Provider (id 'claude-code' ∈
        ProviderId superset; method params are alias-identical) → registry compiles UNCHANGED.
  gotcha: DO NOT edit the registry — default registration is S2's job. Its JSDoc 'anthropic' examples are
          cosmetic comments (optional to update).

# SHOULD READ — agent.ts (consumer; kept green, owned by P3.M1).
- file: src/core/agent.ts
  why: Stores this.provider: Provider (L91), resolved via registry.get(effectiveProvider) (L120). Does NOT
        import the class. Because ClaudeCodeHarness is assignable to Provider, agent.ts compiles UNCHANGED.
  gotcha: DO NOT edit agent.ts — the harness/provider rewire is P3.M1.T1/T2. (Same boundary as P1.M2.T2.S1
          / P1.M3.T1.S1.)
```

### Current Codebase tree (relevant slice — verified in working tree)

```bash
src/harnesses/
├── anthropic-provider.ts   # ← RENAME → claude-code-harness.ts + REINTERFACE (the core change)
├── harness-registry.ts     # untouched (consumer; structural assignability; defaults owned by S2)
├── index.ts                # untouched (re-exports HarnessRegistry + session stores; does NOT re-export the adapter class)
├── opencode-provider.ts    # untouched (deleted in P4.M1; has cosmetic AnthropicProvider comments)
└── session-store.ts        # untouched (MemorySessionStore/FileSessionStore/SessionStore — used verbatim)
src/types/
├── harnesses.ts            # untouched — IMPORT the Harness* types from here (shipped by P1.M1.T1)
├── providers.ts            # untouched — IMPORT SessionState from here (Bucket C); alias shim reference
└── index.ts                # ← MODIFY line 52 (forced barrel path fix)
src/core/
└── agent.ts                # untouched (consumer; owned by P3.M1; kept green by structural assignability)
src/index.ts                # ← MODIFY line 117 (forced barrel path fix)
src/__tests__/unit/providers/
├── anthropic-provider.test.ts            # ← RENAME → claude-code-harness.test.ts + update
├── anthropic-provider-execute.test.ts    # ← RENAME + update (id/agentId/metadata.provider assertions)
├── anthropic-provider-initialize.test.ts # ← RENAME + update (registry 'anthropic'→'claude-code')
├── anthropic-provider-hooks.test.ts      # ← RENAME + update
├── anthropic-provider-loadskills.test.ts # ← RENAME + update
├── anthropic-provider-normalizemodel.test.ts # ← RENAME + update (error-message assertions; KEEP result.provider)
├── anthropic-provider-registermcps.test.ts# ← RENAME + update
├── anthropic-provider-sessionconfig.test.ts # ← RENAME + update
├── anthropic-provider-sessions.test.ts   # ← RENAME + update (id assertion L460)
├── anthropic-provider-sessionstore.test.ts# ← RENAME + update
├── anthropic-provider-supports.test.ts   # ← RENAME + update
├── anthropic-provider-terminate.test.ts  # ← RENAME + update (registry refs)
├── harness-registry.test.ts              # untouched (local createMockProvider stubs)
├── provider-lifecycle.test.ts            # untouched (local mock factory)
└── provider-alias-shim.test.ts           # untouched (type-only alias assertions)
src/__tests__/integration/
└── provider-agent.test.ts                # ← MODIFY (forced: import path + 'anthropic'→'claude-code' + default cfg)
```

### Desired Codebase tree with files to be added/changed

```bash
src/harnesses/claude-code-harness.ts                 # RENAMED from anthropic-provider.ts + REINTERFACE
src/types/index.ts                                   # MODIFY line 52 (path + dual export)
src/index.ts                                         # MODIFY line 117 (path + dual export)
src/__tests__/unit/providers/claude-code-harness-*.test.ts   # 12 RENAMED + updated unit tests
src/__tests__/integration/provider-agent.test.ts     # MODIFY (forced minimal fix)
# (anthropic-provider.ts + anthropic-provider-*.test.ts REMOVED via git mv. Everything else untouched.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — normalizeModel: compare against the LITERAL 'anthropic', NOT this.id.
//   After id→'claude-code', `spec.provider !== this.id` is ALWAYS true (no model provider equals a harness
//   id) → normalizeModel throws on every call → every execute() fails at model resolution (silent runtime
//   break, compiles fine). Change to `spec.provider !== "anthropic"` (PRD §7.8). (Scope Decision 1 +
//   research/normalize-model-fix.md.)

// CRITICAL #2 — initialize needs the session fields. HarnessOptions is SLIMMED (no sessionStore/
//   sessionPersistence/sessionTtl/sessionPath). Typing initialize(options?: HarnessOptions) breaks the body.
//   Define ClaudeCodeHarnessOptions extends HarnessOptions with the 4 fields; type the param as it. Verified
//   to satisfy implements Harness (method bivariance). (Scope Decision 2 + research/type-swap-and-options.md.)

// CRITICAL #3 — renaming the source file BREAKS the 2 barrels (src/types/index.ts:52, src/index.ts:117)
//   because they export by FILE PATH. Update both to claude-code-harness.js + export ClaudeCodeHarness AND
//   the AnthropicProvider alias. Skipping this fails `npm run lint` (cannot find module). (breakage-map §1.)

// CRITICAL #4 — the integration test provider-agent.test.ts BREAKS (registers under 'claude-code', looks up
//   'anthropic'). It's the only non-unit test using the REAL class. Minimal forced fix keeps npm test green.
//   (breakage-map §2a + test-rename-rules.md "Integration test".)

// GOTCHA #5 — 'anthropic' means TWO things in the tests. Role A (harness id / registry key / this.id-derived
//   metadata) → CHANGE to 'claude-code'. Role B (ModelSpec.provider / model strings) → KEEP 'anthropic'.
//   Inverting this breaks ~20 assertions. (research/test-rename-rules.md.)

// GOTCHA #6 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks the non-test
//   src/ (incl. claude-code-harness.ts, both barrels, registry, agent.ts). Test type errors won't fail lint
//   but WILL fail npm test if they break transpile. Run BOTH gates.

// GOTCHA #7 — isolatedModules: true. Use `import type { ... }` for the Harness*/ModelSpec/SessionState type
//   imports (the current file already does this for its type imports — keep the convention).

// GOTCHA #8 — src/types/index.ts does NOT re-export the Harness* types by name today (only AnthropicProvider
//   from ../harnesses/). Import the Harness* types DIRECTLY from '../types/harnesses.js' in claude-code-
//   harness.ts (matches the predecessor PRP convention; do NOT try to import them via types/index.js).

// GOTCHA #9 — ClaudeCodeHarness must stay ASSIGNABLE to Provider (the registry's register(p: Provider) param,
//   agent.ts's this.provider: Provider). It is: id 'claude-code' ∈ ProviderId superset; execute params are
//   alias-identical (ProviderRequest===HarnessRequest etc.); readonly id is narrower→wider assignable. So the
//   registry + agent compile UNCHANGED. DO NOT edit them. (breakage-map §3.)

// GOTCHA #10 — the streaming `metadata.provider: this.id` field: keep the field NAME 'provider' and the
//   assignment `provider: this.id` VERBATIM (contract: streaming logic verbatim). Its VALUE becomes
//   'claude-code'. This is a known semantic quirk (harness id under a 'provider'-named field) flagged for a
//   future cleanup — NOT changed here. Update the test assertion (events[0].metadata.provider) to 'claude-code'.

// GOTCHA #11 — DO NOT edit harness-registry.ts logic. Its JSDoc @example blocks still say 'anthropic'/
//   AnthropicProvider — those are cosmetic comments; updating them is OPTIONAL and out of the green path.
//   Default-harness registration is S2.

// GOTCHA #12 — DO NOT edit agent.ts. The Agent↔harness rewire (harness field, cascade, HarnessRequest build,
//   cache-key threading) is P3.M1.T1/T2 + P1.M3.T1.S1. Editing it here collides with those tasks.
```

---

## Implementation Blueprint

### Data models and structure

One new exported interface (`ClaudeCodeHarnessOptions`) + the renamed class + the alias. No other data
model changes. All `Harness*` / `ModelSpec` / `SessionState` types are CONSUMED from existing files.

```ts
// claude-code-harness.ts — new adapter-internal options type (PRD §7.5 harness-specific extension)
import type { HarnessOptions } from "../types/harnesses.js";
import type { SessionStore } from "./session-store.js";
import type { SessionState } from "../types/providers.js";

export interface ClaudeCodeHarnessOptions extends HarnessOptions {
  sessionStore?: SessionStore<SessionState>;
  sessionPersistence?: "memory" | "file" | "redis";
  sessionTtl?: number;
  sessionPath?: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — clean tree. (Parallel P1.M3.T1.S1 touches src/cache/, NOT src/harnesses/.)
  - RUN: `grep -n "export interface Harness\b\|export type HarnessId" src/types/harnesses.ts` — expect hits
    (P1.M1.T1.S1 prerequisite). If absent, STOP.
  - RUN: `grep -n "export class AnthropicProvider implements Provider" src/harnesses/anthropic-provider.ts` —
    confirm the pre-rename state. If already ClaudeCodeHarness, re-evaluate (S1 may have landed).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before touching anything.

Task 1: RENAME + REINTERFACE src/harnesses/anthropic-provider.ts → src/harnesses/claude-code-harness.ts
  - RENAME: `git mv src/harnesses/anthropic-provider.ts src/harnesses/claude-code-harness.ts`.
  - IMPORTS (top of file): replace the `import type { Provider, ProviderId, ProviderCapabilities,
    ProviderOptions, ProviderRequest, ToolExecutor, ProviderHookEvents, ModelSpec, SessionState } from
    "../types/providers.js";` block with:
        import type {
          Harness, HarnessId, HarnessCapabilities, HarnessOptions,
          HarnessRequest, HarnessHookEvents,
          ToolExecutionRequest, ToolExecutionResult, ModelSpec,
        } from "../types/harnesses.js";
        import type { SessionState } from "../types/providers.js";
    (Keep the existing value imports: createSuccessResponse/createErrorResponse from ../types/agent.js;
     Tool/MCPServer/Skill from ../types/sdk-primitives.js; MemorySessionStore/FileSessionStore/SessionStore
     from ./session-store.js; MCPHandler from ../core/mcp-handler.js; parseModelSpec from ../utils/model-spec.js;
     readFile from fs/promises; join from path; StreamEvent from ../types/streaming.js; AgentResponse from
     ../types/agent.js — all UNCHANGED.)
  - ADD the ClaudeCodeHarnessOptions interface (see "Data models" above) immediately BEFORE the class decl,
    with its JSDoc (PRD §7.5).
  - CLASS DECL: `export class AnthropicProvider implements Provider {` → `export class ClaudeCodeHarness implements Harness {`.
  - ID: `readonly id: ProviderId = "anthropic";` → `readonly id: HarnessId = "claude-code";`.
  - CAPABILITIES: `readonly capabilities: ProviderCapabilities = { ... } satisfies ProviderCapabilities;` →
    `... satisfies HarnessCapabilities;` (field type annotation ProviderCapabilities → HarnessCapabilities).
  - supports/requiresFeatures: `keyof ProviderCapabilities` → `keyof HarnessCapabilities` (both methods).
  - INITIALIZE: `async initialize(options?: ProviderOptions): Promise<void>` →
    `async initialize(options?: ClaudeCodeHarnessOptions): Promise<void>`. BODY UNCHANGED (every
    options?.sessionX still resolves because ClaudeCodeHarnessOptions has them).
  - EXECUTE signature:
        execute<T>(
          request: HarnessRequest,                                    // was ProviderRequest
          toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,  // was ToolExecutor
          hooks?: HarnessHookEvents,                                  // was ProviderHookEvents
        ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>
    BODY UNCHANGED.
  - EXECUTESTREAMING (private): same 3 param-type swaps (HarnessRequest / inline toolExecutor /
    HarnessHookEvents). BODY UNCHANGED.
  - BUILDAGENTSDKHOOKS (private): `hooks?: ProviderHookEvents` → `hooks?: HarnessHookEvents`. The gnarly
    conditional return type is UNCHANGED (it references the SDK types, not the swapped ones). BODY UNCHANGED.
  - NORMALIZEMODEL — THE ONE BEHAVIORAL FIX (see Scope Decision 1):
        const spec = parseModelSpec(model, "anthropic");   // default already 'anthropic' — KEEP
        if (spec.provider !== "anthropic") {                // WAS `!== this.id` — MUST change
          throw new Error(
            `Cannot normalize ${spec.provider}/${spec.model} with ClaudeCodeHarness. ` +
            `The claude-code harness only supports anthropic/* models (PRD §7.8). ` +
            `Use HarnessRegistry to select a harness that supports the '${spec.provider}' provider.`,
          );
        }
        return spec;
  - DEPRECATED ALIAS — append at END of file (after the closing class brace):
        /**
         * @deprecated Since v1.2. Use {@link ClaudeCodeHarness}. Renamed as part of the
         * Harness/Provider split (PRD §7). Identity preserved for backward compatibility.
         */
        export const AnthropicProvider = ClaudeCodeHarness;
  - FILE-HEADER JSDoc: update the title (`Anthropic provider implementation` → `Claude Code harness`) and
    the @example (`new AnthropicProvider()` → `new ClaudeCodeHarness()`). Cosmetic but consistent.
  - VERIFY: `grep -n "implements Harness\|readonly id: HarnessId\|spec.provider !== \"anthropic\"\|AnthropicProvider = ClaudeCodeHarness" src/harnesses/claude-code-harness.ts` → 4 hits.
  - VERIFY: `grep -n "implements Provider\|ProviderId\|ProviderRequest\|ProviderHookEvents\|ProviderCapabilities\|ToolExecutor" src/harnesses/claude-code-harness.ts` → 0 hits (all swapped).

Task 2: FIX the 2 barrels (forced — npm run lint depends on this)
  - src/types/index.ts:52 — replace:
        export { AnthropicProvider } from '../harnesses/anthropic-provider.js';
    with:
        export { ClaudeCodeHarness, AnthropicProvider } from '../harnesses/claude-code-harness.js';
  - src/index.ts:117 — replace:
        export { AnthropicProvider } from './harnesses/anthropic-provider.js';
    with:
        export { ClaudeCodeHarness, AnthropicProvider } from './harnesses/claude-code-harness.js';
  - (AnthropicProvider resolves to the alias exported from claude-code-harness.ts.)
  - DO NOT add other Harness-surface exports here (that is P3.M3.T1.S1).

Task 3: RENAME + UPDATE the 12 unit tests  (per research/test-rename-rules.md)
  For EACH file in {anthropic-provider.test, anthropic-provider-execute.test, anthropic-provider-initialize.test,
    anthropic-provider-hooks.test, anthropic-provider-loadskills.test, anthropic-provider-normalizemodel.test,
    anthropic-provider-registermcps.test, anthropic-provider-sessionconfig.test, anthropic-provider-sessions.test,
    anthropic-provider-sessionstore.test, anthropic-provider-supports.test, anthropic-provider-terminate.test}:
  - RENAME: `git mv src/__tests__/unit/providers/anthropic-provider-<x>.test.ts src/__tests__/unit/providers/claude-code-harness-<x>.test.ts`.
  - IMPORT PATH: `'../../../harnesses/anthropic-provider.js'` → `'../../../harnesses/claude-code-harness.js'`.
  - IMPORT SYMBOL: `import { AnthropicProvider }` → `import { ClaudeCodeHarness }`.
  - TYPES + CONSTRUCTION: `AnthropicProvider` → `ClaudeCodeHarness` everywhere (let/const/return types, `new`).
  - ROLE A replacements ('anthropic' → 'claude-code'): harness `.id` assertions, registry ops
    (`registry.get/has/initializeProvider/isReady/getStatus('anthropic')`), and `this.id`-derived metadata
    (`response.metadata.agentId`, streaming `events[0].metadata.provider`). Exact lines in
    research/test-rename-rules.md §"Role A".
  - ROLE B PRESERVED ('anthropic' stays): `expect(result.provider).toBe('anthropic')` and
    `{ provider: 'anthropic', ... }` literals in normalizeModel tests; all model strings
    (`'claude-sonnet-4'`, `'anthropic/claude-opus-4-...'`).
  - NORMALIZEMODEL FILE ONLY: update error-message assertions —
      `toThrow(/Cannot normalize opencode\/gpt-4 with AnthropicProvider/)` → `/...with ClaudeCodeHarness/`;
      `toContain('AnthropicProvider')` → `toContain('ClaudeCodeHarness')`;
      `toContain('ProviderRegistry')` → `toContain('HarnessRegistry')`;
      `toThrow(/ProviderRegistry\.get\('opencode'\)/)` → a regex matching the new HarnessRegistry message.
    (research/normalize-model-fix.md.) The provider-mismatch tests still THROW — only expected text changes.
  - DESCRIBE titles (cosmetic): `describe('AnthropicProvider...')` → `describe('ClaudeCodeHarness...')`.
  - VERIFY after all 12: `npx vitest run src/__tests__/unit/providers/claude-code-harness-*.test.ts` → all pass.

Task 4: FIX the integration test src/__tests__/integration/provider-agent.test.ts (forced — npm test green)
  - IMPORT PATH (L20): `'../../harnesses/anthropic-provider.js'` → `'../../harnesses/claude-code-harness.js'`;
    symbol `AnthropicProvider` → `ClaudeCodeHarness` (the alias also works, but use the new name).
  - createMockProvider (L87-88): `Promise<AnthropicProvider>` → `Promise<ClaudeCodeHarness>`;
    `new AnthropicProvider()` → `new ClaudeCodeHarness()`.
  - EVERY `new Agent({ provider: 'anthropic' })` → `new Agent({ provider: 'claude-code' })` (~11 sites:
    L157, 171, 199, 224, 248, 266, 288, 310, 362, 407, 423 — and the throw-test L157). The harness now
    registers under 'claude-code'.
  - "should create Agent without provider config (uses default)" test (L~177): the global default after
    resetGlobalConfig() is still 'anthropic' (legacy DEFAULT_PROVIDER_CONFIG), so add at the TOP of that test:
        configureProviders({ defaultProvider: 'claude-code' });
    and import `configureProviders` from '../../utils/provider-config.js' (add to the existing
    resetGlobalConfig import line). Then `new Agent({})` resolves 'claude-code' → found.
  - No metadata-VALUE assertions change here (the file only asserts toHaveProperty('agentId')).
  - VERIFY: `npx vitest run src/__tests__/integration/provider-agent.test.ts` → 33 pass.

Task 5: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: grep (contract), npm run lint, npm test, npm run build, git status.
  - ANY lint failure naming claude-code-harness.ts → check the type swaps (import type from
    ../types/harnesses.js) or a missed Provider* reference. ANY lint failure naming a barrel → path not
    updated. ANY test failure in a renamed file → Role A/B rule mis-applied (re-read GOTCHA #5) or a missed
    normalizeModel error-message assertion.
```

### Implementation Patterns & Key Details

```ts
// === The class declaration + id + capabilities (claude-code-harness.ts) ===
export class ClaudeCodeHarness implements Harness {
  readonly id: HarnessId = "claude-code";
  readonly capabilities: HarnessCapabilities = {
    mcp: true, skills: true, lsp: true, streaming: true, sessions: true, extendedThinking: true,
  } satisfies HarnessCapabilities;

  supports(capability: keyof HarnessCapabilities): boolean { return this.capabilities[capability]; }
  requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean { return features.every(f => this.capabilities[f]); }

  async initialize(options?: ClaudeCodeHarnessOptions): Promise<void> { /* BODY UNCHANGED */ }

  execute<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> { /* BODY UNCHANGED */ }

  // ... executeStreaming / registerMCPs / loadSkills / buildSystemPromptWithSkills /
  //     buildAgentSDKHooks / createSession / getSession / deleteSession — BODIES UNCHANGED ...

  normalizeModel(model: string): ModelSpec {
    const spec = parseModelSpec(model, "anthropic");
    if (spec.provider !== "anthropic") {            // ← THE FIX (was `!== this.id`)
      throw new Error(
        `Cannot normalize ${spec.provider}/${spec.model} with ClaudeCodeHarness. ` +
        `The claude-code harness only supports anthropic/* models (PRD §7.8). ` +
        `Use HarnessRegistry to select a harness that supports the '${spec.provider}' provider.`,
      );
    }
    return spec;
  }
}

/** @deprecated Since v1.2. Use {@link ClaudeCodeHarness}. */
export const AnthropicProvider = ClaudeCodeHarness;
```

### Integration Points

```yaml
SOURCE (RENAME + REINTERFACE):
  - src/harnesses/anthropic-provider.ts → src/harnesses/claude-code-harness.ts :
      implements Harness; id 'claude-code'; Harness* type swaps; ClaudeCodeHarnessOptions;
      normalizeModel `!== "anthropic"`; deprecated AnthropicProvider alias.

BARRELS (forced path fix):
  - src/types/index.ts:52 : export { ClaudeCodeHarness, AnthropicProvider } from '../harnesses/claude-code-harness.js';
  - src/index.ts:117      : export { ClaudeCodeHarness, AnthropicProvider } from './harnesses/claude-code-harness.js';

TESTS (RENAME + UPDATE):
  - src/__tests__/unit/providers/anthropic-provider-*.test.ts (×12) → claude-code-harness-*.test.ts
      (Role A 'anthropic'→'claude-code'; Role B preserved; normalizeModel error-message assertions updated).

TESTS (forced minimal fix):
  - src/__tests__/integration/provider-agent.test.ts : import path + id refs + default cfg.

CONSUMERS (kept green — NO source edits):
  - src/harnesses/harness-registry.ts : register(p: Provider) accepts ClaudeCodeHarness (structurally
      assignable). Defaults owned by S2. JSDoc 'anthropic' examples are cosmetic (optional update).
  - src/core/agent.ts                 : this.provider: Provider; resolves via registry. Owned by P3.M1.

NOT IN SCOPE (do not touch — owned downstream):
  - HarnessRegistry default registration + anthropic-only enforcement at registry layer   → S2
  - agent.ts harness rewire (harness field, cascade, HarnessRequest, cache-key threading)  → P3.M1
  - AgentConfig.harness / PromptOverrides.harness fields                                    → P3.M2
  - Full Harness-surface public export in src/index.ts                                     → P3.M3.T1.S1
  - OpenCodeProvider deletion                                                               → P4.M1
  - Cross-harness parity tests                                                              → P4.M2
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates non-test `src/`
> INCLUDING `claude-code-harness.ts`, both barrels, `harness-registry.ts`, `agent.ts`). `npm test` =
> `vitest run` (esbuild transpile-only; the 12 renamed unit suites + the integration suite + everything
> else). `npm run build` = `tsc` (emits `dist/`). No eslint/prettier. **Run BOTH lint and test** — lint
> proves the source/barrels compile; test proves behavior + the Role A/B replacements.

### Level 1: Syntax & Type Check (run after Tasks 1–2)

```bash
# Non-test type check — proves claude-code-harness.ts compiles, the 2 barrels resolve, registry + agent
# still compile (structural assignability holds).
npm run lint
# Expected: exit 0. An error naming claude-code-harness.ts = a missed Provider* type, a bad type import
# (use `import type`, from '../types/harnesses.js'), or normalizeModel still using `!== this.id`. An error
# naming src/types/index.ts or src/index.ts = barrel path not updated (Task 2). An error naming agent.ts or
# harness-registry.ts = structural assignability broke (re-read GOTCHA #9 — ClaudeCodeHarness must stay
# assignable to Provider; do NOT narrow anything that breaks it).
```

### Level 2: Unit Tests (run after Task 3)

```bash
# The 12 renamed suites
npm test -- src/__tests__/unit/providers/claude-code-harness-
# Expected: all pass. A failure in normalizemodel = Role B mis-treated (result.provider must STAY
# 'anthropic') OR an error-message assertion not updated. A failure elsewhere = a Role A 'anthropic' was
# left as 'anthropic' (id/registry/agentId/metadata.provider) — re-read GOTCHA #5.

# The integration suite (after Task 4)
npm test -- src/__tests__/integration/provider-agent.test.ts
# Expected: 33 pass. A failure = a `provider: 'anthropic'` not changed to 'claude-code', or the "uses
# default" test missing the configureProviders({defaultProvider:'claude-code'}) call.

# Full suite (catch any ripple — the mock-based suites must stay green)
npm test
# Expected: all pass. If a mock-based suite (agent.test.ts, provider-switching, provider-lifecycle,
# harness-registry, provider-alias-shim, provider-interface) regressed, you accidentally touched it — revert.
```

### Level 3: Contract Verification (grep gates)

```bash
# Class is ClaudeCodeHarness implements Harness; id is 'claude-code'; alias exported; normalizeModel fixed:
grep -n "class ClaudeCodeHarness implements Harness\|readonly id: HarnessId = \"claude-code\"\|AnthropicProvider = ClaudeCodeHarness" src/harnesses/claude-code-harness.ts
# Expected: 3 hits.

# normalizeModel compares against the literal 'anthropic' (NOT this.id):
grep -n 'spec.provider !== "anthropic"' src/harnesses/claude-code-harness.ts
# Expected: 1 hit. Then confirm the old form is GONE:
! grep -n 'spec.provider !== this.id' src/harnesses/claude-code-harness.ts   # Expected: no match (exit 1).

# No legacy Provider* type references remain in the source:
! grep -nE 'implements Provider\b|: ProviderId|ProviderRequest|ProviderHookEvents|ProviderCapabilities|\bToolExecutor\b|: ProviderOptions' src/harnesses/claude-code-harness.ts
# Expected: no match (exit 1). (SessionState import from providers.js is EXPECTED — GOTCHA #8 — that's not a
# legacy Provider* type, it's the kept-concrete session type. If the grep flags the SessionState import line,
# that's a false positive; verify it's only `import type { SessionState }`.)

# ClaudeCodeHarnessOptions extends HarnessOptions with the 4 session fields:
grep -n "ClaudeCodeHarnessOptions extends HarnessOptions" src/harnesses/claude-code-harness.ts
grep -nE 'sessionStore\?|sessionPersistence\?|sessionTtl\?|sessionPath\?' src/harnesses/claude-code-harness.ts
# Expected: 1 + 4 hits.

# The 2 barrels export both names from the new path:
grep -n "claude-code-harness.js" src/types/index.ts src/index.ts
# Expected: 1 hit each, both exporting { ClaudeCodeHarness, AnthropicProvider }.

# Old files are gone (git mv), new test files exist:
! ls src/harnesses/anthropic-provider.ts src/__tests__/unit/providers/anthropic-provider-*.test.ts 2>/dev/null
ls src/__tests__/unit/providers/claude-code-harness-*.test.ts | wc -l   # Expected: 12

# Exactly the expected file set changed:
git status --short
# Expected: renamed anthropic-provider.ts→claude-code-harness.ts; 12 renamed test files;
# modified src/types/index.ts, src/index.ts, src/__tests__/integration/provider-agent.test.ts.
# (agent.ts, harness-registry.ts, harnesses/index.ts, opencode-provider.ts, session-store.ts, types/* — UNTOUCHED.)
```

### Level 4: Behavioral Spot-Check (the normalizeModel fix)

```bash
# Confirm claude-code models still normalize (happy path unchanged) and non-anthropic still rejected
# (with the NEW message), via the renamed unit suite's normalizemodel cases:
npx vitest run src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts
# Expected: all pass — 'claude-sonnet-4' → {provider:'anthropic',...}; 'anthropic/claude-opus-4' → ok;
# 'opencode/gpt-4' → throws /Cannot normalize opencode\/gpt-4 with ClaudeCodeHarness/ (NOT AnthropicProvider).

# Quick runtime identity check:
npx tsx -e '
  import { ClaudeCodeHarness, AnthropicProvider } from "./src/harnesses/claude-code-harness.js";
  const h = new ClaudeCodeHarness();
  console.log("id            :", h.id);                  // claude-code
  console.log("alias === cls :", AnthropicProvider === ClaudeCodeHarness);  // true
  console.log("implements exe:", typeof h.execute === "function");          // true
  console.log("norm happy    :", JSON.stringify(h.normalizeModel("claude-sonnet-4"))); // provider:anthropic
  try { h.normalizeModel("openai/gpt-4o"); console.log("norm non-ant   : NO THROW (BUG)"); }
  catch (e) { console.log("norm non-ant   : threw ->", /ClaudeCodeHarness/.test(e.message) ? "msg OK" : "msg WRONG"); }
'
# Expected: id 'claude-code'; alias === cls true; implements exe true; norm happy provider:anthropic;
#           norm non-ant threw -> msg OK.
```

### Level 5: Build (declaration-emit sanity)

```bash
npm run build
# Expected: exit 0; dist/harnesses/claude-code-harness.{js,d.ts} emitted; dist/harnesses/anthropic-provider.*
# GONE (the old .d.ts should no longer be generated). dist/types/index.d.ts + dist/index.d.ts show both
# ClaudeCodeHarness + AnthropicProvider re-exported from claude-code-harness.js.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` exits 0 (claude-code-harness.ts + both barrels + registry + agent.ts all compile).
- [ ] `npm test` exits 0 (12 renamed unit suites + integration suite + all mock-based suites pass).
- [ ] `npm run build` exits 0; `dist/harnesses/claude-code-harness.{js,d.ts}` emitted; old file gone.
- [ ] `git status --short` shows: 1 renamed source + 12 renamed tests + 3 modified (2 barrels + integration).

### Feature Validation

- [ ] `ClaudeCodeHarness implements Harness`; `readonly id: HarnessId = "claude-code"`.
- [ ] `AnthropicProvider = ClaudeCodeHarness` deprecated alias exported.
- [ ] `normalizeModel` compares `spec.provider !== "anthropic"` (NOT `!== this.id`); happy path unchanged;
      non-anthropic rejected with a `ClaudeCodeHarness`/`HarnessRegistry` message.
- [ ] `execute`/`executeStreaming`/`buildAgentSDKHooks` use `HarnessRequest`/`HarnessHookEvents`/inline
      toolExecutor with UNCHANGED bodies (Level 4 spot-check).
- [ ] `ClaudeCodeHarnessOptions extends HarnessOptions` with the 4 session fields; `initialize` body verbatim.
- [ ] Both barrels export `ClaudeCodeHarness` + `AnthropicProvider` from `claude-code-harness.js`.
- [ ] The 12 unit tests renamed + pass (Role A→'claude-code', Role B preserved).

### Code Quality Validation

- [ ] `import type` used for all Harness*/ModelSpec/SessionState imports (isolatedModules).
- [ ] Only the ONE permitted behavioral edit (normalizeModel gate); everything else is type/name/identity.
- [ ] Deprecated alias carries a `@deprecated Since v1.2` JSDoc pointing at `ClaudeCodeHarness`.
- [ ] File-header JSDoc + describe-block titles updated to Claude Code vocabulary (cosmetic consistency).
- [ ] No edits to `agent.ts`, `harness-registry.ts`, `harnesses/index.ts`, `opencode-provider.ts`,
      `session-store.ts`, or any mock-based test suite.

### Documentation & Deployment

- [ ] No new environment variables; no dependency changes; no config-file changes.
- [ ] The deprecated alias documents the v1.2 Harness/Provider split (PRD §7) for migrating consumers.

---

## Anti-Patterns to Avoid

- ❌ **Don't leave `normalizeModel` comparing `!== this.id`.** After id→'claude-code' it is always true →
  throws on every call → silent runtime death. Compare against the literal `"anthropic"` (PRD §7.8).
  (Scope Decision 1 + research/normalize-model-fix.md.)
- ❌ **Don't type `initialize(options?: HarnessOptions)`.** The body reads session fields HarnessOptions
  omits → type error. Use `ClaudeCodeHarnessOptions extends HarnessOptions` (verified to satisfy
  `implements Harness` via method bivariance). (Scope Decision 2 + research/type-swap-and-options.md.)
- ❌ **Don't rename the source file without fixing the 2 barrels.** They export by FILE PATH →
  `npm run lint` fails (cannot find module). (GOTCHA #3 + breakage-map §1.)
- ❌ **Don't forget the integration test.** It's the only non-unit test using the real class; after the id
  change it registers under 'claude-code' but looks up 'anthropic' → 33 failures. Minimal forced fix.
  (GOTCHA #4 + breakage-map §2a.)
- ❌ **Don't blanket-replace `'anthropic'` → `'claude-code'` in the tests.** Role B occurrences
  (`result.provider`, model strings) MUST stay `'anthropic'` (ModelSpec.provider is the LLM-host axis,
  unchanged). Only Role A (harness id/registry/this.id-derived metadata) changes. (GOTCHA #5 +
  research/test-rename-rules.md.)
- ❌ **Don't edit `agent.ts` or `harness-registry.ts`.** agent.ts is P3.M1's domain; the registry's default
  registration is S2's. ClaudeCodeHarness stays structurally assignable to `Provider`, so both compile
  unchanged. (GOTCHA #9/#11/#12 + breakage-map §3.)
- ❌ **Don't change the SDK-wrapping bodies.** `query`, `createSdkMcpServer`, `buildAgentSDKHooks`,
  `streamInput` resume, sessions, MCP registration, skills loading — all VERBATIM. Only type annotations
  + the harness identity + the normalizeModel gate change. (Contract: "Keep ALL SDK wrapping logic verbatim.")
- ❌ **Don't touch the streaming `metadata.provider: this.id` field name.** Keep it `provider: this.id`
  (verbatim); its value becomes 'claude-code'. The semantic quirk is flagged for later, NOT fixed here.
- ❌ **Don't add Harness-surface exports to the barrels beyond the path fix + ClaudeCodeHarness.** The full
  public-API Harness export is P3.M3.T1.S1. This task only fixes the broken path + adds the new symbol.
- ❌ **Don't run only `npm test`.** It uses esbuild transpile-only and won't catch a type error in the
  source/barrels. Run `npm run lint` too (it type-checks the non-test `src/`).

---

## Hand-off Notes for Downstream Tasks

- **P2.M1.T1.S2 (register default harnesses + anthropic-only enforcement):** `ClaudeCodeHarness` is now
  `implements Harness` with id `'claude-code'`, structurally assignable to `Provider`, so
  `HarnessRegistry.register(new ClaudeCodeHarness())` works. The anthropic-only model constraint is ALREADY
  enforced inside `ClaudeCodeHarness.normalizeModel` (`spec.provider !== "anthropic"` → throws) per PRD §7.8;
  S2's "enforce anthropic-only" can rely on this and/or add a registry-layer guard. The `ClaudeCodeHarnessOptions`
  type is exported for any registry/Agent that needs to construct harness options with session config.
- **P3.M1 (Agent harness rewire):** the Agent will resolve `HarnessRegistry.get('claude-code')` → a `Harness`
  and call `harness.execute(HarnessRequest, toolExecutor, hooks)`. The signature now matches §7.3 exactly.
  The `provider` axis for the cache key (P1.M3.T1.S1) comes from `harness.normalizeModel(model).provider`
  (`'anthropic'`), NOT from `harness.id` (`'claude-code'`) — the two axes are independent.
- **P3.M3.T1.S1 (public API):** `ClaudeCodeHarness` + the deprecated `AnthropicProvider` alias are already
  re-exported from both barrels. You will add the broader Harness type surface; no conflict with this task's
  minimal path-fix edits.
- **P4.M1 (OpenCodeProvider removal):** independent. `opencode-provider.ts` has cosmetic
  `// Follow AnthropicProvider pattern` comments; updating them is optional and they disappear with the file.
- **Future cleanup (out of scope):** the streaming `metadata.provider: this.id` field reports a harness id
  under a `provider`-named field — semantically muddy post-split. Consider renaming to `harness` or setting
  it to `modelSpec.provider` in a follow-up. Not changed here (verbatim contract).

---

**Confidence Score: 9/10** — A well-bounded rename whose two non-obvious traps (the `normalizeModel`
`this.id` silent-break and the `ClaudeCodeHarnessOptions` bivariance) are spelled out with TS-verified
proofs, whose exact breakage set is grep-mapped (2 barrels + 13 tests, everything else mock-based and
untouched), and whose Role A/B test-replacement rule prevents the ~20 assertion mistakes a blanket
find-replace would cause. The -1 is residual risk the implementing agent skips the Scope Decision and either
leaves `normalizeModel` on `this.id` (caught by the normalizemodel test + Level 4 spot-check) or breaks the
integration test's default-config case (caught by the integration suite).
