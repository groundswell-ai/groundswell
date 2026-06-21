# PRP — P4.M3.T2.S1: Rewrite provider examples as harness examples + update scripts

**PRD reference:** §7 (Agent Harness System) — §7.1, §7.3, §7.4, §7.5, §7.6, §7.7, §7.8, §7.13.
**Plan:** `plan/004_9a50e71828f4/` — S1 of P4.M3.T2 ("Migrate examples to harness vocabulary").
**Consumes:** the **finalized** public harness API (P3.M3.T1.S1 — `src/index.ts`) + `docs/harnesses.md`
(produced in parallel by **P4.M3.T1.S1**; treat it as the concept reference the examples point at).
**Produces:** `examples/harnesses/` (6 rewritten `.ts` examples + README) replacing `examples/providers/`,
plus EDITS to `examples/index.ts`, `examples/README.md`, `package.json` scripts. **Scope tag:**
(1) **MOVE+REWRITE** 6 example files; (2) **CREATE** 1 README; (3) **EDIT** 3 aggregator files
(`examples/index.ts`, `examples/README.md`, `package.json`). **Mock:** none (examples). **Verify:** every
example loads & runs under `tsx`. **DO NOT** touch `src/`, `docs/`, root `README.md` (owned by
P4.M3.T1.S1), `examples/examples/*`, `examples/__tests__/*`, `PRD.md`, `tasks.json`, `prd_snapshot.md`.

> **READ "§THE PUBLIC-vs-INTERNAL API BOUNDARY" BEFORE WRITING A SINGLE IMPORT.** The examples
> `import { … } from 'groundswell'`, which resolves to `dist/index.js`. `configureProviders`,
> `getGlobalProviderConfig`, `getGlobalHarnessConfig`, `resolveHarnessConfig`, and
> `registerDefaultHarnesses` are **NOT** in `src/index.ts` → they will throw
> *"does not provide an export named 'X'"* under `tsx`. The OLD `02-provider-configuration.ts`
> imported `configureProviders` + `getGlobalProviderConfig` — that latent break is exactly what this
> task fixes. Use ONLY `configureHarnesses`; read resolved config back via `agent.config.harness`.

---

## Goal

**Feature Goal:** Ship a runnable, v1.2-faithful `examples/harnesses/` suite (6 files) that demonstrates
the **Harness ⊥ ModelProvider** split end-to-end — registry registration of both `PiHarness` and
`ClaudeCodeHarness`, the dual configuration cascade, per-call harness switching, the model axis
(`anthropic` vs `openai` via `pi`), sessions, and the `pi` vs `claude-code` capability matrix — so a
developer can copy any example and have a working harness setup on the first run with `tsx`.

**Deliverable:**
1. **MOVE** `examples/providers/` → `examples/harnesses/` and **REWRITE** all 6 example files to the new
   filenames/API in §"Implementation Tasks" (one file per PRD §7 concept), using ONLY public
   `src/index.ts` symbols and the verified API facts in `research/findings.md`.
2. **CREATE** `examples/harnesses/README.md` mirroring the old providers README structure (quick-start,
   per-example blurbs, structure tree, key concepts, troubleshooting) in harness vocabulary.
3. **EDIT** `package.json` — replace the 6 `start:provider-*` scripts with `start:harness-*`.
4. **EDIT** `examples/index.ts` — import paths, function names, MENU labels, `runAllExamples` list,
   summary block (provider → harness).
5. **EDIT** `examples/README.md` — "Provider Examples" section (lines ~155–253) → "Harness Examples".

**Success Definition:**
1. All 6 new files exist under `examples/harnesses/`; `examples/providers/` is GONE (`git status` shows
   the rename + no leftover `examples/providers/`).
2. The Level-1 symbol cross-check passes: every `from 'groundswell'` import in the 6 files resolves
   against `src/index.ts`; NONE of `configureProviders`/`getGlobalProviderConfig`/
   `getGlobalHarnessConfig`/`resolveHarnessConfig`/`registerDefaultHarnesses` appears as an import.
3. Each example **runs under `tsx`** (after `npm run build`): `npx tsx examples/harnesses/0X-*.ts`
   reaches execution (prints its banner/sections) without a module-resolution error. With
   `ANTHROPIC_API_KEY` set it runs fully; without it, it exits cleanly at the env gate (which itself
   proves imports resolved). See §Validation Loop for the deterministic interpretation.
4. The 6 `npm run start:harness-*` scripts resolve to existing files; `npm run start:all` no longer
   references deleted provider paths; `npm run lint` + `npm test` stay green (no `src/` change →
   baseline preserved; the ink tests in `examples/__tests__/` are unaffected).

## Why

- **Closes the runnable v1.2 vocabulary gap (PRD §7).** P1–P3 shipped the type system, both adapters,
  the registry, the cascade, and the public exports; P4.M3.T1.S1 ships the concept doc. But the
  **runnable** surface still lives in pre-§7 `Provider*` vocabulary under `examples/providers/` and is
  actively broken (ex 02 imports internal symbols; ex 03/04/06 carry `TODO(P4.M3.T2)` comments noting
  they have no second valid provider after the OpenCode removal). These examples are the copy-paste
  onboarding path — they must demonstrate the real two-harness, two-axis system.
- **Demonstrates the headline §7 concepts that prose cannot.** The dual cascade (§7.7), per-call
  harness override (§7.13), the model axis independence (§7.8), and the `pi`-vs-`claude-code` parity
  matrix (§7.4) are best taught by executable examples. Example 04 specifically shows that `openai/*`
  requires the `pi` harness (claude-code is Anthropic-only) — the single most-violated §7.8 assumption.
- **Foundation for the v1.2 acceptance (PRD §16).** PRD §16 acceptance requires "implementation-complete";
  the harness examples are the user-visible proof the system is wired and parity holds.
- **Low blast radius.** Pure examples + scripts + 2 aggregator markdown files. The only real risks are
  (a) importing an internal symbol (caught by the cross-check gate) and (b) a stale `dist/` making a
  public symbol unresolvable (caught by the `npm run build` + tsx gate). Both are deterministic.

## What

User-visible behaviour: developers get 6 runnable harness examples under `examples/harnesses/`,
discoverable via `examples/harnesses/README.md`, invokable via `npm run start:harness-*`, and aggregated
by `npm run start:all` (examples/index.ts) + the top-level `examples/README.md`. No runtime/`src/` change.

### Success Criteria

- [ ] `examples/harnesses/{01..06}-*.ts` created with the exact filenames in Task 1; `examples/providers/`
      deleted (no remnant files or dangling imports anywhere in the repo).
- [ ] Every example imports ONLY public `src/index.ts` symbols (Level-1 cross-check = "all imports resolve").
- [ ] None of the 5 internal symbols is imported anywhere in `examples/harnesses/` (Level-1c leak check).
- [ ] `npx tsx examples/harnesses/0X-*.ts` loads each file without a module-resolution error (reaches the
      banner / env gate) for all 6 files.
- [ ] `package.json` has exactly the 6 `start:harness-*` scripts and **zero** `start:provider-*` scripts.
- [ ] `examples/index.ts` imports/labels/lists the 6 harness examples (no `./providers/` references);
      `npm run start:all` runs without a "Cannot find module './providers/…'" error.
- [ ] `examples/README.md` "Harness Examples" section present; no `start:provider-*` / `examples/providers`
      references remain repo-wide (`grep -rn "start:provider\|examples/providers"` returns empty).
- [ ] Example 06 contains the `pi` vs `claude-code` capability matrix (§7.4) and the "LLM providers: any
      vs Anthropic-only" differentiating row.
- [ ] `npm run lint` exit 0 + `npm test` green (baseline preserved — no `src/` change).

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes.** This PRP supplies: the exact 6-file rename map (old path/fn → new path/fn), the
verified public-API set (the #1 footgun: which symbols resolve from `'groundswell'`), the verified class
facts (`ClaudeCodeHarness.id="claude-code"` has `getSession`; `PiHarness.id="pi"` does NOT — critical
for example 05), the per-example concept-to-API mapping table, the verified cascade/model semantics to
reproduce, the build/dist resolution quirk (`npm run build` is gate 0), and deterministic validation
commands (symbol cross-check + tsx load + grep gates).

### Documentation & References

```yaml
# MUST READ — include these in your context window
- file: PRD.md  (§7 — identical to plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: "Authoritative concept source for each example: §7.1 (two harnesses + rationale), §7.3 (Harness
        interface / execute shape), §7.4 (capability table — the matrix for ex 06), §7.5 (HarnessOptions
        incl. sessionId), §7.6 (configureHarnesses), §7.7 (dual cascade), §7.8 (model formats + critical
        rule + claude-code Anthropic-only constraint — the core of ex 02/04), §7.13 (per-call override +
        model-only override — ex 03)."
  section: "§7.1, §7.3, §7.4, §7.5, §7.6, §7.7, §7.8, §7.13"

- file: src/index.ts
  why: "The GATEKEEPER. Every `from 'groundswell'` import in the 6 examples MUST appear here. Confirms
        what IS public (ClaudeCodeHarness, PiHarness, HarnessRegistry, configureHarnesses, parseModelSpec,
        formatModelForProvider, Agent, Prompt, MCPHandler, all Harness*/AgentConfig/PromptOverrides types)
        and what is NOT (configureProviders, getGlobalProviderConfig, getGlobalHarnessConfig,
        resolveHarnessConfig, registerDefaultHarnesses)."
  pattern: "grep -E '^export' src/index.ts | grep -iE 'harness|pi|claude|configureHarness|parseModel'"

- file: examples/providers/01-basic-provider-usage.ts   (and 02..06 + README.md)
  why: "The TEMPLATE for voice, structure (printHeader/printSection parts, env gate, try/catch 'Note:'
        resilient demo style, summary block), and the import of printHeader/printSection/prettyJson from
        '../../utils/helpers.js'. Rewrite each 1:1 into harness vocabulary using the map in findings §6."
  gotcha: "These files currently carry latent bugs (ex 02 imports internal configureProviders/
           getGlobalProviderConfig; ex 03/04/06 have TODO(P4.M3.T2) comments) — do NOT copy those parts."

- file: examples/index.ts
  why: "The aggregator that `npm run start:all` runs. Imports the 6 examples by OLD function names + OLD
        paths (./providers/…js), lists them in MENU + runAllExamples as '12–17 Provider Examples'. MUST
        update: paths → ./harnesses/…js, function names → run*Harness*, labels → 'Harness Examples'."

- file: examples/README.md  (lines ~155–253)
  why: "The 'Provider Examples' section: quick-start start:provider-*, per-example blurbs, structure tree.
        Rewrite wholesale to 'Harness Examples' with start:harness-* and the new filenames."

- file: src/harnesses/harness-registry.ts
  why: "Verified method surface: getInstance(), register(h) [throws on dup], get(id) [returns |undefined,
        never throws], has(id), initializeProvider(id, options?). The id arg is ProviderId =
        HarnessId|'anthropic', so get('pi')/get('claude-code')/initializeProvider('claude-code',{apiKey})
        all typecheck. Registry is keyed by harness .id ('pi'/'claude-code')."

- file: src/harnesses/claude-code-harness.ts  (id line 109; caps 124-139; registerMCPs 907; loadSkills 958; getSession 1269)
  why: "Verified: id='claude-code'; capabilities ALL true BUT Anthropic-only (normalizeModel throws on
        non-anthropic); HAS getSession(sessionId): Promise<SessionState|undefined>. The session model for
        ex 05."

- file: src/harnesses/pi-harness.ts  (id line 80; caps 83-90; registerMCPs 642; loadSkills 687)
  why: "Verified: id='pi'; capabilities ALL true + runs ANY provider (the §7.4 parity proof); registerMCPs
        via MCPHandler.toPiCustomTools(); loadSkills NATIVE agentskills.io (loadSkillsFromDir).
        CRITICAL: NO public getSession — PiHarness creates a fresh AgentSession per execute() (comments
        lines 241, 361). Ex 05 must document this, not fabricate pi.getSession()."

- file: src/types/agent.ts  (AgentConfig.harness line 98, harnessOptions 101, provider/providerOptions @deprecated 106/128; PromptOverrides.harness 195, harnessOptions 198)
  why: "The v1.2 fields to USE: AgentConfig.harness / harnessOptions; PromptOverrides.harness /
        harnessOptions. Do NOT feature the deprecated provider/providerOptions. agent.config.harness is
        readable (use it to show resolved config in ex 02 instead of an internal getter)."

- file: src/utils/harness-config.ts  +  src/utils/model-spec.ts
  why: "Verified semantics for ex 02/04: configureHarnesses validates defaultHarness ∈ {pi,claude-code}
        (throws on 'anthropic'); does NOT validate defaultModelProvider (open set). Cascade =
        prompt ?? agent ?? global; options = {...global,...agent,...prompt}. parseModelSpec rejects
        3+-segment strings ('Harness must not appear in model string'); formatModelForProvider throws on
        cross-provider. Copy verbatim — do not paraphrase."

- file: package.json  (scripts block)
  why: "The 6 start:provider-* scripts to replace with start:harness-*. Also: main/exports map '.' →
        dist/index.js → examples resolve 'groundswell' to dist (so npm run build is gate 0)."

- docfile: plan/004_9a50e71828f4/P4M3T2S1/research/findings.md
  why: "Single source of truth: the per-example rewrite map (§6), the verified public-API boundary (§2),
        verified class facts (§3), cascade/model semantics (§4), build/dist quirks (§5), scope (§7)."
- docfile: docs/harnesses.md   (produced by P4.M3.T1.S1 — read if present; otherwise rely on PRD §7)
  why: "The concept doc the examples should LINK to in prose ('See docs/harnesses.md'). Treat as the
        narrative reference; the examples are its runnable counterparts. Do NOT create/edit it."
```

### Current Codebase tree (relevant slice)

```bash
examples/
├── index.ts                       # ⬅ EDIT (imports/MENU/runAllExamples: providers→harnesses)
├── README.md                      # ⬅ EDIT ("Provider Examples" section → "Harness Examples")
├── utils/helpers.ts               # stable (printHeader/printSection/prettyJson) — import path unchanged
├── examples/  (01..12 workflow + ink)   # UNTOUCHED
├── __tests__/  (3 ink .tsx tests)       # UNTOUCHED (vitest-included but import examples/components, not providers)
└── providers/                     # ⬅ DELETE (after moving/rewriting)
    ├── 01-basic-provider-usage.ts … 06-provider-with-mcp-skills.ts
    └── README.md
package.json                       # ⬅ EDIT (6 start:provider-* → start:harness-*)
```

### Desired Codebase tree with files added

```bash
examples/
├── index.ts                       # EDITED — imports ./harnesses/*, "Harness Examples" labels
├── README.md                      # EDITED — "Harness Examples" section
├── utils/helpers.ts               # unchanged
├── harnesses/                     # NEW (replaces providers/)
│   ├── 01-basic-harness-usage.ts
│   ├── 02-harness-configuration.ts
│   ├── 03-harness-switching.ts
│   ├── 04-multi-provider-scenarios.ts
│   ├── 05-harness-sessions.ts
│   ├── 06-harness-with-mcp-skills.ts
│   └── README.md
└── (examples/, __tests__/ unchanged)
package.json                       # EDITED — start:harness-* scripts (no start:provider-*)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — THE PUBLIC-vs-INTERNAL API BOUNDARY. Examples `import { … } from 'groundswell'` →
//   dist/index.js (built from src/index.ts). package.json exports ONLY ".". Therefore:
//     • ClaudeCodeHarness, PiHarness, HarnessRegistry, configureHarnesses, parseModelSpec,
//       formatModelForProvider, Agent, Prompt, MCPHandler, + all Harness*/AgentConfig/PromptOverrides
//       TYPES → importable. ✅
//     • configureProviders, getGlobalProviderConfig → NOT in src/index.ts (grep confirms only
//       configureHarnesses at line 133). ❌ The OLD ex 02 imported these → broken. Fix by using
//       configureHarnesses and reading agent.config.harness.
//     • getGlobalHarnessConfig, resolveHarnessConfig (utils/harness-config.ts) → NOT re-exported. ❌
//     • registerDefaultHarnesses (src/harnesses/index.ts) → no './harnesses' subpath export. ❌ Use
//       explicit HarnessRegistry.getInstance().register(new PiHarness()) + new ClaudeCodeHarness().
//   ENFORCEMENT: the Level-1 symbol cross-check greps the 6 files for any import name NOT in
//   src/index.ts AND for the 5 internal names; fails the gate if found. (findings §2.)

// CRITICAL #2 — dist/ MUST BE REBUILT BEFORE RUNNING. `from 'groundswell'` resolves to dist/index.js.
//   A stale dist (pre-harness) lacks PiHarness/ClaudeCodeHarness/configureHarnesses → tsx throws
//   "does not provide an export named 'X'". Gate 0 = `npm run build`. (findings §5.)

// CRITICAL #3 — PiHarness HAS NO getSession. ClaudeCodeHarness does (line 1269). PiHarness creates a
//   fresh AgentSession per execute() (comments lines 241, 361). Ex 05 (sessions) MUST:
//   (a) demonstrate sessionId create/continue + getSession() on the CLAUDE-CODE harness; (b) document
//   the pi difference honestly (Pi SessionManager fork/switch/clone) WITHOUT fabricating a
//   pi.getSession() call. Do NOT write `piHarness.getSession(...)` — it won't resolve.

// CRITICAL #4 — claude-code is ANTHROPIC-ONLY (§7.8). `new ClaudeCodeHarness()` + model
//   'openai/gpt-4o' is a config error (normalizeModel throws). Non-Anthropic providers require the PI
//   harness. Ex 04's whole point: show anthropic vs openai on the MODEL axis via the pi harness, with
//   the harness CONSTANT. Do NOT attempt openai/* on claude-code even in a "fallback" — surface the
//   constraint as a teaching note, not a runtime crash.

// CRITICAL #5 — THE MODEL STRING IS NEVER HARNESS-QUALIFIED (§7.8). 'pi/anthropic/x' and 'cc/…' are
//   INVALID (parseModelSpec throws). Valid: 'anthropic/claude-sonnet-4-20250514' (qualified) or
//   'claude-sonnet-4-20250514' (plain → defaultModelProvider, default 'anthropic'). State this in the
//   env-gate banner of every example that sets a model, and especially in ex 02/03/04.

// CRITICAL #6 — EXAMPLES ARE NOT TYPECHECKED BY `npm run lint`. tsconfig.json include=["src/**/*"],
//   exclude examples. So a type error in an example will NOT fail the build. The real gates are:
//   (a) the symbol cross-check (Level 1), (b) `npx tsx …` load (Level 3). Write examples as if tsc WERE
//   watching (strict types, no `any` soup) — but do not rely on lint to catch mistakes.

// CRITICAL #7 — KEEP THE RESILIENT DEMO STYLE. Existing examples wrap live LLM calls in try/catch that
//   prints "Note: Would execute with ANTHROPIC_API_KEY" on failure, so an example DEMONSTRATES even
//   without every key set. Keep this for the openai/pi-specific calls in ex 04/05/06. But keep the
//   module-top `if (!process.env.ANTHROPIC_API_KEY) process.exit(1)` env gate (it's the common path and
//   its presence proves imports resolved when tsx reaches it).

// CRITICAL #8 — DO NOT REINTRODUCE DEPRECATED VOCABULARY. The examples are the v1.2 REFERENCE surface.
//   Use Harness* names exclusively (ClaudeCodeHarness, HarnessRegistry, configureHarnesses, harness,
//   harnessOptions). Do NOT import AnthropicProvider/ProviderRegistry/configureProviders (they're
//   deprecated aliases; featuring them undermines the migration). The ONE exception: you may MENTION
//   the deprecated aliases in a "migration note" comment/line pointing to docs/migration-provider-to-
//   harness.md — but never as the active API.

// CRITICAL #9 — DO NOT TOUCH docs/ OR ROOT README.md. Owned by P4.M3.T1.S1 (running in parallel). It
//   creates docs/harnesses.md + migration guide + edits docs/providers.md (banner) + root README
//   (## Documentation list). Your examples may LINK to docs/harnesses.md in prose but must not create/
//   edit any docs/ file or the root README. (findings §7.)
```

## Implementation Blueprint

### Data models and structure

No data models. This task produces **runnable TypeScript example scripts** + markdown. Every example
follows the existing skeleton (findings §1, modeled on `examples/providers/01-basic-provider-usage.ts`):
file-header JSDoc (Purpose / What you'll learn / Prerequisites / Run) → imports → env gate → exported
`async function run*Example(): Promise<void>` with `printHeader` + numbered `printSection` parts + a
Summary → `if (import.meta.url === …) run*Example().catch(console.error)` footer. The helper import
`import { printHeader, printSection, prettyJson } from '../../utils/helpers.js'` is **unchanged** by the
rename (both `providers/` and `harnesses/` are one dir deep under `examples/`).

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: BUILD dist (gate 0 — do this FIRST so 'groundswell' resolves the harness symbols)
  - RUN: `npm run build`   # tsc → dist/. Without this, every example's `from 'groundswell'` import
        of PiHarness/ClaudeCodeHarness/configureHarnesses throws "does not provide an export".
  - VERIFY: `node -e "import('groundswell').then(m=>console.log(Object.keys(m).filter(k=>/Harness|Pi|configureHarness|parseModel/.test(k))))"`
        prints the harness exports (run from repo root so dist resolves).

Task 1: CREATE examples/harnesses/ and MOVE+REWRITE the 6 files (delete examples/providers/)
  - APPROACH: create examples/harnesses/ fresh, write the 6 files + README (Task 2), then
        `rm -rf examples/providers/`. (Content is substantially rewritten, so per-file `git mv` adds
        little; a clean create+delete is simpler. If you prefer history, `git mv` each file to its new
        name first, then rewrite in place — equivalent result.)
  - COMMON IMPORT BLOCK for every file (adapt the symbol set per example; NEVER add internal names):
        import { Agent, Prompt, /* + HarnessRegistry, ClaudeCodeHarness, PiHarness, configureHarnesses,
          parseModelSpec, type MCPServer, type HarnessId … as needed */ } from 'groundswell';
        import { z } from 'zod';
        import { printHeader, printSection, prettyJson } from '../../utils/helpers.js';
  - COMMON ENV GATE (keep verbatim): if (!process.env.ANTHROPIC_API_KEY) { console.error('Error:
        ANTHROPIC_API_KEY environment variable not set'); console.error('Set it with: export
        ANTHROPIC_API_KEY=sk-...'); process.exit(1); }

  FILE 1 — examples/harnesses/01-basic-harness-usage.ts   (fn: runBasicHarnessUsageExample)
    - CONCEPT: minimal harness setup (PRD §7.1, §7.3, §7.6).
    - Part 1 Registration: HarnessRegistry.getInstance(); registry.register(new ClaudeCodeHarness());
      registry.register(new PiHarness()); print each id ('claude-code','pi') + capabilities.
    - Part 2 Initialization: await registry.initializeProvider('claude-code', { apiKey:
      process.env.ANTHROPIC_API_KEY }); note default harness is 'pi'.
    - Part 3 Agent: new Agent({ name:'BasicAgent', harness:'claude-code',
      model:'anthropic/claude-sonnet-4-20250514' }); print agent.config.harness.
    - Part 4 Execute: new Prompt({ user:'What is 2 + 2?…', responseFormat: z.object({result:z.number()}) });
      const response = await agent.prompt(prompt); print response. Wrap in try/catch 'Note:' per Critical #7.
    - MUST STATE (Summary): the model string is NEVER harness-qualified (§7.8); pi is the default.

  FILE 2 — examples/harnesses/02-harness-configuration.ts   (fn: runHarnessConfigurationExample)
    - CONCEPT: configureHarnesses + the DUAL cascade (PRD §7.6, §7.7).
    - Setup: reset registry (keep the existing `_resetForTesting` ts-expect-error block from the old ex 02
      — it still works on HarnessRegistry since ProviderRegistry is an alias of the same singleton);
      register both harnesses; initialize('claude-code').
    - Part 1 Global: configureHarnesses({ defaultHarness:'pi', defaultModelProvider:'anthropic',
      harnessDefaults:{ 'claude-code':{ apiKey: process.env.ANTHROPIC_API_KEY, timeout:30000 } } }).
      DO NOT import getGlobalHarnessConfig — instead print the values you just set, and note the two
      independent axes (harness axis + model/provider axis).
    - Part 2 Agent-level: new Agent({ name:'ExplicitCcAgent', harness:'claude-code', harnessOptions:{
      timeout:15000 } }); new Agent({ name:'DefaultAgent' }) (inherits global defaultHarness 'pi').
    - Part 3 Prompt-level: agent.prompt(prompt, { harnessOptions:{ timeout:5000 } }) — options merge.
      Also show a harness SWITCH at prompt level: agent.prompt(p, { harness:'claude-code' }).
    - Part 4 Cascade explainer: print the verified algorithm (harness = prompt ?? agent ?? global;
      options = {...global,...agent,...prompt}) + a worked example (global 'pi', agent 'claude-code',
      prompt omitted → 'claude-code'). STATE: model cascade is SEPARATE — overriding model never changes
      the harness.
    - GOTCHA: do NOT call configureProviders or read getGlobalHarnessConfig (Critical #1).

  FILE 3 — examples/harnesses/03-harness-switching.ts   (fn: runHarnessSwitchingExample)
    - CONCEPT: per-call harness override + model-only override (PRD §7.13).
    - Setup: register + initialize BOTH harnesses ('pi','claude-code').
    - Part 1 Agent-level: new Agent({ harness:'pi', model:'anthropic/claude-sonnet-4-20250514' }) vs
      new Agent({ harness:'claude-code', model:'anthropic/claude-sonnet-4-20250514' }).
    - Part 2 Prompt-level (§7.13 "switch harness for one call"): const response = await
      agent.prompt(prompt, { harness:'claude-code' }); show the default restored on the next call.
    - Part 3 Model-only override (§7.13 "override model only, harness unchanged"): on a PI agent,
      agent.prompt(p, { model:'openai/gpt-4o' }) — runs on the pi harness, model axis only. STATE that
      this same call on a claude-code agent would be a config error (Anthropic-only).
    - Part 4 Verify usage: print agent.config.harness; print harness.capabilities; show the
      capability-difference row (LLM providers: any vs Anthropic-only). Wrap live calls in try/catch.

  FILE 4 — examples/harnesses/04-multi-provider-scenarios.ts   (fn: runMultiProviderScenariosExample)
    - CONCEPT: the MODEL axis — anthropic vs openai via the pi harness (PRD §7.8, §7.1). Harness CONSTANT.
    - Setup: register + initialize the PI harness (it is the one that can run ANY provider). State up
      front: claude-code is Anthropic-only, so multi-PROVIDER (non-anthropic) scenarios require pi.
    - Part 1 Cost optimization (model axis): two agents, both harness:'pi' — simpleAgent model
      'anthropic/claude-haiku-4-20250514', complexAgent model 'anthropic/claude-sonnet-4-20250514'.
      Route by complexity.
    - Part 2 Multi-provider (anthropic vs openai): on a SINGLE pi agent, run the same prompt with
      model:'anthropic/claude-sonnet-4-20250514' then model:'openai/gpt-4o' (wrap the openai call in
      try/catch 'Note: requires OPENAI_API_KEY + a configured pi provider' — it may fail without a key,
      which is fine per Critical #7).
    - Part 3 Fallback (model axis): try primary model, catch, fall back to a cheaper model (both anthropic
      via pi, OR anthropic→openai via pi).
    - Part 4 A/B testing: loop over ['anthropic/claude-sonnet-4-20250514','openai/gpt-4o'], time each.
    - HEADLINE NOTE: the harness never changes here — provider/model selection is an independent axis
      (§7.8). Reuse the old CostOptimizer/ResilientAgent/ProviderABTest class skeletons but rewire to
      model axis + harness:'pi'.

  FILE 5 — examples/harnesses/05-harness-sessions.ts   (fn: runHarnessSessionsExample)
    - CONCEPT: sessionId create/continue + getSession (PRD §7.5). Use the CLAUDE-CODE harness (it has
      getSession). DOCUMENT the pi difference (Critical #3).
    - Setup: register + initialize('claude-code').
    - Part 1 Create session: const sessionId = `session-${Date.now()}`; agent.prompt(p, {
      harnessOptions:{ sessionId } }).
    - Part 2 Continue: reuse the same sessionId across 2–3 turns; show context preserved.
    - Part 3 Retrieve state: const cc = registry.get('claude-code'); if (cc) { const session =
      await cc.getSession(sessionId); print prettyJson(session); } — wrap in try/catch; if undefined,
      print the "session not found (expected without a live key)" note.
    - Part 4 Session model differences: print a 2-row table — claude-code (abstraction layered on
      stateless SDK; getSession() available; in-memory/file SessionStore) vs pi (fresh AgentSession per
      execute(); sessions via Pi SessionManager fork/switch/clone; no getSession()). DO NOT call
      piHarness.getSession(). State: session IDs are harness-specific.

  FILE 6 — examples/harnesses/06-harness-with-mcp-skills.ts   (fn: runHarnessWithMcpSkillsExample)
    - CONCEPT: registerMCPs + loadSkills + hooks + the pi-vs-cc CAPABILITY MATRIX (PRD §7.4, §7.12).
    - Setup: register + initialize BOTH harnesses.
    - Part 1 MCP: const cc = registry.get('claude-code'); const tools = await cc.registerMCPs([
      { name:'demo-server', transport:'inprocess', tools:[{name:'calculate', …input_schema…}] } ]);
      print tools (namespaced serverName__toolName). Repeat on const pi = registry.get('pi'); — show
      BOTH harnesses accept the same MCPServer (parity via MCPHandler, §7.4 footnote).
    - Part 2 MCP tool use: new Agent({ harness:'claude-code', model:'anthropic/claude-sonnet-4-20250514',
      mcps:[<same server>] }); agent.prompt(p) — wrap in try/catch 'Note:' (live tool call).
    - Part 3 Skills: harness.loadSkills([{ name:'code-review', path:'/abs/path/to/skill' }]) on BOTH
      harnesses. NOTE: pi loads via native agentskills.io (loadSkillsFromDir); cc injects via system
      prompt. (If no real skill dir exists, wrap in try/catch and print the format note — do not invent
      a path that must exist; the Skill type is {name, path, ...}.)
    - Part 4 Hooks: show the HarnessHookEvents shape (onToolStart/onToolEnd/onSessionStart/onSessionEnd/
      onStream) and pass via agent.prompt(p, { hooks:{…} }) — preserve the old ex-06 hook demo pattern.
    - Part 5 CAPABILITY MATRIX (the headline): print a 2-column table (pi | claude-code) with rows
      MCP/Skills/LSP/Streaming/Sessions/ExtendedThinking = ✓ for BOTH, and the differentiating row
      "LLM providers | any | Anthropic only". Read live values from
      registry.get('pi').capabilities and registry.get('claude-code').capabilities and prettyJson them.

Task 2: CREATE examples/harnesses/README.md
  - MIRROR the old examples/providers/README.md structure (findings §1): H1 "Harness Examples" + tagline;
    Quick Start (npm install / npm run build / export ANTHROPIC_API_KEY / the 6 `npm run start:harness-*`);
    Prerequisites; Examples Overview (one ### blurb per file with Run command + What you'll learn,
    mapped to the 6 new files); Project Structure tree; Key Concepts (Harness Lifecycle register→init→use;
    Dual Configuration Cascade; Capability Comparison table pi vs claude-code); Usage Patterns (basic
    harness setup; harness switching; session mgmt; MCP integration — all in harness vocabulary);
    Troubleshooting (harness not registered; SDK not initialized; env var missing; INVALID
    harness-qualified model string); Best Practices; See Also (→ docs/harnesses.md, the main examples
    README). Voice: terse, code-first, tables — match the old README.

Task 3: EDIT package.json — scripts
  - REPLACE the 6 `start:provider-*` lines with:
      "start:harness-basic":      "tsx examples/harnesses/01-basic-harness-usage.ts",
      "start:harness-config":     "tsx examples/harnesses/02-harness-configuration.ts",
      "start:harness-switching":  "tsx examples/harnesses/03-harness-switching.ts",
      "start:harness-scenarios":  "tsx examples/harnesses/04-multi-provider-scenarios.ts",
      "start:harness-sessions":   "tsx examples/harnesses/05-harness-sessions.ts",
      "start:harness-features":   "tsx examples/harnesses/06-harness-with-mcp-skills.ts",
  - PRESERVE every other script (start:all, start:basic…start:introspection, start:ink, generate:llms,
    build, test, lint, etc.). DO NOT touch dependencies/exports/main.

Task 4: EDIT examples/index.ts — aggregator
  - IMPORTS: replace the 6 `from './providers/0X-*.js'` lines with `from './harnesses/0X-*.js'` and the
    new function names (runBasicHarnessUsageExample, runHarnessConfigurationExample,
    runHarnessSwitchingExample, runMultiProviderScenariosExample, runHarnessSessionsExample,
    runHarnessWithMcpSkillsExample).
  - MENU: relabel "Provider Examples" → "Harness Examples"; update items 12–17 titles
    (12 Basic Harness Usage / 13 Harness Configuration / 14 Harness Switching / 15 Multi-Provider
    Scenarios / 16 Harness Sessions / 17 Harness Features).
  - runAllExamples: update the 6 entries' `name` + `fn`; keep the workflow entries 1–11 intact.
  - SUMMARY block: rewrite the "Provider Features" bullet list → "Harness Features" bullets (harness
    registration; configureHarnesses dual cascade; per-call harness switching; multi-PROVIDER via the
    model axis; session management; MCP/skills/hooks; capability matrix pi vs claude-code).
  - HEADER comment: the "Run individual examples" block can add the start:harness-* commands (optional).

Task 5: EDIT examples/README.md — top-level examples README
  - REPLACE the "Provider Examples" section (lines ~155–253): heading → "Harness Examples"; Quick Start
    run commands → start:harness-*; the 6 ### per-example blurbs → new filenames + harness concepts
    (§7 mapping); the structure tree `providers/` block → `harnesses/` with the 6 new filenames; the
    "See [providers/README.md]" link → "See [harnesses/README.md]".
  - PRESERVE the Workflow Examples section and everything else.

Task 6: VERIFY all gates (see Validation Loop)
  - Run Level 0 (build) → Level 1 (symbol cross-check + leak check) → Level 2 (file-presence + content
    greps) → Level 3 (tsx load per file + start:harness-* scripts + start:all) → Level 4 (lint + test
    baseline). Fix example errors only — never edit src/ to satisfy a gate.
```

### Implementation Patterns & Key Details

**§ The canonical harness setup block (verified — the spine of examples 01/02/03/05/06):**
```ts
import { Agent, Prompt, HarnessRegistry, ClaudeCodeHarness, PiHarness } from 'groundswell';
import { z } from 'zod';
import { printHeader, printSection } from '../../utils/helpers.js';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable not set');
  console.error('Set it with: export ANTHROPIC_API_KEY=sk-...');
  process.exit(1);
}

const registry = HarnessRegistry.getInstance();
registry.register(new ClaudeCodeHarness());   // id 'claude-code' — Anthropic-only
registry.register(new PiHarness());            // id 'pi'        — any provider (the default)
await registry.initializeProvider('claude-code', { apiKey: process.env.ANTHROPIC_API_KEY });

const agent = new Agent({
  name: 'DemoAgent',
  harness: 'claude-code',                                   // PRD §7.9 — NOT 'provider'
  model: 'anthropic/claude-sonnet-4-20250514',             // PRD §7.8 — provider/model, NEVER harness-qualified
});
```

**§ The dual cascade (verified — copy into example 02 Part 4):**
```ts
import { configureHarnesses } from 'groundswell';

configureHarnesses({
  defaultHarness: 'pi',                  // vendor-neutral default (harness axis)
  defaultModelProvider: 'anthropic',     // LLM host — INDEPENDENT axis (model axis)
  harnessDefaults: { 'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY } },
});
// Cascade (PRD §7.7):  harness = prompt ?? agent ?? global.defaultHarness  (first-defined wins)
//                       options = { ...global[h], ...agentOpts, ...promptOpts } (last-write wins)
// Model axis is SEPARATE — overriding `model` never changes the harness.
// Read the RESOLVED harness back via agent.config.harness (do NOT import a global-config getter).
```

**§ Per-call switching (verified — copy into example 03, PRD §7.13):**
```ts
// Switch harness for ONE call (harness axis):
await agent.prompt(prompt, { harness: 'claude-code' });

// Override MODEL only — harness unchanged (model axis). Requires the pi harness for non-Anthropic:
await piAgent.prompt(prompt, { model: 'openai/gpt-4o' });
//   ⚠️ The same call on a claude-code agent is a config error (Anthropic-only, §7.8).
```

**§ The capability matrix (verified values — copy into example 06 Part 5):**
```ts
// PRD §7.4 — parity without Pi plugins. Every capability is TRUE for BOTH harnesses.
// The ONLY differing row is "LLM providers".
//   pi:           mcp✓ skills✓ lsp✓ streaming✓ sessions✓ extendedThinking✓  | providers: ANY
//   claude-code:  mcp✓ skills✓ lsp✓ streaming✓ sessions✓ extendedThinking✓  | providers: Anthropic ONLY
const pi = registry.get('pi')!;
const cc = registry.get('claude-code')!;
console.log('pi capabilities:', prettyJson(pi.capabilities));
console.log('claude-code capabilities:', prettyJson(cc.capabilities));
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (examples only — no env vars added to the engine; examples consume ANTHROPIC_API_KEY like before)
ROUTES: none
PUBLIC API: none (src/index.ts unchanged — you are CONSUMING the finalized API, not editing it)
DEPS: none (no package.json dependency change; only the scripts block)
BUILD: examples are NOT compiled by `npm run lint` (tsconfig include=["src/**/*"]). They run via tsx
        against dist/. Gate 0 = `npm run build` so dist has the harness symbols. `npm test` (vitest)
        includes examples/__tests__/*.test.tsx (ink tests) but NOT the example sources — unaffected.
```

## Validation Loop

### Level 0: Build dist (gate 0 — without this, every example's imports fail)

```bash
npm run build    # tsc → dist/. 'groundswell' resolves to dist/index.js.
# VERIFY the harness symbols are now exported from the built package:
node --input-type=module -e "import('groundswell').then(m=>console.log(['PiHarness','ClaudeCodeHarness','HarnessRegistry','configureHarnesses','parseModelSpec'].filter(k=>k in m).join(', ')))"
# Expected: "PiHarness, ClaudeCodeHarness, HarnessRegistry, configureHarnesses, parseModelSpec"
# (run from repo root so Node resolves 'groundswell' via package.json main → dist/index.js)
```

### Level 1: Symbol correctness (the deterministic, API-key-free gate)

```bash
# (a) PUBLIC-API SYMBOL CROSS-CHECK — every `from 'groundswell'` import resolves in src/index.ts.
node -e '
  const fs=require("fs");
  const barrel=fs.readFileSync("src/index.ts","utf8");
  const allowed=new Set();
  const bre=/export\s+(?:type\s+)?\{([\s\S]+?)\}/g;
  let bm; while((bm=bre.exec(barrel))){
    for(let s of bm[1].split(",")){ s=s.trim().split(/\s+as\s+/)[0].replace(/\/\/.*$/,"").trim(); if(s) allowed.add(s); }
  }
  // also capture single-name value exports like `export { PiHarness } from …` (covered above) and
  // `export { X } from "./…"` re-exports — the regex already handles multi-line braces.
  const re=/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["'\x60]groundswell["'\x60]/g;
  const files=["examples/harnesses/01-basic-harness-usage.ts","examples/harnesses/02-harness-configuration.ts","examples/harnesses/03-harness-switching.ts","examples/harnesses/04-multi-provider-scenarios.ts","examples/harnesses/05-harness-sessions.ts","examples/harnesses/06-harness-with-mcp-skills.ts"];
  let fail=false;
  for(const f of files){ if(!fs.existsSync(f)){console.log("❌ MISSING FILE:",f);fail=true;continue;}
    const txt=fs.readFileSync(f,"utf8"); let m,bad=[];
    while((m=re.exec(txt))){ for(let s of m[1].split(",")){ s=s.trim().split(/\s+as\s+/)[0]; if(s&&!allowed.has(s)) bad.push(s); } }
    console.log(f+":", bad.length? ("UNKNOWN IMPORTS -> "+[...new Set(bad)].join(", ")) : "all imports resolve ✅");
    if(bad.length) fail=true;
  }
  if(fail) process.exit(1);
'
# Expected: "all imports resolve ✅" for all 6 files. Unknown = misspelled OR internal → fix the example.

# (b) INTERNAL-SYMBOL LEAK CHECK — the 5 non-public names must NOT be imported anywhere in examples/:
! grep -rnE "import\s*\{[^}]*(configureProviders|getGlobalProviderConfig|getGlobalHarnessConfig|resolveHarnessConfig|registerDefaultHarnesses)[^}]*\}\s*from\s*[\"'\x60]groundswell" examples/harnesses/
# Expected: exit 0 (no matches). A match = you imported an internal symbol as public — rewrite (Critical #1).

# (c) DEPRECATED-ALIAS CHECK — the new reference surface must not feature deprecated Provider* names as
#     the ACTIVE api (a prose migration NOTE is fine; an import or a `new AnthropicProvider()` is not):
! grep -rnE "new (AnthropicProvider|ProviderRegistry)\(|import\s*\{[^}]*(AnthropicProvider|ProviderRegistry|configureProviders)[^}]*\}\s*from\s*[\"'\x60]groundswell" examples/harnesses/
# Expected: exit 0. (Critical #8.)
```

### Level 2: File-presence & content completeness

```bash
# All 6 new files + README exist; old dir gone:
for f in 01-basic-harness-usage 02-harness-configuration 03-harness-switching \
         04-multi-provider-scenarios 05-harness-sessions 06-harness-with-mcp-skills; do
  [ -f "examples/harnesses/$f.ts" ] && echo "✅ $f.ts" || { echo "❌ MISSING examples/harnesses/$f.ts"; exit 1; }
done
[ -f examples/harnesses/README.md ] && echo "✅ harnesses/README.md" || { echo "❌ MISSING README"; exit 1; }
[ ! -d examples/providers ] && echo "✅ examples/providers removed" || { echo "❌ examples/providers still exists"; exit 1; }

# Exported runner fns match what examples/index.ts will import:
for pair in "01-basic-harness-usage:runBasicHarnessUsageExample" \
            "02-harness-configuration:runHarnessConfigurationExample" \
            "03-harness-switching:runHarnessSwitchingExample" \
            "04-multi-provider-scenarios:runMultiProviderScenariosExample" \
            "05-harness-sessions:runHarnessSessionsExample" \
            "06-harness-with-mcp-skills:runHarnessWithMcpSkillsExample"; do
  file="${pair%%:*}"; fn="${pair##*:}"
  grep -q "export async function $fn" "examples/harnesses/$file.ts" && echo "✅ $fn" || { echo "❌ MISSING fn $fn in $file"; exit 1; }
done

# §7.8 critical rule appears in the model-heavy examples (02/03/04):
grep -qiE "never.*harness.qualif|not harness-qualified|harness.*never.*model string|Harness must not appear" \
  examples/harnesses/02-harness-configuration.ts examples/harnesses/03-harness-switching.ts examples/harnesses/04-multi-provider-scenarios.ts

# Capability matrix (pi vs claude-code) present in ex 06:
grep -qi "pi" examples/harnesses/06-harness-with-mcp-skills.ts
grep -qi "claude-code" examples/harnesses/06-harness-with-mcp-skills.ts
grep -qiE "anthropic.only|anthropic-only|any provider" examples/harnesses/06-harness-with-mcp-skills.ts
```

### Level 3: Runnable under tsx + scripts wired (the "examples run" gate)

```bash
# (a) Each example LOADS under tsx without a module-resolution error.
#     Without ANTHROPIC_API_KEY it exits 1 at the env gate — that itself proves imports resolved
#     (a broken import throws BEFORE the env gate). With the key set it runs fully.
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-sk-test-does-not-matter-for-load-check}"
for f in examples/harnesses/0*-*.ts; do
  echo "--- tsx load: $f ---"
  npx tsx "$f" >/tmp/tsx_out.$$ 2>&1; code=$?
  # A clean env-gate exit prints the "ANTHROPIC_API_KEY environment variable not set" line OR runs.
  if grep -qiE "does not provide an export|Cannot find module|SyntaxError" /tmp/tsx_out.$$; then
    echo "❌ MODULE/RESOLUTION ERROR in $f:"; cat /tmp/tsx_out.$$; exit 1;
  fi
  echo "✅ $f loaded (exit $code — non-zero acceptable if it's only the env-gate / a live-key error)"
done
rm -f /tmp/tsx_out.$$
# NOTE: if ANTHROPIC_API_KEY is a real key, the live LLM calls run; expect try/catch 'Note:' paths
# to be bypassed. Either outcome passes AS LONG AS there is no module-resolution error.

# (b) package.json scripts resolve to existing files:
for s in basic config switching scenarios sessions features; do
  cmd=$(node -e "console.log(require('./package.json').scripts['start:harness-$s'])")
  target=$(echo "$cmd" | grep -oE 'examples/harnesses/[0-9A-Za-z.-]+\.ts')
  [ -f "$target" ] && echo "✅ start:harness-$s → $target" || { echo "❌ start:harness-$s target missing: $target"; exit 1; }
done
# No start:provider-* scripts remain:
! grep -q "start:provider-" package.json && echo "✅ no start:provider-* scripts" || { echo "❌ start:provider-* still present"; exit 1; }

# (c) Aggregator wired + no dangling provider references repo-wide:
node -e "const s=require('./package.json').scripts; console.log('start:all →', s['start:all'])"   # → tsx examples/index.ts
! grep -rnE "examples/providers|start:provider-|from ['\"]\.\.?/providers/" examples/ package.json README.md 2>/dev/null \
  && echo "✅ no dangling provider references" || { echo "❌ dangling provider reference found above"; exit 1; }
# (root README.md grep is harmless — findings §5 confirmed it has no provider refs; included for completeness.)

# (d) Optional: run the aggregator smoke (it imports all examples; proves import graph is whole):
#   npx tsx examples/index.ts  </dev/null  (interactive — skip in CI; the import-resolution is the gate)
```

### Level 4: Baseline preservation (no collateral damage)

```bash
# No src/ change → lint must hold at baseline:
npm run lint    # tsc --noEmit on src/ — expected exit 0
# vitest — the examples/__tests__ ink tests must still pass (they import examples/components, not harnesses):
npm test        # expected green; identical to baseline since no src/ + no ink-component change
# Confirm scope: only examples/ + package.json changed:
git diff --name-only | grep -vE "^(examples/|package\.json)$" && { echo "❌ out-of-scope file changed"; exit 1; } || echo "✅ scope clean (examples/ + package.json only)"
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 0: `npm run build` ran; the harness symbols resolve from `dist/` (the node -e probe prints them).
- [ ] Level 1: symbol cross-check = "all imports resolve ✅" for all 6 files; no internal-symbol leak
      (configureProviders/getGlobalProviderConfig/getGlobalHarnessConfig/resolveHarnessConfig/
      registerDefaultHarnesses not imported); no deprecated alias used as active API.
- [ ] Level 2: all 6 files + README exist; `examples/providers/` removed; runner fns exported with the
      exact names; §7.8 critical rule stated in 02/03/04; capability matrix in 06.
- [ ] Level 3: every example LOADS under `tsx` with NO module-resolution error; the 6 `start:harness-*`
      scripts resolve to existing files; zero `start:provider-*`; no dangling `examples/providers` /
      `start:provider-` / `./providers/` references repo-wide.
- [ ] Level 4: `npm run lint` exit 0; `npm test` green; `git diff` scoped to `examples/` + `package.json`.

### Feature Validation

- [ ] The 6 examples collectively demonstrate the full v1.2 system: registry (ex 01), dual cascade
      (ex 02), per-call + model-only switching (ex 03), the model axis anthropic-vs-openai via pi (ex 04),
      sessions with the claude-code/pi difference documented (ex 05), MCP + skills + hooks + the parity
      matrix (ex 06).
- [ ] Every example sets `model` as `provider/model` or plain — NEVER harness-qualified (§7.8).
- [ ] Example 04 never attempts `openai/*` on the `claude-code` harness (surfaces the constraint as a note).
- [ ] Example 05 never calls `piHarness.getSession()` (documents the difference instead).
- [ ] `examples/index.ts` runs `npm run start:all` without a missing-module error; `examples/README.md`
      "Harness Examples" section is accurate.

### Code Quality Validation

- [ ] Each example follows the existing skeleton (header JSDoc, env gate, printHeader/printSection parts,
      Summary, import.meta footer) — matches the voice of `examples/examples/*`.
- [ ] Strict TypeScript (no `any` soup, proper types from `groundswell`) — even though lint doesn't check
      examples, write as if it did.
- [ ] Helper import path `../../utils/helpers.js` correct (unchanged by the rename).
- [ ] Resilient try/catch 'Note:' demo style preserved for live LLM / openai / skill-dir calls.

### Documentation & Deployment

- [ ] `examples/harnesses/README.md` mirrors the old providers README structure in harness vocabulary and
      links to `docs/harnesses.md` (the P4.M3.T1.S1 doc) under See Also.
- [ ] `package.json` scripts are the only package.json change (no dep/export/main edits).
- [ ] No new env vars required by the engine (examples reuse ANTHROPIC_API_KEY; openai calls are optional
      and guarded).

---

## Anti-Patterns to Avoid

- ❌ Don't **import `configureProviders`, `getGlobalProviderConfig`, `getGlobalHarnessConfig`,
  `resolveHarnessConfig`, or `registerDefaultHarnesses` from `'groundswell'`.** None are in `src/index.ts`;
  tsx will throw "does not provide an export". Use `configureHarnesses` + `agent.config.harness` + explicit
  `HarnessRegistry.getInstance().register(new PiHarness())`. See Critical #1 — the Level-1b gate fails on
  any leak. (This is the exact bug in the old `02-provider-configuration.ts` you are fixing.)
- ❌ Don't **skip `npm run build`.** A stale `dist/` makes every harness import fail under tsx. Gate 0.
  See Critical #2.
- ❌ Don't **call `piHarness.getSession()`.** PiHarness has no such method (it makes a fresh AgentSession
  per execute). Example 05 uses `getSession` only on the `claude-code` harness and DOCUMENTS the pi
  difference. See Critical #3.
- ❌ Don't **run `openai/*` on the `claude-code` harness.** It's Anthropic-only (§7.8); non-Anthropic
  providers require the `pi` harness. Example 04 keeps the harness CONSTANT (pi) and varies the MODEL.
  See Critical #4.
- ❌ Don't **harness-qualify the model string.** `pi/anthropic/x` and `cc/…` are invalid (parseModelSpec
  throws). Use `anthropic/claude-sonnet-4-20250514` or plain. See Critical #5. State it in the examples.
- ❌ Don't **trust `npm run lint` to catch example type errors.** tsconfig excludes examples (Critical #6).
  The symbol cross-check + tsx load are the real gates. Write strict TS anyway.
- ❌ Don't **feature deprecated `Provider*` aliases** (AnthropicProvider/ProviderRegistry/configureProviders)
  as the active API. The examples are the v1.2 reference surface — use `Harness*` exclusively. A one-line
  migration note pointing at `docs/migration-provider-to-harness.md` is the only acceptable mention.
  See Critical #8.
- ❌ Don't **touch `src/`, `docs/`, root `README.md`, `examples/examples/*`, or `examples/__tests__/*`.**
  `docs/` + root README are owned by P4.M3.T1.S1 (parallel). If an example won't run, fix the EXAMPLE,
  never the code. A `src/` edit to "export" an internal symbol for an example is a hard scope violation.
  See Critical #9 + findings §7.
- ❌ Don't **leave dangling references.** Every `examples/providers` path, `start:provider-*` script, and
  `./providers/` import must be gone repo-wide (Level 3c grep). The `examples/index.ts` aggregator and
  `examples/README.md` are easy to miss.
- ❌ Don't **hard-fail the whole example suite when a secondary key is absent.** Keep the resilient
  try/catch 'Note:' style for openai/skill-dir calls (Critical #7) so each example demonstrates its
  concept even in a key-incomplete environment.

---

## Confidence Score

**9 / 10** for one-pass implementation success.

**Rationale:** This is an examples/scripts task whose entire API surface is already finalized and
verified. The per-example concept→API map (findings §6), the verified class facts (registry methods,
`ClaudeCodeHarness.getSession` exists / `PiHarness.getSession` does not, both `registerMCPs`/`loadSkills`,
capability values), the verified cascade/model semantics (§7.7/§7.8), and — crucially — the
public-vs-internal API boundary (findings §2, the #1 footgun: which symbols resolve from `'groundswell'`)
are all pinned down. The existing `examples/providers/*` files provide a ready voice/structure template
(printHeader/printSection parts, env gate, resilient try/catch, summary). The deterministic gates
(symbol cross-check + leak check + tsx load + grep-for-dangling-refs) catch every realistic failure mode
without needing live API keys. Residual 1-point risk: an author fabricating a `pi.getSession()` call or
attempting `openai/*` on claude-code — both explicitly called out in Critical #3/#4 and gated by the
content greps. The parallel item P4.M3.T1.S1 touches only `docs/` + root README (disjoint from
`examples/` + `package.json`), so there is zero merge conflict. No `src/` change means `npm run lint`/
`npm test` hold at baseline; the only package.json edit is the scripts block.
