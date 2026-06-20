# PRP — P4.M1.T1.S1: Delete `opencode-provider.ts`, its tests, the `opencode` literal, and the `@opencode-ai/sdk` dependency

**PRD reference:** §7 (Agent Harness System), §7.2 (`HarnessId = 'pi' | 'claude-code'`), §7.8 (Model &
Provider Specification — *open* `ModelProviderId` set; harness never in model string). **Plan:**
`plan/004_9a50e71828f4/` — S1 of P4.M1.T1 ("Delete OpenCodeProvider and opencode surface"). **Consumes:**
the completed harness migration (P1–P3): `ProviderId` is already the deprecated superset
`HarnessId | 'anthropic' | 'opencode'` (`src/types/providers.ts:40`), `OpenCodeProvider` is already
deprecated (v1.5.0) and **NOT** re-exported from `src/index.ts`, and the public harness surface is
landed by the parallel item **P3.M3.T1.S1** (which keeps the legacy `Provider*`/
`AnthropicProvider`/`ProviderRegistry` aliases). **Produces:** zero `opencode` references in `src/`
(`grep -rni opencode src/` empty), `package.json` free of `@opencode-ai/sdk`, and a green `npm test` —
the final mechanical step of the OpenCode removal runway. **Unblocks:** P4.M1.T1.S2 (examples +
migration-doc finalization) and P4.M2 (cross-harness parity suites). **Scope tag:** (a) **DELETE**
`src/harnesses/opencode-provider.ts` + 9 `opencode-provider-*.test.ts` files; (b) **NARROW** the
`ProviderId` union (drop `| 'opencode'`) and the `harness-config.ts` validator/error text; (c) **SCRUB**
the `opencode` literal from the remaining 6 source files + 11 test files (full inventory below); (d)
**UNINSTALL** `@opencode-ai/sdk`. **DO NOT touch** `examples/`, `docs/`, `dist/`, `coverage/`,
`PRD.md`, `tasks.json`, `prd_snapshot.md`, or any non-`opencode` code.

> **READ "THE OUTPUT CRITERION IS ABSOLUTE — 27 FILES, NOT 9" BEFORE WRITING CODE.** The contract names
> "9 test files + model-spec/provider-config error strings", but its OUTPUT gate
> (`grep -rni opencode src/` → empty) requires scrubbing **every** `opencode` occurrence in `src/` — that
> is **27 files**: 1 source delete + 9 test deletes + 6 source edits + 11 test edits. A literal
> find/replace is NOT correct because the literal appears in 4 distinct semantic contexts (mock harness
> id vs. example LLM host vs. invalid-id rejection test vs. configureProviders acceptance test) — see
> **Replacement Strategy R1–R5**. Skipping the 11 "extra" test files leaves ~400 hits in `grep` and a
> failing `harness-config.test.ts`, so this PRP treats them as in-scope, not optional.

---

## Goal

**Feature Goal:** Remove the deprecated `OpenCodeProvider` and **every** `opencode` literal from `src/`,
plus the pinned `@opencode-ai/sdk` dependency, so the codebase contains zero references to the removed
runtime — realising the v2.0.0 deletion milestone (PRD §7, `docs/migration-opencode-removal.md`) and the
last acceptance gate of the harness/provider split (PRD §16). The harness surface (`pi`, `claude-code`)
and the open `ModelProviderId` set remain the only way to select a runtime/LLM host.

**Deliverable:**
1. **DELETE** `src/harnesses/opencode-provider.ts` (the `OpenCodeProvider` class — the sole importer of
   `@opencode-ai/sdk`).
2. **DELETE** the 9 `src/__tests__/unit/providers/opencode-provider-*.test.ts` files.
3. **MODIFY** `src/types/providers.ts` — narrow `ProviderId` from `HarnessId | 'anthropic' | 'opencode'`
   to `HarnessId | 'anthropic'`; scrub the 6 remaining `opencode` JSDoc/comment occurrences.
4. **MODIFY** `src/utils/harness-config.ts` — drop `'opencode'` from `isValidProviderId()` and
   `getSupportedProvidersList()` (returns `'"anthropic", "pi", "claude-code"'`); scrub JSDoc.
5. **MODIFY** `src/core/agent.ts`, `src/types/agent.ts`, `src/harnesses/harness-registry.ts`,
   `src/harnesses/claude-code-harness.ts` — replace `opencode` JSDoc examples (`'claude-code'` or
   `'openai'` per R1/R2).
6. **MODIFY** the 11 remaining test files (full list in §Implementation Tasks Task 6) — apply R1–R5 so
   every `opencode` literal is replaced with a still-valid id that preserves each test's intent.
7. **UNINSTALL** `@opencode-ai/sdk` via `npm uninstall @opencode-ai/sdk` (cleans package.json +
   package-lock.json + node_modules).
8. **VERIFY** `src/__tests__/compatibility/backward-compatibility.test.ts` has zero `opencode` refs (it
   should — migration-scope.md §3 + contract confirm it) and leave it untouched.

**Success Definition:**
1. `grep -rni opencode src/` prints **nothing** (the contract OUTPUT gate).
2. `OpenCodeProvider` is not imported/referenced anywhere in `src/` (`grep -rn OpenCodeProvider src/`
   empty) and was never exported from `src/index.ts` (verified — no change needed there).
3. `@opencode-ai/sdk` is absent from `package.json` AND `package-lock.json`
   (`grep -c '@opencode-ai/sdk' package.json package-lock.json` → 0).
4. `npm run lint` (`tsc --noEmit`) exits **0** — the `ProviderId` narrowing + `harness-config.ts` edit
   type-check cleanly (tsc excludes `__tests__`, so this proves the SOURCE side).
5. `npm run build` (`tsc`) exits **0** and regenerates `dist/` (the stale `dist/**/opencode-provider.*`
   artifacts are overwritten/removed).
6. `npm test` (`vitest run`) exits **0** — the entire suite stays green after the R1–R5 test rewrites.

## Why

- **Completes the OpenCode removal runway.** `OpenCodeProvider` has been deprecated since v1.5.0 and is
  the only code path importing `@opencode-ai/sdk`. With the harness migration done (P1–P3) and the public
  harness surface landed (P3.M3.T1.S1), there is no remaining consumer — it is dead code carrying a
  transitive dependency and ~850 stale `opencode` literal references that confuse readers and tooling.
- **Closes the type surface.** `ProviderId` still widens to the legacy `'opencode'` literal; keeping it
  after the class is gone would advertise a runtime that no longer exists. Narrowing it to
  `HarnessId | 'anthropic'` matches PRD §7.2/§7.8 exactly.
- **Unblocks downstream cleanup.** P4.M1.T1.S2 (examples + migration-doc) and P4.M2 (parity suites) can
  only proceed once `src/` is opencode-free and the test suite no longer references the removed runtime.
- **Low runtime risk.** No public behavior changes — `OpenCodeProvider` was never exported from the
  public API, and the test edits are mock-id swaps that preserve each test's asserted semantics.

## What

User-visible behavior: **none** (OpenCodeProvider was deep-import-only and deprecated). Developers
importing from `groundswell` see no change (the harness surface + legacy aliases are untouched). The only
externally observable effect is the narrowed `ProviderId` type (the `'opencode'` member is gone) and the
removed `@opencode-ai/sdk` dependency.

### Success Criteria

- [ ] `src/harnesses/opencode-provider.ts` deleted.
- [ ] All 9 `src/__tests__/unit/providers/opencode-provider-*.test.ts` deleted.
- [ ] `ProviderId` in `src/types/providers.ts` is `HarnessId | 'anthropic'` (no `'opencode'`).
- [ ] `isValidProviderId()` no longer accepts `'opencode'`; `getSupportedProvidersList()` returns
      `'"anthropic", "pi", "claude-code"'`; all `harness-config.ts` JSDoc opencode mentions scrubbed.
- [ ] The 4 remaining source files (`agent.ts`, `types/agent.ts`, `harness-registry.ts`,
      `claude-code-harness.ts`) have no `opencode` literal.
- [ ] The 11 remaining test files edited per R1–R5; all still assert their original intent.
- [ ] `@opencode-ai/sdk` removed from `package.json` + `package-lock.json`.
- [ ] `grep -rni opencode src/` empty; `grep -rn OpenCodeProvider src/` empty.
- [ ] `npm run lint`, `npm run build`, `npm test` all exit 0.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes.** This PRP gives the exhaustive 27-file inventory (with per-file hit counts), the
4-context replacement strategy (R1–R5) that prevents the naïve-find/replace trap, the exact before/after
for the load-bearing `harness-config.ts` ↔ `harness-config.test.ts` coupling, the verified validation
commands, and the explicit out-of-scope list. The single judgment call (why the 11 "extra" test files are
in-scope) is resolved by the contract's absolute OUTPUT gate + §"THE OUTPUT CRITERION IS ABSOLUTE".

### Documentation & References

```yaml
# MUST READ — include these in your context window
- url: plan/004_9a50e71828f4/docs/migration-scope.md
  why: "§6 is THE authoritative deletion list: 'OpenCodeProvider + its 9 test files + the literal `opencode` member of ProviderId + docs/migration-opencode-removal.md as deletion items, not renames.' §3 confirms backward-compatibility.test.ts has ZERO opencode refs. §8.2 warns ~564 test occurrences must all be scrubbed (naive rename misses message strings)."
  critical: "§6 + §8.2 are why the 11 'extra' test files are in-scope despite the contract only naming 9. §3 is why backward-compatibility.test.ts is verify-only."

- url: plan/004_9a50e71828f4/docs/consumer-analysis.md
  why: "§2 'OpenCodeProvider — Deprecation & Removal' enumerates exactly what removal entails: delete opencode-provider.ts, NARROW ProviderId (remove 'opencode'), drop @opencode-ai/sdk:1.1.36, update the ~564 test occurrences. §8 confirms the package.json dep line."
  critical: "§2 explicitly says ProviderId must be narrowed (not just the class deleted) and the dep removed. These two are non-negotiable."

- url: docs/migration-opencode-removal.md
  why: "Published migration guide. Breaking-changes list (class removed, dep removed, ProviderId drops 'opencode', multi-provider gateway removed) is the contract this task fulfills."
  critical: "This DOC is finalized by P4.M1.T1.S2 — DO NOT edit it here. Read-only reference for the intended end-state."

- url: plan/004_9a50e71828f4/P3M3T1S1/PRP.md
  why: "The PARALLEL item. It edits src/index.ts + src/types/index.ts (adds harness exports) and creates harness-public-api.test.ts. It KEEPS the legacy Provider*/AnthropicProvider/ProviderRegistry aliases."
  critical: "Confirms NO conflict with this task: P3.M3.T1.S1 never touches opencode, and opencode was never exported from src/index.ts. Narrowing ProviderId does NOT break its aliases ('anthropic' stays valid)."

- file: src/types/providers.ts
  why: "L40 — `export type ProviderId = HarnessId | 'anthropic' | 'opencode';` (the line to narrow). The L30-46 JSDoc block + L556-557, L580, L709 comments mention opencode."
  pattern: "Bucket B deprecated-superset comment block (L30-39). After narrowing, update the comment to drop the 'opencode' mention and note it is fully removed."
  gotcha: "DO NOT remove 'anthropic' — AnthropicProvider (alias of ClaudeCodeHarness, P2.M1) still declares `id: ProviderId = 'anthropic'`. Only 'opencode' goes."

- file: src/utils/harness-config.ts
  why: "THE coupled source change. `isValidProviderId()` (L~258) lists `value === 'opencode'`; `getSupportedProvidersList()` (L~271) returns `\"\\\"anthropic\\\", \\\"opencode\\\"\"`. Module + function JSDoc (L16,18,257,262,271-272,275,289) mention opencode."
  pattern: "isValidHarnessId/getSupportedHarnessesList (the harness twins above) are the model to mirror — `isValidProviderId` should accept `anthropic|pi|claude-code`; the list fn should return `\"\\\"anthropic\\\", \\\"pi\\\", \\\"claude-code\\\"\"`."
  gotcha: "The error TEXT is asserted by src/__tests__/unit/utils/harness-config.test.ts (regex /opencode/). Changing the source WITHOUT the test = red `npm test`. Edit both atomically (Task 4 + Task 6). See §'The Coupled harness-config Change'."

- file: src/harnesses/opencode-provider.ts
  why: "The 1039-line file to DELETE. Confirms it is the ONLY `import(\"@opencode-ai/sdk\")` site in src/ (so uninstalling the dep after deletion is clean)."
  pattern: "DELETE in full (Task 1). No partial edits."

- file: package.json
  why: "L61 — `\"@opencode-ai/sdk\": \"1.1.36\"` (pinned, no caret). Removed via `npm uninstall @opencode-ai/sdk`."
  pattern: "Use npm (not hand-edit) so package-lock.json + node_modules stay consistent (lock has 3 refs)."
  gotcha: "Delete opencode-provider.ts FIRST (Task 1), then uninstall (Task 7) — otherwise tsc sees a dangling import."

- file: src/__tests__/unit/utils/harness-config.test.ts
  why: "THE coupled test change. L129 uses 'opencode' as an INVALID harness id for configureHarnesses (→ R3 sentinel). L429-582 test configureProviders ACCEPTING 'opencode' (→ R4 flip to rejection). L465-473 asserts the error message contains 'opencode' (→ R4 new text)."
  pattern: "Mirror the existing acceptance tests but assert REJECTION for 'opencode' now; keep an acceptance case on 'claude-code'/'anthropic'."
  gotcha: "If you only change the source and skip this file, `npm test` fails on the error-message regex + the acceptance tests."

- file: src/__tests__/integration/provider-switching.test.ts
  why: "111 hits — the largest test edit. Uses createMockProvider('opencode') as the SECONDARY provider against 'anthropic' primary. R1 → 'claude-code'. L67 comment 'OpenCode has no MCP' must be reworded (the mock's mcp flag is `id === 'anthropic'`)."
  pattern: "createMockProvider(id) is generic; swapping the literal preserves switching/cascade/override semantics."
  gotcha: "Reword the L67 capability comment so it no longer names OpenCode — the mock logic `mcp: id === 'anthropic'` still works with 'claude-code' as the secondary."

- file: plan/004_9a50e71828f4/P4M1T1S1/research/findings.md
  why: "THE exhaustive 27-file inventory with per-file hit counts + the R1–R5 replacement table. Consult it file-by-file during Task 6."
  critical: "This is the single source of truth for 'which files, which context, which replacement'."
```

### Current Codebase tree (relevant slice — `grep -ril opencode src/`)

```bash
src/
├── core/agent.ts                                   # EDIT (3) — JSDoc examples provider:'opencode' → 'claude-code'
├── types/
│   ├── agent.ts                                    # EDIT (4) — JSDoc examples (⚠ P3.M2.T2.S1 added harness fields here; grep-target opencode only)
│   └── providers.ts                                # EDIT (7) — narrow ProviderId union + scrub JSDoc
├── utils/harness-config.ts                         # EDIT (8) — isValidProviderId + getSupportedProvidersList + JSDoc (COUPLED to harness-config.test.ts)
├── harnesses/
│   ├── opencode-provider.ts                        # DELETE (94) — OpenCodeProvider class + sole @opencode-ai/sdk importer
│   ├── harness-registry.ts                         # EDIT (2) — JSDoc register(new OpenCodeProvider()) example
│   └── claude-code-harness.ts                      # EDIT (2) — JSDoc normalizeModel('opencode/gpt-4') → 'openai/gpt-4'
└── __tests__/
    ├── integration/provider-switching.test.ts      # EDIT (111) — R1 mock id → 'claude-code'
    ├── unit/
    │   ├── agent-prompt-provider-override.test.ts  # EDIT (56)  — R1
    │   ├── agent-stream-provider-override.test.ts  # EDIT (41)  — R1
    │   ├── provider-interface.test.ts              # EDIT (5)   — R5 narrow union assertion
    │   ├── provider-result-types.test.ts           # EDIT (23)  — R2 ModelSpec/example values → 'openai'
    │   ├── providers/
    │   │   ├── opencode-provider-deprecation.test.ts        # DELETE (29)
    │   │   ├── opencode-provider-execute.test.ts            # DELETE (29)
    │   │   ├── opencode-provider-hooks.test.ts              # DELETE (28)
    │   │   ├── opencode-provider-initialize.test.ts         # DELETE (38)
    │   │   ├── opencode-provider-loadskills.test.ts         # DELETE (12)
    │   │   ├── opencode-provider-normalizemodel.test.ts     # DELETE (37)
    │   │   ├── opencode-provider-registermcps.test.ts       # DELETE (13)
    │   │   ├── opencode-provider-supports.test.ts           # DELETE (13)
    │   │   ├── opencode-provider-terminate.test.ts          # DELETE (22)
    │   │   ├── claude-code-harness-normalizemodel.test.ts   # EDIT (9)   — R2 'opencode/gpt-4' → 'openai/gpt-4'
    │   │   ├── harness-registry.test.ts                    # EDIT (82)  — R1 mock id → 'claude-code'
    │   │   ├── provider-lifecycle.test.ts                  # EDIT (103) — R1 mock id → 'claude-code'
    │   │   └── provider-alias-shim.test.ts                 # EDIT (4)   — R5 narrow union assertion
    │   └── utils/
    │       ├── model-spec.test.ts                   # EDIT (24) — R2 'opencode' → 'openai'
    │       └── harness-config.test.ts               # EDIT (16) — R3+R4 (flip acceptance→rejection, new error text)
    └── compatibility/backward-compatibility.test.ts # VERIFY-ONLY (0) — confirm zero opencode, leave untouched
package.json                                          # EDIT — remove @opencode-ai/sdk via npm uninstall
package-lock.json                                     # EDIT (auto, via npm uninstall)
```

### Desired Codebase tree with files added/modified

```bash
src/harnesses/opencode-provider.ts                     # DELETED
src/__tests__/unit/providers/opencode-provider-*.test.ts # 9 files DELETED
src/types/providers.ts                                  # MODIFIED — ProviderId narrowed; JSDoc scrubbed
src/utils/harness-config.ts                             # MODIFIED — validator + error text + JSDoc scrubbed
src/core/agent.ts                                       # MODIFIED — JSDoc scrubbed
src/types/agent.ts                                      # MODIFIED — JSDoc scrubbed (opencode lines only)
src/harnesses/harness-registry.ts                       # MODIFIED — JSDoc scrubbed
src/harnesses/claude-code-harness.ts                    # MODIFIED — JSDoc scrubbed
src/__tests__/integration/provider-switching.test.ts    # MODIFIED — R1
src/__tests__/unit/agent-prompt-provider-override.test.ts # MODIFIED — R1
src/__tests__/unit/agent-stream-provider-override.test.ts # MODIFIED — R1
src/__tests__/unit/provider-interface.test.ts           # MODIFIED — R5
src/__tests__/unit/provider-result-types.test.ts        # MODIFIED — R2
src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts # MODIFIED — R2
src/__tests__/unit/providers/harness-registry.test.ts   # MODIFIED — R1
src/__tests__/unit/providers/provider-lifecycle.test.ts # MODIFIED — R1
src/__tests__/unit/providers/provider-alias-shim.test.ts # MODIFIED — R5
src/__tests__/unit/utils/model-spec.test.ts             # MODIFIED — R2
src/__tests__/unit/utils/harness-config.test.ts         # MODIFIED — R3+R4
package.json                                            # MODIFIED — @opencode-ai/sdk removed
# dist/**/opencode-provider.* regenerated/removed by `npm run build`
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — THE OUTPUT CRITERION IS ABSOLUTE (27 FILES, NOT 9). The contract names "9 test files +
//   model-spec/provider-config error strings", but its OUTPUT gate is `grep -rni opencode src/` → EMPTY.
//   That requires scrubbing ALL 27 files in the inventory above (1 delete + 9 test deletes + 6 source
//   edits + 11 test edits). The catch-all LOGIC bullet ("grep-and-remove the opencode literal from any
//   non-deprecated code") + the absolute OUTPUT criterion cover them. DO NOT stop after the 9 + 2.

// CRITICAL #2 — NAIVE FIND/REPLACE BREAKS TESTS. The literal appears in 4 semantic contexts (R1–R5 in
//   findings.md): mock HarnessId ('claude-code'), example ModelProviderId ('openai'), invalid-id rejection
//   sentinel ('invalid-harness'), and configureProviders acceptance→rejection flip. Swapping all
//   'opencode'→'claude-code' would make model-spec tests assert formatModelForProvider('claude-code'...)
//   which is fine, BUT would break the configureHarnesses rejection test (needs an INVALID id) and the
//   configureProviders acceptance tests (which must now assert REJECTION). Apply R1–R5 per context.

// CRITICAL #3 — THE COUPLED harness-config CHANGE. src/utils/harness-config.ts getSupportedProvidersList()
//   returns '"anthropic", "opencode"' and isValidProviderId() accepts 'opencode'. The test file
//   src/__tests__/unit/utils/harness-config.test.ts ASSERTS that exact text (regex /opencode/) and that
//   configureProviders ACCEPTS 'opencode'. After removal: source lists '"anthropic", "pi", "claude-code"',
//   validator rejects 'opencode'. You MUST update BOTH the source (Task 4) and the test (Task 6) in the
//   same pass or `npm test` goes red. Exact before/after in §"The Coupled harness-config Change".

// CRITICAL #4 — DO NOT REMOVE 'anthropic' FROM ProviderId. Only 'opencode' is removed. AnthropicProvider
//   (the ClaudeCodeHarness alias, P2.M1) still declares `readonly id: ProviderId = 'anthropic'` and is
//   kept as a deprecated alias by P3.M3.T1.S1. Target union: `HarnessId | 'anthropic'`.

// CRITICAL #5 — DELETE opencode-provider.ts BEFORE `npm uninstall`. The file is the only `@opencode-ai/sdk`
//   importer. If you uninstall first, `npm run lint`/`build` fail on a dangling dynamic import. Order:
//   Task 1 (delete file) → Task 7 (uninstall dep).

// CRITICAL #6 — tsconfig EXCLUDES src/__tests__ from tsc. `npm run lint` (tsc --noEmit) only checks the
//   SOURCE side (ProviderId narrowing + harness-config edit). It will NOT catch a stray 'opencode' literal
//   left in a .test.ts. The REAL test-scrub gate is `npm test` (vitest) + the `grep -rni opencode src/`
//   contract check. Some leftover 'opencode' literals would even PASS vitest (e.g. model-spec tests —
//   parseModelSpec is open-set, so 'opencode' still parses) yet VIOLATE the OUTPUT gate — so rely on the
//   grep, not just a green test run.

// CRITICAL #7 — src/types/agent.ts IS SHARED with a recently-landed item. P3.M2.T2.S1 (Complete) added
//   harness/harnessOptions fields + JSDoc. This task scrubs the SEPARATE opencode JSDoc examples
//   (L~57,77,80,81). Use grep to locate opencode occurrences; do NOT touch the harness fields or you'll
//   regress P3.M2.T2.S1.

// CRITICAL #8 — backward-compatibility.test.ts is VERIFY-ONLY. Contract + migration-scope §3 say it has
//   ZERO opencode refs. Run `grep -ni opencode src/__tests__/compatibility/backward-compatibility.test.ts`
//   to confirm, then leave the file untouched. If (unexpectedly) it DOES reference opencode, update it
//   minimally — but per all sources it should not.

// CRITICAL #9 — dist/ AND coverage/ CONTAIN STALE opencode artifacts (dist/harnesses/opencode-provider.*,
//   coverage/src/providers/opencode-provider.ts.html). These are BUILD OUTPUTS — do NOT hand-delete them.
//   `npm run build` regenerates dist/; `npm test` regenerates coverage/. They are out of the `src/` grep
//   scope, so they do not affect the OUTPUT gate.
```

## Implementation Blueprint

### Data models and structure

No new data models. The single type-shape change is narrowing an existing union:
```ts
// src/types/providers.ts — BEFORE
export type ProviderId = HarnessId | 'anthropic' | 'opencode';
// AFTER
export type ProviderId = HarnessId | 'anthropic';
```
No interfaces, classes, or functions are added. Everything else is deletion or literal replacement.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: DELETE src/harnesses/opencode-provider.ts
  - SCOPE: remove the entire file (the OpenCodeProvider class, ~1039 lines, sole @opencode-ai/sdk importer).
  - COMMAND: `rm src/harnesses/opencode-provider.ts`
  - VERIFY: `ls src/harnesses/opencode-provider.ts` → "No such file"; `grep -rn "from.*opencode-provider" src/` → empty
            (no other source imports it — confirmed: it was deep-import-only, never in src/harnesses/index.ts
            nor src/index.ts).
  - NOTE: Do NOT yet uninstall the dep (Task 7) — but the dynamic import is now gone, so lint/build will pass.

Task 2: DELETE the 9 opencode-provider-*.test.ts files
  - SCOPE: remove all 9 files under src/__tests__/unit/providers/.
  - COMMAND: `rm src/__tests__/unit/providers/opencode-provider-*.test.ts`
            (glob matches exactly the 9: deprecation, execute, hooks, initialize, loadskills,
            normalizemodel, registermcps, supports, terminate).
  - VERIFY: `ls src/__tests__/unit/providers/opencode-provider-*.test.ts 2>/dev/null` → nothing.

Task 3: NARROW ProviderId + scrub src/types/providers.ts (7 hits)
  - EDIT L40: `export type ProviderId = HarnessId | 'anthropic' | 'opencode';` → `export type ProviderId = HarnessId | 'anthropic';`
  - EDIT the L30-46 @deprecated Bucket-B JSDoc block: remove the "OpenCodeProvider id:'opencode'" mention;
        reword to note opencode is fully removed (P4.M1). Keep the AnthropicProvider/'anthropic' mention.
  - SCRUB remaining opencode mentions: L36-37, L556-557 (deprecated Provider interface block — remove the
        `'opencode'` mention + the "OpenCodeProvider deletion (P4.M1)" forward-reference can stay as a past
        note OR be removed; L580 `readonly id: ProviderId; // 'anthropic' | 'opencode'` → `// 'anthropic'`;
        L709 "OpenCode has native /skills support" → remove/reword.
  - PRESERVE: every non-opencode byte. KEEP 'anthropic' in the union. KEEP all Harness* alias JSDoc.
  - VERIFY: `grep -ni opencode src/types/providers.ts` → empty.

Task 4: FIX src/utils/harness-config.ts validator + error text (8 hits, COUPLED — see Critical #3)
  - EDIT isValidProviderId(): remove the `value === 'opencode' ||` line (keep anthropic, pi, claude-code).
  - EDIT getSupportedProvidersList(): `return '"anthropic", "opencode"';` → `return '"anthropic", "pi", "claude-code"';`
  - EDIT the function's JSDoc (L~268-272): remove the "match the 4 legacy test files' regex assertions
        (/anthropic/, /opencode/)" note — that coupling no longer exists.
  - SCRUB module-header JSDoc (L16,18): remove the opencode mentions in the configureProviders
        validation notes.
  - SCRUB any remaining opencode in this file (L257,262,275,289 comments).
  - VERIFY: `grep -ni opencode src/utils/harness-config.ts` → empty.
  - ⚠ MUST run Task 6 (harness-config.test.ts) in the SAME pass — the test asserts the old text/values.

Task 5: SCRUB JSDoc in the 4 remaining source files (agent.ts, types/agent.ts, harness-registry.ts, claude-code-harness.ts)
  - src/core/agent.ts (3): L5 header comment "multiple LLM providers (Anthropic, OpenCode, etc.)" → drop
        "OpenCode"; L362 + L606 `// ...({ provider: 'opencode' })` example comments → `'claude-code'`.
  - src/types/agent.ts (4): L57 "Provider ID (anthropic, opencode, etc.)" → "(anthropic, claude-code, etc.)";
        L77-81 the "Qualified format with OpenCode provider" @example (`model: 'opencode/gpt-4'`) → an
        anthropic example or remove the OpenCode caption. ⚠ P3.M2.T2.S1 added harness fields here — grep
        for opencode, edit ONLY those lines, do not touch harness/harnessOptions fields.
  - src/harnesses/harness-registry.ts (2): L102 `registry.register(new OpenCodeProvider());` →
        `new ClaudeCodeHarness();` (or remove the example line); L508 `registry.register(opencodeProvider);`
        → a claude-code/pi example.
  - src/harnesses/claude-code-harness.ts (2): L1200-1201 the normalizeModel JSDoc example
        `provider.normalizeModel('opencode/gpt-4')` → `'openai/gpt-4'` (R2 — a non-anthropic host the
        harness correctly rejects).
  - VERIFY: `grep -ni opencode src/core/agent.ts src/types/agent.ts src/harnesses/harness-registry.ts src/harnesses/claude-code-harness.ts` → empty.

Task 6: EDIT the 11 remaining test files per R1–R5 (the bulk of the scrub)
  - CONTEXT MAP (apply the right rule per file — see findings.md §4):
      R1 (mock HarnessId 'opencode'→'claude-code'):
        - src/__tests__/integration/provider-switching.test.ts (111) — also reword the L67 "OpenCode has
          no MCP" comment to not name OpenCode (mock logic `mcp: id === 'anthropic'` is unchanged).
        - src/__tests__/unit/agent-prompt-provider-override.test.ts (56)
        - src/__tests__/unit/agent-stream-provider-override.test.ts (41)
        - src/__tests__/unit/providers/harness-registry.test.ts (82)
        - src/__tests__/unit/providers/provider-lifecycle.test.ts (103)
      R2 (example ModelProviderId 'opencode'→'openai'):
        - src/__tests__/unit/utils/model-spec.test.ts (24) — parseModelSpec/formatModelForProvider examples.
        - src/__tests__/unit/provider-result-types.test.ts (23) — ModelSpec/GlobalProviderConfig/providerId examples.
        - src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts (9) —
          'opencode/gpt-4' → 'openai/gpt-4'; the /Cannot normalize opencode\/gpt-4.../ regex → /openai/.
      R3 (configureHarnesses invalid-id rejection — harness-config.test.ts:129): 'opencode' → 'invalid-harness'
        (or any clearly-invalid sentinel; the test still asserts a throw).
      R4 (configureProviders acceptance→rejection FLIP — harness-config.test.ts:429-582):
        - The tests asserting configureProviders({defaultProvider:'opencode'}) SUCCEEDS must now assert it
          THROWS (opencode removed from valid set). Rename/repurpose them to "should REJECT opencode".
        - Keep at least one acceptance case using 'claude-code' or 'anthropic' to prove the validator still
          accepts valid ids.
        - L465-473 error-message test: assert the message contains '"pi"' / '"claude-code"' (new text) and
          assert it does NOT contain 'opencode'.
      R5 (ProviderId union-membership assertions):
        - src/__tests__/unit/providers/provider-alias-shim.test.ts (4): L102
          `const ids: ProviderId[] = ['pi','claude-code','anthropic','opencode']` → drop 'opencode';
          L115-117 the `'opencode'` assignability assertion → assert it is NO LONGER assignable (or remove).
        - src/__tests__/unit/provider-interface.test.ts (5): L815-820 "both 'anthropic' and 'opencode' are
          valid ProviderId" → assert the narrowed set; L208/L1110 read-only-id comment examples → 'claude-code'.
  - PATTERN: for R1/R2 files, a targeted find/replace of the literal string 'opencode' (and 'OpenCode' in
        comments) is usually safe BECAUSE the mock/example semantics are preserved by the replacement id.
        Read each file's affected test names first — if a test is NAMED "...opencode...", rename it
        ("...switches to claude-code...").
  - PRESERVE: each test's asserted BEHAVIOR (switching happens, override wins, rejection throws, etc.).
  - VERIFY per file: `grep -ni opencode <file>` → empty; then `npm test -- <file>` green.

Task 7: UNINSTALL @opencode-ai/sdk
  - COMMAND: `npm uninstall @opencode-ai/sdk`
  - EFFECT: removes L61 from package.json, removes the 3 package-lock.json refs, deletes node_modules/@opencode-ai.
  - PRECONDITION: Task 1 done (opencode-provider.ts deleted) — else dangling import.
  - VERIFY: `grep -c '@opencode-ai/sdk' package.json` → 0; `grep -c '@opencode-ai/sdk' package-lock.json` → 0.

Task 8: VERIFY backward-compatibility.test.ts (verify-only) + run all gates
  - RUN: `grep -ni opencode src/__tests__/compatibility/backward-compatibility.test.ts` → expect EMPTY.
        (If non-empty — contrary to all sources — apply R1/R5 minimally. Per sources it will be empty.)
  - RUN: `npm run lint && npm run build && npm test` → all exit 0.
  - RUN: `grep -rni opencode src/` → EMPTY (the contract OUTPUT gate).
  - RUN: `grep -rn OpenCodeProvider src/` → EMPTY.
```

### Implementation Patterns & Key Details

**§ The Coupled harness-config Change (Task 4 + Task 6.R4) — before/after:**

```ts
// ── src/utils/harness-config.ts — BEFORE ──────────────────────────────────────
function isValidProviderId(value: string): value is ProviderId {
  return (
    value === 'anthropic' ||
    value === 'opencode' ||   // ← REMOVE this line
    value === 'pi' ||
    value === 'claude-code'
  );
}
function getSupportedProvidersList(): string {
  return '"anthropic", "opencode"';   // ← CHANGE
}

// ── src/utils/harness-config.ts — AFTER ───────────────────────────────────────
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'pi' || value === 'claude-code';
}
function getSupportedProvidersList(): string {
  return '"anthropic", "pi", "claude-code"';
}
```
```ts
// ── src/__tests__/unit/utils/harness-config.test.ts — representative flip (R4) ─
// BEFORE (accepted opencode):
it('should accept opencode as default provider', () => {
  configureProviders({ defaultProvider: 'opencode' });
  expect(getGlobalProviderConfig().defaultProvider).toBe('opencode');
});
it('should include supported providers in error message (anthropic + opencode)', () => {
  try { configureProviders({ defaultProvider: 'invalid' }); } catch (e) { message = (e as Error).message; }
  expect(message).toContain('opencode');
});

// AFTER (opencode now rejected; valid acceptance moved to claude-code):
it('should accept claude-code as default provider', () => {
  configureProviders({ defaultProvider: 'claude-code' });
  expect(getGlobalProviderConfig().defaultProvider).toBe('claude-code');
});
it('should REJECT opencode (removed in v2.0.0)', () => {
  expect(() => configureProviders({ defaultProvider: 'opencode' as unknown as ProviderId })).toThrow();
});
it('should list the current supported providers (no opencode)', () => {
  try { configureProviders({ defaultProvider: 'invalid' as unknown as ProviderId }); } catch (e) { message = (e as Error).message; }
  expect(message).toContain('"claude-code"');
  expect(message).not.toContain('opencode');
});
```
> The R3 configureHarnesses rejection test (L129) keeps asserting a throw — just swap the invalid literal
> `'opencode'` → `'invalid-harness'` so the grep is clean.

**§ R1 mock-id swap (provider-switching / override / registry / lifecycle):** the tests build generic
mocks via `createMockProvider('opencode')` and register them; the cascade then resolves the literal. Since
the registry is a plain `Map<string, Provider>` keyed by the mock's `id`, swapping the literal to
`'claude-code'` is behaviour-preserving. Example:
```ts
// BEFORE
const opencodeProvider = createMockProvider('opencode');
registry.register(opencodeProvider);
await agent.prompt(prompt, { provider: 'opencode' });
// AFTER
const claudeCodeProvider = createMockProvider('claude-code');
registry.register(claudeCodeProvider);
await agent.prompt(prompt, { provider: 'claude-code' });
```
Reword the L67 capability comment in `provider-switching.test.ts` from `// OpenCode has no MCP` to
something id-neutral (e.g. `// primary ('anthropic') advertises MCP; the secondary does not`) — the
`mcp: id === 'anthropic'` expression itself is unchanged.

**§ R2 model-host swap (model-spec / result-types / normalizemodel):** the model axis is an OPEN set
(PRD §7.8), so any non-empty provider string parses. Use `'openai'` (a real LLM host) so the
claude-code-rejects-non-anthropic assertion stays meaningful:
```ts
// model-spec.test.ts
const result = parseModelSpec('openai/gpt-4');           // was 'opencode/gpt-4'
expect(result.provider).toBe('openai');
// claude-code-harness-normalizemodel.test.ts
expect(() => provider.normalizeModel('openai/gpt-4')).toThrow(/Cannot normalize openai\/gpt-4 with ClaudeCodeHarness/);
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (no runtime config touched)
ROUTES: none
PUBLIC API:
  - src/index.ts: NO CHANGE (OpenCodeProvider was never exported; P3.M3.T1.S1's harness additions are independent).
  - src/types/index.ts: NO CHANGE.
TYPE SURFACE:
  - src/types/providers.ts: ProviderId narrowed (HarnessId | 'anthropic'). Affects the deprecated Provider*
    aliases only — they remain valid with the narrower union ('anthropic' is still a member).
DEPS:
  - package.json: - "@opencode-ai/sdk": "1.1.36"
  - package-lock.json: auto-updated by `npm uninstall`.
RUNTIME: none beyond removal. agent.ts resolves the harness path (P3.M1.* — Complete); nothing routes to OpenCode.
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback — SOURCE side)

```bash
# tsc excludes src/__tests__, so this proves ONLY the source edits (ProviderId narrowing + harness-config).
npm run lint            # tsc --noEmit. EXPECT: exit 0.
npm run build           # tsc → regenerates dist/ (removes stale dist/**/opencode-provider.*). EXPECT: exit 0.

# Expected: Zero errors. If tsc complains about 'opencode' — you left a dangling reference in SOURCE
# (not a test). The most likely culprit: forgetting to narrow ProviderId, or a source file still
# importing opencode-provider.ts. Re-run `grep -rni opencode src/ --exclude-dir=__tests__` to find it.
```

### Level 2: Unit/Integration Tests (the REAL gate for the 11 test edits)

```bash
# Run each edited test file in isolation to localize failures.
npm test -- provider-switching                        # the 111-hit integration test
npm test -- agent-prompt-provider-override agent-stream-provider-override
npm test -- harness-registry provider-lifecycle provider-alias-shim provider-interface
npm test -- model-spec provider-result-types claude-code-harness-normalizemodel
npm test -- harness-config                            # the coupled R3+R4 file

# Full suite.
npm test                                              # vitest run. EXPECT: exit 0, entire suite green.

# Expected: all green. If harness-config.test.ts fails on a /opencode/ regex or an acceptance test,
# you skipped R3/R4 (Critical #3). If a switching/override test fails, you likely left a mismatched
# literal (e.g. registered 'claude-code' but overrode with 'opencode').
```

### Level 3: Contract Grep Gates (the OUTPUT criterion)

```bash
# THE contract OUTPUT gate — must print NOTHING.
echo "--- opencode literal anywhere in src/ (EXPECT EMPTY) ---"
grep -rni opencode src/

echo "--- OpenCodeProvider identifier in src/ (EXPECT EMPTY) ---"
grep -rn OpenCodeProvider src/

echo "--- opencode-provider file still present? (EXPECT: gone) ---"
ls src/harnesses/opencode-provider.ts 2>/dev/null || echo "DELETED (good)"
ls src/__tests__/unit/providers/opencode-provider-*.test.ts 2>/dev/null || echo "9 TESTS DELETED (good)"

echo "--- dependency removed (EXPECT 0 each) ---"
grep -c '@opencode-ai/sdk' package.json       # → 0
grep -c '@opencode-ai/sdk' package-lock.json  # → 0

echo "--- backward-compat suite has zero opencode (EXPECT EMPTY) ---"
grep -ni opencode src/__tests__/compatibility/backward-compatibility.test.ts

# Expected: every section empty/zero EXCEPT the "DELETED (good)" confirmations.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Confirm dist/ no longer ships opencode artifacts (build regenerated them).
ls dist/harnesses/opencode-provider.* 2>/dev/null && echo "STALE ARTIFACT — rerun npm run build" || echo "clean"
grep -rl opencode dist/ 2>/dev/null | head || echo "dist clean"

# Confirm the package installs without the dep (no phantom @opencode-ai in node_modules).
ls node_modules/@opencode-ai 2>/dev/null && echo "NODE_MODULES STALE — rerun npm install" || echo "clean"

# (Optional) Smoke-test the public API still exposes the harness surface + legacy aliases
# (unchanged by this task; proves no collateral damage).
node -e "const g=require('./dist/index.js'); console.log(typeof g.PiHarness, typeof g.ClaudeCodeHarness, typeof g.HarnessRegistry, typeof g.configureHarnesses);"
# Expected: function function function function  (no OpenCodeProvider key should exist)

# Expected: dist clean; node_modules clean; the 5 public symbols resolve; no OpenCodeProvider export.
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 passed: `npm run lint` exit 0 AND `npm run build` exit 0.
- [ ] Level 2 passed: `npm test` exit 0 (full suite green after R1–R5 rewrites).
- [ ] Level 3 passed: `grep -rni opencode src/` empty; `grep -rn OpenCodeProvider src/` empty; the 10 files
      deleted; `@opencode-ai/sdk` count 0 in package.json + package-lock.json.
- [ ] Level 4 passed: dist/ + node_modules clean of opencode; public harness symbols resolve.

### Feature Validation

- [ ] `src/harnesses/opencode-provider.ts` deleted; 9 `opencode-provider-*.test.ts` deleted.
- [ ] `ProviderId` narrowed to `HarnessId | 'anthropic'` ('anthropic' PRESERVED, 'opencode' gone).
- [ ] `harness-config.ts` validator rejects 'opencode'; error text is `'"anthropic", "pi", "claude-code"'`.
- [ ] All 6 source files + 11 test files scrubbed (27-file inventory fully addressed).
- [ ] `harness-config.test.ts` R4 flip: opencode now rejected, acceptance moved to claude-code, error text
      updated, and an assertion that opencode is ABSENT from the message.
- [ ] `backward-compatibility.test.ts` verified opencode-free and left untouched.
- [ ] `@opencode-ai/sdk` uninstalled (package.json + lock + node_modules).

### Code Quality Validation

- [ ] No blanket find/replace — R1–R5 applied per semantic context.
- [ ] Test intent preserved (switching still switches; rejection still throws; union reflects the truth).
- [ ] JSDoc examples now reference valid ids ('claude-code'/'openai') instead of the removed runtime.
- [ ] No scope leak: examples/, docs/, dist/, coverage/, PRD.md, tasks.json, prd_snapshot.md untouched.

### Documentation & Deployment

- [ ] No new env vars / config.
- [ ] `docs/migration-opencode-removal.md` is NOT edited here (P4.M1.T1.S2 owns its finalization).
- [ ] Commit message references P4.M1.T1.S1 + the v2.0.0 removal milestone.

---

## Anti-Patterns to Avoid

- ❌ Don't **stop after the 9 test files + 2 source files** — the OUTPUT gate is `grep -rni opencode src/`
  empty, which requires all 27 files in the inventory. The 11 "extra" test files are in-scope.
- ❌ Don't **blanket find/replace** `'opencode'` → one value. R1 (mock harness id → 'claude-code'),
  R2 (model host → 'openai'), R3 (invalid-id rejection → 'invalid-harness'), R4 (acceptance→rejection
  flip), R5 (union-narrow assertion) are context-dependent. A single replacement breaks
  `harness-config.test.ts` and misrepresents the model axis.
- ❌ Don't **edit `harness-config.ts` without `harness-config.test.ts`** (or vice versa) — they are coupled
  by the error-message TEXT and the configureProviders acceptance values (Critical #3). Change both in one
  pass or `npm test` goes red.
- ❌ Don't **remove `'anthropic'` from `ProviderId`** — only `'opencode'`. AnthropicProvider (ClaudeCodeHarness
  alias) still uses `id = 'anthropic'`.
- ❌ Don't **`npm uninstall` before deleting `opencode-provider.ts`** — the file is the only importer; tsc
  will fail on the dangling dynamic import. Order: delete (Task 1) → uninstall (Task 7).
- ❌ Don't **trust a green `npm test` alone** — `tsconfig` excludes `__tests__` from tsc, and several
  leftover 'opencode' literals would still pass vitest (e.g. open-set parseModelSpec). The OUTPUT gate is
  the `grep -rni opencode src/` check, not the test exit code.
- ❌ Don't **hand-edit package-lock.json** — use `npm uninstall @opencode-ai/sdk` so package.json +
  lockfile + node_modules stay consistent.
- ❌ Don't **touch `src/types/agent.ts` harness fields** — P3.M2.T2.S1 (Complete) owns them; scrub ONLY the
  opencode JSDoc lines (grep-located).
- ❌ Don't **edit `examples/`, `docs/`, `dist/`, or `coverage/`** — `examples/` + the migration doc are
  P4.M1.T1.S2; `dist/`/`coverage/` are regenerated build outputs (delete via build, not by hand).
- ❌ Don't **edit `backward-compatibility.test.ts`** unless grep proves it references opencode (all sources
  say it does not). It is verify-only.
- ❌ Don't **collide mock ids in a single test** — when R1 swaps 'opencode'→'claude-code', ensure the test
  doesn't ALSO register a separate 'claude-code' mock (rename the variable + the second mock stays distinct).

---

## Confidence Score

**8.5 / 10** for one-pass implementation success.

**Rationale:** The mechanics are simple (delete + literal scrub + one dep uninstall) and the target
end-state is unambiguous (zero `opencode` in `src/`, three green gates). The exhaustive 27-file inventory,
per-file hit counts, and the R1–R5 context map remove the usual "which files / which replacement" guesswork,
and the single load-bearing subtlety (the `harness-config.ts` ↔ `harness-config.test.ts` text coupling) is
documented with exact before/after code. Residual risk is concentrated in the 11 test-file edits: a
careless replacement could (a) break the coupled error-text assertions, (b) leave a mismatched literal
(register one id, override with another), or (c) collide two mocks on the same id. All three are mitigated
by running each edited test file in isolation (Level 2) before the full suite, and by the Level 3 grep
gate that makes "done" objectively verifiable. The parallel item P3.M3.T1.S1 does not touch `opencode` and
opencode was never public, so there is no merge conflict. No external/library research was needed — this
is a self-contained codebase operation fully specified by the migration-scope/consumer-analysis docs.
