# PRP — P2.M1.T1.S2: Enforce anthropic-only constraint (CONFIG_ERROR) + register default harnesses

**PRD reference:** §7.8 (`claude-code` runs `anthropic/*` only — "Requesting a non-Anthropic
provider on claude-code is a configuration error surfaced at initialize()/execute()"),
§7.1/§7.2 (claude-code harness, `HarnessId`), §7.3 (`Harness` interface), §7.6
(`HarnessRegistry`), §6.2 (`AgentErrorDetails.code` — the structured handle S2 produces).
**Plan:** `plan/004_9a50e71828f4/` — subtask 2 of P2.M1.T1. Consumes S1's `ClaudeCodeHarness`
class and `HarnessRegistry` (P1.M2.T1.S2). Unblocks `PiHarness` registration parity (P2.M3.T2.S3)
and Agent construction (P3.M1).
**Scope tag:** TWO focused changes. (1) Upgrade `ClaudeCodeHarness.normalizeModel`'s plain
`Error` → a structured `ConfigError` (`.code === 'CONFIG_ERROR'`) that `execute`/`executeStreaming`
propagate, and add `CONFIG_ERROR` to `AGENT_ERROR_CODES`. (2) New `src/harnesses/register-defaults.ts`
bootstrap helper that registers `ClaudeCodeHarness` (id `'claude-code'`) — idempotently. Plus 3
test files (1 new, 1 modified, 1 new) + 2 barrel/type touches.

> **READ THE "SCOPE DECISIONS" SECTION BEFORE WRITING CODE.** It explains the three non-obvious,
> load-bearing details: (1) S1 (running in parallel) ALREADY changed `normalizeModel` to compare
> `!== "anthropic"` but throws a plain `Error` — S2's job is to make the `.code` STRUCTURALLY
> accessible (not to re-fix the comparison); (2) `execute` enforces by PROPAGATION through its
> existing `normalizeModel()` call (no duplicate check — DRY), and there is NO swallowing
> try/catch; (3) `HarnessRegistry.register()` THROWS on duplicate, so `registerDefaultHarnesses`
> MUST guard with `has()` (idempotent) or it crashes when called twice.

---

## Goal

**Feature Goal:** Make the claude-code anthropic-only constraint (PRD §7.8) a **structured,
machine-readable** configuration error (`code: 'CONFIG_ERROR'`) thrown from
`ClaudeCodeHarness.normalizeModel` and surfaced through `execute`/`executeStreaming`, AND ship a
`registerDefaultHarnesses()` bootstrap helper that registers `ClaudeCodeHarness` (id `'claude-code'`)
into the `HarnessRegistry` idempotently — so the default claude-code harness is available for
lookup and PiHarness can be added later (P2.M3.T2.S3).

**Deliverable:**
1. **NEW `src/harnesses/register-defaults.ts`** — `export function registerDefaultHarnesses(registry
   = HarnessRegistry.getInstance()): HarnessRegistry`. Idempotently registers `new ClaudeCodeHarness()`
   under `'claude-code'` (guarded by `registry.has('claude-code')`). Includes a `TODO(P2.M3.T2.S3)`
   comment for PiHarness. (See Blueprint Task 1.)
2. **MODIFY `src/harnesses/claude-code-harness.ts`:**
   - **ADD** `export class ConfigError extends Error` (top-level) with `readonly code` (default
     `AGENT_ERROR_CODES.CONFIG_ERROR`) + optional `details`. (See Blueprint Task 2.)
   - **MODIFY `normalizeModel`**: change `throw new Error(message)` → `throw new ConfigError(message,
     { code: AGENT_ERROR_CODES.CONFIG_ERROR, details: { provider, model, harnessId: this.id } })`.
     **Message text IDENTICAL to S1's** (so S1's test assertions stay green). Comparison stays
     `spec.provider !== "anthropic"` (S1 already fixed this — DO NOT revert to `!== this.id`).
   - `execute`/`executeStreaming`: **NO body change** — they already call `normalizeModel` first
     (L409 / L641) with no swallowing try/catch, so the `ConfigError` propagates (= "execute throws").
     Add a one-line JSDoc note on `execute` documenting the propagation.
3. **MODIFY `src/types/agent.ts`**: add `CONFIG_ERROR: 'CONFIG_ERROR'` to the `AGENT_ERROR_CODES`
   `as const` object (additive — with JSDoc). (See Blueprint Task 3.)
4. **MODIFY `src/harnesses/index.ts`**: append `export { registerDefaultHarnesses } from './register-defaults.js';`.
   (NOT `src/index.ts` — public Harness-surface export is P3.M3.T1.S1.)
5. **TESTS** (3 files):
   - **NEW** `src/__tests__/unit/providers/register-defaults.test.ts` (Test 1).
   - **MODIFY** `src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts` — ADD
     `instanceof ConfigError` + `.code === CONFIG_ERROR` + `.details` assertions; KEEP all of S1's
     message-text assertions (Test 2).
   - **NEW** `src/__tests__/unit/providers/claude-code-harness-execute-config-error.test.ts` — proves
     `execute`/streaming surface `ConfigError` (SDK stubbed via `harness.sdk = {}`, never invoked)
     (Test 3).

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `claude-code-harness.ts` + `register-defaults.ts` +
   `agent.ts` + `harnesses/index.ts` all compile; no cycle (claude-code-harness → agent is one-way).
2. `npm test` exits 0 — the 3 new/modified test files pass; no other suite regresses (S1's renamed
   suites still green; mock-based suites untouched).
3. `npm run build` exits 0 — `dist/harnesses/register-defaults.{js,d.ts}` emitted; `ConfigError` in
   `dist/harnesses/claude-code-harness.{js,d.ts}`; `CONFIG_ERROR` in `dist/types/agent.{js,d.ts}`.
4. Contract verification (grep): `ConfigError extends Error`; normalizeModel throws `ConfigError`
   with `code: AGENT_ERROR_CODES.CONFIG_ERROR`; `CONFIG_ERROR` in `AGENT_ERROR_CODES`;
   `registerDefaultHarnesses` registers claude-code under a `has()` guard.

---

## ⚠️ SCOPE DECISIONS — three load-bearing details

The contract is a one-liner ("throw a config error code CONFIG_ERROR; add a register-defaults
helper"). Three things are NOT obvious and will cause a red build or silent runtime break if
missed. Read before editing.

### Decision 1 — S1 already fixed the COMPARISON; S2 makes the CODE structured

S1 (P2.M1.T1.S1, running in parallel — plan_status: Implementing) ALREADY:
- renamed the file `anthropic-provider.ts` → `claude-code-harness.ts`, class → `ClaudeCodeHarness`,
  `id` → `'claude-code'`;
- **fixed `normalizeModel`** to compare `spec.provider !== "anthropic"` (NOT `!== this.id` — the
  harness id `'claude-code'` is a different axis from the model provider; `!== this.id` would be
  always-true and throw on EVERY call = silent runtime death);
- throws a **plain `new Error(message)`** whose text mentions `ClaudeCodeHarness` + `HarnessRegistry`.

**S2's contribution is NOT to re-fix the comparison** (it's already correct) — **it is to upgrade
the thrown value from a plain `Error` to a structured `ConfigError` whose `.code === 'CONFIG_ERROR'`**
so Agent retry logic (P3.M1, PRD §11) can branch structurally instead of regex-matching message
text. The message string stays byte-for-byte identical so S1's updated `claude-code-harness-
normalizemodel.test.ts` assertions (`/Cannot normalize ... with ClaudeCodeHarness/`,
`toContain('HarnessRegistry')`) STILL PASS — S2 only ADDS `instanceof ConfigError` + `.code`
assertions. **S2 runs AFTER S1** (sequential), editing S1's output file.

### Decision 2 — `execute` enforces by PROPAGATION (no duplicate check)

The contract says "Update ClaudeCodeHarness.normalizeModel/**execute** to throw." Read literally
that implies a second provider check inside `execute`. **Do NOT add one.** `execute` already calls
`this.normalizeModel(request.options.model ?? "claude-sonnet-4-20250514")`:
- non-streaming: `claude-code-harness.ts` **L409** (inside the async IIFE returning
  `Promise<AgentResponse<T>>`);
- streaming: `executeStreaming` **L641** (inside the async generator, before the first `yield`).

**There is NO try/catch wrapping either normalizeModel call** (verified — the only
`createErrorResponse` sites in `execute` are the "missing result message" L551 and
"subtype !== success" L566; both are inline returns, not catches). So the `ConfigError` thrown by
`normalizeModel`:
- non-streaming → rejects the IIFE's promise → `execute()` returns a rejected `Promise` →
  "execute throws a clear config error (code CONFIG_ERROR)" ✓;
- streaming → throws on the first generator `.next()` (normalizeModel runs before the first yield).

A duplicate check in `execute` would be DRY-violating and risks the two gates drifting out of
sync. `normalizeModel` is the SINGLE enforcement point; `execute` inherits it. The new
`claude-code-harness-execute-config-error.test.ts` PROVES the propagation (Test 3) — that's how
"execute throws" is satisfied. (Add only a one-line JSDoc note on `execute` documenting this; no
body change.)

**Ordering caveat (acceptable, do not "fix"):** `execute` checks `if (!this.sdk) throw "SDK not
initialized"` (L376) BEFORE `normalizeModel` (L409). If the SDK is uninitialized AND the model is
non-anthropic, the SDK-init error wins. Initialization is a prerequisite; the contract mandates no
relative ordering. Tests stub `harness.sdk = {}` to reach the normalizeModel check.

### Decision 3 — `registerDefaultHarnesses` MUST be idempotent (registry throws on duplicate)

`HarnessRegistry.register()` (src/harnesses/harness-registry.ts) throws on duplicate:
```ts
if (this.providers.has(provider.id)) {
  throw new Error(`Provider '${provider.id}' is already registered`);
}
```
If `registerDefaultHarnesses()` is called twice (app startup + P3.M1 Agent construction, or
overlapping tests that don't perfectly reset), the **second call throws and crashes the process**.
→ **Guard every registration with `if (!registry.has(id))`**. This is the load-bearing detail of
the helper. It also future-proofs P2.M3.T2.S3 (PiHarness added with the same guard). Verified
design + type proofs in `research/register-defaults-design.md`.

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agents:
- **P3.M1** (Agent Harness Rewire) — calls `registerDefaultHarnesses()` (or relies on app entry
  having called it), then `registry.get('claude-code')`, and `catch (e instanceof ConfigError)` from
  `harness.execute()` to map it to an `AgentResponse` error (`code: CONFIG_ERROR`). S2 ships the
  helper + the structured error it catches.
- **P2.M3.T2.S3** — adds `PiHarness` (id `'pi'`) to this same `registerDefaultHarnesses()` helper
  (the `TODO` comment marks the spot).

**Use Case:** PRD §7.1/§7.8 — Claude Code is the Anthropic-ecosystem harness; it must refuse
non-anthropic models with a clear, structured config error, and it must be registered as a default
so `HarnessRegistry.get('claude-code')` resolves without each caller hand-registering it.

**Pain Points Addressed:** Today (post-S1) the constraint throws a plain `Error` identifiable only
by message text, and there's no default-registration path — every consumer must hand-register.
S2 makes the error machine-readable and ships the one-call bootstrap.

---

## Why

- **Realizes PRD §7.8 + §6.2** — a structured `CONFIG_ERROR` surfaced at execute, not a stringy
  `Error`.
- **Unblocks P3.M1 (Agent)** — Agent needs (a) `registerDefaultHarnesses()` to populate the
  registry and (b) a typed `ConfigError` to catch + remap. Without S2, P3.M1 would have to do both
  (scope creep / merge conflict).
- **Unblocks P2.M3 (PiHarness parity)** — the idempotent helper is the single place both default
  harnesses get registered.
- **Low-risk, additive, reversible.** The only behavioral change is `Error` → `ConfigError`
  (message preserved; `ConfigError extends Error`, so `instanceof Error` and existing
  `.message` consumers are unaffected). `CONFIG_ERROR` is an additive key. `register-defaults.ts`
  is a new explicit-call helper (no import side effects).

---

## What

1. **CREATE** `src/harnesses/register-defaults.ts` (Task 1).
2. **ADD** `ConfigError` class + **MODIFY** `normalizeModel` throw in `claude-code-harness.ts` (Task 2).
3. **ADD** `CONFIG_ERROR` to `AGENT_ERROR_CODES` in `src/types/agent.ts` (Task 3).
4. **MODIFY** `src/harnesses/index.ts` barrel (Task 4).
5. **TESTS** (Tasks 5–7): register-defaults.test.ts (new), normalizemodel.test.ts (modify),
   execute-config-error.test.ts (new).
6. **VALIDATE** (Task 8).

### Success Criteria

- [ ] `ConfigError extends Error` exported from `claude-code-harness.ts`; default `.code ===
      AGENT_ERROR_CODES.CONFIG_ERROR`.
- [ ] `normalizeModel` throws `new ConfigError(...)` for `spec.provider !== "anthropic"`; message
      text identical to S1's; `.details` = `{ provider, model, harnessId }`.
- [ ] `execute` (non-streaming) rejects with `ConfigError`; streaming throws on first `.next()`
      — both via the existing `normalizeModel` call (NO body change to execute logic).
- [ ] `CONFIG_ERROR: 'CONFIG_ERROR'` present in `AGENT_ERROR_CODES`.
- [ ] `registerDefaultHarnesses()` registers `ClaudeCodeHarness` under `'claude-code'`; is
      idempotent (calling twice does not throw); defaults to the singleton; accepts a custom
      registry; returns the registry; does NOT register `'pi'` (deferred).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S2 using only
(a) this PRP, (b) read-only access to `src/harnesses/claude-code-harness.ts` (S1's output — the
`normalizeModel` + `execute` regions), `src/harnesses/harness-registry.ts` (the registry API +
duplicate-throw), `src/types/agent.ts` (`AGENT_ERROR_CODES` + `AgentErrorDetails`), and the 3 test
files, plus (c) the copy-paste-ready snippets in the Blueprint + the three `research/*.md` notes.
The three non-obvious load-bearing details (S1-already-fixed-the-comparison, execute-propagates-
no-duplicate-check, registry-throws-on-duplicate) are proven in the research notes.

### Documentation & References

```yaml
# MUST READ — the authoritative contract.
- url: PRD.md §7.8, §6.2, §7.1, §7.3, §7.6  (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.8 = claude-code runs anthropic/* ONLY, "configuration error surfaced at initialize()/execute()"
       (THE constraint S2 enforces); §6.2 = AgentErrorDetails.code (the structured handle S2 produces);
       §7.1/§7.3 = the Harness ClaudeCodeHarness implements; §7.6 = HarnessRegistry (where defaults register).
  critical: §7.8 is WHY normalizeModel compares against the literal 'anthropic' (S1 already did this);
            S2's job is the structured CONFIG_ERROR code on top of that gate.

# MUST READ — S1's PRP (the CONTRACT for what exists when S2 begins; S2 runs AFTER S1).
- file: plan/004_9a50e71828f4/P2M1T1S1/PRP.md
  why: Defines ClaudeCodeHarness (id 'claude-code', implements Harness), the normalizeModel `!== "anthropic"`
       fix + its exact message text (which S2 MUST preserve byte-for-byte), ClaudeCodeHarnessOptions, and the
       deprecated AnthropicProvider alias. S2 edits S1's OUTPUT file (claude-code-harness.ts + the renamed
       normalizemodel test) — sequential, no merge conflict.
  critical: S1's normalizeModel message is the string S2 reuses verbatim in the ConfigError. Re-read S1's
            "Scope Decision 1" + "normalizeModel" task before editing.

# MUST READ — the file S2 modifies (S1's renamed output; the normalizeModel + execute regions).
- file: src/harnesses/claude-code-harness.ts
  why: normalizeModel at L1179 (the `throw new Error(...)` S2 upgrades to `throw new ConfigError(...)`);
        execute at L355 (calls normalizeModel at L409 inside the IIFE — NO swallowing try/catch);
        executeStreaming at L612 (calls normalizeModel at L641 before first yield). The createErrorResponse
        sites at L551/L566 are inline returns, NOT catches. Imports createSuccessResponse/createErrorResponse
        from ../types/agent.js at L51 (S2 adds AGENT_ERROR_CODES to that import).
  pattern: keep the SDK-wrapping logic verbatim; change ONLY the thrown value + add the ConfigError class.
  gotcha: DO NOT revert the comparison to `!== this.id` (S1 fixed it to `!== "anthropic"` — reverting
          re-introduces the silent always-throw runtime death).

# MUST READ — the registry (where register-defaults registers; the duplicate-throw gotcha).
- file: src/harnesses/harness-registry.ts
  why: getInstance() singleton; register(provider) THROWS on duplicate (L~193-201); has(id) / get(id);
        _resetForTesting() static + _resetInitStateForTesting() instance (test isolation). register's param
        is `Provider`; has/get take `ProviderId`.
  pattern: registerDefaultHarnesses MUST guard with `if (!registry.has(id))` (idempotent) — see Scope Decision 3.
  gotcha: register(provider: Provider) — ClaudeCodeHarness is structurally assignable to Provider (S1 GOTCHA #9);
          'claude-code' ∈ ProviderId (= HarnessId | 'anthropic' | 'opencode', providers.ts L40). Both compile.

# MUST READ — AGENT_ERROR_CODES + AgentErrorDetails (where CONFIG_ERROR is added + the code-vocabulary home).
- file: src/types/agent.ts
  why: AGENT_ERROR_CODES `as const` object (L610-653) — NO CONFIG_ERROR today (S2 adds it, additive).
        AgentErrorDetails.code is typed `string` (open) — a literal would compile, but the constant is the
        codebase convention (SCREAMING_SNAKE_CASE). agent.ts is a RUNTIME module (exports createSuccessResponse
        etc.) so adding CONFIG_ERROR is safe; ConfigError lives in claude-code-harness.ts (NOT here) to avoid
        bloating + keep the dependency one-way (claude-code-harness → agent).
  gotcha: Adding a key to an `as const` object literal is purely additive — no breakage.

# MUST READ — the bootstrap helper design (idempotency, default arg, barrel boundary, not-auto-called).
- file: plan/004_9a50e71828f4/P2M1T1S2/research/register-defaults-design.md
  why: The full registerDefaultHarnesses() implementation + the 4 design-choice rationales + type-check proofs
        (has('claude-code') compiles; register(new ClaudeCodeHarness()) compiles) + the barrel-export decision
        (src/harnesses/index.ts only, NOT src/index.ts — P3.M3.T1.S1 boundary).

# MUST READ — the ConfigError class + CONFIG_ERROR code decision (placement, no-cycle, message preservation).
- file: plan/004_9a50e71828f4/P2M1T1S2/research/config-error-design.md
  why: The exact ConfigError class body + why it lives in claude-code-harness.ts (not src/errors/ — none exists;
        src/types/error.ts is type-only) + why execute propagates rather than duplicate-checks.

# MUST READ — the test strategy (registry reset pattern, SDK-stub trick, exact assertions).
- file: plan/004_9a50e71828f4/P2M1T1S2/research/test-strategy.md
  why: The 3 test files verbatim + the SDK-stub insight (normalizeModel throws BEFORE query() so harness.sdk={}
        is never invoked — no vi.mock of the SDK module needed) + the registry-isolation afterEach.

# SHOULD READ — the existing SDK-stub pattern (confirms harness.sdk is settable at runtime).
- file: src/__tests__/unit/providers/claude-code-harness-execute.test.ts
  why: 10+ sites do `provider.sdk = { ... }` (private field, set at runtime — vitest/esbuild is transpile-only,
        npm run lint excludes tests). S2's execute-config-error test reuses this with a minimal `{}` stub.

# SHOULD READ — the existing registry test (the isolation pattern to copy).
- file: src/__tests__/unit/providers/harness-registry.test.ts
  why: afterEach resets BOTH _resetForTesting() + _resetInitStateForTesting(); createMockProvider(id) factory.
        register-defaults.test.ts copies the afterEach verbatim.

# SHOULD READ — the normalizemodel test S1 updated (the file S2 modifies).
- file: src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts
  why: S1 already updated it to assert ClaudeCodeHarness/HarnessRegistry message text. S2 ADDS the ConfigError
        code/details assertions and KEEPS S1's text assertions (message is preserved).
```

### Current Codebase tree (relevant slice — S1's output state when S2 begins)

```bash
src/harnesses/
├── claude-code-harness.ts   # ← MODIFY: add ConfigError class; normalizeModel throws ConfigError (S1 output)
├── harness-registry.ts      # untouched (consumer; duplicate-throw is why register-defaults is idempotent)
├── index.ts                 # ← MODIFY: export registerDefaultHarnesses
├── register-defaults.ts     # ← NEW (the bootstrap helper)
├── opencode-provider.ts     # untouched (deleted in P4.M1)
└── session-store.ts         # untouched
src/types/
├── agent.ts                 # ← MODIFY: add CONFIG_ERROR to AGENT_ERROR_CODES (additive)
├── harnesses.ts             # untouched (Harness interface, HarnessId, ModelSpec — S1's prerequisite)
├── providers.ts             # untouched (Provider/ProviderId alias superset — 'claude-code' ∈ ProviderId)
└── index.ts                 # untouched (S1 fixed the barrel path; S2 adds nothing here)
src/__tests__/unit/providers/
├── claude-code-harness-normalizemodel.test.ts          # ← MODIFY (add ConfigError assertions; keep S1's)
├── claude-code-harness-execute-config-error.test.ts    # ← NEW (execute/streaming propagate ConfigError)
├── register-defaults.test.ts                           # ← NEW (bootstrap helper)
├── claude-code-harness-*.test.ts (other 11)            # untouched (S1 renamed; S2 changes none)
├── harness-registry.test.ts                            # untouched (mock-based; isolation pattern reference)
└── provider-*.test.ts (mock-based suites)              # untouched
```

### Desired Codebase tree with files to be added/changed

```bash
src/harnesses/register-defaults.ts                                  # NEW
src/harnesses/claude-code-harness.ts                                # MODIFY (ConfigError + normalizeModel throw)
src/harnesses/index.ts                                              # MODIFY (export registerDefaultHarnesses)
src/types/agent.ts                                                  # MODIFY (add CONFIG_ERROR to AGENT_ERROR_CODES)
src/__tests__/unit/providers/register-defaults.test.ts              # NEW
src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts  # MODIFY (add ConfigError assertions)
src/__tests__/unit/providers/claude-code-harness-execute-config-error.test.ts  # NEW
# (Everything else — incl. S1's other 11 renamed tests, agent.ts/core, registry logic — UNTOUCHED.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — S1 already fixed the normalizeModel COMPARISON to `!== "anthropic"`. S2 does NOT
//   touch the comparison; S2 only swaps the thrown value Error → ConfigError. Reverting to
//   `!== this.id` re-introduces silent always-throw runtime death (this.id is the harness id
//   'claude-code', never equal to a model provider). (Scope Decision 1 + research/config-error-design.md.)

// CRITICAL #2 — the ConfigError MESSAGE must be byte-for-byte identical to S1's. S1 updated
//   claude-code-harness-normalizemodel.test.ts to assert /Cannot normalize ... with ClaudeCodeHarness/
//   + toContain('HarnessRegistry'). Those assertions MUST still pass. Changing the text breaks S1's tests.
//   (research/config-error-design.md Decision 3.)

// CRITICAL #3 — execute enforces by PROPAGATION, not a duplicate check. normalizeModel is the single
//   gate; execute calls it at L409 (non-streaming) / executeStreaming at L641 (streaming) with NO
//   swallowing try/catch. Do NOT add a second provider check in execute (DRY). Prove propagation via
//   the new execute-config-error test. (Scope Decision 2 + research/config-error-design.md Decision 4.)

// CRITICAL #4 — HarnessRegistry.register() THROWS on duplicate. registerDefaultHarnesses MUST guard
//   every registration with `if (!registry.has(id))` or the second call (app + Agent, or overlapping
//   tests) crashes. (Scope Decision 3 + research/register-defaults-design.md.)

// GOTCHA #5 — registerDefaultHarnesses must be an EXPLICIT function call, NEVER auto-invoked on import.
//   Auto-registering would pollute the singleton in every test importing anything from src/harnesses/
//   (breaking ~15 suites' isolation). Callers (app entry, P3.M1 Agent) invoke it deliberately.

// GOTCHA #6 — ConfigError lives in claude-code-harness.ts (NOT src/types/agent.ts, NOT a new src/errors/).
//   agent.ts gains only the CONFIG_ERROR constant (additive). Dependency is one-way
//   (claude-code-harness → agent via AGENT_ERROR_CODES); agent.ts never imports the harness → no cycle.

// GOTCHA #7 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks non-test
//   src/ (incl. register-defaults.ts, claude-code-harness.ts, agent.ts, harnesses/index.ts). Test type
//   errors won't fail lint but WILL fail npm test if they break transpile. Run BOTH gates.

// GOTCHA #8 — isolatedModules: true. Use `import { AGENT_ERROR_CODES } from "../types/agent.js"` (VALUE
//   import — it's a runtime const, not a type) in claude-code-harness.ts. Use `import type` for
//   Harness/HarnessId/etc. (S1 already established this convention in the file — follow it.)

// GOTCHA #9 — `new ClaudeCodeHarness()` is safe to register UN-INITIALIZED. The constructor sets field
//   defaults only; it does NOT load the @anthropic-ai/claude-agent-sdk (that's initialize()). So
//   registerDefaultHarnesses holds a lightweight instance; initializeProvider() runs later. No SDK mock
//   needed for register-defaults tests.

// GOTCHA #10 — DO NOT add registerDefaultHarnesses (or ConfigError) to src/index.ts. The full Harness-
//   surface public export is P3.M3.T1.S1 (the boundary S1 honored). Export through src/harnesses/index.ts
//   only. Tests + Agent import from the harnesses barrel or the file directly.

// GOTCHA #11 — DO NOT edit harness-registry.ts logic. Its duplicate-throw is CORRECT behavior; S2 works
//   AROUND it via the has() guard in the helper, not by changing the registry. Default-harness registration
//   is S2's job (this task); the registry itself is owned by P1.M2.

// GOTCHA #12 — DO NOT edit agent.ts (src/core/agent.ts). The Agent↔harness rewire (catch ConfigError,
//   map to AgentResponse, registry.get) is P3.M1.T1/T2. Editing it here collides with that task.
```

---

## Implementation Blueprint

### Data models and structure

One new exported class (`ConfigError`) + one new additive constant key (`CONFIG_ERROR`) + one new
function (`registerDefaultHarnesses`). All other types (`Harness`, `HarnessId`, `ModelSpec`,
`Provider`, `ProviderId`, `AgentErrorDetails`) are CONSUMED from existing files.

```ts
// === src/types/agent.ts — additive key in AGENT_ERROR_CODES (PRD §6.2 vocabulary) ===
export const AGENT_ERROR_CODES = {
  // ... existing keys ...
  /** Invalid harness/provider configuration (PRD §7.8). Non-recoverable — select a different
   *  harness/model rather than retry. Thrown by ClaudeCodeHarness for non-anthropic models. */
  CONFIG_ERROR: 'CONFIG_ERROR',
} as const;

// === src/harnesses/claude-code-harness.ts — new structured error class ===
export class ConfigError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  constructor(
    message: string,
    options: { code?: string; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = 'ConfigError';
    this.code = options.code ?? AGENT_ERROR_CODES.CONFIG_ERROR;
    this.details = options.details;
  }
}

// === src/harnesses/register-defaults.ts — idempotent bootstrap helper ===
export function registerDefaultHarnesses(
  registry: HarnessRegistry = HarnessRegistry.getInstance(),
): HarnessRegistry {
  const CLAUDE_CODE: HarnessId = 'claude-code';
  if (!registry.has(CLAUDE_CODE)) {
    registry.register(new ClaudeCodeHarness());
  }
  // TODO(P2.M3.T2.S3): register PiHarness (id 'pi').
  return registry;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note S1's rename (anthropic-provider.ts → claude-code-harness.ts)
    should be present/landing. If claude-code-harness.ts is ABSENT, S1 has not landed — STOP (S2 depends on S1).
  - RUN: `grep -n "class ClaudeCodeHarness implements Harness\|readonly id: HarnessId" src/harnesses/claude-code-harness.ts` —
    expect hits (S1 prerequisite). If absent, STOP.
  - RUN: `grep -n 'spec.provider !== "anthropic"' src/harnesses/claude-code-harness.ts` — expect 1 hit
    (S1's normalizeModel fix). If it still says `!== this.id`, S1 hasn't finished — STOP.
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before touching anything.

Task 1: CREATE src/harnesses/register-defaults.ts
  - CREATE the file with the full implementation in "Data models" above + the JSDoc from
    research/register-defaults-design.md (idempotent note, P2.M3 TODO, default-arg = singleton).
  - IMPORTS: `import { HarnessRegistry } from "./harness-registry.js";`,
    `import { ClaudeCodeHarness } from "./claude-code-harness.js";`,
    `import type { HarnessId } from "../types/harnesses.js";` (type-only — isolatedModules).
  - VERIFY: `grep -n "registerDefaultHarnesses\|registry.has\|new ClaudeCodeHarness()" src/harnesses/register-defaults.ts` → 3+ hits.

Task 2: MODIFY src/harnesses/claude-code-harness.ts (ConfigError class + normalizeModel throw)
  - IMPORTS: add `AGENT_ERROR_CODES` to the existing `import { createSuccessResponse, createErrorResponse } from "../types/agent.js";`
    line → `import { createSuccessResponse, createErrorResponse, AGENT_ERROR_CODES } from "../types/agent.js";`.
  - ADD the `ConfigError` class (see "Data models") at TOP LEVEL, AFTER the imports + BEFORE the class decl
    (or immediately before `export class ClaudeCodeHarness`). Include its JSDoc (research/config-error-design.md).
  - MODIFY normalizeModel (L~1183): replace
        throw new Error(
          `Cannot normalize ${spec.provider}/${spec.model} with ClaudeCodeHarness. ` +
            `The claude-code harness only supports anthropic/* models (PRD §7.8). ` +
            `Use HarnessRegistry to select a harness that supports the '${spec.provider}' provider.`,
        );
    with
        throw new ConfigError(
          `Cannot normalize ${spec.provider}/${spec.model} with ClaudeCodeHarness. ` +
            `The claude-code harness only supports anthropic/* models (PRD §7.8). ` +
            `Use HarnessRegistry to select a harness that supports the '${spec.provider}' provider.`,
          {
            code: AGENT_ERROR_CODES.CONFIG_ERROR,
            details: { provider: spec.provider, model: spec.model, harnessId: this.id },
          },
        );
    (MESSAGE STRING IDENTICAL — only the constructor + the options arg are new. The `if (spec.provider
    !== "anthropic")` line is UNCHANGED.)
  - UPDATE normalizeModel JSDoc `@throws` (L~1159): `{Error}` → `{ConfigError}`; note `code === CONFIG_ERROR`.
  - ADD a one-line JSDoc note on execute (L~354): "Throws {@link ConfigError} (code CONFIG_ERROR) if
    request.options.model resolves to a non-anthropic provider (PRD §7.8) — enforced via normalizeModel."
    NO body change to execute / executeStreaming.
  - VERIFY: `grep -n "class ConfigError extends Error\|throw new ConfigError\|AGENT_ERROR_CODES.CONFIG_ERROR" src/harnesses/claude-code-harness.ts` → 3 hits.
  - VERIFY: `grep -n 'spec.provider !== "anthropic"' src/harnesses/claude-code-harness.ts` → still 1 hit (unchanged).
  - VERIFY: `! grep -n 'spec.provider !== this.id' src/harnesses/claude-code-harness.ts` → no match (NOT reverted).

Task 3: MODIFY src/types/agent.ts (add CONFIG_ERROR to AGENT_ERROR_CODES)
  - ADD the `CONFIG_ERROR: 'CONFIG_ERROR',` key + its JSDoc (see "Data models") to the AGENT_ERROR_CODES
    object (L~610-653). Placement: after INTERNAL_ERROR is natural, but any position in the object works.
  - VERIFY: `grep -n "CONFIG_ERROR:" src/types/agent.ts` → 1 hit.

Task 4: MODIFY src/harnesses/index.ts (export the helper)
  - APPEND: `export { registerDefaultHarnesses } from './register-defaults.js';`
  - DO NOT add ConfigError here (import it from claude-code-harness.js directly where needed) and DO NOT
    touch src/index.ts (public surface = P3.M3.T1.S1).
  - VERIFY: `grep -n "registerDefaultHarnesses" src/harnesses/index.ts` → 1 hit.

Task 5: CREATE src/__tests__/unit/providers/register-defaults.test.ts
  - COPY the test verbatim from research/test-strategy.md §"Test 1" (5 cases: registers claude-code on
    singleton; returns the singleton; idempotent (no throw on double-call); accepts custom registry;
    does NOT register 'pi' today).
  - afterEach: reset BOTH HarnessRegistry._resetForTesting() + getInstance()._resetInitStateForTesting()
    (copy from harness-registry.test.ts).

Task 6: MODIFY src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts
  - ADD the ConfigError import: `import { ClaudeCodeHarness, ConfigError } from '../../../harnesses/claude-code-harness.js';`
    (extend the existing ClaudeCodeHarness import line) + `import { AGENT_ERROR_CODES } from '../../../types/agent.js';`.
  - ADD the 3 new cases from research/test-strategy.md §"Test 2" (ConfigError + code CONFIG_ERROR + details;
    openai also rejected; happy path unchanged) inside the existing `describe('provider validation', ...)` block.
  - KEEP every S1 assertion (the /Cannot normalize ... with ClaudeCodeHarness/ + toContain('HarnessRegistry')
    cases) UNCHANGED — the message text is preserved so they still pass.

Task 7: CREATE src/__tests__/unit/providers/claude-code-harness-execute-config-error.test.ts
  - COPY the test verbatim from research/test-strategy.md §"Test 3" (3 cases: non-streaming execute rejects
    with ConfigError; streaming throws on first .next(); anthropic model does NOT throw ConfigError).
  - SDK-stub trick: `(harness as unknown as { sdk: unknown }).sdk = {};` in beforeEach (never invoked —
    normalizeModel throws before query()).

Task 8: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: grep (contract), npm run lint, npm test (targeted + full), npm run build, git status.
  - ANY lint failure naming register-defaults.ts → bad import (use `import type` for HarnessId) or a missing
    export. ANY lint failure naming claude-code-harness.ts → AGENT_ERROR_CODES not imported as a value, or
    ConfigError declared inside the class (it must be top-level). ANY test failure in normalizemodel →
    message text drifted (re-read CRITICAL #2) OR an S1 assertion was accidentally weakened.
```

### Implementation Patterns & Key Details

```ts
// === ConfigError (claude-code-harness.ts, top-level, exported) ===
export class ConfigError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  constructor(
    message: string,
    options: { code?: string; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = 'ConfigError';
    this.code = options.code ?? AGENT_ERROR_CODES.CONFIG_ERROR;
    this.details = options.details;
  }
}

// === normalizeModel — the ONE behavioral edit (message preserved) ===
normalizeModel(model: string): ModelSpec {
  const spec = parseModelSpec(model, 'anthropic');
  if (spec.provider !== 'anthropic') {            // ← UNCHANGED (S1 fixed this)
    throw new ConfigError(                         // ← WAS `new Error(...)` — the only swap
      `Cannot normalize ${spec.provider}/${spec.model} with ClaudeCodeHarness. ` +
        `The claude-code harness only supports anthropic/* models (PRD §7.8). ` +
        `Use HarnessRegistry to select a harness that supports the '${spec.provider}' provider.`,
      { code: AGENT_ERROR_CODES.CONFIG_ERROR,
        details: { provider: spec.provider, model: spec.model, harnessId: this.id } },
    );
  }
  return spec;
}

// === registerDefaultHarnesses (register-defaults.ts) — idempotent ===
export function registerDefaultHarnesses(
  registry: HarnessRegistry = HarnessRegistry.getInstance(),
): HarnessRegistry {
  const CLAUDE_CODE: HarnessId = 'claude-code';
  if (!registry.has(CLAUDE_CODE)) {              // ← guard neutralizes register()'s duplicate-throw
    registry.register(new ClaudeCodeHarness());
  }
  // TODO(P2.M3.T2.S3): register PiHarness (id 'pi') with the same has() guard.
  return registry;
}

// === execute / executeStreaming — NO body change (enforce via propagation) ===
// execute calls this.normalizeModel(...) at L409 (non-streaming) / executeStreaming at L641
// (streaming), with NO enclosing try/catch → ConfigError propagates as a rejected promise /
// first-.next() throw. "execute throws a clear config error" = this propagation.
```

### Integration Points

```yaml
SOURCE (MODIFY):
  - src/harnesses/claude-code-harness.ts : + ConfigError class; normalizeModel `throw new ConfigError(...)`;
      execute JSDoc note (no body change).
  - src/types/agent.ts                   : + CONFIG_ERROR key in AGENT_ERROR_CODES (additive).

SOURCE (NEW):
  - src/harnesses/register-defaults.ts   : registerDefaultHarnesses() idempotent bootstrap.

BARRELS:
  - src/harnesses/index.ts               : + export { registerDefaultHarnesses } from './register-defaults.js';
  - src/index.ts                         : UNTOUCHED (public Harness-surface export = P3.M3.T1.S1).

TESTS:
  - src/__tests__/unit/providers/register-defaults.test.ts                        (NEW)
  - src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts       (MODIFY — add ConfigError assertions)
  - src/__tests__/unit/providers/claude-code-harness-execute-config-error.test.ts (NEW)

CONSUMERS (kept green — NO source edits):
  - src/harnesses/harness-registry.ts : register/has/get UNCHANGED. S2 works around duplicate-throw in the helper.
  - src/core/agent.ts                 : will catch ConfigError + call registerDefaultHarnesses — but that is P3.M1.

NOT IN SCOPE (do not touch — owned downstream):
  - PiHarness registration in register-defaults                                        → P2.M3.T2.S3 (TODO marks the spot)
  - agent.ts harness rewire (catch ConfigError → AgentResponse; registry.get)          → P3.M1
  - Full Harness-surface public export in src/index.ts                                  → P3.M3.T1.S1
  - Cross-harness parity tests (CONFIG_ERROR parity across pi/claude-code)             → P4.M2
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates non-test `src/`
> INCLUDING `register-defaults.ts`, `claude-code-harness.ts`, `agent.ts`, `harnesses/index.ts`).
> `npm test` = `vitest run` (esbuild transpile-only; the new + modified suites + everything else).
> `npm run build` = `tsc` (emits `dist/`). No eslint/prettier. **Run lint AND test** — lint proves
> source compiles (incl. no import cycle); test proves behavior + the ConfigError assertions.

### Level 1: Syntax & Type Check (run after Tasks 1–4)

```bash
# Non-test type check — proves register-defaults.ts compiles, ConfigError + normalizeModel compile,
# CONFIG_ERROR additive key is valid, the barrel resolves, and there's NO import cycle
# (claude-code-harness → agent is one-way).
npm run lint
# Expected: exit 0. An error naming register-defaults.ts = a bad import (use `import type` for HarnessId)
# or HarnessRegistry/ClaudeCodeHarness not imported. An error naming claude-code-harness.ts =
# AGENT_ERROR_CODES not imported as a VALUE (it's a runtime const — `import { AGENT_ERROR_CODES }`, not
# `import type`), or ConfigError declared inside the class (must be top-level). An error naming agent.ts
# = malformed CONFIG_ERROR key (must be inside the AGENT_ERROR_CODES object, `as const`).
```

### Level 2: Unit Tests (run after Tasks 5–7)

```bash
# The bootstrap helper
npm test -- src/__tests__/unit/providers/register-defaults
# Expected: 5 pass. A failure on "idempotent" = missing the has() guard (Scope Decision 3).

# The normalizeModel ConfigError assertions (S1's text assertions + S2's new code assertions)
npm test -- src/__tests__/unit/providers/claude-code-harness-normalizemodel
# Expected: all pass. A failure on an S1 text assertion = message text drifted (CRITICAL #2).
# A failure on a new ConfigError assertion = throw still uses `new Error(...)` (Task 2 not applied).

# The execute/streaming CONFIG_ERROR propagation
npm test -- src/__tests__/unit/providers/claude-code-harness-execute-config-error
# Expected: 3 pass. A failure = execute swallowed the error (shouldn't happen — no try/catch around
# normalizeModel) OR the sdk stub wasn't set (harness.sdk = {} in beforeEach).

# Full suite (catch any ripple — S1's renamed suites + mock-based suites must stay green)
npm test
# Expected: all pass. If a mock-based suite (harness-registry, provider-switching, provider-lifecycle,
# agent.test.ts) regressed, you accidentally touched it — revert. If S1's other 11 claude-code-harness-*
# suites regressed, you over-edited claude-code-harness.ts beyond normalizeModel.
```

### Level 3: Contract Verification (grep gates)

```bash
# ConfigError class + normalizeModel throws it with CONFIG_ERROR code:
grep -n "class ConfigError extends Error\|throw new ConfigError\|code: AGENT_ERROR_CODES.CONFIG_ERROR" src/harnesses/claude-code-harness.ts
# Expected: 3 hits.

# The comparison is STILL against the literal 'anthropic' (S1's fix — NOT reverted to this.id):
grep -n 'spec.provider !== "anthropic"' src/harnesses/claude-code-harness.ts   # Expected: 1 hit.
! grep -n 'spec.provider !== this.id' src/harnesses/claude-code-harness.ts     # Expected: no match (exit 1).

# CONFIG_ERROR added to AGENT_ERROR_CODES (additive):
grep -n "CONFIG_ERROR:" src/types/agent.ts   # Expected: 1 hit.

# registerDefaultHarnesses is idempotent (has() guard) + registers claude-code + defers pi:
grep -n "export function registerDefaultHarnesses\|registry.has(CLAUDE_CODE)\|new ClaudeCodeHarness()\|TODO(P2.M3" src/harnesses/register-defaults.ts
# Expected: 4 hits.

# The barrel exports the helper (and src/index.ts is UNTOUCHED):
grep -n "registerDefaultHarnesses" src/harnesses/index.ts   # Expected: 1 hit.
! grep -n "registerDefaultHarnesses" src/index.ts           # Expected: no match (exit 1 — public export is P3.M3.T1.S1).

# Exactly the expected file set changed:
git status --short
# Expected: ?? register-defaults.ts; ?? register-defaults.test.ts; ?? claude-code-harness-execute-config-error.test.ts;
#           M claude-code-harness.ts; M src/types/agent.ts; M src/harnesses/index.ts; M claude-code-harness-normalizemodel.test.ts.
# (harness-registry.ts, src/core/agent.ts, src/index.ts, S1's other 11 tests, opencode-provider.ts — UNTOUCHED.)
```

### Level 4: Behavioral Spot-Check (CONFIG_ERROR end-to-end)

```bash
# Quick runtime identity check via tsx (proves ConfigError.code + registerDefaultHarnesses):
npx tsx -e '
  import { ClaudeCodeHarness, ConfigError } from "./src/harnesses/claude-code-harness.js";
  import { AGENT_ERROR_CODES } from "./src/types/agent.js";
  import { HarnessRegistry } from "./src/harnesses/harness-registry.js";
  import { registerDefaultHarnesses } from "./src/harnesses/register-defaults.js";

  // normalizeModel rejects non-anthropic with a structured ConfigError
  const h = new ClaudeCodeHarness();
  try { h.normalizeModel("openai/gpt-4o"); console.log("norm non-ant   : NO THROW (BUG)"); }
  catch (e) {
    console.log("norm non-ant   :", e instanceof ConfigError ? "ConfigError" : "WRONG TYPE",
                "| code:", (e as ConfigError).code === AGENT_ERROR_CODES.CONFIG_ERROR ? "CONFIG_ERROR" : "WRONG");
  }
  // happy path unchanged
  console.log("norm happy     :", JSON.stringify(h.normalizeModel("claude-sonnet-4"))); // provider:anthropic

  // registerDefaultHarnesses (idempotent) on a fresh registry
  HarnessRegistry._resetForTesting();
  registerDefaultHarnesses();
  registerDefaultHarnesses(); // second call must NOT throw
  const cc = HarnessRegistry.getInstance().get("claude-code");
  console.log("registered cc  :", cc instanceof ClaudeCodeHarness, "| id:", cc?.id);
  console.log("pi deferred    :", HarnessRegistry.getInstance().has("pi") === false);
'
# Expected: norm non-ant : ConfigError | code: CONFIG_ERROR ; norm happy : {"provider":"anthropic",...} ;
#           registered cc : true | id: claude-code ; pi deferred : true.
```

### Level 5: Build (declaration-emit sanity)

```bash
npm run build
# Expected: exit 0; dist/harnesses/register-defaults.{js,d.ts} emitted; dist/harnesses/claude-code-harness.d.ts
# exports ConfigError; dist/types/agent.d.ts shows CONFIG_ERROR in AGENT_ERROR_CODES.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` exits 0 (register-defaults.ts + claude-code-harness.ts + agent.ts + barrel compile; no cycle).
- [ ] `npm test` exits 0 (3 new/modified suites + S1's renamed suites + all mock-based suites pass).
- [ ] `npm run build` exits 0; `dist/harnesses/register-defaults.{js,d.ts}` emitted.
- [ ] `git status --short` shows: 3 new files + 4 modified (claude-code-harness.ts, agent.ts,
      harnesses/index.ts, normalizemodel.test.ts). Nothing else touched.

### Feature Validation

- [ ] `ConfigError extends Error` exported; default `.code === AGENT_ERROR_CODES.CONFIG_ERROR`.
- [ ] `normalizeModel` throws `ConfigError` for non-anthropic providers; message text identical to S1's;
      `.details` carries `{ provider, model, harnessId }`.
- [ ] `execute` (non-streaming) rejects with `ConfigError`; streaming throws on first `.next()` — via the
      existing `normalizeModel` call, NO execute body change (Level 4 spot-check).
- [ ] `CONFIG_ERROR: 'CONFIG_ERROR'` in `AGENT_ERROR_CODES`.
- [ ] `registerDefaultHarnesses()` registers `ClaudeCodeHarness` under `'claude-code'`; idempotent; defaults
      to the singleton; accepts a custom registry; does NOT register `'pi'`.

### Code Quality Validation

- [ ] `import { AGENT_ERROR_CODES }` is a VALUE import in claude-code-harness.ts (runtime const); `import type`
      used for HarnessId/Harness (isolatedModules — S1 convention).
- [ ] ConfigError is TOP-LEVEL (not nested in the class) and carries a `@throws`/`code` JSDoc.
- [ ] The ONE behavioral edit (normalizeModel throw) preserves S1's message text verbatim.
- [ ] No edits to `harness-registry.ts`, `src/core/agent.ts`, `src/index.ts`, `opencode-provider.ts`, or any
      mock-based / S1-renamed test other than the normalizemodel one.

### Documentation & Deployment

- [ ] No new environment variables; no dependency changes; no config-file changes.
- [ ] `registerDefaultHarnesses` JSDoc documents idempotency + the P2.M3.T2.S3 PiHarness TODO.

---

## Anti-Patterns to Avoid

- ❌ **Don't revert `normalizeModel` to `!== this.id` or re-fix the comparison.** S1 already fixed it to
  `!== "anthropic"`. S2 only swaps `Error` → `ConfigError`. (CRITICAL #1.)
- ❌ **Don't change the normalizeModel message text.** S1's test assertions match it exactly; drifting the
  text breaks them. Preserve byte-for-byte; only the constructor + options arg change. (CRITICAL #2.)
- ❌ **Don't add a duplicate provider check in `execute`.** It already calls `normalizeModel` first with no
  swallowing try/catch → the ConfigError propagates. A second check is DRY-violating and risks drift.
  (CRITICAL #3 + Scope Decision 2.)
- ❌ **Don't make `registerDefaultHarnesses` non-idempotent.** `register()` throws on duplicate — without the
  `has()` guard, the second call (app + Agent, or overlapping tests) crashes. (CRITICAL #4.)
- ❌ **Don't auto-call `registerDefaultHarnesses` on import.** It pollutes the singleton in every test.
  It's an explicit function call. (GOTCHA #5.)
- ❌ **Don't put `ConfigError` in `src/types/agent.ts` or a new `src/errors/`.** It lives in
  `claude-code-harness.ts` (the only consumer today; agent.ts gets only the additive constant). Keeps the
  dependency one-way → no cycle. (GOTCHA #6.)
- ❌ **Don't add `registerDefaultHarnesses`/`ConfigError` to `src/index.ts`.** The public Harness-surface
  export is P3.M3.T1.S1 (the boundary S1 honored). Export via `src/harnesses/index.ts` only. (GOTCHA #10.)
- ❌ **Don't edit `harness-registry.ts` or `src/core/agent.ts`.** The registry's duplicate-throw is correct
  (S2 works around it in the helper); the Agent↔ConfigError catch/map is P3.M1. (GOTCHA #11/#12.)
