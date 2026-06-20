# PRP — P1.M2.T1.S1: Relocate `src/providers` → `src/harnesses` and fix import paths

**PRD reference:** §7 (Agent Harness System) — esp. §7.1 (Supported Harnesses), §7.2 (`HarnessId`),
§7.6 (`HarnessRegistry` / Global Harness Configuration). The relocation adopts the **harness
vocabulary** at the directory level (PRD §7 decision recorded in `system_context.md §7`).
**Plan:** `plan/004_9a50e71828f4/` — first subtask of P1.M2.T1 (Relocate provider modules and rename
registry). **Scope tag:** PURE MECHANICAL RELOCATION — `git mv` one directory + repo-wide import
specifier rewrite. **No logic, symbol, or file-name changes.** `ProviderRegistry` keeps its name
(renamed in S2); `anthropic-provider.ts` keeps its name (renamed P2.M1); `opencode-provider.ts`
keeps its name (deleted P4.M1).

> **Prerequisite (verified in tree):** P1.M1.T3.S1 shipped the `Provider* → Harness*` deprecated
> alias shim in `src/types/providers.ts` (working tree shows it modified + the new
> `provider-alias-shim.test.ts` untracked). The shim keeps `ProviderOptions`/`SessionState`
> **concrete**, which means `src/types/providers.ts:150` still carries an inline
> `import("../providers/session-store.js").SessionStore<SessionState>` — **this task MUST rewrite
> that inline path** (it breaks the moment `src/providers` moves). The alias shim otherwise makes
> every consumer compile under either vocabulary, so the move is purely a path rewrite.

---

## Goal

**Feature Goal:** Relocate the adapter directory `src/providers/` → `src/harnesses/` (via
`git mv`, preserving history) and rewrite **every** import/export/dynamic-import specifier
repo-wide that points into it, so the codebase builds and tests green against the new path while
**zero symbols or file names change**. After this task the runtime adapter modules live under the
harness vocabulary; the still-named `ProviderRegistry` / `AnthropicProvider` / `OpenCodeProvider`
classes keep resolving because every consumer now imports them from `…/harnesses/…`.

**Deliverable:**
1. `src/harnesses/` exists (5 files: `anthropic-provider.ts`, `opencode-provider.ts`,
   `provider-registry.ts`, `session-store.ts`, `index.ts`) with full `git mv` history from
   `src/providers/`. File **names** unchanged.
2. `src/harnesses/index.ts` barrel intact (re-exports `ProviderRegistry`, `InitializationStatus`,
   `MemorySessionStore`, `FileSessionStore`, `SessionStore`, `RedisSessionStore`) — **no symbol
   renames** (those land in S2).
3. Every import/export specifier pointing at the old dir rewritten:
   `../providers/x.js`→`../harnesses/x.js`, `../../providers/x.js`→`../../harnesses/x.js`,
   `../../../providers/x.js`→`../../../harnesses/x.js`, `./providers/x.js`→`./harnesses/x.js`
   across `src/` and `src/__tests__/`. This includes the **inline type import** in
   `src/types/providers.ts` and the **two dynamic `await import()` calls** in
   `opencode-provider-deprecation.test.ts`.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — non-test `src/` resolves all harness paths.
2. `npm test` (`vitest run`) exits 0 — every test resolves its harness imports (incl. dynamic).
3. `npm run build` exits 0 (declaration-emit sanity; regenerates `dist/harnesses/`).
4. Contract verification returns **empty**:
   `grep -rn "providers/" src/ | grep import` → no output.
5. **Stronger** verification (recommended) also returns empty:
   `grep -rnE "(/|from ['\"]|\.\./|\./)providers/" src/` → no output (catches `export … from`
   re-export lines the contract grep hides — see Gotcha #1).
6. No symbol renamed, no file renamed, no `examples/providers/` touched, no `tsconfig.json` change.

---

## User Persona

**Target User:** Groundswell core maintainers + downstream PRP agents:
- **P1.M2.T1.S2** — renames `ProviderRegistry` → `HarnessRegistry` (keyed by `HarnessId`) **inside**
  the now-relocated `src/harnesses/provider-registry.ts` and its barrel. Depends on this task
  having moved the directory so its edits land in the right place.
- **P1.M2.T2.S1** — `configureHarnesses()` + `resolveHarnessConfig()` (lives in
  `src/utils/provider-config.ts`, sibling to the moved dir).
- **P2.M1 / P2.M2** — rename `AnthropicProvider`→`ClaudeCodeHarness`, add `PiHarness` (operating on
  files now under `src/harnesses/`).

**Use Case:** The v1.2 harness axis (PRD §7) renames the runtime concept from "provider" to
"harness". The directory is the most visible artifact of that vocabulary. Because every adapter
file is slated for editing across P1.M2/P2 anyway, `system_context.md §7` decided to **rename the
directory now** rather than leave a misleadingly-named `src/providers/` housing harness adapters.

**Pain Points Addressed:** Leaving `src/providers/` while the types/runtime are renamed to
`Harness*` creates cognitive debt (the directory name lies about its contents) and blocks the
S2/P2 edits from landing in a sensibly-named location. Doing the move as an isolated, mechanical,
history-preserving commit keeps the diff reviewable and revertable.

---

## Why

- **Unblocks P1.M2.T1.S2 and the P2 adapter rewrites.** Those tasks edit
  `provider-registry.ts` / `anthropic-provider.ts`; they should land in `src/harnesses/`, not
  `src/providers/`. Relocating first means every subsequent edit is in the right place.
- **Mechanical + reversible.** `git mv` preserves blame/history; the import rewrite is a pure
  path-substitution with no semantic risk (the alias shim from P1.M1.T3.S1 guarantees symbols
  resolve under either name). One commit, fully revertable.
- **Adopts the harness vocabulary where it is cheapest.** Renaming the directory now (while ~5
  files are in flux) is far cheaper than renaming it later (after P2/P3 add more consumers).
- **Does not touch the public API.** `src/index.ts` re-exports `AnthropicProvider` /
  `ProviderRegistry` **by symbol name**, not by internal path — external consumers are unaffected.

---

## What

A single, atomic relocation:

1. `git mv src/providers src/harnesses` (stage the directory rename; 5 files move with history).
2. Rewrite every import/export/dynamic-import specifier that points into the old directory, using
   **prefix-based** path replacement (NOT a blind `providers`→`harnesses` token swap — see
   Gotcha #2). Affected surfaces: `src/` (non-test), `src/__tests__/`.
3. **Leave file names and all symbol names exactly as-is.** No `ProviderRegistry`→`HarnessRegistry`,
   no `anthropic-provider.ts`→`claude-code-harness.ts`. (Those are S2 / P2.M1 / P4.M1.)
4. **Leave `src/__tests__/unit/providers/` test directory name as-is.** Only fix the import
   specifiers *inside* its files. (Test-dir rename is not in the contract.)
5. **Leave `examples/` untouched.** It has zero `src/providers` imports (see Context — verified).
6. **No `tsconfig.json` change.** `include: ["src/**/*"]` already matches `src/harnesses/**`.

### Success Criteria

- [ ] `src/harnesses/` exists with the 5 files; `git log --follow` shows history from `src/providers/`.
- [ ] `src/harnesses/index.ts` barrel unchanged (same 6 re-exports, same symbol names).
- [ ] `npm run lint` exits 0.
- [ ] `npm test` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `grep -rn "providers/" src/ | grep import` → empty (contract verification).
- [ ] `grep -rnE "(/|\.\./|\./)providers/" src/` → empty (stronger check; catches re-export lines).
- [ ] No file/symbol renamed; no `examples/`, `tsconfig.json`, or `package.json` change.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: A developer who has never seen this repo can execute this task using
only (a) this PRP, (b) the exact reference enumeration below (every file + line verified by grep),
(c) the copy-paste `sed` recipe in the Implementation Blueprint, and (d) the validation commands.
The complete set of 35 files / ~37 edit sites is enumerated; the two non-obvious breakage classes
(inline type import; `export…from` re-exports hidden by `grep import`) are called out explicitly.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (the "what" and "why").
- url: PRD.md §7  (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md)
  why: §7.1/§7.2 establish the harness vocabulary this relocation adopts at the directory level;
       §7.6 names the HarnessRegistry successor (lands in S2 — NOT this task).
  critical: this task does NOT implement any §7 interface — it only relocates the files that will
            later host them. Do not be tempted to rename symbols here.

# MUST READ — the migration inventory (ground truth for what moves + who owns the renames).
- file: plan/004_9a50e71828f4/docs/migration-scope.md
  why: §2 lists the 5 files under src/providers/ (line counts + fate: anthropic→Pi/ClaudeCodeHarness
       in P2.M1; opencode→DELETE in P4.M1; registry→HarnessRegistry in S2; session-store→survives
       unchanged; index.ts barrel). §7 architecture diagram. §10 quick-reference edit list.
  critical: confirms "leave file NAMES as-is for now" — every rename is owned by a LATER task.

# MUST READ — the architecture decision to rename the directory.
- file: plan/004_9a50e71828f4/docs/system_context.md
  why: §7 records the decision: RENAME the directory to adopt the harness vocabulary (all files are
       being edited anyway). This is the justification for doing the move as a standalone task.

# MUST READ — predecessor PRP (its output is this task's INPUT).
- file: plan/004_9a50e71828f4/P1M1T3S1/PRP.md
  why: Defines the alias shim that lets consumers compile under either vocabulary. Its "Bucket C
       keep concrete" rule is WHY src/types/providers.ts:150 still has the inline import this task
       must rewrite.
  critical: confirm the shim is present before starting (see Pre-flight). Do NOT re-edit the shim's
            type aliases — only the ONE inline `import("../providers/session-store.js")` path.

# SHOULD READ — this task's reference enumeration (ground-truth grep output).
- file: plan/004_9a50e71828f4/P1M2T1S1/research/reference-enumeration.md
  why: Every file + edit site, the path-prefix forms, the toolchain facts, and the out-of-scope
       no-ops (examples/, scripts/, types/providers.js, test-dir name).

# The 5 files being moved (read-only — verify their internal imports are all `./`-relative):
- file: src/providers/index.ts            # barrel: 6 re-exports, all from './provider-registry.js' / './session-store.js'
- file: src/providers/provider-registry.ts # imports '../types/providers.js' (STAYS VALID — types/ not moving)
- file: src/providers/anthropic-provider.ts
- file: src/providers/opencode-provider.ts
- file: src/providers/session-store.ts     # imports '../types/providers.js' (STAYS VALID)
  pattern: internal cross-imports use './' (same-dir) → survive the move unchanged.
  gotcha: these files ALSO import '../types/providers.js' (the TYPES file, NOT moving). A blind
          `s/providers/harnesses/g` would corrupt that to '../types/harnesses.js' (WRONG — that file
          is the Harness* type surface, a DIFFERENT module). Use prefix-based replacement only.

# The re-export lines the contract grep HIDES (must still update — Gotcha #1):
- file: src/index.ts:117-118   # export { AnthropicProvider } from './providers/...'; export { ProviderRegistry } from './providers/...'
- file: src/types/index.ts:52  # export { AnthropicProvider } from '../providers/anthropic-provider.js'
  why: these are `export … from` (re-exports), which contain NO "import" token → the contract's
       `grep -rn "providers/" src/ | grep import` does NOT list them, but they BREAK compilation.
```

### Current Codebase tree (relevant slice)

```bash
src/
├── providers/                      # ← MOVES (git mv) → src/harnesses/
│   ├── anthropic-provider.ts       #   keeps name (P2.M1 renames)
│   ├── opencode-provider.ts        #   keeps name (P4.M1 deletes)
│   ├── provider-registry.ts        #   keeps name (S2 renames ProviderRegistry→HarnessRegistry)
│   ├── session-store.ts            #   keeps name (survives migration)
│   └── index.ts                    #   barrel — keeps symbol names (S2 touches exports)
├── types/
│   ├── harnesses.ts                # Harness* types (P1.M1.T1) — NOT moving; distinct from src/harnesses/
│   ├── providers.ts                # alias shim (P1.M1.T3.S1) — L150 inline import path MUST be rewritten
│   └── index.ts                    # L52 re-export path MUST be rewritten
├── core/agent.ts                   # L43 import path MUST be rewritten
├── index.ts                        # L117-118 re-export paths MUST be rewritten
└── __tests__/
    ├── integration/  (2 files)     # import paths MUST be rewritten
    ├── unit/         (4 files)     # import paths MUST be rewritten
    └── unit/providers/ (25 files)  # import paths MUST be rewritten (dir NAME stays)
examples/                           # NO src/providers imports — UNCHANGED
```

### Desired Codebase tree with files to be changed

```bash
src/harnesses/                                    # NEW location (git mv from src/providers/)
  └── (5 files, names unchanged, contents unchanged except nothing — they move as-is)
src/core/agent.ts                                 # MODIFY L43: '../providers/index.js' → '../harnesses/index.js'
src/index.ts                                      # MODIFY L117-118: './providers/...' → './harnesses/...'
src/types/index.ts                                # MODIFY L52: '../providers/...' → '../harnesses/...'
src/types/providers.ts                            # MODIFY L148 (JSDoc) + L150 (inline import): '../providers/session-store.js' → '../harnesses/session-store.js'
src/__tests__/integration/*.test.ts               # MODIFY import paths (2 files)
src/__tests__/unit/*.test.ts                      # MODIFY import paths (4 files)
src/__tests__/unit/providers/*.test.ts            # MODIFY import paths (25 files; incl. 2 dynamic imports in opencode-provider-deprecation.test.ts)
# Total: 35 files touched (1 dir moved + 35 files with path edits; some moved files need 0 content edits).
```

### Known Gotchas of our codebase & Library Quirks

```bash
# CRITICAL #1 — The contract verification grep HIDES re-export lines. The verification is
#   `grep -rn "providers/" src/ | grep import`. This matches lines containing BOTH "providers/"
#   AND the literal word "import". But `export { X } from './providers/...'` (src/index.ts:117-118,
#   src/types/index.ts:52) contains NO "import" token → NOT flagged, yet it BREAKS compilation
#   (the re-export target vanishes after the move). You MUST update these re-export lines anyway.
#   Use the STRONGER verification `grep -rnE "(/|\.\./|\./)providers/" src/` (empty = truly clean),
#   and rely on `npm run lint` (it WILL error on a broken re-export).

# CRITICAL #2 — NEVER do a blind `s/providers/harnesses/g`. The moved files (and many tests) ALSO
#   import '../types/providers.js' — the TYPES module, which is NOT moving. A blind swap turns it
#   into '../types/harnesses.js' (a DIFFERENT module — the Harness* type surface) and silently
#   corrupts imports. ONLY replace the directory-path PREFIXES:
#     '../providers/'  → '../harnesses/'
#     '../../providers/' → '../../harnesses/'
#     '../../../providers/' → '../../../harnesses/'
#     './providers/'   → './harnesses/'
#   These prefixes do NOT match '../types/providers.js' (there is 'types/' between '..' and
#   'providers'). The sed recipe in the Implementation Blueprint is order-sensitive (longest first)
#   and safe.

# CRITICAL #3 — src/types/providers.ts has an INLINE TYPE IMPORT that breaks. L150:
#     sessionStore?: import("../providers/session-store.js").SessionStore<SessionState>;
#   This is a TypeScript inline `import("…")` type — resolved at compile time. After the move it
#   points at a non-existent module → `npm run lint` errors. Rewrite to '../harnesses/session-store.js'.
#   ALSO L148 JSDoc "type is imported from '../providers/session-store.js'" — contains "imported"
#   (matches `grep import`) so the contract verification WILL flag it → rewrite to '../harnesses/...'.

# CRITICAL #4 — Dynamic imports exist and must be caught. opencode-provider-deprecation.test.ts
#   L248 + L265 use `await import('../../../providers/provider-registry.js')`. A static-only
#   rewrite misses them → vitest resolution failure. The prefix-based sed recipe catches them
#   (they contain '../../../providers/'). Verify with the grep after.

# GOTCHA #5 — `npm run lint` EXCLUDES src/__tests__ (tsconfig exclude). So lint only validates the
#   4 non-test src/ files (+ the moved dir). TEST import paths are validated ONLY by `npm test`
#   (vitest/esbuild, transpile-only — resolution failure = test error, not type error). You MUST
#   run BOTH `npm run lint` AND `npm test` to cover all 35 files.

# GOTCHA #6 — Two "harnesses" paths coexist after the move (no clash, but don't conflate):
#     src/harnesses/           → the relocated adapter DIRECTORY (barrel = src/harnesses/index.ts)
#     src/types/harnesses.ts   → the Harness* TYPE definitions (P1.M1.T1, NOT moving)
#   They resolve correctly by path: '../harnesses/index.js' (barrel) vs './harnesses.js' (types).
#   Do NOT merge them; do NOT add a src/harnesses.ts file.

# GOTCHA #7 — src/harnesses/index.ts must stay INTACT (no symbol rename). The barrel re-exports
#   ProviderRegistry, InitializationStatus, MemorySessionStore, FileSessionStore, SessionStore,
#   RedisSessionStore. Renaming ProviderRegistry→HarnessRegistry is S2. Renaming the barrel's
#   internal './provider-registry.js' → something is OUT OF SCOPE (file name stays).

# GOTCHA #8 — Leave src/__tests__/unit/providers/ DIRECTORY name as-is. The contract renames the
#   SOURCE dir only. Test files keep their names + directory; only their import specifiers change.

# GOTCHA #9 — examples/ is a NO-OP. Examples import from the 'groundswell' package (built dist,
#   barrel-based) and from './providers/*' which resolves to examples/providers/ (the EXAMPLE
#   SCRIPTS dir — a separate directory owned by P4.M3.T2). There are ZERO imports of src/providers
#   from examples/. Do NOT rename examples/providers/. (Verified: grep finds none.)

# GOTCHA #10 — tsconfig.tsbuildinfo (root) is a tsc incremental cache. After the move + build it
#   regenerates. If git-tracked it may show as modified — that is expected, not a blocker. Optionally
#   `rm -f tsconfig.tsbuildinfo` before lint/build for a clean recheck.

# GOTCHA #11 — `git mv src/providers src/harnesses` requires the destination NOT to exist. Confirm
#   `src/harnesses/` is absent first (`ls src/harnesses 2>/dev/null` → no such dir). It is absent
#   today (only src/types/harnesses.ts exists, a FILE in a different dir).
```

---

## Implementation Blueprint

### Data models and structure

None. This task changes **zero** data models, types, or runtime behavior. It is a directory
relocation + import-path rewrite. The alias shim (P1.M1.T3.S1) already guarantees symbol-level
compatibility; this task only fixes module-resolution paths.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — confirm src/providers/ has the 5 tracked files and no uncommitted
    edits INSIDE src/providers/ (the alias shim lives in src/types/providers.ts, NOT in src/providers/).
  - RUN: `grep -n "export type ProviderId" src/types/providers.ts` — confirm the alias shim is present
    (expect `export type ProviderId = HarnessId | 'anthropic' | 'opencode';`). If the shim is NOT
    present, STOP — P1.M1.T3.S1 has not landed; this task depends on it.
  - RUN: `ls src/harnesses 2>/dev/null` — confirm destination ABSENT (must not exist for git mv).
    Expect "No such file or directory". (src/types/harnesses.ts is a file in a different dir — fine.)
  - RUN (baseline, optional): `npm run lint && npm test` — confirm GREEN before touching anything,
    so a post-move failure is unambiguously this task's responsibility.

Task 1: RELOCATE the directory (history-preserving)
  - RUN: `git mv src/providers src/harnesses`
  - VERIFY: `git status --short` shows 5 renames (R) from src/providers/* → src/harnesses/*.
  - VERIFY: `ls src/harnesses/` → anthropic-provider.ts, index.ts, opencode-provider.ts,
    provider-registry.ts, session-store.ts.
  - NOTE: the moved files' internal imports are all './'-relative (barrel → ./provider-registry.js,
    ./session-store.js; impls → ../types/providers.js) → they STILL RESOLVE. No content edit needed
    inside src/harnesses/ for correctness. (Optional prose-comment refresh in Task 5.)

Task 2: REWRITE non-test src/ import/export paths (4 files, 6 sites)
  Use the prefix-based sed recipe (SAFE — does not touch ../types/providers.js). Run per-file:
    sed -i \
      -e 's#\.\./\.\./\.\./providers/#../../../harnesses/#g' \
      -e 's#\.\./\.\./providers/#../../harnesses/#g' \
      -e 's#\.\./providers/#../harnesses/#g' \
      -e 's#\./providers/#./harnesses/#g' \
      src/core/agent.ts src/index.ts src/types/index.ts src/types/providers.ts
  (Order matters: longest prefix first so '../../../providers/' is consumed before '../providers/'.)
  - EXPECTED site-level outcomes (verify with `grep -n providers <file>` returning empty or only
    the types/providers.js refs, which are correct and untouched):
      src/core/agent.ts:43        ../providers/index.js   → ../harnesses/index.js
      src/index.ts:117            ./providers/anthropic-provider.js → ./harnesses/anthropic-provider.js
      src/index.ts:118            ./providers/provider-registry.js  → ./harnesses/provider-registry.js
      src/types/index.ts:52       ../providers/anthropic-provider.js → ../harnesses/anthropic-provider.js
      src/types/providers.ts:148  '../providers/session-store.js' (JSDoc) → '../harnesses/session-store.js'
      src/types/providers.ts:150  import("../providers/session-store.js") → import("../harnesses/session-store.js")
  - GOTCHA: src/types/providers.ts still has MANY '@deprecated … Provider*' JSDoc lines and
    '../types/providers.js' is not in this file, but OTHER '../types/...' imports may exist — the
    prefix recipe only matches '../providers/' / './providers/', so it is safe. After sed, confirm
    `grep -n "types/providers" src/types/providers.ts` is UNCHANGED (not present as a self-import;
    if it were, it would be untouched — correct).

Task 3: REWRITE test import paths (src/__tests__/, 31 files incl. 2 dynamic imports)
  - APPLY the same prefix-based sed recipe to every test file that references providers/:
    sed -i \
      -e 's#\.\./\.\./\.\./providers/#../../../harnesses/#g' \
      -e 's#\.\./\.\./providers/#../../harnesses/#g' \
      -e 's#\.\./providers/#../harnesses/#g' \
      -e 's#\./providers/#./harnesses/#g' \
      $(grep -rlE "(/|\.\./|\./)providers/" src/__tests__)
    (The $(grep -rl …) expands to exactly the 31 files; safe because tests do not import
    ../types/providers.js with a providers/ prefix that would collide — verified.)
  - CRITICAL SUB-CASE: opencode-provider-deprecation.test.ts L248 + L265 dynamic imports
    `await import('../../../providers/provider-registry.js')` → '../../../harnesses/provider-registry.js'.
    The '../../../providers/' prefix rule catches them. VERIFY after:
      grep -n "providers/" src/__tests__/unit/providers/opencode-provider-deprecation.test.ts  # → empty
  - VERIFY: `grep -rnE "(/|\.\./|\./)providers/" src/__tests__` → empty.

Task 4: SCAN examples/ (expect NO-OP; do not edit)
  - RUN: `grep -rnE "(/|\.\./|\./)providers/" examples/` → expect EMPTY (examples import from the
    'groundswell' package + './providers/*' which is examples/providers/, a separate dir).
  - DO NOT rename examples/providers/ — it is owned by P4.M3.T2 (Migrate examples to harness vocab).
  - If (unexpectedly) a hit appears pointing at ../src/providers, rewrite it the same way; otherwise
    leave examples/ entirely untouched.

Task 5 (OPTIONAL cosmetic): refresh stale prose path comments
  - These JSDoc/comments reference the old path but do NOT break compilation and are NOT flagged by
    `grep import`. Update for accuracy ONLY if time permits; do NOT block the task on them:
      src/types/harnesses.ts:242            "(src/providers/anthropic-provider.ts …)" → "src/harnesses/…"
      src/harnesses/anthropic-provider.ts:390 "// FROM: src/providers/anthropic-provider.ts:…" → "src/harnesses/…"
      src/harnesses/opencode-provider.ts:210 "// FOLLOW: … at src/providers/anthropic-provider.ts:…" → "src/harnesses/…"
  - Use a targeted edit per line (NOT a blanket sed) to avoid touching legitimate "Provider*"
    symbol mentions in those files.

Task 6: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all four gates: grep (contract), grep (stronger), npm run lint, npm test, npm run build.
  - ANY failure → almost certainly a missed path or a blind-swap corruption. Re-run the enumeration
    greps to localize; fix with a targeted prefix replacement. Do NOT "fix" by renaming symbols.
```

### Implementation Patterns & Key Details

```bash
# THE safe, order-sensitive prefix-based sed recipe (longest prefix FIRST). Reusable per-file or
# batched via $(grep -rl …). It cannot corrupt ../types/providers.js because that string has no
# '../providers' / '../../providers' / '../../../providers' / './providers' substring.
sed -i \
  -e 's#\.\./\.\./\.\./providers/#../../../harnesses/#g' \
  -e 's#\.\./\.\./providers/#../../harnesses/#g' \
  -e 's#\.\./providers/#../harnesses/#g' \
  -e 's#\./providers/#./harnesses/#g' \
  <files...>

# WHY prefix-based (counter-example of the FORBIDDEN blind swap):
#   sed 's/providers/harnesses/g'   ← NEVER. Corrupts '../types/providers.js' → '../types/harnesses.js'
#   (a different module). Also corrupts '@deprecated … ProviderResult' prose? No — that is 'Provider'
#   not 'providers/', but a careless `s/providers/harnesses/g` WOULD hit 'providers.js' anywhere.

# The git mv (single command, preserves history for all 5 files):
git mv src/providers src/harnesses
# Verify history survived for one file:
git log --follow --oneline -- src/harnesses/provider-registry.ts | head
```

### Integration Points

```yaml
DIRECTORY LAYOUT:
  - src/providers/  → REMOVED (git mv). src/harnesses/ → CREATED (5 files).
  - src/types/harnesses.ts : UNCHANGED (the Harness* type surface; coexists with src/harnesses/).
  - src/types/providers.ts : alias shim UNCHANGED except L148/L150 path rewrite (Task 2).

BARRELS (path-only edits; symbol lists UNCHANGED):
  - src/harnesses/index.ts : barrel UNCHANGED (re-exports ProviderRegistry, InitializationStatus,
    MemorySessionStore, FileSessionStore, SessionStore, RedisSessionStore). S2 renames symbols.
  - src/index.ts           : L117-118 re-export PATHS rewritten; exported NAMES unchanged →
    external public API UNAFFECTED (consumers import AnthropicProvider/ProviderRegistry by name).
  - src/types/index.ts     : L52 re-export PATH rewritten; symbol unchanged.

CONSUMERS (path edits only; NO symbol/behavior change):
  - src/core/agent.ts                  : L43 import path.
  - src/__tests__/** (31 files)        : import paths (+ 2 dynamic imports).

NOT IN SCOPE (do not touch — owned downstream):
  - ProviderRegistry → HarnessRegistry (symbol + barrel)           → P1.M2.T1.S2.
  - configureHarnesses / resolveHarnessConfig                       → P1.M2.T2.S1.
  - AnthropicProvider → ClaudeCodeHarness; PiHarness                → P2.M1 / P2.M2.
  - examples/providers/ → examples/harnesses/ + example rewrites    → P4.M3.T2.
  - docs/providers.md → docs/harnesses.md                           → P4.M3.T1.S1.
  - OpenCodeProvider + opencode-provider.ts deletion                → P4.M1.T1.S1.
```

---

## Validation Loop

> **Toolchain note:** TypeScript + vitest. `npm run lint` = `tsc --noEmit` (EXCLUDES
> `src/__tests__` per tsconfig). `npm test` = `vitest run` (esbuild transpile-only; resolution
> failures surface as test errors). No eslint/prettier. **You MUST run BOTH lint and test** —
> lint covers the 4 non-test files; test covers the 31 test files (lint skips them).

### Level 1: The relocation itself (after Task 1)

```bash
git status --short                       # expect 5 'R' renames src/providers/* → src/harnesses/*
ls src/harnesses/                        # expect the 5 files
git log --follow --oneline -- src/harnesses/provider-registry.ts | head   # history survived
```

### Level 2: Path-rewrite completeness (after Tasks 2-4)

```bash
# CONTRACT verification (must be EMPTY):
grep -rn "providers/" src/ | grep import
# Expected: no output.

# STRONGER verification (also catches export…from re-exports the contract grep hides — Gotcha #1):
grep -rnE "(/|\.\./|\./)providers/" src/
# Expected: no output. (If anything remains, it is a missed path — fix with the prefix sed.)

# Confirm the TYPES module references are INTACT (NOT corrupted by a blind swap — Gotcha #2):
grep -rn "types/providers" src/ | grep -E "from|import"
# Expected: unchanged ../types/providers.js / ./types/providers.js references still present.
```

### Level 3: Type check (non-test src/) + Tests (src/__tests__ + examples/__tests__)

```bash
# Non-test type check — catches broken non-test imports (agent.ts, index.ts, types/, src/harnesses/).
npm run lint
# Expected: exit 0. An error naming a moved module = a missed/bad path rewrite in Task 2.

# Full test suite — catches broken TEST imports (incl. the 2 dynamic imports) + behavioral regressions.
npm test
# Expected: exit 0, all suites pass. A module-resolution error in a provider/opencode/agent test =
# a missed path rewrite in Task 3.
```

### Level 4: Build (declaration-emit sanity)

```bash
# Optional but recommended: confirms valid .d.ts emit + that dist/harnesses/ is generated.
rm -f tsconfig.tsbuildinfo   # optional: force a clean incremental recheck
npm run build
# Expected: exit 0; dist/harnesses/ exists; dist/providers/ is stale (gitignored) — harmless.
```

### Level 5: Targeted spot-checks (confidence)

```bash
# The two trickiest edit sites resolve correctly:
npx tsx -e "import('./src/harnesses/index.js').then(m => console.log(Object.keys(m)))"
# Expected: prints the barrel's exported names (ProviderRegistry, InitializationStatus, …).

# Confirm the inline type import in the alias shim compiles (it is type-only, so this is a lint check):
npm run lint 2>&1 | grep -i "session-store" || echo "OK: no session-store resolution error"
# Expected: "OK: no session-store resolution error".
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `git mv` staged 5 renames; `src/harnesses/` exists; `git log --follow` shows history.
- [ ] `grep -rn "providers/" src/ | grep import` → **empty** (contract verification).
- [ ] `grep -rnE "(/|\.\./|\./)providers/" src/` → **empty** (stronger check).
- [ ] `../types/providers.js` references **intact** (not corrupted by a blind swap).
- [ ] `npm run lint` exits 0.
- [ ] `npm test` exits 0 (incl. `opencode-provider-deprecation.test.ts` dynamic imports).
- [ ] `npm run build` exits 0; `dist/harnesses/` generated.

### Feature Validation

- [ ] `src/harnesses/index.ts` barrel unchanged (6 re-exports, same symbol names).
- [ ] No symbol renamed, no file renamed, no test-directory renamed.
- [ ] `examples/` untouched (no-op confirmed).
- [ ] `tsconfig.json` and `package.json` unchanged.
- [ ] The inline `import("../harnesses/session-store.js")` in `src/types/providers.ts:150` resolves.

### Code Quality Validation

- [ ] Prefix-based replacement used (no blind `providers`→`harnesses` token swap).
- [ ] `export … from './providers/…'` re-export lines updated (not just `import` lines).
- [ ] Dynamic `await import('…/providers/…')` calls updated.
- [ ] History preserved via `git mv` (not delete+create).

---

## Anti-Patterns to Avoid

- ❌ Don't use `sed 's/providers/harnesses/g'` (blind token swap) — it corrupts
  `../types/providers.js` into `../types/harnesses.js` (a different module). Use the prefix-based
  recipe (`../providers/`, `../../providers/`, `../../../providers/`, `./providers/`).
- ❌ Don't trust ONLY the contract verification `grep -rn "providers/" src/ | grep import` — it
  hides `export … from './providers/…'` re-export lines (src/index.ts, types/index.ts) which STILL
  BREAK compilation. Run the stronger `grep -rnE "(/|\.\./|\./)providers/" src/` and `npm run lint`.
- ❌ Don't miss the **inline type import** at `src/types/providers.ts:150` or the **dynamic imports**
  at `opencode-provider-deprecation.test.ts:248/265` — they are not top-level `import` statements.
- ❌ Don't rename ANY symbol or file (`ProviderRegistry`, `AnthropicProvider`, `OpenCodeProvider`,
  `anthropic-provider.ts`, `opencode-provider.ts`, the barrel exports) — those are S2 / P2.M1 /
  P4.M1. This task is paths-only.
- ❌ Don't rename `src/__tests__/unit/providers/` or any test file — only fix import specifiers.
- ❌ Don't touch `examples/` (no `src/providers` imports; `examples/providers/` is owned by P4.M3.T2).
- ❌ Don't edit `tsconfig.json` (`include: src/**/*` already matches `src/harnesses/**`).
- ❌ Don't conflate `src/harnesses/index.ts` (barrel) with `src/types/harnesses.ts` (types) —
  distinct paths, both legitimate.
- ❌ Don't skip `npm test` — `npm run lint` excludes `src/__tests__`, so test import paths are
  validated ONLY by vitest.
- ❌ Don't delete-and-recreate the directory instead of `git mv` — that destroys blame/history.

---

## Hand-off Notes for Downstream Tasks

- **P1.M2.T1.S2 (HarnessRegistry):** Edits land in `src/harnesses/provider-registry.ts` (now
  relocated). Rename `ProviderRegistry`→`HarnessRegistry`, re-key by `HarnessId`, and update the
  barrel `src/harnesses/index.ts` exports. Every consumer now imports from `…/harnesses/…`, so the
  symbol rename is a localized find/replace of `ProviderRegistry`→`HarnessRegistry` (and
  `initializeProvider`→`initializeHarness`, etc.).
- **P1.M2.T2.S1 (configureHarnesses):** Operates on `src/utils/provider-config.ts` (sibling of the
  moved dir, unaffected by this task).
- **P2.M1 (ClaudeCodeHarness):** Rename `AnthropicProvider`→`ClaudeCodeHarness` inside
  `src/harnesses/anthropic-provider.ts`; the file itself may be renamed to `claude-code-harness.ts`
  at that point. Until then it keeps its current name in `src/harnesses/`.
- **P4.M1.T1.S1 (OpenCode removal):** Deletes `src/harnesses/opencode-provider.ts` + the `'opencode'`
  literal. After it AND P2.M1 land, the `ProviderId` superset (from the alias shim) can collapse.
- **P4.M3.T2 (examples migration):** Owns `examples/providers/` → `examples/harnesses/` and the
  example script rewrites. This task deliberately leaves that directory untouched.
- **P4.M3.T1.S1 (docs):** Owns `docs/providers.md` → `docs/harnesses.md`. Out of scope here.

---

**Confidence Score: 9/10** — Mechanical relocation with a fully enumerated reference set (35 files /
~37 edit sites, verified by grep), a safe prefix-based rewrite recipe that side-steps the one real
corruption trap (`types/providers.js`), and clear gates. The one residual risk is human error
missing an edge case (e.g., a stray comment), which the stronger grep + `npm run lint` + `npm test`
triple gate catches deterministically.
