# PRP — P4.M3.T1.S1: Write docs/harnesses.md + update migration guides

**PRD reference:** §7 (Agent Harness System) in its entirety — §7 intro, §7.1–§7.14.
**Plan:** `plan/004_9a50e71828f4/` — S1 of P4.M3.T1 ("Harness documentation rewrite").
**Consumes:** the **finalized** public API (P3.M3.T1.S1 complete — `src/index.ts`) + verified
`plan/004_9a50e71828f4/docs/external_deps.md`. **Produces:** TWO new doc files
(`docs/harnesses.md`, `docs/migration-provider-to-harness.md`) + TWO edits (`docs/providers.md`
deprecation banner, `README.md` doc-list links). **Scope tag:** (1) **CREATE** 2 markdown files;
(2) **EDIT** `docs/providers.md` (banner only) + `README.md` (2 list entries). **Mock:** none (docs).
**DO NOT** touch `src/`, `examples/` (owned by P4.M3.T2), `PRD.md`, `tasks.json`, `prd_snapshot.md`,
`package.json`, or any migration-*.md other than the one you create.

> **READ "§THE PUBLIC-vs-INTERNAL API BOUNDARY" AND "§DO NOT INVENT APIs" BEFORE WRITING A SINGLE CODE
> FENCE.** `package.json` exports ONLY `"."` — so `getGlobalHarnessConfig`, `resolveHarnessConfig`, and
> `registerDefaultHarnesses` are NOT importable as `from 'groundswell'`. Every ```ts import in the new
> docs MUST be cross-checked against `src/index.ts`. Capability VALUES and cascade/parse semantics are
> verified in `research/findings.md` — copy them verbatim, do not paraphrase from memory.

---

## Goal

**Feature Goal:** Ship the authoritative, PRD-§7-faithful `docs/harnesses.md` that makes the v1.2
**Harness ⊥ ModelProvider** split fully self-documenting, plus a dedicated `Provider*→Harness*`
migration guide, plus the deprecation banner that retires `docs/providers.md` as the harness reference —
all written so a reader who knows nothing about the codebase can select, configure, and switch harnesses
correctly on the first read.

**Deliverable:**
1. **CREATE `docs/harnesses.md`** — comprehensive reference with the section order in §"Implementation
   Tasks" Task 1 (maps 1:1 to PRD §7.1–§7.14 + Registry + Migration pointer). Authoritative; supersedes
   `docs/providers.md` for the harness vocabulary.
2. **CREATE `docs/migration-provider-to-harness.md`** — the `Provider*→Harness*` migration guide,
   structurally mirroring `docs/migration-opencode-removal.md` (Overview → Why → Breaking/Renaming
   Changes → Migration Steps → Before/After → Deprecated-aliases timeline → FAQ).
3. **EDIT `docs/providers.md`** — insert a `> ⚠️ **DEPRECATED**` banner immediately after the H1 tagline,
   pointing to `harnesses.md` + the migration guide. Body untouched.
4. **EDIT `README.md`** — add `Harnesses` + `Provider→Harness Migration` entries to the
   `## Documentation` list.

**Success Definition:**
1. `docs/harnesses.md` exists and contains a `## Table of Contents` whose entries resolve, PLUS a
   top-level callout stating the §7.8 critical rule ("the harness is never part of the model string")
   and the §7 orthogonality ("harness ⊥ provider/model, chosen independently").
2. Every ```ts fenced block in the two new docs imports ONLY symbols present in `src/index.ts` (verified
   by the Level-1 cross-check script) and every documented value (capability flags, `configureHarnesses`
   validation behavior, `parseModelSpec` rejection message, cascade first-defined/last-write rule)
   matches the verified source facts in `research/findings.md`.
3. `docs/providers.md` shows the deprecation banner (grep-verifiable) and `README.md` lists both new docs.
4. `npm run lint` and `npm test` remain green (no `src/` changed → they must be unchanged from baseline;
   run to prove zero collateral damage).

## Why

- **Closes the v1.2 vocabulary gap (PRD §7).** P1–P3 shipped the `Harness*` type system, both adapters
  (`PiHarness`, `ClaudeCodeHarness`), the registry, the dual cascade, and the public exports — but the
  only harness/runtime doc (`docs/providers.md`, ~3500 lines) is written entirely in pre-§7 `Provider*`
  vocabulary and documents only `anthropic`. Without `harnesses.md`, users cannot discover that `pi` is
  the default, that the model string must never carry a harness prefix, or that the two axes are
  independent. This is the largest doc deliverable of the §7 effort (consumer-analysis §7).
- **Locks in the deprecation runway.** `docs/providers.md` must be visibly deprecated so readers stop
  treating it as current; the banner + migration guide give them the single hop to the new vocabulary.
- **Foundation for P4.M3.T2 (examples).** The examples rewrite (P4.M3.T2.S1) will point users at
  `docs/harnesses.md` for the concepts; this doc must exist and be correct first.
- **Low blast radius.** Pure documentation. The only real risk is documenting an API that doesn't
  resolve publicly (the `registerDefaultHarnesses` / `getGlobalHarnessConfig` trap) or misquoting a
  verified value — both guarded by the Validation Loop + the gotchas below.

## What

User-visible behaviour: **none** (docs). Developers get one authoritative harness reference, a
step-by-step Provider→Harness migration, a clearly deprecated old doc, and two new README links.

### Success Criteria

- [ ] `docs/harnesses.md` created with a `## Table of Contents` and the section set enumerated in
      Task 1 (each PRD §7.x subsection represented).
- [ ] `docs/harnesses.md` states the §7.8 critical rule AND §7 orthogonality in a top-level callout.
- [ ] `docs/migration-provider-to-harness.md` created, mirroring `migration-opencode-removal.md`
      structure, containing the full rename table (findings §6).
- [ ] `docs/providers.md` begins with a deprecation banner linking to both new docs (grep-verifiable).
- [ ] `README.md` `## Documentation` list includes both new docs.
- [ ] Level-1 symbol cross-check passes: every `from 'groundswell'` import in the two new docs resolves
      against `src/index.ts`; the three internal symbols (`getGlobalHarnessConfig`,
      `resolveHarnessConfig`, `registerDefaultHarnesses`) do NOT appear as public imports.
- [ ] `npm run lint` exit 0 and `npm test` green (baseline preserved — no `src/` change).

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes.** This PRP supplies: the exact 4-file deliverable set, the section-by-section
content map (PRD §7.1–§7.14), the **verified** capability values and cascade/parse semantics (so the
author never guesses), the public-vs-internal API boundary (the #1 documentation footgun), the
existing-doc voice/conventions to mirror, the mechanical rename table for the migration guide, and
deterministic validation commands (symbol cross-check + fence balance + grep gates).

### Documentation & References

```yaml
# MUST READ — include these in your context window
- file: PRD.md  (§7, lines ~253–561 in plan/004_9a50e71828f4/prd_snapshot.md — identical to repo PRD.md)
  why: "The AUTHORITATIVE source for every harnesses.md section. §7.1 table, §7.3 interface, §7.4
        capability table, §7.6 configureHarnesses, §7.7 cascade, §7.8 model formats + critical rule,
        §7.11 hook mapping table, §7.13 usage examples, §7.14 parity requirements. Reproduce the tables
        and code samples faithfully; the doc IS the §7 narrative for users."
  section: "§7 (all subsections)"

- file: src/index.ts
  why: "The GATEKEEPER for what the docs may import. Every `from 'groundswell'` symbol in the new docs
        MUST appear here. Confirms: configureHarnesses, PiHarness, ClaudeCodeHarness, HarnessRegistry,
        parseModelSpec, formatModelForProvider, and all Harness* TYPES are public; AnthropicProvider /
        ProviderRegistry / configureProviders are deprecated-but-exported aliases."
  pattern: "grep -E '^export' src/index.ts | grep -iE 'harness|pi-|claude|configureHarness|parseModel|formatModel'"

- file: src/types/harnesses.ts
  why: "Verbatim source for the Harness interface, HarnessId, ModelProviderId (open-set idiom),
        HarnessCapabilities, HarnessOptions, HarnessHookEvents, HarnessRequest,
        ToolExecutionRequest/Result, ModelSpec, GlobalHarnessConfig. Copy the JSDoc @examples into the
        doc where they illustrate a concept. Note ModelSpec/parseModelSpec/formatModelForProvider are
        type-only ambient declarations here — the runtime lives in utils/model-spec.ts (document the
        functions, not the ambient quirk)."
  gotcha: "Do NOT show importing parseModelSpec from the types path — it's a runtime value exported from
           utils/model-spec.ts and re-exported at top level. Use `from 'groundswell'`."

- file: src/utils/harness-config.ts
  why: "configureHarnesses() behavior + the resolveHarnessConfig() cascade ALGORITHM (lines: harness =
        prompt ?? agent ?? global; options = {...global, ...agent, ...prompt}). Documents §7.6/§7.7.
        DEFAULT config = { defaultHarness: 'pi' }."
  gotcha: "getGlobalHarnessConfig and resolveHarnessConfig are NOT in src/index.ts → do NOT show them as
           public imports. Describe the cascade in prose/pseudocode only. configureHarnesses IS public."

- file: src/utils/model-spec.ts
  why: "parseModelSpec / formatModelForProvider EXACT semantics: accepts 'provider/model' or plain
        (resolved against defaultProvider='anthropic'); REJECTS 3+-segment strings with
        'Harness must not appear in model string…'; formatModelForProvider pass-through if same
        provider else throws 'Cannot translate…'. These are the verified facts for §7.8."

- file: src/harnesses/pi-harness.ts  (capabilities block lines 83-90)
  why: "PiHarness capability VALUES: mcp/skills/lsp/streaming/sessions/extendedThinking ALL true; runs
        ANY provider. The 'Parity without Pi plugins' proof point."
- file: src/harnesses/claude-code-harness.ts  (capabilities block lines 124-139)
  why: "ClaudeCodeHarness capability VALUES: ALL true (mcp via createSdkMcpServer, skills via system
        prompt, sessions via abstraction/file, extendedThinking via maxThinkingTokens) BUT Anthropic-only
        (§7.8 constraint). normalizeModel throws on non-anthropic provider."

- file: src/harnesses/register-defaults.ts
  why: "registerDefaultHarnesses: idempotent bootstrap registering ClaudeCodeHarness ('claude-code') +
        PiHarness ('pi')."
  gotcha: "It is exported from src/harnesses/index.ts but NOT from top-level src/index.ts, and
           package.json has NO './harnesses' subpath export. Do NOT document `from 'groundswell/harnesses'`
           — it will not resolve. Document the explicit registry.register(new PiHarness()) +
           new ClaudeCodeHarness() equivalent instead."

- file: docs/providers.md  (head — lines 1-3)
  why: "Where the deprecation banner goes: AFTER the `# Providers` H1 + its tagline paragraph, BEFORE
        `## Table of Contents`. Keep the entire body intact."
  pattern: "Insert a `> ⚠️ **DEPRECATED since v0.0.4 (PRD v1.2).**` blockquote linking to
            docs/harnesses.md and docs/migration-provider-to-harness.md."

- file: docs/migration-opencode-removal.md
  why: "STRUCTURAL TEMPLATE for the new migration guide. Mirror its section order (Status header →
        Overview → Why → Breaking Changes → Migration Steps w/ Before-After → Mapping table →
        Before/After Examples → Timeline → FAQ) and its tone. Do NOT copy OpenCode content."
  gotcha: "Contrast: OpenCode was a HARD removal; Provider*→Harness* is a DEPRECATED-ALIAS rename
           (aliases retained in src/index.ts). State this difference explicitly."

- file: docs/migration-guide-agent-response.md
  why: "The AgentResponse<T> contract doc (steady-state, shared by BOTH harnesses per §7.14.4).
        harnesses.md MUST link to it from the §7.3 execute() + §7.14 parity sections — do NOT duplicate
        its content."

- file: README.md  (## Documentation list + ## Core Concepts > Agents)
  why: "Where to add the 2 doc links, and the voice to match (terse, code-first, > [!IMPORTANT]
        callouts, tables). The 'Agents — Lightweight wrappers around the Anthropic SDK' prose is STALE
        post-§7 but rewriting it is P4.M3.T2 territory — do NOT change that prose, only add list links."

- docfile: plan/004_9a50e71828f4/docs/external_deps.md
  why: "VERIFIED Pi SDK + Claude SDK surface (npm versions, createAgentSession, customTools TypeBox,
        agentskills.io native support, createSdkMcpServer, hooks). Source for the §7.1 SDK/package
        columns, §7.12 skills/MCP/LSP notes, and the 'Parity without Pi plugins' rationale."
  section: "§1 (Pi SDK), §2 (Claude SDK), §3 (agentskills.io), §4 (adapter comparison table)"

- docfile: plan/004_9a50e71828f4/P4M3T1S1/research/findings.md
  why: "Exhaustive verified facts: the section→PRD map, the public API set, capability values, cascade
        + parse semantics, the public-vs-internal API boundary (§7b), the rename table (§6), doc voice,
        and scope boundaries. THE single source of truth for every factual claim in the new docs."
```

### Current Codebase tree (relevant slice)

```bash
docs/
├── providers.md                          # ⬅ EDIT (deprecation banner only); body untouched
├── migration-guide-agent-response.md     # stable — LINK to it, do not edit
├── migration-opencode-removal.md         # structural template for the new guide; do not edit
├── harnesses.md                          # ⬅ CREATE (authoritative harness reference)
├── migration-provider-to-harness.md      # ⬅ CREATE (Provider*→Harness* migration guide)
├── agent.md / prompt.md / workflow.md / restart-pattern.md   # untouched
src/
├── index.ts                              # public-barrel GATEKEEPER (cross-check imports against this)
├── types/harnesses.ts                    # verbatim type source
├── utils/{harness-config,model-spec}.ts  # verified semantics (configureHarnesses / parseModelSpec)
└── harnesses/{pi-harness,claude-code-harness,harness-registry,register-defaults}.ts  # capability values + registry
README.md                                 # ⬅ EDIT (## Documentation list — add 2 links)
```

### Desired Codebase tree with files added

```bash
docs/
├── harnesses.md                          # NEW — authoritative harness reference (§7 narrative)
├── migration-provider-to-harness.md      # NEW — Provider*→Harness* migration guide
├── providers.md                          # EDITED — deprecation banner prepended (body unchanged)
└── (all other docs unchanged)
README.md                                 # EDITED — 2 new links in ## Documentation
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — THE PUBLIC-vs-INTERNAL API BOUNDARY. package.json `exports` maps ONLY "." →
//   dist/index.js. There is NO "./harnesses" subpath. Therefore:
//     • configureHarnesses, PiHarness, ClaudeCodeHarness, HarnessRegistry, parseModelSpec,
//       formatModelForProvider, and ALL Harness* TYPES → importable from 'groundswell'. ✅ FEATURE.
//     • getGlobalHarnessConfig, resolveHarnessConfig (utils/harness-config.ts) → NOT re-exported at
//       top level. ❌ Do NOT show `import { getGlobalHarnessConfig } from 'groundswell'`. Describe the
//       cascade in PROSE/PSEUDOCODE only.
//     • registerDefaultHarnesses (src/harnesses/index.ts) → NOT top-level, NO resolvable subpath. ❌ Do
//       NOT show `import { registerDefaultHarnesses } from 'groundswell/harnesses'`. Show the explicit
//       equivalent: HarnessRegistry.getInstance().register(new PiHarness()) + new ClaudeCodeHarness().
//   ENFORCEMENT: the Level-1 cross-check script greps the new docs for any of these three symbols as an
//   import target and FAILS the gate if found. (research/findings.md §7b.)

// CRITICAL #2 — DO NOT INVENT OR MISQUOTE APIs. Every value in the docs must trace to a verified fact:
//   • Capability flags: pi = ALL true + any provider; cc = ALL true + Anthropic ONLY (findings §3).
//   • configureHarnesses validates defaultHarness ∈ {pi,claude-code} (throws else) and harnessDefaults
//     keys; does NOT validate defaultModelProvider (open set). Default = { defaultHarness: 'pi' }.
//   • resolveHarnessConfig: harness = prompt ?? agent ?? global; options = {...global,...agent,...prompt}.
//   • parseModelSpec: 'provider/model' | plain; REJECTS ≥3 segments ("Harness must not appear…").
//   • formatModelForProvider: pass-through if same provider else THROWS ("Cannot translate…").
//   • Default model provider when unset = 'anthropic'. Plain model resolved against it.
//   Copy these VERBATIM from research/findings.md; do not paraphrase. A wrong capability flag or a
//   softened "formatModelForProvider translates across providers" claim is a doc bug.

// CRITICAL #3 — THE §7.8 CRITICAL RULE IS THE HEADLINE. "The harness is NEVER part of the model
//   string." pi/anthropic/claude-sonnet-4 and cc/anthropic/... are INVALID and parseModelSpec throws.
//   Put this in a top-level callout in §"Model & Provider Specification" AND reference it from the
//   Overview. This is the single most-violated assumption in the v1.2 model; the doc exists to prevent it.

// CRITICAL #4 — providers.md BODY STAYS. The contract is "add banner," not "rewrite." providers.md is
//   ~3500 lines of pre-§7 vocabulary (consumer-analysis §7: "the single largest documentation rewrite").
//   A full rewrite is out of scope. Insert ONE deprecation blockquote after the H1 tagline and stop.
//   Do not delete sections, fix its stale content, or "tidy" it.

// CRITICAL #5 — DO NOT TOUCH examples/. examples/providers/* + the package.json start:provider-* scripts
//   are owned by P4.M3.T2.S1 ("Migrate examples to harness vocabulary"). You may NAME upcoming harness
//   examples ("see examples/ — harness examples landing in P4.M3.T2") but must NOT create or edit them.

// CRITICAL #6 — DEPRECATED ALIASES ARE RETAINED, NOT REMOVED. AnthropicProvider, ProviderRegistry,
//   configureProviders, Provider*, ProviderResult are STILL EXPORTED (src/index.ts) as deprecated
//   aliases. The migration guide must say "your existing code keeps working; these are deprecated" —
//   NOT "this is a breaking change." (Contrast honestly with OpenCode, which WAS a hard removal.)

// CRITICAL #7 — DOC VOICE / FORMATTING. Mirror README + providers.md: H1 + tagline, ## Table of
//   Contents with anchor links, code-first (every concept gets a ```ts block), GitHub callouts
//   (> [!IMPORTANT] / > [!NOTE]), tables for capability/mapping comparisons. Version tag the new docs
//   "**Version:** 0.0.4+ (PRD v1.2)". Do not introduce a new doc style.

// CRITICAL #8 — LINKS MUST RESOLVE. Every intra-doc anchor link (docs/harnesses.md#model--provider-
//   specification) must match a heading slug; every relative doc link (./migration-provider-to-harness.md,
//   ./migration-guide-agent-response.md) must point to a file that exists. The Level-3 gate checks this.
```

## Implementation Blueprint

### Data models and structure

No data models. This task produces **Markdown prose + fenced TypeScript samples**. All TypeScript shown
must import only the public symbols in `src/index.ts` and reflect the verified semantics in
`research/findings.md`. The only "structure" is the section ordering of each doc (enumerated below).

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE docs/harnesses.md — the authoritative harness reference
  - HEAD: `# Harnesses` H1 + one-line tagline ("The pluggable agent runtime — orthogonal to the LLM
        provider/model.") + a `> [!IMPORTANT]` callout stating BOTH (a) §7 orthogonality ("the harness
        is chosen independently of the LLM provider/model") and (b) the §7.8 critical rule ("the harness
        never appears in the model string; `pi/anthropic/...` is invalid"). + `## Table of Contents`.
  - SECTIONS (in this order — each a `##` heading; reproduce the PRD §7.x tables/code):
      1. "Overview" — what a harness is (agent runtime driving prompt/tool/stream/session), why pi is
         default (vendor-neutral, no walled garden) and claude-code is retained (Anthropic-ecosystem
         users). Cite PRD §7 intro + §7.1 rationale.
      2. "Supported Harnesses" — the §7.1 table (Harness | SDK/Package | Description) with verified
         package names: `@earendil-works/pi-coding-agent` (pi), `@anthropic-ai/claude-agent-sdk`
         (claude-code). Source columns from external_deps.md §1/§2.
      3. "Harness Identifier" — `HarnessId = 'pi' | 'claude-code'` (closed set).
      4. "The Harness Interface" — the §7.3 `Harness` interface (id, capabilities, initialize, terminate,
         execute<T>, registerMCPs, loadSkills, normalizeModel, supports, requiresFeatures). Show the
         non-streaming + streaming execute examples from src/types/harnesses.ts JSDoc. LINK to
         migration-guide-agent-response.md for the AgentResponse<T> shape (§7.14.4).
      5. "Capabilities" — the §7.4 table. Use VERIFIED values (findings §3): every capability true for
         BOTH; the differing row is "LLM providers: any (pi) vs Anthropic only (claude-code)". Include
         the "Parity without Pi plugins" footnote (MCPHandler provides MCP/LSP to both; no Pi plugin).
      6. "Harness Options" — §7.5 HarnessOptions (endpoint, apiKey, sessionId, timeout, headers). Note
         apiKey is FORWARDED to the LLM provider, not owned by the harness; implementations MAY extend.
      7. "Global Harness Configuration" — §7.6 configureHarnesses(config). Show the canonical worked
         example (configureHarnesses({ defaultHarness:'pi', defaultModelProvider:'anthropic',
         harnessDefaults:{ 'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY } } })). State the two
         independent axes. State validation behavior (findings §4: defaultHarness must be pi|claude-code;
         defaultModelProvider is open-set/unvalidated; default when unset = { defaultHarness:'pi' }).
      8. "Configuration Cascade" — §7.7. Show the cascade diagram (Global → Agent → Prompt) AND the
         verified algorithm in pseudocode: `harness = prompt ?? agent ?? global.defaultHarness`;
         `options = {...global.harnessDefaults[harness], ...agentOptions, ...promptOptions}`. Include a
         WORKED EXAMPLE: global.defaultHarness='pi', agent.harness='claude-code', prompt.harness=undefined
         → resolves to 'claude-code' (agent wins). Then a second: model cascade is SEPARATE — overriding
         `model:'openai/gpt-4o'` does NOT change the harness. NOTE in prose that the resolver helpers
         are internal (do not show importing them).
      9. "Model & Provider Specification" — §7.8. THE critical section. Two formats table (Plain model
         id → resolved vs defaultModelProvider; Provider-qualified `anthropic/...` → explicit). ModelSpec
         fields. parseModelSpec + formatModelForProvider (verified semantics, including the
         cross-provider THROW). A prominent `> [!WARNING]` block: harness-qualified strings
         (`pi/anthropic/x`, `cc/anthropic/...`) are INVALID and rejected. The claude-code constraint:
         non-Anthropic provider on claude-code is a config error surfaced at initialize/execute.
     10. "AgentConfig & PromptOverrides" — §7.9. harness / harnessOptions / model fields on both. Show
         the §7.13 examples (default pi; switch harness per-call; override model only).
     11. "Tool Execution" — §7.10. ToolExecutionRequest {name, input} / ToolExecutionResult {content,
         isError}. Tools execute locally via MCPHandler for BOTH harnesses; harness only reports calls
         back via toolExecutor. The pi adapter specifics (Groundswell tools passed to createAgentSession
         as customTools; no Pi MCP plugin needed).
     12. "Hooks" — §7.11. The HarnessHookEvents interface + the AgentHooks→HarnessHookEvents mapping
         table (preToolUse→onToolStart, etc.) with the pi vs claude-code source-event columns. Document
         the known claude-code limitations (PostToolUse isError always false; PostToolUse/SessionEnd
         duration always 0) — verified in consumer-analysis §1.
     13. "MCP, Skills & LSP Integration" — §7.12. Parity via shared MCPHandler (both harnesses receive
         the same tool list; claude-code built-in MCP bypassed). Skills: pi native agentskills.io +
         loads ~/.claude/skills; claude-code via system prompt. LSPConfig {enabled, languages?}.
     14. "Usage Examples" — §7.13 verbatim (default pi; switch harness per call; override model only).
         Each as a runnable ```ts block importing from 'groundswell'.
     15. "Feature Parity" — §7.14. The 6 parity requirements (MCP tools, Skills, Hooks ordering,
         AgentResponse shape, Cache keys incorporate BOTH harness+provider/model, Workflow events) +
         the adapter non-functional requirements (identical AgentResponse, identical tool semantics,
         deterministic hook ordering, unsupported features advertised via capabilities not silent
         degrade). LINK to migration-guide-agent-response.md for the response shape.
     16. "Harness Registry" — how to register/retrieve: HarnessRegistry.getInstance(); register(new
         PiHarness()); register(new ClaudeCodeHarness()); get('pi'); has(); initializeAll(); terminateAll().
         Show the explicit registration (NOT registerDefaultHarnesses — see Critical #1). Mention
         registerDefaultHarnesses EXISTS as an internal convenience but do not show a resolvable import.
     17. "Migrating from Provider*" — a SHORT section (1 paragraph + the rename table teaser) that LINKS
         to docs/migration-provider-to-harness.md for the full guide. (The full content lives there.)
  - NAMING/PLACEMENT: file at docs/harnesses.md. Headings use GitHub slug-friendly text (avoid special
        chars) so the ToC anchors resolve.

Task 2: CREATE docs/migration-provider-to-harness.md — the Provider*→Harness* migration guide
  - STRUCTURE: mirror docs/migration-opencode-removal.md section-for-section:
      • Header block: `# Migration Guide: Provider → Harness` + `**Version:** 0.0.4+ (PRD v1.2)` +
        `**Status:** ✅ ACTIVE — Deprecated aliases retained (non-breaking)`.
      • "Overview" — the v1.2 split: Provider* vocabulary → Harness* vocabulary; the runtime axis
        (HarnessId: pi|claude-code) is now separate from the LLM-host axis (ModelProviderId: open set).
      • "Why This Change?" — vendor-neutrality (pi default, no walled garden), orthogonal axes, parity.
      • "What Changed (Renaming, not breaking)" — the FULL rename table (findings §6): AnthropicProvider
        → ClaudeCodeHarness, ProviderRegistry → HarnessRegistry, configureProviders → configureHarnesses,
        Provider→Harness, ProviderId → HarnessId + ModelProviderId, ProviderRequest→HarnessRequest,
        ProviderOptions→HarnessOptions, ProviderCapabilities→HarnessCapabilities,
        ProviderHookEvents→HarnessHookEvents, ProviderResult<T>→AgentResponse<T>,
        AgentConfig.provider→harness, AgentConfig.providerOptions→harnessOptions,
        PromptOverrides.provider→harness. State: all v1.x names STILL WORK as deprecated aliases.
      • "Migration Steps" (numbered, each Before/After): (1) Update imports, (2) Update registry calls,
        (3) configureProviders → configureHarnesses (note: configureHarnesses rejects 'anthropic' as a
        defaultHarness — use 'pi' or 'claude-code'; the LLM host is now defaultModelProvider), (4)
        AgentConfig.provider → harness + providerOptions → harnessOptions, (5) PromptOverrides.provider
        → harness, (6) Model strings: drop any harness prefix (pi/anthropic/x is invalid); keep
        provider/model (anthropic/claude-sonnet-4) or plain.
      • "Before and After Examples" — 2-3 concrete: basic setup, configuration cascade, per-call switch.
      • "Deprecated Aliases Timeline" — aliases retained since v0.0.4; removal TBD (do NOT invent a hard
        date — say "tracked follow-up," matching PRD §7 intro "code migration to match this spec is a
        tracked follow-up"). Contrast with OpenCode (hard-removed v2.0.0).
      • "FAQ" — Q: Do I have to migrate immediately? A: No, aliases work. Q: Is configureProviders
        removed? A: No, deprecated. Q: Can I still use model 'openai/gpt-4o'? A: Yes, via the pi harness
        (default) — claude-code is Anthropic-only. Q: What about OpenCode? A: Removed (link
        migration-opencode-removal.md).
  - GOTCHA: do NOT claim a breaking change or a removal date that isn't sourced. Aliases are RETAINED.

Task 3: EDIT docs/providers.md — deprecation banner
  - INSERT immediately AFTER the H1 tagline paragraph (after "…tool delegation, and session management.")
        and BEFORE `## Table of Contents`:
        `> ⚠️ **DEPRECATED since v0.0.4 (PRD v1.2).** This document uses the pre-v1.2 `Provider*`
        > vocabulary and documents only the `anthropic` runtime. It is superseded by
        > **[Harnesses](harnesses.md)** — the authoritative harness reference (PRD §7). See the
        > **[Provider → Harness Migration Guide](migration-provider-to-harness.md)**. The content below
        > is retained for reference during the deprecation window.`
  - PRESERVE: the entire existing body (do not delete, reorder, or "fix" stale content — Critical #4).
  - NAMING: relative links `harnesses.md` and `migration-provider-to-harness.md` (same dir).

Task 4: EDIT README.md — documentation list
  - In the `## Documentation` list, ADD two entries (place near the existing Migration Guide line):
        `- [Harnesses](docs/harnesses.md) - Pluggable agent runtime (pi default, claude-code optional)`
        `- [Provider → Harness Migration](docs/migration-provider-to-harness.md) - v1.2 vocabulary migration`
  - DO NOT change the stale "Agents — Lightweight wrappers around the Anthropic SDK" prose (P4.M3.T2).
  - PRESERVE all other list entries and the rest of README.

Task 5: VERIFY all gates (see Validation Loop)
  - Run the Level-1 symbol cross-check + fence-balance + Level-2 section-presence + Level-3 link grep +
        `npm run lint` + `npm test`. Fix any doc error surfaced (never edit src/ to satisfy a doc check).
```

### Implementation Patterns & Key Details

**§ The canonical configureHarnesses worked example (verified — copy into §7.6):**
```ts
import { configureHarnesses } from 'groundswell';

// Set ONCE at application startup — cascades to all agents (PRD §7.7).
configureHarnesses({
  defaultHarness: 'pi',                  // vendor-neutral runtime (the default)
  defaultModelProvider: 'anthropic',     // LLM host — INDEPENDENT of the harness (§7.8)
  harnessDefaults: {
    'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

**§ The dual cascade worked example (verified algorithm — copy into §7.7):**
```ts
// Harness axis (first defined wins):  prompt ?? agent ?? global.defaultHarness
// Options merge (last write wins):    { ...global.harnessDefaults[h], ...agentOpts, ...promptOpts }
//
// Example: global.defaultHarness='pi', agent.harness='claude-code', prompt.harness omitted
//   → resolved harness = 'claude-code'  (agent wins over global; prompt absent)
//
// Model axis is SEPARATE — overriding model never changes the harness:
const response = await agent.prompt(myPrompt, {
  model: 'openai/gpt-4o',   // runs on whichever harness is active (here: claude-code would REJECT this)
});
```

**§ The §7.8 critical-rule callout (must appear in Overview AND §"Model & Provider Specification"):**
```ts
// ✅ Valid model strings — identify the LLM HOST, never the harness:
'anthropic/claude-sonnet-4-20250514'   // provider-qualified
'claude-sonnet-4-20250514'             // plain → resolved against defaultModelProvider
'openai/gpt-4o'
'google/gemini-2.5-pro'

// ❌ INVALID — the harness must NEVER appear in the model string (PRD §7.8):
'pi/anthropic/claude-sonnet-4'   // parseModelSpec throws: "Harness must not appear in model string…"
'cc/anthropic/claude-sonnet-4'   //   "
```

**§ Registry registration (explicit — NOT registerDefaultHarnesses, per Critical #1):**
```ts
import { HarnessRegistry, PiHarness, ClaudeCodeHarness } from 'groundswell';

const registry = HarnessRegistry.getInstance();
registry.register(new PiHarness());          // id 'pi'  — vendor-neutral default
registry.register(new ClaudeCodeHarness());   // id 'claude-code' — Anthropic-only
// (registerDefaultHarnesses() does the same, but is not part of the public 'groundswell' entry —
//  use the explicit register() calls above.)
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (docs only — do NOT add env vars or settings)
ROUTES: none
PUBLIC API: none (src/index.ts unchanged — you are documenting it, not editing it)
DEPS: none (no package.json change; markdownlint already in node_modules)
BUILD: docs are NOT compiled by `npm run lint` (tsc --noEmit on src/ only) — so a code-fence typo will
        NOT fail the build. The Level-1 symbol cross-check + the verified-facts discipline are the real
        quality gate. `npm test` is unaffected (no src/ change) — run it only to prove baseline holds.
```

## Validation Loop

### Level 1: Markdown & symbol correctness (the deterministic doc gate)

```bash
# (a) Fence balance — every ```ts / ``` block is closed (count of ``` must be even per file):
for f in docs/harnesses.md docs/migration-provider-to-harness.md docs/providers.md; do
  n=$(grep -c '```' "$f"); echo "$f: $n backtick-fence lines ($([ $((n%2)) -eq 0 ] && echo OK || echo UNBALANCED)";
done

# (b) PUBLIC-API SYMBOL CROSS-CHECK — every `from 'groundswell'` import resolves in src/index.ts.
#     Build the allowed-symbol set, then scan the new docs for any imported name NOT in it.
node -e '
  const fs=require("fs");
  const barrel=fs.readFileSync("src/index.ts","utf8");
  const allowed=new Set();
  const bre=/export\s+(?:type\s+)?\{([\s\S]+?)\}/g;   // [\s\S] spans newlines (multi-line exports)
  let bm; while((bm=bre.exec(barrel))){
    for(let s of bm[1].split(",")){ s=s.trim().split(/\s+as\s+/)[0].replace(/\/\/.*$/,"").trim(); if(s) allowed.add(s); }
  }
  const re=/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["'\'']groundswell["'\'']/g;
  for(const f of ["docs/harnesses.md","docs/migration-provider-to-harness.md"]){
    const txt=fs.readFileSync(f,"utf8"); let m, bad=[];
    while((m=re.exec(txt))){ for(let s of m[1].split(",")){ s=s.trim().split(/\s+as\s+/)[0]; if(s&&!allowed.has(s)) bad.push(s); } }
    console.log(f+":", bad.length? ("UNKNOWN IMPORTS -> "+[...new Set(bad)].join(", ")) : "all imports resolve ✅");
    if(bad.length) process.exitCode=1;
  }
'
# Expected: "all imports resolve ✅" for both files. If a symbol is unknown, it is either misspelled or
# internal — fix the doc (do NOT add it to src/index.ts).

# (c) INTERNAL-SYMBOL LEAK CHECK — the 3 non-public symbols must NOT appear as imports:
! grep -nE "import\s*\{[^}]*(getGlobalHarnessConfig|resolveHarnessConfig|registerDefaultHarnesses)[^}]*\}\s*from\s*[\"']" \
    docs/harnesses.md docs/migration-provider-to-harness.md
# Expected: exit 0 (no matches). If a match prints, you documented an internal API as importable —
# rewrite as prose (Critical #1).

# (d) Optional markdown lint (if the CLI resolves):
npx --no-install markdownlint-cli2 'docs/harnesses.md' 'docs/migration-provider-to-harness.md' 2>/dev/null \
  || echo "(markdownlint-cli2 not available — relying on gates a-c)"
```

### Level 2: Section-presence & verified-fact grep (content completeness)

```bash
# harnesses.md must contain every required PRD §7 subsection (Task 1 enumerated them):
for h in "Table of Contents" "Supported Harnesses" "Capabilities" "Global Harness Configuration" \
         "Configuration Cascade" "Model & Provider Specification" "Tool Execution" "Hooks" \
         "MCP, Skills" "Usage Examples" "Feature Parity" "Harness Registry" "Migrating from Provider"; do
  grep -q "$h" docs/harnesses.md && echo "✅ $h" || { echo "❌ MISSING: $h"; exit 1; }
done

# The §7.8 critical rule must be stated (headline of the model section):
grep -qiE "never (appears|part of|in) the model string|harness.*never.*model string" docs/harnesses.md \
  || { echo "❌ §7.8 critical rule not stated"; exit 1; }

# Verified facts must be present and CORRECT (not contradicted):
grep -q "defaultHarness: 'pi'" docs/harnesses.md                                # pi is the default
grep -qi "Anthropic only\|Anthropic-only" docs/harnesses.md                     # cc constraint
grep -qi "Cross-provider model translation is not supported" docs/harnesses.md  # formatModelForProvider throws

# Migration guide must contain the full rename table + non-breaking framing:
grep -qi "ClaudeCodeHarness" docs/migration-provider-to-harness.md
grep -qi "deprecated" docs/migration-provider-to-harness.md
grep -qiE "non-breaking|aliases.*(retain|still work)|still work" docs/migration-provider-to-harness.md
```

### Level 3: Cross-reference & deprecation-banner integrity

```bash
# providers.md deprecation banner present and points to both new docs:
grep -q "DEPRECATED" docs/providers.md
grep -q "harnesses.md" docs/providers.md
grep -q "migration-provider-to-harness.md" docs/providers.md

# README lists both new docs:
grep -q "docs/harnesses.md" README.md
grep -q "docs/migration-provider-to-harness.md" README.md

# Every relative doc link in the new docs targets an existing file:
for tgt in $(grep -oE '\]\(([a-z0-9_./-]+\.md)(#[^)]*)?\)' docs/harnesses.md docs/migration-provider-to-harness.md \
             | sed -E 's/.*\(([^)#]+).*/\1/' | sort -u); do
  [ -f "docs/$tgt" ] || [ -f "$tgt" ] || { echo "❌ broken link target: $tgt"; exit 1; }
done
echo "all relative doc links resolve ✅"

# examples/ untouched (P4.M3.T2 boundary):
git diff --name-only | grep -E "^examples/" && { echo "❌ examples/ modified — out of scope"; exit 1; } || echo "examples/ untouched ✅"
# src/ untouched:
git diff --name-only | grep -E "^src/" && { echo "❌ src/ modified — out of scope"; exit 1; } || echo "src/ untouched ✅"
```

### Level 4: Baseline preservation (no collateral damage)

```bash
# Docs are not compiled/tested, but prove the codebase is unchanged from baseline:
npm run lint    # tsc --noEmit on src/ — must be exit 0 (you changed no src/ file)
npm test        # vitest — must stay green (no src/ change → identical to baseline)
# Expected: both exit 0. If lint/test FAIL, you accidentally edited src/ — revert it (Critical: docs only).
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 passed: fences balanced; public-symbol cross-check = "all imports resolve ✅"; no
      internal-symbol leak (getGlobalHarnessConfig/resolveHarnessConfig/registerDefaultHarnesses not
      imported); markdownlint clean (or noted unavailable).
- [ ] Level 2 passed: all required harnesses.md subsections present; §7.8 critical rule stated;
      verified facts (pi default, Anthropic-only cc, cross-provider throw) present.
- [ ] Level 3 passed: providers.md banner present + links resolve; README lists both docs; all relative
      doc links resolve; examples/ and src/ untouched (`git diff`).
- [ ] Level 4 passed: `npm run lint` exit 0 and `npm test` green (baseline preserved).

### Feature Validation

- [ ] `docs/harnesses.md` is the authoritative §7 narrative (Overview → Supported → Interface →
      Capabilities → Options → configureHarnesses → Cascade → Model/Provider → AgentConfig/PromptOverrides
      → Tool Exec → Hooks → MCP/Skills/LSP → Usage → Parity → Registry → Migration pointer).
- [ ] §7.8 critical rule + §7 orthogonality appear in a top-level callout.
- [ ] `docs/migration-provider-to-harness.md` mirrors migration-opencode-removal.md structure and
      contains the full rename table with HONEST non-breaking framing (aliases retained).
- [ ] `docs/providers.md` shows the deprecation banner; body otherwise unchanged.
- [ ] `README.md` `## Documentation` lists both new docs.

### Code Quality Validation

- [ ] Every ```ts block imports only public `src/index.ts` symbols; documented values match
      research/findings.md verbatim (no paraphrasing of capability flags / cascade / parse semantics).
- [ ] Doc voice matches README + providers.md (H1+tagline, ToC, code-first, GitHub callouts, tables,
      version header).
- [ ] No invented APIs, no softened claims (e.g. formatModelForProvider "translates across providers"),
      no hard-removal date for the aliases.

### Documentation & Deployment

- [ ] The two new docs are internally navigable (ToC anchors resolve).
- [ ] Deprecation banner + README links make the new docs discoverable.
- [ ] No new env vars, config, or dependencies.

---

## Anti-Patterns to Avoid

- ❌ Don't **document `registerDefaultHarnesses`, `getGlobalHarnessConfig`, or `resolveHarnessConfig` as
  `from 'groundswell'` imports.** They are not in the top-level barrel and there is no `./harnesses`
  subpath export. Show explicit `HarnessRegistry.getInstance().register(new PiHarness())` and describe
  the cascade in prose. See Critical #1 — the Level-1c gate fails on any leak.
- ❌ Don't **invent or misquote an API/value.** Capability flags, configureHarnesses validation,
  parseModelSpec's rejection, formatModelForProvider's throw, the cascade algorithm, the pi default —
  all are verified in research/findings.md. Copy verbatim. A single wrong flag is a doc bug. See Critical #2.
- ❌ Don't **soften the §7.8 critical rule.** It is not "prefer provider/model"; it is "the harness
  NEVER appears in the model string and 3-segment strings THROW." Make it the headline. See Critical #3.
- ❌ Don't **rewrite or delete the providers.md body.** The contract is "add banner." See Critical #4.
- ❌ Don't **touch `examples/` or the `start:provider-*` scripts.** Owned by P4.M3.T2.S1. See Critical #5.
- ❌ Don't **frame the Provider*→Harness* rename as a breaking change / hard removal.** The aliases are
  retained and deprecated; existing code keeps working. Contrast honestly with OpenCode (hard-removed).
  See Critical #6. Do NOT invent a removal date — say "tracked follow-up" (PRD §7 intro).
- ❌ Don't **introduce a new doc style.** Mirror README + providers.md (ToC, callouts, tables). Critical #7.
- ❌ Don't **edit `src/`, `PRD.md`, `tasks.json`, `prd_snapshot.md`, `package.json`**, or any migration-*.md
  other than the one you create. If a gate fails, fix the DOC, never the code. A `src/` edit to make a
  doc example "work" is a hard scope violation.
- ❌ Don't **duplicate the AgentResponse<T> content** in harnesses.md — link to
  migration-guide-agent-response.md (it is the steady-state contract doc for both harnesses, §7.14.4).

---

## Confidence Score

**9 / 10** for one-pass implementation success.

**Rationale:** This is a documentation task whose entire factual content is already pinned down by
verified sources (PRD §7 reproduced verbatim; `src/index.ts` as the public-API gatekeeper; `src/types/`,
`src/utils/`, `src/harnesses/` for verbatim values; `external_deps.md` for package facts; and
`research/findings.md` consolidating the capability values, cascade/parse semantics, the rename table,
and — crucially — the public-vs-internal API boundary). The single highest-risk footgun (documenting
`registerDefaultHarnesses`/`getGlobalHarnessConfig`/`resolveHarnessConfig` as public imports that won't
resolve) is fully mitigated by Critical #1 + the Level-1c leak-check gate. The structural template
(mirror `migration-opencode-removal.md`) and the enumerated harnesses.md section list remove layout
ambiguity. Residual 1-point risk: an author paraphrasing a verified value (e.g., flipping a capability
flag or softening formatModelForProvider's throw) — guarded by the Level-2 verified-fact greps and
Critical #2. No external/library research remained open. The parallel item P4.M2.T1.S2 adds one test
file under `src/__tests__/` and touches nothing in `docs/` or `README.md`, so there is zero merge
conflict. No `src/` change means `npm run lint`/`npm test` are guaranteed to hold at baseline.
