# PRP — P4.M1.T1.S2: Update examples & finalize `migration-opencode-removal.md`

**PRD reference:** §7 (Agent Harness System). **Plan:** `plan/004_9a50e71828f4/` — S2 of P4.M1.T1
("Delete OpenCodeProvider and opencode surface"). **Consumes:** the cleaned source produced by the
parallel item **P4.M1.T1.S1** (deletes `src/harnesses/opencode-provider.ts`, narrows `ProviderId` to
`HarnessId | 'anthropic'`, uninstalls `@opencode-ai/sdk`, scrubs every `opencode` literal from `src/`).
After S1, `OpenCodeProvider` is gone and `'opencode'` is no longer a valid `ProviderId` — so every
example that imports/registers/overrides it fails to compile. **Produces:** (a) the 5 provider
examples opencode-free so they no longer reference the removed runtime, and (b) `docs/migration-opencode-removal.md`
marked **COMPLETED** for the v2.0.0 removal. **Unblocks:** P4.M2 (parity suites) and the docs/examples
track P4.M3. **Scope tag:** (1) **EDIT** 5 example files to drop `OpenCodeProvider` usage; (2) **EDIT**
the migration doc to mark removal complete. **DO NOT** do the provider→harness vocabulary rewrite
(`AnthropicProvider`→`ClaudeCodeHarness`, `provider:`→`harness:`, pi/claude-code matrices) — that is
explicitly **P4.M3.T2**. **DO NOT touch** `src/`, `PRD.md`, `tasks.json`, `prd_snapshot.md`, `dist/`,
`coverage/`, or any non-opencode example content.

> **READ "SCOPE DISCIPLINE — S2 REMOVES ONLY OPENCODE" AND "THE 5-FILE REALITY (NOT 4)" BEFORE EDITING.**
> The contract names examples "02,03,04,06" but **05 also imports `OpenCodeProvider`** (verified:
> `examples/providers/05-provider-sessions.ts:26,57`). The OUTPUT gate ("examples compile without
> opencode") requires all **5** files. And the "compile" success criterion is scoped to opencode
> removal only — there is **pre-existing, out-of-scope breakage** (`configureProviders`/
> `getGlobalProviderConfig` un-exported; `Skill.path`/`AgentHooks` drift) owned by P4.M3.T2. See §Known Gotchas.

---

## Goal

**Feature Goal:** Remove every `OpenCodeProvider` import/registration/configuration/override and every
`opencode` literal from the provider examples, and finalize `docs/migration-opencode-removal.md` as
COMPLETED — closing the documentation/examples side of the v2.0.0 OpenCode removal runway started by S1.

**Deliverable:**
1. **EDIT** `examples/providers/02-provider-configuration.ts`, `03-provider-switching.ts`,
   `04-multi-provider-scenarios.ts`, `05-provider-sessions.ts`, `06-provider-with-mcp-skills.ts` — drop
   `OpenCodeProvider` imports, the `registry.register(new OpenCodeProvider())` calls, the `opencode`
   config blocks, the `provider: 'opencode'` / prompt-override usages, the OpenCode capability-matrix
   columns, and the OpenCode-naming in console output — preserving the **legacy** `AnthropicProvider` /
   `ProviderRegistry` / `provider:'anthropic'` vocabulary (vocabulary rewrite is P4.M3.T2).
2. **EDIT** `docs/migration-opencode-removal.md` — add a COMPLETED status banner, update the timeline to
   past tense, and refresh the deprecation-window FAQ entries.

**Success Definition:**
1. `grep -rni opencode examples/` prints **nothing** (the contract OUTPUT gate).
2. `grep -rn OpenCodeProvider examples/` prints **nothing**.
3. For each of the 5 example files: a targeted `tsc --noEmit` shows **zero** errors matching
   `opencode|OpenCodeProvider` (the opencode errors are eliminated). *Other pre-existing type errors
   (configureProviders/getGlobalProviderConfig un-exported, Skill.path, AgentHooks, helpers-path
   artifact) MAY remain and are explicitly out of scope — see §Known Gotchas #2.*
4. `docs/migration-opencode-removal.md` carries a `✅ COMPLETED — Removed in v2.0.0` status and past-tense
   timeline.
5. No example file was rewritten to harness vocabulary (`PiHarness`/`ClaudeCodeHarness`/`harness:`) —
   that work is untouched and reserved for P4.M3.T2.

## Why

- **Completes the OpenCode removal runway.** S1 scrubs `src/`; this item scrubs the consumer-facing
  examples + the public migration doc so neither references a runtime that no longer exists.
- **Unblocks the docs/examples track.** P4.M3.T2 ("Migrate examples to harness vocabulary") can only
  begin from a clean, opencode-free example baseline; leaving opencode in the examples would force
  P4.M3.T2 to do two rewrites at once.
- **Honest public communication.** The migration doc must reflect that removal actually shipped in
  v2.0.0, not that it is still "planned for July 2026".
- **Low risk.** Edits are confined to example/doc files that are not part of the published package
  (`tsconfig.json` `include` is `src/**/*` only) and not executed by `npm test`. No runtime behavior of
  the library changes.

## What

User-visible behavior: **none** for the library. Developers reading the examples no longer see
`OpenCodeProvider`; readers of the migration doc see a completed removal. The examples remain in the
**legacy provider vocabulary** (`AnthropicProvider`, `ProviderRegistry`, `provider:'anthropic'`,
`configureProviders`) — these are still-valid deprecated aliases; the harness-vocabulary rewrite is
deferred to P4.M3.T2 by explicit contract.

### Success Criteria

- [ ] All 5 provider example files (02,03,04,05,06) have zero `opencode`/`OpenCodeProvider` references.
- [ ] `OpenCodeProvider` imports removed from all 5 files; `registry.register(new OpenCodeProvider())`
      removed from all 5; `provider:'opencode'` agent fields + prompt overrides removed/converted.
- [ ] OpenCode capability-matrix columns/rows removed from examples 03, 05, 06 (anthropic column kept),
      each with a `// TODO(P4.M3.T2)` note where a pi/claude-code comparison is the intended end state.
- [ ] Legacy vocabulary (`AnthropicProvider`, `ProviderRegistry`, `provider:'anthropic'`,
      `configureProviders`) preserved — NOT rewritten to harness names.
- [ ] `docs/migration-opencode-removal.md` marked COMPLETED (status banner + past-tense timeline + FAQ).
- [ ] `grep -rni opencode examples/` empty; targeted tsc shows zero opencode errors per file.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes.** This PRP gives: the verified 5-file inventory (correcting the contract's "4"),
the per-file line-anchored edit map, the explicit scope boundary (what stays legacy vs what is deferred
to P4.M3.T2), the exact error-classification table proving which tsc errors are in-scope vs pre-existing,
and a verified-working validation command. The single judgment traps — (a) 05 is in-scope despite the
contract omitting it, (b) `configureProviders`/`getGlobalProviderConfig` must NOT be "fixed", and (c) the
vocabulary must NOT be rewritten — are all resolved in §Known Gotchas.

### Documentation & References

```yaml
# MUST READ — include these in your context window
- url: plan/004_9a50e71828f4/P4M1T1S1/PRP.md
  why: "The PARALLEL predecessor. It deletes src/harnesses/opencode-provider.ts, narrows ProviderId to
        HarnessId | 'anthropic', uninstalls @opencode-ai/sdk, and scrubs every opencode literal from src/.
        It explicitly EXCLUDES examples/ and docs/ from its scope and hands them to THIS task (S2)."
  critical: "S1's OUTPUT gate is `grep -rni opencode src/` empty. S2's is `grep -rni opencode examples/`
        empty + the migration doc finalized. Treat S1 as a contract: assume it landed exactly as specified."

- url: plan/004_9a50e71828f4/docs/consumer-analysis.md
  why: "§6 'examples/ Directory' is the authoritative example inventory + refactor map. The per-file table
        notes which APIs each example demonstrates and what the §7 refactor entails. §6 also (incorrectly)
        lists only 02,03,04,06 as OpenCodeProvider importers — the grep proves 05 also imports it."
  critical: "§6 says the 06 capability matrix 'must be rewritten for pi vs claude-code (PRD §7.4)' —
        that FULL rewrite is P4.M3.T2. S2 only REMOVES the opencode column; it does not add pi/claude-code."

- url: docs/migration-opencode-removal.md
  why: "The doc S2 finalizes. Read it fully to know exactly which lines to flip to COMPLETED/past-tense."
  critical: "DO NOT rewrite its AnthropicProvider/configureProviders code samples to harness vocabulary —
        that is the docs rewrite owned by P4.M3.T1.S1/P4.M3.T2. S2 only marks the removal COMPLETE."

- file: examples/providers/02-provider-configuration.ts
  why: "Demonstrates configureProviders() three-level cascade. Imports OpenCodeProvider (L28), registers
        it (L91), configures an opencode block (L66-77), creates an OpenCodeAgent (L107-113), and does a
        prompt-level opencode override (L172-193)."
  pattern: "Keep the cascade pedagogy intact; just remove the opencode provider instance and convert the
        OpenCode agent/override to an anthropic variant (or remove)."
  gotcha: "LEAVE the configureProviders + getGlobalProviderConfig imports (L25-26) — they are pre-existing
        un-exported (P4.M3.T2 owns the fix). Removing opencode is NOT the same as fixing those imports."

- file: examples/providers/03-provider-switching.ts
  why: "Agent-level + prompt-level provider switching across Anthropic + OpenCode. Imports OpenCodeProvider
        (L27), registers (L58), builds opencodeAgent (L90-102), overrides to opencode (L173-194), and has
        a capability comparison table (L251-258) + 'when to use' code strings (L281,294)."
  pattern: "Collapse the two-provider demo to anthropic-only and leave a // TODO(P4.M3.T2): rewrite as
        pi vs claude-code harness switching note. With opencode gone there is no valid SECOND legacy
        provider to switch to — do not invent one."

- file: examples/providers/04-multi-provider-scenarios.ts
  why: "Cost-optimization / fallback / A-B-testing across providers. Imports OpenCodeProvider (L27),
        registers (L58), types provider unions as 'anthropic'|'opencode' (L191-192, L300), branches on
        provider==='opencode' (L313), and prints pattern code-strings naming opencode (L377-421)."
  pattern: "Narrow the 'anthropic'|'opencode' unions to 'anthropic' (single-provider) with a TODO(P4.M3.T2)
        note that multi-model routing will move to the model axis (anthropic/... vs openai/...) under a
        constant harness."

- file: examples/providers/05-provider-sessions.ts
  why: "THE FILE THE CONTRACT OMITS. Imports OpenCodeProvider (L26) and registers it (L57). Has a
        'Provider Session Model Differences' comparison block (L290-325) with an Anthropic|OpenCode table."
  pattern: "Drop the import + register; remove the OpenCode column from the session-model comparison."
  gotcha: "If you trust the contract's '02,03,04,06' list and skip 05, the OUTPUT grep gate fails."

- file: examples/providers/06-provider-with-mcp-skills.ts
  why: "MCP + skills + the capability comparison matrix the contract calls out. Imports OpenCodeProvider
        (L26), registers (L58), fetches registry.get('opencode') (L459), and renders an Anthropic|OpenCode
        capability matrix (L459-491) + a summary line (L507)."
  pattern: "Remove the OpenCode column from the matrix; keep the Anthropic column; add // TODO(P4.M3.T2):
        rewrite matrix as pi vs claude-code (PRD §7.4)."

- file: src/index.ts
  why: "The public API surface the examples import from. Confirms OpenCodeProvider is NOT exported
        (L126-134 list only ClaudeCodeHarness/AnthropicProvider/HarnessRegistry/ProviderRegistry/PiHarness/
        configureHarnesses/parseModelSpec/formatModelForProvider) and that configureProviders/
        getGlobalProviderConfig are NOT re-exported (pre-existing gap)."
  pattern: "READ-ONLY reference — do not edit src/. It tells you which example imports are valid today."
  gotcha: "AnthropicProvider + ProviderRegistry ARE exported (deprecated aliases) — so those example
        imports stay valid. Only the OpenCodeProvider import is the S2 target."

- file: tsconfig.json
  why: "include=['src/**/*'], rootDir='./src', exclude=[node_modules,dist,src/__tests__]. Proves examples/
        is NOT compiled by npm run lint/build and NOT tested by npm test. Examples run via tsx only."
  critical: "This is why the validation gate is a grep + a targeted standalone tsc delta, NOT npm test."

- docfile: plan/004_9a50e71828f4/P4M1T1S2/research/findings.md
  why: "THE exhaustive per-file line-anchored edit map + the verified error-classification table. Consult
        it file-by-file during the Implementation Tasks."
  section: "§7 (per-file edit map), §3 (error classification), §5 (verified validation command)"
```

### Current Codebase tree (relevant slice — `grep -rli opencode examples/`)

```bash
examples/providers/
├── 01-basic-provider-usage.ts            # (no opencode — UNTOUCHED)
├── 02-provider-configuration.ts          # EDIT — drop OpenCodeProvider import/register/config/override
├── 03-provider-switching.ts              # EDIT — collapse 2-provider demo to anthropic-only + TODO
├── 04-multi-provider-scenarios.ts        # EDIT — narrow provider unions; remove opencode branches
├── 05-provider-sessions.ts               # EDIT — ⚠ CONTRACT OMITS THIS; imports OpenCodeProvider (L26,57)
├── 06-provider-with-mcp-skills.ts        # EDIT — remove OpenCode capability-matrix column + TODO
└── README.md                             # (no opencode — UNTOUCHED; mentions configureProviders = P4.M3.T2)
docs/
└── migration-opencode-removal.md         # EDIT — mark COMPLETED in v2.0.0
# Already opencode-free (verify-only): examples/README.md, examples/index.ts, examples/examples/*,
#   examples/components/*, examples/utils/helpers.ts
```

### Desired Codebase tree with files modified

```bash
examples/providers/02-provider-configuration.ts     # MODIFIED — opencode removed; legacy vocab kept
examples/providers/03-provider-switching.ts         # MODIFIED — anthropic-only + TODO(P4.M3.T2)
examples/providers/04-multi-provider-scenarios.ts   # MODIFIED — unions narrowed; opencode branches gone
examples/providers/05-provider-sessions.ts          # MODIFIED — import/register removed; table column gone
examples/providers/06-provider-with-mcp-skills.ts   # MODIFIED — matrix OpenCode column removed + TODO
docs/migration-opencode-removal.md                  # MODIFIED — COMPLETED status + past-tense timeline + FAQ
# No files added. No src/ changes. dist/coverage untouched (regenerated by build/test, not hand-edited).
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — THE 5-FILE REALITY (NOT 4). The contract LOGIC lists "02,03,04,06" but
//   grep -rlni opencode examples/ returns FIVE files — 05-provider-sessions.ts ALSO imports
//   OpenCodeProvider (L26) and registers it (L57). The OUTPUT gate (examples compile without opencode)
//   requires ALL FIVE. Skipping 05 leaves opencode in the grep and a failing gate. Treat 05 as in-scope.

// CRITICAL #2 — SCOPE DISCIPLINE: S2 REMOVES ONLY OPENCODE. The contract defers "full example migration"
//   to P4.M3.T2. Therefore:
//   • KEEP the legacy vocabulary: AnthropicProvider, ProviderRegistry, provider:'anthropic',
//     configureProviders({ defaultProvider:'anthropic' }), providerOptions. These are still-valid
//     deprecated aliases (src/index.ts:126-127). Do NOT rename to ClaudeCodeHarness/HarnessRegistry/
//     harness:/configureHarnesses.
//   • DO NOT introduce PiHarness / 'pi' / 'claude-code' into the examples (that is the P4.M3.T2
//     vocabulary rewrite, including the pi-vs-claude-code capability matrices per PRD §7.4).
//   • When a two-provider demo (03/04/06) loses its only second provider, COLLAPSE to anthropic-only
//     and leave a `// TODO(P4.M3.T2): rewrite as pi vs claude-code` note. Do NOT invent a placeholder.

// CRITICAL #3 — PRE-EXISTING, OUT-OF-SCOPE BREAKAGE (DO NOT "FIX"). A standalone tsc on the examples
//   reports errors BEYOND opencode. Verified classification:
//   • configureProviders / getGlobalProviderConfig (example 02, L25-26): defined as deprecated aliases
//     in src/utils/harness-config.ts:287,323 but NOT re-exported from src/index.ts. → P4.M3.T2 (vocabulary).
//   • Skill requires 'path' (example 06, L316) and AgentHooks shape mismatch (example 06, L432): API
//     drift from the harness migration. → P4.M3.T2.
//   • '../../utils/helpers.js' Cannot find module (02 L32, 06 L31): a STANDALONE-tsc ARTIFACT —
//     examples/utils/helpers.ts exists and tsx resolves it at runtime. The project tsconfig never
//     compiles examples/. NOT real breakage. IGNORE.
//   S2's success criterion is "zero OPENCODE errors remain" + "grep empty" — NOT "tsc zero-errors".
//   If you try to make tsc fully green you will (wrongly) rewrite vocabulary = P4.M3.T2 scope creep.

// CRITICAL #4 — EXAMPLES ARE NOT IN THE PROJECT BUILD. tsconfig.json include=['src/**/*'],
//   rootDir='./src'. So `npm run lint` / `npm run build` / `npm test` NEVER touch examples/. The S2
//   validation is (a) the grep gate and (b) a STANDALONE tsc delta per file (see Validation Loop). Do
//   not expect `npm test` to exercise the examples — it won't.

// CRITICAL #5 — BUILD dist/ BEFORE THE TARGETED TYPE-CHECK. The examples import from the package name
//   'groundswell', which resolves to ./dist/index.js (package.json main/types). Run `npm run build`
//   first so dist/ reflects S1's opencode deletion + the current exports. A stale dist will give
//   misleading errors.

// CRITICAL #6 — DO NOT EDIT THE MIGRATION DOC'S CODE SAMPLES BEYOND STATUS. The doc's migrate-to-
//   AnthropicProvider / configureProviders snippets are still valid (deprecated aliases). Rewriting them
//   to ClaudeCodeHarness/configureHarnesses is the docs-rewrite owned by P4.M3.T1.S1/P4.M3.T2. S2 only
//   flips the STATUS (Deprecated→Completed), the timeline tense (future→past), and the FAQ window wording.

// CRITICAL #7 — PRESERVE EXAMPLE PEDAGOGY. Each example teaches a concept (cascade, switching, sessions,
//   MCP+skills). Removing opencode should leave a coherent single-provider (anthropic) example, not a
//   half-deleted skeleton. Where a concept (e.g. "switching") no longer has a second provider to
//   demonstrate, keep the structure with a TODO(P4.M3.T2) note rather than gutting it.
```

## Implementation Blueprint

### Data models and structure

No data models. No new types, classes, or functions. This task is pure **deletion + literal scrub +
doc status flip** across 5 example files + 1 doc file. The only "shape" change is narrowing example-local
provider-id unions such as `'anthropic' | 'opencode'` → `'anthropic'` (a localized type annotation inside
the example, not a library type).

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: EDIT examples/providers/02-provider-configuration.ts — drop OpenCodeProvider, keep cascade
  - IMPORTS (L20-30 block): remove the `OpenCodeProvider,` line from the `import { ... } from 'groundswell'`.
        KEEP Agent, Prompt, configureProviders, getGlobalProviderConfig, AnthropicProvider, ProviderRegistry.
  - GLOBAL CONFIG (L66-77 configureProviders({...})): delete the `opencode: { endpoint, timeout },` block.
        Keep `anthropic: { apiKey, timeout }`.
  - REGISTER (L91): delete `registry.register(new OpenCodeProvider());`. Keep the AnthropicProvider register.
  - AGENT 2 (L107-113 "OpenCodeAgent", provider:'opencode', providerOptions endpoint): convert to a
        second anthropic agent (e.g. name:'ExplicitAnthropicAgent', provider:'anthropic') OR delete the
        agent + its console.log block (L128-130). Keep legacy `provider:` vocabulary.
  - PROMPT 2 OVERRIDE (L172-193): the prompt-level `provider:'opencode'` override → change to
        `provider:'anthropic'` (still demonstrates override-wins) OR remove the override object. Scrub the
        "Hello from OpenCode" / "opencode (prompt override)" console strings to anthropic-neutral text.
  - SUMMARY/STRINGS (L234 etc.): any console.log naming "opencode" → "anthropic".
  - ⚠ DO NOT touch the configureProviders / getGlobalProviderConfig imports or calls — pre-existing (P4.M3.T2).
  - VERIFY: `grep -ni opencode examples/providers/02-provider-configuration.ts` → empty.

Task 2: EDIT examples/providers/03-provider-switching.ts — collapse to anthropic-only + TODO
  - IMPORTS (L27): remove `OpenCodeProvider,`.
  - REGISTER (L58): delete `registry.register(new OpenCodeProvider());`.
  - COMMENTED INIT (L63-67): delete the `// await registry.initializeProvider('opencode', {...})` block +
        the "OpenCode initialization is optional" note.
  - AGENT 2 opencodeAgent (L90-102, provider:'opencode', model:'openai/gpt-4'): either delete Agent 2 or
        convert to a second anthropic agent. Add a comment: `// TODO(P4.M3.T2): rewrite as pi vs claude-code
        // harness switching (the legacy vocabulary has no second valid provider after opencode removal)`.
  - PROMPT 2 opencode override (L173-194): remove the `provider:'opencode'` override (or anthropic) and
        scrub the "Switching to OpenCode" / "Using OpenCode" / endpoint notes.
  - CAPABILITY COMPARISON (L251-258): remove the OpenCode column (`opencodeProvider` fetch + the
        `Feature | Anthropic | OpenCode` table rows) OR collapse to an anthropic-only capabilities dump.
        Add `// TODO(P4.M3.T2): compare pi vs claude-code capabilities`.
  - "WHEN TO USE" STRINGS (L281, L294): code-string examples `provider: "opencode"` → `provider: "anthropic"`.
  - HEADER COMMENT (L15): drop "OpenCode server running (optional)".
  - VERIFY: `grep -ni opencode examples/providers/03-provider-switching.ts` → empty.

Task 3: EDIT examples/providers/04-multi-provider-scenarios.ts — narrow unions, remove opencode branches
  - IMPORTS (L27): remove `OpenCodeProvider,`.
  - REGISTER (L58): delete the OpenCodeProvider register.
  - HEADER (L15) + STRATEGY COMMENT (L77) + L88 inline comment: scrub OpenCode mentions.
  - ResilientAgent (L191-192): narrow `primaryProvider/fallbackProvider: 'anthropic'|'opencode'` to
        `'anthropic'` (single-provider fallback demo) + `// TODO(P4.M3.T2): multi-model routing moves to
        // the model axis under a constant harness`.
  - A/B providers array (L300 `Array<'anthropic'|'opencode'>`): narrow to `['anthropic']` (or remove the
        loop) + TODO note. Remove the `provider === 'opencode' ? {endpoint} : undefined` branch (L313).
  - PATTERN CODE-STRINGS (L377, L387, L399, L421): `"opencode"` → `"anthropic"` (legacy vocab acceptable)
        or mark with TODO(P4.M3.T2).
  - VERIFY: `grep -ni opencode examples/providers/04-multi-provider-scenarios.ts` → empty.

Task 4: EDIT examples/providers/05-provider-sessions.ts — THE OMITTED FILE
  - IMPORTS (L20-28 block, L26): remove `OpenCodeProvider,`.
  - REGISTER (L57): delete `registry.register(new OpenCodeProvider());`.
  - SESSION-MODEL COMPARISON (L290-325): remove the "OpenCodeProvider Session Model" block + the
        `Aspect | Anthropic | OpenCode` table rows + the "OpenCode uses native SDK session support" note.
        Keep the Anthropic session-model description. Add `// TODO(P4.M3.T2): compare pi vs claude-code
        // session models`.
  - VERIFY: `grep -ni opencode examples/providers/05-provider-sessions.ts` → empty.

Task 5: EDIT examples/providers/06-provider-with-mcp-skills.ts — remove OpenCode matrix column
  - IMPORTS (L26): remove `OpenCodeProvider,`.
  - REGISTER (L58): delete the OpenCodeProvider register.
  - FEATURE COMPARISON (L459-491): remove `const opencodeProvider = registry.get('opencode')`, the
        `anthropicProvider && opencodeProvider` guard (relax to anthropicProvider only), the OpenCode column
        of the `Feature | Anthropic | OpenCode` matrix, the `prettyJson(opencodeProvider.capabilities)`
        dump, and the "OpenCodeProvider.registerMCPs() returns empty array" / "LLM-only mode" notes.
        Keep the Anthropic column. Add `// TODO(P4.M3.T2): rewrite matrix as pi vs claude-code (PRD §7.4)`.
  - SUMMARY (L507): remove the "OpenCodeProvider: LLM-only mode" line; keep the AnthropicProvider line.
  - VERIFY: `grep -ni opencode examples/providers/06-provider-with-mcp-skills.ts` → empty.

Task 6: EDIT docs/migration-opencode-removal.md — mark removal COMPLETED (narrow; no vocabulary rewrite)
  - HEADER (lines 1-4): change to:
        **Status:** ✅ COMPLETED — Removed in v2.0.0
        **Deprecated:** Version 1.5.0
        **Removed In:** Version 2.0.0
        **Last Updated:** June 2026
  - OVERVIEW: "OpenCodeProvider has been deprecated in favor of AnthropicProvider, which provides:" →
        "OpenCodeProvider **has been removed** in v2.0.0 (deprecated in v1.5.0). Migrate to
        AnthropicProvider, which provides:" (keep the bullet list as-is).
  - TIMELINE section: "July 2026: v2.0.0 released with OpenCodeProvider removal" →
        "**Completed (v2.0.0):** `OpenCodeProvider` and `@opencode-ai/sdk` removed; `ProviderId` no longer
        includes `'opencode'`."
  - FAQ "Will OpenCodeProvider continue to work in v1.x?": answer → "OpenCodeProvider has been **removed**
        in v2.0.0. It remained functional with deprecation warnings through all v1.x releases."
  - FAQ "How long do I have to migrate?": answer → "The migration window **closed with v2.0.0**. If you
        have not yet migrated, apply the steps above before upgrading from v1.x."
  - ⚠ DO NOT rewrite the Before/After code samples (AnthropicProvider, configureProviders,
        provider:'anthropic') to harness vocabulary — that is P4.M3.T1.S1/P4.M3.T2. Optionally append ONE
        forward-note: "Note: the agent harness system (pi / claude-code) supersedes the provider model —
        see the harness documentation." (only if a harness doc already exists; otherwise omit.)
  - VERIFY: `grep -ni "july 2026: v2.0.0 released\|how long do i have" docs/migration-opencode-removal.md`
        → reflects past-tense; status banner present.

Task 7: VERIFY all gates (see Validation Loop)
  - RUN the grep gate + per-file tsc delta + doc check. Confirm zero opencode errors remain and the
        pre-existing (P4.M3.T2) errors are the ONLY ones left.
```

### Implementation Patterns & Key Details

**§ The "collapse, don't gut" pattern for two-provider demos (03/04/06):**
With opencode removed, the legacy vocabulary has only ONE valid provider (`'anthropic'`; `'pi'`/`'claude-code'`
belong to the new harness vocabulary = P4.M3.T2). So a "switch between two providers" example cannot
meaningfully switch. The correct S2 edit is to keep the example's *structure* (so P4.M3.T2 has a skeleton
to repurpose) but collapse to anthropic-only with a TODO marker — NOT to delete the example, and NOT to
prematurely introduce `PiHarness`/`'claude-code'`.

```ts
// BEFORE (03-provider-switching.ts L90-102) — two providers
const opencodeAgent = new Agent({
  name: 'OpenCodeAgent',
  provider: 'opencode',
  model: 'openai/gpt-4',
  providerOptions: { endpoint: 'http://localhost:4096' },
});

// AFTER (S2) — anthropic-only, structure preserved, TODO for the real rewrite
// TODO(P4.M3.T2): rewrite as pi vs claude-code harness switching.
//   The legacy provider vocabulary has no second valid provider after opencode removal.
const secondAgent = new Agent({
  name: 'SecondaryAgent',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});
```

**§ The capability-matrix column-removal pattern (06, L459-491):**
```ts
// BEFORE
const anthropicProvider = registry.get('anthropic');
const opencodeProvider = registry.get('opencode');
if (anthropicProvider && opencodeProvider) {
  console.log('│ Feature │ Anthropic │ OpenCode │'); ...

// AFTER (S2)
// TODO(P4.M3.T2): rewrite this matrix as pi vs claude-code (PRD §7.4 capability table).
const anthropicProvider = registry.get('anthropic');
if (anthropicProvider) {
  console.log('│ Feature │ Anthropic │'); ...
```

**§ The narrow doc-status flip (migration-opencode-removal.md):**
Only status/timeline/FAQ change. The code samples stay in legacy vocabulary (still valid aliases).

### Integration Points

```yaml
DATABASE: none
CONFIG: none
ROUTES: none
PUBLIC API: none (src/ untouched; src/index.ts unchanged by S2)
TYPE SURFACE: none at the library level. Only example-local type annotations narrow
  ('anthropic'|'opencode' → 'anthropic'); these are NOT exported types.
DEPS: none (S1 owns the @opencode-ai/sdk uninstall; S2 touches no package.json)
BUILD: examples/ are excluded from tsconfig (include=['src/**/*']); no build impact.
DOCS: docs/migration-opencode-removal.md status flipped to COMPLETED.
```

## Validation Loop

### Level 1: Syntax & Style (per-file tsc delta — the real gate for opencode removal)

```bash
# CRITICAL: build dist/ FIRST so the package exports reflect S1 + current state.
npm run build >/dev/null 2>&1 && echo "dist built"

# Type-check EACH example file in isolation. After S2, the opencode lines must be GONE.
TSC_FLAGS="--noEmit --module ES2022 --moduleResolution bundler --target ES2022 --lib ES2022 --esModuleInterop --skipLibCheck --resolveJsonModule"

for f in 02-provider-configuration 03-provider-switching 04-multi-provider-scenarios 05-provider-sessions 06-provider-with-mcp-skills; do
  echo "=== $f (opencode errors; EXPECT EMPTY after fix) ==="
  npx tsc $TSC_FLAGS "examples/providers/$f.ts" 2>&1 | grep -iE "opencode|OpenCodeProvider" || echo "  (none — good)"
done

# Expected: every file prints "(none — good)". If a file still shows an OpenCodeProvider/opencode error,
# you missed an import/register/override/matrix-column. Re-edit. NOTE: OTHER (non-opencode) errors
# (configureProviders, Skill.path, AgentHooks, helpers.js artifact) MAY appear and are OUT OF SCOPE —
# do NOT fix them (see Known Gotchas #3). The gate is specifically the opencode grep above.
```

### Level 2: The Contract OUTPUT Grep Gate

```bash
# THE contract OUTPUT criterion — must print NOTHING.
echo "--- opencode literal anywhere in examples/ (EXPECT EMPTY) ---"
grep -rni opencode examples/

echo "--- OpenCodeProvider identifier in examples/ (EXPECT EMPTY) ---"
grep -rn OpenCodeProvider examples/

echo "--- @opencode-ai references in examples/ (EXPECT EMPTY) ---"
grep -rn "@opencode-ai" examples/

# Expected: all three empty. If grep lists any of the 5 files, that file still has an opencode reference
# (likely a console.log string, a comment, or a capability-table row you missed).
```

### Level 3: Library Unchanged (regression guard)

```bash
# S2 must NOT have touched src/ or package.json. Prove the library still builds + tests green
# (this also confirms S1's src/ scrub is intact if S1 has landed).
npm run lint            # tsc --noEmit on src/. EXPECT: exit 0.
npm run build           # tsc → dist/. EXPECT: exit 0.
npm test                # vitest run. EXPECT: exit 0 (examples are NOT exercised by vitest).

# Expected: all green. If any fails, you accidentally edited src/ or a test — revert.
```

### Level 4: Doc Completion Check

```bash
echo "--- migration doc status banner (EXPECT present) ---"
grep -ni "COMPLETED" docs/migration-opencode-removal.md
echo "--- timeline is past-tense (EXPECT no future 'July 2026: v2.0.0 released') ---"
grep -ni "july 2026: v2.0.0 released" docs/migration-opencode-removal.md || echo "  (good — flipped to past tense)"
echo "--- doc is still opencode-aware (it SHOULD mention opencode — it is the removal guide) ---"
grep -ci opencode docs/migration-opencode-removal.md   # non-zero is correct (it documents the removal)

# Expected: COMPLETED banner present; future-tense timeline line gone; the doc still references opencode
# (it is the migration guide — that is correct, NOT a grep-gate violation; the grep gate is examples/ only).
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 passed: per-file tsc shows ZERO opencode/OpenCodeProvider errors for all 5 examples.
- [ ] Level 2 passed: `grep -rni opencode examples/` empty; `grep -rn OpenCodeProvider examples/` empty.
- [ ] Level 3 passed: `npm run lint`, `npm run build`, `npm test` all exit 0 (src/ untouched).
- [ ] Level 4 passed: migration doc has COMPLETED banner + past-tense timeline + updated FAQ.

### Feature Validation

- [ ] All 5 provider examples (02,03,04,05,06) opencode-free — including the contract-omitted **05**.
- [ ] `OpenCodeProvider` imports + `registry.register(new OpenCodeProvider())` removed from all 5.
- [ ] `provider:'opencode'` agent fields + prompt overrides removed/converted to anthropic.
- [ ] OpenCode capability-matrix columns removed from 03, 05, 06 (anthropic column kept) + TODO(P4.M3.T2).
- [ ] Legacy vocabulary preserved (AnthropicProvider/ProviderRegistry/provider:'anthropic'/configureProviders).
- [ ] Pre-existing out-of-scope errors (configureProviders/getGlobalProviderConfig/Skill.path/AgentHooks)
      left untouched (NOT "fixed" — owned by P4.M3.T2).
- [ ] Migration doc marked COMPLETED without rewriting its code samples to harness vocabulary.

### Code Quality Validation

- [ ] Examples remain pedagogically coherent (collapse + TODO, not gutted skeletons).
- [ ] No harness vocabulary (`PiHarness`/`ClaudeCodeHarness`/`harness:`/`'pi'`/`'claude-code'`) introduced.
- [ ] No scope leak: src/, package.json, dist/, coverage/, PRD.md, tasks.json, prd_snapshot.md untouched.
- [ ] Edits preserve each example's narrative (cascade / switching / multi-provider / sessions / MCP+skills).

### Documentation & Deployment

- [ ] `docs/migration-opencode-removal.md` COMPLETED status accurate (S1 + S2 together realize v2.0.0 removal).
- [ ] No new env vars / config / dependencies.
- [ ] Commit message references P4.M1.T1.S2 + the v2.0.0 removal milestone; notes examples+doc only.

---

## Anti-Patterns to Avoid

- ❌ Don't **trust the contract's "02,03,04,06" list** — `05-provider-sessions.ts` ALSO imports
  `OpenCodeProvider` (verified). Edit all **5** or the grep gate fails.
- ❌ Don't **rewrite the examples to harness vocabulary** (`ClaudeCodeHarness`, `harness:`, `configureHarnesses`,
  pi/claude-code matrices). That is explicitly **P4.M3.T2**. S2 keeps the legacy `AnthropicProvider`/
  `ProviderRegistry`/`provider:'anthropic'` vocabulary (still-valid aliases).
- ❌ Don't **"fix" `configureProviders`/`getGlobalProviderConfig`/`Skill.path`/`AgentHooks`** type errors —
  they are pre-existing, out-of-scope (P4.M3.T2), and the helpers.js error is a standalone-tsc artifact.
  The S2 gate is "zero OPENCODE errors", not "tsc zero-errors". Chasing a green tsc = scope creep.
- ❌ Don't **edit src/index.ts to re-export `configureProviders`** — that is a public-API change owned by
  the vocabulary migration, not S2. Leave src/ untouched.
- ❌ Don't **rewrite the migration doc's code samples** to harness vocabulary — S2 only flips STATUS
  (Deprecated→Completed) + timeline tense + FAQ wording. The migrate-to-AnthropicProvider steps stay.
- ❌ Don't **gut the two-provider examples** (03/04/06). Collapse to anthropic-only + a `// TODO(P4.M3.T2)`
  note so P4.M3.T2 has a skeleton to repurpose. Deleting them loses the pedagogy.
- ❌ Don't **run the targeted tsc without `npm run build` first** — the examples import from the package
  name (`./dist/index.js`); a stale dist gives misleading errors.
- ❌ Don't **expect `npm test` to cover the examples** — `tsconfig.json` excludes examples/ and vitest only
  runs `src/__tests__`. The gate is the grep + the standalone tsc delta.
- ❌ Don't **treat opencode mentions in `docs/migration-opencode-removal.md` as a grep violation** — that
  doc DOCUMENTS the removal, so it legitimately mentions opencode. The grep gate is `examples/` only.

---

## Confidence Score

**9 / 10** for one-pass implementation success.

**Rationale:** The task is mechanically simple — delete `OpenCodeProvider` imports/registrations/overrides,
scrub `opencode` literals, and flip one doc to COMPLETED. The verified 5-file inventory (correcting the
contract's omission of 05), the line-anchored per-file edit map, and the explicit error-classification
table remove the usual guesswork. The two judgment traps — (a) 05 is in-scope, (b) pre-existing
vocabulary/Skill/AgentHooks errors must be LEFT alone (not "fixed") — are documented with exact evidence
and a verified validation command. The residual 1-point risk is an implementer over-reaching into
P4.M3.T2 vocabulary work while chasing a fully-green tsc; the Anti-Patterns + the scoped "zero opencode
errors" gate (not "zero errors") mitigate this. No external/library research was needed — this is a
self-contained examples/docs operation fully specified by the codebase + the S1 PRP contract. The parallel
item S1 touches only `src/` (never `examples/`/`docs/`), so there is zero merge conflict.
