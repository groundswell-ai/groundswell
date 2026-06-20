# PRP — P2.M2.T1.S2: Implement `initialize`/`terminate` + model resolution (ModelSpec → Model<any>)

**PRD reference:** §7.1 (`pi` harness — `@earendil-works/pi-coding-agent`), §7.3 (`Harness`
interface: `initialize`/`terminate`/`normalizeModel`), §7.5 (`HarnessOptions.apiKey` forwarded
to LLM provider), §7.6 (`GlobalHarnessConfig.defaultModelProvider`), §7.8 (model string is
`provider/model`, never harness-qualified; open `ModelProviderId` set), §7.14 (identical
`AgentResponse` shape across harnesses).
**Plan:** `plan/004_9a50e71828f4/` — S2 of P2.M2.T1 ("PiHarness scaffold, dependency, and model
resolution"). Consumes S1's `PiHarness` skeleton (id/capabilities/normalizeModel + throwing
stubs), `parseModelSpec` (P1.M1.T2.S1), `getGlobalHarnessConfig` (P1.M2.T2.S1), `ConfigError`
+ `AGENT_ERROR_CODES` (P2.M1.T1.S2). Unblocks **T2** (P2.M2.T2.S1: `createAgentSession`/prompt/
subscribe → `AgentResponse`, which consumes the `Model<Api>` this task produces).
**Scope tag:** REPLACE the two throwing stubs (`initialize`/`terminate`) in
`src/harnesses/pi-harness.ts` with real bodies; ADD a `resolveModel(spec)` method + the private
fields it needs (`sdk`, `modelRegistry`, `authStorage`, `options`); OPTIONALLY enhance
`normalizeModel` to thread the global default provider. Plus 2 new test files. **No edits to
barrels, registry, register-defaults, execute/registerMCPs/loadSkills, or any other source.**

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Four load-bearing, non-obvious details:
> (1) **Do NOT use `getModel` — it is the wrong API.** It is (a) not importable (`@earendil-works/pi-ai`
> is a non-hoisted transitive dep — `ERR_MODULE_NOT_FOUND`), and (b) generic-constrained to
> `KnownProvider` + known model ids, incompatible with Groundswell's open-set `ModelSpec`. Use
> **`ModelRegistry.find(provider, modelId)`** instead (re-exported from `@earendil-works/pi-coding-agent`,
> takes plain strings, registry/auth-aware). See `research/model-resolution-path.md`.
> (2) The `Harness.normalizeModel()` interface **pins** its return type to `ModelSpec`, and S1
> already shipped it. So "map to Model<any>" lives in a **NEW `resolveModel(spec)` method**, not
> inside `normalizeModel`.
> (3) `initialize` does **NOT** call `createAgentSession` — that is T2 (P2.M2.T2.S1). initialize
> only: `await import` the SDK → build a `ModelRegistry.inMemory(AuthStorage.inMemory())` → store
> `sdk`/`modelRegistry`/`authStorage`/`options`.
> (4) **No new dependency.** `@earendil-works/pi-ai` is NOT added — `getModel` is wrong either
> way, and `Model`/`Api` types derive cleanly from the re-exported `ModelRegistry`.

---

## Goal

**Feature Goal:** Give `PiHarness` a working **lifecycle** (`initialize` lazily imports the Pi
SDK + builds a `ModelRegistry`; `terminate` nulls references) and a working **model resolution**
step (`resolveModel(spec)` maps a parsed `ModelSpec` to a Pi `Model<Api>` via the registry). After
S2, `new PiHarness()` can be `initialize()`d into a state that holds the SDK module, an
auth-wired registry, and the caller's options — ready for T2 to hand the resolved `Model<Api>` to
`createAgentSession({ model })`.

**Deliverable:**
1. **MODIFY `src/harnesses/pi-harness.ts`** (the S1 skeleton) — replace the throwing
   `initialize`/`terminate` stubs with real bodies and add `resolveModel` + private fields:
   - `private sdk: typeof import("@earendil-works/pi-coding-agent") | null = null;`
   - `private authStorage: AuthStorage | null = null;`
   - `private modelRegistry: ModelRegistry | null = null;`
   - `private options: HarnessOptions | null = null;`
   - `initialize(options?)`: idempotent guard; `await import("@earendil-works/pi-coding-agent")`
     wrapped in try/catch (mirror ClaudeCodeHarness L229-248); build `AuthStorage.inMemory()` +
     `ModelRegistry.inMemory(authStorage)`; store `options`.
   - `terminate()`: idempotent guard; null `sdk`/`authStorage`/`modelRegistry`/`options`.
   - `resolveModel(spec): PiModel` — inject `options.apiKey` per provider via
     `authStorage.setRuntimeApiKey`, then `modelRegistry.find(spec.provider, spec.model)`;
     throw `ConfigError` (code `CONFIG_ERROR`) if not found.
   - (optional, backward-compatible) `normalizeModel` threads
     `getGlobalHarnessConfig().defaultModelProvider` into `parseModelSpec`.
2. **NEW `src/__tests__/unit/providers/pi-harness-initialize.test.ts`** — REAL SDK import
   (pi-coding-agent is installed; mirrors `claude-code-harness-initialize.test.ts`): sdk loaded,
   `modelRegistry instanceof ModelRegistry`, options stored, idempotent, options accepted,
   terminate nulls + idempotent + safe-before-init, registry registration.
3. **NEW `src/__tests__/unit/providers/pi-harness-resolvemodel.test.ts`** — `vi.mock` of
   `@earendil-works/pi-coding-agent` so `ModelRegistry.find` is controllable: resolution maps
   `ModelSpec`→`Model` via `find(provider, model)`, throws `ConfigError` when `find` returns
   undefined, injects `options.apiKey` as a runtime key, default-provider threading via global
   config.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `pi-harness.ts` compiles; the dynamic-import type
   annotation + derived `PiModel` type are sound; no import cycle.
2. `npm test` exits 0 — the 2 new suites + S1's `pi-harness.test.ts` /
   `pi-harness-normalizemodel.test.ts` (still pass — normalizeModel change is backward-compatible)
   + full regression all green.
3. `npm run build` exits 0 — `dist/harnesses/pi-harness.{js,d.ts}` emitted with the real
   initialize/terminate + resolveModel.
4. Runtime spot-check (tsx): `new PiHarness()` → `initialize()` → `sdk` has `createAgentSession`
   + `ModelRegistry`; `modelRegistry instanceof ModelRegistry` === true; `resolveModel({...})`
   returns a `Model` (or throws `ConfigError` when absent); `terminate()` nulls all refs.
5. Contract (grep): `await import("@earendil-works/pi-coding-agent")`; `ModelRegistry.inMemory`;
   `modelRegistry.find(`; `ConfigError`; NO `getModel(`; NO `@earendil-works/pi-ai` import.

---

## ⚠️ SCOPE DECISIONS — four load-bearing details

### Decision 1 — Use `ModelRegistry.find()`, NOT `getModel()` (the contract's mechanism is infeasible)

The contract says "map to Model<any> via `getModel(provider, model)` from `@earendil-works/pi-ai`".
**Verified infeasible** (see `research/model-resolution-path.md`):
- `@earendil-works/pi-ai` is a **non-hoisted transitive** dep → `import { getModel } from
  '@earendil-works/pi-ai'` throws `ERR_MODULE_NOT_FOUND`. The nested path is blocked by the
  package `exports` map (`ERR_PACKAGE_PATH_NOT_EXPORTED`).
- Even if importable, `getModel` is **generic-constrained**: `getModel<TProvider extends
  KnownProvider, TModelId extends keyof MODELS[TProvider]>(...)`. It only accepts *known* providers
  + *known* model ids from a static generated catalogue — **incompatible** with Groundswell's
  open-set `ModelSpec` (PRD §7.8: any provider, custom models.json). Dynamic strings = type error
  AND runtime miss for every non-builtin model.

➡️ **Resolution mechanism = `this.modelRegistry.find(spec.provider, spec.model)`** (returns
`Model<Api> | undefined`). Re-exported from `@earendil-works/pi-coding-agent` (S1's dep — no new
install); takes plain strings; registry/auth-aware (built-in + custom models.json + env keys).
This honours the contract's **intent** (ModelSpec → Model, resolvable + mockable) via the only
workable API. Documented in `research/model-resolution-path.md`.

### Decision 2 — "map to Model<any>" is a NEW `resolveModel(spec)` method (normalizeModel stays ModelSpec)

The `Harness.normalizeModel(model: string): ModelSpec` interface (`src/types/harnesses.ts`)
**pins** normalizeModel's return to `ModelSpec`. S1 (parallel predecessor) already ships
`normalizeModel = parseModelSpec(model)`. The contract prose ("normalizeModel(model): parseModelSpec
and map to Model<any>") **conflates** two steps. To stay interface-compliant + non-conflicting
with S1:
- `normalizeModel(model)` → still returns `ModelSpec` (S1 behaviour). S2 MAY thread
  `getGlobalHarnessConfig().defaultModelProvider` into `parseModelSpec` — **backward-compatible**
  (when global config is unset, `defaultModelProvider` is `undefined`, so `parseModelSpec` defaults
  to `'anthropic'` exactly as S1 does → S1's normalizeModel tests still pass).
- **NEW** `resolveModel(spec: ModelSpec): PiModel` → the ModelSpec → Model<Api> mapping. This is
  what "map to Model<any>" means; **T2** (`createAgentSession`) consumes it. `PiModel` is
  `NonNullable<ReturnType<ModelRegistry['find']>>` (=== `Model<Api>`), derived from the
  re-exported `ModelRegistry` so **no pi-ai type import** is needed.

### Decision 3 — `initialize` does NOT call `createAgentSession` (that is T2 / P2.M2.T2.S1)

Per the contract: "initialize(options?): lazily `await import(...)`, build a ModelRegistry, resolve
API keys per provider from options.apiKey/env. **Store** sdk + modelRegistry + options on the
instance." `createAgentSession` (the async session factory) + `prompt`/`subscribe` are T2. S2's
initialize is a **preparation** step: load the module + stand up the registry so T2 can call
`createAgentSession({ modelRegistry, model: resolveModel(spec) })`. ➡️ Do NOT invoke
`createAgentSession` in initialize (keeps scope tight + tests fast/no-network).

### Decision 4 — NO new dependency; `Model`/`Api` types derived from `ModelRegistry`

`@earendil-works/pi-ai` is **NOT added** to `package.json`. `getModel` is the wrong API (Decision 1),
so adding pi-ai yields no resolution benefit. The `Model<Api>` type is derived from the
**re-exported** `ModelRegistry`:

```ts
type PiModel = NonNullable<ReturnType<ModelRegistry['find']>>;  // === Model<Api>
```

This is structurally `Model<Api>` (assignable to `Model<any>` for T2) and needs only the
pi-coding-agent import S1 already installed. `AuthStorage` + `ModelRegistry` are also re-exported
by pi-coding-agent (index.d.ts L5, L11), so the headless registry build needs no extra dep.

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agent:
- **P2.M2.T2.S1 (T2)** — receives an initialized `PiHarness` holding `sdk` + `modelRegistry` and
  calls `resolveModel(spec)` to get the `Model<Api>` for `createAgentSession({ model })`.
- **P3.M1 (Agent)** — resolves `registry.get('pi')` (once registered in P2.M3.T2.S3) and calls
  `initialize({ apiKey })`.
- **P2.M3 / P2.M4** — extend `PiHarness` with tools/streaming/hooks/skills (these methods stay
  throwing stubs owned downstream).

**Use Case:** PRD §7.1 — `pi` is the **default**, vendor-neutral harness. Before it can run a
prompt (T2), it must (a) have its SDK loaded and (b) be able to turn a model string into a Pi
`Model` against a real auth context. S2 delivers both.

**Pain Points Addressed:** S1's skeleton throws on `initialize`/`terminate` and has no model
resolution — every PiHarness behaviour is blocked until lifecycle + resolution exist.

---

## Why

- **Realizes PRD §7.3** — `initialize`/`terminate` are real, and `normalizeModel`/resolution
  follow §7.8 (open provider set, no harness prefix).
- **Unblocks T2 (P2.M2.T2.S1)** — `createAgentSession({ model })` needs the `Model<Api>` S2
  produces; the session factory also wants the `modelRegistry` S2 builds.
- **Correctly adapts an infeasible contract instruction** — `getModel` cannot be used (verified);
  `ModelRegistry.find` is the workable, registry-auth-aware, open-set alternative (Decision 1).
- **Low-risk, additive.** One source file modified (the S1 skeleton), two new test files. No
  barrels/registry/defaults touched. The `normalizeModel` enhancement is backward-compatible.

---

## What

1. **MODIFY** `src/harnesses/pi-harness.ts` — real initialize/terminate + `resolveModel` + fields.
2. **CREATE** `src/__tests__/unit/providers/pi-harness-initialize.test.ts` (real import).
3. **CREATE** `src/__tests__/unit/providers/pi-harness-resolvemodel.test.ts` (vi.mock).
4. **VALIDATE** (lint / targeted tests / full suite / build / grep + runtime spot-check).

### Success Criteria

- [ ] `initialize()` lazily `await import`s `@earendil-works/pi-coding-agent` into `this.sdk`
      (idempotent); throws a descriptive `Error` if the import fails.
- [ ] `initialize()` builds `AuthStorage.inMemory()` + `ModelRegistry.inMemory(authStorage)` and
      stores them; stores `options`.
- [ ] `initialize()` accepts `{apiKey, endpoint, timeout, headers, sessionId}` (and `{}` / no-arg)
      without throwing.
- [ ] `terminate()` nulls `sdk`/`authStorage`/`modelRegistry`/`options`; idempotent; safe to call
      before `initialize()`.
- [ ] `resolveModel(spec)` calls `modelRegistry.find(spec.provider, spec.model)`; returns the
      `Model<Api>`; throws `ConfigError` (`code === AGENT_ERROR_CODES.CONFIG_ERROR`) when `find`
      returns `undefined`.
- [ ] `resolveModel` injects `options.apiKey` per provider via `authStorage.setRuntimeApiKey` when
      `options.apiKey` is set.
- [ ] `execute`/`registerMCPs`/`loadSkills` **still throw** citing their downstream subtasks
      (T2 / P2.M4.T1.S2 / P2.M3.T2.S3) — unchanged from S1.
- [ ] `normalizeModel` still returns a `ModelSpec`; with no global config set, `'claude-sonnet-4'`
      → `{provider:'anthropic',...}` (S1 behaviour preserved).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0; S1's two suites still pass.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S2 using only
(a) this PRP, (b) read-only access to `src/harnesses/claude-code-harness.ts` (the initialize/
terminate lazy-import + ConfigError pattern to mirror), `src/harnesses/pi-harness.ts` (the S1
skeleton to modify), `src/types/harnesses.ts` (Harness interface + ModelSpec/HarnessOptions),
`src/utils/model-spec.ts` (parseModelSpec), `src/utils/harness-config.ts` (getGlobalHarnessConfig),
the two reference test files (`claude-code-harness-initialize.test.ts`,
`claude-code-harness-normalizemodel.test.ts`), and (c) the copy-paste-ready snippets below + the
two `research/*.md` notes. The four non-obvious load-bearing details (find-not-getModel,
resolveModel-is-new, no-createAgentSession, no-new-dep) are proven in the research notes.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (PRD §7 harness system).
- url: PRD.md §7.3, §7.5, §7.6, §7.8   (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.3 = the Harness interface (initialize/terminate/normalizeModel signatures); §7.5 =
       HarnessOptions.apiKey ("forwarded to the LLM provider"); §7.6 = GlobalHarnessConfig.
       defaultModelProvider (for normalizeModel threading); §7.8 = open ModelProviderId set +
       "harness never in model string" (WHY resolution is open-set, not getModel's closed set).
  critical: §7.8 is WHY getModel (closed KnownProvider set) is the wrong API and find() (plain
            strings) is right (Decision 1).

# MUST READ — the verified Pi SDK surface (re-exports, AuthStorage, ModelRegistry, gotchas).
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.1 = createAgentSession (T2 — NOT called in S2); §1.2 = AgentSession.setModel throws on
       no-auth (motivates ConfigError on missing model/auth); §1.3 = model resolution (documents
       getModel — but SEE research/model-resolution-path.md for why we use find() instead); §1.8
       gotchas (createAgentSession async; model from getModel; setModel throws on no auth).
  critical: §1.3's getModel framing is the infeasible path — use ModelRegistry.find (Decision 1).

# MUST READ — the model-resolution decision (THE load-bearing finding).
- file: plan/004_9a50e71828f4/P2M2T1S2/research/model-resolution-path.md
  why: Proves (Fact 1) pi-ai is not importable; (Fact 2) getModel is generic-constrained = wrong
       API; (Fact 3) ModelRegistry.find is the correct re-exported, plain-string, registry-aware
       seam; (Fact 4) Model<Api> type derives from ModelRegistry (no pi-ai import).
  critical: This is why S2 deviates from the contract's literal "getModel" wording. Decision 1.

# MUST READ — the initialize/terminate + ModelRegistry construction + test strategy.
- file: plan/004_9a50e71828f4/P2M2T1S2/research/initialize-terminate-pattern.md
  why: §1 = the exact ClaudeCodeHarness lazy-import block to mirror; §2 = AuthStorage.inMemory +
       ModelRegistry.inMemory headless construction + apiKey injection timing; §3 = the two-file
       test split (real import vs vi.mock) with copy-paste vi.mock shape; §5 = S1/S2 boundary.
  critical: §3's vi.mock shape for the resolution test; §2's decision to defer apiKey injection
            to resolveModel (provider unknown at initialize time).

# MUST READ — the sibling harness initialize/terminate/normalizeModel to mirror.
- file: src/harnesses/claude-code-harness.ts
  why: L83-101 = ConfigError class (copy verbatim into pi-harness.ts OR import it — it is exported
       from claude-code-harness.ts; PREFER importing to avoid duplication); L167 = the `private sdk:
       typeof import("...") | null` field pattern; L229-248 = initialize body (idempotent guard +
       try/catch dynamic import + descriptive rethrow); L331-360 = terminate body (idempotent guard
       + null refs); L1204-1228 = normalizeModel (delegates to parseModelSpec — PiHarness keeps this
       shape MINUS the anthropic gate, per S1).
  pattern: copy the lazy-import field + initialize try/catch + terminate idempotent-null pattern.
  gotcha: ClaudeCodeHarness's ConfigError is a named export — `import { ConfigError } from
          "./claude-code-harness.js"` (verify it's exported; if not, import AGENT_ERROR_CODES +
          define a local ConfigError mirroring L83-101). ConfigError already ships in P2.M1.T1.S2.

# MUST READ — the Harness interface (every method signature + return types).
- file: src/types/harnesses.ts
  why: `Harness.initialize(options?): Promise<void>`, `terminate(): Promise<void>`,
       `normalizeModel(model): ModelSpec` (return type is PINNED — Decision 2), `execute<T>` return
       union (unchanged from S1). Plus HarnessOptions (apiKey/endpoint/timeout/headers/sessionId),
       ModelSpec, ModelProviderId.
  pattern: import all as `import type` (isolatedModules). resolveModel is NOT on the interface
           (PiHarness-specific) — that's fine, the interface is a structural minimum.

# MUST READ — parseModelSpec + getGlobalHarnessConfig (normalizeModel dependencies).
- file: src/utils/model-spec.ts
  why: parseModelSpec(model, defaultProvider='anthropic') — open-set string→ModelSpec. S2 threads
        getGlobalHarnessConfig().defaultModelProvider as the 2nd arg (backward-compatible: undefined
        → 'anthropic' default → S1's tests pass).
- file: src/utils/harness-config.ts
  why: getGlobalHarnessConfig() returns GlobalHarnessConfig (defaultModelProvider?: ModelProviderId,
       open set). Read-only; resetGlobalHarnessConfig() for test isolation if a test sets it.

# MUST READ — the S1 skeleton (the file S2 modifies) + its contract.
- file: src/harnesses/pi-harness.ts                  # (produced by the parallel S1 — read as CONTRACT)
  why: S1 ships: `class PiHarness implements Harness` with `id:'pi'`, all-true `capabilities`,
       `normalizeModel = parseModelSpec(model)` (no gate), throwing stubs for initialize/terminate/
       execute/registerMCPs/loadSkills (each citing its subtask). S2 REPLACES initialize/terminate
       stubs + ADDS resolveModel + fields; leaves execute/registerMCPs/loadSkills throwing.
- file: plan/004_9a50e71828f4/P2M2T1S1/PRP.md        # the S1 PRP (the contract for the predecessor)
  why: Defines exactly what the skeleton looks like (fields, stub messages, normalizeModel shape) so
       S2's edits are surgical. Confirms execute/registerMCPs/loadSkills stay throwing (T2/P2.M3/P2.M4).

# SHOULD READ — the test patterns to mirror.
- file: src/__tests__/unit/providers/claude-code-harness-initialize.test.ts
  why: The REAL-import initialize test pattern (sdk populated, idempotent, options accepted, registry
       registration, terminate nulls). pi-harness-initialize.test.ts mirrors it + adds modelRegistry
       instanceof + authStorage checks.
- file: src/__tests__/unit/providers/claude-code-harness-terminate.test.ts
  why: The terminate test pattern (nulls refs, idempotent, safe-before-init, re-init after terminate).
- file: src/__tests__/unit/providers/claude-code-harness-loadskills.test.ts
  why: The repo's vi.mock precedent (`vi.mock('fs/promises', () => ({...}))`) — the shape to adapt
       for `vi.mock('@earendil-works/pi-coding-agent', ...)` in the resolveModel test.

# SHOULD READ — the verified AuthStorage / ModelRegistry surface (from the installed dep).
- file: node_modules/@earendil-works/pi-coding-agent/dist/core/auth-storage.d.ts
  why: AuthStorage.inMemory(data?) (headless, no disk); setRuntimeApiKey(provider, key);
        getApiKey(provider) priority chain (runtime→auth.json→OAuth→ENV→fallback). Env-var
        resolution is automatic — no extra code for process.env.ANTHROPIC_API_KEY.
- file: node_modules/@earendil-works/pi-coding-agent/dist/core/model-registry.d.ts
  why: ModelRegistry.inMemory(authStorage) + find(provider, modelId): Model<Api> | undefined +
        getApiKeyForProvider(provider) + hasConfiguredAuth(model). The resolution seam (Decision 1).
```

### Current Codebase tree (relevant slice)

```bash
src/harnesses/
├── claude-code-harness.ts   # REFERENCE (lazy-import + ConfigError + initialize/terminate/normalizeModel)
├── harness-registry.ts      # CONSUMER (register/has/get — used by initialize test)
├── index.ts                 # UNTOUCHED (barrel; PiHarness not exported — S1 decision)
├── pi-harness.ts            # ← MODIFY (replace initialize/terminate stubs + add resolveModel)
└── session-store.ts         # untouched
src/types/
├── harnesses.ts             # CONSUMER (Harness interface — normalizeModel returns ModelSpec; HarnessOptions)
├── agent.ts                 # CONSUMER (AGENT_ERROR_CODES — for ConfigError code)
└── streaming.ts             # untouched
src/utils/
├── model-spec.ts            # CONSUMER (parseModelSpec — normalizeModel delegates here)
└── harness-config.ts        # CONSUMER (getGlobalHarnessConfig().defaultModelProvider)
src/__tests__/unit/providers/
├── claude-code-harness-initialize.test.ts        # REFERENCE (real-import init test pattern)
├── claude-code-harness-terminate.test.ts         # REFERENCE (terminate test pattern)
├── claude-code-harness-loadskills.test.ts        # REFERENCE (vi.mock precedent)
├── pi-harness.test.ts                            # (S1) — must still pass (structure/capabilities/stubs)
├── pi-harness-normalizemodel.test.ts             # (S1) — must still pass (normalizeModel unchanged behavior)
├── pi-harness-initialize.test.ts                 # ← NEW
└── pi-harness-resolvemodel.test.ts               # ← NEW
node_modules/@earendil-works/pi-coding-agent/      # INSTALLED (S1) — re-exports ModelRegistry/AuthStorage/createAgentSession
```

### Desired Codebase tree with files to be added/changed

```bash
src/harnesses/pi-harness.ts                            # MODIFY (real initialize/terminate + resolveModel + fields)
src/__tests__/unit/providers/pi-harness-initialize.test.ts     # NEW
src/__tests__/unit/providers/pi-harness-resolvemodel.test.ts   # NEW
# (barrels, registry, register-defaults, execute/registerMCPs/loadSkills, types, other harnesses — UNTOUCHED.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Do NOT use getModel(). It is (a) not importable (@earendil-works/pi-ai is a
//   non-hoisted transitive dep → ERR_MODULE_NOT_FOUND; nested path → ERR_PACKAGE_PATH_NOT_EXPORTED),
//   and (b) generic-constrained to KnownProvider + known model ids — incompatible with the open-set
//   ModelSpec. Use this.modelRegistry.find(spec.provider, spec.model) (re-exported by pi-coding-agent).
//   (Decision 1; research/model-resolution-path.md.)

// CRITICAL #2 — resolveModel is a NEW method, NOT a change to normalizeModel's signature. The
//   Harness interface pins normalizeModel(): ModelSpec (src/types/harnesses.ts). S1 ships
//   normalizeModel = parseModelSpec(model). "Map to Model<any>" = a sibling resolveModel(spec)
//   method T2 consumes. (Decision 2.)

// CRITICAL #3 — Do NOT call createAgentSession in initialize. That is T2 (P2.M2.T2.S1). initialize
//   only loads the SDK module + builds the registry + stores options. Calling createAgentSession now
//   would (a) require a model (not yet resolved at init time), (b) start network/extensions loading,
//   (c) blow the scope boundary with T2. (Decision 3.)

// CRITICAL #4 — Do NOT add @earendil-works/pi-ai to package.json. getModel is wrong (CRITICAL #1),
//   so pi-ai yields no benefit. Derive the Model<Api> type from the re-exported ModelRegistry:
//   `type PiModel = NonNullable<ReturnType<ModelRegistry['find']>>;`. AuthStorage + ModelRegistry are
//   re-exported by pi-coding-agent (index.d.ts L5, L11). (Decision 4.)

// GOTCHA #5 — isolatedModules: true (tsconfig.json). All type-only imports use `import type`.
//   `parseModelSpec` (value), `getGlobalHarnessConfig` (value), `ConfigError` (value, if imported),
//   and `ModelRegistry`/`AuthStorage` (used as VALUES in initialize: `ModelRegistry.inMemory(...)`)
//   are plain `import`s. The SDK module type uses `typeof import("@earendil-works/pi-coding-agent")`.

// GOTCHA #6 — The SDK field type annotation `typeof import("...")` is a TYPE position (erased at
//   runtime); the actual module is loaded by the DYNAMIC `await import("...")` in initialize. This is
//   exactly ClaudeCodeHarness's pattern (L167 field + L238 dynamic import). No static import of the SDK.

// GOTCHA #7 — ModelRegistry.inMemory + AuthStorage.inMemory are the HEADLESS constructors (no disk:
//   no agentDir, no auth.json, no models.json path). Prefer them over ModelRegistry.create (which
//   reads ~/.pi/agent/models.json) for a deterministic, testable harness. Env-var API-key resolution
//   (process.env.ANTHROPIC_API_KEY etc.) is BUILT INTO AuthStorage.getApiKey — no extra wiring.

// GOTCHA #8 — options.apiKey is provider-AGNOSTIC (HarnessOptions, PRD §7.5: "forwarded to the LLM
//   provider"). At initialize time we do NOT know the target provider (no model yet). So inject it
//   per-provider LATER — in resolveModel, after parseModelSpec reveals spec.provider:
//   `if (this.options?.apiKey) this.authStorage.setRuntimeApiKey(spec.provider, this.options.apiKey);`

// GOTCHA #9 — ConfigError already exists: src/harnesses/claude-code-harness.ts L83-101 (shipped in
//   P2.M1.T1.S2). `import { ConfigError } from "./claude-code-harness.js"` if it's a named export;
//   otherwise import AGENT_ERROR_CODES from ../types/agent.js and mirror the class. Do NOT duplicate
//   it. resolveModel throws `new ConfigError(msg, { code: AGENT_ERROR_CODES.CONFIG_ERROR, details: {...} })`.

// GOTCHA #10 — initialize must be IDEMPOTENT (if this.sdk already set, return immediately) — mirror
//   ClaudeCodeHarness L233-235. terminate must be idempotent too (if this.sdk === null, return) —
//   mirror ClaudeCodeHarness L333-335. The registry manages ready-state externally; NO internal
//   isInitialized flag (matches S1's "no extra fields beyond id/capabilities" — now extended to the
//   four SDK fields, all nullable).

// GOTCHA #11 — normalizeModel change (threading getGlobalHarnessConfig().defaultModelProvider) must
//   be BACKWARD-COMPATIBLE with S1's pi-harness-normalizemodel.test.ts. getGlobalHarnessConfig()
//   returns defaultModelProvider as undefined when unset → parseModelSpec(model, undefined) → uses
//   its own default 'anthropic'. So S1's `'claude-sonnet-4' → {provider:'anthropic'}` still holds.
//   If you skip this enhancement entirely (leave normalizeModel = parseModelSpec(model)), that is
//   ALSO acceptable — the global-default threading is an optional nicety, not a success criterion.

// GOTCHA #12 — resolveModel must guard against uninitialized state: if `this.modelRegistry` is null
//   (initialize not called), throw a clear Error ("PiHarness not initialized. Call initialize() first.")
//   — mirror ClaudeCodeHarness's execute() guard pattern.

// GOTCHA #13 — The vi.mock in pi-harness-resolvemodel.test.ts is HOISTED file-scope (affects ALL
//   tests in that file). That's why the REAL-import assertions live in a SEPARATE file
//   (pi-harness-initialize.test.ts, no vi.mock). Do not mix the two in one file.

// GOTCHA #14 — execute/registerMCPs/loadSkills MUST STILL THROW citing their downstream subtasks
//   (T2 / P2.M4.T1.S2 / P2.M3.T2.S3) — unchanged from S1. Do NOT implement them in S2. S1's
//   pi-harness.test.ts asserts these throw — keep those stub bodies intact.

// GOTCHA #15 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks
//   src/harnesses/pi-harness.ts (proving it compiles + the dynamic-import + derived PiModel types
//   are sound + no cycle). Test type errors surface in `npm test` (vitest/esbuild). Run BOTH gates.
```

---

## Implementation Blueprint

### Data models and structure

No new exported types. `PiHarness` adds four private nullable fields + one PiHarness-specific
public method. The `Model<Api>` type is **derived** (not imported from pi-ai):

```ts
// === src/harnesses/pi-harness.ts — the changes vs S1's skeleton ===
import type {
  Harness, HarnessId, HarnessCapabilities, HarnessOptions,
  HarnessRequest, HarnessHookEvents, ToolExecutionRequest,
  ToolExecutionResult, ModelSpec,
} from "../types/harnesses.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import type { AgentResponse } from "../types/agent.js";
import type { StreamEvent } from "../types/streaming.js";
import { parseModelSpec } from "../utils/model-spec.js";
import { getGlobalHarnessConfig } from "../utils/harness-config.js";
import { AGENT_ERROR_CODES } from "../types/agent.js";
// ConfigError ships in P2.M1.T1.S2 — import it from the sibling harness (verify the named export):
import { ConfigError } from "./claude-code-harness.js";
// ModelRegistry + AuthStorage are VALUE imports (used as ModelRegistry.inMemory(...) / AuthStorage.inMemory()):
import { ModelRegistry, AuthStorage } from "@earendil-works/pi-coding-agent";

/**
 * The Pi `Model<Api>` element type, derived from the re-exported ModelRegistry so
 * NO import from the non-hoisted `@earendil-works/pi-ai` is needed (Decision 4).
 * Structurally identical to Model<Api>; assignable to Model<any> for createAgentSession.
 */
type PiModel = NonNullable<ReturnType<ModelRegistry["find"]>>;

export class PiHarness implements Harness {
  readonly id: HarnessId = "pi";
  readonly capabilities: HarnessCapabilities = {
    mcp: true, skills: true, lsp: true,
    streaming: true, sessions: true, extendedThinking: true,
  } satisfies HarnessCapabilities;

  // ── S2: SDK + registry state (all nullable for idempotent terminate) ───────────────────────
  /** Lazily-imported Pi SDK module (mirrors ClaudeCodeHarness.sdk). Null until initialize(). */
  private sdk: typeof import("@earendil-works/pi-coding-agent") | null = null;
  /** Headless auth store (env/runtime API-key resolution). Null until initialize(). */
  private authStorage: AuthStorage | null = null;
  /** Model registry (built-in + custom models; per-provider auth). Null until initialize(). */
  private modelRegistry: ModelRegistry | null = null;
  /** Caller-supplied options (apiKey forwarded per-provider at resolveModel time). */
  private options: HarnessOptions | null = null;

  // ── S2: lifecycle ──────────────────────────────────────────────────────────────────────────
  /**
   * Initialize the Pi harness (PRD §7.3).
   *
   * Lazily `await import`s the Pi SDK, builds a headless `ModelRegistry.inMemory(...)`, and stores
   * the caller's options. Does NOT call `createAgentSession` — that is T2 (P2.M2.T2.S1), which
   * consumes `this.sdk`, `this.modelRegistry`, and `this.resolveModel(spec)`.
   *
   * Idempotent: a no-op if already initialized. API keys are resolved per-provider at
   * `resolveModel` time (the provider is unknown until a model string is parsed — GOTCHA #8).
   */
  async initialize(options?: HarnessOptions): Promise<void> {
    // Idempotent guard (mirror ClaudeCodeHarness L233-235).
    if (this.sdk) return;

    // Lazy SDK import (mirror ClaudeCodeHarness L237-248).
    try {
      this.sdk = await import("@earendil-works/pi-coding-agent");
    } catch (error) {
      throw new Error(
        `Failed to load @earendil-works/pi-coding-agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
    if (!this.sdk) {
      throw new Error("Failed to load @earendil-works/pi-coding-agent: Import returned null");
    }

    // Headless registry: no disk (no agentDir/models.json/auth.json). Env-var key resolution
    // is built into AuthStorage.getApiKey (GOTCHA #7).
    this.authStorage = AuthStorage.inMemory();
    this.modelRegistry = ModelRegistry.inMemory(this.authStorage);

    // Store options; apiKey is applied per-provider in resolveModel (GOTCHA #8).
    this.options = options ?? null;
  }

  /**
   * Terminate the harness and release references (PRD §7.3).
   *
   * Idempotent. Nulls sdk/authStorage/modelRegistry/options to allow GC. The Pi SDK manages its
   * own resources internally; no session exists at this layer (createAgentSession is T2).
   */
  async terminate(): Promise<void> {
    // Idempotent guard (mirror ClaudeCodeHarness L333-335).
    if (this.sdk === null) return;
    this.sdk = null;
    this.authStorage = null;
    this.modelRegistry = null;
    this.options = null;
  }

  // ── S2: ModelSpec → Model<Api> resolution (the "map to Model<any>" step) ───────────────────
  /**
   * Resolve a parsed {@link ModelSpec} to a Pi `Model<Api>` via the registry (PRD §7.8).
   *
   * Uses `modelRegistry.find(provider, model)` — the open-set, registry/auth-aware seam (NOT
   * `getModel`, which is generic-constrained to known providers/models and not importable —
   * research/model-resolution-path.md). T2 passes the result to `createAgentSession({ model })`.
   *
   * @throws {Error} if initialize() has not been called.
   * @throws {ConfigError} (code CONFIG_ERROR) if the model is not in the registry.
   */
  resolveModel(spec: ModelSpec): PiModel {
    if (!this.modelRegistry || !this.authStorage) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }
    // Inject the caller's apiKey for THIS provider (provider unknown until parse time — GOTCHA #8).
    if (this.options?.apiKey) {
      this.authStorage.setRuntimeApiKey(spec.provider, this.options.apiKey);
    }
    const model = this.modelRegistry.find(spec.provider, spec.model);
    if (!model) {
      throw new ConfigError(
        `Model "${spec.provider}/${spec.model}" not found in the Pi model registry. ` +
          `Ensure the provider/model id is correct and auth is configured ` +
          `(env var, auth.json, or HarnessOptions.apiKey). (PRD §7.8)`,
        {
          code: AGENT_ERROR_CODES.CONFIG_ERROR,
          details: { provider: spec.provider, model: spec.model, harnessId: this.id },
        },
      );
    }
    return model;
  }

  // ── S1 surface (unchanged except optional normalizeModel enhancement) ──────────────────────
  /**
   * Parse a model string into a ModelSpec (PRD §7.8). Open provider set — NO anthropic gate
   * (pi is vendor-neutral). Threads the global defaultModelProvider when configured (S2 nicety;
   * backward-compatible — undefined falls through to parseModelSpec's 'anthropic' default).
   */
  normalizeModel(model: string): ModelSpec {
    const defaultProvider = getGlobalHarnessConfig().defaultModelProvider;
    return parseModelSpec(model, defaultProvider);
  }

  supports(capability: keyof HarnessCapabilities): boolean {
    return this.capabilities[capability];
  }
  requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean {
    return features.every((f) => this.capabilities[f]);
  }

  // ── THROWING STUBS — unchanged from S1 (owned by downstream subtasks) ──────────────────────
  async execute<T>(
    _request: HarnessRequest,
    _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    _hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    throw new Error("PiHarness.execute() not implemented — P2.M2.T2.S1 (prompt/subscribe → AgentResponse)");
  }
  async registerMCPs(_servers: MCPServer[]): Promise<Tool[]> {
    throw new Error("PiHarness.registerMCPs() not implemented — P2.M4.T1.S2 (MCPHandler.toPiCustomTools)");
  }
  async loadSkills(_skills: Skill[]): Promise<void> {
    throw new Error("PiHarness.loadSkills() not implemented — P2.M3.T2.S3 (native agentskills.io loading)");
  }
}
```

> **NOTE on `ConfigError` import:** it ships in P2.M1.T1.S2. Verify the named export with
> `grep -n "export class ConfigError" src/harnesses/claude-code-harness.ts` before relying on it.
> If for any reason it isn't exported, define a local `ConfigError` mirroring
> claude-code-harness.ts L83-101 (importing `AGENT_ERROR_CODES` from `../types/agent.js`).

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note baseline.
  - RUN: `grep -n "class PiHarness implements Harness" src/harnesses/pi-harness.ts` → 1 hit (S1 prereq).
        (If absent, S1 hasn't landed — STOP; S2 starts from S1's skeleton.)
  - RUN: `grep -n "export class ConfigError" src/harnesses/claude-code-harness.ts` → 1 hit (verify ConfigError export).
  - RUN: `grep -n "getGlobalHarnessConfig\|defaultModelProvider" src/utils/harness-config.ts` → hits (P1.M2.T2.S1 prereq).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN. If red from a parallel task, surface it.
  - RUN: `ls node_modules/@earendil-works/pi-coding-agent/dist/index.js` → exists (S1 install prereq).

Task 1: MODIFY src/harnesses/pi-harness.ts (replace stubs + add resolveModel + fields)
  - APPLY the edits from "Data models and structure":
      * Add imports: getGlobalHarnessConfig, AGENT_ERROR_CODES, ConfigError, ModelRegistry, AuthStorage.
      * Add `type PiModel = NonNullable<ReturnType<ModelRegistry["find"]>>;`.
      * Add the 4 private nullable fields (sdk/authStorage/modelRegistry/options).
      * REPLACE initialize stub → real body (idempotent + await import + AuthStorage.inMemory +
        ModelRegistry.inMemory + store options).
      * REPLACE terminate stub → real body (idempotent + null all 4 refs).
      * ADD resolveModel(spec) method.
      * ENHANCE normalizeModel to thread getGlobalHarnessConfig().defaultModelProvider (optional
        but preferred — GOTCHA #11).
      * LEAVE execute/registerMCPs/loadSkills stubs UNCHANGED (GOTCHA #14).
  - VERIFY (grep): `grep -n "await import(\"@earendil-works/pi-coding-agent\")\|ModelRegistry.inMemory\|AuthStorage.inMemory\|modelRegistry.find(\|resolveModel\|setRuntimeApiKey" src/harnesses/pi-harness.ts` → 5+ hits.
  - VERIFY (NO getModel): `! grep -n "getModel(" src/harnesses/pi-harness.ts` → exit 1 (no match).
  - VERIFY (NO pi-ai import): `! grep -n "@earendil-works/pi-ai" src/harnesses/pi-harness.ts` → exit 1.

Task 2: CREATE src/__tests__/unit/providers/pi-harness-initialize.test.ts (REAL import — no vi.mock)
  - MIRROR src/__tests__/unit/providers/claude-code-harness-initialize.test.ts structure
    (imports: vitest; PiHarness; HarnessRegistry from '../../../harnesses/harness-registry.js';
    `import { ModelRegistry } from '@earendil-works/pi-coding-agent'` for instanceof check;
    `import type { HarnessOptions } from '../../../types/harnesses.js'`).
  - CASES (describe('PiHarness - initialize()')):
      SDK Import Success:
        - initialize() → harness['sdk'] not null; has createAgentSession + ModelRegistry exports.
        - sdk has createAgentSession typeof 'function'; ModelRegistry typeof 'function'/'object'.
      Registry + AuthStorage built:
        - harness['modelRegistry'] instanceof ModelRegistry === true.
        - harness['authStorage'] not null.
      Options Handling:
        - initialize() (no arg), initialize({}), initialize({apiKey:'sk-x'}), initialize({endpoint,
          timeout, headers, sessionId}) → all resolve; harness['options'] stored (apiKey preserved).
      Idempotent Behavior:
        - 2× initialize() → same sdk reference; harness['modelRegistry'] rebuilt or same (assert sdk ===).
      Method Signature:
        - returns Promise<void>; resolved === undefined.
      Registry Integration:
        - HarnessRegistry.getInstance().register(new PiHarness()); reset in afterEach (GOTCHA #9 of S1).
  - CASES (describe('PiHarness - terminate()')) — mirror claude-code-harness-terminate.test.ts:
      - after init, terminate() → sdk/authStorage/modelRegistry/options all null.
      - terminate() before init (no throw); all stay null.
      - returns Promise<void>; idempotent (3× calls); re-init works after terminate.
  - afterEach: `const r = HarnessRegistry.getInstance(); r._resetInitStateForTesting(); HarnessRegistry._resetForTesting();`
    (copy from harness-registry.test.ts).
  - PLACEMENT: src/__tests__/unit/providers/.

Task 3: CREATE src/__tests__/unit/providers/pi-harness-resolvemodel.test.ts (vi.mock — deterministic)
  - Use the vi.mock shape from research/initialize-terminate-pattern.md §3:
      vi.mock('@earendil-works/pi-coding-agent', () => ({
        ModelRegistry: { inMemory: vi.fn(() => ({ find: fakeFind, getApiKeyForProvider: vi.fn() })) },
        AuthStorage: { inMemory: vi.fn(() => ({ setRuntimeApiKey: fakeSetKey, getApiKey: vi.fn() })) },
      }));
      const fakeFind = vi.fn(); const fakeSetKey = vi.fn();
      const fakeModel = { id: 'claude-sonnet-4', provider: 'anthropic', api: 'anthropic-messages' /* ... */ };
  - CASES (describe('PiHarness - resolveModel()')):
      resolution via find:
        - initialize() → resolveModel({provider:'anthropic', model:'claude-sonnet-4', raw:...})
          → returns fakeModel; fakeFind called with ('anthropic', 'claude-sonnet-4').
      open-set providers (NO gate — pi is vendor-neutral):
        - resolveModel({provider:'openai', model:'gpt-4o', raw:...}) → fakeFind called with ('openai','gpt-4o').
      apiKey injection:
        - initialize({apiKey:'sk-test'}) → resolveModel({provider:'anthropic',...}) →
          fakeSetKey called with ('anthropic', 'sk-test') BEFORE find.
      not-found → ConfigError:
        - fakeFind.mockReturnValue(undefined) → resolveModel({provider:'foo', model:'bar', raw:...})
          throws; (e as ConfigError).code === AGENT_ERROR_CODES.CONFIG_ERROR.
      uninitialized guard:
        - new PiHarness() (no init) → resolveModel({...}) throws /not initialized/i.
  - PLACEMENT: src/__tests__/unit/providers/.
  - NOTE: vi.mock is hoisted (GOTCHA #13) — this file does ONLY resolveModel tests (no real-import
    assertions). Real-import assertions live in Task 2's file.

Task 4: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: lint, targeted tests, full suite, build, grep contract, runtime spot-check.
  - If lint names pi-harness.ts: check import type vs value (ModelRegistry/AuthStorage are VALUES;
    the SDK module type is `typeof import(...)`), or a wrong execute return type (must stay the union).
  - If S1's pi-harness-normalizemodel.test.ts fails: the normalizeModel enhancement broke the default
    — ensure parseModelSpec still gets undefined→'anthropic' when global config unset (GOTCHA #11).
```

### Implementation Patterns & Key Details

```ts
// === The lazy-import field + initialize (mirror ClaudeCodeHarness L167 + L229-248) ===
private sdk: typeof import("@earendil-works/pi-coding-agent") | null = null;

async initialize(options?: HarnessOptions): Promise<void> {
  if (this.sdk) return;                                            // idempotent
  try {
    this.sdk = await import("@earendil-works/pi-coding-agent");
  } catch (error) {
    throw new Error(`Failed to load @earendil-works/pi-coding-agent: ${
      error instanceof Error ? error.message : "Unknown error"}`);
  }
  if (!this.sdk) throw new Error("Failed to load @earendil-works/pi-coding-agent: Import returned null");
  this.authStorage = AuthStorage.inMemory();                       // headless (no disk)
  this.modelRegistry = ModelRegistry.inMemory(this.authStorage);   // built-in models + auth
  this.options = options ?? null;
}

// === terminate (mirror ClaudeCodeHarness L331-360) ===
async terminate(): Promise<void> {
  if (this.sdk === null) return;       // idempotent
  this.sdk = this.authStorage = this.modelRegistry = this.options = null;
}

// === resolveModel — THE ModelSpec→Model<Api> step (Decision 1 + 2) ===
resolveModel(spec: ModelSpec): PiModel {
  if (!this.modelRegistry || !this.authStorage)
    throw new Error("PiHarness not initialized. Call initialize() first.");
  if (this.options?.apiKey)
    this.authStorage.setRuntimeApiKey(spec.provider, this.options.apiKey);   // GOTCHA #8
  const model = this.modelRegistry.find(spec.provider, spec.model);          // NOT getModel
  if (!model) throw new ConfigError(
    `Model "${spec.provider}/${spec.model}" not found in the Pi model registry. ... (PRD §7.8)`,
    { code: AGENT_ERROR_CODES.CONFIG_ERROR, details: { provider: spec.provider, model: spec.model, harnessId: this.id } });
  return model;
}

// === normalizeModel — open-set, threads global default (backward-compatible) ===
normalizeModel(model: string): ModelSpec {
  return parseModelSpec(model, getGlobalHarnessConfig().defaultModelProvider);
}

// === The derived PiModel type (no pi-ai import) ===
type PiModel = NonNullable<ReturnType<ModelRegistry["find"]>>;   // === Model<Api>
```

### Integration Points

```yaml
SOURCE (MODIFY):
  - src/harnesses/pi-harness.ts : real initialize/terminate + resolveModel + 4 fields + PiModel type.

TESTS (NEW):
  - src/__tests__/unit/providers/pi-harness-initialize.test.ts     (REAL import — no vi.mock)
  - src/__tests__/unit/providers/pi-harness-resolvemodel.test.ts   (vi.mock pi-coding-agent)

IMPORTS ADDED (to pi-harness.ts):
  - value: { ModelRegistry, AuthStorage } from "@earendil-works/pi-coding-agent"   (re-exported; S1's dep)
  - value: { ConfigError } from "./claude-code-harness.js"   (P2.M1.T1.S2 — verify named export)
  - value: { AGENT_ERROR_CODES } from "../types/agent.js"
  - value: { getGlobalHarnessConfig } from "../utils/harness-config.js"
  - value: { parseModelSpec } from "../utils/model-spec.js"   (already imported in S1)
  - type : HarnessOptions, ModelSpec, etc. from "../types/harnesses.js"   (S1)

BARRELS:
  - src/harnesses/index.ts : UNTOUCHED (PiHarness not barrel-exported — S1 decision).
  - src/index.ts           : UNTOUCHED (public Harness-surface export = P3.M3.T1.S1).

CONSUMERS (kept green — NO source edits):
  - resolveModel is NEW (no existing consumer). T2 (P2.M2.T2.S1) will be its first consumer.
  - HarnessRegistry.register/has/get UNCHANGED (the initialize test registers on a fresh singleton).

NOT IN SCOPE (do not touch — owned downstream):
  - createAgentSession / prompt / subscribe → AgentResponse (execute body)   → P2.M2.T2.S1 (T2)
  - customTools ToolDefinition mapping (JSON-Schema→TypeBox)                  → P2.M3.T1.S1 + P2.M4.T1.S1/S2
  - StreamEvent mapping + HarnessHookEvents adaptation                       → P2.M3.T2.S1/S2
  - Native agentskills.io skill loading (loadSkills body) + default-register → P2.M3.T2.S3
  - registerMCPs body                                                         → P2.M4.T1.S2
  - Agent harness rewire (registry.get('pi'))                                 → P3.M1
  - Harness-surface public export                                             → P3.M3.T1.S1
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates
> `src/harnesses/pi-harness.ts` compiles + the dynamic-import + derived `PiModel` type are sound +
> no import cycle). `npm test` = `vitest run` (esbuild transpile-only; new + full suite).
> `npm run build` = `tsc` (emits `dist/`). No eslint/prettier.

### Level 1: Syntax & Type Check (run after Task 1)

```bash
npm run lint
# Expected: exit 0. An error naming pi-harness.ts =
#   (a) ModelRegistry/AuthStorage imported as `import type` (they're VALUES — used as .inMemory()),
#   (b) ConfigError not exported from claude-code-harness.ts → define locally (GOTCHA #9),
#   (c) the `typeof import("...")` field annotation malformed,
#   (d) PiModel derivation wrong (use NonNullable<ReturnType<ModelRegistry["find"]>>),
#   (e) execute's return type changed (must stay the full interface union — GOTCHA: leave S1's stub).
```

### Level 2: Unit Tests (run after Tasks 2–3)

```bash
# initialize + terminate (REAL import — proves the SDK loads + registry builds)
npm test -- src/__tests__/unit/providers/pi-harness-initialize
# Expected: all pass. A failure on "modelRegistry instanceof ModelRegistry" = wrong construction.
# A failure on idempotency = missing `if (this.sdk) return;` guard.

# resolveModel (vi.mock — deterministic resolution + ConfigError + apiKey injection)
npm test -- src/__tests__/unit/providers/pi-harness-resolvemodel
# Expected: all pass. A failure on "not found" = didn't throw ConfigError or wrong code.
# A failure on "find called with" = the spec wasn't split into provider/model correctly.

# S1's suites MUST STILL PASS (backward-compat check — GOTCHA #11/#14):
npm test -- src/__tests__/unit/providers/pi-harness.test src/__tests__/unit/providers/pi-harness-normalizemodel
# Expected: all pass. A normalizeModel failure = the default-provider threading broke the 'anthropic'
#   default (ensure parseModelSpec gets undefined when global config unset). A stub-throw failure =
#   execute/registerMCPs/loadSkills were accidentally implemented (revert to S1's throwing stubs).

# Full suite (catch any ripple — esp. the parallel S1/S2 suites + registry/agent/claude-code suites)
npm test
# Expected: all pass. If harness-registry / agent / claude-code-harness-* suites regressed, you
# accidentally touched a shared file — revert. (S2 touches only pi-harness.ts + 2 tests.)
```

### Level 3: Build (declaration-emit sanity)

```bash
npm run build
# Expected: exit 0; dist/harnesses/pi-harness.{js,d.ts} emitted; the .d.ts declares the real
# initialize/terminate + resolveModel + the PiModel-derived return type.
ls dist/harnesses/pi-harness.js dist/harnesses/pi-harness.d.ts
```

### Level 4: Contract Verification (grep gates)

```bash
# The real lifecycle + resolution are present:
grep -n 'await import("@earendil-works/pi-coding-agent")' src/harnesses/pi-harness.ts   # 1 hit
grep -n "ModelRegistry.inMemory\|AuthStorage.inMemory" src/harnesses/pi-harness.ts       # 2 hits
grep -n "resolveModel\|modelRegistry.find(" src/harnesses/pi-harness.ts                  # 2+ hits
grep -n "setRuntimeApiKey" src/harnesses/pi-harness.ts                                   # 1 hit (apiKey injection)
grep -n "ConfigError\|AGENT_ERROR_CODES.CONFIG_ERROR" src/harnesses/pi-harness.ts        # 1+ hit

# NOT using getModel (Decision 1) and NOT importing pi-ai (Decision 4):
! grep -n "getModel(" src/harnesses/pi-harness.ts                 # exit 1 (no match)
! grep -n "@earendil-works/pi-ai" src/harnesses/pi-harness.ts     # exit 1 (no match)

# The throwing stubs are intact (execute/registerMCPs/loadSkills still cite downstream subtasks):
grep -n "P2.M2.T2.S1\|P2.M4.T1.S2\|P2.M3.T2.S3" src/harnesses/pi-harness.ts   # 3 hits

# Untouched boundaries:
! grep -n "PiHarness" src/harnesses/index.ts   # exit 1 (no match — barrel untouched)
! grep -n "PiHarness" src/index.ts             # exit 1 (no match — public export is P3.M3.T1.S1)

# Exactly the expected file set changed:
git status --short
# Expected: M src/harnesses/pi-harness.ts;
#           ?? src/__tests__/unit/providers/pi-harness-initialize.test.ts;
#           ?? src/__tests__/unit/providers/pi-harness-resolvemodel.test.ts.
# (S1's pi-harness.test.ts / pi-harness-normalizemodel.test.ts already exist — not re-added.)
```

### Level 5: Behavioral Spot-Check (end-to-end via tsx)

```bash
# Proves initialize loads the SDK + builds a registry, resolveModel resolves (or throws clearly),
# and terminate nulls refs — against the REAL installed dep (no mocks).
npx tsx -e '
  import { PiHarness } from "./src/harnesses/pi-harness.js";
  import { ModelRegistry } from "@earendil-works/pi-coding-agent";
  const h = new PiHarness();
  await h.initialize({ apiKey: "sk-dummy" });
  const sdk = (h as any).sdk, mr = (h as any).modelRegistry, as_ = (h as any).authStorage, opts = (h as any).options;
  console.log("sdk has createAgentSession:", typeof sdk?.createAgentSession === "function");
  console.log("modelRegistry instanceof   :", mr instanceof ModelRegistry);
  console.log("authStorage present        :", !!as_);
  console.log("options.apiKey stored      :", opts?.apiKey === "sk-dummy");
  const spec = h.normalizeModel("anthropic/claude-sonnet-4-20250514");
  console.log("normalizeModel             :", JSON.stringify(spec));
  try {
    const m = h.resolveModel(spec);
    console.log("resolveModel ok            :", !!m, "(id:", m?.id + ")");
  } catch (e) {
    console.log("resolveModel threw         :", (e as Error).name, "/", (e as Error).message.slice(0,60));
  }
  await h.terminate();
  console.log("terminate nulls sdk        :", (h as any).sdk === null);
  console.log("terminate nulls registry   :", (h as any).modelRegistry === null);
'
# Expected: sdk has createAgentSession: true ; modelRegistry instanceof: true ; authStorage present: true ;
#           options.apiKey stored: true ; normalizeModel: {"provider":"anthropic","model":"claude-sonnet-4-20250514",...} ;
#           resolveModel ok: true (id: ...) OR resolveModel threw: ConfigError / ...not found... (acceptable if
#           the model id isn't in the built-in catalogue — the throw proves the not-found path works);
#           terminate nulls sdk: true ; terminate nulls registry: true.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` exits 0 (pi-harness.ts compiles; dynamic-import + PiModel derivation sound; no cycle).
- [ ] `npm test` exits 0 (2 new suites + S1's 2 suites + full regression).
- [ ] `npm run build` exits 0; `dist/harnesses/pi-harness.{js,d.ts}` emitted with real lifecycle + resolveModel.
- [ ] `git status --short` shows: 1 modified (pi-harness.ts) + 2 new tests. Nothing else touched.

### Feature Validation

- [ ] `initialize()` lazily imports the SDK (idempotent; descriptive error on import failure); builds
      `AuthStorage.inMemory()` + `ModelRegistry.inMemory(authStorage)`; stores options.
- [ ] `initialize()` accepts `{apiKey, endpoint, timeout, headers, sessionId}` / `{}` / no-arg.
- [ ] `terminate()` nulls `sdk`/`authStorage`/`modelRegistry`/`options`; idempotent; safe before init.
- [ ] `resolveModel(spec)` maps ModelSpec→Model via `modelRegistry.find(provider, model)`; injects
      `options.apiKey` per provider; throws `ConfigError` (code CONFIG_ERROR) when not found; throws
      when uninitialized.
- [ ] `normalizeModel` returns ModelSpec; `'claude-sonnet-4'` → `{provider:'anthropic'}` (S1 behaviour).
- [ ] `execute`/`registerMCPs`/`loadSkills` still throw citing T2 / P2.M4.T1.S2 / P2.M3.T2.S3.

### Code Quality Validation

- [ ] NO `getModel(` and NO `@earendil-works/pi-ai` import (Decision 1 + 4).
- [ ] `ModelRegistry`/`AuthStorage` imported as VALUES (used as `.inMemory()`); types via `import type`.
- [ ] `PiModel` derived as `NonNullable<ReturnType<ModelRegistry["find"]>>` (no pi-ai type import).
- [ ] `ConfigError` reused (not duplicated) from claude-code-harness.ts (or locally defined if not exported).
- [ ] Idempotent guards on initialize + terminate (no internal isInitialized flag).
- [ ] No edits to barrels, registry, register-defaults, execute/registerMCPs/loadSkills, types, other harnesses.

### Documentation & Deployment

- [ ] No new dependencies (pi-ai NOT added — Decision 4); no env-var changes (AuthStorage reads env natively).
- [ ] JSDoc on initialize/terminate/resolveModel documents: createAgentSession is T2; find() not getModel;
      apiKey applied per-provider at resolve time; pi is vendor-neutral (open provider set).

---

## Anti-Patterns to Avoid

- ❌ **Don't use `getModel` or import `@earendil-works/pi-ai`.** pi-ai is a non-hoisted transitive dep
  (not importable), and `getModel` is generic-constrained to known providers/models (incompatible with
  the open ModelSpec). Use `modelRegistry.find(provider, model)`. (CRITICAL #1, Decision 1.)
- ❌ **Don't change `normalizeModel`'s return type to `Model<any>`.** The Harness interface pins it to
  `ModelSpec` (S1 shipped it). The Model<any> mapping is a NEW `resolveModel(spec)` method. (CRITICAL #2.)
- ❌ **Don't call `createAgentSession` in initialize.** That's T2 (P2.M2.T2.S1). initialize only loads
  the module + builds the registry + stores options. (CRITICAL #3.)
- ❌ **Don't add `@earendil-works/pi-ai` to package.json.** `getModel` is wrong either way; derive the
  `Model<Api>` type from the re-exported `ModelRegistry`. (CRITICAL #4, Decision 4.)
- ❌ **Don't implement execute/registerMCPs/loadSkills.** They stay throwing stubs (owned by T2 / P2.M4 /
  P2.M3). S1's tests assert they throw — keep those bodies intact. (GOTCHA #14.)
- ❌ **Don't use `ModelRegistry.create` / `AuthStorage.create` (disk-backed).** They read
  `~/.pi/agent/{auth,models}.json` — non-deterministic + disk-coupled. Use the `.inMemory()` factories.
  (GOTCHA #7.)
- ❌ **Don't apply `options.apiKey` in initialize.** The provider is unknown until a model string is
  parsed. Inject it per-provider in `resolveModel` via `authStorage.setRuntimeApiKey`. (GOTCHA #8.)
- ❌ **Don't break S1's `pi-harness-normalizemodel.test.ts`.** The normalizeModel default-provider
  threading must keep `'claude-sonnet-4' → {provider:'anthropic'}` when global config is unset.
  (`parseModelSpec(model, undefined)` → 'anthropic' default.) (GOTCHA #11.)
- ❌ **Don't mix vi.mock + real-import assertions in one test file.** vi.mock is hoisted file-scope.
  Keep them in separate files (initialize=real, resolveModel=mocked). (GOTCHA #13.)
- ❌ **Don't duplicate `ConfigError`.** It ships in P2.M1.T1.S2 (claude-code-harness.ts L83-101) — import it.
  (GOTCHA #9.)

---

## Confidence Score

**9/10** for one-pass implementation success. The one area of residual risk is the `ConfigError`
import (verify the named export in Task 0 — if not exported, define locally per GOTCHA #9, a 5-line
fallback). All other seams are verified against installed `.d.ts` files: the lazy-import pattern is
copied from ClaudeCodeHarness; `ModelRegistry.find`/`inMemory`/`AuthStorage.inMemory` signatures are
read directly from the installed pi-coding-agent; the two-file test split matches the repo's
ClaudeCodeHarness precedent; and the infeasibility of the contract's `getModel` instruction is proven
(two independent reasons), with `find()` as the verified-correct alternative. The runtime spot-check
(Level 5) will confirm end-to-end behaviour against the real dep.
