# Research Findings — P4.M3.T2.S1: Rewrite provider examples as harness examples + update scripts

**Scope tag:** EXAMPLES + SCRIPTS. MOVE `examples/providers` → `examples/harnesses`; REWRITE the 6
example files + their README; EDIT `examples/index.ts`, `examples/README.md`, `package.json` scripts.
Zero `src/`, zero `docs/`, zero root-`README.md` edits (owned by P4.M3.T1.S1). Consumes the finalized
public harness API (P3.M3 complete) + `docs/harnesses.md` (produced in parallel by P4.M3.T1.S1).

---

## 1. The deliverable contract (from item description + PRD §7)

| New file (under `examples/harnesses/`) | Replaces (under `examples/providers/`) | Demonstrates (PRD §) |
|---|---|---|
| `01-basic-harness-usage.ts` | `01-basic-provider-usage.ts` | `ClaudeCodeHarness`/`PiHarness` + `HarnessRegistry` register/init/use (§7.1, §7.3, §7.6) |
| `02-harness-configuration.ts` | `02-provider-configuration.ts` | `configureHarnesses()` + the **dual cascade** (harness axis + model axis) (§7.6, §7.7) |
| `03-harness-switching.ts` | `03-provider-switching.ts` | Per-call harness override + model-only override (§7.13) |
| `04-multi-provider-scenarios.ts` | `04-multi-provider-scenarios.ts` | **Model axis**: `anthropic/...` vs `openai/...` via the `pi` harness (§7.8, §7.1) |
| `05-harness-sessions.ts` | `05-provider-sessions.ts` | `harnessOptions.sessionId` create/continue + `harness.getSession()` (§7.5) |
| `06-harness-with-mcp-skills.ts` | `06-provider-with-mcp-skills.ts` | `registerMCPs`/`loadSkills`/hooks + **capability matrix `pi` vs `claude-code`** (§7.4) |
| `README.md` | `README.md` | Quick-start + per-example blurbs (mirror old structure) |

**Also EDIT (no `src/`/`docs/`):**
- `package.json` — `start:provider-*` (6 scripts) → `start:harness-*`.
- `examples/index.ts` — import paths (`./providers/…` → `./harnesses/…`), function names, MENU labels, `runAllExamples` list, summary block.
- `examples/README.md` — "Provider Examples" section (lines ~155–253) → "Harness Examples"; run commands; structure tree.

**Mock:** none (examples). **Must run with `tsx`.**

---

## 2. Verified public API surface (src/index.ts — the ONLY symbols examples may import)

The examples `import { … } from 'groundswell'`, which resolves to `dist/index.js` (built from
`src/index.ts`). Every imported name MUST exist in `src/index.ts`. Verified by `grep -E "^export"`:

**✅ Importable from `'groundswell'`:**
- Classes: `Agent`, `Prompt`, `MCPHandler`, `ClaudeCodeHarness`, `PiHarness`, `HarnessRegistry`.
- Config fn: `configureHarnesses` (line 133 — the ONLY config symbol exported).
- Model utils: `parseModelSpec`, `formatModelForProvider`.
- Types: `Harness`, `HarnessId`, `ModelProviderId`, `HarnessCapabilities`, `HarnessOptions`,
  `HarnessRequest`, `HarnessHookEvents`, `GlobalHarnessConfig`, `ModelSpec`, `MCPServer`, `Skill`,
  `Tool`, `AgentConfig`, `PromptOverrides`, `AgentHooks`.

**❌ NOT exported (internal — examples MUST NOT import these):**
- `getGlobalHarnessConfig`, `resolveHarnessConfig` (`src/utils/harness-config.ts` — internal only).
- `registerDefaultHarnesses` (`src/harnesses/index.ts` — no `./harnesses` subpath in `package.json exports`).
- `getGlobalProviderConfig`, `configureProviders` — **NOT in src/index.ts** (grep confirms only
  `configureHarnesses` at line 133). The OLD example 02 imported `configureProviders` +
  `getGlobalProviderConfig` → **these no longer resolve via the public package** (latent bug this
  task fixes). The new `02-harness-configuration.ts` MUST use only `configureHarnesses` and read the
  resolved config back via `agent.config.harness` (NOT a global-config getter).

> CRITICAL footgun: if an example imports `getGlobalHarnessConfig`/`configureProviders`/
> `registerDefaultHarnesses`, `tsx` will throw `SyntaxError: The requested module 'groundswell' does
> not provide an export named 'X'`. The Level-1 symbol cross-check (PRP §Validation) catches this.

---

## 3. Verified class facts (read directly from source — do NOT guess)

### HarnessRegistry (`src/harnesses/harness-registry.ts`)
- Singleton: `HarnessRegistry.getInstance()`.
- `register(harness)` — throws on duplicate id.
- `get(id): Harness | undefined` — **never throws** for missing.
- `has(id): boolean`.
- `initializeProvider(id, options?): Promise<void>` — async, idempotent, shares in-flight promise.
- **The `id` argument type is `ProviderId`** (`src/types/providers.ts:40` → `ProviderId = HarnessId |
  'anthropic'`). So `registry.get('pi')`, `registry.get('claude-code')`, AND
  `registry.initializeProvider('claude-code', { apiKey })` all typecheck. The registry is **keyed by
  the harness `.id`** (`'pi'` / `'claude-code'`), NOT by `'anthropic'`.

### ClaudeCodeHarness (`src/harnesses/claude-code-harness.ts`)
- `readonly id: HarnessId = "claude-code"` (line 109).
- `capabilities` (lines 124–139): `mcp:true, skills:true, lsp:true, streaming:true, sessions:true,
  extendedThinking:true` — but **Anthropic-only** (§7.8 constraint; `normalizeModel` throws on
  non-anthropic provider).
- `registerMCPs(servers: MCPServer[]): Promise<Tool[]>` (line 907) — delegates to its `MCPHandler`,
  stashes SDK MCP config.
- `loadSkills(skills: Skill[]): Promise<void>` (line 958) — system-prompt injection.
- `getSession(sessionId): Promise<SessionState | undefined>` (line 1269) — **ClaudeCodeHarness HAS
  `getSession`**; the session store is an abstraction layered on the stateless SDK.

### PiHarness (`src/harnesses/pi-harness.ts`)
- `readonly id: HarnessId = "pi"` (line 80).
- `capabilities` (lines 83–90): ALL true — AND runs **any** LLM provider (open set). This is the
  §7.4 "Parity without Pi plugins" proof point.
- `registerMCPs(servers): Promise<Tool[]>` (line 642) — via `MCPHandler.toPiCustomTools()` bridge.
- `loadSkills(skills): Promise<void>` (line 687) — **native agentskills.io**: calls Pi's
  `loadSkillsFromDir({ dir: skill.path })` for each `{name, path}` Skill.
- **PiHarness has NO public `getSession`** (grep confirmed). It creates a **fresh AgentSession per
  `execute()` call** (comments at lines 241, 361). → Example 05 must document this session-model
  difference honestly: `getSession()` exists on `claude-code`; `pi` sessions are managed differently
  (fork/switch/clone via Pi's `SessionManager`). Do NOT fabricate a `pi.getSession()` call.

### Agent / AgentConfig / PromptOverrides (`src/types/agent.ts`)
- **`AgentConfig.harness?: HarnessId`** (line 98) + **`AgentConfig.harnessOptions?: HarnessOptions`**
  (line 101) — the v1.2 fields. Use these.
- `AgentConfig.provider?` / `providerOptions?` — **`@deprecated Since v1.2`** (lines 106, 128). Do NOT
  feature in new examples.
- **`PromptOverrides.harness?: HarnessId`** (line 195) + **`PromptOverrides.harnessOptions?`**
  (line 198) — per-call override (§7.13). The old examples used `{ provider, providerOptions }` —
  rewrite to `{ harness, harnessOptions }`.
- `agent.config.harness` is readable (verified — `AgentConfig.harness` is a public field).

---

## 4. Verified cascade + model semantics (PRD §7.7 / §7.8 — copy verbatim into example 02)

```
harness  = promptHarness ?? agentHarness ?? globalConfig.defaultHarness   // first-defined wins
options  = { ...globalDefaults[harness], ...agentOptions, ...promptOptions } // last write wins
```
- Harness cascade and model cascade are **independent** (§7.7).
- `configureHarnesses({ defaultHarness:'pi', defaultModelProvider:'anthropic', harnessDefaults:{…} })`.
- `configureHarnesses` validates `defaultHarness ∈ {'pi','claude-code'}` (throws on legacy
  `'anthropic'`); does NOT validate `defaultModelProvider` (open set).
- §7.8 critical rule: **the harness is NEVER in the model string.** `pi/anthropic/x` and
  `cc/anthropic/…` are INVALID. Valid: `anthropic/claude-sonnet-4-20250514` (qualified) or
  `claude-sonnet-4-20250514` (plain → resolved against `defaultModelProvider`, default `'anthropic'`).
- `claude-code` can ONLY run `anthropic/*` (§7.8). Requesting `openai/*` on `claude-code` is a config
  error → **use the `pi` harness for non-Anthropic providers** (this is example 04's whole point).

---

## 5. Build / resolution facts (determines the validation gates)

- **`tsconfig.json`: `include: ["src/**/*"]`, `exclude: ["node_modules","dist","src/__tests__"]`.** →
  **`npm run lint` (tsc --noEmit) does NOT typecheck `examples/`.** The examples are validated ONLY by
  `tsx` execution + the symbol cross-check. (No way to "lint" them via the project tsc.)
- **`from 'groundswell'` resolves to `dist/index.js`** (package.json `main`/`exports` `"."`). →
  **`dist/` MUST be rebuilt (`npm run build`) before running examples** so the new harness symbols
  (`PiHarness`, `ClaudeCodeHarness`, `HarnessRegistry`, `configureHarnesses`, `parseModelSpec`, …)
  are present. A stale `dist/` → `tsx` throws "does not provide an export". The PRP mandates
  `npm run build` as gate 0.
- **Helper import**: `import { printHeader, printSection, prettyJson } from '../../utils/helpers.js'`
  (verified exports in `examples/utils/helpers.ts`: `sleep`, `printHeader`, `printSection`,
  `prettyJson`). The `.js` extension resolves to `.ts` via tsx/bundler moduleResolution. Path is
  **unchanged** by the `providers` → `harnesses` rename (both are one dir deep under `examples/`).
- **Env gate**: every existing example does `if (!process.env.ANTHROPIC_API_KEY) { console.error(…);
  process.exit(1); }` at module top. Keep this pattern (claude-code needs the key; it's the common
  denominator). Wrap provider-specific calls that may lack keys (e.g. `openai/*` via pi) in
  try/catch printing `Note: …` (matches the existing resilient demo style in ex 03/04/05/06). This
  lets an example "run with tsx" and demonstrate even when a secondary key is absent.
- **`examples/index.ts`** imports the 6 provider examples by OLD names + OLD paths (`./providers/…js`)
  and lists them in `MENU` + `runAllExamples` as "12–17 Provider Examples". MUST update: paths,
  function names, labels, summary. The runner is invoked by `npm run start:all`.
- **`examples/README.md`** lines ~155–253 are an entire "Provider Examples" section (quick-start
  `start:provider-*`, per-example blurbs, structure tree). MUST rewrite to "Harness Examples".
- **Root `README.md`** — grep for `start:provider|examples/providers|provider` returned **EMPTY**. →
  no script/example references to update there. (The `## Documentation` list is owned by P4.M3.T1.S1;
  do NOT touch root README at all.)
- **`examples/__tests__/*.test.tsx`** (3 ink-debugger tests) are included in `npm test` (vitest config
  `include` has `examples/__tests__/**/*.test.tsx`). They import from `examples/components/`, NOT from
  providers/harnesses. → unaffected by this task; `npm test` proves no collateral damage.
- **`vitest` `include`** does NOT cover the example source `.ts` files → no vitest gate for them.

---

## 6. The per-example rewrite map (old API → new API)

| Concept | Old (provider) | New (harness) |
|---|---|---|
| Registry singleton | `ProviderRegistry.getInstance()` | `HarnessRegistry.getInstance()` |
| Register | `registry.register(new AnthropicProvider())` | `registry.register(new ClaudeCodeHarness())` + `registry.register(new PiHarness())` |
| Init | `registry.initializeProvider('anthropic', {apiKey})` | `registry.initializeProvider('claude-code', {apiKey})` (+ optionally `'pi'`) |
| Lookup | `registry.get('anthropic')` | `registry.get('claude-code')` / `registry.get('pi')` |
| Global config | `configureProviders({defaultProvider:'anthropic', providerDefaults})` | `configureHarnesses({defaultHarness:'pi', defaultModelProvider:'anthropic', harnessDefaults})` |
| Read global back | `getGlobalProviderConfig()` ❌ (internal now) | read `agent.config.harness` (resolved) — do NOT import a getter |
| Agent config | `new Agent({ provider:'anthropic', providerOptions })` | `new Agent({ harness:'claude-code', harnessOptions, model:'anthropic/claude-sonnet-4-20250514' })` |
| Per-call override | `agent.prompt(p, { provider, providerOptions })` | `agent.prompt(p, { harness:'claude-code', harnessOptions })` (§7.13) |
| Model-only override | `agent.prompt(p, { model:'claude-opus-…' })` | `agent.prompt(p, { model:'openai/gpt-4o' })` — harness unchanged (§7.13) |
| Sessions | `providerOptions:{ sessionId }` + `provider.getSession(id)` | `harnessOptions:{ sessionId }` + `harness.getSession(id)` (claude-code; document pi difference) |
| MCP | `provider.registerMCPs([server])` | `harness.registerMCPs([server])` (both harnesses) |
| Skills | `provider.loadSkills([{name,content}])` | `harness.loadSkills([{name,path}])` (pi: native agentskills.io; cc: system prompt) |
| Capability matrix | single `Anthropic` column | **two columns: `pi` vs `claude-code`** (§7.4) — all caps true; differ only on "LLM providers" |

**New function names** (exported from each example, consumed by `examples/index.ts`):
`runBasicHarnessUsageExample`, `runHarnessConfigurationExample`, `runHarnessSwitchingExample`,
`runMultiProviderScenariosExample` (kept — still multi-provider, now on the model axis),
`runHarnessSessionsExample`, `runHarnessWithMcpSkillsExample`.

**New package.json scripts:**
`start:harness-basic`, `start:harness-config`, `start:harness-switching`, `start:harness-scenarios`,
`start:harness-sessions`, `start:harness-features` → `tsx examples/harnesses/0X-*.ts`.

---

## 7. Scope boundaries (do NOT cross — parallel/owned work)

- **`docs/` + root `README.md`** → owned by **P4.M3.T1.S1** (running in parallel). It produces
  `docs/harnesses.md`, `docs/migration-provider-to-harness.md`, edits `docs/providers.md` (banner) +
  root `README.md` (doc list). **Do NOT touch any `docs/` file or root `README.md`.** The new examples
  may LINK to `docs/harnesses.md` in prose ("see docs/harnesses.md") but must not create/edit it.
- **`src/`** — forbidden (research/examples task). If an example won't compile/run, the fix is in the
  EXAMPLE, never in `src/` (do not "export" an internal symbol to make an example work).
- **`examples/examples/*`** (workflow examples 01–12 + ink debugger) — untouched. Only the harness
  slice (`examples/harnesses/`) + the two aggregator files (`examples/index.ts`, `examples/README.md`)
  change.
- **`examples/__tests__/*`** — untouched (ink tests, unrelated).
- **No `PRD.md`, no `tasks.json`, no `prd_snapshot.md`, no `.gitignore`.**
- **Do NOT reintroduce `OpenCodeProvider`** (removed in P4.M1). Do NOT import deprecated `Provider*`
  aliases in the new examples (use the `Harness*` names — examples are the v1.2 reference surface).
