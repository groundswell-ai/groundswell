# PRP — P2.M3.T2.S3: Native agentskills.io skill loading + register PiHarness as default

**PRD reference:** §7.3 (`loadSkills(skills: Skill[]): Promise<void>` on the `Harness` interface),
§7.4 (`pi` capabilities — Skills: ✓ native agentskills.io), §7.6 (`GlobalHarnessConfig`,
`defaultHarness`), §7.12 ("Skills — Pi implements agentskills.io natively and loads Claude Code skill
directories directly; skills are cross-harness with no adapter work"), §7.14.2 (Feature parity —
"Skills: Load and invoke skills"). **Plan:** `plan/004_9a50e71828f4/` — S3 of P2.M3.T2 ("PiHarness
streaming, hooks & skills"). **Consumes** P2.M2.T2.S1 (non-streaming `execute()` IIFE that calls
`createAgentSession` at ~L227) + P2.M3.T2.S1 (streaming `executeStreaming()` that calls
`createAgentSession` at ~L367) + P2.M1.T1.S2 (`src/harnesses/register-defaults.ts` with the S3 TODO)
+ P1.M2.T2.S1 (`DEFAULT_HARNESS_CONFIG.defaultHarness === 'pi'` in `src/utils/harness-config.ts`).
**Unblocks** P3.M1 (`Agent` harness resolution — needs `registry.get('pi')` to return an instance),
P3.M3.T1.S1 (public exports), P4.M2.T1.S1 (skills parity tests across `pi`+`claude-code`).
**Scope tag:** (a) implement `PiHarness.loadSkills()` via Pi's NATIVE `loadSkillsFromDir` +
`formatSkillsForPrompt`, store the XML in `this.skillsPrompt` (mirrors `ClaudeCodeHarness`); (b)
inject it into BOTH `createAgentSession` call sites via a `DefaultResourceLoader.appendSystemPrompt`;
(c) register `PiHarness` (id `'pi'`) in `register-defaults.ts`; (d) confirm `'pi'` is the effective
default; (e) mock the Pi skill functions in tests. **Parallel note:** S2 (hooks) edits the LISTENER
BODIES + `execute()` JSDoc; S3 edits the `createAgentSession` CALL SITES (~30 lines upstream of the
listeners) + the `loadSkills` stub + `register-defaults.ts`. **No overlap.** See Decision 8.

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Nine load-bearing details:
> (1) Pi's skill functions (`loadSkillsFromDir`, `formatSkillsForPrompt`, `DefaultResourceLoader`,
> `getAgentDir`) are ALL exported from the MAIN `@earendil-works/pi-coding-agent` entry → reachable as
> `this.sdk.*` (NO transitive `@earendil-works/pi-ai` import — research §1). (2) Two skill TYPES:
> Groundswell `Skill {name; path}` vs Pi `Skill {name; description; filePath; baseDir; sourceInfo;
> disableModelInvocation}`. `loadSkillsFromDir({dir: skill.path, source: skill.name})` bridges them
> and returns Pi `Skill[]` (research §2). (3) **No session re-init needed** — `execute()` creates a
> FRESH `AgentSession` per call, so `loadSkills()` state is consumed on the next `execute()` exactly
> like `registerMCPs()` (research §6). (4) Injection seam = `DefaultResourceLoader({ cwd, agentDir,
> appendSystemPrompt: [this.skillsPrompt], noSkills: true })` + `reload()`, passed to
> `createAgentSession({ resourceLoader })` (research §4-5). `appendSystemPrompt` is INDEPENDENT of
> `noSkills`, so `noSkills: true` gives parity (no Pi-default skills) while our XML is still appended.
> (5) When `skillsPrompt === ""`, OMIT `resourceLoader` → Pi builds its own default loader → current
> behavior 100% preserved (no regression in execute/streaming suites). (6) `formatSkillsForPrompt`
> EXCLUDES `disableModelInvocation: true` skills (Pi handles this — we just pass through). (7) Mirror
> `ClaudeCodeHarness.skillsPrompt` field name + TWO-site injection for parity. (8) S3's
> `createAgentSession` edits are UPSTREAM of S2's listener edits — non-overlapping regions; both can
> land independently. (9) `defaultHarness` is ALREADY `'pi'`; S3 only adds the INSTANCE registration.

---

## Goal

**Feature Goal:** Make `PiHarness` load skills via Pi's NATIVE agentskills.io implementation
(`loadSkillsFromDir` + `formatSkillsForPrompt`) and inject them into the session's system prompt on
`execute()` (PRD §7.12, §7.14.2), achieving skill PARITY with `ClaudeCodeHarness`. Additionally,
register `PiHarness` (id `'pi'`) in `register-defaults.ts` so the default harness id resolves to a
live instance (PRD §7.6). After S3: `registry.get('pi')` returns a `PiHarness`; a consumer calling
`harness.loadSkills([{name, path}])` then `harness.execute(...)` has those skills present in the
session's system prompt as agentskills.io XML — identical in EFFECT to `ClaudeCodeHarness`
(which reads the same `SKILL.md` and injects via system prompt).

**Deliverable:**
1. **MODIFY `src/harnesses/pi-harness.ts`**:
   - ADD a `private skillsPrompt: string = "";` field (mirror ClaudeCodeHarness L194-200).
   - REPLACE the throwing `loadSkills(_skills)` stub with the real impl: init guard → empty-array
     short-circuit → for each Groundswell `Skill`, call `this.sdk.loadSkillsFromDir({dir: skill.path,
     source: skill.name})`, collect `.skills` into a `PiSkill[]`, wrap per-skill errors →
     `this.skillsPrompt = this.sdk.formatSkillsForPrompt(collected)`.
   - ADD `private async buildSkillsResourceLoader(): Promise<DefaultResourceLoader | undefined>` —
     returns `undefined` when `!this.skillsPrompt` (current behavior preserved); else builds a
     `new this.sdk.DefaultResourceLoader({ cwd: process.cwd(), agentDir: this.sdk.getAgentDir(),
     appendSystemPrompt: [this.skillsPrompt], noSkills: true })`, `await reload()`, returns it.
   - WIRE the loader into BOTH `createAgentSession` calls: build `const resourceLoader = await
     this.buildSkillsResourceLoader();` then spread `...(resourceLoader ? { resourceLoader } : {})`
     into the options object (non-streaming execute() ~L227; streaming executeStreaming() ~L367).
   - ADD `import type { Skill as PiSkill }` to the existing Pi type-import block (rename avoids the
     Groundswell `Skill` collision). `loadSkillsFromDir`/`formatSkillsForPrompt`/`DefaultResourceLoader`/
     `getAgentDir` are VALUES reached via `this.sdk.*` (no value import).
   - LEAVE the drain loop, listeners, `fireHookEvents` (S2), customTools, resolveModel, initialize/
     terminate, normalizeModel, registerMCPs, supports/requiresFeatures UNCHANGED.
2. **MODIFY `src/harnesses/register-defaults.ts`** — replace the S3 TODO block with a real
   `if (!registry.has('pi')) registry.register(new PiHarness());`; add `import { PiHarness } from
   './pi-harness.js';` at the top; update the JSDoc to list BOTH harnesses.
3. **CONFIRM** (no code change) that `getGlobalHarnessConfig().defaultHarness === 'pi'` (already true
   via `DEFAULT_HARNESS_CONFIG` in `src/utils/harness-config.ts`) — assert it in the test.
4. **NEW `src/__tests__/unit/providers/pi-harness-loadskills.test.ts`** — mock the Pi skill functions
   via the private-field overwrite idiom (mirror `wireFakeSession`); assert the loadSkills contract.
5. **NEW `src/__tests__/unit/providers/register-defaults.test.ts`** — assert both harnesses are
   registered, `'pi'` is a `PiHarness`, idempotency, and `defaultHarness === 'pi'`.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `pi-harness.ts` + `register-defaults.ts` compile; the
   `PiSkill` type import + `this.sdk.*` value access typecheck; the conditional spread is sound.
2. `npm test` exits 0 — new loadSkills suite + new register-defaults suite + full regression green.
3. `npm run build` exits 0 — `dist/harnesses/pi-harness.{js,d.ts}` emits `skillsPrompt` +
   `buildSkillsResourceLoader` + the real `loadSkills`; `register-defaults.js` registers `'pi'`.
4. Runtime spot-check (vitest fake-session): a `PiHarness` whose `this.sdk.loadSkillsFromDir` returns
   `{skills: [piSkillA]}` and `formatSkillsForPrompt` returns `<skills>…</skills>`, after
   `await harness.loadSkills([{name:'a', path:'/x'}])`, has `this.skillsPrompt === '<skills>…</skills>'`;
   a subsequent `execute(...)` calls `createAgentSession` with an options object whose `resourceLoader`
   is a `DefaultResourceLoader` (captured via spy). With NO skills loaded, `createAgentSession` is
   called with NO `resourceLoader` field (current behavior preserved).
5. Contract (grep): `private skillsPrompt`, `this.sdk.loadSkillsFromDir`, `this.sdk.formatSkillsForPrompt`,
   `this.sdk.DefaultResourceLoader`, `appendSystemPrompt: [this.skillsPrompt]`, `noSkills: true`,
   `buildSkillsResourceLoader`, `...(resourceLoader ? { resourceLoader } : {})` (2 hits — both
   createAgentSession calls); NO `@earendil-works/pi-ai` import; `register-defaults.ts` has NO TODO
   block; `registry.register(new PiHarness())` present.

---

## ⚠️ SCOPE DECISIONS — nine load-bearing details

### Decision 1 — Pi skill functions are on the MAIN entry (hoisted; no transitive import)

Verified (`dist/index.d.ts` L2/L14/L15/L19): `loadSkillsFromDir`, `formatSkillsForPrompt`,
`DefaultResourceLoader`, `getAgentDir` are all exported VALUES; `Skill` is an exported TYPE — ALL
from `@earendil-works/pi-coding-agent` (the package `PiHarness.sdk` already lazy-imports). Reach them
as `this.sdk.loadSkillsFromDir`, `this.sdk.formatSkillsForPrompt`, `this.sdk.DefaultResourceLoader`,
`this.sdk.getAgentDir`. **Do NOT** import from `@earendil-works/pi-ai` or `@earendil-works/pi-agent-core`
(non-hoisted transitives → `MODULE_NOT_FOUND`, confirmed by S2's GOTCHA #8). (Research §1.)

### Decision 2 — Two Skill types; loadSkillsFromDir bridges them

Groundswell `Skill` (`src/types/sdk-primitives.ts`) = `{ name: string; path: string }`. Pi `Skill`
(`dist/core/skills.d.ts`) = `{ name; description; filePath; baseDir; sourceInfo; disableModelInvocation }`.
The bridge is **per Groundswell skill**: `this.sdk.loadSkillsFromDir({ dir: skill.path, source:
skill.name })` → returns `{ skills: PiSkill[]; diagnostics }`. Collect ALL returned `PiSkill[]` into
one array, then `this.sdk.formatSkillsForPrompt(allCollected)` → ONE agentskills.io XML string.
This is EXACTLY the item's directive ("map each Skill.path to loadSkillsFromDir({dir, source}) and
feed into the session's system prompt via formatSkillsForPrompt"). Import Pi's type as `PiSkill`
(rename) to avoid the name collision with Groundswell's `Skill` (already imported L17).
(Research §2, §10.)

### Decision 3 — No session re-init needed (document this — resolves the item's open question)

The item says: *"registerMCPs/loadSkills may require session re-init—document."* Resolution:
**it does NOT**, because `PiHarness.execute()` (P2.M2.T2.S1) and `executeStreaming()` (P2.M3.T2.S1)
create a FRESH `AgentSession` per call via `createAgentSession(...)`. Therefore `loadSkills()` state
(stored in `this.skillsPrompt`) is naturally consumed by the NEXT `execute()` when it builds the
`DefaultResourceLoader` — exactly mirroring how `registerMCPs()` state (`this.mcpHandler`) is consumed
when `execute()` builds `customTools`. **Document this in the `loadSkills` JSDoc** + a code comment at
the injection site: "PiHarness creates a fresh AgentSession per execute() call, so loadSkills() state
takes effect on the next execute() — no session rebuild is required." (Research §6.)

### Decision 4 — Injection seam = DefaultResourceLoader.appendSystemPrompt + resourceLoader

`CreateAgentSessionOptions` (verified `dist/core/sdk.d.ts`) has NO `systemPrompt` field and NO
`skillPaths`/`skills` field — only `resourceLoader?: ResourceLoader`. `AgentSession.systemPrompt` is a
read-only getter; `prompt(text, options?)` takes no system-prompt override (`PromptOptions` only has
`expandPromptTemplates/images/streamingBehavior/source/preflightResult`). Therefore the ONLY public
seam to put text into the session's system prompt is a `DefaultResourceLoader` constructed with
`appendSystemPrompt: string[]`, passed to `createAgentSession({ resourceLoader })`. createAgentSession
uses a caller-provided loader **AS-IS** (it does NOT `reload()` it — see `sdk.js`: `if (!resourceLoader)
{ resourceLoader = new DefaultResourceLoader(...); await resourceLoader.reload(); }`), so WE must
`await loader.reload()` before passing it. (Research §4-5.) This is the item's "feed into the session's
system prompt via formatSkillsForPrompt" path. The alternative ("pass skillPaths to resourceLoader")
is rejected because it would make `loadSkills()` NOT call `formatSkillsForPrompt` (the item's lead
directive) and would be harder to unit-test.

### Decision 5 — noSkills: true for parity; appendSystemPrompt is independent

`DefaultResourceLoaderOptions.noSkills: boolean` suppresses Pi's DEFAULT skill discovery
(`~/.pi/agent/skills`, cwd-local skills). PRD §7.12 + §7.14.2 require cross-harness parity: the SAME
Groundswell `Skill[]` must produce the SAME skills regardless of harness. `ClaudeCodeHarness` builds
its prompt ONLY from the passed skills (reads each `SKILL.md`). So `PiHarness` must NOT also pull in
Pi's own defaults → **`noSkills: true`**. Critically, `appendSystemPrompt` is a SEPARATE source (it
appends to the system prompt regardless of skill discovery), so `noSkills: true` +
`appendSystemPrompt: [this.skillsPrompt]` = "no Pi-default skills, but our agentskills.io XML IS
appended." Verified in `dist/core/resource-loader.d.ts` (independent fields). (Research §4.)

### Decision 6 — Omit resourceLoader when skillsPrompt is empty (zero regression)

When `loadSkills()` has not been called (or was called with `[]`), `this.skillsPrompt === ""`. In that
case `buildSkillsResourceLoader()` returns `undefined`, and the `...(resourceLoader ? { resourceLoader }
: {})` spread adds NO field to the `createAgentSession` options → Pi builds its OWN default loader
exactly as it does TODAY. This guarantees the existing `pi-harness-execute.test.ts` +
`pi-harness-streaming.test.ts` suites (which never call `loadSkills`) see byte-identical behavior.
**This is the key regression-safety property.** (Research §5, §9.)

### Decision 7 — formatSkillsForPrompt handles disableModelInvocation (pass through)

`formatSkillsForPrompt` filters OUT skills where `disableModelInvocation === true` (verified
`skills.js` L258). `loadSkillsFromDir` sets that flag from the SKILL.md frontmatter
`disable-model-invocation`. We do NOT reimplement this filtering — we pass the full collected
`PiSkill[]` to `formatSkillsForPrompt` and let Pi apply its spec-correct filter. Test it: a skill
whose `loadSkillsFromDir` result has `disableModelInvocation: true` still flows through (we don't
filter), and the mock `formatSkillsForPrompt` receives it. (Research §3.)

### Decision 8 — S3 edits are UPSTREAM of S2's edits (non-overlapping; both land independently)

S2 (hooks, parallel) edits: (a) the LISTENER BODIES in both `execute()` (~L240-274) and
`executeStreaming()` (~L370-386) — adds `fireHookEvents`; (b) the `execute()` JSDoc "Remaining hooks"
line (~L186-189). S3 edits: (a) the `createAgentSession` CALL SITE in `execute()` (~L227-234, BEFORE
the listener) and in `executeStreaming()` (~L367-373, BEFORE the listener); (b) the `loadSkills`
stub (~bottom of class); (c) `register-defaults.ts`. The `createAgentSession` call sites are ~15-50
lines UPSTREAM of the listeners S2 touches — **zero line overlap**. Both PRPs can merge cleanly.
S3 does NOT touch the listeners, the drain loop, `fireHookEvents`, customTools, or the JSDoc
"Remaining hooks" line. (Verify in Task 0 pre-flight.)

### Decision 9 — 'pi' default is already configured; S3 adds the INSTANCE

`src/utils/harness-config.ts` `DEFAULT_HARNESS_CONFIG = { defaultHarness: 'pi' }` (P1.M2.T2.S1).
`getGlobalHarnessConfig()` returns it when `configureHarnesses()` hasn't been called. So the default
HARNESS ID is already `'pi'`. The ONLY missing piece is that `register-defaults.ts` doesn't register a
`PiHarness` INSTANCE — so `registry.get('pi')` returns `undefined` today. S3 adds the registration
(idempotent `if (!registry.has('pi'))` guard, mirroring the ClaudeCodeHarness registration 3 lines
above). After S3: `registry.get('pi') instanceof PiHarness` AND
`getGlobalHarnessConfig().defaultHarness === 'pi'` → `'pi'` is the EFFECTIVE default. (Research §8.)

---

## User Persona

**Target User:** Groundswell core maintainers + downstream consumers:
- **P3.M1 (`Agent`)** — `Agent` resolves its harness via `HarnessRegistry.get(resolvedHarnessId)`;
  with the default `'pi'`, it needs `registry.get('pi')` to return a live `PiHarness`. Until S3, the
  default harness id resolves to `undefined` → `Agent` construction throws or no-ops.
- **P3.M3.T1.S1 (public exports)** — exports `PiHarness` + `registerDefaultHarnesses`; S3 makes the
  latter actually register `pi`.
- **P4.M2.T1.S1 (parity tests)** — asserts skills load + reach the system prompt identically on both
  harnesses (§7.14.2). Until S3, `PiHarness.loadSkills` throws → parity untestable.

**Use Case:** A Groundswell user calls `agent.loadSkills([{name:'tdd', path:'~/.claude/skills/tdd'}])`
then `agent.prompt('write a test')`. On the default `pi` harness, the `tdd` skill's `SKILL.md` must
appear in the model's system prompt as agentskills.io XML — identical to what `claude-code` produces.

**Pain Points Addressed:** Until S3, `PiHarness.loadSkills()` throws ("not implemented"), so skills
are silently unavailable on the DEFAULT harness; and `registry.get('pi')` is `undefined`, so the
default harness id can't actually be used.

---

## Why

- **Realizes PRD §7.12** — "Pi implements agentskills.io natively." S3 wires the native loaders.
- **Delivers skill parity (§7.14.2)** — `loadSkills` + injection make `pi` behave like `claude-code`.
- **Makes `'pi'` the EFFECTIVE default** — pairs the `'pi'` default id (P1.M2.T2.S1) with a registered
  instance, completing PRD §7.6.
- **Unblocks P3.M1 / P3.M3 / P4.M2** — `Agent` can resolve + use the default harness; parity tests
  can assert skills work on both.

---

## What

1. **MODIFY** `src/harnesses/pi-harness.ts` — `skillsPrompt` field + real `loadSkills()` +
   `buildSkillsResourceLoader()` + 2× `createAgentSession` wiring + `PiSkill` type import.
2. **MODIFY** `src/harnesses/register-defaults.ts` — register `PiHarness`; update JSDoc.
3. **CREATE** `src/__tests__/unit/providers/pi-harness-loadskills.test.ts` — loadSkills contract.
4. **CREATE** `src/__tests__/unit/providers/register-defaults.test.ts` — registration + default.
5. **VALIDATE** (lint / targeted tests / full suite / build / grep contract + runtime spot-check).

### Success Criteria

- [ ] `loadSkills([])` sets `this.skillsPrompt = ""` (empty short-circuit; mirror ClaudeCodeHarness).
- [ ] `loadSkills([{name, path}])` calls `this.sdk.loadSkillsFromDir({dir: path, source: name})` per
      skill, collects `.skills`, then `this.sdk.formatSkillsForPrompt(collected)`, stores the result
      in `this.skillsPrompt`.
- [ ] A per-skill `loadSkillsFromDir` throw is wrapped: `Error` message includes the skill `name` +
      `path` (mirror ClaudeCodeHarness L983-988 error wrapping).
- [ ] `loadSkills()` throws `/not initialized/i` when `this.sdk` is null (init guard).
- [ ] After `loadSkills([...])`, `execute()` (non-streaming) AND `executeStreaming()` pass a
      `resourceLoader` (a `DefaultResourceLoader`) into `createAgentSession`.
- [ ] With NO skills loaded, `createAgentSession` is called with NO `resourceLoader` field
      (regression — current behavior preserved).
- [ ] `registerDefaultHarnesses()` registers BOTH `'claude-code'` AND `'pi'`; `registry.get('pi')
      instanceof PiHarness`; calling it twice does NOT throw (idempotent).
- [ ] `getGlobalHarnessConfig().defaultHarness === 'pi'`.
- [ ] The drain loop, listeners, `fireHookEvents` (S2), customTools, session hooks, resolveModel,
      initialize/terminate, normalizeModel, registerMCPs are all UNCHANGED.
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0.
- [ ] No import of `@earendil-works/pi-ai` / `@earendil-works/pi-agent-core` (grep clean).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S3 using only
(a) this PRP, (b) read-only access to `src/harnesses/pi-harness.ts` (the file with the throwing
`loadSkills` stub + both `createAgentSession` call sites), `src/harnesses/claude-code-harness.ts`
(`skillsPrompt` field L194-200 + `loadSkills` L958-988 + `buildSystemPromptWithSkills` — the parity
reference), `src/harnesses/register-defaults.ts` (the S3 TODO block), `src/__tests__/unit/providers/
pi-harness-execute.test.ts` (`makeFakeSession`/`wireFakeSession` L24-56 — the private-field overwrite
idiom to copy for mocking the Pi skill functions), `src/__tests__/unit/providers/
pi-harness-registermcps.test.ts` (the closest test-pattern analog — init guard, empty-array,
error-wrapping, accumulation), and (c) the copy-paste-ready snippets in "Implementation Patterns" +
`research/skill-loading-api-verified.md`. The nine load-bearing decisions (main-entry exports,
two-Skill-types, no-re-init, appendSystemPrompt seam, noSkills parity, empty-omit regression,
disableModelInvocation passthrough, S2 non-overlap, default-already-pi) are proven in the research note.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (PRD §7 harness + skills).
- url: PRD.md §7.3, §7.4, §7.6, §7.12, §7.14.2   (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.3 = Harness.loadSkills(skills: Skill[]): Promise<void> (the method signature S3 implements);
       §7.4 = pi capabilities (Skills: ✓ native agentskills.io); §7.6 = GlobalHarnessConfig.defaultHarness;
       §7.12 = "Pi implements agentskills.io natively and loads Claude Code skill directories directly;
       skills cross-harness with no adapter work"; §7.14.2 = Skills parity requirement.
  critical: §7.3 is the exact method signature; §7.12 is the design rationale; §7.14.2 is the parity gate.

# MUST READ — the verified Pi SDK skill API (every signature S3 calls).
- file: plan/004_9a50e71828f4/P2M3T2S3/research/skill-loading-api-verified.md
  why: §1 = main-entry exports (loadSkillsFromDir/formatSkillsForPrompt/DefaultResourceLoader/getAgentDir
       ALL hoisted on @earendil-works/pi-coding-agent → this.sdk.*); §2 = loadSkillsFromDir sig + the
       Groundswell-Skill→Pi-Skill bridge ({dir, source} → {skills, diagnostics}); §3 = formatSkillsForPrompt
       (agentskills.io XML; excludes disableModelInvocation); §4 = DefaultResourceLoaderOptions
       (appendSystemPrompt + noSkills are INDEPENDENT); §5 = createAgentSession uses a caller loader AS-IS
       (we must reload()); §6 = no-re-init insight; §7 = ClaudeCodeHarness parity; §8 = register-defaults delta;
       §9 = testing surface; §10 = type-import decisions.
  critical: §1 (no transitive import), §2 (the bridge), §4-5 (the injection seam), §6 (no re-init) are the
            four most load-bearing facts.

# MUST READ — the external-deps brief (Pi SDK surface + adapter-design implications).
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.5 = the verified Pi Skill/loadSkills/loadSkillsFromDir/formatSkillsForPrompt surface;
       §1.1 = CreateAgentSessionOptions (resourceLoader is the ONLY skill-injection seam); §3 =
       agentskills.io standard (skill = dir with SKILL.md; XML format); §4 = the ClaudeCodeHarness-vs-
       PiHarness skills column ("native loadSkills + formatSkillsForPrompt" vs "system-prompt append").
  critical: §1.5 (the native loaders) + §1.1 (resourceLoader seam) + §3 (cross-harness standard).

# MUST READ — the parity reference (ClaudeCodeHarness skillsPrompt + loadSkills + injection).
- file: src/harnesses/claude-code-harness.ts
  why: L194-200 = `private skillsPrompt: string = "";` field (COPY the field); L958-988 = loadSkills()
       (init guard, empty short-circuit, per-skill read, error wrapping with skill name+path — COPY the
       structure, SWAP the body to loadSkillsFromDir+formatSkillsForPrompt); L1011+ = buildSystemPromptWithSkills
       (the injection helper — Pi's analog is buildSkillsResourceLoader); L450 + L676 = TWO-site injection.
  pattern: same FIELD name (skillsPrompt) + same TWO-site injection + same error-wrapping shape. DIFFERENCE:
           Pi loads NATIVELY (no manual readFile) and formats to agentskills.io XML (not markdown join).

# MUST READ — the file S3 modifies (the loadSkills stub + both createAgentSession call sites).
- file: src/harnesses/pi-harness.ts
  why: L1-40 = imports block (ADD `Skill as PiSkill` to the existing @earendil-works/pi-coding-agent
       type-import); ~L48 = PiModel type alias (ADD the skillsPrompt field near the other private fields
       ~L177-189); ~L186-189 = execute() JSDoc (S3 may add a "Skills inject via buildSkillsResourceLoader"
       note — coordinate with S2 which edits the "Remaining hooks" line — see Decision 8); ~L227-234 =
       non-streaming createAgentSession call (S3 ADDS the resourceLoader spread); ~L367-373 = streaming
       createAgentSession call (S3 ADDS the resourceLoader spread); the throwing `loadSkills` stub near
       the bottom (S3 REPLACES it); L17 already imports Groundswell `Skill` (NO new value import).
  gotcha: The two createAgentSession calls are ~15-50 lines UPSTREAM of the listeners S2 edits (Decision 8).
          Place buildSkillsResourceLoader() as a private method immediately AFTER loadSkills (keep order:
          loadSkills → buildSkillsResourceLoader → registerMCPs).

# MUST READ — register-defaults.ts (the exact TODO S3 replaces).
- file: src/harnesses/register-defaults.ts
  why: the file is small (~40 lines); the S3 TODO block is inline at the bottom of registerDefaultHarnesses().
       COPY the ClaudeCodeHarness registration pattern 3 lines above (idempotent `if (!registry.has(id))`
       guard). Update the file-level JSDoc to list BOTH harnesses.
  pattern: `const PI: HarnessId = 'pi'; if (!registry.has(PI)) registry.register(new PiHarness());`

# SHOULD READ — the fake-session test idiom (copy for mocking the Pi skill functions).
- file: src/__tests__/unit/providers/pi-harness-execute.test.ts
  why: L24-42 = makeFakeSession (the @ts-expect-error private-field overwrite pattern); L43-56 =
       wireFakeSession (overwrites harness.sdk with {...harness.sdk, createAgentSession: vi.fn()...});
       L57-60 = scripted payloads. For loadSkills tests, overwrite harness.sdk.loadSkillsFromDir +
       formatSkillsForPrompt with vi.fn() using the SAME idiom.
  pattern: `// @ts-expect-error - private field access for testing; harness.sdk = { ...harness.sdk,
           loadSkillsFromDir: vi.fn(() => ({ skills: [piSkill], diagnostics: [] })),
           formatSkillsForPrompt: vi.fn((s) => '<skills>' + s.length + '</skills>') };`

# SHOULD READ — the closest test-pattern analog (registerMCPs mirrors loadSkills: stores state).
- file: src/__tests__/unit/providers/pi-harness-registermcps.test.ts
  why: the describe/it structure + init-guard case + empty-array case + error-wrapping case +
       accumulation case mirror DIRECTLY onto loadSkills. beforeEach does `new PiHarness();
       await harness.initialize(); HarnessRegistry._resetForTesting();`.
  pattern: one describe per behavior (init guard, empty array, single skill, multiple skills,
           error wrapping, disableModelInvocation passthrough, skillsPrompt stored).
```

### Current Codebase tree (relevant slice)

```bash
src/harnesses/
├── claude-code-harness.ts   # REFERENCE (skillsPrompt L194-200; loadSkills L958-988; buildSystemPromptWithSkills L1011+)
├── harness-registry.ts      # CONSUMER (register/has/get/_resetForTesting — already used by register-defaults)
├── index.ts                 # untouched (barrel)
├── pi-harness.ts            # ← MODIFY (skillsPrompt field + loadSkills + buildSkillsResourceLoader + 2× wiring + PiSkill import)
├── register-defaults.ts     # ← MODIFY (register PiHarness; update JSDoc)
└── session-store.ts         # untouched
src/types/
├── sdk-primitives.ts        # CONSUMER (Groundswell Skill {name, path} — already imported L17)
└── ...                      # untouched
src/utils/
└── harness-config.ts        # CONFIRM-ONLY (DEFAULT_HARNESS_CONFIG.defaultHarness === 'pi' — already true)
src/__tests__/unit/providers/
├── pi-harness.test.ts                       # untouched
├── pi-harness-execute.test.ts               # untouched (no loadSkills call → no resourceLoader → regression-safe)
├── pi-harness-streaming.test.ts             # untouched (same — no loadSkills call)
├── pi-harness-initialize.test.ts            # untouched
├── pi-harness-normalizemodel.test.ts        # untouched
├── pi-harness-resolvemodel.test.ts          # untouched
├── pi-harness-registermcps.test.ts          # REFERENCE (test pattern to mirror)
├── pi-harness-customtools.test.ts           # untouched
├── pi-harness-loadskills.test.ts            # ← NEW
└── register-defaults.test.ts                # ← NEW
node_modules/@earendil-works/pi-coding-agent/dist/core/skills.d.ts          # READ-ONLY (Pi Skill/loadSkillsFromDir/formatSkillsForPrompt)
node_modules/@earendil-works/pi-coding-agent/dist/core/resource-loader.d.ts # READ-ONLY (DefaultResourceLoaderOptions)
node_modules/@earendil-works/pi-coding-agent/dist/core/sdk.{d.ts,js}        # READ-ONLY (CreateAgentSessionOptions + createAgentSession impl)
node_modules/@earendil-works/pi-ai/                                          # NON-HOISTED — DO NOT IMPORT
```

### Desired Codebase tree with files to be added/changed

```bash
src/harnesses/pi-harness.ts                          # MODIFY (skillsPrompt + loadSkills + buildSkillsResourceLoader + 2× wiring + PiSkill import)
src/harnesses/register-defaults.ts                   # MODIFY (register PiHarness + JSDoc)
src/__tests__/unit/providers/pi-harness-loadskills.test.ts   # NEW
src/__tests__/unit/providers/register-defaults.test.ts       # NEW
# (listeners, drain loop, fireHookEvents (S2), customTools, types, barrels, registry, other harnesses — UNTOUCHED.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Pi skill functions are on the MAIN entry. loadSkillsFromDir / formatSkillsForPrompt /
//   DefaultResourceLoader / getAgentDir are VALUES reachable via this.sdk.* (this.sdk is
//   typeof import("@earendil-works/pi-coding-agent")). Do NOT import them as values. Do NOT import
//   from @earendil-works/pi-ai or pi-agent-core (non-hoisted → MODULE_NOT_FOUND). (Decision 1.)

// CRITICAL #2 — Two Skill types. Groundswell Skill {name; path} (sdk-primitives.ts, imported L17)
//   vs Pi Skill {name; description; filePath; baseDir; sourceInfo; disableModelInvocation}. Import
//   Pi's as `Skill as PiSkill` (type) to avoid the name collision. loadSkillsFromDir returns Pi Skill[].
//   (Decision 2.)

// CRITICAL #3 — loadSkillsFromDir is SYNC (returns, not a Promise) but may THROW on unreadable paths.
//   Wrap in try/catch per skill; rethrow as `Error("Failed to load skill '<name>' from <path>: <msg>")`
//   (mirror ClaudeCodeHarness L983-988). loadSkills itself stays async (it's declared Promise<void>).

// CRITICAL #4 — No session re-init. execute() creates a FRESH AgentSession per call (P2.M2.T2.S1),
//   so loadSkills() state (this.skillsPrompt) is consumed on the next execute() via
//   buildSkillsResourceLoader(). Document this in the loadSkills JSDoc + an inline comment at the
//   injection site. A long-lived-session model would need explicit rebuild. (Decision 3.)

// CRITICAL #5 — Injection seam is DefaultResourceLoader.appendSystemPrompt + resourceLoader. There is
//   NO systemPrompt/skillPaths field on CreateAgentSessionOptions; session.systemPrompt is read-only;
//   prompt() takes no system-prompt override. DefaultResourceLoader is the ONLY seam. createAgentSession
//   uses a caller loader AS-IS (no reload) → WE must await loader.reload(). (Decision 4.)

// CRITICAL #6 — noSkills: true for parity, and appendSystemPrompt is INDEPENDENT of noSkills. So
//   noSkills:true + appendSystemPrompt:[xml] = no Pi-default skills (parity with ClaudeCodeHarness)
//   but our agentskills.io XML IS appended. Do NOT drop noSkills (would mix in Pi's own skills →
//   breaks cross-harness parity). (Decision 5.)

// CRITICAL #7 — When skillsPrompt === "", OMIT resourceLoader (return undefined from
//   buildSkillsResourceLoader; conditional spread adds no field). This preserves current execute()
//   behavior byte-for-byte (Pi builds its own default loader) → ZERO regression in execute/streaming
//   suites. NEVER unconditionally pass a resourceLoader. (Decision 6.)

// GOTCHA #8 — formatSkillsForPrompt excludes disableModelInvocation:true skills (Pi applies the
//   agentskills.io filter internally). Do NOT reimplement the filter — pass the full collected
//   PiSkill[] through. loadSkillsFromDir sets the flag from SKILL.md frontmatter. (Decision 7.)

// GOTCHA #9 — S3's createAgentSession edits are UPSTREAM of S2's listener edits. Both land independently.
//   Do NOT touch the listener bodies, the drain loop, fireHookEvents, or the execute() JSDoc
//   "Remaining hooks" line (S2 owns those). If S2 has already merged, your diff still applies cleanly
//   (different regions). (Decision 8.)

// GOTCHA #10 — loadSkillsFromDir({dir, source}) discovery: if dir has SKILL.md → skill root (no
//   recurse); else .md children; else recurse subdirs. A Groundswell Skill.path MUST point at a dir
//   containing (or recursively containing) SKILL.md, else .skills is empty (no throw). That's fine —
//   formatSkillsForPrompt([]) returns "".

// GOTCHA #11 — The conditional spread `...(resourceLoader ? { resourceLoader } : {})` must typecheck
//   against CreateAgentSessionOptions. resourceLoader is `DefaultResourceLoader | undefined`;
//   DefaultResourceLoader implements ResourceLoader. The narrowed `{ resourceLoader }` arm is
//   assignable. (Verify in Task 4 lint.)

// GOTCHA #12 — isolatedModules: true (tsconfig.json). `import type { Skill as PiSkill }` is required
//   (type-only). Do NOT use a value import for PiSkill. The Groundswell Skill (L17) is already a type
//   import — leave it. No new VALUE imports (all Pi functions reached via this.sdk.*).

// GOTCHA #13 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks
//   pi-harness.ts + register-defaults.ts (proving the impl compiles + no forbidden transitive import).
//   Test type errors surface in `npm test` (vitest/esbuild). Run BOTH.

// GOTCHA #14 — Registering PiHarness in register-defaults does NOT initialize it. register() just
//   stores the instance (Map.set). PiHarness.initialize() lazy-imports the Pi SDK — that only runs
//   when a consumer calls registry.initializeProvider('pi') or harness.initialize() explicitly. So
//   registerDefaultHarnesses() stays cheap. (Don't add an initialize call — init policy is P3.M1's job.)

// GOTCHA #15 — register-defaults.ts is idempotent via `if (!registry.has(id))`. The HarnessRegistry
//   .register() THROWS on duplicate id; the guard prevents that. Mirror the ClaudeCodeHarness block
//   exactly. Test idempotency by calling registerDefaultHarnesses() twice.

// GOTCHA #16 — The fake-session test idiom (makeFakeSession/wireFakeSession) overwrites
//   harness.sdk.createAgentSession → the REAL DefaultResourceLoader is NEVER exercised in execute()
//   tests. So to test the injection, SPY on the overwritten createAgentSession and assert the
//   `resourceLoader` field of the options it received. To test loadSkills in isolation, overwrite
//   harness.sdk.loadSkillsFromDir + formatSkillsForPrompt (same private-field idiom).

// GOTCHA #17 — DefaultResourceLoaderOptions REQUIRES cwd + agentDir (both non-optional strings).
//   cwd = process.cwd(); agentDir = this.sdk.getAgentDir() (the ~/.pi/agent default). settingsManager
//   is OPTIONAL — omit it (the loader creates one internally if needed; we only need appendSystemPrompt).
```

---

## Implementation Blueprint

### Data models and structure

ONE new private field (`skillsPrompt`), ONE new type import (`PiSkill`), ONE new private async method
(`buildSkillsResourceLoader`), and the REPLACEMENT of the `loadSkills` stub. **No new value imports**
beyond what pi-harness.ts already has — all Pi functions are reached via `this.sdk.*`.

> If a pre-flight grep shows `Skill` is NOT imported from sdk-primitives in pi-harness.ts (it IS — L17),
> do not re-add it. Add ONLY `Skill as PiSkill` to the Pi type-import block (L9-17 region).

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note baseline (parallel S2 may have edits in flight).
  - RUN: `grep -nE "loadSkills|createAgentSession|skillsPrompt|buildSkillsResourceLoader|loadSkillsFromDir|formatSkillsForPrompt" src/harnesses/pi-harness.ts`
        → confirm: (a) the throwing loadSkills stub exists (S3 replaces it); (b) TWO createAgentSession
        calls exist (non-streaming ~L227, streaming ~L367 — S3 wires both); (c) skillsPrompt does NOT
        exist yet; (d) NO loadSkillsFromDir/formatSkillsForPrompt references yet.
  - RUN: `grep -nE "TODO\(P2.M3.T2.S3\)|registry.register|has\(" src/harnesses/register-defaults.ts` → the S3 TODO block present.
  - RUN: `node -e "try{require('@earendil-works/pi-ai');console.log('RESOLVABLE')}catch(e){console.log('BLOCKED')}"` → BLOCKED (Decision 1/GOTCHA #1 confirmed).
  - RUN: `grep -n "defaultHarness" src/utils/harness-config.ts` → `defaultHarness: 'pi'` (Decision 9).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN (allow for S2's in-flight state; if S2
        partially landed, its hooks test may reference things — note but don't block).

Task 1: MODIFY src/harnesses/pi-harness.ts (skillsPrompt + loadSkills + buildSkillsResourceLoader + wiring)
  - ADD to the existing Pi type-import block: `Skill as PiSkill` (type-only). e.g. change
    `import type { AgentSession, AgentSessionEvent, AgentSessionEventListener } from "@earendil-works/pi-coding-agent";`
    → add `, Skill as PiSkill` before the closing `"`. (NO value import for loadSkillsFromDir etc.)
  - ADD the `private skillsPrompt: string = "";` field near the other private state (~L177-189, next
    to `mcpHandler`). Mirror ClaudeCodeHarness L194-200 JSDoc.
  - REPLACE the throwing loadSkills stub with the real impl (see "Implementation Patterns"). Keep the
    method async (Promise<void>), init guard, empty short-circuit, per-skill loadSkillsFromDir +
    error wrap, then formatSkillsForPrompt → this.skillsPrompt.
  - ADD `private async buildSkillsResourceLoader(): Promise<DefaultResourceLoader | undefined>` (see
    "Implementation Patterns"). Returns undefined when !skillsPrompt; else builds + reloads a
    DefaultResourceLoader with appendSystemPrompt + noSkills:true.
  - WIRE non-streaming createAgentSession (~L227-234): add `const resourceLoader = await
    this.buildSkillsResourceLoader();` before the call; add `...(resourceLoader ? { resourceLoader }
    : {})` into the options object. (Await is safe — the IIFE is async.)
  - WIRE streaming createAgentSession (~L367-373): same two additions. (Await is safe — generator body.)
  - LEAVE the listeners, drain loop, fireHookEvents (S2), customTools/buildCustomTools, session hooks,
    resolveModel/initialize/terminate, normalizeModel, registerMCPs, supports/requiresFeatures UNCHANGED.
  - VERIFY (grep): `grep -nE "private skillsPrompt|this\.sdk\.loadSkillsFromDir|this\.sdk\.formatSkillsForPrompt|this\.sdk\.DefaultResourceLoader|appendSystemPrompt: \[this\.skillsPrompt\]|noSkills: true|buildSkillsResourceLoader|\.\.\.\(resourceLoader \? \{ resourceLoader \} : \{\}\)" src/harnesses/pi-harness.ts` → all present; the spread appears 2× (both createAgentSession calls).
  - VERIFY (NO forbidden transitive import): `! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts` → exit 1 (no match).

Task 2: MODIFY src/harnesses/register-defaults.ts (register PiHarness + JSDoc)
  - ADD `import { PiHarness } from './pi-harness.js';` at the top (next to the ClaudeCodeHarness import).
  - REPLACE the S3 TODO block:
        // TODO(P2.M3.T2.S3): register PiHarness (id 'pi') as the vendor-neutral default.
        //   import { PiHarness } from "./pi-harness.js";
        //   if (!registry.has("pi")) registry.register(new PiHarness());
    WITH:
        // Pi harness — vendor-neutral DEFAULT (PRD §7.1, §7.6; defaultHarness already 'pi' in harness-config.ts).
        const PI: HarnessId = 'pi';
        if (!registry.has(PI)) {
          registry.register(new PiHarness());
        }
  - UPDATE the file-level JSDoc: change "Today registers: ClaudeCodeHarness (id 'claude-code')" to list
    BOTH, and remove the "P2.M3.T2.S3 will add PiHarness" line (now done).
  - VERIFY: `grep -n "TODO(P2.M3.T2.S3)" src/harnesses/register-defaults.ts` → 0 hits;
            `grep -n "new PiHarness()" src/harnesses/register-defaults.ts` → 1 hit.

Task 3: CREATE src/__tests__/unit/providers/pi-harness-loadskills.test.ts (the loadSkills suite)
  - STRUCTURE: import { describe, it, expect, beforeEach, vi } from 'vitest'; PiHarness; HarnessRegistry;
    type { Skill } from sdk-primitives. Copy the beforeEach from pi-harness-registermcps.test.ts
    (new PiHarness(); await initialize(); HarnessRegistry._resetForTesting(); reset init state).
  - MOCK IDIOM (mirror wireFakeSession): after initialize, overwrite via @ts-expect-error:
        // @ts-expect-error - private field access for testing
        harness.sdk = {
          ...harness.sdk,
          loadSkillsFromDir: vi.fn(({ dir, source }) => ({ skills: [{ name: source, description: 'd',
            filePath: dir + '/SKILL.md', baseDir: dir, sourceInfo: {}, disableModelInvocation: false }],
            diagnostics: [] })),
          formatSkillsForPrompt: vi.fn((skills) => `<skills>${skills.length}</skills>`),
        };
  - CASES (describe('PiHarness - loadSkills()')):
      init guard: new PiHarness() (no init); loadSkills([{name:'a',path:'/x'}]) → rejects /not initialized/i.
      empty array: loadSkills([]) → skillsPrompt === "" (read via @ts-expect-error private); loadSkillsFromDir NOT called.
      single skill: loadSkills([{name:'tdd', path:'/s/tdd'}]) → loadSkillsFromDir called once with
        {dir:'/s/tdd', source:'tdd'}; formatSkillsForPrompt called once with the collected skills;
        skillsPrompt === '<skills>1</skills>'.
      multiple skills: loadSkills([{name:'a',path:'/a'},{name:'b',path:'/b'}]) → loadSkillsFromDir
        called 2×; formatSkillsForPrompt called once with length-2 array; skillsPrompt === '<skills>2</skills>'.
      accumulation: the collected array passed to formatSkillsForPrompt is the FLATTENING of all
        loadSkillsFromDir results (assert .mock.calls[0][0].length === total).
      error wrapping: overwrite loadSkillsFromDir to throw → loadSkills([{name:'bad',path:'/x'}])
        rejects with /Failed to load skill 'bad' from \/x:/.
      disableModelInvocation passthrough: loadSkillsFromDir returns a skill with
        disableModelInvocation:true → we do NOT filter; formatSkillsForPrompt receives it (assert the
        passed array includes the flagged skill — Pi applies the filter, not us).
      skillsPrompt persists for execute: after loadSkills([...]), read skillsPrompt (non-empty) — this
        is what execute() consumes.
  - EXECUTE-INJECTION CASE (spy on createAgentSession): load skills, then wireFakeSession-style
    overwrite createAgentSession to a vi.fn().mockResolvedValue({ session: makeFakeSession([...]) }),
    call execute({prompt:'x',options:{}}, dummyExec), then assert
    createAgentSession.mock.calls[0][0].resourceLoader is defined (a DefaultResourceLoader instance —
    check `instanceof` via the sdk's class OR just truthy + has the appended prompt). ALSO: with NO
    skills loaded, execute calls createAgentSession with NO resourceLoader field
    (assert `mock.calls[0][0].resourceLoader === undefined`).
  - PLACEMENT: src/__tests__/unit/providers/.

Task 4: CREATE src/__tests__/unit/providers/register-defaults.test.ts (registration + default)
  - STRUCTURE: import registerDefaultHarnesses + HarnessRegistry + PiHarness + ClaudeCodeHarness +
    getGlobalHarnessConfig + resetGlobalHarnessConfig. beforeEach: HarnessRegistry._resetForTesting();
    resetGlobalHarnessConfig() (ensure clean singleton + default config).
  - CASES (describe('registerDefaultHarnesses')):
      registers both: const r = registerDefaultHarnesses(); expect(r.has('claude-code')).toBe(true);
        expect(r.has('pi')).toBe(true).
      pi is PiHarness: expect(r.get('pi')).toBeInstanceOf(PiHarness).
      claude-code is ClaudeCodeHarness: expect(r.get('claude-code')).toBeInstanceOf(ClaudeCodeHarness).
      idempotent: registerDefaultHarnesses(); registerDefaultHarnesses(); → no throw; still has('pi').
      returns the registry (chaining): const r1 = registerDefaultHarnesses(); expect(r1).toBe(HarnessRegistry.getInstance()).
      accepts a custom registry: const custom = new (HarnessRegistry as any)(); — SKIP if constructor
        is private (it is); instead test the default-registry path only. (Document the private-ctor limit.)
      default is pi: expect(getGlobalHarnessConfig().defaultHarness).toBe('pi').
  - PLACEMENT: src/__tests__/unit/providers/.

Task 5: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: lint, targeted tests, full suite, build, grep contract, runtime spot-check.
  - If lint names pi-harness.ts: check (a) a transitive type import slipped in (GOTCHA #1);
    (b) PiSkill import is `import type` (GOTCHA #12); (c) the conditional spread typechecks
    (GOTCHA #11); (d) DefaultResourceLoader is reachable via this.sdk (it is — exported value).
  - If lint names register-defaults.ts: the PiHarness import path is wrong (must be './pi-harness.js').
  - If a loadSkills test fails on skillsPrompt: verify the field is SET (not just computed) — the last
    line of loadSkills must be `this.skillsPrompt = this.sdk.formatSkillsForPrompt(collected);`.
  - If execute regression fails: verify buildSkillsResourceLoader returns undefined when skillsPrompt
    is "" (GOTCHA #7) — a stray resourceLoader would change session behavior.
```

### Implementation Patterns & Key Details

```ts
// === The skillsPrompt field (mirror ClaudeCodeHarness L194-200) ===
/**
 * Combined skills prompt (agentskills.io XML) from loadSkills(), injected into the session's system
 * prompt during execute() via a DefaultResourceLoader.appendSystemPrompt (parity with
 * ClaudeCodeHarness.skillsPrompt). Empty string when no skills are loaded (loadSkills not called, or
 * called with []). When empty, execute() omits the resourceLoader → Pi builds its own default loader
 * (current behavior preserved — no regression).
 * @internal
 */
private skillsPrompt: string = "";

// === loadSkills — NATIVE agentskills.io loading (replaces the throwing stub) ===
/**
 * Load skills via Pi's NATIVE agentskills.io implementation (PRD §7.12, §7.14.2).
 *
 * For each Groundswell {@link Skill} ({name, path}), calls Pi's `loadSkillsFromDir({dir: path,
 * source: name})` (which reads SKILL.md from the dir), collects all returned Pi Skills, then formats
 * them to agentskills.io XML via `formatSkillsForPrompt` and stores the result in {@link skillsPrompt}.
 *
 * ## No session re-init required
 * PiHarness creates a FRESH AgentSession per execute()/executeStreaming() call (P2.M2.T2.S1 /
 * P2.M3.T2.S1), so this stored skillsPrompt is consumed on the NEXT execute() when
 * buildSkillsResourceLoader() builds the DefaultResourceLoader. This mirrors how registerMCPs()
 * state is consumed when execute() builds customTools. (A long-lived-session model would need an
 * explicit rebuild; not the case here.)
 *
 * ## Parity with ClaudeCodeHarness
 * ClaudeCodeHarness reads each SKILL.md and joins with markdown; PiHarness uses Pi's native loaders
 * and emits the agentskills.io XML format. Both store the result in a `skillsPrompt` field and inject
 * at BOTH execute sites. EFFECT is identical: the skill's SKILL.md content reaches the model's system
 * prompt.
 *
 * @param skills - Groundswell portable Skill list ({name, path}). path = dir containing SKILL.md.
 * @throws {Error} /not initialized/i if initialize() has not been called.
 * @throws {Error} "Failed to load skill '<name>' from <path>: <msg>" if loadSkillsFromDir throws.
 */
async loadSkills(skills: Skill[]): Promise<void> {
  // Init guard (mirror registerMCPs / ClaudeCodeHarness.loadSkills).
  if (!this.sdk) {
    throw new Error("PiHarness not initialized. Call initialize() first.");
  }
  // Empty → clear (mirror ClaudeCodeHarness; also ensures a prior loadSkills doesn't linger).
  if (skills.length === 0) {
    this.skillsPrompt = "";
    return;
  }
  // NATIVE agentskills.io loading: map each Groundswell Skill {name,path} → Pi loadSkillsFromDir.
  // Collect ALL Pi Skills, then format to ONE agentskills.io XML string.
  const collected: PiSkill[] = [];
  for (const skill of skills) {
    try {
      // loadSkillsFromDir is SYNC; reads SKILL.md from `dir` (skill root / .md children / recurse).
      // `source` is the SourceInfo identifier (use the Groundswell skill name).
      const result = this.sdk.loadSkillsFromDir({
        dir: skill.path,
        source: skill.name,
      });
      collected.push(...result.skills);
    } catch (error) {
      // Wrap with context (mirror ClaudeCodeHarness L983-988 error wrapping).
      throw new Error(
        `Failed to load skill '${skill.name}' from ${skill.path}: ` +
          `${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
  // formatSkillsForPrompt → agentskills.io XML; EXCLUDES disableModelInvocation:true (Pi filters).
  this.skillsPrompt = this.sdk.formatSkillsForPrompt(collected);
}

// === buildSkillsResourceLoader — the injection helper (the appendSystemPrompt seam) ===
/**
 * Build a DefaultResourceLoader that appends the loaded skills ({@link skillsPrompt}) to the
 * session's system prompt (PRD §7.12, §7.14.2).
 *
 * Returns `undefined` when no skills are loaded (`skillsPrompt === ""`), so execute() OMITS the
 * `resourceLoader` option and Pi builds its own default loader — current behavior is preserved
 * (zero regression in the execute/streaming suites).
 *
 * ## Parity: noSkills: true
 * Suppresses Pi's DEFAULT skill discovery (~/.pi/agent/skills, cwd-local) so the session's skills are
 * EXACTLY Groundswell's portable Skill[] (parity with ClaudeCodeHarness, which builds its prompt only
 * from the passed skills). `appendSystemPrompt` is INDEPENDENT of `noSkills`, so our pre-formatted
 * agentskills.io XML is still appended to the system prompt.
 *
 * createAgentSession uses a caller-provided loader AS-IS (no reload), so we `await loader.reload()`.
 *
 * @returns A configured DefaultResourceLoader, or undefined when no skills are loaded.
 * @throws {Error} /not initialized/i if called before initialize() (defensive — execute() guards too).
 */
private async buildSkillsResourceLoader(): Promise<
  import("@earendil-works/pi-coding-agent").DefaultResourceLoader | undefined
> {
  if (!this.skillsPrompt) return undefined; // no skills → omit loader (preserve current behavior)
  if (!this.sdk) {
    throw new Error("PiHarness not initialized. Call initialize() first.");
  }
  // cwd/agentDir are REQUIRED by DefaultResourceLoaderOptions. agentDir = Pi's default (~/.pi/agent).
  const loader = new this.sdk.DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: this.sdk.getAgentDir(),
    appendSystemPrompt: [this.skillsPrompt], // our agentskills.io XML appended to the system prompt
    noSkills: true, // parity: don't ALSO load Pi's default skills
  });
  await loader.reload(); // createAgentSession will NOT reload a caller-provided loader
  return loader;
}

// === Wiring — BOTH createAgentSession call sites (non-streaming ~L227, streaming ~L367) ===
//   BEFORE the createAgentSession call, add:
const resourceLoader = await this.buildSkillsResourceLoader();
//   In the options object, add the conditional spread:
const { session } = await this.sdk!.createAgentSession({
  model,
  modelRegistry: this.modelRegistry,
  authStorage: this.authStorage,
  customTools: this.buildCustomTools(toolExecutor),
  ...(resourceLoader ? { resourceLoader } : {}), // ← S3 ADDS (skills injection; omitted when no skills)
});
```

```ts
// === register-defaults.ts — the delta (replace the TODO block) ===
//   ADD to imports (top of file):
import { PiHarness } from './pi-harness.js';
//   REPLACE the TODO block with:
  // Pi harness — vendor-neutral DEFAULT (PRD §7.1, §7.6). defaultHarness is already 'pi' in
  // src/utils/harness-config.ts (DEFAULT_HARNESS_CONFIG); this registration pairs the id with a
  // live instance so registry.get('pi') resolves. Idempotent (guard mirrors the claude-code block).
  const PI: HarnessId = 'pi';
  if (!registry.has(PI)) {
    registry.register(new PiHarness());
  }
```

### Integration Points

```yaml
SOURCE (MODIFY):
  - src/harnesses/pi-harness.ts : ADD `import type { Skill as PiSkill }`; ADD `private skillsPrompt`
    field; REPLACE the loadSkills stub with the native impl; ADD buildSkillsResourceLoader();
    add `const resourceLoader = await this.buildSkillsResourceLoader();` + the conditional spread
    at BOTH createAgentSession call sites. NO new value imports (Pi functions via this.sdk.*).
  - src/harnesses/register-defaults.ts : import PiHarness; replace the S3 TODO with a real
    idempotent registration; update the JSDoc to list both harnesses.

TESTS (NEW):
  - src/__tests__/unit/providers/pi-harness-loadskills.test.ts : the loadSkills contract
    (init guard, empty, single, multiple, accumulation, error wrap, disableModelInvocation passthrough,
    skillsPrompt stored) + the execute-injection spy case (resourceLoader present when skills loaded;
    absent when not).
  - src/__tests__/unit/providers/register-defaults.test.ts : both harnesses registered, pi is PiHarness,
    idempotent, defaultHarness === 'pi'.

CONFIRM-ONLY (no code change):
  - src/utils/harness-config.ts : DEFAULT_HARNESS_CONFIG.defaultHarness === 'pi' (asserted in the test).

NO CHANGES TO:
  - listeners, drain loop, fireHookEvents (S2 — REUSED, not edited).
  - customTools / buildCustomTools / mcpHandler wiring (P2.M3.T1.S1).
  - session hooks (S1 + P2.M2.T2.S1 — inline, unchanged).
  - resolveModel / initialize / terminate / normalizeModel / registerMCPs / supports / requiresFeatures.
  - src/types/*, barrels (src/harnesses/index.ts), HarnessRegistry, ClaudeCodeHarness, other tests.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Type-check the modified source (lint EXCLUDES __tests__ — proves pi-harness.ts + register-defaults.ts compile).
npm run lint                        # = tsc --noEmit
# Expected: exit 0. If it names pi-harness.ts:
#   - a transitive type import slipped in → remove it (GOTCHA #1);
#   - PiSkill import is NOT `import type` → fix to `import type { ..., Skill as PiSkill }` (GOTCHA #12);
#   - the conditional spread doesn't typecheck → ensure buildSkillsResourceLoader returns
#     `DefaultResourceLoader | undefined` and the spread arm is `{ resourceLoader }` (GOTCHA #11);
#   - `this.sdk.loadSkillsFromDir`/`formatSkillsForPrompt`/`DefaultResourceLoader`/`getAgentDir`
#     not found → they ARE exported values; verify `this.sdk` is `typeof import(...)` (it is).
# If it names register-defaults.ts:
#   - the PiHarness import path is wrong → must be './pi-harness.js' (ESM .js extension).

# Confirm NO forbidden transitive imports + the contract landed.
! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts   # exit 1 (no match) = PASS
grep -nE "private skillsPrompt|this\.sdk\.loadSkillsFromDir|this\.sdk\.formatSkillsForPrompt|this\.sdk\.DefaultResourceLoader|appendSystemPrompt: \[this\.skillsPrompt\]|noSkills: true|buildSkillsResourceLoader" src/harnesses/pi-harness.ts
# Expected: all present (skillsPrompt 1×, loadSkillsFromDir 1×, formatSkillsForPrompt 1×, DefaultResourceLoader 1×,
#           appendSystemPrompt 1×, noSkills 1×, buildSkillsResourceLoader 1 def + 2 calls = 3 hits).
grep -nE "\.\.\.\(resourceLoader \? \{ resourceLoader \} : \{\}\)" src/harnesses/pi-harness.ts   # 2 hits (both createAgentSession calls)
grep -n "TODO(P2.M3.T2.S3)" src/harnesses/register-defaults.ts   # 0 hits
grep -n "new PiHarness()" src/harnesses/register-defaults.ts     # 1 hit
```

### Level 2: Unit Tests (Component Validation)

```bash
# The new loadSkills suite (targeted).
npm test -- pi-harness-loadskills            # or: npx vitest run src/__tests__/unit/providers/pi-harness-loadskills.test.ts
# Expected: all green — init guard, empty short-circuit, single/multiple skill loading, accumulation,
#   error wrapping, disableModelInvocation passthrough, skillsPrompt stored, execute-injection spy
#   (resourceLoader present when skills loaded; absent when not).

# The new register-defaults suite.
npm test -- register-defaults                # or: npx vitest run src/__tests__/unit/providers/register-defaults.test.ts
# Expected: both harnesses registered, pi is PiHarness, idempotent, defaultHarness === 'pi'.

# Regression — execute + streaming (NO loadSkills call → no resourceLoader → current behavior).
npm test -- pi-harness-execute
npm test -- pi-harness-streaming
# Expected: green (GOTCHA #7 — empty skillsPrompt → omitted resourceLoader → no behavior change).

# Full regression.
npm test
# Expected: exit 0. S2's hooks suite (if landed) + P2.M3.T1.S1 (customTools) + P2.M2.T2.S1 (execute)
#   + S1 (streaming) + the new S3 suites all green.

# If loadSkills test fails on skillsPrompt: verify the last line of loadSkills assigns
# `this.skillsPrompt = this.sdk.formatSkillsForPrompt(collected);` (not just a local).
# If the execute-injection spy fails: verify buildSkillsResourceLoader is CALLED in execute()
# (the `const resourceLoader = await this.buildSkillsResourceLoader();` line precedes createAgentSession).
```

### Level 3: Integration Testing (System Validation)

```bash
# Build emits the new field + method + the real loadSkills + the registration.
npm run build
# Expected: exit 0; dist/harnesses/pi-harness.{js,d.ts} emits skillsPrompt + buildSkillsResourceLoader
#   + the real loadSkills; dist/harnesses/register-defaults.js calls registry.register(new PiHarness()).

# Runtime spot-check (the contract end-to-end via vitest):
#   (1) loadSkills isolation — a PiHarness whose this.sdk.loadSkillsFromDir returns {skills:[piSkillA]}
#       and formatSkillsForPrompt returns '<skills>…</skills>', after
#       await harness.loadSkills([{name:'a', path:'/x'}]), has this.skillsPrompt === '<skills>…</skills>'.
#   (2) execute injection — after loadSkills, a subsequent execute(...) calls createAgentSession with
#       options.resourceLoader defined (a DefaultResourceLoader). With NO skills, options.resourceLoader
#       is undefined (current behavior).
#   (3) register-defaults — registerDefaultHarnesses() leaves registry.has('pi') === true and
#       registry.get('pi') instanceof PiHarness; getGlobalHarnessConfig().defaultHarness === 'pi'.
#   (Covered by pi-harness-loadskills.test.ts Task 3 + register-defaults.test.ts Task 4 — run as the gate.)

# Parity sanity (manual, optional): compare loadSkills behavior against claude-code-harness-loadskills.test.ts.
#   Both: empty array → no-op; non-empty → stores formatted content; per-skill errors wrapped with
#   name+path. Pi ADDITIONALLY uses the native agentskills.io XML format (ClaudeCodeHarness uses
#   markdown join). Formalized in P4.M2.T1.S1 (parity suite); S3 need only spot-check.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Cross-harness parity (PRD §7.14.2):
#   - The SAME Groundswell Skill[] produces skills that reach the model's system prompt on BOTH
#     harnesses. ClaudeCodeHarness: markdown-joined in systemPrompt. PiHarness: agentskills.io XML
#     appended via DefaultResourceLoader. EFFECT parity (the SKILL.md content is in the prompt).
#   (Spot-checked by the parity-sanity step above; formalized in P4.M2.T1.S1.)

# No-leak / idempotency contract:
#   - loadSkills([]) resets skillsPrompt to "" (a prior load doesn't linger).
#   - loadSkills([...]) can be called multiple times; the LAST call's skillsPrompt wins (overwrite).
#   - registerDefaultHarnesses() called twice does NOT throw (the has() guard).
#   (Covered by the loadSkills + register-defaults suites.)

# Default-harness effectiveness:
#   - After registerDefaultHarnesses(), a consumer resolving the default does:
#       const id = getGlobalHarnessConfig().defaultHarness; // 'pi'
#       const harness = registry.get(id);                   // PiHarness instance
#     Both resolve → 'pi' is the EFFECTIVE default. (Covered by register-defaults.test.ts.)

# (No performance/security/load gates required for this item — it's a skill-loading + registration adapter.)
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (pi-harness.ts + register-defaults.ts compile; no transitive imports).
- [ ] `npm test` exits 0 (new loadSkills + register-defaults suites + execute/streaming regression + full suite).
- [ ] `npm run build` exits 0 (dist emits skillsPrompt + buildSkillsResourceLoader + real loadSkills + pi registration).
- [ ] No forbidden transitive imports (grep clean for `@earendil-works/pi-ai` / `pi-agent-core`).
- [ ] `register-defaults.ts` has NO S3 TODO block; `new PiHarness()` present.

### Feature Validation

- [ ] `loadSkills([])` → `skillsPrompt === ""` (empty short-circuit).
- [ ] `loadSkills([{name, path}])` → `loadSkillsFromDir({dir, source})` per skill + `formatSkillsForPrompt` → `skillsPrompt` set.
- [ ] Per-skill errors wrapped with skill name + path.
- [ ] Init guard throws `/not initialized/i`.
- [ ] `execute()` + `executeStreaming()` pass `resourceLoader` when skills loaded; OMIT it when not.
- [ ] `registerDefaultHarnesses()` registers BOTH harnesses; `registry.get('pi') instanceof PiHarness`; idempotent.
- [ ] `getGlobalHarnessConfig().defaultHarness === 'pi'`.
- [ ] Listeners, drain loop, fireHookEvents (S2), customTools, session hooks all UNCHANGED.

### Code Quality Validation

- [ ] Follows existing patterns (`this.sdk.*` value access; `import type` for PiSkill; mirror ClaudeCodeHarness field/injection; mirror registerMCPs test structure).
- [ ] File placement matches the desired codebase tree.
- [ ] Anti-patterns avoided (no transitive imports, no manual SKILL.md reading — use native loaders, no unconditional resourceLoader, no filter reimplementing formatSkillsForPrompt, no double-registration).
- [ ] Empty skillsPrompt → omitted resourceLoader (zero regression).
- [ ] Comments document: no-re-init insight, appendSystemPrompt/noSkills independence, parity rationale.

### Documentation & Deployment

- [ ] `loadSkills` JSDoc documents the native agentskills.io path + the no-re-init property.
- [ ] `buildSkillsResourceLoader` JSDoc documents the empty→omit regression-safety + parity rationale.
- [ ] `register-defaults.ts` JSDoc lists both harnesses (no stale "will add" note).
- [ ] No new environment variables or config (defaultHarness already 'pi').

---

## Anti-Patterns to Avoid

- ❌ Don't import `loadSkillsFromDir`/`formatSkillsForPrompt`/`DefaultResourceLoader`/`getAgentDir` as
  VALUES — they're reached via `this.sdk.*` (this.sdk is the module namespace). Importing them as
  values from `@earendil-works/pi-ai` (their origin) is non-hoisted → `MODULE_NOT_FOUND`. (Decision 1.)
- ❌ Don't read SKILL.md manually with `readFile` — that's ClaudeCodeHarness's path. PiHarness uses
  Pi's NATIVE `loadSkillsFromDir` (reads SKILL.md internally + applies the agentskills.io spec).
  (Decision 2, §7 parity.)
- ❌ Don't filter `disableModelInvocation` yourself — `formatSkillsForPrompt` does it (agentskills.io
  spec). Pass the full collected array through. (Decision 7.)
- ❌ Don't unconditionally pass a `resourceLoader` to createAgentSession — that changes session
  behavior even when no skills are loaded (regression). Return `undefined` from
  buildSkillsResourceLoader when `skillsPrompt === ""` and omit via conditional spread. (Decision 6.)
- ❌ Don't drop `noSkills: true` — Pi would ALSO load its own default skills (~/.pi/agent), breaking
  cross-harness parity (the session's skills must be EXACTLY Groundswell's Skill[]). (Decision 5.)
- ❌ Don't forget `await loader.reload()` — createAgentSession uses a caller-provided loader AS-IS
  (no reload); an unreloaded loader has empty caches. (Decision 4.)
- ❌ Don't touch the listeners, drain loop, `fireHookEvents`, or the execute() "Remaining hooks"
  JSDoc line — S2 (parallel) owns those. S3 edits only the createAgentSession call sites (upstream),
  the loadSkills stub, and register-defaults.ts. (Decision 8.)
- ❌ Don't add an `initialize()` call in register-defaults — registration just stores the instance
  (lazy SDK load happens on explicit init). Init policy is P3.M1's job. (GOTCHA #14.)
- ❌ Don't reimplement the `HarnessId` literal — reuse the existing `HarnessId` type; the `const PI:
  HarnessId = 'pi'` mirrors the `const CLAUDE_CODE` pattern above it. (GOTCHA #15.)
- ❌ Don't create new patterns when existing ones work — mirror ClaudeCodeHarness.skillsPrompt +
  registerMCPs test structure + the wireFakeSession mock idiom.
