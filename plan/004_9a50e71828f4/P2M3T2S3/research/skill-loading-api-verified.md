# Pi SDK Skill-Loading API — VERIFIED (P2.M3.T2.S3)

> All signatures read directly from installed `.d.ts` / `.js` on 2026-06-20.
> Package: `@earendil-works/pi-coding-agent@0.79.8`. This note is the single source of truth for
> the `loadSkills()` + `register-defaults.ts` implementation. Cite section numbers in the PRP.

## 1. Skill functions ARE exported from the MAIN entry (hoisted — importable)

`node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts`:
```ts
L2:  export { CONFIG_DIR_NAME, getAgentDir, getDocsPath, getPackageDir, getReadmePath, VERSION, } from "./config.ts";
L14: export type { ResourceCollision, ResourceDiagnostic, ResourceLoader } from "./core/resource-loader.ts";
L15: export { DefaultResourceLoader, loadProjectContextFiles } from "./core/resource-loader.ts";
L19: export { formatSkillsForPrompt, type LoadSkillsFromDirOptions, type LoadSkillsResult, loadSkills, loadSkillsFromDir, type Skill, type SkillFrontmatter, } from "./core/skills.ts";
```
→ `loadSkillsFromDir`, `formatSkillsForPrompt` (values), `DefaultResourceLoader` (class/value),
`getAgentDir` (value), and `Skill` (type) are ALL on the `@earendil-works/pi-coding-agent` namespace.
Since `PiHarness.sdk: typeof import("@earendil-works/pi-coding-agent") | null`, they are reachable as
`this.sdk.loadSkillsFromDir`, `this.sdk.formatSkillsForPrompt`, `this.sdk.DefaultResourceLoader`,
`this.sdk.getAgentDir`. **NO transitive `@earendil-works/pi-ai` / `pi-agent-core` import needed.**

## 2. loadSkillsFromDir — the per-skill loader (maps a Groundswell Skill → Pi Skills)

`dist/core/skills.d.ts`:
```ts
export interface Skill { name; description; filePath; baseDir; sourceInfo: SourceInfo; disableModelInvocation: boolean; }
export interface LoadSkillsResult { skills: Skill[]; diagnostics: ResourceDiagnostic[]; }
export interface LoadSkillsFromDirOptions { dir: string; source: string; }
export declare function loadSkillsFromDir(options: LoadSkillsFromDirOptions): LoadSkillsResult;
```
Discovery (`dist/core/skills.js` L121-206): a dir with `SKILL.md` → skill root (no recurse); else load
`.md` children; else recurse subdirs. **SYNC** (returns, not a Promise). Throws on unreadable paths.
→ For each Groundswell `Skill {name, path}`: `this.sdk.loadSkillsFromDir({ dir: skill.path, source: skill.name })`
then collect `.skills`. Wrap throws in a contextual Error (skill name + path).

## 3. formatSkillsForPrompt — the agentskills.io XML formatter

`dist/core/skills.d.ts` + `.js` L257-:
```ts
/** Format skills for system prompt in XML per Agent Skills standard. See: https://agentskills.io/integrate-skills */
export declare function formatSkillsForPrompt(skills: Skill[]): string;
```
**Excludes** skills with `disableModelInvocation === true` (L258: `skills.filter(s => !s.disableModelInvocation)`).
Emits `<skills>…<skill>…</skill></skills>` XML. **SYNC**. Returns `""` for an empty/filtered list.

## 4. The injection seam — DefaultResourceLoader.appendSystemPrompt

`dist/core/resource-loader.d.ts`:
```ts
export interface DefaultResourceLoaderOptions {
  cwd: string;                       // REQUIRED
  agentDir: string;                  // REQUIRED
  settingsManager?: SettingsManager;
  additionalSkillPaths?: string[];
  appendSystemPrompt?: string[];     // ← appended to the session's system prompt
  noSkills?: boolean;                // suppress default skill discovery
  noExtensions?: boolean; noPromptTemplates?; noThemes?; noContextFiles?;
  systemPrompt?: string; systemPromptOverride?; appendSystemPromptOverride?; skillsOverride?; ...
}
export declare class DefaultResourceLoader implements ResourceLoader { constructor(o); reload(o?): Promise<void>; getAppendSystemPrompt(): string[]; getSkills(): {skills; diagnostics}; getSystemPrompt(): string|undefined; ... }
```
- `appendSystemPrompt: string[]` is **independent of** `noSkills` — it appends to the system prompt
  regardless of skill discovery. So `noSkills: true` + `appendSystemPrompt: [skillsXml]` = no disk
  skills discovered, but our pre-formatted agentskills.io XML IS appended to the prompt. ✅
- `reload()` MUST be called before use (it discovers + caches resources). createAgentSession calls
  `reload()` ONLY on a loader IT creates; a caller-provided loader is used AS-IS (see §5).

## 5. createAgentSession — caller-provided resourceLoader is used AS-IS

`dist/core/sdk.js` (createAgentSession body):
```js
let resourceLoader = options.resourceLoader;
...
if (!resourceLoader) {
    resourceLoader = new DefaultResourceLoader({ cwd, agentDir, settingsManager });
    await resourceLoader.reload();      // ← only when caller OMITS resourceLoader
}
```
→ If we pass `resourceLoader`, Pi does NOT reload it; WE must `await loader.reload()`.
→ `customTools` (Groundswell's MCPHandler tools) is a SEPARATE option (`options.customTools`); providing
  a `resourceLoader` does NOT affect customTools. No conflict with P2.M3.T1.S1. ✅
→ When `this.skillsPrompt === ""`, OMIT `resourceLoader` entirely → Pi builds its own default loader
  → current execute() behavior is 100% preserved (no regression in execute/streaming suites). ✅

## 6. The "no session re-init needed" insight (document this)

PiHarness creates a **fresh AgentSession per execute()/executeStreaming() call** (P2.M2.T2.S1 +
P2.M3.T2.S1 — both call `createAgentSession` inside the method body). Therefore:
- `registerMCPs(servers)` stores servers in `this.mcpHandler`; the next `execute()` reads
  `mcpHandler.getTools()` when building `customTools`. (Existing pattern — P2.M3.T1.S1.)
- `loadSkills(skills)` stores the XML in `this.skillsPrompt`; the next `execute()` builds a
  `DefaultResourceLoader` (via `buildSkillsResourceLoader()`) and passes it to `createAgentSession`.

→ State is naturally consumed on the next execute() — **NO session re-init required.** This only
holds because the session is per-call; a long-lived session model would need explicit rebuild.
(item note: "registerMCPs/loadSkills may require session re-init—document." → RESOLVED: it doesn't,
given the per-call session architecture. Document the rationale in the JSDoc.)

## 7. ClaudeCodeHarness parity reference (store formatted string, inject at both execute sites)

`src/harnesses/claude-code-harness.ts`:
- L194-200: `private skillsPrompt: string = "";` — stores formatted skill content from `loadSkills()`.
- L958-988: `loadSkills(skills)` — reads each `SKILL.md`, formats with markdown headers + `\n\n---\n\n`,
  stores in `this.skillsPrompt`. Empty array → `skillsPrompt = ""`.
- L1011+: `buildSystemPromptWithSkills(baseSystemPrompt?)` — combines base + skillsPrompt.
- L450 + L676: injected at BOTH execute sites (non-streaming + streaming) via `systemPrompt: this.buildSystemPromptWithSkills(...)`.
→ PiHarness mirrors the FIELD (`this.skillsPrompt`) and the TWO-SITE injection. DIFFERENCE: Pi loads
  skills NATIVELY (`loadSkillsFromDir` reads SKILL.md) and formats to agentskills.io XML
  (`formatSkillsForPrompt`), instead of ClaudeCodeHarness's manual `readFile` + markdown join.

## 8. register-defaults.ts — the exact delta (from P2.M1.T1.S2)

`src/harnesses/register-defaults.ts` currently has:
```ts
// TODO(P2.M3.T2.S3): register PiHarness (id 'pi') as the vendor-neutral default.
//   import { PiHarness } from "./pi-harness.js";
//   if (!registry.has("pi")) registry.register(new PiHarness());
```
→ S3 replaces the TODO with a real registration (idempotent `if (!registry.has('pi'))` guard), adds
the `import { PiHarness } from './pi-harness.js';` at the top, and updates the JSDoc to list both
harnesses. The `GlobalHarnessConfig.defaultHarness` is ALREADY `'pi'`
(`src/utils/harness-config.ts` `DEFAULT_HARNESS_CONFIG`), so registering the instance is the only
missing piece — afterward `'pi'` is the EFFECTIVE default (id resolves + instance present).

## 9. Testing surface — the fake-session idiom bypasses the real loader

`src/__tests__/unit/providers/pi-harness-execute.test.ts` L24-56: `makeFakeSession`/`wireFakeSession`
overwrite `harness.sdk.createAgentSession` → `vi.fn().mockResolvedValue({ session: fakeSession })`.
→ In execute()/streaming tests the REAL `createAgentSession` (and thus `DefaultResourceLoader`) is
NEVER exercised. Therefore:
- `loadSkills()` is tested IN ISOLATION: overwrite `harness.sdk.loadSkillsFromDir` +
  `harness.sdk.formatSkillsForPrompt` (same private-field idiom), assert `this.skillsPrompt`.
- The execute()-injection is tested via a SPY on the (overwritten) `createAgentSession` that CAPTURES
  the options passed → assert `options.resourceLoader` is present when skills were loaded.
- `register-defaults` is tested directly on `HarnessRegistry`: `registry.has('pi')`, `get('pi')
  instanceof PiHarness`, idempotency, and `getGlobalHarnessConfig().defaultHarness === 'pi'`.

## 10. Type-import decisions (isolatedModules: true)

- Groundswell `Skill` (`{name; path}`) is ALREADY imported in pi-harness.ts (L17):
  `import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";` — NO new import.
- Pi `Skill` collides by name → import as a TYPE alias:
  `import type { ..., Skill as PiSkill } from "@earendil-works/pi-coding-agent";` (add to the existing
  type-import block). `loadSkillsFromDir`/`formatSkillsForPrompt`/`DefaultResourceLoader`/`getAgentDir`
  are VALUES reached via `this.sdk.*` (NO value import — matches the existing `this.sdk.createAgentSession` idiom).
