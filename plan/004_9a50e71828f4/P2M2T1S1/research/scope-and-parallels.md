# Research — Scope boundaries & parallel-work coordination (P2.M2.T1.S1)

> This task runs **in parallel with P2.M1.T1.S2** (Enforce anthropic-only + `registerDefaultHarnesses`).
> S1 of P2.M2 must NOT collide with that work, and must respect every downstream owner.

## 1. What S1 of P2.M2 CONSUMES (already-complete / in-flight prerequisites)

| Prereq | Owner | Status | What S1 uses from it |
|---|---|---|---|
| `Harness`, `HarnessId`, `HarnessCapabilities`, `HarnessOptions`, `HarnessRequest`, `HarnessHookEvents`, `ToolExecutionRequest/Result`, `ModelSpec` | P1.M1.T1.S1 (`src/types/harnesses.ts`) | ✅ Complete | The interface PiHarness `implements` + all param/return types |
| `parseModelSpec(model, defaultProvider?)` | P1.M1.T2.S1 (`src/utils/model-spec.ts`) | ✅ Complete | Open-set string→ModelSpec (PiHarness.normalizeModel delegates to it) |
| `HarnessRegistry` (singleton, `register/has/get`) | P1.M2.T1.S2 (`src/harnesses/harness-registry.ts`) | ✅ Complete | `register(new PiHarness())` proves "registers" (structural) |
| `Provider` / `ProviderId` alias shim | P1.M1.T3.S1 (`src/types/providers.ts`) | ✅ Complete | `'pi' ∈ ProviderId`; `Provider` is a structural superset → PiHarness assignable |
| `StreamEvent`, `AgentResponse<T>` | pre-existing (`src/types/streaming.ts`, `src/types/agent.ts`) | ✅ Complete | `execute` return-type union |
| Pi SDK verification (`0.79.8`, ESM, entry/types) | `docs/external_deps.md` §1 | ✅ Complete | The dep to install |

**Critical:** S1 of P2.M2 has NO hard dependency on P2.M1.T1.S2 finishing. P2.M1.T1.S2 touches
`claude-code-harness.ts`, `register-defaults.ts`, `src/types/agent.ts` (adds `CONFIG_ERROR`), and
`src/harnesses/index.ts` (adds the `registerDefaultHarnesses` export). S1 of P2.M2 touches
**`src/harnesses/pi-harness.ts` (new) + `package.json`/lockfile + test files**. **Zero file overlap.**
The two can land in either order.

## 2. The "registers" ambiguity — resolved (do NOT edit register-defaults.ts)

The item says the skeleton must "compile & register." Read two ways:
- **(WRONG)** Add `new PiHarness()` to `registerDefaultHarnesses()` now.
- **(RIGHT)** Make PiHarness structurally register-able (implements Harness ⊆ Provider) and prove it
  with a test that calls `registry.register(new PiHarness())`.

The RIGHT reading is forced by the plan:
- `plan_status` line: **P2.M3.T2.S3 = "Native agentskills.io skill loading + register PiHarness as
  default"** — the actual default-registration of PiHarness is that subtask's job.
- The parallel P2.M1.T1.S2 PRP ships `registerDefaultHarnesses()` with an explicit
  `// TODO(P2.M3.T2.S3): register PiHarness (id 'pi')` comment — i.e., it DEFERS PiHarness registration
  to P2.M3.T2.S3 by design.

➡️ S1 of P2.M2 must **NOT** edit `register-defaults.ts` (it doesn't exist yet anyway under P2.M1.T1.S2,
and even after it lands, the PiHarness line is owned by P2.M3.T2.S3). S1 proves registrability via a
test on a fresh `HarnessRegistry` (reset in afterEach). This is the exact precedent: `claude-code-harness.test.ts`
has a "can be registered with ProviderRegistry" case WITHOUT editing any bootstrap helper.

## 3. Files S1 of P2.M2 TOUCHES (the complete change set)

```
package.json                                          # MODIFY: + "@earendil-works/pi-coding-agent": "^0.79.8"
package-lock.json                                     # MODIFY: npm regenerates (npm i side-effect)
src/harnesses/pi-harness.ts                           # NEW: the PiHarness skeleton
src/__tests__/unit/providers/pi-harness.test.ts       # NEW: structure/capabilities/stubs/registrability
src/__tests__/unit/providers/pi-harness-normalizemodel.test.ts  # NEW: open-set normalization (no anthropic gate)
```

**NOT touched (explicitly):**
- `src/harnesses/index.ts` — barrel; ClaudeCodeHarness isn't exported there either (consistency).
- `src/index.ts` — public API; Harness-surface export is P3.M3.T1.S1.
- `src/harnesses/register-defaults.ts` — owned by P2.M1.T1.S2 (create) / P2.M3.T2.S3 (add PiHarness).
- `src/harnesses/claude-code-harness.ts` — owned by P2.M1.T1.S1/S2.
- `src/harnesses/harness-registry.ts` — owned by P1.M2; the duplicate-throw is correct, S1 works with it as-is.
- `src/types/*.ts` — no new types needed; S1 consumes existing ones only.

## 4. Validation gate ordering (matters because of the install step)

1. **Install FIRST** (`npm i @earendil-works/pi-coding-agent@0.79.8`) — `npm run lint` cannot type-check
   a skeleton that (in S2) would import the SDK; in S1 the skeleton imports nothing from the SDK, but
   installing first keeps the tree consistent and lets the runtime-import spot-check (research/
   pi-sdk-install.md §5) run.
2. **Baseline** `npm run lint && npm test` BEFORE edits — confirm green (catches if a parallel task
   landed a half-state; S1 of P2.M2 should start from green).
3. **Create** `pi-harness.ts`.
4. **Lint** (`tsc --noEmit`, excludes `src/__tests__`) — proves pi-harness.ts compiles + no import cycle.
5. **Create** the 2 test files.
6. **Test** (vitest) — new suites + full regression sweep.
7. **Build** (`tsc`) — `dist/harnesses/pi-harness.{js,d.ts}` emitted.
8. **Grep contract** + **runtime import spot-check**.

## 5. Cohesion check — does S1 harm neighbors?

- **P2.M1.T1.S2 (parallel):** no shared files; the only shared *symbol space* is the harness barrel,
  which S1 of P2.M2 does not edit. Safe.
- **P2.M2.T1.S2 (next):** receives a compiling, instantiable PiHarness with `normalizeModel` already
  returning a valid `ModelSpec`. S2 swaps the throwing `initialize`/`terminate` for real SDK wiring and
  adds the `Model<any>` resolution. S1's stub error messages point S2 at the right spots. ✅ helps.
- **P2.M3 / P2.M4:** receive the PiHarness class to extend (tools, streaming, hooks, skills). The
  `id`/`capabilities`/`supports`/`requiresFeatures` S1 ships are FINAL (not re-touched downstream). ✅.
- **P3.M1 (Agent):** will call `registry.get('pi')` once P2.M3.T2.S3 registers it. S1 does not block
  this (registration is deferred by design). ✅.

No scope conflicts detected. Proceed.
