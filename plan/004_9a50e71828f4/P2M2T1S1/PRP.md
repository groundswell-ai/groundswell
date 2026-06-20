# PRP — P2.M2.T1.S1: Add Pi SDK dependency + `PiHarness` class skeleton

**PRD reference:** §7.1 (`pi` default harness — `@earendil-works/pi-coding-agent`),
§7.2 (`HarnessId = 'pi' | 'claude-code'`), §7.3 (`Harness` interface), §7.4 (`pi` capability column —
ALL `true`), §7.8 (model string NEVER harness-qualified; open `ModelProviderId` set).
**Plan:** `plan/004_9a50e71828f4/` — S1 of P2.M2.T1 ("PiHarness scaffold, dependency, and model
resolution"). Consumes P1.M1.T1.S1 (`src/types/harnesses.ts`), P1.M1.T2.S1 (`parseModelSpec`),
P1.M2.T1.S2 (`HarnessRegistry`). Unblocks S2 (initialize/execute wiring), P2.M3 (tools/streaming/
hooks/skills), P2.M4 (MCP→Pi tool bridge), P3.M1 (Agent harness resolution).
**Scope tag:** TWO artifacts. (1) `npm i @earendil-works/pi-coding-agent@0.79.8` (adds to `package.json`
deps + lockfile + `node_modules`). (2) NEW `src/harnesses/pi-harness.ts` — `PiHarness implements Harness`
with `id:'pi'`, ALL-true capabilities, a `parseModelSpec`-delegating `normalizeModel`, trivial
`supports`/`requiresFeatures`, and throwing stubs for `initialize`/`terminate`/`execute`/`registerMCPs`/
`loadSkills`. Plus 2 new test files. **No edits to barrels, registry, or any existing source.**

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Four load-bearing, non-obvious details:
> (1) **Package manager is npm** (NOT pnpm) — `package-lock.json` is newer + all scripts use `npm`.
> (2) The skeleton **does NOT import the Pi SDK** — S2 wires `createAgentSession`; S1 only installs the
> dep + ships a pure-TypeScript skeleton that compiles & instantiates.
> (3) **"registers" means structurally register-ABLE, not registered-in-the-helper.** Adding PiHarness to
> `registerDefaultHarnesses()` is **P2.M3.T2.S3** (explicitly deferred by the parallel P2.M1.T1.S2 PRP's
> `TODO(P2.M3.T2.S3)`). S1 proves registrability with a test on a fresh registry.
> (4) `normalizeModel` delegates to `parseModelSpec` with **NO anthropic-only gate** (pi is provider-open,
> unlike `ClaudeCodeHarness`). This is the string→ModelSpec layer; S2 owns ModelSpec→`Model<any>`.

---

## Goal

**Feature Goal:** Establish the `pi` harness as a compilable, instantiable `Harness` adapter in the
codebase, and install its SDK dependency — the foundation every subsequent PiHarness subtask (S2
through P2.M4) builds on. Concretely: `@earendil-works/pi-coding-agent@0.79.8` is a declared runtime
dependency that resolves under Node ESM, and `new PiHarness()` is a valid `Harness` (id `'pi'`, full
PRD-§7.4 capability set) that type-checks against `Harness` and is structurally register-able in
`HarnessRegistry`.

**Deliverable:**
1. **INSTALL** `@earendil-works/pi-coding-agent@0.79.8` via `npm i` → recorded as
   `"@earendil-works/pi-coding-agent": "^0.79.8"` in `package.json` `dependencies`; `package-lock.json`
   + `node_modules/@earendil-works/pi-coding-agent/` updated. (Task 1.)
2. **NEW `src/harnesses/pi-harness.ts`** — `export class PiHarness implements Harness` with:
   `readonly id: HarnessId = 'pi'`; `readonly capabilities` = all-six-`true` (PRD §7.4 `pi` column)
   via `satisfies HarnessCapabilities`; `normalizeModel` delegating to `parseModelSpec(model)` (NO
   anthropic gate); `supports`/`requiresFeatures` fully implemented (trivial); `initialize`/`terminate`/
   `execute`/`registerMCPs`/`loadSkills` as throwing stubs whose messages cite the owning downstream
   subtask. Imports are `import type` (isolatedModules-safe) + one value import (`parseModelSpec`).
   **No `import` from `@earendil-works/pi-coding-agent`** (S2's job). (Task 2.)
3. **NEW `src/__tests__/unit/providers/pi-harness.test.ts`** — structure, capabilities,
   `supports`/`requiresFeatures`, stub-throw behavior, `Harness`-interface satisfaction, `Provider`
   structural assignability, and live `HarnessRegistry.register(new PiHarness())` → `has('pi')`.
   (Task 3.)
4. **NEW `src/__tests__/unit/providers/pi-harness-normalizemodel.test.ts`** — open-set normalization
   (plain + qualified + custom provider), NO anthropic-only rejection (the pi/claude-code parity
   difference), `parseModelSpec` error delegation (empty/harness-qualified). (Task 4.)

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `pi-harness.ts` compiles against `Harness`; no import cycle.
2. `npm test` exits 0 — the 2 new suites pass; no other suite regresses (incl. parallel P2.M1.T1.S2's).
3. `npm run build` exits 0 — `dist/harnesses/pi-harness.{js,d.ts}` emitted.
4. Dep resolution: `grep "@earendil-works/pi-coding-agent" package.json` hits; the entry
   `node_modules/@earendil-works/pi-coding-agent/dist/index.{js,d.ts}` exists; a Node ESM dynamic
   `import(...)` resolves (Task 1 spot-check).
5. Contract (grep): `class PiHarness implements Harness`; `id: HarnessId = "pi"`; six capability
   `true` flags; `parseModelSpec(model)` in normalizeModel; **NO** `spec.provider !== "anthropic"` gate.

---

## ⚠️ SCOPE DECISIONS — four load-bearing details

### Decision 1 — Package manager is **npm**, version pinned to `0.79.8` (→ `^0.79.8`)

The repo has BOTH `package-lock.json` (161 KB, Jan 26 16:07) and a stale `pnpm-lock.yaml` (Jan 25).
The npm lock is **newer** and every `package.json` script (`build`/`test`/`lint`) runs under `npm`.
The work-item contract literally says `npm i`. ➡️ Use **`npm i @earendil-works/pi-coding-agent@0.79.8`**
so `package-lock.json` stays the source of truth. Version `0.79.8` is the verified release
(`docs/external_deps.md` §1 + `npm view` re-confirm); npm records it as `^0.79.8` (caret — matches the
repo convention for runtime deps, e.g. `"@anthropic-ai/claude-agent-sdk": "^0.1.0"`). Do NOT use pnpm.
See `research/pi-sdk-install.md`.

### Decision 2 — The skeleton does NOT import the Pi SDK (S1/S2 boundary)

S1 = "scaffold + dependency"; S2 = "Implement initialize/terminate + model resolution (ModelSpec→Model<any>)".
The SDK is **wired** in S2 (`createAgentSession`, `getModel`, `session.prompt/subscribe`). S1 only
**installs** the dep (so it RESOLVES) and ships a pure-TypeScript skeleton. An installed-but-unimported
dep is a normal npm state; `tsc`/`vitest` do not flag it. ➡️ `pi-harness.ts` imports ONLY local types +
`parseModelSpec`. Proving the dep resolves is a **validation step** (Node ESM dynamic import), NOT a
code import. See `research/pi-harness-skeleton.md` §1/§4.

### Decision 3 — "registers" = structurally register-ABLE (do NOT touch register-defaults.ts)

The contract says the skeleton must "compile & registers." The **actual default-registration** of
PiHarness into `registerDefaultHarnesses()` is **P2.M3.T2.S3** ("Native agentskills.io skill loading +
register PiHarness as default") — the parallel P2.M1.T1.S2 PRP ships that helper with an explicit
`// TODO(P2.M3.T2.S3): register PiHarness (id 'pi')`. S1 of P2.M2 must NOT edit `register-defaults.ts`
(it doesn't exist yet under P2.M1.T1.S2, and the PiHarness line is owned downstream). "Registers" is
satisfied by **structural typing**: `PiHarness implements Harness` ⊆ `Provider` (src/types/providers.ts
L569 — a structural superset), and `'pi' ∈ ProviderId` (`ProviderId = HarnessId | 'anthropic' | 'opencode'`,
`HarnessId = 'pi' | 'claude-code'`). ➡️ A test asserts `const p: Provider = new PiHarness();` compiles AND
`HarnessRegistry.getInstance().register(new PiHarness())` then `has('pi') === true`. That IS the proof —
same precedent as `claude-code-harness.test.ts`'s "can be registered with ProviderRegistry" case. See
`research/scope-and-parallels.md` §2.

### Decision 4 — `normalizeModel` has NO anthropic-only gate (pi is provider-open)

`ClaudeCodeHarness.normalizeModel` throws when `spec.provider !== "anthropic"` (PRD §7.8 claude-code
constraint). **Pi is vendor-neutral** (PRD §7.4 "LLM providers: any") — it must NOT replicate that gate,
or it would reject every non-Anthropic model (defeating pi's whole purpose). ➡️ PiHarness.normalizeModel
just `return parseModelSpec(model);` (open set; default provider `'anthropic'` for plain strings, same
happy-path behavior as ClaudeCodeHarness). The string→ModelSpec layer is S1; the ModelSpec→Pi
`Model<any>` conversion (via `getModel(provider, model)` from `@earendil-works/pi-ai`) is **S2**. This
delegation does NOT pre-empt S2 — it reuses existing infra (P1.M1.T2.S1) and returns a `ModelSpec` S2
consumes. A parity test asserts `normalizeModel('openai/gpt-4o')` **succeeds** (the key difference from
claude-code). See `research/pi-harness-skeleton.md` §3.

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agents:
- **P2.M2.T1.S2** — receives a compiling `PiHarness` and swaps the throwing `initialize`/`terminate` for
  real `createAgentSession()`/SDK-wiring + adds ModelSpec→`Model<any>`.
- **P2.M3 / P2.M4** — extend `PiHarness` with tool registration (`customTools: ToolDefinition[]`),
  streaming (`session.subscribe`→`StreamEvent`), hooks, and native skill loading.
- **P2.M3.T2.S3** — adds the `registry.register(new PiHarness())` line to `registerDefaultHarnesses()`.
- **P3.M1 (Agent)** — resolves `registry.get('pi')` once registered.

**Use Case:** PRD §7.1 — `pi` is the **default**, vendor-neutral harness. It must exist as a real,
compilable adapter (with its SDK installed) before any of its behavior is implemented.

**Pain Points Addressed:** Today the `pi` harness is spec'd (PRD §7) but absent from source, and its
SDK is not installed — every PiHarness subtask is blocked on both. S1 removes that blocker with the
smallest possible compilable footprint.

---

## Why

- **Realizes PRD §7.1/§7.2/§7.4** — the `pi` harness exists as code with correct identity + capabilities.
- **Unblocks the entire P2.M2–P2.M4 PiHarness track** — S2 (lifecycle), P2.M3 (tools/streaming/hooks/
  skills), P2.M4 (MCP→Pi tool bridge) all `import { PiHarness }` and extend this skeleton.
- **Installs the verified dependency** — `0.79.8` (external_deps.md §1) is now resolvable for S2's
  `createAgentSession`/`getModel` imports.
- **Low-risk, additive, isolated.** One new source file + one dep + two test files. Zero edits to
  barrels, registry, existing harnesses, or types. No behavioral change to anything running today.

---

## What

1. **INSTALL** the Pi SDK (Task 1).
2. **CREATE** `src/harnesses/pi-harness.ts` (Task 2).
3. **CREATE** `src/__tests__/unit/providers/pi-harness.test.ts` (Task 3).
4. **CREATE** `src/__tests__/unit/providers/pi-harness-normalizemodel.test.ts` (Task 4).
5. **VALIDATE** (Task 5).

### Success Criteria

- [ ] `package.json` lists `"@earendil-works/pi-coding-agent": "^0.79.8"` in `dependencies`;
      `package-lock.json` + `node_modules` updated; Node ESM dynamic import resolves.
- [ ] `PiHarness implements Harness`; `id === 'pi'`; capabilities = `{mcp,skills,lsp,streaming,sessions,
      extendedThinking}` all `true`.
- [ ] `supports('mcp')`/`supports('extendedThinking')` → `true`; `requiresFeatures(['mcp','streaming'])`
      → `true`; `requiresFeatures([])` → `true`.
- [ ] `normalizeModel('claude-sonnet-4')` → `{provider:'anthropic', model:'claude-sonnet-4', raw:...}`;
      `normalizeModel('openai/gpt-4o')` → `{provider:'openai',...}` (**no throw** — pi is provider-open).
- [ ] `initialize`/`terminate`/`execute`/`registerMCPs`/`loadSkills` throw `Error` whose message cites
      the owning downstream subtask.
- [ ] `const h: Harness = new PiHarness()` and `const p: Provider = new PiHarness()` both compile;
      `HarnessRegistry.getInstance().register(new PiHarness())` → `has('pi') === true`.
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S1 using only
(a) this PRP, (b) read-only access to `src/harnesses/claude-code-harness.ts` (the sibling-harness
pattern to mirror — imports, `satisfies`, `supports`/`requiresFeatures`), `src/types/harnesses.ts` (the
`Harness` interface + all param/return types), `src/utils/model-spec.ts` (`parseModelSpec`), and the
two reference test files (`claude-code-harness.test.ts`, `claude-code-harness-normalizemodel.test.ts`),
plus (c) the copy-paste-ready snippets below + the three `research/*.md` notes. The four non-obvious
load-bearing details (npm-not-pnpm, no-SDK-import-yet, registers≠registered-in-helper,
no-anthropic-gate) are proven in the research notes.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (PRD §7 harness system).
- url: PRD.md §7.1, §7.2, §7.3, §7.4, §7.8  (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.1 = pi harness + SDK package name; §7.2 = HarnessId; §7.3 = the Harness interface PiHarness
       implements; §7.4 = the `pi` capability column (ALL true) — the exact capabilities object; §7.8 =
       model string NEVER harness-qualified + open ModelProviderId set (WHY normalizeModel has no gate).
  critical: §7.4's `pi` row is the source of truth for the six `true` flags. §7.8 is WHY pi must accept
            any provider (Decision 4).

# MUST READ — the verified Pi SDK surface (version, entry, types, gotchas).
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1 VERIFIES @earendil-works/pi-coding-agent@0.79.8 (main ./dist/index.js, types ./dist/index.d.ts,
       ESM, Node 18+); §1.3 = provider/model resolution (getModel); §1.4 = customTools (TypeBox — P2.M4);
       §1.8 gotchas (createAgentSession is async; TypeBox schemas; model from getModel). Confirms the dep
       to install + what S2 wires (NOT S1).
  critical: S1 installs 0.79.8 only; S2/P2.M3/P2.M4 consume the API surface documented here.

# MUST READ — the sibling harness to mirror (imports, satisfies, supports/requiresFeatures, normalizeModel shape).
- file: src/harnesses/claude-code-harness.ts
  why: L41–59 = the import block pattern (import type for Harness/sdk-primitives/agent/streaming types,
       value import for parseModelSpec); L80 = `class X implements Harness`; L97–111 = `readonly capabilities
       = {...} satisfies HarnessCapabilities`; L127/L133 = supports/requiresFeatures bodies; L1179–1199 =
       normalizeModel (delegates to parseModelSpec — PiHarness copies this MINUS the anthropic gate).
  pattern: copy the import block + class shell + supports/requiresFeatures verbatim; change id to 'pi',
           capabilities to all-true (already all-true for claude-code), normalizeModel to gate-free.
  gotcha: DO NOT copy the `private sdk` field or `initialize`'s `await import("@anthropic-ai/...")` —
          that is SDK wiring = S2. S1's initialize is a throwing stub.

# MUST READ — the Harness interface PiHarness implements (every method signature + return type).
- file: src/types/harnesses.ts
  why: The `Harness` interface (search "export interface Harness") — id, capabilities, initialize, terminate,
       execute<T> (return union `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`),
       registerMCPs, loadSkills, normalizeModel, supports, requiresFeatures. Plus HarnessId, HarnessCapabilities,
       HarnessOptions, HarnessRequest, HarnessHookEvents, ToolExecutionRequest/Result, ModelSpec.
  pattern: import all of these as `import type` (Decision: isolatedModules).

# MUST READ — parseModelSpec (what normalizeModel delegates to; its validation rules).
- file: src/utils/model-spec.ts
  why: parseModelSpec(model, defaultProvider='anthropic') — open-set string→ModelSpec; rejects empty/
        whitespace, empty provider/model parts, and harness-qualified 3-segment strings (PRD §7.8).
        PiHarness.normalizeModel returns `parseModelSpec(model)` with NO defaultProvider override (so plain
        strings default to 'anthropic', matching ClaudeCodeHarness's happy path).
  gotcha: parseModelSpec is a RUNTIME value import (`import { parseModelSpec }`), NOT `import type`.

# MUST READ — the registry (proves "registers"; the duplicate-throw + test-isolation pattern).
- file: src/harnesses/harness-registry.ts
  why: getInstance() singleton; register(provider: Provider) THROWS on duplicate; has(id)/get(id);
        _resetForTesting() static + _resetInitStateForTesting() instance (afterEach isolation).
  pattern: the registrability test registers on a fresh singleton + resets in afterEach (copy from
           harness-registry.test.ts). register takes Provider — PiHarness is structurally assignable (Decision 3).

# MUST READ — why "registers" ≠ editing register-defaults (the deferred-registration boundary).
- file: plan/004_9a50e71828f4/P2M1T1S2/PRP.md   (the PARALLEL task — read as a CONTRACT)
  why: Ships registerDefaultHarnesses() with `// TODO(P2.M3.T2.S3): register PiHarness (id 'pi')`. Proves
       the actual default-registration of PiHarness is P2.M3.T2.S3 — NOT this task. Confirms S1 of P2.M2
       must not edit register-defaults.ts and has ZERO file overlap with P2.M1.T1.S2.
  critical: P2.M1.T1.S2 touches claude-code-harness.ts/register-defaults.ts/agent.ts/harnesses/index.ts;
             S1 of P2.M2 touches pi-harness.ts/package.json/tests. No collision either order.

# SHOULD READ — the test patterns to copy.
- file: src/__tests__/unit/providers/claude-code-harness.test.ts
  why: The structure/capabilities/Provider-assignability/registry-registration test pattern (the
       "Class Structure" describe block + "can be registered with ProviderRegistry" case). pi-harness.test.ts
       mirrors it for id 'pi' + all-true capabilities.
- file: src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts
  why: The normalizeModel test pattern (plain/qualified/error-delegation cases). pi-harness-normalizemodel
       .test.ts mirrors it MINUS the anthropic-rejection cases (replaced by open-provider-acceptance cases).
- file: src/__tests__/unit/providers/harness-registry.test.ts
  why: The afterEach isolation pattern (`getInstance()._resetInitStateForTesting(); _resetForTesting();`).

# SHOULD READ — the npm/version/package-manager decision.
- file: plan/004_9a50e71828f4/P2M2T1S1/research/pi-sdk-install.md
  why: npm (not pnpm) rationale; 0.79.8→^0.79.8; peer-dep cleanliness; the dep-resolution spot-check commands.
```

### Current Codebase tree (relevant slice)

```bash
src/harnesses/
├── claude-code-harness.ts   # REFERENCE (sibling harness — mirror its shell/imports/supports/requiresFeatures)
├── harness-registry.ts      # CONSUMER (register/has/get — proves "registers"; duplicate-throw)
├── index.ts                 # UNTOUCHED (barrel; ClaudeCodeHarness not exported here → PiHarness isn't either)
├── opencode-provider.ts     # untouched (deleted in P4.M1)
└── session-store.ts         # untouched
src/types/
├── harnesses.ts             # CONSUMER (Harness interface + all param/return types — P1.M1.T1.S1)
├── providers.ts             # CONSUMER (Provider structural superset; ProviderId ⊇ 'pi' — P1.M1.T3.S1)
├── agent.ts                 # untouched (P2.M1.T1.S2 adds CONFIG_ERROR there; S1 of P2.M2 adds nothing)
├── streaming.ts             # CONSUMER (StreamEvent — execute return union)
└── sdk-primitives.ts        # CONSUMER (Tool, MCPServer, Skill — registerMCPs/loadSkills param types)
src/utils/model-spec.ts      # CONSUMER (parseModelSpec — normalizeModel delegates here; P1.M1.T2.S1)
src/__tests__/unit/providers/
├── claude-code-harness.test.ts               # REFERENCE (structure/capabilities/registrability pattern)
├── claude-code-harness-normalizemodel.test.ts # REFERENCE (normalizeModel test pattern)
├── harness-registry.test.ts                  # REFERENCE (afterEach isolation pattern)
├── pi-harness.test.ts                        # ← NEW
└── pi-harness-normalizemodel.test.ts         # ← NEW
package.json                  # ← MODIFY (+ "@earendil-works/pi-coding-agent": "^0.79.8")
package-lock.json             # ← MODIFY (npm i regenerates)
```

### Desired Codebase tree with files to be added/changed

```bash
package.json                                                     # MODIFY (+ dep)
package-lock.json                                                # MODIFY (npm i)
src/harnesses/pi-harness.ts                                      # NEW (PiHarness skeleton)
src/__tests__/unit/providers/pi-harness.test.ts                  # NEW
src/__tests__/unit/providers/pi-harness-normalizemodel.test.ts   # NEW
# (Everything else — barrels, registry, claude-code-harness, types, opencode-provider — UNTOUCHED.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Package manager is npm, NOT pnpm. package-lock.json is newer + all scripts run under npm.
//   Use `npm i @earendil-works/pi-coding-agent@0.79.8`. pnpm would diverge the lockfiles. (Decision 1.)

// CRITICAL #2 — The skeleton imports NOTHING from '@earendil-works/pi-coding-agent'. The dep is INSTALLED
//   (resolves) but S2 wires createAgentSession. An unimported-but-installed dep is normal; tsc/vitest
//   don't flag it. Proving resolution is a validation step (Node ESM dynamic import), not a code import.

// CRITICAL #3 — DO NOT edit register-defaults.ts / src/harnesses/index.ts / src/index.ts. Adding PiHarness
//   to registerDefaultHarnesses() is P2.M3.T2.S3 (deferred by the parallel P2.M1.T1.S2 PRP's TODO). The
//   harnesses barrel does NOT export ClaudeCodeHarness (consistency → don't export PiHarness either). The
//   public API (src/index.ts) Harness-surface export is P3.M3.T1.S1. (Decision 3.)

// CRITICAL #4 — normalizeModel has NO `spec.provider !== "anthropic"` gate. Pi is vendor-neutral (PRD §7.4
//   "LLM providers: any"). Copying ClaudeCodeHarness's gate would reject every non-Anthropic model = the
//   opposite of pi's purpose. Just `return parseModelSpec(model);`. (Decision 4.)

// GOTCHA #5 — isolatedModules: true (tsconfig.json). Use `import type { Harness, HarnessId, ... }` for ALL
//   type-only imports. `parseModelSpec` is a VALUE import (`import { parseModelSpec } from "../utils/model-spec.js"`).
//   ClaudeCodeHarness's import block (L41–59) is the exact pattern.

// GOTCHA #6 — Use `satisfies HarnessCapabilities` (NOT `as HarnessCapabilities`) on the capabilities
//   literal — it type-checks the literal without widening. ClaudeCodeHarness L~111 does this.

// GOTCHA #7 — `execute`'s declared return type is the FULL interface union
//   `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`. Even though the
//   body throws, declare the union so S2 can fill either branch without re-touching the signature. A
//   function that throws is assignable to any return type.

// GOTCHA #8 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks non-test src/
//   (incl. pi-harness.ts) — proving the skeleton compiles + no import cycle. Test type errors won't fail
//   lint but WILL fail npm test if they break transpile. Run BOTH gates.

// GOTCHA #9 — HarnessRegistry.register() THROWS on duplicate. The registrability test MUST reset the
//   singleton in afterEach (getInstance()._resetInitStateForTesting(); HarnessRegistry._resetForTesting();)
//   OR it pollutes other suites. Copy the afterEach from harness-registry.test.ts.

// GOTCHA #10 — Stub param names should be underscore-prefixed (_request, _options) to signal "unused" and
//   avoid any noUnusedParameters-style noise (repo is `strict:true`; tsc default doesn't error on unused
//   params, but the prefix is clean + self-documenting).

// GOTCHA #11 — Each throwing stub's message MUST cite the owning downstream subtask (S2 / P2.M2.T2.S1 /
//   P2.M4.T1.S2 / P2.M3.T2.S3) so the next implementer knows where the real body lives. This is the
//   skeleton's only "documentation" of the handoff.

// GOTCHA #12 — DO NOT add a `private session`/`private sdk` field. Those are S2 (SDK wiring). The S1
//   skeleton has ONLY `id` + `capabilities` as fields (both readonly, both initialized inline). No
//   constructor needed.
```

---

## Implementation Blueprint

### Data models and structure

No new types. `PiHarness` consumes `Harness`, `HarnessId`, `HarnessCapabilities`, `HarnessOptions`,
`HarnessRequest`, `HarnessHookEvents`, `ToolExecutionRequest`, `ToolExecutionResult`, `ModelSpec`
(from `src/types/harnesses.ts`), `Tool`/`MCPServer`/`Skill` (sdk-primitives), `AgentResponse` (agent),
`StreamEvent` (streaming), and `parseModelSpec` (utils/model-spec) — all pre-existing.

```ts
// === src/harnesses/pi-harness.ts — the complete skeleton ===
import type {
  Harness,
  HarnessId,
  HarnessCapabilities,
  HarnessOptions,
  HarnessRequest,
  HarnessHookEvents,
  ToolExecutionRequest,
  ToolExecutionResult,
  ModelSpec,
} from "../types/harnesses.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import type { AgentResponse } from "../types/agent.js";
import type { StreamEvent } from "../types/streaming.js";
import { parseModelSpec } from "../utils/model-spec.js";

/**
 * Pi harness skeleton (PRD §7.1).
 *
 * Wraps `@earendil-works/pi-coding-agent` (the vendor-neutral default runtime). This file is the
 * S1 SCAFFOLD: it installs the adapter as a compilable, instantiable `Harness` with correct identity
 * and capabilities. The SDK is wired in S2 (P2.M2.T1.S2); tools/streaming/hooks/skills land in
 * P2.M3/P2.M4.
 *
 * ## Capabilities (PRD §7.4 `pi` column — ALL supported)
 * - **MCP**: via Groundswell `MCPHandler` (tools registered with the harness)
 * - **Skills**: native agentskills.io
 * - **LSP**: via MCP plugins through `MCPHandler`
 * - **Streaming**: `session.subscribe` (`MessageUpdateEvent`)
 * - **Sessions**: `SessionManager` (fork/switch/clone)
 * - **Extended Thinking**: model-dependent
 *
 * Pi is vendor-neutral: it runs ANY LLM provider (PRD §7.4/§7.8), so `normalizeModel` applies NO
 * provider constraint (unlike `ClaudeCodeHarness`).
 *
 * @example
 * ```ts
 * import { PiHarness } from './harnesses/pi-harness.js';
 * const harness = new PiHarness();
 * // harness.id === 'pi'; harness.capabilities.* === true
 * await harness.initialize(); // throws until P2.M2.T1.S2
 * ```
 */
export class PiHarness implements Harness {
  /** Harness identifier (PRD §7.2). */
  readonly id: HarnessId = "pi";

  /** Capability flags — PRD §7.4 `pi` column (all true; vendor-neutral runtime). */
  readonly capabilities: HarnessCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: true,
    extendedThinking: true,
  } satisfies HarnessCapabilities;

  // NOTE: SDK wiring (createAgentSession / getModel / session.prompt+subscribe) lands in S2
  // (P2.M2.T1.S2). No `private session`/`private sdk` field at this layer.

  async initialize(_options?: HarnessOptions): Promise<void> {
    throw new Error(
      "PiHarness.initialize() not implemented — P2.M2.T1.S2 wires createAgentSession()",
    );
  }

  async terminate(): Promise<void> {
    throw new Error(
      "PiHarness.terminate() not implemented — P2.M2.T1.S2",
    );
  }

  async execute<T>(
    _request: HarnessRequest,
    _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    _hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    throw new Error(
      "PiHarness.execute() not implemented — P2.M2.T2.S1 (prompt/subscribe → AgentResponse)",
    );
  }

  async registerMCPs(_servers: MCPServer[]): Promise<Tool[]> {
    throw new Error(
      "PiHarness.registerMCPs() not implemented — P2.M4.T1.S2 (MCPHandler.toPiCustomTools)",
    );
  }

  async loadSkills(_skills: Skill[]): Promise<void> {
    throw new Error(
      "PiHarness.loadSkills() not implemented — P2.M3.T2.S3 (native agentskills.io loading)",
    );
  }

  /**
   * Parse a model string into a ModelSpec (PRD §7.8).
   *
   * Pi is vendor-neutral — ANY provider is valid (PRD §7.4 "LLM providers: any"). Unlike
   * `ClaudeCodeHarness`, there is NO anthropic-only constraint here. Delegates to `parseModelSpec`
   * (open `ModelProviderId` set; rejects harness-qualified 3-segment strings per PRD §7.8).
   *
   * This is the string→ModelSpec layer. S2 (P2.M2.T1.S2) owns ModelSpec→Pi `Model<any>` via
   * `getModel(provider, model)`.
   */
  normalizeModel(model: string): ModelSpec {
    return parseModelSpec(model);
  }

  supports(capability: keyof HarnessCapabilities): boolean {
    return this.capabilities[capability];
  }

  requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean {
    return features.every((f) => this.capabilities[f]);
  }
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note baseline.
  - RUN: `grep -n "export interface Harness\b" src/types/harnesses.ts` — expect 1 hit (P1.M1.T1.S1 prereq).
  - RUN: `grep -n "export function parseModelSpec" src/utils/model-spec.ts` — expect 1 hit (P1.M1.T2.S1 prereq).
  - RUN: `grep -n "class HarnessRegistry" src/harnesses/harness-registry.ts` — expect 1 hit (P1.M2.T1.S2 prereq).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before touching anything. If a parallel
    task left the tree red, STOP and surface it (S1 of P2.M2 starts from green).

Task 1: INSTALL the Pi SDK
  - RUN: `npm i @earendil-works/pi-coding-agent@0.79.8`
  - VERIFY (grep): `grep -n "@earendil-works/pi-coding-agent" package.json` → 1 hit, value `^0.79.8`, under `dependencies`.
  - VERIFY (fs): `ls node_modules/@earendil-works/pi-coding-agent/dist/index.js node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts` → both exist.
  - VERIFY (resolve): `node --input-type=module -e "import('@earendil-works/pi-coding-agent').then(m=>console.log('pi keys:',Object.keys(m).slice(0,5))).catch(e=>{console.error(e);process.exit(1)})"` → prints keys, exit 0.
  - WATCH: npm output for `npm warn ERESOLVE` / peer conflicts. Expected none (zod already ^3.25; Pi uses TypeBox). If a genuine conflict appears, document before using --legacy-peer-deps.

Task 2: CREATE src/harnesses/pi-harness.ts
  - PASTE the full skeleton from "Data models and structure" above.
  - VERIFY: `grep -n "class PiHarness implements Harness\|readonly id: HarnessId = \"pi\"\|parseModelSpec(model)\|throw new Error" src/harnesses/pi-harness.ts` → 5+ hits.
  - VERIFY (NO anthropic gate): `! grep -n 'spec.provider !== "anthropic"' src/harnesses/pi-harness.ts` → no match (exit 1).
  - VERIFY (NO SDK import): `! grep -n "@earendil-works/pi-coding-agent" src/harnesses/pi-harness.ts` → no match (exit 1).

Task 3: CREATE src/__tests__/unit/providers/pi-harness.test.ts
  - Mirror the structure of src/__tests__/unit/providers/claude-code-harness.test.ts (imports: `import { describe, it, expect } from 'vitest';`, `import { PiHarness } from '../../../harnesses/pi-harness.js';`, `import type { Harness } from '../../../types/harnesses.js';`, `import type { Provider } from '../../../types/providers.js';`, `import { HarnessRegistry } from '../../../harnesses/harness-registry.js';`).
  - CASES (describe('PiHarness')):
      Class Structure:
        - `new PiHarness().id` === 'pi'
        - capabilities: mcp/skills/lsp/streaming/sessions/extendedThinking all === true
      supports/requiresFeatures:
        - supports('mcp') === true; supports('extendedThinking') === true
        - requiresFeatures(['mcp','streaming']) === true; requiresFeatures([]) === true
      stub methods throw:
        - initialize() → rejects (await expect(...).rejects.toThrow(/P2\.M2\.T1\.S2/))
        - terminate() → rejects toThrow(/P2\.M2\.T1\.S2/)
        - execute(...) → rejects toThrow(/P2\.M2\.T2\.S1/)
        - registerMCPs([]) → rejects toThrow(/P2\.M4\.T1\.S2/)
        - loadSkills([]) → rejects toThrow(/P2\.M3\.T2\.S3/)
      interface satisfaction:
        - `const h: Harness = new PiHarness();` expect(h.id).toBe('pi')  (compile-time + runtime)
      Provider structural assignability + registration (with afterEach reset):
        - `const p: Provider = new PiHarness();` expect(p.id).toBe('pi')
        - `HarnessRegistry.getInstance().register(new PiHarness());` → `has('pi')` === true; `get('pi')?.id` === 'pi'
  - afterEach: `const r = HarnessRegistry.getInstance(); r._resetInitStateForTesting(); HarnessRegistry._resetForTesting();` (copy from harness-registry.test.ts — GOTCHA #9).
  - PLACEMENT: src/__tests__/unit/providers/ (matches the claude-code-harness-*.test.ts location despite the dir name).

Task 4: CREATE src/__tests__/unit/providers/pi-harness-normalizemodel.test.ts
  - Mirror src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts structure (imports: vitest, PiHarness, `import type { ModelSpec } from '../../../types/harnesses.js';`).
  - CASES (describe('PiHarness.normalizeModel()')):
      plain format:
        - 'claude-sonnet-4' → {provider:'anthropic', model:'claude-sonnet-4', raw:'claude-sonnet-4'}
        - '  claude-sonnet-4  ' → raw preserves whitespace, model trimmed
      qualified format:
        - 'anthropic/claude-sonnet-4' → {provider:'anthropic', model:'claude-sonnet-4', raw:...}
      open provider set (THE parity difference vs claude-code — MUST NOT throw):
        - 'openai/gpt-4o' → {provider:'openai', model:'gpt-4o', raw:...}   (claude-code throws here; pi accepts)
        - 'google/gemini-2.5-pro' → {provider:'google',...}
        - 'zai/glm-4.6' → {provider:'zai',...}
      error delegation to parseModelSpec:
        - '' → throws /cannot be empty/i
        - '   ' → throws /cannot be empty/i
        - '/model' → throws /provider cannot be empty/i
        - 'anthropic/' → throws /model name cannot be empty/i
        - 'pi/anthropic/claude-sonnet-4' → throws /Harness must not appear/i  (PRD §7.8 critical rule)
      type safety:
        - result has provider/model/raw all typeof string
  - PLACEMENT: src/__tests__/unit/providers/.

Task 5: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates in order: lint, targeted tests, full suite, build, grep contract, runtime import.
  - ANY lint failure naming pi-harness.ts → a non-type import used as `import type` (or vice-versa:
    parseModelSpec imported as `import type`), OR a wrong return type on execute (must be the union),
    OR a missing satisfies. ANY test failure on a stub → the stub doesn't throw / throws the wrong
    subtask ref. ANY test failure on openai normalization → an anthropic gate was accidentally added.
```

### Implementation Patterns & Key Details

```ts
// === The capability literal — `satisfies` (not `as`) — repo idiom (ClaudeCodeHarness L~111) ===
readonly capabilities: HarnessCapabilities = {
  mcp: true, skills: true, lsp: true,
  streaming: true, sessions: true, extendedThinking: true,
} satisfies HarnessCapabilities;

// === normalizeModel — gate-free, open-set (pi is vendor-neutral; the pi/claude-code difference) ===
normalizeModel(model: string): ModelSpec {
  return parseModelSpec(model);   // default provider 'anthropic' for plain strings; open set; rejects harness-qualified
}

// === supports/requiresFeatures — trivial, FINAL (mirrors ClaudeCodeHarness L127/L133) ===
supports(capability: keyof HarnessCapabilities): boolean {
  return this.capabilities[capability];
}
requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean {
  return features.every((f) => this.capabilities[f]);   // [] → true
}

// === The throwing stubs — each cites its owning subtask (the handoff contract) ===
async initialize(_options?: HarnessOptions): Promise<void> {
  throw new Error("PiHarness.initialize() not implemented — P2.M2.T1.S2 wires createAgentSession()");
}
// (terminate/execute/registerMCPs/loadSkills follow the same pattern — see Data models)

// === execute return type — the FULL interface union (S2 fills either branch) ===
async execute<T>(
  _request: HarnessRequest,
  _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
  _hooks?: HarnessHookEvents,
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
  throw new Error("PiHarness.execute() not implemented — P2.M2.T2.S1 (prompt/subscribe → AgentResponse)");
}
```

### Integration Points

```yaml
DEPENDENCY (MODIFY):
  - package.json   : + "@earendil-works/pi-coding-agent": "^0.79.8"  (dependencies block)
  - package-lock.json : npm i regenerates

SOURCE (NEW):
  - src/harnesses/pi-harness.ts : PiHarness skeleton (implements Harness).

TESTS (NEW):
  - src/__tests__/unit/providers/pi-harness.test.ts
  - src/__tests__/unit/providers/pi-harness-normalizemodel.test.ts

BARRELS:
  - src/harnesses/index.ts : UNTOUCHED (ClaudeCodeHarness isn't exported there → consistency).
  - src/index.ts           : UNTOUCHED (public Harness-surface export = P3.M3.T1.S1).

CONSUMERS (kept green — NO source edits):
  - src/harnesses/harness-registry.ts : register/has/get UNCHANGED (S1 proves registrability via a test).

NOT IN SCOPE (do not touch — owned downstream):
  - register-defaults.ts (add PiHarness line)                     → P2.M3.T2.S3 (deferred by P2.M1.T1.S2 TODO)
  - createAgentSession / initialize / terminate real bodies       → P2.M2.T1.S2
  - ModelSpec→Model<any> resolution                               → P2.M2.T1.S2
  - execute prompt/subscribe → AgentResponse                      → P2.M2.T2.S1
  - customTools ToolDefinition mapping (JSON-Schema→TypeBox)       → P2.M3.T1.S1 + P2.M4.T1.S1/S2
  - StreamEvent mapping + HarnessHookEvents adaptation            → P2.M3.T2.S1/S2
  - Native agentskills.io skill loading                            → P2.M3.T2.S3
  - Agent harness rewire (registry.get('pi'))                     → P3.M1
  - Harness-surface public export                                 → P3.M3.T1.S1
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates `src/harnesses/pi-harness.ts`
> compiles + no import cycle). `npm test` = `vitest run` (esbuild transpile-only; new + full suite).
> `npm run build` = `tsc` (emits `dist/`). No eslint/prettier. **Install FIRST**, then lint+test+build.

### Level 1: Dependency Install (run FIRST — Task 1)

```bash
npm i @earendil-works/pi-coding-agent@0.79.8
# Expected: adds ^0.79.8 to package.json deps; updates package-lock.json; installs node_modules.
# Watch for ERESOLVE / peer warnings. Expected: none.

# Prove the dep resolves under Node ESM (entry map works):
node --input-type=module -e "import('@earendil-works/pi-coding-agent').then(m=>console.log('pi keys:',Object.keys(m).slice(0,5))).catch(e=>{console.error(e);process.exit(1)})"
# Expected: prints 'pi keys: [...]' and exits 0. A rejection = bad install / entry map.
```

### Level 2: Syntax & Type Check (run after Task 2)

```bash
# Non-test type check — proves pi-harness.ts compiles against Harness, the execute union is correct,
# `satisfies HarnessCapabilities` type-checks, imports are isolatedModules-safe, and there's NO cycle.
npm run lint
# Expected: exit 0. An error naming pi-harness.ts = (a) parseModelSpec imported as `import type`
# (it's a value), (b) a type imported as a plain value import (isolatedModules), (c) execute's return
# type isn't the union, (d) a missing/extra capability key in the literal.
```

### Level 3: Unit Tests (run after Tasks 3–4)

```bash
# Structure / capabilities / stubs / registrability
npm test -- src/__tests__/unit/providers/pi-harness
# Expected: all pass. A failure on "can be registered" = missing afterEach reset (GOTCHA #9).
# A failure on a stub = it didn't throw or cited the wrong subtask.

# normalizeModel (open-set; the pi/claude-code parity difference)
npm test -- src/__tests__/unit/providers/pi-harness-normalizemodel
# Expected: all pass. A failure on 'openai/gpt-4o' = an anthropic gate was accidentally added (CRITICAL #4).
# A failure on 'pi/anthropic/x' = parseModelSpec delegation broken.

# Full suite (catch any ripple — esp. the parallel P2.M1.T1.S2 suites + registry/agent suites)
npm test
# Expected: all pass. If harness-registry / agent / claude-code-harness-* suites regressed, you
# accidentally touched a shared file — revert. (S1 of P2.M2 touches only pi-harness.ts + 2 tests + pkg.)
```

### Level 4: Build (declaration-emit sanity)

```bash
npm run build
# Expected: exit 0; dist/harnesses/pi-harness.{js,d.ts} emitted; dist/harnesses/pi-harness.d.ts exports
# `class PiHarness implements Harness`.
ls dist/harnesses/pi-harness.js dist/harnesses/pi-harness.d.ts
```

### Level 5: Contract Verification (grep gates)

```bash
# The skeleton has the right identity, capabilities, and gate-free normalizeModel:
grep -n "class PiHarness implements Harness\|readonly id: HarnessId = \"pi\"" src/harnesses/pi-harness.ts  # 2 hits
grep -n "mcp: true\|skills: true\|lsp: true\|streaming: true\|sessions: true\|extendedThinking: true" src/harnesses/pi-harness.ts  # 6 hits
grep -n "parseModelSpec(model)" src/harnesses/pi-harness.ts   # 1 hit (normalizeModel delegates)

# NO anthropic-only gate (the pi/claude-code difference) and NO SDK import (S2 owns wiring):
! grep -n 'spec.provider !== "anthropic"' src/harnesses/pi-harness.ts   # exit 1 (no match)
! grep -n "@earendil-works/pi-coding-agent" src/harnesses/pi-harness.ts # exit 1 (no match)

# The dep is declared + installed:
grep -n "@earendil-works/pi-coding-agent" package.json   # 1 hit, ^0.79.8
ls node_modules/@earendil-works/pi-coding-agent/dist/index.js >/dev/null && echo "installed ✓"

# Untouched boundaries (barrels + register-defaults absent from S1's diff):
! grep -n "PiHarness" src/harnesses/index.ts   # exit 1 (no match — ClaudeCodeHarness isn't barrel-exported either)
! grep -n "PiHarness" src/index.ts             # exit 1 (no match — public export is P3.M3.T1.S1)

# Exactly the expected file set changed:
git status --short
# Expected: M package.json; M package-lock.json; ?? src/harnesses/pi-harness.ts;
#           ?? src/__tests__/unit/providers/pi-harness.test.ts;
#           ?? src/__tests__/unit/providers/pi-harness-normalizemodel.test.ts.
# (claude-code-harness.ts, harness-registry.ts, harnesses/index.ts, src/index.ts, types/*, opencode-provider.ts — UNTOUCHED.)
```

### Level 6: Behavioral Spot-Check (instantiation + registrability end-to-end)

```bash
# Quick runtime identity + registrability check via tsx (proves PiHarness instantiates + registers):
npx tsx -e '
  import { PiHarness } from "./src/harnesses/pi-harness.js";
  import { HarnessRegistry } from "./src/harnesses/harness-registry.js";
  const h = new PiHarness();
  console.log("id            :", h.id);
  console.log("capabilities  :", JSON.stringify(h.capabilities));
  console.log("supports mcp  :", h.supports("mcp"));
  console.log("requires []   :", h.requiresFeatures([]));
  console.log("normalize     :", JSON.stringify(h.normalizeModel("openai/gpt-4o"))); // provider:openai (NO throw)
  HarnessRegistry._resetForTesting();
  HarnessRegistry.getInstance().register(new PiHarness());
  console.log("registered pi :", HarnessRegistry.getInstance().has("pi"));
  try { await h.initialize(); console.log("init throw   : NO (BUG)"); }
  catch (e) { console.log("init throw   :", /P2\.M2\.T1\.S2/.test((e as Error).message) ? "cites S2 ✓" : "WRONG REF"); }
'
# Expected: id: pi ; capabilities: all true ; supports mcp: true ; requires []: true ;
#           normalize: {"provider":"openai","model":"gpt-4o","raw":"openai/gpt-4o"} ;
#           registered pi: true ; init throw: cites S2 ✓.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm i @earendil-works/pi-coding-agent@0.79.8` succeeded; `package.json` lists `^0.79.8`; Node ESM
      dynamic import resolves (Level 1).
- [ ] `npm run lint` exits 0 (`pi-harness.ts` compiles against `Harness`; no cycle; isolatedModules-safe).
- [ ] `npm test` exits 0 (2 new suites + full regression incl. parallel P2.M1.T1.S2 suites).
- [ ] `npm run build` exits 0; `dist/harnesses/pi-harness.{js,d.ts}` emitted.
- [ ] `git status --short` shows: 2 new source/test dirs (pi-harness.ts + 2 tests) + 2 modified (package.json,
      package-lock.json). Nothing else touched.

### Feature Validation

- [ ] `PiHarness implements Harness`; `id === 'pi'`; capabilities all six `=== true` (PRD §7.4 `pi` column).
- [ ] `supports`/`requiresFeatures` correct (incl. `requiresFeatures([]) === true`).
- [ ] `normalizeModel` open-set: `'openai/gpt-4o'`/`'google/...'`/`'zai/...'` accepted (NO anthropic gate);
      `'pi/anthropic/x'` rejected (PRD §7.8).
- [ ] `initialize`/`terminate`/`execute`/`registerMCPs`/`loadSkills` throw, citing the owning subtask.
- [ ] `const h: Harness = new PiHarness()` + `const p: Provider = new PiHarness()` compile;
      `HarnessRegistry.register(new PiHarness())` → `has('pi') === true`.

### Code Quality Validation

- [ ] `import type` for all type-only imports; value import only for `parseModelSpec` (isolatedModules).
- [ ] `satisfies HarnessCapabilities` (not `as`) on the capabilities literal.
- [ ] `execute` return type is the full interface union.
- [ ] Stub param names underscore-prefixed; stub messages cite downstream subtasks.
- [ ] No `private session`/`private sdk` field (S2's job); no constructor needed.
- [ ] No edits to barrels, registry, claude-code-harness, types, opencode-provider.

### Documentation & Deployment

- [ ] No new environment variables; no config-file changes (the one new dep is the only deployment delta).
- [ ] PiHarness JSDoc documents: it's the S1 scaffold, S2 wires the SDK, pi is vendor-neutral (no model gate).

---

## Anti-Patterns to Avoid

- ❌ **Don't use pnpm.** `package-lock.json` is newer + all scripts run under npm. Use `npm i`. (CRITICAL #1.)
- ❌ **Don't import the Pi SDK in the skeleton.** S2 wires `createAgentSession`. S1 only installs the dep.
  An unimported dep is fine; proving resolution is a validation step, not code. (CRITICAL #2.)
- ❌ **Don't edit `register-defaults.ts` / `src/harnesses/index.ts` / `src/index.ts`.** Adding PiHarness to the
  bootstrap helper is P2.M3.T2.S3 (deferred by P2.M1.T1.S2's TODO). The barrel doesn't export
  ClaudeCodeHarness (consistency). The public export is P3.M3.T1.S1. (CRITICAL #3.)
- ❌ **Don't add an anthropic-only gate to `normalizeModel`.** Pi is vendor-neutral (PRD §7.4). Copying
  ClaudeCodeHarness's gate rejects every non-Anthropic model — the opposite of pi's purpose. (CRITICAL #4.)
- ❌ **Don't use `as HarnessCapabilities`.** Use `satisfies HarnessCapabilities` (type-checks without widening;
  ClaudeCodeHarness idiom). (GOTCHA #6.)
- ❌ **Don't import `parseModelSpec` as `import type`.** It's a runtime value. (GOTCHA #5.)
- ❌ **Don't forget the registry afterEach reset.** `register()` throws on duplicate + the singleton pollutes
  other suites. Copy harness-registry.test.ts's afterEach. (GOTCHA #9.)
- ❌ **Don't add a `private session`/`private sdk` field or a constructor.** Those are S2 (SDK wiring). S1's
  only fields are `id` + `capabilities` (both readonly, inline-initialized). (GOTCHA #12.)
- ❌ **Don't declare `execute` as returning only `Promise<AgentResponse<T>>`.** Declare the full interface
  union so S2 can fill either branch without re-touching the signature. (GOTCHA #7.)
